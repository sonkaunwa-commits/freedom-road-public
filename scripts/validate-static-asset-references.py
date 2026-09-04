#!/usr/bin/env python3
"""Validate local static-asset references in public HTML before deployment."""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

SCHEMA_VERSION = "static-asset-reference/v1"
DEFAULT_POLICY = "static_asset_gate/policy.v1.json"


@dataclass(frozen=True)
class Finding:
    rule: str
    html_path: str
    line: int
    attribute: str
    reference: str
    message: str


class ReferenceParser(HTMLParser):
    def __init__(self, attributes: set[str]) -> None:
        super().__init__(convert_charrefs=True)
        self.attributes = attributes
        self.references: list[tuple[int, str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        line, _ = self.getpos()
        for name, value in attrs:
            if name.lower() in self.attributes and value is not None:
                self.references.append((line, name.lower(), value.strip()))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)


def resolve_repo_path(repo_root: Path, raw_path: str, label: str) -> Path:
    if not isinstance(raw_path, str) or not raw_path.strip():
        raise ValueError(f"{label} must be a non-empty repository-relative path")
    candidate = Path(raw_path)
    if candidate.is_absolute():
        raise ValueError(f"{label} must be repository-relative")
    root = repo_root.resolve()
    resolved = (root / candidate).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"{label} escapes repository") from exc
    return resolved


def load_policy(repo_root: Path, policy_path: str) -> dict[str, Any]:
    path = resolve_repo_path(repo_root, policy_path, "policy path")
    try:
        policy = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot load policy {policy_path}: {exc}") from exc
    if not isinstance(policy, dict) or policy.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"policy schema_version must be {SCHEMA_VERSION}")
    for key in ("site_root", "html_glob"):
        if not isinstance(policy.get(key), str) or not policy[key].strip():
            raise ValueError(f"policy.{key} must be a non-empty string")
    for key in ("reference_attributes", "asset_extensions", "ignored_schemes"):
        value = policy.get(key)
        if not isinstance(value, list) or not value or not all(isinstance(item, str) and item.strip() for item in value):
            raise ValueError(f"policy.{key} must be a non-empty string array")
    return policy


def _rel(repo_root: Path, path: Path) -> str:
    return path.resolve().relative_to(repo_root.resolve()).as_posix()


def _classify_reference(reference: str, ignored_schemes: set[str], extensions: set[str]) -> tuple[str, str | None]:
    if not reference or reference.startswith("#") or reference.startswith("//"):
        return "ignored", None
    parsed = urlsplit(reference)
    if parsed.scheme.lower() in ignored_schemes:
        return "ignored", None
    if parsed.scheme:
        return "ignored", None
    local_path = unquote(parsed.path).strip()
    if not local_path:
        return "ignored", None
    suffix = Path(local_path).suffix.lower()
    if suffix not in extensions:
        return "non_asset", local_path
    return "asset", local_path


def _resolve_local(site_root: Path, html_path: Path, local_path: str) -> Path:
    if local_path.startswith("/"):
        return (site_root / local_path.lstrip("/")).resolve()
    return (html_path.parent / local_path).resolve()


def scan_repository(repo_root: Path, policy: dict[str, Any]) -> dict[str, Any]:
    root = repo_root.resolve()
    site_root = (root / policy["site_root"]).resolve()
    try:
        site_root.relative_to(root)
    except ValueError as exc:
        raise ValueError("site_root escapes repository") from exc
    if not site_root.is_dir():
        raise ValueError(f"site_root not found: {policy['site_root']}")

    attributes = {item.lower() for item in policy["reference_attributes"]}
    extensions = {item.lower() if item.startswith(".") else f".{item.lower()}" for item in policy["asset_extensions"]}
    ignored_schemes = {item.lower().rstrip(":") for item in policy["ignored_schemes"]}
    findings: list[Finding] = []
    scanned_html = 0
    checked_assets = 0
    ignored_refs = 0
    non_asset_refs = 0

    html_files = sorted(path for path in site_root.glob(policy["html_glob"]) if path.is_file())
    for html_path in html_files:
        scanned_html += 1
        try:
            text = html_path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            findings.append(Finding("html-read-error", _rel(root, html_path), 0, "file", "", f"cannot read HTML: {exc}"))
            continue

        parser = ReferenceParser(attributes)
        try:
            parser.feed(text)
        except Exception as exc:
            findings.append(Finding("html-parse-error", _rel(root, html_path), 0, "file", "", f"cannot parse HTML: {exc}"))
            continue

        for line, attribute, reference in parser.references:
            kind, local_path = _classify_reference(reference, ignored_schemes, extensions)
            if kind == "ignored":
                ignored_refs += 1
                continue
            if kind == "non_asset":
                non_asset_refs += 1
                continue

            checked_assets += 1
            assert local_path is not None
            target = _resolve_local(site_root, html_path, local_path)
            try:
                target.relative_to(site_root)
            except ValueError:
                findings.append(Finding(
                    "path-escape",
                    _rel(root, html_path),
                    line,
                    attribute,
                    reference,
                    "local asset reference escapes public site root",
                ))
                continue

            if not target.is_file():
                findings.append(Finding(
                    "missing-local-asset",
                    _rel(root, html_path),
                    line,
                    attribute,
                    reference,
                    f"resolved asset is missing: {_rel(root, target)}",
                ))

    return {
        "schema_version": SCHEMA_VERSION,
        "pass": not findings,
        "site_root": _rel(root, site_root),
        "scanned_html": scanned_html,
        "checked_assets": checked_assets,
        "ignored_references": ignored_refs,
        "non_asset_references": non_asset_refs,
        "findings": [asdict(item) for item in findings],
    }


def format_report(report: dict[str, Any]) -> str:
    lines = [
        f"static-asset-reference {'PASS' if report['pass'] else 'FAIL'}",
        f"scanned_html={report['scanned_html']} checked_assets={report['checked_assets']} findings={len(report['findings'])}",
    ]
    for item in report["findings"]:
        lines.append(f"FAIL {item['rule']} {item['html_path']}:{item['line']} {item['attribute']}={item['reference']!r} {item['message']}")
    return "\n".join(lines)


def write_report(repo_root: Path, output_path: str, rendered_json: str) -> Path:
    output = resolve_repo_path(repo_root, output_path, "output path")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(rendered_json, encoding="utf-8")
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--policy", default=DEFAULT_POLICY)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--output")
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    try:
        policy = load_policy(repo_root, args.policy)
        report = scan_repository(repo_root, policy)
        rendered_json = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
        if args.output:
            write_report(repo_root, args.output, rendered_json)
    except (OSError, ValueError) as exc:
        print(f"static-asset-reference ERROR: {exc}", file=sys.stderr)
        return 2

    print(rendered_json if args.json else format_report(report))
    return 0 if report["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
