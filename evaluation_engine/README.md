# Benchmark & Auto-Evaluation v1

This module provides deterministic comparison of an accepted baseline against a candidate capability run.

It records benchmark identity, capability/version provenance, evidence refs, quality, success rate, human correction rate, latency, monetary cost and critical failures.

Decision order is fail-closed:
1. validate the evaluation schema and promotion-policy safety invariants;
2. validate required metric types/ranges and reject booleans as numeric evidence;
3. critical failures;
4. absolute quality/success floors;
5. allowed regression limits;
6. only then cost, latency, correction-rate or quality gains.

Malformed schema thresholds, malformed run metrics, fractional critical-failure counts, or drift of evidence/quality-priority/auto-apply policy rules raise `EvaluationError` instead of being coerced or compared permissively.

A PROMOTE_CANDIDATE result is a recommendation that explicitly requires human approval. The evaluation layer never changes Model Router, Skill Registry or production policy automatically.

This v1 intentionally performs no live provider calls, A/B traffic splitting, external publishing or production mutation.
