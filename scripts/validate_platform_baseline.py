import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
BASELINE_PATH = ROOT / "platform_baseline" / "baseline.v1.json"
EXPECTED_COMPONENTS = {
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
ALLOWED_MATURITY = {"DETERMINISTIC_BASELINE", "PILOT_BASELINE"}
SHA40 = re.compile(r"^[0-9a-f]{40}$")


class BaselineError(RuntimeError):
    pass


def require_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise BaselineError(f"{field} must be non-empty text")
    return value.strip()


def require_false(value: Any, field: str) -> None:
    if value is not False:
        raise BaselineError(f"{field} must remain false")


def validate(data: dict[str, Any]) -> None:
    require_text(data.get("baseline_id"), "baseline_id")
    require_text(data.get("baseline_version"), "baseline_version")
    if data.get("baseline_type") != "ACCEPTED_DETERMINISTIC_PLATFORM_BASELINE":
        raise BaselineError("invalid baseline_type")

    source_sha = require_text(data.get("source_sha"), "source_sha")
    if not SHA40.fullmatch(source_sha):
        raise BaselineError("source_sha must be a full lowercase Git SHA")

    components = data.get("components")
    if not isinstance(components, list) or not components:
        raise BaselineError("components must be a non-empty list")
    if data.get("component_count") != len(components):
        raise BaselineError("component_count does not match components")

    seen: set[str] = set()
    for item in components:
        if not isinstance(item, dict):
            raise BaselineError("component entries must be objects")
        component_id = require_text(item.get("id"), "component.id")
        if component_id in seen:
            raise BaselineError(f"duplicate component: {component_id}")
        seen.add(component_id)
        maturity = require_text(item.get("maturity"), f"{component_id}.maturity")
        if maturity not in ALLOWED_MATURITY:
            raise BaselineError(f"invalid maturity for {component_id}: {maturity}")
        artifacts = item.get("artifacts")
        if not isinstance(artifacts, list) or not artifacts:
            raise BaselineError(f"{component_id}.artifacts must be non-empty")
        for relative_path in artifacts:
            if not isinstance(relative_path, str) or not relative_path:
                raise BaselineError(f"{component_id} contains invalid artifact path")
            if not (ROOT / relative_path).is_file():
                raise BaselineError(f"baseline artifact missing: {relative_path}")
        require_text(item.get("acceptance_ref"), f"{component_id}.acceptance_ref")

    if seen != EXPECTED_COMPONENTS:
        raise BaselineError(
            f"baseline component set mismatch: missing={sorted(EXPECTED_COMPONENTS-seen)} extra={sorted(seen-EXPECTED_COMPONENTS)}"
        )

    invariants = data.get("accepted_invariants")
    if not isinstance(invariants, list) or len(invariants) < 6:
        raise BaselineError("accepted_invariants is unexpectedly narrow")

    non_capabilities = data.get("explicit_non_capabilities")
    if not isinstance(non_capabilities, list) or len(non_capabilities) < 8:
        raise BaselineError("explicit_non_capabilities is unexpectedly narrow")
    required_non_capabilities = {
        "NO_LIVE_MODEL_PROVIDER_INTEGRATION_FROM_THIS_BASELINE",
        "NO_AUTONOMOUS_MODEL_OR_SKILL_PROMOTION",
        "NO_AUTOMATIC_EXTERNAL_PUBLISHING",
        "NO_PRODUCTION_CUTOVER_AUTHORITY",
        "NO_INVESTMENT_OR_TRADING_EXECUTION_AUTHORITY",
    }
    if not required_non_capabilities.issubset(set(non_capabilities)):
        raise BaselineError("required non-capability boundary missing")

    authority = data.get("authority")
    if not isinstance(authority, dict):
        raise BaselineError("authority must be an object")
    for field in (
        "production_activation",
        "external_publish",
        "registry_mutation",
        "provider_activation",
        "paid_resource_creation",
        "trading_execution",
    ):
        require_false(authority.get(field), f"authority.{field}")

    evidence = data.get("acceptance_evidence")
    if not isinstance(evidence, dict):
        raise BaselineError("acceptance_evidence must be an object")
    merge_sha = require_text(evidence.get("conformance_merge_sha"), "acceptance_evidence.conformance_merge_sha")
    if merge_sha != source_sha:
        raise BaselineError("conformance merge SHA must equal baseline source_sha")
    require_text(evidence.get("conformance_pr"), "acceptance_evidence.conformance_pr")
    require_text(evidence.get("validation"), "acceptance_evidence.validation")


def self_test() -> None:
    original = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    broken = json.loads(json.dumps(original))
    broken["authority"]["production_activation"] = True
    try:
        validate(broken)
    except BaselineError:
        pass
    else:
        raise AssertionError("production authority regression did not fail closed")

    duplicate = json.loads(json.dumps(original))
    duplicate["components"].append(dict(duplicate["components"][0]))
    duplicate["component_count"] += 1
    try:
        validate(duplicate)
    except BaselineError:
        pass
    else:
        raise AssertionError("duplicate component regression did not fail closed")


def main() -> None:
    data = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise BaselineError("baseline root must be an object")
    validate(data)
    self_test()
    print("platform-baseline validation: PASS")


if __name__ == "__main__":
    main()
