# Platform Baseline Drift Detector v1

Purpose: prevent accepted Platform P2 component artifacts from changing silently after `platform_baseline/baseline.v1.json` is frozen.

The detector treats the baseline's `components[*].artifacts` list as the protected artifact set and the baseline `source_sha` as the accepted comparison point. It compares that source revision with the target ref and fails closed when a protected artifact path changed.

This is intentionally narrower than the platform conformance gate:

- Conformance checks whether the current repository satisfies safety/quality invariants.
- Baseline drift checks whether an accepted component artifact changed at all since the accepted baseline revision.

A clean drift check does not grant production, provider, publishing, paid-resource, private-data or trading authority. A detected change is not automatically rejected forever; it means the baseline must be explicitly reviewed and rebaselined through a separate accepted change rather than being silently rewritten by this detector.

The CI workflow uses full Git history (`fetch-depth: 0`) because the accepted source commit must be available for deterministic comparison.
