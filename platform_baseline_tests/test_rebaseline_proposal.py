import copy
import hashlib
import json
import unittest
from pathlib import Path

from scripts.platform_rebaseline_proposal import (
    AUTHORITY_FIELDS,
    RebaselineProposalError,
    build_proposal,
    component_artifact_index,
    validate_proposal,
)


ROOT = Path(__file__).resolve().parents[1]
BASELINE_PATH = ROOT / "platform_baseline" / "baseline.v1.json"


def fixture_baseline():
    return {
        "baseline_id": "FREOVIA-PLATFORM-P2-TEST",
        "baseline_version": "1.0.0",
        "source_sha": "0" * 40,
        "components": [
            {"id": "alpha", "artifacts": ["alpha/core.py", "alpha/schema.json"]},
            {"id": "beta", "artifacts": ["beta/core.py"]},
        ],
    }


def evidence():
    return {
        "drift_ref": "drift-check#123",
        "conformance_ref": "conformance#456",
        "independent_review_ref": "review#789",
    }


class RebaselineProposalTests(unittest.TestCase):
    def test_valid_drift_produces_review_ready(self):
        baseline = fixture_baseline()
        proposal = build_proposal(
            baseline,
            target_sha="1" * 40,
            proposed_version="1.0.1",
            drifted_artifacts=["beta/core.py", "alpha/core.py"],
            evidence=evidence(),
            request_ref="issue#48",
        )
        self.assertEqual(proposal["status"], "REVIEW_READY")
        self.assertEqual(proposal["drifted_artifacts"], ["alpha/core.py", "beta/core.py"])
        self.assertEqual(
            proposal["affected_components"],
            [
                {"id": "alpha", "artifacts": ["alpha/core.py"]},
                {"id": "beta", "artifacts": ["beta/core.py"]},
            ],
        )
        self.assertFalse(proposal["guardrails"]["auto_apply"])
        self.assertTrue(all(proposal["authority"][field] is False for field in AUTHORITY_FIELDS))

    def test_no_protected_drift_is_rejected(self):
        with self.assertRaisesRegex(RebaselineProposalError, "at least one protected artifact drift"):
            build_proposal(
                fixture_baseline(),
                target_sha="1" * 40,
                proposed_version="1.0.1",
                drifted_artifacts=[],
                evidence=evidence(),
                request_ref="issue#48",
            )

    def test_unknown_drift_artifact_fails_closed(self):
        with self.assertRaisesRegex(RebaselineProposalError, "not part of the accepted baseline"):
            build_proposal(
                fixture_baseline(),
                target_sha="1" * 40,
                proposed_version="1.0.1",
                drifted_artifacts=["unknown/core.py"],
                evidence=evidence(),
                request_ref="issue#48",
            )

    def test_malformed_or_noop_target_sha_fails_closed(self):
        baseline = fixture_baseline()
        for target in ("not-a-sha", baseline["source_sha"]):
            with self.subTest(target=target):
                with self.assertRaises(RebaselineProposalError):
                    build_proposal(
                        baseline,
                        target_sha=target,
                        proposed_version="1.0.1",
                        drifted_artifacts=["alpha/core.py"],
                        evidence=evidence(),
                        request_ref="issue#48",
                    )

    def test_missing_evidence_fails_closed(self):
        for field in ("drift_ref", "conformance_ref", "independent_review_ref"):
            broken = evidence()
            broken[field] = ""
            with self.subTest(field=field):
                with self.assertRaisesRegex(RebaselineProposalError, f"evidence.{field}"):
                    build_proposal(
                        fixture_baseline(),
                        target_sha="1" * 40,
                        proposed_version="1.0.1",
                        drifted_artifacts=["alpha/core.py"],
                        evidence=broken,
                        request_ref="issue#48",
                    )

    def test_auto_apply_or_authority_expansion_fails_closed(self):
        baseline = fixture_baseline()
        proposal = build_proposal(
            baseline,
            target_sha="1" * 40,
            proposed_version="1.0.1",
            drifted_artifacts=["alpha/core.py"],
            evidence=evidence(),
            request_ref="issue#48",
        )
        auto_apply = copy.deepcopy(proposal)
        auto_apply["guardrails"]["auto_apply"] = True
        with self.assertRaisesRegex(RebaselineProposalError, "auto_apply"):
            validate_proposal(auto_apply, baseline)

        for field in AUTHORITY_FIELDS:
            expanded = copy.deepcopy(proposal)
            expanded["authority"][field] = True
            with self.subTest(field=field):
                with self.assertRaisesRegex(RebaselineProposalError, f"authority.{field}"):
                    validate_proposal(expanded, baseline)

    def test_component_mapping_rejects_duplicate_artifact_ownership(self):
        baseline = fixture_baseline()
        baseline["components"][1]["artifacts"].append("alpha/core.py")
        with self.assertRaisesRegex(RebaselineProposalError, "mapped more than once"):
            component_artifact_index(baseline)

    def test_real_baseline_is_never_rewritten(self):
        before = hashlib.sha256(BASELINE_PATH.read_bytes()).hexdigest()
        baseline = json.loads(BASELINE_PATH.read_text(encoding="utf-8"))
        first_artifact = next(iter(component_artifact_index(baseline)))
        proposal = build_proposal(
            baseline,
            target_sha="1" * 40 if baseline["source_sha"] != "1" * 40 else "2" * 40,
            proposed_version="1.0.1" if baseline["baseline_version"] != "1.0.1" else "1.0.2",
            drifted_artifacts=[first_artifact],
            evidence=evidence(),
            request_ref="issue#48",
        )
        validate_proposal(proposal, baseline)
        after = hashlib.sha256(BASELINE_PATH.read_bytes()).hexdigest()
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
