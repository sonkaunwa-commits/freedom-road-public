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
    "scan_roots": ["site"],
    "text_extensions": [".html", ".json", ".js", ".txt"],
    "forbidden_file_globs": ["**/.env", "**/*.pem"],
    "secret_patterns": [
        {"id": "github-token", "pattern": r"\bghp_[A-Za-z0-9]{30,}\b"},
        {"id": "pem-private-key", "pattern": r"-----BEGIN (?:RSA )?PRIVATE KEY-----"},
    ],
    "forbidden_json_keys": ["account_number", "private_cost_basis", "access_token"],
    "required_json_files": [
        {"path": "site/publication.json", "required_keys": ["schema_version", "source_repository", "source_commit", "source_generated_at"]}
    ],
}


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def make_clean_repo(root: Path) -> None:
    site = root / "site"
    site.mkdir(parents=True)
    (site / "index.html").write_text("<html><body>public release</body></html>", encoding="utf-8")
    write_json(site / "market.json", {"symbol": "600006.SH", "price": 8.2, "source": "public-market"})
    write_json(site / "publication.json", {
        "schema_version": 1,
        "source_repository": "example/private-source",
        "source_commit": "0123456789abcdef",
        "source_generated_at": "2026-09-04T06:00:00+08:00",
    })
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

        loaded_policy = module.load_policy(root, "publication_boundary/policy.v1.json")
        assert loaded_policy["schema_version"] == "publication-boundary/v1"

        outside_policy = base / "outside-policy.json"
        write_json(outside_policy, POLICY)
        expect_value_error(lambda: module.load_policy(root, str(outside_policy)), "absolute external policy")
        expect_value_error(lambda: module.load_policy(root, "../outside-policy.json"), "traversal policy")

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
        assert not outside_report.exists(), "escape output must fail before write"

        exit_code = module.main([
            "--repo-root", str(root),
            "--policy", "publication_boundary/policy.v1.json",
            "--json",
            "--output", "../traversal-report.json",
        ])
        assert exit_code == 2
        assert not (base / "traversal-report.json").exists(), "traversal output must fail before write"

        (root / "site" / "token.txt").write_text("ghp_" + "A" * 36, encoding="utf-8")
        secret = module.scan_repository(root, POLICY)
        assert secret["pass"] is False
        assert_rule(secret, "secret:github-token")
        assert "A" * 20 not in json.dumps(secret), "secret value must not be copied into report"
        (root / "site" / "token.txt").unlink()

        write_json(root / "site" / "leak.json", {"portfolio": {"account_number": "123456789"}})
        json_leak = module.scan_repository(root, POLICY)
        assert_rule(json_leak, "forbidden-json-key")
        (root / "site" / "leak.json").unlink()

        (root / "site" / ".env").write_text("SAFE_PLACEHOLDER=1", encoding="utf-8")
        forbidden_file = module.scan_repository(root, POLICY)
        assert_rule(forbidden_file, "forbidden-file")
        (root / "site" / ".env").unlink()

        write_json(root / "site" / "publication.json", {"schema_version": 1})
        provenance = module.scan_repository(root, POLICY)
        assert_rule(provenance, "required-json-key-missing")

    print("publication-boundary self-test PASS: publication scan and repository path confinement fail closed")


if __name__ == "__main__":
    run()
