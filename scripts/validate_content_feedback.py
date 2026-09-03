import copy
import json
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
            raise AssertionError(f"expected error containing {expected_fragment!r}, got {exc!r}") from exc
        return
    raise AssertionError(f"expected FeedbackContractError containing {expected_fragment!r}")


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

    assert policy["rules"]["same_channel_baseline_required"] is True
    assert policy["rules"]["preserve_denominators"] is True
    assert policy["rules"]["single_item_policy_change_forbidden"] is True
    assert policy["rules"]["causality_claim_forbidden"] is True
    assert policy["rules"]["policy_mutation_allowed"] is False

    print("content-feedback validation: PASS")


if __name__ == "__main__":
    main()
