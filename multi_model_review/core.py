from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class ReviewContractError(ValueError):
    pass


@dataclass(frozen=True)
class ReviewDecision:
    decision: str
    disagreement_severity: str
    reason_codes: tuple[str, ...]
    human_approval_required: bool


_ALLOWED_SEVERITY = {"NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"}
_ALLOWED_RISK = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
_ALLOWED_DECISIONS = {
    "CONSENSUS_ACCEPTED",
    "ACCEPT_PRIMARY",
    "ACCEPT_CHALLENGER",
    "REVIEW_REQUIRED",
    "REJECT_BOTH",
}


def _require_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ReviewContractError(f"{field} must be non-empty text")
    return value.strip()


def _validate_run(run: dict[str, Any], label: str) -> None:
    for field in ("run_id", "capability_id", "version_ref", "provenance_ref"):
        _require_text(run.get(field), f"{label}.{field}")
    evidence_refs = run.get("evidence_refs")
    if not isinstance(evidence_refs, list) or not evidence_refs:
        raise ReviewContractError(f"{label}.evidence_refs must be non-empty")
    metrics = run.get("metrics")
    if not isinstance(metrics, dict):
        raise ReviewContractError(f"{label}.metrics must be an object")
    for field in ("quality_score", "latency_ms", "cost_units"):
        value = metrics.get(field)
        if not isinstance(value, (int, float)) or value < 0:
            raise ReviewContractError(f"{label}.metrics.{field} must be non-negative")


def validate_review(record: dict[str, Any]) -> ReviewDecision:
    _require_text(record.get("review_id"), "review_id")
    risk = _require_text(record.get("risk_level"), "risk_level")
    if risk not in _ALLOWED_RISK:
        raise ReviewContractError("invalid risk_level")

    primary = record.get("primary")
    challenger = record.get("challenger")
    if not isinstance(primary, dict) or not isinstance(challenger, dict):
        raise ReviewContractError("primary and challenger must be objects")
    _validate_run(primary, "primary")
    _validate_run(challenger, "challenger")
    if primary["run_id"] == challenger["run_id"]:
        raise ReviewContractError("primary and challenger must be independent runs")

    disagreement = record.get("disagreement")
    if not isinstance(disagreement, dict):
        raise ReviewContractError("disagreement must be an object")
    severity = _require_text(disagreement.get("severity"), "disagreement.severity")
    if severity not in _ALLOWED_SEVERITY:
        raise ReviewContractError("invalid disagreement severity")
    dimensions = disagreement.get("dimensions")
    if severity != "NONE" and (not isinstance(dimensions, list) or not dimensions):
        raise ReviewContractError("non-zero disagreement requires dimensions")

    review = record.get("review")
    if not isinstance(review, dict):
        raise ReviewContractError("review must be an object")
    decision = _require_text(review.get("decision"), "review.decision")
    if decision not in _ALLOWED_DECISIONS:
        raise ReviewContractError("invalid review decision")
    evidence_refs = review.get("evidence_refs")
    if not isinstance(evidence_refs, list) or not evidence_refs:
        raise ReviewContractError("review recommendation requires evidence_refs")

    if record.get("auto_promote") is not False:
        raise ReviewContractError("auto_promote must remain false")

    high_disagreement = severity in {"HIGH", "CRITICAL"}
    high_risk = risk in {"HIGH", "CRITICAL"}
    if high_disagreement and high_risk and decision != "REVIEW_REQUIRED":
        raise ReviewContractError("high-risk material disagreement must fail closed to REVIEW_REQUIRED")

    if severity == "CRITICAL" and decision in {"CONSENSUS_ACCEPTED", "ACCEPT_PRIMARY", "ACCEPT_CHALLENGER"}:
        raise ReviewContractError("critical disagreement cannot be silently accepted")

    reasons: list[str] = []
    if high_disagreement:
        reasons.append("MATERIAL_DISAGREEMENT")
    if high_risk:
        reasons.append("HIGH_RISK_TASK")
    if decision == "REVIEW_REQUIRED":
        reasons.append("HUMAN_OR_INDEPENDENT_REVIEW_REQUIRED")
    if not reasons:
        reasons.append("REVIEW_CONTRACT_SATISFIED")

    return ReviewDecision(
        decision=decision,
        disagreement_severity=severity,
        reason_codes=tuple(reasons),
        human_approval_required=decision == "REVIEW_REQUIRED" or high_risk,
    )
