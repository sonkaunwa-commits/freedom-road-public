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


def _require_number(value: Any, name: str, *, minimum: float = 0.0, maximum: float | None = None) -> float:
    _require(not isinstance(value, bool) and isinstance(value, (int, float)), f"{name} must be numeric")
    numeric = float(value)
    _require(numeric >= minimum, f"{name} must be >= {minimum:g}")
    if maximum is not None:
        _require(numeric <= maximum, f"{name} must be <= {maximum:g}")
    return numeric


def _require_nonnegative_int(value: Any, name: str) -> int:
    _require(not isinstance(value, bool) and isinstance(value, int), f"{name} must be a non-negative integer")
    _require(value >= 0, f"{name} must be a non-negative integer")
    return value


def _validate_schema(schema: dict[str, Any]) -> None:
    _require(isinstance(schema, dict), "schema must be an object")
    required_metrics = schema.get("required_metrics")
    _require(isinstance(required_metrics, list) and required_metrics, "required_metrics must be a non-empty list")
    _require(all(isinstance(metric, str) and metric.strip() for metric in required_metrics), "required_metrics entries must be non-empty strings")
    _require(len(required_metrics) == len(set(required_metrics)), "required_metrics entries must be unique")

    for name in ("quality_floor", "success_rate_floor", "max_quality_regression", "max_success_rate_regression"):
        _require_number(schema.get(name), name, minimum=0.0, maximum=1.0)
    _require_nonnegative_int(schema.get("critical_failure_limit"), "critical_failure_limit")

    policy = schema.get("promotion_policy")
    _require(isinstance(policy, dict), "promotion_policy must be an object")
    _require(policy.get("auto_apply") is False, "evaluation engine must not auto-apply promotion")
    _require(policy.get("evidence_required") is True, "promotion requires evaluation evidence")
    _require(policy.get("quality_floor_has_priority_over_cost") is True, "quality floor must have priority over cost")
    _require(policy.get("quality_floor_has_priority_over_latency") is True, "quality floor must have priority over latency")


def _validate_run(run: dict[str, Any], schema: dict[str, Any]) -> None:
    _require(isinstance(run, dict), "evaluation run must be an object")
    _require(bool(run.get("run_id")), "run_id is required")
    _require(bool(run.get("capability_ref")), "capability_ref is required")
    _require(bool(run.get("version_ref")), "version_ref is required")
    _require(bool(run.get("benchmark_ref")), "benchmark_ref is required")
    _require(bool(run.get("evidence_refs")), "evaluation evidence is required")
    metrics = run.get("metrics")
    _require(isinstance(metrics, dict), "metrics must be an object")
    for metric in schema["required_metrics"]:
        _require(metric in metrics, f"missing metric: {metric}")

    _require_number(metrics["quality_score"], "quality_score", maximum=1.0)
    _require_number(metrics["success_rate"], "success_rate", maximum=1.0)
    _require_number(metrics["human_correction_rate"], "human_correction_rate", maximum=1.0)
    _require_number(metrics["latency_ms"], "latency_ms")
    _require_number(metrics["monetary_cost"], "monetary_cost")
    _require_nonnegative_int(metrics["critical_failure_count"], "critical_failure_count")


def evaluate_candidate(baseline: dict[str, Any], candidate: dict[str, Any], schema: dict[str, Any]) -> EvaluationResult:
    _validate_schema(schema)
    _validate_run(baseline, schema)
    _validate_run(candidate, schema)
    _require(baseline["benchmark_ref"] == candidate["benchmark_ref"], "baseline and candidate benchmark mismatch")

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
    _require(isinstance(feedback, dict), "feedback must be an object")
    _require(bool(feedback.get("feedback_id")), "feedback_id is required")
    _require(bool(feedback.get("evaluation_evidence_refs")), "feedback requires evaluation evidence refs")
    _require(feedback.get("recommendation") == evaluation_result.recommendation, "feedback recommendation mismatch")
    _require(feedback.get("policy_change_applied") is False, "feedback cannot auto-apply policy changes")
