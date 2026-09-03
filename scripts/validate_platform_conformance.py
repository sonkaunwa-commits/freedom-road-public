import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "platform_conformance" / "manifest.v1.json"


class ConformanceError(RuntimeError):
    pass


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ConformanceError(f"invalid JSON artifact: {path.relative_to(ROOT)}: {exc}") from exc


def pointer_get(document: Any, pointer: list[str]) -> Any:
    current = document
    for part in pointer:
        if not isinstance(current, dict) or part not in current:
            raise ConformanceError(f"missing JSON pointer segment: {'/'.join(pointer)}")
        current = current[part]
    return current


def validate_required_file(relative_path: str) -> None:
    path = ROOT / relative_path
    if not path.is_file():
        raise ConformanceError(f"required artifact missing: {relative_path}")
    if path.stat().st_size <= 0:
        raise ConformanceError(f"required artifact empty: {relative_path}")
    if path.suffix == ".json":
        load_json(path)


def validate_manifest(manifest: dict[str, Any]) -> None:
    if manifest.get("baseline") != "PLATFORM_EVOLUTION_P2":
        raise ConformanceError("manifest baseline must be PLATFORM_EVOLUTION_P2")
    if manifest.get("network_required") is not False:
        raise ConformanceError("conformance gate must not require network access")
    if manifest.get("mutation_authority") is not False:
        raise ConformanceError("conformance gate must not have mutation authority")

    components = manifest.get("components")
    if not isinstance(components, list) or not components:
        raise ConformanceError("components must be a non-empty list")

    component_ids: set[str] = set()
    required_paths: set[str] = set()
    for component in components:
        if not isinstance(component, dict):
            raise ConformanceError("component entries must be objects")
        component_id = component.get("id")
        if not isinstance(component_id, str) or not component_id:
            raise ConformanceError("component id must be non-empty")
        if component_id in component_ids:
            raise ConformanceError(f"duplicate component id: {component_id}")
        component_ids.add(component_id)

        files = component.get("required_files")
        if not isinstance(files, list) or not files:
            raise ConformanceError(f"component {component_id} must list required_files")
        for relative_path in files:
            if not isinstance(relative_path, str) or not relative_path:
                raise ConformanceError(f"component {component_id} contains invalid required file")
            required_paths.add(relative_path)
            validate_required_file(relative_path)

    minimum_components = {
        "design-system",
        "research-orchestrator",
        "model-router",
        "skill-registry",
        "creator-engine",
        "evaluation-engine",
        "multi-model-review",
        "skill-health",
        "content-feedback",
    }
    missing_components = minimum_components.difference(component_ids)
    if missing_components:
        raise ConformanceError(f"missing baseline components: {sorted(missing_components)}")

    assertions = manifest.get("json_assertions")
    if not isinstance(assertions, list) or not assertions:
        raise ConformanceError("json_assertions must be non-empty")
    for assertion in assertions:
        relative_path = assertion.get("path")
        pointer = assertion.get("pointer")
        if not isinstance(relative_path, str) or not isinstance(pointer, list) or not pointer:
            raise ConformanceError("invalid JSON assertion")
        document = load_json(ROOT / relative_path)
        actual = pointer_get(document, pointer)
        expected = assertion.get("equals")
        if actual != expected:
            raise ConformanceError(
                f"JSON invariant failed: {relative_path} {'/'.join(pointer)} expected {expected!r}, got {actual!r}"
            )

    text_assertions = manifest.get("text_assertions")
    if not isinstance(text_assertions, list):
        raise ConformanceError("text_assertions must be a list")
    for assertion in text_assertions:
        relative_path = assertion.get("path")
        required_text = assertion.get("contains")
        if not isinstance(relative_path, str) or not isinstance(required_text, list) or not required_text:
            raise ConformanceError("invalid text assertion")
        path = ROOT / relative_path
        if not path.is_file():
            raise ConformanceError(f"text assertion artifact missing: {relative_path}")
        text = path.read_text(encoding="utf-8")
        for fragment in required_text:
            if fragment not in text:
                raise ConformanceError(f"text invariant missing from {relative_path}: {fragment}")

    if len(required_paths) < 20:
        raise ConformanceError("conformance manifest is unexpectedly narrow")


def self_test_fail_closed() -> None:
    probe = {"promotion_policy": {"auto_apply": True}}
    actual = pointer_get(probe, ["promotion_policy", "auto_apply"])
    if actual is not True:
        raise AssertionError("pointer_get self-test failed")
    try:
        pointer_get(probe, ["promotion_policy", "missing"])
    except ConformanceError:
        pass
    else:
        raise AssertionError("missing pointer did not fail closed")


def main() -> None:
    manifest = load_json(MANIFEST_PATH)
    if not isinstance(manifest, dict):
        raise ConformanceError("manifest root must be an object")
    validate_manifest(manifest)
    self_test_fail_closed()
    print("platform-conformance validation: PASS")


if __name__ == "__main__":
    main()
