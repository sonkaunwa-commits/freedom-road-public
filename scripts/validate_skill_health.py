from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from skill_health.core import SkillHealthContractError, evaluate_health


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def expect_failure(record: dict, policy: dict, label: str) -> None:
    try:
        evaluate_health(record, policy)
    except SkillHealthContractError:
        return
    raise AssertionError(f"negative case did not fail: {label}")


def main() -> None:
    policy = load("skill_health/policy.v1.json")
    sample = load("skill_health/sample_record.v1.json")

    result = evaluate_health(sample, policy)
    assert result.status == "REVIEW_REQUIRED"
    assert "VERSION_DRIFT" in result.reason_codes
    assert result.registry_mutation_allowed is False

    healthy = copy.deepcopy(sample)
    healthy["observed_version"] = healthy["registered_version"]
    result = evaluate_health(healthy, policy)
    assert result.status == "HEALTHY"

    stale = copy.deepcopy(healthy)
    stale["evidence_age_days"] = 120
    result = evaluate_health(stale, policy)
    assert result.status == "REVIEW_REQUIRED"
    assert "STALE_EVIDENCE" in result.reason_codes

    degraded = copy.deepcopy(healthy)
    degraded["consecutive_failures"] = 3
    result = evaluate_health(degraded, policy)
    assert result.status == "DEGRADED"

    deprecate = copy.deepcopy(healthy)
    deprecate["maintenance_state"] = "UNMAINTAINED"
    deprecate["critical_breakage"] = True
    result = evaluate_health(deprecate, policy)
    assert result.status == "DEPRECATE_CANDIDATE"
    assert "SKILL_DEPRECATION_REVIEW" in result.event_types

    broken = copy.deepcopy(sample)
    broken["auto_registry_mutation"] = True
    expect_failure(broken, policy, "automatic registry mutation")

    broken = copy.deepcopy(sample)
    broken["provenance_ref"] = ""
    expect_failure(broken, policy, "missing provenance")

    unsafe_policy = copy.deepcopy(policy)
    unsafe_policy["recommendation_only"] = False
    expect_failure(sample, unsafe_policy, "recommendation-only policy drift")

    unsafe_policy = copy.deepcopy(policy)
    unsafe_policy["external_notification_enabled"] = True
    expect_failure(sample, unsafe_policy, "external notification policy drift")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy.pop("max_evidence_age_days")
    expect_failure(sample, malformed_policy, "missing evidence-age threshold")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["consecutive_failure_threshold"] = True
    expect_failure(sample, malformed_policy, "boolean failure threshold")

    malformed_policy = copy.deepcopy(policy)
    malformed_policy["failure_rate_threshold"] = "0.5"
    expect_failure(sample, malformed_policy, "string failure-rate threshold")

    for field in ("evidence_age_days", "consecutive_failures", "failure_rate"):
        broken = copy.deepcopy(sample)
        broken[field] = True
        expect_failure(broken, policy, f"boolean numeric evidence: {field}")

    print("skill-health-v1: PASS")


if __name__ == "__main__":
    main()
