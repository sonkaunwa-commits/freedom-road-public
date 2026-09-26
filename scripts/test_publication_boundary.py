#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("validate_publication_boundary.py")
spec = importlib.util.spec_from_file_location("validate_publication_boundary", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)

POLICY = {
    "schema_version": "publication-boundary/v1",
    "allowed_root_entries": [".github", "README.md", "publication_boundary", "reports", "scripts"],
    "scan_roots": [".github", "publication_boundary", "scripts"],
    "text_extensions": [".json", ".py", ".txt", ".md", ".yml", ".yaml"],
    "forbidden_file_globs": ["**/.env", "**/*.pem"],
    "secret_patterns": [
        {"id": "github-token", "pattern": r"\bghp_[A-Za-z0-9]{30,}\b"},
        {"id": "pem-private-key", "pattern": r"-----BEGIN (?:RSA )?PRIVATE KEY-----"},
    ],
    "forbidden_json_keys": ["account_number", "private_cost_basis", "access_token"],
    "required_json_files": [],
}


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def make_clean_repo(root: Path) -> None:
    (root / ".github" / "workflows").mkdir(parents=True)
    (root / ".github" / "workflows" / "publication-boundary.yml").write_text("name: publication-boundary\n", encoding="utf-8")
    (root / "README.md").write_text("minimal public shell\n", encoding="utf-8")
    (root / "scripts").mkdir()
    (root / "scripts" / "placeholder.py").write_text("print('ok')\n", encoding="utf-8")
    write_json(root / "publication_boundary" / "policy.v1.json", POLICY)


def assert_rule(report, rule: str) -> None:
    assert any(item["rule"] == rule for item in report["findings"]), report


def expect_value_error(fn, label: str) -> None:
    try:
        fn()
    except ValueError:
        return
    raise AssertionError(f"expected ValueError: {label}")


def run() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        root = base / "repo"
        root.mkdir()
        make_clean_repo(root)

        clean = module.scan_repository(root, POLICY)
        assert clean["pass"] is True, clean

        loaded = module.load_policy(root, "publication_boundary/policy.v1.json")
        assert loaded["allowed_root_entries"] == POLICY["allowed_root_entries"]

        bad_policy = dict(POLICY)
        bad_policy["allowed_root_entries"] = ["README.md", "README.md"]
        write_json(root / "publication_boundary" / "bad-policy.json", bad_policy)
        expect_value_error(lambda: module.load_policy(root, "publication_boundary/bad-policy.json"), "duplicate root allowlist")
        (root / "publication_boundary" / "bad-policy.json").unlink()

        outside_policy = base / "outside-policy.json"
        write_json(outside_policy, POLICY)
        expect_value_error(lambda: module.load_policy(root, str(outside_policy)), "absolute external policy")
        expect_value_error(lambda: module.load_policy(root, "../outside-policy.json"), "traversal policy")

        (root / "site").mkdir()
        (root / "site" / "index.html").write_text("legacy page", encoding="utf-8")
        legacy_site = module.scan_repository(root, POLICY)
        assert legacy_site["pass"] is False
        assert_rule(legacy_site, "unexpected-root-entry")
        for child in (root / "site").iterdir():
            child.unlink()
        (root / "site").rmdir()

        (root / "ROADMAP.md").write_text("internal roadmap", encoding="utf-8")
        roadmap = module.scan_repository(root, POLICY)
        assert roadmap["pass"] is False
        assert_rule(roadmap, "unexpected-root-entry")
        (root / "ROADMAP.md").unlink()

        (root / ".git").mkdir()
        git_metadata = module.scan_repository(root, POLICY)
        assert git_metadata["pass"] is True, git_metadata
        (root / ".git").rmdir()

        (root / "scripts" / "token.txt").write_text("ghp_" + "A" * 36, encoding="utf-8")
        secret = module.scan_repository(root, POLICY)
        assert secret["pass"] is False
        assert_rule(secret, "secret:github-token")
        assert "A" * 20 not in json.dumps(secret), "secret value must not be copied into report"
        (root / "scripts" / "token.txt").unlink()

        write_json(root / "publication_boundary" / "leak.json", {"portfolio": {"account_number": "123456789"}})
        json_leak = module.scan_repository(root, POLICY)
        assert_rule(json_leak, "forbidden-json-key")
        (root / "publication_boundary" / "leak.json").unlink()

        (root / "scripts" / ".env").write_text("SAFE_PLACEHOLDER=1", encoding="utf-8")
        forbidden_file = module.scan_repository(root, POLICY)
        assert_rule(forbidden_file, "forbidden-file")
        (root / "scripts" / ".env").unlink()

        report_path = root / "reports" / "publication.json"
        exit_code = module.main([
            "--repo-root", str(root),
            "--policy", "publication_boundary/policy.v1.json",
            "--json",
            "--output", "reports/publication.json",
        ])
        assert exit_code == 0
        assert report_path.is_file()

        outside_report = base / "outside-report.json"
        exit_code = module.main([
            "--repo-root", str(root),
            "--policy", "publication_boundary/policy.v1.json",
            "--json",
            "--output", str(outside_report),
        ])
        assert exit_code == 2
        assert not outside_report.exists()

        exit_code = module.main([
            "--repo-root", str(root),
            "--policy", "publication_boundary/policy.v1.json",
            "--json",
            "--output", "../traversal-report.json",
        ])
        assert exit_code == 2
        assert not (base / "traversal-report.json").exists()

    print("publication-boundary self-test PASS: minimal public shell is allowlisted and legacy public surfaces fail closed")


if __name__ == "__main__":
    run()
