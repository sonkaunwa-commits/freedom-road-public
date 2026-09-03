import copy
import hashlib
import importlib.util
import json
import shutil
import tempfile
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CASE_PATH = ROOT / "platform_conformance_tests" / "cases.v1.json"
GATE_PATH = ROOT / "scripts" / "validate_platform_conformance.py"
MANIFEST_PATH = ROOT / "platform_conformance" / "manifest.v1.json"


class AdversarialError(RuntimeError):
    pass


def load_gate_module():
    spec = importlib.util.spec_from_file_location("freovia_platform_conformance_gate", GATE_PATH)
    if spec is None or spec.loader is None:
        raise AdversarialError("unable to load platform conformance gate")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_paths(manifest: dict[str, Any]) -> set[str]:
    paths = {"platform_conformance/manifest.v1.json"}
    for component in manifest["components"]:
        paths.update(component["required_files"])
    for assertion in manifest["json_assertions"]:
        paths.add(assertion["path"])
    for assertion in manifest["text_assertions"]:
        paths.add(assertion["path"])
    return paths


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def snapshot(paths: set[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for relative in sorted(paths):
        path = ROOT / relative
        if path.is_file():
            result[relative] = digest(path)
    return result


def copy_fixture(temp_root: Path, paths: set[str]) -> None:
    for relative in paths:
        source = ROOT / relative
        if not source.is_file():
            raise AdversarialError(f"canonical fixture source missing: {relative}")
        destination = temp_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def apply_case(case_id: str, temp_root: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    mutated_manifest = copy.deepcopy(manifest)

    if case_id == "MODEL_ROUTER_BUDGET_FLOOR_DISABLED":
        path = temp_root / "model_router/policy.v1.json"
        data = load_json(path)
        data["rules"]["budget_cannot_lower_policy_floor"] = False
        write_json(path, data)
    elif case_id == "EVALUATION_AUTO_PROMOTION_ENABLED":
        path = temp_root / "evaluation_engine/schema.v1.json"
        data = load_json(path)
        data["promotion_policy"]["auto_apply"] = True
        write_json(path, data)
    elif case_id == "MULTI_MODEL_HIGH_RISK_FAIL_CLOSED_REMOVED":
        path = temp_root / "multi_model_review/core.py"
        text = path.read_text(encoding="utf-8")
        required = "high-risk material disagreement must fail closed to REVIEW_REQUIRED"
        if required not in text:
            raise AdversarialError("expected multi-model fail-closed guard text missing before mutation")
        path.write_text(text.replace(required, "high-risk material disagreement guard removed"), encoding="utf-8")
    elif case_id == "SKILL_HEALTH_RECOMMENDATION_ONLY_DISABLED":
        path = temp_root / "skill_health/policy.v1.json"
        data = load_json(path)
        data["recommendation_only"] = False
        write_json(path, data)
    elif case_id == "SKILL_HEALTH_EXTERNAL_NOTIFICATION_ENABLED":
        path = temp_root / "skill_health/policy.v1.json"
        data = load_json(path)
        data["external_notification_enabled"] = True
        write_json(path, data)
    elif case_id == "CONTENT_FEEDBACK_CAUSALITY_ALLOWED":
        path = temp_root / "content_feedback/policy.v1.json"
        data = load_json(path)
        data["rules"]["causality_claim_forbidden"] = False
        write_json(path, data)
    elif case_id == "CONTENT_FEEDBACK_POLICY_MUTATION_ENABLED":
        path = temp_root / "content_feedback/policy.v1.json"
        data = load_json(path)
        data["rules"]["policy_mutation_allowed"] = True
        write_json(path, data)
    elif case_id == "CRITICAL_ARTIFACT_MISSING":
        (temp_root / "DESIGN.md").unlink()
    elif case_id == "DUPLICATE_COMPONENT_DECLARATION":
        mutated_manifest["components"].append(copy.deepcopy(mutated_manifest["components"][0]))
    else:
        raise AdversarialError(f"unknown adversarial case: {case_id}")

    return mutated_manifest


def expect_rejected(gate: Any, case_id: str, manifest: dict[str, Any], fixture_paths: set[str]) -> None:
    with tempfile.TemporaryDirectory(prefix="freovia-p2-adversarial-") as temp_dir:
        temp_root = Path(temp_dir)
        copy_fixture(temp_root, fixture_paths)
        mutated_manifest = apply_case(case_id, temp_root, manifest)
        original_root = gate.ROOT
        gate.ROOT = temp_root
        try:
            try:
                gate.validate_manifest(mutated_manifest)
            except gate.ConformanceError:
                return
            raise AdversarialError(f"unsafe regression was accepted: {case_id}")
        finally:
            gate.ROOT = original_root


def validate_case_registry(registry: dict[str, Any]) -> list[str]:
    if registry.get("fixture_mode") != "TEMPORARY_COPY_ONLY":
        raise AdversarialError("fixture_mode must be TEMPORARY_COPY_ONLY")
    if registry.get("canonical_mutation_allowed") is not False:
        raise AdversarialError("canonical mutation must remain forbidden")
    cases = registry.get("cases")
    if not isinstance(cases, list) or not cases:
        raise AdversarialError("cases must be a non-empty list")
    ids: list[str] = []
    for case in cases:
        if not isinstance(case, dict):
            raise AdversarialError("case entries must be objects")
        case_id = case.get("id")
        if not isinstance(case_id, str) or not case_id:
            raise AdversarialError("case id must be non-empty")
        if case_id in ids:
            raise AdversarialError(f"duplicate case id: {case_id}")
        if case.get("expected") != "REJECT":
            raise AdversarialError(f"case {case_id} must expect REJECT")
        ids.append(case_id)
    required = {
        "MODEL_ROUTER_BUDGET_FLOOR_DISABLED",
        "EVALUATION_AUTO_PROMOTION_ENABLED",
        "MULTI_MODEL_HIGH_RISK_FAIL_CLOSED_REMOVED",
        "SKILL_HEALTH_RECOMMENDATION_ONLY_DISABLED",
        "SKILL_HEALTH_EXTERNAL_NOTIFICATION_ENABLED",
        "CONTENT_FEEDBACK_CAUSALITY_ALLOWED",
        "CONTENT_FEEDBACK_POLICY_MUTATION_ENABLED",
        "CRITICAL_ARTIFACT_MISSING",
        "DUPLICATE_COMPONENT_DECLARATION",
    }
    if set(ids) != required:
        raise AdversarialError("adversarial case coverage mismatch")
    return ids


def main() -> None:
    gate = load_gate_module()
    manifest = load_json(MANIFEST_PATH)
    registry = load_json(CASE_PATH)
    if not isinstance(manifest, dict) or not isinstance(registry, dict):
        raise AdversarialError("manifest and case registry roots must be objects")

    fixture_paths = canonical_paths(manifest)
    before = snapshot(fixture_paths)
    case_ids = validate_case_registry(registry)
    for case_id in case_ids:
        expect_rejected(gate, case_id, manifest, fixture_paths)
    after = snapshot(fixture_paths)
    if before != after:
        raise AdversarialError("canonical repository artifacts changed during adversarial tests")

    print(f"platform-conformance adversarial validation: PASS ({len(case_ids)} unsafe regressions rejected)")


if __name__ == "__main__":
    main()
