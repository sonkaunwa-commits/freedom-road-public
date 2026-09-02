from __future__ import annotations

import copy
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from research_orchestrator.core import ResearchContractError, validate_record


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def expect_failure(record: dict, schema: dict, label: str) -> None:
    try:
        validate_record(record, schema)
    except ResearchContractError:
        return
    raise AssertionError(f"negative case did not fail: {label}")


def main() -> None:
    schema = load("research_orchestrator/schema.v1.json")
    sample = load("research_orchestrator/sample_record.v1.json")
    result = validate_record(sample, schema)
    assert result.status == "FINAL"
    assert result.confidence == "HIGH"

    broken = copy.deepcopy(sample)
    broken["evidence"][0]["source_refs"] = []
    expect_failure(broken, schema, "FACT without source")

    broken = copy.deepcopy(sample)
    broken["evidence"][2]["evidence_refs"] = []
    expect_failure(broken, schema, "INFERENCE without evidence")

    broken = copy.deepcopy(sample)
    broken["sources"][0]["freshness"] = "STALE"
    broken["sources"][1]["freshness"] = "UNKNOWN"
    expect_failure(broken, schema, "current fact on stale sources")

    broken = copy.deepcopy(sample)
    broken["contradictions"] = [{"contradiction_id": "C-1", "status": "OPEN", "evidence_refs": ["E-1", "E-2"]}]
    expect_failure(broken, schema, "high-confidence final with open contradiction")

    broken = copy.deepcopy(sample)
    broken["findings"][0]["evidence_refs"] = []
    expect_failure(broken, schema, "finding without evidence")

    print("research-orchestrator-v1: PASS")


if __name__ == "__main__":
    main()
