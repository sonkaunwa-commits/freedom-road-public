import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.check_platform_baseline_drift import (
    BaselineDriftError,
    assert_source_commit,
    baseline_artifact_paths,
    classify_changed_paths,
    evaluate_drift,
)


ROOT = Path(__file__).resolve().parents[1]
BASELINE = json.loads((ROOT / "platform_baseline" / "baseline.v1.json").read_text(encoding="utf-8"))


class BaselineDriftTests(unittest.TestCase):
    def test_current_baseline_artifact_set_is_unique(self):
        paths = baseline_artifact_paths(BASELINE)
        self.assertEqual(len(paths), len(set(paths)))
        self.assertGreater(len(paths), 10)

    def test_baseline_artifact_change_fails_closed(self):
        protected = baseline_artifact_paths(BASELINE)
        changed = [protected[0], "status/release.json"]
        result = evaluate_drift(BASELINE, changed_paths=changed, target_ref="HEAD")
        self.assertEqual(result["status"], "DRIFT_DETECTED")
        self.assertEqual(result["baseline_artifact_changes"], [protected[0]])
        self.assertFalse(result["auto_rebaseline"])
        self.assertFalse(result["authority_granted"])

    def test_unrelated_change_is_ignored(self):
        protected = baseline_artifact_paths(BASELINE)
        classified = classify_changed_paths(protected, ["status/release.json", "README.md"])
        self.assertEqual(classified["baseline_artifact_changes"], [])
        result = evaluate_drift(BASELINE, changed_paths=["README.md"], target_ref="HEAD")
        self.assertEqual(result["status"], "CLEAN")

    def test_invalid_source_sha_fails_closed(self):
        broken = json.loads(json.dumps(BASELINE))
        broken["source_sha"] = "not-a-sha"
        with self.assertRaises(BaselineDriftError):
            baseline_artifact_paths(broken)

    @patch("scripts.check_platform_baseline_drift.subprocess.run")
    def test_missing_source_commit_fails_closed(self, run):
        run.return_value = subprocess.CompletedProcess(["git"], 1, "", "missing")
        with self.assertRaisesRegex(BaselineDriftError, "source commit is unavailable"):
            assert_source_commit(Path(tempfile.gettempdir()), BASELINE["source_sha"], "HEAD")


if __name__ == "__main__":
    unittest.main()
