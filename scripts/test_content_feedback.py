#!/usr/bin/env python3
from copy import deepcopy
import json
import math
from pathlib import Path

from content_feedback.core import FeedbackContractError, evaluate_feedback


ROOT = Path(__file__).resolve().parents[1]
POLICY = json.loads((ROOT / "content_feedback/policy.v1.json").read_text(encoding="utf-8"))
SAMPLE = json.loads((ROOT / "content_feedback/sample_record.v1.json").read_text(encoding="utf-8"))


def expect_error(record=None, policy=None):
    try:
        evaluate_feedback(
            record if record is not None else deepcopy(SAMPLE),
            policy if policy is not None else deepcopy(POLICY),
        )
    except FeedbackContractError:
        return
    raise AssertionError("expected FeedbackContractError")


decision = evaluate_feedback(deepcopy(SAMPLE), deepcopy(POLICY))
assert decision.recommendation == "KEEP"
assert decision.policy_mutation_allowed is False

bad = deepcopy(SAMPLE)
bad["observed_at"] = "2026-09-03T00:00:00"
expect_error(bad)

bad = deepcopy(SAMPLE)
bad["observed_at"] = "not-a-time"
expect_error(bad)

bad = deepcopy(SAMPLE)
bad["sources"][0]["collected_at"] = "2026-09-04T00:00:00Z"
expect_error(bad)

bad = deepcopy(SAMPLE)
bad["sources"][0]["collected_at"] = "2026-09-03T00:00:00"
expect_error(bad)

for value in (math.nan, math.inf, -math.inf):
    bad = deepcopy(SAMPLE)
    bad["metrics"]["view_rate"]["numerator"] = value
    expect_error(bad)

for value in (math.nan, math.inf, -math.inf):
    bad_policy = deepcopy(POLICY)
    bad_policy["material_change_ratio"] = value
    expect_error(policy=bad_policy)

print("content-feedback temporal/finite self-test: PASS")
