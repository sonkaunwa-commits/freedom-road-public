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


def _require_string_list(value: Any, name: str, *, nonempty: bool = True) -> list[str]:
    _require(isinstance(value, list), f"{name} must be a list")
    if nonempty:
        _require(bool(value), f"{name} must be a non-empty list")
    _require(all(isinstance(item, str) and item.strip() for item in value), f"{name} entries must be non-empty strings")
    _require(len(value) == len(set(value)), f"{name} entries must be unique")
    return value


def _validate_schema(schema: dict[str, Any]) -> None:
    _require(isinstance(schema, dict), "schema must be an object")
    _require(isinstance(schema.get("schema_version"), str) and bool(schema["schema_version"].strip()), "schema_version is required")
    for field in ("pipeline_stages", "channels", "research_statuses", "gate_statuses", "human_decisions", "required_publish_gates"):
        _require_string_list(schema.get(field), field)

    policy = schema.get("policy")
    _require(isinstance(policy, dict), "policy must be an object")
    _require(policy.get("research_required_before_publish_ready") is True, "publish-ready research requirement must remain enabled")
    _require(policy.get("human_thesis_owner_required") is True, "human thesis owner requirement must remain enabled")
    _require(policy.get("human_final_decision_required") is True, "human final decision requirement must remain enabled")
    _require(policy.get("performance_feedback_may_auto_change_policy") is False, "performance feedback cannot auto-change policy")
    _require(policy.get("external_publish_authority_granted") is False, "pilot must not grant external publish authority")


def validate_record(record: dict[str, Any], schema: dict[str, Any]) -> CreatorValidationResult:
    _validate_schema(schema)
    _require(isinstance(record, dict), "record must be an object")
    _require(record.get("schema_version") == schema.get("schema_version"), "schema version mismatch")
    _require(record.get("stage") in schema["pipeline_stages"], "unknown pipeline stage")
    _require(record.get("channel") in schema["channels"], "unknown channel")

    research = record.get("research")
    _require(isinstance(research, dict), "research must be an object")
    _require(research.get("status") in schema["research_statuses"], "invalid research status")
    evidence_refs = _require_string_list(research.get("evidence_refs"), "research.evidence_refs", nonempty=False)
    if research.get("status") == "COMPLETE":
        _require(bool(evidence_refs), "completed research requires evidence refs")

    thesis = record.get("thesis")
    _require(isinstance(thesis, dict), "thesis must be an object")
    _require(isinstance(thesis.get("statement"), str) and bool(thesis["statement"].strip()), "thesis statement is required")
    _require(isinstance(thesis.get("human_owner"), str) and bool(thesis["human_owner"].strip()), "human thesis owner is required")
    _require(thesis.get("decision") in schema["human_decisions"], "invalid thesis decision")

    draft = record.get("draft")
    _require(isinstance(draft, dict), "draft must be an object")
    _require(isinstance(draft.get("content_ref"), str) and bool(draft["content_ref"].strip()), "draft content ref is required")
    derived_refs = _require_string_list(draft.get("derived_from_evidence_refs"), "draft.derived_from_evidence_refs")
    _require(set(derived_refs).issubset(set(evidence_refs)), "draft references unknown research evidence")

    adaptation = record.get("channel_adaptation")
    _require(isinstance(adaptation, dict), "channel_adaptation must be an object")
    _require(adaptation.get("channel") == record.get("channel"), "channel adaptation mismatch")
    _require(isinstance(adaptation.get("adaptation_ref"), str) and bool(adaptation["adaptation_ref"].strip()), "channel adaptation ref is required")

    gates = record.get("quality_gates")
    _require(isinstance(gates, dict), "quality_gates must be an object")
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

    performance = record.get("performance")
    learning = record.get("learning")
    learning_ready = record.get("stage") == "LEARNING"
    if record.get("stage") in {"PERFORMANCE", "LEARNING"}:
        _require(isinstance(performance, dict), "performance must be an object")
        _require(isinstance(performance.get("observation_id"), str) and bool(performance["observation_id"].strip()), "performance stage requires observation id")
        _require(isinstance(performance.get("metrics"), dict) and bool(performance["metrics"]), "performance metrics required")
    if learning_ready:
        _require(isinstance(learning, dict), "learning must be an object")
        _require(isinstance(learning.get("learning_id"), str) and bool(learning["learning_id"].strip()), "learning stage requires learning id")
        observation_refs = _require_string_list(learning.get("based_on_observation_refs"), "learning.based_on_observation_refs")
        _require(performance.get("observation_id") in observation_refs, "learning must reference current observation")
        _require(learning.get("policy_change_applied") is False, "learning feedback cannot auto-change policy")

    return CreatorValidationResult(stage=record["stage"], publish_ready=publish_ready, learning_ready=learning_ready)
