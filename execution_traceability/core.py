from __future__ import annotations

from dataclasses import dataclass
from pathlib import PurePosixPath
import re
from typing import Any


class TraceabilityError(ValueError):
    pass


@dataclass(frozen=True)
class ValidationResult:
    records_checked: int
    active_writers: int


_REQUIRED_TRUE_RULES = (
    "unique_active_work_id",
    "unique_task_id",
    "active_write_scope_conflict_forbidden",
    "waiting_for_write_lease_is_non_writer",
    "completed_requires_verification",
    "completed_requires_closeout_ref",
    "blocked_or_waiting_requires_blocker_ref",
    "write_paths_must_be_repo_relative",
    "path_escape_forbidden",
    "private_data_forbidden",
)


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise TraceabilityError(message)


def _validate_token_list(value: Any, field: str) -> tuple[str, ...]:
    _require(isinstance(value, list) and bool(value), f"{field} must be a non-empty list")
    tokens: list[str] = []
    for item in value:
        _require(isinstance(item, str) and bool(item.strip()), f"{field} entries must be non-empty text")
        token = item.strip()
        _require(token not in tokens, f"duplicate {field} token: {token}")
        tokens.append(token)
    return tuple(tokens)


def _validate_regex(value: Any, field: str) -> str:
    _require(isinstance(value, str) and bool(value), f"{field} must be a non-empty regex string")
    try:
        re.compile(value)
    except re.error as exc:
        raise TraceabilityError(f"invalid {field} regex: {exc}") from exc
    return value


def _validate_policy(policy: Any) -> None:
    _require(isinstance(policy, dict), "policy root must be an object")
    _require(policy.get("policy_version") == "1.0.0", "policy_version must be 1.0.0")
    _require(policy.get("record_kind") == "execution_trace", "record_kind must be execution_trace")
    _require(policy.get("network_required") is False, "traceability validation must remain offline")
    _require(policy.get("mutation_authority") is False, "traceability validation must not mutate work")

    patterns = policy.get("id_patterns")
    _require(isinstance(patterns, dict), "id_patterns must be an object")
    _validate_regex(patterns.get("active_work_id"), "id_patterns.active_work_id")
    _validate_regex(patterns.get("task_id"), "id_patterns.task_id")

    allowed = _validate_token_list(policy.get("allowed_status_tokens"), "allowed_status_tokens")
    terminal = _validate_token_list(policy.get("terminal_status_tokens"), "terminal_status_tokens")
    unknown_terminal = set(terminal).difference(allowed)
    _require(not unknown_terminal, f"terminal status tokens must be allowed: {sorted(unknown_terminal)}")

    rules = policy.get("rules")
    _require(isinstance(rules, dict), "rules must be an object")
    for rule in _REQUIRED_TRUE_RULES:
        _require(rules.get(rule) is True, f"rules.{rule} must remain true")


def _matches(value: Any, pattern: str, field: str) -> str:
    _require(isinstance(value, str) and bool(value), f"{field} is required")
    _require(re.fullmatch(pattern, value) is not None, f"invalid {field}: {value}")
    return value


def _evidence_ref(value: Any, field: str) -> str:
    _require(isinstance(value, str) and bool(value.strip()), f"{field} must be a non-empty text evidence ref")
    return value.strip()


def _verification_refs(value: Any) -> tuple[str, ...]:
    _require(isinstance(value, list), "verification must be a list")
    refs = tuple(_evidence_ref(item, "verification entry") for item in value)
    _require(len(set(refs)) == len(refs), "duplicate verification evidence ref")
    return refs


def _validate_repo_path(value: Any) -> str:
    _require(isinstance(value, str) and bool(value), "write_intent path must be non-empty")
    _require("\\" not in value, f"write_intent path must use repo-relative POSIX form: {value}")
    _require("://" not in value, f"write_intent path must not be a URL: {value}")
    _require(not value.startswith("/"), f"write_intent path must be repo-relative: {value}")

    raw_parts = value.split("/")
    _require(all(part not in ("", ".", "..") for part in raw_parts), f"unsafe write_intent path: {value}")

    path = PurePosixPath(value)
    _require(not path.is_absolute(), f"write_intent path must be repo-relative: {value}")
    _require(".." not in path.parts, f"path escape is forbidden: {value}")
    return path.as_posix()


def _status_tokens(record: dict[str, Any], policy: dict[str, Any]) -> tuple[str, ...]:
    raw = record.get("status_chain")
    _require(isinstance(raw, list) and bool(raw), "status_chain must be a non-empty list")

    allowed = set(policy["allowed_status_tokens"])
    tokens: list[str] = []
    for token in raw:
        _require(isinstance(token, str) and token in allowed, f"invalid status token: {token}")
        _require(token not in tokens, f"duplicate status token: {token}")
        tokens.append(token)

    terminal = set(policy["terminal_status_tokens"])
    present_terminal = terminal.intersection(tokens)
    _require(len(present_terminal) <= 1, "multiple terminal status tokens are forbidden")
    if present_terminal:
        _require(len(tokens) == 1, "terminal status must stand alone")
    return tuple(tokens)


def _validate_record(record: Any, policy: dict[str, Any]) -> dict[str, Any]:
    _require(isinstance(record, dict), "ledger records must be objects")

    patterns = policy["id_patterns"]
    active_work_id = _matches(record.get("active_work_id"), patterns["active_work_id"], "active_work_id")
    task_id = _matches(record.get("task_id"), patterns["task_id"], "task_id")
    _require(isinstance(record.get("objective"), str) and bool(record["objective"].strip()), "objective is required")

    tokens = _status_tokens(record, policy)
    token_set = set(tokens)

    mutation_planned = record.get("mutation_planned")
    _require(isinstance(mutation_planned, bool), "mutation_planned must be boolean")

    write_intent = record.get("write_intent", [])
    _require(isinstance(write_intent, list), "write_intent must be a list")
    normalized_paths = tuple(_validate_repo_path(path) for path in write_intent)
    _require(len(set(normalized_paths)) == len(normalized_paths), "duplicate write_intent path in one record")
    if mutation_planned:
        _require(bool(normalized_paths), "mutating work must declare write_intent")
    else:
        _require(not normalized_paths, "non-mutating work must not declare write_intent")

    _require(record.get("private_data") is False, "private_data must remain false in this public ledger")

    blocker_ref = record.get("blocker_ref")
    if blocker_ref is not None:
        blocker_ref = _evidence_ref(blocker_ref, "blocker_ref")
    if "WAITING_FOR_WRITE_LEASE" in token_set or "BLOCKED" in token_set:
        _require(blocker_ref is not None, "blocked or waiting work requires blocker_ref")

    verification = _verification_refs(record.get("verification", []))

    closeout_ref = record.get("closeout_ref")
    if closeout_ref is not None:
        closeout_ref = _evidence_ref(closeout_ref, "closeout_ref")
    if "COMPLETED" in token_set:
        _require(bool(verification), "COMPLETED work requires verification evidence")
        _require(closeout_ref is not None, "COMPLETED work requires closeout_ref")

    terminal = bool(set(policy["terminal_status_tokens"]).intersection(token_set))
    non_writer_state = "WAITING_FOR_WRITE_LEASE" in token_set or "BLOCKED" in token_set
    is_active_writer = mutation_planned and not terminal and not non_writer_state

    return {
        "active_work_id": active_work_id,
        "task_id": task_id,
        "status_tokens": tokens,
        "write_intent": normalized_paths,
        "is_active_writer": is_active_writer,
    }


def _paths_overlap(left: str, right: str) -> bool:
    return left == right or left.startswith(right + "/") or right.startswith(left + "/")


def validate_ledger(ledger: Any, policy: dict[str, Any]) -> ValidationResult:
    _require(isinstance(ledger, dict), "ledger root must be an object")
    _require(ledger.get("ledger_version") == "1.0.0", "ledger_version must be 1.0.0")
    _validate_policy(policy)

    records = ledger.get("records")
    _require(isinstance(records, list) and bool(records), "records must be a non-empty list")

    normalized = [_validate_record(record, policy) for record in records]

    active_ids: set[str] = set()
    task_ids: set[str] = set()
    for record in normalized:
        _require(record["active_work_id"] not in active_ids, f"duplicate active_work_id: {record['active_work_id']}")
        _require(record["task_id"] not in task_ids, f"duplicate task_id: {record['task_id']}")
        active_ids.add(record["active_work_id"])
        task_ids.add(record["task_id"])

    writers = [record for record in normalized if record["is_active_writer"]]
    for index, left in enumerate(writers):
        for right in writers[index + 1 :]:
            for left_path in left["write_intent"]:
                for right_path in right["write_intent"]:
                    if _paths_overlap(left_path, right_path):
                        raise TraceabilityError(
                            "active write scope conflict: "
                            f"{left['active_work_id']}:{left_path} overlaps "
                            f"{right['active_work_id']}:{right_path}"
                        )

    return ValidationResult(records_checked=len(normalized), active_writers=len(writers))
