#!/usr/bin/env python3
"""Fail-closed scanner for public publication artifacts.

The scanner intentionally reports rule identifiers and locations, not matched secret
values. It is designed for pre-publication use on a checked-out repository.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

DEFAULT_POLICY = "publication_boundary/policy.v1.json"


@dataclass(frozen=True)
class Finding:
    rule: str
    path: str
    location: str
    message: str


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _resolve_repo_path(repo_root: Path, raw_path: str | Path, label: str) -> Path:
    root = repo_root.resolve()
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = root / candidate
    candidate = candidate.resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"{label} escapes repository: {raw_path}") from exc
    return candidate


def load_policy(repo_root: Path, policy_path: str) -> dict[str, Any]:
    path = _resolve_repo_path(repo_root, policy_path, "policy path")
    if not path.is_file():
        raise ValueError(f"policy file not found: {policy_path}")
    try:
        policy = _load_json(path)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot load policy {policy_path}: {exc}") from exc
    if not isinstance(policy, dict):
        raise ValueError("policy must be a JSON object")
    if policy.get("schema_version") != "publication-boundary/v1":
        raise ValueError("unsupported publication boundary policy schema")
    roots = policy.get("scan_roots")
    if not isinstance(roots, list) or not roots or not all(isinstance(item, str) and item for item in roots):
        raise ValueError("policy.scan_roots must be a non-empty string array")
    return policy


def _repo_rel(repo_root: Path, path: Path) -> str:
    return path.resolve().relative_to(repo_root.resolve()).as_posix()


def _matches_any(path: str, globs: Iterable[str]) -> str | None:
    for pattern in globs:
        if fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch("/" + path, pattern):
            return pattern
    return None


def _iter_scan_files(repo_root: Path, roots: list[str]) -> Iterable[Path]:
    for root_name in roots:
        root = _resolve_repo_path(repo_root, root_name, "scan root")
        if not root.exists():
            raise ValueError(f"scan root not found: {root_name}")
        for path in root.rglob("*"):
            if path.is_file():
                yield path


def _find_forbidden_files(repo_root: Path, files: list[Path], globs: list[str]) -> list[Finding]:
    findings: list[Finding] = []
    for path in files:
        rel = _repo_rel(repo_root, path)
        matched = _matches_any(rel, globs)
        if matched:
            findings.append(Finding("forbidden-file", rel, "file", f"matches forbidden file rule {matched}"))
    return findings


def _compile_secret_patterns(policy: dict[str, Any]) -> list[tuple[str, re.Pattern[str]]]:
    compiled: list[tuple[str, re.Pattern[str]]] = []
    for index, item in enumerate(policy.get("secret_patterns", [])):
        if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not isinstance(item.get("pattern"), str):
            raise ValueError(f"secret_patterns[{index}] must contain id and pattern strings")
        try:
            compiled.append((item["id"], re.compile(item["pattern"])))
        except re.error as exc:
            raise ValueError(f"invalid regex for {item['id']}: {exc}") from exc
    return compiled


def _scan_text_secrets(repo_root: Path, path: Path, patterns: list[tuple[str, re.Pattern[str]]]) -> list[Finding]:
    findings: list[Finding] = []
    rel = _repo_rel(repo_root, path)
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return findings
    except OSError as exc:
        return [Finding("read-error", rel, "file", f"cannot read public artifact: {exc}")]
    for rule_id, regex in patterns:
        for match in regex.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            findings.append(Finding(f"secret:{rule_id}", rel, f"line {line}", "high-confidence secret pattern detected; value redacted"))
    return findings


def _walk_json_keys(value: Any, path: str = "$") -> Iterable[tuple[str, str]]:
    if isinstance(value, dict):
        for key, child in value.items():
            key_text = str(key)
            child_path = f"{path}.{key_text}"
            yield key_text, child_path
            yield from _walk_json_keys(child, child_path)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from _walk_json_keys(child, f"{path}[{index}]")


def _scan_json_keys(repo_root: Path, path: Path, forbidden_keys: set[str]) -> list[Finding]:
    rel = _repo_rel(repo_root, path)
    try:
        payload = _load_json(path)
    except json.JSONDecodeError as exc:
        return [Finding("invalid-json", rel, f"line {exc.lineno}", "public JSON artifact is malformed")]
    except OSError as exc:
        return [Finding("read-error", rel, "file", f"cannot read public JSON artifact: {exc}")]
    findings: list[Finding] = []
    for key, json_path in _walk_json_keys(payload):
        if key.casefold() in forbidden_keys:
            findings.append(Finding("forbidden-json-key", rel, json_path, f"private/sensitive key name detected: {key}"))
    return findings


def _validate_required_json(repo_root: Path, rules: list[dict[str, Any]]) -> list[Finding]:
    findings: list[Finding] = []
    for index, rule in enumerate(rules):
        if not isinstance(rule, dict) or not isinstance(rule.get("path"), str):
            raise ValueError(f"required_json_files[{index}] must contain path")
        rel = rule["path"]
        path = _resolve_repo_path(repo_root, rel, "required JSON path")
        if not path.is_file():
            findings.append(Finding("required-json-missing", rel, "file", "required publication provenance file is missing"))
            continue
        try:
            payload = _load_json(path)
        except (OSError, json.JSONDecodeError):
            findings.append(Finding("required-json-invalid", rel, "file", "required publication provenance file is not valid JSON"))
            continue
        if not isinstance(payload, dict):
            findings.append(Finding("required-json-invalid", rel, "$", "required publication provenance file must be an object"))
            continue
        for key in rule.get("required_keys", []):
            if key not in payload or payload[key] in (None, "", []):
                findings.append(Finding("required-json-key-missing", rel, f"$.{key}", f"required provenance key is missing: {key}"))
    return findings


def scan_repository(repo_root: Path, policy: dict[str, Any]) -> dict[str, Any]:
    repo_root = repo_root.resolve()
    files = list(_iter_scan_files(repo_root, policy["scan_roots"]))
    forbidden_globs = [str(item) for item in policy.get("forbidden_file_globs", [])]
    text_extensions = {str(item).lower() for item in policy.get("text_extensions", [])}
    forbidden_json_keys = {str(item).casefold() for item in policy.get("forbidden_json_keys", [])}
    patterns = _compile_secret_patterns(policy)

    findings: list[Finding] = []
    findings.extend(_find_forbidden_files(repo_root, files, forbidden_globs))
    for path in files:
        if path.suffix.lower() not in text_extensions:
            continue
        findings.extend(_scan_text_secrets(repo_root, path, patterns))
        if path.suffix.lower() == ".json":
            findings.extend(_scan_json_keys(repo_root, path, forbidden_json_keys))
    findings.extend(_validate_required_json(repo_root, policy.get("required_json_files", [])))

    normalized = sorted(findings, key=lambda item: (item.path, item.location, item.rule))
    return {
        "schema_version": "publication-boundary-report/v1",
        "pass": len(normalized) == 0,
        "scanned_files": len(files),
        "finding_count": len(normalized),
        "findings": [asdict(item) for item in normalized],
    }


def _format_text(report: dict[str, Any]) -> str:
    status = "PASS" if report["pass"] else "FAIL"
    lines = [f"publication-boundary {status} scanned_files={report['scanned_files']} findings={report['finding_count']}"]
    for item in report["findings"]:
        lines.append(f"{item['rule']} {item['path']} {item['location']}: {item['message']}")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate public publication artifacts for private-data and secret leakage.")
    parser.add_argument("--repo-root", default=".", help="repository root; defaults to current directory")
    parser.add_argument("--policy", default=DEFAULT_POLICY, help=f"policy path relative to repo root (default: {DEFAULT_POLICY})")
    parser.add_argument("--json", action="store_true", help="emit JSON report")
    parser.add_argument("--output", help="optional repository-local path to write the report")
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    try:
        policy = load_policy(repo_root, args.policy)
        report = scan_repository(repo_root, policy)
        output = _resolve_repo_path(repo_root, args.output, "output path") if args.output else None
    except ValueError as exc:
        print(f"publication-boundary CONFIG_ERROR: {exc}", file=sys.stderr)
        return 2

    rendered = json.dumps(report, ensure_ascii=False, indent=2) if args.json else _format_text(report)
    if output is not None:
        try:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(rendered + "\n", encoding="utf-8")
        except OSError as exc:
            print(f"publication-boundary OUTPUT_ERROR: {exc}", file=sys.stderr)
            return 2
    print(rendered)
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
