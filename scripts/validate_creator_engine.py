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
    broken["research"]["evidence_refs"] = "evidence-1"
    expect_failure(broken, schema, "research evidence is not a list")

    broken = copy.deepcopy(sample)
    broken["draft"]["derived_from_evidence_refs"] = [broken["research"]["evidence_refs"][0]] * 2
    expect_failure(broken, schema, "duplicate draft provenance refs")

    broken = copy.deepcopy(sample)
    broken["thesis"]["human_owner"] = ""
    expect_failure(broken, schema, "missing human thesis owner")

    broken = copy.deepcopy(sample)
    broken["quality_gates"] = []
    expect_failure(broken, schema, "quality gates wrong container type")

    broken = copy.deepcopy(sample)
    broken["quality_gates"]["research_grounded"] = "FAIL"
    expect_failure(broken, schema, "publish-ready with failed quality gate")

    broken = copy.deepcopy(sample)
    broken["human_final_decision"] = "PENDING"
    expect_failure(broken, schema, "publish-ready without human approval")

    broken = copy.deepcopy(sample)
    broken["learning"]["based_on_observation_refs"] = "observation-1"
    expect_failure(broken, schema, "learning observation refs wrong type")

    broken = copy.deepcopy(sample)
    broken["learning"]["policy_change_applied"] = True
    expect_failure(broken, schema, "feedback silently changes policy")

    for rule, bad_value in (
        ("research_required_before_publish_ready", False),
        ("human_thesis_owner_required", False),
        ("human_final_decision_required", False),
        ("performance_feedback_may_auto_change_policy", True),
        ("external_publish_authority_granted", True),
    ):
        broken_schema = copy.deepcopy(schema)
        broken_schema["policy"][rule] = bad_value
        expect_failure(sample, broken_schema, f"policy drift {rule}")

    broken_schema = copy.deepcopy(schema)
    broken_schema["required_publish_gates"].append(broken_schema["required_publish_gates"][0])
    expect_failure(sample, broken_schema, "duplicate required publish gate")

    broken_schema = copy.deepcopy(schema)
    broken_schema["channels"] = "WEB"
    expect_failure(sample, broken_schema, "channels wrong container type")

    print("creator-engine-pilot-v1: PASS")


if __name__ == "__main__":
    main()
