from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class CreatorEngineError(ValueError):
    pass


@dataclass(frozen=True)
class CreatorValidationResult:
    stage: str
    publish_ready: bool
    learning_ready: bool


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise CreatorEngineError(message)


def validate_record(record: dict[str, Any], schema: dict[str, Any]) -> CreatorValidationResult:
    _require(record.get("schema_version") == schema.get("schema_version"), "schema version mismatch")
    _require(record.get("stage") in schema["pipeline_stages"], "unknown pipeline stage")
    _require(record.get("channel") in schema["channels"], "unknown channel")

    research = record.get("research") or {}
    _require(research.get("status") in schema["research_statuses"], "invalid research status")
    evidence_refs = research.get("evidence_refs") or []
    if research.get("status") == "COMPLETE":
        _require(bool(evidence_refs), "completed research requires evidence refs")

    thesis = record.get("thesis") or {}
    _require(bool(thesis.get("statement")), "thesis statement is required")
    _require(bool(thesis.get("human_owner")), "human thesis owner is required")
    _require(thesis.get("decision") in schema["human_decisions"], "invalid thesis decision")

    draft = record.get("draft") or {}
    _require(bool(draft.get("content_ref")), "draft content ref is required")
    _require(bool(draft.get("derived_from_evidence_refs")), "draft must retain evidence provenance")
    _require(set(draft["derived_from_evidence_refs"]).issubset(set(evidence_refs)), "draft references unknown research evidence")

    adaptation = record.get("channel_adaptation") or {}
    _require(adaptation.get("channel") == record.get("channel"), "channel adaptation mismatch")
    _require(bool(adaptation.get("adaptation_ref")), "channel adaptation ref is required")

    gates = record.get("quality_gates") or {}
    for gate in schema["required_publish_gates"]:
        _require(gates.get(gate) in schema["gate_statuses"], f"missing or invalid gate: {gate}")

    final_decision = record.get("human_final_decision")
    _require(final_decision in schema["human_decisions"], "invalid human final decision")

    publish_ready = record.get("stage") in {"PUBLISH_READY", "PUBLISHED", "PERFORMANCE", "LEARNING"}
    if publish_ready:
        _require(research.get("status") == "COMPLETE", "publish-ready content requires completed research")
        _require(all(gates[gate] == "PASS" for gate in schema["required_publish_gates"]), "all publish gates must pass")
        _require(thesis.get("decision") == "APPROVE", "publish-ready content requires approved thesis")
        _require(final_decision == "APPROVE", "publish-ready content requires human final approval")
        _require(schema["policy"].get("external_publish_authority_granted") is False, "pilot must not grant external publish authority")

    performance = record.get("performance") or {}
    learning = record.get("learning") or {}
    learning_ready = record.get("stage") == "LEARNING"
    if record.get("stage") in {"PERFORMANCE", "LEARNING"}:
        _require(bool(performance.get("observation_id")), "performance stage requires observation id")
        _require(isinstance(performance.get("metrics"), dict) and bool(performance["metrics"]), "performance metrics required")
    if learning_ready:
        _require(bool(learning.get("learning_id")), "learning stage requires learning id")
        _require(bool(learning.get("based_on_observation_refs")), "learning requires performance observation refs")
        _require(performance.get("observation_id") in learning["based_on_observation_refs"], "learning must reference current observation")
        _require(learning.get("policy_change_applied") is False, "learning feedback cannot auto-change policy")

    return CreatorValidationResult(stage=record["stage"], publish_ready=publish_ready, learning_ready=learning_ready)
