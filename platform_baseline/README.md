# FREOVIA Platform P2 Baseline Snapshot v1

This directory freezes the accepted deterministic Platform Evolution P2 baseline at the full `source_sha` recorded in `baseline.v1.json`.

The snapshot exists to distinguish three things that must not be conflated:

1. a capability contract or deterministic implementation exists;
2. that capability passed repository acceptance/conformance;
3. a live provider, production integration, external action or runtime authority is activated.

This baseline proves (1) and repository-level acceptance for the listed components. It does not grant (3).

Future platform changes should be evaluated as changes from this named baseline. A later baseline may supersede this snapshot, but historical evidence should not be silently rewritten.

Validation:

```bash
python scripts/validate_platform_baseline.py
```

Drift detection:

```bash
python scripts/check_platform_baseline_drift.py --target-ref HEAD --json
```

The drift detector intentionally fails when an accepted component artifact changes. It never rewrites the baseline.

## Explicit rebaseline proposal gate

An intentional component change does not authorize an automatic rebaseline. After drift is detected, a review-only proposal can be generated with the exact target revision, affected protected artifacts, and durable drift/conformance/independent-review evidence references:

```bash
python scripts/platform_rebaseline_proposal.py \
  --target-sha <40-char-target-sha> \
  --proposed-version <major.minor.patch> \
  --drift-artifact <baseline-artifact-path> \
  --drift-ref <drift-evidence-ref> \
  --conformance-ref <conformance-evidence-ref> \
  --independent-review-ref <review-evidence-ref> \
  --request-ref <issue-or-task-ref>
```

A valid proposal is only `REVIEW_READY`. It must preserve the historical baseline, keep `auto_apply=false`, and retain all production/provider/publishing/paid/trading authority fields as false. Updating `baseline.v1.json` remains a separate explicit acceptance action after review; this gate never performs that mutation itself.

## Post-merge anchoring

The accepted `source_sha` must be reachable from the repository branch being verified. A pull-request head that will be squash-merged is not a durable baseline anchor because its commit identity is not preserved on `main`.

For a protected component change:

1. merge the accepted component change;
2. start a separate baseline-only acceptance change from the fresh merged `main`;
3. set `source_sha` to that fresh-main base commit and advance `baseline_version`;
4. run drift, baseline, conformance, and component checks on the proposal head;
5. rerun the drift check on merged `main` before closeout.

The path-scoped workflow runs for both pull requests and relevant pushes to `main`, so a pre-squash-only anchor fails after merge instead of being reported as accepted.
