import math
from dataclasses import dataclass
from typing import Any


class FeedbackContractError(ValueError):
    pass


@dataclass(frozen=True)
class FeedbackDecision:
    recommendation: str
    reason_codes: tuple[str, ...]
    hypotheses: tuple[str, ...]
    review_required: bool
    policy_mutation_allowed: bool = False


_REQUIRED_RECOMMENDATIONS = frozenset(
    {"INSUFFICIENT_DATA", "KEEP", "ITERATE", "REVIEW", "STOP_EXPERIMENT"}
)
_REQUIRED_RULES = {
    "same_channel_baseline_required": True,
    "metric_provenance_required": True,
    "preserve_denominators": True,
    "single_item_policy_change_forbidden": True,
    "causality_claim_forbidden": True,
    "stop_requires_review": True,
    "policy_mutation_allowed": False,
}


def _require_nonempty(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise FeedbackContractError(f"{name} must be a non-empty string")
    return value.strip()


def _require_int(value: Any, name: str, minimum: int = 1) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise FeedbackContractError(f"{name} must be an integer >= {minimum}")
    return value


def _require_finite_number(
    value: Any,
    name: str,
    *,
    minimum: float | None = None,
    maximum: float | None = None,
    minimum_exclusive: bool = False,
) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise FeedbackContractError(f"{name} must be a finite number")
    normalized = float(value)
    if not math.isfinite(normalized):
        raise FeedbackContractError(f"{name} must be a finite number")
    if minimum is not None:
        too_small = normalized <= minimum if minimum_exclusive else normalized < minimum
        if too_small:
            operator = ">" if minimum_exclusive else ">="
            raise FeedbackContractError(f"{name} must be {operator} {minimum:g}")
    if maximum is not None and normalized > maximum:
        raise FeedbackContractError(f"{name} must be <= {maximum:g}")
    return normalized


def _require_unique_strings(value: Any, name: str) -> tuple[str, ...]:
    if not isinstance(value, list) or not value:
        raise FeedbackContractError(f"{name} must be a non-empty list")
    normalized = tuple(
        _require_nonempty(item, f"{name}[{index}]") for index, item in enumerate(value)
    )
    if len(set(normalized)) != len(normalized):
        raise FeedbackContractError(f"{name} values must be unique")
    return normalized


def _validate_policy(policy: dict[str, Any]) -> tuple[int, int, float, set[str]]:
    if not isinstance(policy, dict):
        raise FeedbackContractError("policy must be an object")

    _require_nonempty(policy.get("version"), "policy.version")
    minimum_directional = _require_int(
        policy.get("minimum_directional_items"),
        "policy.minimum_directional_items",
    )
    minimum_stop = _require_int(
        policy.get("minimum_stop_items"), "policy.minimum_stop_items"
    )
    if minimum_stop < minimum_directional:
        raise FeedbackContractError(
            "policy.minimum_stop_items must be >= policy.minimum_directional_items"
        )

    material_change_ratio = _require_finite_number(
        policy.get("material_change_ratio"),
        "policy.material_change_ratio",
        minimum=0.0,
        maximum=1.0,
        minimum_exclusive=True,
    )
    positive_metrics = set(
        _require_unique_strings(policy.get("positive_metrics"), "policy.positive_metrics")
    )

    recommendations = set(
        _require_unique_strings(policy.get("recommendations"), "policy.recommendations")
    )
    if recommendations != _REQUIRED_RECOMMENDATIONS:
        raise FeedbackContractError(
            "policy.recommendations must declare exactly the supported recommendation set"
        )

    rules = policy.get("rules")
    if not isinstance(rules, dict):
        raise FeedbackContractError("policy.rules must be an object")
    for rule_name, expected in _REQUIRED_RULES.items():
        if rule_name not in rules:
            raise FeedbackContractError(f"policy.rules.{rule_name} is required")
        if rules[rule_name] is not expected:
            raise FeedbackContractError(
                f"policy.rules.{rule_name} must be {str(expected).lower()}"
            )

    return minimum_directional, minimum_stop, material_change_ratio, positive_metrics


def _validate_rate(
    metric_name: str, metric: dict[str, Any], source_ids: set[str]
) -> float:
    if not isinstance(metric, dict):
        raise FeedbackContractError(f"metric {metric_name} must be an object")
    numerator = _require_finite_number(
        metric.get("numerator"), f"metric {metric_name} numerator", minimum=0.0
    )
    denominator = _require_finite_number(
        metric.get("denominator"),
        f"metric {metric_name} denominator",
        minimum=0.0,
        minimum_exclusive=True,
    )
    source_ref = metric.get("source_ref")
    if numerator > denominator:
        raise FeedbackContractError(
            f"metric {metric_name} numerator cannot exceed denominator"
        )
    if source_ref not in source_ids:
        raise FeedbackContractError(f"metric {metric_name} has unknown source_ref")
    return numerator / denominator


def evaluate_feedback(
    record: dict[str, Any], policy: dict[str, Any]
) -> FeedbackDecision:
    min_directional, min_stop, material, positive_metrics = _validate_policy(policy)

    if not isinstance(record, dict):
        raise FeedbackContractError("record must be an object")
    for field in (
        "feedback_id",
        "experiment_id",
        "content_group_id",
        "channel",
        "observed_at",
    ):
        _require_nonempty(record.get(field), field)

    sources = record.get("sources")
    if not isinstance(sources, list) or not sources:
        raise FeedbackContractError("sources must be a non-empty list")
    source_ids: set[str] = set()
    for source in sources:
        if not isinstance(source, dict):
            raise FeedbackContractError("source must be an object")
        for field in ("source_id", "provider", "collected_at", "locator"):
            _require_nonempty(source.get(field), f"source.{field}")
        source_id = source["source_id"]
        if source_id in source_ids:
            raise FeedbackContractError("source_id values must be unique")
        source_ids.add(source_id)

    sample = record.get("sample")
    if not isinstance(sample, dict):
        raise FeedbackContractError("sample must be an object")
    published_items = _require_int(sample.get("published_items"), "published_items")
    eligible_items = _require_int(sample.get("eligible_items"), "eligible_items")
    if eligible_items > published_items:
        raise FeedbackContractError(
            "eligible_items must be between 1 and published_items"
        )

    metrics = record.get("metrics")
    if not isinstance(metrics, dict) or not metrics:
        raise FeedbackContractError("metrics must be a non-empty object")
    observed_rates = {
        name: _validate_rate(name, value, source_ids) for name, value in metrics.items()
    }

    baseline = record.get("baseline")
    if not isinstance(baseline, dict):
        raise FeedbackContractError("baseline must be an object")
    if baseline.get("channel") != record.get("channel"):
        raise FeedbackContractError("baseline channel must match observation channel")
    _require_int(baseline.get("sample_items"), "baseline.sample_items")
    baseline_metrics = baseline.get("metrics")
    if not isinstance(baseline_metrics, dict) or not baseline_metrics:
        raise FeedbackContractError("baseline.metrics must be non-empty")
    baseline_rates = {
        name: _validate_rate(name, value, source_ids)
        for name, value in baseline_metrics.items()
    }

    common_metrics = set(observed_rates).intersection(baseline_rates)
    if not common_metrics:
        raise FeedbackContractError(
            "observation and baseline must share at least one metric"
        )

    deltas: dict[str, float] = {}
    for name in sorted(common_metrics):
        baseline_rate = baseline_rates[name]
        if baseline_rate <= 0:
            continue
        deltas[name] = observed_rates[name] / baseline_rate - 1.0

    if eligible_items < min_directional:
        return FeedbackDecision(
            recommendation="INSUFFICIENT_DATA",
            reason_codes=("SAMPLE_BELOW_DIRECTIONAL_MINIMUM",),
            hypotheses=(),
            review_required=False,
        )

    gains = [
        name
        for name, delta in deltas.items()
        if name in positive_metrics and delta >= material
    ]
    losses = [
        name
        for name, delta in deltas.items()
        if name in positive_metrics and delta <= -material
    ]
    hypotheses = tuple(
        f"Observed {name} changed {delta:+.1%} versus same-channel baseline; test a scoped explanation before changing policy."
        for name, delta in sorted(deltas.items())
        if abs(delta) >= material
    )

    if eligible_items >= min_stop and len(losses) >= 2 and not gains:
        return FeedbackDecision(
            recommendation="STOP_EXPERIMENT",
            reason_codes=("MULTI_METRIC_MATERIAL_REGRESSION", "HUMAN_REVIEW_REQUIRED"),
            hypotheses=hypotheses,
            review_required=True,
        )

    if len(gains) >= 2 and not losses:
        return FeedbackDecision(
            recommendation="KEEP",
            reason_codes=(
                "MULTI_METRIC_MATERIAL_IMPROVEMENT",
                "NO_AUTOMATIC_POLICY_CHANGE",
            ),
            hypotheses=hypotheses,
            review_required=False,
        )

    if gains or losses:
        return FeedbackDecision(
            recommendation="ITERATE",
            reason_codes=("MIXED_OR_SINGLE_MATERIAL_SIGNAL", "SCOPED_TEST_REQUIRED"),
            hypotheses=hypotheses,
            review_required=False,
        )

    return FeedbackDecision(
        recommendation="REVIEW",
        reason_codes=("NO_MATERIAL_SIGNAL",),
        hypotheses=hypotheses,
        review_required=False,
    )
