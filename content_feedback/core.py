from dataclasses import dataclass
from datetime import datetime
from math import isfinite
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


_REQUIRED_TRUE_RULES = {
    "same_channel_baseline_required",
    "metric_provenance_required",
    "preserve_denominators",
    "single_item_policy_change_forbidden",
    "causality_claim_forbidden",
    "stop_requires_review",
}


def _require_nonempty(value: Any, name: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise FeedbackContractError(f"{name} must be a non-empty string")


def _require_aware_iso8601(value: Any, name: str) -> datetime:
    _require_nonempty(value, name)
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise FeedbackContractError(f"{name} must be ISO-8601") from exc
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise FeedbackContractError(f"{name} must include a timezone")
    return parsed


def _require_finite_number(value: Any, name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise FeedbackContractError(f"{name} must be numeric")
    numeric = float(value)
    if not isfinite(numeric):
        raise FeedbackContractError(f"{name} must be finite")
    return numeric


def _require_policy_int(policy: dict[str, Any], field: str, minimum: int) -> int:
    value = policy.get(field)
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise FeedbackContractError(f"policy.{field} must be an integer >= {minimum}")
    return value


def _require_policy_rate(policy: dict[str, Any], field: str) -> float:
    value = _require_finite_number(policy.get(field), f"policy.{field}")
    if not 0 <= value <= 1:
        raise FeedbackContractError(f"policy.{field} must be numeric within [0, 1]")
    return value


def _validate_policy(policy: dict[str, Any]) -> tuple[int, int, float, set[str]]:
    if not isinstance(policy, dict):
        raise FeedbackContractError("policy must be an object")
    min_directional = _require_policy_int(policy, "minimum_directional_items", 1)
    min_stop = _require_policy_int(policy, "minimum_stop_items", 1)
    if min_stop < min_directional:
        raise FeedbackContractError("policy.minimum_stop_items must be >= minimum_directional_items")
    material = _require_policy_rate(policy, "material_change_ratio")
    positive_metrics_value = policy.get("positive_metrics")
    if not isinstance(positive_metrics_value, list) or not positive_metrics_value:
        raise FeedbackContractError("policy.positive_metrics must be a non-empty list")
    positive_metrics: list[str] = []
    for metric_name in positive_metrics_value:
        _require_nonempty(metric_name, "policy.positive_metrics[]")
        positive_metrics.append(metric_name.strip())
    if len(positive_metrics) != len(set(positive_metrics)):
        raise FeedbackContractError("policy.positive_metrics must be unique")
    rules = policy.get("rules")
    if not isinstance(rules, dict):
        raise FeedbackContractError("policy.rules must be an object")
    for rule in _REQUIRED_TRUE_RULES:
        if rules.get(rule) is not True:
            raise FeedbackContractError(f"policy.rules.{rule} must remain true")
    if rules.get("policy_mutation_allowed") is not False:
        raise FeedbackContractError("policy.rules.policy_mutation_allowed must remain false")
    return min_directional, min_stop, material, set(positive_metrics)


def _validate_rate(metric_name: str, metric: dict[str, Any], source_ids: set[str]) -> float:
    if not isinstance(metric, dict):
        raise FeedbackContractError(f"metric {metric_name} must be an object")
    numerator = _require_finite_number(metric.get("numerator"), f"metric {metric_name} numerator")
    denominator = _require_finite_number(metric.get("denominator"), f"metric {metric_name} denominator")
    source_ref = metric.get("source_ref")
    if numerator < 0:
        raise FeedbackContractError(f"metric {metric_name} numerator must be >= 0")
    if denominator <= 0:
        raise FeedbackContractError(f"metric {metric_name} denominator must be > 0")
    if numerator > denominator:
        raise FeedbackContractError(f"metric {metric_name} numerator cannot exceed denominator")
    if source_ref not in source_ids:
        raise FeedbackContractError(f"metric {metric_name} has unknown source_ref")
    return numerator / denominator


def evaluate_feedback(record: dict[str, Any], policy: dict[str, Any]) -> FeedbackDecision:
    if not isinstance(record, dict):
        raise FeedbackContractError("record must be an object")
    min_directional, min_stop, material, positive_metrics = _validate_policy(policy)
    for field in ("feedback_id", "experiment_id", "content_group_id", "channel"):
        _require_nonempty(record.get(field), field)
    observed_at = _require_aware_iso8601(record.get("observed_at"), "observed_at")
    sources = record.get("sources")
    if not isinstance(sources, list) or not sources:
        raise FeedbackContractError("sources must be a non-empty list")
    source_ids: set[str] = set()
    for source in sources:
        if not isinstance(source, dict):
            raise FeedbackContractError("source must be an object")
        for field in ("source_id", "provider", "locator"):
            _require_nonempty(source.get(field), f"source.{field}")
        collected_at = _require_aware_iso8601(source.get("collected_at"), "source.collected_at")
        if collected_at > observed_at:
            raise FeedbackContractError("source.collected_at cannot be after observed_at")
        source_id = source["source_id"]
        if source_id in source_ids:
            raise FeedbackContractError("source_id values must be unique")
        source_ids.add(source_id)
    sample = record.get("sample")
    if not isinstance(sample, dict):
        raise FeedbackContractError("sample must be an object")
    published_items = sample.get("published_items")
    eligible_items = sample.get("eligible_items")
    if isinstance(published_items, bool) or not isinstance(published_items, int) or published_items < 1:
        raise FeedbackContractError("published_items must be >= 1")
    if isinstance(eligible_items, bool) or not isinstance(eligible_items, int) or eligible_items < 1 or eligible_items > published_items:
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
    if isinstance(baseline_items, bool) or not isinstance(baseline_items, int) or baseline_items < 1:
        raise FeedbackContractError("baseline.sample_items must be >= 1")
    baseline_metrics = baseline.get("metrics")
    if not isinstance(baseline_metrics, dict) or not baseline_metrics:
        raise FeedbackContractError("baseline.metrics must be non-empty")
    baseline_rates = {name: _validate_rate(name, value, source_ids) for name, value in baseline_metrics.items()}
    common_metrics = set(observed_rates).intersection(baseline_rates)
    if not common_metrics:
        raise FeedbackContractError("observation and baseline must share at least one metric")
    deltas: dict[str, float] = {}
    for name in sorted(common_metrics):
        baseline_rate = baseline_rates[name]
        if baseline_rate <= 0:
            continue
        deltas[name] = observed_rates[name] / baseline_rate - 1.0
    if eligible_items < min_directional:
        return FeedbackDecision("INSUFFICIENT_DATA", ("SAMPLE_BELOW_DIRECTIONAL_MINIMUM",), (), False)
    gains = [name for name, delta in deltas.items() if name in positive_metrics and delta >= material]
    losses = [name for name, delta in deltas.items() if name in positive_metrics and delta <= -material]
    hypotheses = tuple(f"Observed {name} changed {delta:+.1%} versus same-channel baseline; test a scoped explanation before changing policy." for name, delta in sorted(deltas.items()) if abs(delta) >= material)
    if eligible_items >= min_stop and len(losses) >= 2 and not gains:
        return FeedbackDecision("STOP_EXPERIMENT", ("MULTI_METRIC_MATERIAL_REGRESSION", "HUMAN_REVIEW_REQUIRED"), hypotheses, True)
    if len(gains) >= 2 and not losses:
        return FeedbackDecision("KEEP", ("MULTI_METRIC_MATERIAL_IMPROVEMENT", "NO_AUTOMATIC_POLICY_CHANGE"), hypotheses, False)
    if gains or losses:
        return FeedbackDecision("ITERATE", ("MIXED_OR_SINGLE_MATERIAL_SIGNAL", "SCOPED_TEST_REQUIRED"), hypotheses, False)
    return FeedbackDecision("REVIEW", ("NO_MATERIAL_SIGNAL",), hypotheses, False)
