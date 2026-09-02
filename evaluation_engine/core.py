from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class EvaluationError(ValueError):
    pass


@dataclass(frozen=True)
class EvaluationResult:
    recommendation: str
    reasons: tuple[str, ...]


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise EvaluationError(message)


def _validate_run(run: dict[str, Any], schema: dict[str, Any]) -> None:
    _require(bool(run.get("run_id")), "run_id is required")
    _require(bool(run.get("capability_ref")), "capability_ref is required")
    _require(bool(run.get("version_ref")), "version_ref is required")
    _require(bool(run.get("benchmark_ref")), "benchmark_ref is required")
    _require(bool(run.get("evidence_refs")), "evaluation evidence is required")
    metrics = run.get("metrics") or {}
    for metric in schema["required_metrics"]:
        _require(metric in metrics, f"missing metric: {metric}")
    _require(0 <= metrics["quality_score"] <= 1, "quality_score out of range")
    _require(0 <= metrics["success_rate"] <= 1, "success_rate out of range")
    _require(0 <= metrics["human_correction_rate"] <= 1, "human_correction_rate out of range")
    _require(metrics["latency_ms"] >= 0, "latency_ms must be non-negative")
    _require(metrics["monetary_cost"] >= 0, "monetary_cost must be non-negative")
    _require(metrics["critical_failure_count"] >= 0, "critical_failure_count must be non-negative")


def evaluate_candidate(baseline: dict[str, Any], candidate: dict[str, Any], schema: dict[str, Any]) -> EvaluationResult:
    _validate_run(baseline, schema)
    _validate_run(candidate, schema)
    _require(baseline["benchmark_ref"] == candidate["benchmark_ref"], "baseline and candidate benchmark mismatch")
    _require(schema["promotion_policy"].get("auto_apply") is False, "evaluation engine must not auto-apply promotion")

    b = baseline["metrics"]
    c = candidate["metrics"]
    reasons: list[str] = []

    if c["critical_failure_count"] > schema["critical_failure_limit"]:
        return EvaluationResult("REJECT_CANDIDATE", ("CRITICAL_FAILURE",))

    if c["quality_score"] < schema["quality_floor"]:
        return EvaluationResult("REJECT_CANDIDATE", ("QUALITY_BELOW_FLOOR",))
    if c["success_rate"] < schema["success_rate_floor"]:
        return EvaluationResult("REJECT_CANDIDATE", ("SUCCESS_RATE_BELOW_FLOOR",))

    quality_regression = b["quality_score"] - c["quality_score"]
    success_regression = b["success_rate"] - c["success_rate"]
    if quality_regression > schema["max_quality_regression"]:
        reasons.append("QUALITY_REGRESSION")
    if success_regression > schema["max_success_rate_regression"]:
        reasons.append("SUCCESS_RATE_REGRESSION")
    if reasons:
        return EvaluationResult("KEEP_BASELINE", tuple(reasons))

    quality_not_worse = c["quality_score"] >= b["quality_score"] - schema["max_quality_regression"]
    success_not_worse = c["success_rate"] >= b["success_rate"] - schema["max_success_rate_regression"]
    operational_gain = (
        c["latency_ms"] < b["latency_ms"]
        or c["monetary_cost"] < b["monetary_cost"]
        or c["human_correction_rate"] < b["human_correction_rate"]
        or c["quality_score"] > b["quality_score"]
        or c["success_rate"] > b["success_rate"]
    )

    if quality_not_worse and success_not_worse and operational_gain:
        return EvaluationResult("PROMOTE_CANDIDATE", ("EVIDENCE_BACKED_NET_GAIN", "HUMAN_APPROVAL_REQUIRED"))

    return EvaluationResult("REVIEW_REQUIRED", ("NO_CLEAR_NET_GAIN", "HUMAN_REVIEW_REQUIRED"))


def validate_feedback(feedback: dict[str, Any], evaluation_result: EvaluationResult) -> None:
    _require(bool(feedback.get("feedback_id")), "feedback_id is required")
    _require(bool(feedback.get("evaluation_evidence_refs")), "feedback requires evaluation evidence refs")
    _require(feedback.get("recommendation") == evaluation_result.recommendation, "feedback recommendation mismatch")
    _require(feedback.get("policy_change_applied") is False, "feedback cannot auto-apply policy changes")
