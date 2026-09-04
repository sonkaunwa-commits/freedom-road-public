from __future__ import annotations

import copy
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from execution_traceability.core import TraceabilityError, validate_ledger


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def expect_failure(ledger: dict, policy: Any, label: str) -> None:
    try:
        validate_ledger(ledger, policy)
    except TraceabilityError:
        return
    except Exception as exc:
        raise AssertionError(f"negative case leaked uncontrolled exception for {label}: {type(exc).__name__}: {exc}") from exc
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

    for field, invalid in (("policy_version", "2.0.0"), ("record_kind", "other")):
        malformed = copy.deepcopy(policy)
        malformed[field] = invalid
        expect_failure(sample, malformed, f"invalid {field}")

    expect_failure(sample, None, "non-object policy")

    malformed = copy.deepcopy(policy)
    malformed.pop("id_patterns")
    expect_failure(sample, malformed, "missing id_patterns")

    malformed = copy.deepcopy(policy)
    malformed["id_patterns"] = []
    expect_failure(sample, malformed, "non-object id_patterns")

    malformed = copy.deepcopy(policy)
    malformed["id_patterns"].pop("active_work_id")
    expect_failure(sample, malformed, "missing active_work_id regex")

    malformed = copy.deepcopy(policy)
    malformed["id_patterns"]["task_id"] = "("
    expect_failure(sample, malformed, "invalid task_id regex")

    malformed = copy.deepcopy(policy)
    malformed["allowed_status_tokens"] = []
    expect_failure(sample, malformed, "empty allowed status tokens")

    malformed = copy.deepcopy(policy)
    malformed["allowed_status_tokens"].append("CLAIMED")
    expect_failure(sample, malformed, "duplicate allowed status token")

    malformed = copy.deepcopy(policy)
    malformed["terminal_status_tokens"].append("UNKNOWN_TERMINAL")
    expect_failure(sample, malformed, "unknown terminal status token")

    malformed = copy.deepcopy(policy)
    malformed["terminal_status_tokens"].append("COMPLETED")
    expect_failure(sample, malformed, "duplicate terminal status token")

    for invalid in (False, "true", 1, None):
        malformed = copy.deepcopy(policy)
        malformed["rules"]["private_data_forbidden"] = invalid
        expect_failure(sample, malformed, f"weakened safety rule: {invalid!r}")

    malformed = copy.deepcopy(policy)
    malformed["rules"].pop("path_escape_forbidden")
    expect_failure(sample, malformed, "missing safety rule")

    print("execution-traceability-policy-contract-v1: PASS")


if __name__ == "__main__":
    main()
