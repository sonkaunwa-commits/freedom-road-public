from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASELINE = ROOT / "platform_baseline" / "baseline.v1.json"
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
AUTHORITY_FIELDS = (
    "production_activation",
    "external_publish",
    "registry_mutation",
    "provider_activation",
    "paid_resource_creation",
    "trading_execution",
)
EVIDENCE_FIELDS = (
    "drift_ref",
    "conformance_ref",
    "independent_review_ref",
)


class RebaselineProposalError(RuntimeError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RebaselineProposalError(message)


def _text(value: Any, field: str) -> str:
    _require(isinstance(value, str) and bool(value.strip()), f"{field} must be non-empty text")
    return value.strip()


def _sha(value: Any, field: str) -> str:
    normalized = _text(value, field)
    _require(SHA40.fullmatch(normalized) is not None, f"{field} must be a full lowercase Git SHA")
    return normalized


def _semver(value: Any, field: str) -> tuple[str, tuple[int, int, int]]:
    normalized = _text(value, field)
    match = SEMVER.fullmatch(normalized)
    _require(match is not None, f"{field} must be semantic version MAJOR.MINOR.PATCH")
    return normalized, tuple(int(part) for part in match.groups())


def load_baseline(path: Path = DEFAULT_BASELINE) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RebaselineProposalError(f"unable to load baseline: {path}") from exc
    _require(isinstance(data, dict), "baseline root must be an object")
    return data


def component_artifact_index(baseline: dict[str, Any]) -> dict[str, str]:
    _sha(baseline.get("source_sha"), "baseline.source_sha")
    _text(baseline.get("baseline_id"), "baseline.baseline_id")
    _semver(baseline.get("baseline_version"), "baseline.baseline_version")
    components = baseline.get("components")
    _require(isinstance(components, list) and bool(components), "baseline.components must be a non-empty list")

    index: dict[str, str] = {}
    component_ids: set[str] = set()
    for component in components:
        _require(isinstance(component, dict), "baseline component entries must be objects")
        component_id = _text(component.get("id"), "baseline.component.id")
        _require(component_id not in component_ids, f"duplicate baseline component: {component_id}")
        component_ids.add(component_id)
        artifacts = component.get("artifacts")
        _require(isinstance(artifacts, list) and bool(artifacts), f"{component_id}.artifacts must be non-empty")
        for artifact in artifacts:
            path = _text(artifact, f"{component_id}.artifact")
            _require(not path.startswith("/"), "baseline artifact paths must be repository-relative")
            _require(".." not in Path(path).parts, "baseline artifact paths may not traverse parents")
            _require(path not in index, f"baseline artifact mapped more than once: {path}")
            index[path] = component_id
    return index


def _normalized_drifted_artifacts(
    baseline: dict[str, Any], drifted_artifacts: Iterable[str]
) -> tuple[tuple[str, ...], dict[str, list[str]]]:
    index = component_artifact_index(baseline)
    normalized: list[str] = []
    for artifact in drifted_artifacts:
        path = _text(artifact, "drifted_artifact")
        _require(path in index, f"drifted artifact is not part of the accepted baseline: {path}")
        normalized.append(path)

    _require(bool(normalized), "rebaseline proposal requires at least one protected artifact drift")
    _require(len(normalized) == len(set(normalized)), "drifted artifacts must be unique")

    by_component: dict[str, list[str]] = {}
    for path in sorted(normalized):
        by_component.setdefault(index[path], []).append(path)
    return tuple(sorted(normalized)), by_component


def _validated_evidence(evidence: dict[str, Any]) -> dict[str, str]:
    _require(isinstance(evidence, dict), "evidence must be an object")
    return {field: _text(evidence.get(field), f"evidence.{field}") for field in EVIDENCE_FIELDS}


def build_proposal(
    baseline: dict[str, Any],
    *,
    target_sha: str,
    proposed_version: str,
    drifted_artifacts: Iterable[str],
    evidence: dict[str, Any],
    request_ref: str,
) -> dict[str, Any]:
    source_sha = _sha(baseline.get("source_sha"), "baseline.source_sha")
    target = _sha(target_sha, "target_sha")
    _require(target != source_sha, "target_sha must differ from the accepted baseline source_sha")

    version, version_tuple = _semver(proposed_version, "proposed_version")
    current_version, current_version_tuple = _semver(
        baseline.get("baseline_version"), "baseline.baseline_version"
    )
    _require(
        version_tuple > current_version_tuple,
        "proposed_version must strictly advance the accepted baseline_version",
    )

    drifted, by_component = _normalized_drifted_artifacts(baseline, drifted_artifacts)
    validated_evidence = _validated_evidence(evidence)
    request = _text(request_ref, "request_ref")

    proposal = {
        "schema_version": "1.0",
        "proposal_type": "PLATFORM_BASELINE_REBASELINE_PROPOSAL",
        "status": "REVIEW_READY",
        "current_baseline": {
            "baseline_id": _text(baseline.get("baseline_id"), "baseline.baseline_id"),
            "baseline_version": current_version,
            "source_sha": source_sha,
        },
        "proposed_baseline_version": version,
        "target_sha": target,
        "drifted_artifacts": list(drifted),
        "affected_components": [
            {"id": component_id, "artifacts": by_component[component_id]}
            for component_id in sorted(by_component)
        ],
        "evidence": validated_evidence,
        "request_ref": request,
        "guardrails": {
            "preserve_historical_baseline": True,
            "requires_independent_acceptance": True,
            "auto_apply": False,
        },
        "authority": {field: False for field in AUTHORITY_FIELDS},
    }
    validate_proposal(proposal, baseline)
    return proposal


def validate_proposal(proposal: dict[str, Any], baseline: dict[str, Any]) -> None:
    _require(isinstance(proposal, dict), "proposal root must be an object")
    _require(proposal.get("schema_version") == "1.0", "unsupported proposal schema_version")
    _require(
        proposal.get("proposal_type") == "PLATFORM_BASELINE_REBASELINE_PROPOSAL",
        "invalid proposal_type",
    )
    _require(proposal.get("status") == "REVIEW_READY", "proposal status must be REVIEW_READY")

    current = proposal.get("current_baseline")
    _require(isinstance(current, dict), "current_baseline must be an object")
    expected_version, expected_version_tuple = _semver(
        baseline.get("baseline_version"), "baseline.baseline_version"
    )
    expected_current = {
        "baseline_id": _text(baseline.get("baseline_id"), "baseline.baseline_id"),
        "baseline_version": expected_version,
        "source_sha": _sha(baseline.get("source_sha"), "baseline.source_sha"),
    }
    _require(current == expected_current, "proposal current_baseline does not match accepted baseline")

    target = _sha(proposal.get("target_sha"), "target_sha")
    _require(target != expected_current["source_sha"], "target_sha must differ from accepted source_sha")
    proposed_version, proposed_version_tuple = _semver(
        proposal.get("proposed_baseline_version"), "proposed_baseline_version"
    )
    _require(
        proposed_version_tuple > expected_version_tuple,
        "proposed baseline version must strictly advance the accepted baseline version",
    )

    artifacts = proposal.get("drifted_artifacts")
    _require(isinstance(artifacts, list), "drifted_artifacts must be a list")
    normalized, by_component = _normalized_drifted_artifacts(baseline, artifacts)
    _require(list(normalized) == artifacts, "drifted_artifacts must be sorted deterministically")

    expected_components = [
        {"id": component_id, "artifacts": by_component[component_id]}
        for component_id in sorted(by_component)
    ]
    _require(
        proposal.get("affected_components") == expected_components,
        "affected_components must exactly map the declared baseline drift",
    )
    _validated_evidence(proposal.get("evidence"))
    _text(proposal.get("request_ref"), "request_ref")

    guardrails = proposal.get("guardrails")
    _require(isinstance(guardrails, dict), "guardrails must be an object")
    _require(guardrails.get("preserve_historical_baseline") is True, "historical baseline preservation is mandatory")
    _require(guardrails.get("requires_independent_acceptance") is True, "independent acceptance must remain required")
    _require(guardrails.get("auto_apply") is False, "auto_apply must remain false")

    authority = proposal.get("authority")
    _require(isinstance(authority, dict), "authority must be an object")
    _require(set(authority) == set(AUTHORITY_FIELDS), "authority fields must match the fail-closed contract")
    for field in AUTHORITY_FIELDS:
        _require(authority.get(field) is False, f"authority.{field} must remain false")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a review-only Platform P2 rebaseline proposal")
    parser.add_argument("--baseline", default=str(DEFAULT_BASELINE))
    parser.add_argument("--target-sha", required=True)
    parser.add_argument("--proposed-version", required=True)
    parser.add_argument("--drift-artifact", action="append", required=True)
    parser.add_argument("--drift-ref", required=True)
    parser.add_argument("--conformance-ref", required=True)
    parser.add_argument("--independent-review-ref", required=True)
    parser.add_argument("--request-ref", required=True)
    args = parser.parse_args()

    proposal = build_proposal(
        load_baseline(Path(args.baseline).resolve()),
        target_sha=args.target_sha,
        proposed_version=args.proposed_version,
        drifted_artifacts=args.drift_artifact,
        evidence={
            "drift_ref": args.drift_ref,
            "conformance_ref": args.conformance_ref,
            "independent_review_ref": args.independent_review_ref,
        },
        request_ref=args.request_ref,
    )
    print(json.dumps(proposal, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
