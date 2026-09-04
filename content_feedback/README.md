# Content Performance Feedback v1

This module closes the Creator Engine feedback loop without turning observations into automatic policy.

Pipeline: PUBLISHED CONTENT → CHANNEL OBSERVATION → METRIC NORMALIZATION → SAME-CHANNEL BASELINE → SAMPLE GATE → DELTA/REGRESSION CHECK → HYPOTHESIS → RECOMMENDATION → HUMAN REVIEW.

Key invariants:
- every metric keeps its numerator/denominator and provenance reference;
- baselines must be comparable and from the same channel/metric contract;
- insufficient samples cannot produce strong KEEP or STOP recommendations;
- correlation/relative performance is recorded as an observation, not causal proof;
- a single post cannot rewrite topic, style, channel or publishing policy;
- STOP_EXPERIMENT is recommendation-only and requires review;
- no output may mutate Creator Engine policy automatically.

The evaluator validates these policy authority boundaries before evaluating feedback evidence. Required thresholds must be present with strict non-boolean numeric types; positive metric names must be explicit and unique; same-channel baseline, metric provenance, denominator preservation, anti-causality, review and no-policy-mutation rules must retain their safe values. Missing, malformed or authority-drifted policy fails closed with `FeedbackContractError` instead of falling back to defaults or coercing values.

Evidence validation also rejects Python booleans as sample counts or metric numerators/denominators, preventing malformed machine-readable observations from being treated as numeric evidence.

This v1 performs no analytics API calls, network polling, external publishing or production mutation.
