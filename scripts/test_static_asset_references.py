#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("validate-static-asset-references.py")
spec = importlib.util.spec_from_file_location("validate_static_asset_references", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
sys.modules[spec.name] = module
spec.loader.exec_module(module)

POLICY = {
    "schema_version": "static-asset-reference/v1",
    "site_root": "site",
    "html_glob": "**/*.html",
    "reference_attributes": ["src", "href", "poster"],
    "asset_extensions": [".js", ".css", ".webmanifest", ".png", ".svg"],
    "ignored_schemes": ["http", "https", "mailto", "tel", "data", "javascript", "blob"],
}


def write(path: Path, content: str = "") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def rules(report) -> set[str]:
    return {item["rule"] for item in report["findings"]}


def make_clean(root: Path) -> None:
    write(
        root / "site" / "index.html",
        """<!doctype html><html><head>
<link rel="stylesheet" href="assets/app.css?v=1">
<link rel="manifest" href="assets/app.webmanifest">
</head><body>
<img src="assets/logo.svg#mark">
<script src="assets/app.js?v=1"></script>
<a href="#section">anchor</a>
<a href="https://example.com/x.js">external</a>
<a href="mailto:a@example.com">mail</a>
<img src="data:image/png;base64,AAAA">
<a href="docs/">non-asset navigation</a>
</body></html>""",
    )
    write(root / "site" / "assets" / "app.css", "body{}")
    write(root / "site" / "assets" / "app.webmanifest", "{}")
    write(root / "site" / "assets" / "logo.svg", "<svg></svg>")
    write(root / "site" / "assets" / "app.js", "'use strict';")
    write(root / "site" / "docs" / "index.html", "<html><body>docs</body></html>")


def run() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        make_clean(root)

        clean = module.scan_repository(root, POLICY)
        assert clean["pass"] is True, clean
        assert clean["checked_assets"] == 4, clean

        write(root / "site" / "broken.html", '<script src="missing.js"></script>')
        missing = module.scan_repository(root, POLICY)
        assert missing["pass"] is False
        assert "missing-local-asset" in rules(missing), missing
        (root / "site" / "broken.html").unlink()

        write(root / "site" / "nested" / "escape.html", '<script src="../../outside.js"></script>')
        write(root / "outside.js", "no")
        escape = module.scan_repository(root, POLICY)
        assert "path-escape" in rules(escape), escape
        (root / "site" / "nested" / "escape.html").unlink()

        write(root / "site" / "nested" / "inside.html", '<script src="../assets/app.js?x=1#y"></script>')
        inside = module.scan_repository(root, POLICY)
        assert inside["pass"] is True, inside
        (root / "site" / "nested" / "inside.html").unlink()

        write(root / "site" / "ignored.html", '<script src="https://cdn.example.com/missing.js"></script><a href="#x">x</a><img src="data:image/png;base64,AAAA">')
        ignored = module.scan_repository(root, POLICY)
        assert ignored["pass"] is True, ignored

    print("static-asset-reference self-test PASS: clean assets and explicit external/data/hash refs pass; missing asset and site-root escape fail closed")


if __name__ == "__main__":
    run()
