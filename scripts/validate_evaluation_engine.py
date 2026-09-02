from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from evaluation_engine.core import EvaluationError, evaluate_candidate, validate_feedback


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def expect_failure(fn, label: str) -> None:
    try:
        fn()
    except EvaluationError:
        return
    raise AssertionError(f"negative case did not fail: {label}")


def main() -> None:
    schema = load("evaluation_engine/schema.v1.json")
    samples = load("evaluation_engine/sample_runs.v1.json")
    baseline = samples["baseline"]
    candidate = samples["candidate"]

    result = evaluate_candidate(baseline, candidate, schema)
    assert result.recommendation == "PROMOTE_CANDIDATE"
    assert "HUMAN_APPROVAL_REQUIRED" in result.reasons
    validate_feedback(samples["feedback"], result)

    broken = copy.deepcopy(candidate)
    broken["metrics"]["quality_score"] = 0.80
    result = evaluate_candidate(baseline, broken, schema)
    assert result.recommendation == "REJECT_CANDIDATE"
    assert result.reasons == ("QUALITY_BELOW_FLOOR",)

    broken = copy.deepcopy(candidate)
    broken["metrics"]["critical_failure_count"] = 1
    result = evaluate_candidate(baseline, broken, schema)
    assert result.recommendation == "REJECT_CANDIDATE"
    assert result.reasons == ("CRITICAL_FAILURE",)

    cheap_but_bad = copy.deepcopy(candidate)
    cheap_but_bad["metrics"]["quality_score"] = 0.86
    cheap_but_bad["metrics"]["monetary_cost"] = 0.01
    result = evaluate_candidate(baseline, cheap_but_bad, schema)
    assert result.recommendation == "KEEP_BASELINE"
    assert "QUALITY_REGRESSION" in result.reasons

    missing_evidence = copy.deepcopy(candidate)
    missing_evidence["evidence_refs"] = []
    expect_failure(lambda: evaluate_candidate(baseline, missing_evidence, schema), "candidate without evidence")

    feedback = copy.deepcopy(samples["feedback"])
    feedback["policy_change_applied"] = True
    expect_failure(lambda: validate_feedback(feedback, evaluate_candidate(baseline, candidate, schema)), "feedback auto-applies policy")

    print("evaluation-engine-v1: PASS")


if __name__ == "__main__":
    main()
