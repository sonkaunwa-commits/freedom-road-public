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


def _require_nonempty(value: Any, name: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise FeedbackContractError(f"{name} must be a non-empty string")


def _validate_rate(metric_name: str, metric: dict[str, Any], source_ids: set[str]) -> float:
    if not isinstance(metric, dict):
        raise FeedbackContractError(f"metric {metric_name} must be an object")
    numerator = metric.get("numerator")
    denominator = metric.get("denominator")
    source_ref = metric.get("source_ref")
    if not isinstance(numerator, (int, float)) or numerator < 0:
        raise FeedbackContractError(f"metric {metric_name} numerator must be >= 0")
    if not isinstance(denominator, (int, float)) or denominator <= 0:
        raise FeedbackContractError(f"metric {metric_name} denominator must be > 0")
    if numerator > denominator:
        raise FeedbackContractError(f"metric {metric_name} numerator cannot exceed denominator")
    if source_ref not in source_ids:
        raise FeedbackContractError(f"metric {metric_name} has unknown source_ref")
    return float(numerator) / float(denominator)


def evaluate_feedback(record: dict[str, Any], policy: dict[str, Any]) -> FeedbackDecision:
    for field in ("feedback_id", "experiment_id", "content_group_id", "channel", "observed_at"):
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
    published_items = sample.get("published_items")
    eligible_items = sample.get("eligible_items")
    if not isinstance(published_items, int) or published_items < 1:
        raise FeedbackContractError("published_items must be >= 1")
    if not isinstance(eligible_items, int) or eligible_items < 1 or eligible_items > published_items:
        raise FeedbackContractError("eligible_items must be between 1 and published_items")

    metrics = record.get("metrics")
    if not isinstance(metrics, dict) or not metrics:
        raise FeedbackContractError("metrics must be a non-empty object")
    observed_rates = {name: _validate_rate(name, value, source_ids) for name, value in metrics.items()}

    baseline = record.get("baseline")
    if not isinstance(baseline, dict):
        raise FeedbackContractError("baseline must be an object")
    if baseline.get("channel") != record.get("channel"):
        raise FeedbackContractError("baseline channel must match observation channel")
    baseline_items = baseline.get("sample_items")
    if not isinstance(baseline_items, int) or baseline_items < 1:
        raise FeedbackContractError("baseline.sample_items must be >= 1")
    baseline_metrics = baseline.get("metrics")
    if not isinstance(baseline_metrics, dict) or not baseline_metrics:
        raise FeedbackContractError("baseline.metrics must be non-empty")
    baseline_rates = {name: _validate_rate(name, value, source_ids) for name, value in baseline_metrics.items()}

    common_metrics = set(observed_rates).intersection(baseline_rates)
    if not common_metrics:
        raise FeedbackContractError("observation and baseline must share at least one metric")

    min_directional = int(policy.get("minimum_directional_items", 3))
    min_stop = int(policy.get("minimum_stop_items", 8))
    material = float(policy.get("material_change_ratio", 0.15))
    positive_metrics = set(policy.get("positive_metrics", []))

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

    gains = [name for name, delta in deltas.items() if name in positive_metrics and delta >= material]
    losses = [name for name, delta in deltas.items() if name in positive_metrics and delta <= -material]
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
            reason_codes=("MULTI_METRIC_MATERIAL_IMPROVEMENT", "NO_AUTOMATIC_POLICY_CHANGE"),
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
