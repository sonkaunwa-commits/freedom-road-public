# Skill Health Monitor v1

This module evaluates the health of registered capabilities without polling external services or mutating the Skill Registry.

Inputs include registered and observed versions, observation provenance, evidence age, maintenance state, consecutive failures, failure rate and critical-breakage state.

Canonical recommendations:
- `HEALTHY`: no material issue detected;
- `REVIEW_REQUIRED`: version drift, stale evidence or maintenance concern requires re-evaluation;
- `DEGRADED`: repeated failures or critical breakage requires fail-closed handling;
- `DEPRECATE_CANDIDATE`: critical breakage plus unmaintained status warrants explicit deprecation review.

Health output emits machine-readable event types only. It does not send notifications, upgrade packages, change registry state or alter production routing. Any re-evaluation, deprecation or replacement remains a separate governed action.
