from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class ResearchContractError(ValueError):
    pass


@dataclass(frozen=True)
class ValidationResult:
    research_id: str
    source_count: int
    evidence_count: int
    finding_count: int
    open_contradictions: int
    status: str
    confidence: str


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ResearchContractError(message)


def _unique_ids(items: list[dict[str, Any]], key: str, label: str) -> set[str]:
    values = [str(item.get(key, "")).strip() for item in items]
    _require(all(values), f"{label} entries require {key}")
    _require(len(values) == len(set(values)), f"duplicate {label} {key}")
    return set(values)


def validate_record(record: dict[str, Any], schema: dict[str, Any]) -> ValidationResult:
    for field in schema["required"]:
        _require(field in record, f"missing required field: {field}")

    enums = schema["enums"]
    sources = list(record["sources"])
    evidence = list(record["evidence"])
    contradictions = list(record["contradictions"])
    findings = list(record["findings"])

    source_ids = _unique_ids(sources, "source_id", "source")
    evidence_ids = _unique_ids(evidence, "evidence_id", "evidence")
    _unique_ids(findings, "finding_id", "finding")

    source_by_id = {item["source_id"]: item for item in sources}

    for source in sources:
        _require(source.get("quality") in enums["source_quality"], "invalid source quality")
        _require(source.get("freshness") in enums["freshness"], "invalid source freshness")
        _require(bool(str(source.get("acquired_at", "")).strip()), "source acquired_at is required")
        _require(bool(str(source.get("locator", "")).strip()), "source locator is required")

    for item in evidence:
        evidence_type = item.get("type")
        _require(evidence_type in enums["evidence_type"], "invalid evidence type")
        source_refs = set(item.get("source_refs") or [])
        evidence_refs = set(item.get("evidence_refs") or [])
        _require(source_refs <= source_ids, "evidence references unknown source")
        _require(evidence_refs <= evidence_ids, "evidence references unknown evidence")
        _require(bool(str(item.get("claim", "")).strip()), "evidence claim is required")

        if evidence_type == "FACT":
            _require(bool(source_refs), "FACT requires source_refs")
        elif evidence_type == "INFERENCE":
            _require(bool(evidence_refs), "INFERENCE requires evidence_refs")
        elif evidence_type == "OPINION":
            _require(item.get("presented_as_source_fact") is not True, "OPINION cannot be presented as source fact")

        if item.get("current_fact") is True:
            _require(bool(source_refs), "current FACT requires source refs")
            states = {source_by_id[source_id]["freshness"] for source_id in source_refs}
            _require(bool(states & {"CURRENT", "RECENT"}), "current fact cannot rely only on STALE/UNKNOWN sources")

    open_contradictions = 0
    for item in contradictions:
        status = item.get("status")
        _require(status in enums["contradiction_status"], "invalid contradiction status")
        refs = set(item.get("evidence_refs") or [])
        _require(len(refs) >= 2, "contradiction requires at least two evidence refs")
        _require(refs <= evidence_ids, "contradiction references unknown evidence")
        if status == "OPEN":
            open_contradictions += 1

    for finding in findings:
        refs = set(finding.get("evidence_refs") or [])
        _require(bool(refs), "finding requires evidence_refs")
        _require(refs <= evidence_ids, "finding references unknown evidence")
        _require(bool(str(finding.get("statement", "")).strip()), "finding statement is required")

    status = record["status"]
    confidence = record["confidence"]
    _require(status in enums["research_status"], "invalid research status")
    _require(confidence in enums["confidence"], "invalid confidence")
    if status == "FINAL" and confidence == "HIGH":
        _require(open_contradictions == 0, "HIGH-confidence FINAL record cannot contain OPEN contradiction")

    return ValidationResult(
        research_id=str(record["research_id"]),
        source_count=len(sources),
        evidence_count=len(evidence),
        finding_count=len(findings),
        open_contradictions=open_contradictions,
        status=status,
        confidence=confidence,
    )
