from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from creator_engine.core import CreatorEngineError, validate_record


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def expect_failure(record: dict, schema: dict, label: str) -> None:
    try:
        validate_record(record, schema)
    except CreatorEngineError:
        return
    raise AssertionError(f"negative case did not fail: {label}")


def main() -> None:
    schema = load("creator_engine/schema.v1.json")
    sample = load("creator_engine/sample_record.v1.json")
    result = validate_record(sample, schema)
    assert result.publish_ready is True
    assert result.learning_ready is True

    broken = copy.deepcopy(sample)
    broken["research"]["evidence_refs"] = []
    expect_failure(broken, schema, "completed research without evidence")

    broken = copy.deepcopy(sample)
    broken["thesis"]["human_owner"] = ""
    expect_failure(broken, schema, "missing human thesis owner")

    broken = copy.deepcopy(sample)
    broken["quality_gates"]["research_grounded"] = "FAIL"
    expect_failure(broken, schema, "publish-ready with failed quality gate")

    broken = copy.deepcopy(sample)
    broken["human_final_decision"] = "PENDING"
    expect_failure(broken, schema, "publish-ready without human approval")

    broken = copy.deepcopy(sample)
    broken["learning"]["policy_change_applied"] = True
    expect_failure(broken, schema, "feedback silently changes policy")

    print("creator-engine-pilot-v1: PASS")


if __name__ == "__main__":
    main()
