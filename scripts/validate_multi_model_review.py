from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from multi_model_review.core import ReviewContractError, validate_review


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def expect_failure(record: dict, label: str) -> None:
    try:
        validate_review(record)
    except ReviewContractError:
        return
    raise AssertionError(f"negative case did not fail: {label}")


def main() -> None:
    sample = load("multi_model_review/sample_record.v1.json")
    result = validate_review(sample)
    assert result.decision == "REVIEW_REQUIRED"
    assert result.human_approval_required is True
    assert "MATERIAL_DISAGREEMENT" in result.reason_codes

    broken = copy.deepcopy(sample)
    broken["primary"]["provenance_ref"] = ""
    expect_failure(broken, "missing primary provenance")

    broken = copy.deepcopy(sample)
    broken["review"]["evidence_refs"] = []
    expect_failure(broken, "review without evidence")

    broken = copy.deepcopy(sample)
    broken["review"]["decision"] = "ACCEPT_PRIMARY"
    expect_failure(broken, "high-risk material disagreement silently accepted")

    broken = copy.deepcopy(sample)
    broken["auto_promote"] = True
    expect_failure(broken, "automatic promotion")

    low_risk = copy.deepcopy(sample)
    low_risk["risk_level"] = "LOW"
    low_risk["disagreement"] = {"severity": "LOW", "dimensions": ["wording"]}
    low_risk["review"]["decision"] = "ACCEPT_PRIMARY"
    result = validate_review(low_risk)
    assert result.decision == "ACCEPT_PRIMARY"

    print("multi-model-review-v1: PASS")


if __name__ == "__main__":
    main()
