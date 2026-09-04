from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from execution_traceability.core import TraceabilityError, validate_ledger


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def expect_failure(ledger: dict, policy: dict, label: str) -> None:
    try:
        validate_ledger(ledger, policy)
    except TraceabilityError:
        return
    raise AssertionError(f"negative case did not fail: {label}")


def main() -> None:
    policy = load("execution_traceability/policy.v1.json")
    sample = load("execution_traceability/sample_ledger.v1.json")

    result = validate_ledger(sample, policy)
    assert result.records_checked == 3
    assert result.active_writers == 1

    for invalid in (True, {}, ""):
        broken = copy.deepcopy(sample)
        broken["records"][1]["blocker_ref"] = invalid
        expect_failure(broken, policy, f"invalid blocker_ref: {invalid!r}")

    completed_index = 2
    for invalid_verification in ([True], [{}], [""], ["self-test:PASS", "self-test:PASS"]):
        broken = copy.deepcopy(sample)
        broken["records"][completed_index]["verification"] = invalid_verification
        expect_failure(broken, policy, f"invalid verification: {invalid_verification!r}")

    broken = copy.deepcopy(sample)
    broken["records"][completed_index]["closeout_ref"] = True
    expect_failure(broken, policy, "boolean closeout_ref")

    broken = copy.deepcopy(sample)
    broken["records"][0]["verification"] = [True]
    expect_failure(broken, policy, "invalid non-terminal verification evidence")

    conflict = copy.deepcopy(sample)
    conflict["records"].append(
        {
            "active_work_id": "AW-SECOND-WRITER-V1",
            "task_id": "SECOND-WRITER-V1",
            "objective": "Exercise active write-scope conflict detection.",
            "status_chain": ["CLAIMED", "IN_PROGRESS"],
            "mutation_planned": True,
            "write_intent": ["release-smoke"],
            "private_data": False,
            "verification": [],
        }
    )
    expect_failure(conflict, policy, "overlapping active writer scope")

    unsafe_policy = copy.deepcopy(policy)
    unsafe_policy["mutation_authority"] = True
    expect_failure(sample, unsafe_policy, "mutation authority expansion")

    print("execution-traceability-evidence-integrity-v1: PASS")


if __name__ == "__main__":
    main()
