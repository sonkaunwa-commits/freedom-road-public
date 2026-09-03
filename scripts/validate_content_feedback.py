import copy
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from content_feedback.core import FeedbackContractError, evaluate_feedback


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def expect_error(record, policy, expected_fragment):
    try:
        evaluate_feedback(record, policy)
    except FeedbackContractError as exc:
        if expected_fragment not in str(exc):
            raise AssertionError(
                f"expected error containing {expected_fragment!r}, got {exc!r}"
            ) from exc
        return
    raise AssertionError(
        f"expected FeedbackContractError containing {expected_fragment!r}"
    )


def main():
    policy = load_json(ROOT / "content_feedback" / "policy.v1.json")
    sample = load_json(ROOT / "content_feedback" / "sample_record.v1.json")

    decision = evaluate_feedback(sample, policy)
    assert decision.recommendation == "KEEP", decision
    assert decision.policy_mutation_allowed is False
    assert "NO_AUTOMATIC_POLICY_CHANGE" in decision.reason_codes
    assert len(decision.hypotheses) >= 2

    tiny = copy.deepcopy(sample)
    tiny["sample"]["published_items"] = 1
    tiny["sample"]["eligible_items"] = 1
    tiny_decision = evaluate_feedback(tiny, policy)
    assert tiny_decision.recommendation == "INSUFFICIENT_DATA"

    cross_channel = copy.deepcopy(sample)
    cross_channel["baseline"]["channel"] = "short-video"
    expect_error(cross_channel, policy, "baseline channel must match")

    broken_denominator = copy.deepcopy(sample)
    broken_denominator["metrics"]["view_rate"]["denominator"] = 0
    expect_error(broken_denominator, policy, "denominator must be > 0")

    missing_provenance = copy.deepcopy(sample)
    missing_provenance["metrics"]["view_rate"]["source_ref"] = "missing-source"
    expect_error(missing_provenance, policy, "unknown source_ref")

    losing = copy.deepcopy(sample)
    losing["metrics"]["view_rate"]["numerator"] = 1500
    losing["metrics"]["save_rate"]["numerator"] = 45
    losing["metrics"]["save_rate"]["denominator"] = 1500
    losing["metrics"]["share_rate"]["numerator"] = 30
    losing["metrics"]["share_rate"]["denominator"] = 1500
    stop = evaluate_feedback(losing, policy)
    assert stop.recommendation == "STOP_EXPERIMENT", stop
    assert stop.review_required is True
    assert stop.policy_mutation_allowed is False

    for location, expected in (
        (("sample", "published_items"), "published_items must be an integer"),
        (("sample", "eligible_items"), "eligible_items must be an integer"),
        (("baseline", "sample_items"), "baseline.sample_items must be an integer"),
        (
            ("metrics", "view_rate", "numerator"),
            "numerator must be a finite number",
        ),
        (
            ("metrics", "view_rate", "denominator"),
            "denominator must be a finite number",
        ),
    ):
        malformed = copy.deepcopy(sample)
        target = malformed
        for key in location[:-1]:
            target = target[key]
        target[location[-1]] = True
        expect_error(malformed, policy, expected)

    for value in (math.nan, math.inf, -math.inf):
        malformed = copy.deepcopy(sample)
        malformed["metrics"]["view_rate"]["numerator"] = value
        expect_error(malformed, policy, "numerator must be a finite number")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy.pop("minimum_directional_items")
    expect_error(sample, malformed_policy, "policy.minimum_directional_items")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["minimum_stop_items"] = True
    expect_error(sample, malformed_policy, "policy.minimum_stop_items")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["minimum_stop_items"] = 2
    expect_error(
        sample,
        malformed_policy,
        "must be >= policy.minimum_directional_items",
    )

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["material_change_ratio"] = math.nan
    expect_error(
        sample,
        malformed_policy,
        "policy.material_change_ratio must be a finite number",
    )

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["material_change_ratio"] = 0
    expect_error(sample, malformed_policy, "policy.material_change_ratio must be > 0")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["positive_metrics"] = "view_rate"
    expect_error(
        sample,
        malformed_policy,
        "policy.positive_metrics must be a non-empty list",
    )

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["positive_metrics"].append("view_rate")
    expect_error(
        sample,
        malformed_policy,
        "policy.positive_metrics values must be unique",
    )

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["recommendations"] = ["KEEP"]
    expect_error(sample, malformed_policy, "supported recommendation set")

    for rule_name, bad_value in (
        ("policy_mutation_allowed", True),
        ("stop_requires_review", False),
        ("same_channel_baseline_required", False),
        ("metric_provenance_required", False),
        ("preserve_denominators", False),
        ("single_item_policy_change_forbidden", False),
        ("causality_claim_forbidden", False),
    ):
        malformed_policy = copy.deepcopy(policy)
        malformed_policy["rules"][rule_name] = bad_value
        expect_error(sample, malformed_policy, f"policy.rules.{rule_name}")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["rules"].pop("policy_mutation_allowed")
    expect_error(
        sample,
        malformed_policy,
        "policy.rules.policy_mutation_allowed is required",
    )

    print("content-feedback validation: PASS")


if __name__ == "__main__":
    main()
