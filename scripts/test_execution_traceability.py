from __future__ import annotations

from copy import deepcopy
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from execution_traceability.core import TraceabilityError, validate_ledger


POLICY = json.loads((ROOT / "execution_traceability" / "policy.v1.json").read_text(encoding="utf-8"))
SAMPLE = json.loads((ROOT / "execution_traceability" / "sample_ledger.v1.json").read_text(encoding="utf-8"))


def expect_fail(ledger: dict, fragment: str) -> None:
    try:
        validate_ledger(ledger, POLICY)
    except TraceabilityError as exc:
        if fragment not in str(exc):
            raise AssertionError(f"expected {fragment!r}, got {exc!r}") from exc
    else:
        raise AssertionError(f"expected failure containing {fragment!r}")


def main() -> None:
    result = validate_ledger(SAMPLE, POLICY)
    assert result.records_checked == 3
    assert result.active_writers == 1

    duplicate = deepcopy(SAMPLE)
    duplicate["records"][1]["active_work_id"] = duplicate["records"][0]["active_work_id"]
    expect_fail(duplicate, "duplicate active_work_id")

    duplicate_task = deepcopy(SAMPLE)
    duplicate_task["records"][1]["task_id"] = duplicate_task["records"][0]["task_id"]
    expect_fail(duplicate_task, "duplicate task_id")

    invalid_status = deepcopy(SAMPLE)
    invalid_status["records"][0]["status_chain"] = ["CLAIMED", "UNKNOWN"]
    expect_fail(invalid_status, "invalid status token")

    path_escape = deepcopy(SAMPLE)
    path_escape["records"][0]["write_intent"] = ["../outside.txt"]
    expect_fail(path_escape, "unsafe write_intent path")

    conflict = deepcopy(SAMPLE)
    conflict["records"][1]["status_chain"] = ["CLAIMED", "IN_PROGRESS"]
    conflict["records"][1].pop("blocker_ref", None)
    expect_fail(conflict, "active write scope conflict")

    completed_without_evidence = deepcopy(SAMPLE)
    completed_without_evidence["records"][2]["verification"] = []
    expect_fail(completed_without_evidence, "requires verification evidence")

    completed_without_closeout = deepcopy(SAMPLE)
    completed_without_closeout["records"][2].pop("closeout_ref", None)
    expect_fail(completed_without_closeout, "requires closeout_ref")

    print("execution-traceability self-test: PASS")


if __name__ == "__main__":
    main()
