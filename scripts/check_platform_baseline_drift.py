from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASELINE = ROOT / "platform_baseline" / "baseline.v1.json"
SHA40 = re.compile(r"^[0-9a-f]{40}$")


class BaselineDriftError(RuntimeError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise BaselineDriftError(message)


def load_baseline(path: Path = DEFAULT_BASELINE) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise BaselineDriftError(f"unable to load baseline: {path}") from exc
    _require(isinstance(data, dict), "baseline root must be an object")
    return data


def baseline_artifact_paths(data: dict[str, Any]) -> tuple[str, ...]:
    source_sha = data.get("source_sha")
    _require(isinstance(source_sha, str) and SHA40.fullmatch(source_sha) is not None,
             "baseline source_sha must be a full lowercase Git SHA")
    components = data.get("components")
    _require(isinstance(components, list) and components, "baseline components must be a non-empty list")

    paths: list[str] = []
    for component in components:
        _require(isinstance(component, dict), "baseline component entries must be objects")
        artifacts = component.get("artifacts")
        _require(isinstance(artifacts, list) and artifacts, "baseline component artifacts must be non-empty")
        for artifact in artifacts:
            _require(isinstance(artifact, str) and bool(artifact.strip()), "baseline artifact path must be text")
            normalized = artifact.strip()
            _require(not normalized.startswith("/"), "baseline artifact path must be repository-relative")
            _require(".." not in Path(normalized).parts, "baseline artifact path may not traverse parents")
            paths.append(normalized)

    _require(len(paths) == len(set(paths)), "baseline artifact paths must be unique")
    return tuple(sorted(paths))


def classify_changed_paths(
    baseline_paths: Iterable[str], changed_paths: Iterable[str]
) -> dict[str, list[str]]:
    protected = set(baseline_paths)
    changed = sorted({path.strip() for path in changed_paths if isinstance(path, str) and path.strip()})
    drifted = [path for path in changed if path in protected]
    ignored = [path for path in changed if path not in protected]
    return {"baseline_artifact_changes": drifted, "ignored_changes": ignored}


def _run_git(repo_root: Path, args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            ["git", *args],
            cwd=repo_root,
            text=True,
            capture_output=True,
            check=check,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise BaselineDriftError(f"git command failed: {' '.join(args)}") from exc


def assert_source_commit(repo_root: Path, source_sha: str, target_ref: str) -> None:
    _require(SHA40.fullmatch(source_sha) is not None, "baseline source_sha must be a full lowercase Git SHA")
    source = _run_git(repo_root, ["cat-file", "-e", f"{source_sha}^{{commit}}"], check=False)
    _require(source.returncode == 0, f"baseline source commit is unavailable: {source_sha}")
    target = _run_git(repo_root, ["rev-parse", "--verify", f"{target_ref}^{{commit}}"], check=False)
    _require(target.returncode == 0, f"target ref is unavailable: {target_ref}")
    ancestry = _run_git(repo_root, ["merge-base", "--is-ancestor", source_sha, target_ref], check=False)
    _require(ancestry.returncode == 0, "baseline source commit is not an ancestor of target ref")


def git_changed_paths(repo_root: Path, source_sha: str, target_ref: str) -> list[str]:
    result = _run_git(repo_root, ["diff", "--name-only", f"{source_sha}..{target_ref}", "--"])
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def evaluate_drift(
    data: dict[str, Any],
    *,
    changed_paths: Iterable[str],
    target_ref: str,
) -> dict[str, Any]:
    protected = baseline_artifact_paths(data)
    classified = classify_changed_paths(protected, changed_paths)
    drifted = classified["baseline_artifact_changes"]
    return {
        "schema_version": "1.0",
        "check": "PLATFORM_BASELINE_DRIFT",
        "baseline_id": data.get("baseline_id"),
        "baseline_version": data.get("baseline_version"),
        "source_sha": data.get("source_sha"),
        "target_ref": target_ref,
        "protected_artifact_count": len(protected),
        "status": "DRIFT_DETECTED" if drifted else "CLEAN",
        **classified,
        "auto_rebaseline": False,
        "authority_granted": False,
    }


def run(repo_root: Path, baseline_path: Path, target_ref: str) -> dict[str, Any]:
    data = load_baseline(baseline_path)
    source_sha = data.get("source_sha")
    _require(isinstance(source_sha, str), "baseline source_sha is missing")
    baseline_artifact_paths(data)
    assert_source_commit(repo_root, source_sha, target_ref)
    changed = git_changed_paths(repo_root, source_sha, target_ref)
    return evaluate_drift(data, changed_paths=changed, target_ref=target_ref)


def main() -> None:
    parser = argparse.ArgumentParser(description="Fail closed on silent Platform P2 baseline artifact drift")
    parser.add_argument("--repo-root", default=str(ROOT))
    parser.add_argument("--baseline", default=str(DEFAULT_BASELINE))
    parser.add_argument("--target-ref", default="HEAD")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.repo_root).resolve(), Path(args.baseline).resolve(), args.target_ref)
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(f"platform-baseline-drift: {result['status']}")
        if result["baseline_artifact_changes"]:
            for path in result["baseline_artifact_changes"]:
                print(f"DRIFT {path}")

    if result["status"] != "CLEAN":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
