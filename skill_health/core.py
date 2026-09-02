from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class SkillHealthContractError(ValueError):
    pass


@dataclass(frozen=True)
class SkillHealthDecision:
    status: str
    reason_codes: tuple[str, ...]
    event_types: tuple[str, ...]
    registry_mutation_allowed: bool = False


_ALLOWED_MAINTENANCE = {"ACTIVE", "SLOW", "UNMAINTAINED", "UNKNOWN"}


def _require_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SkillHealthContractError(f"{field} must be non-empty text")
    return value.strip()


def evaluate_health(record: dict[str, Any], policy: dict[str, Any]) -> SkillHealthDecision:
    for field in ("skill_id", "registered_version", "observed_version", "source_ref", "provenance_ref", "observed_at"):
        _require_text(record.get(field), field)

    maintenance = _require_text(record.get("maintenance_state"), "maintenance_state")
    if maintenance not in _ALLOWED_MAINTENANCE:
        raise SkillHealthContractError("invalid maintenance_state")

    evidence_age = record.get("evidence_age_days")
    failures = record.get("consecutive_failures")
    failure_rate = record.get("failure_rate")
    if not isinstance(evidence_age, int) or evidence_age < 0:
        raise SkillHealthContractError("evidence_age_days must be a non-negative integer")
    if not isinstance(failures, int) or failures < 0:
        raise SkillHealthContractError("consecutive_failures must be a non-negative integer")
    if not isinstance(failure_rate, (int, float)) or not 0 <= failure_rate <= 1:
        raise SkillHealthContractError("failure_rate must be within [0, 1]")
    if record.get("auto_registry_mutation") is not False:
        raise SkillHealthContractError("auto_registry_mutation must remain false")

    max_evidence_age = int(policy["max_evidence_age_days"])
    failure_threshold = int(policy["consecutive_failure_threshold"])
    failure_rate_threshold = float(policy["failure_rate_threshold"])

    version_drift = record["registered_version"] != record["observed_version"]
    stale_evidence = evidence_age > max_evidence_age
    critical_breakage = record.get("critical_breakage") is True
    repeated_failure = failures >= failure_threshold or failure_rate >= failure_rate_threshold

    reasons: list[str] = []
    events: list[str] = []

    if critical_breakage:
        reasons.append("CRITICAL_BREAKAGE")
        events.append("SKILL_CRITICAL_BREAKAGE")
    if repeated_failure:
        reasons.append("REPEATED_FAILURE")
        events.append("SKILL_DEGRADED")
    if version_drift:
        reasons.append("VERSION_DRIFT")
        events.append("SKILL_REEVALUATION_REQUIRED")
    if stale_evidence:
        reasons.append("STALE_EVIDENCE")
        events.append("SKILL_REEVALUATION_REQUIRED")
    if maintenance in {"UNMAINTAINED", "UNKNOWN"}:
        reasons.append("MAINTENANCE_RISK")

    if critical_breakage and maintenance == "UNMAINTAINED":
        status = "DEPRECATE_CANDIDATE"
        events.append("SKILL_DEPRECATION_REVIEW")
    elif critical_breakage or repeated_failure:
        status = "DEGRADED"
    elif version_drift or stale_evidence or maintenance in {"SLOW", "UNMAINTAINED", "UNKNOWN"}:
        status = "REVIEW_REQUIRED"
    else:
        status = "HEALTHY"
        reasons.append("HEALTH_CHECK_PASSED")

    return SkillHealthDecision(
        status=status,
        reason_codes=tuple(dict.fromkeys(reasons)),
        event_types=tuple(dict.fromkeys(events)),
        registry_mutation_allowed=False,
    )
