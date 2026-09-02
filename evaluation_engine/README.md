# Benchmark & Auto-Evaluation v1

This module provides deterministic comparison of an accepted baseline against a candidate capability run.

It records benchmark identity, capability/version provenance, evidence refs, quality, success rate, human correction rate, latency, monetary cost and critical failures.

Decision order is fail-closed:
1. critical failures;
2. absolute quality/success floors;
3. allowed regression limits;
4. only then cost, latency, correction-rate or quality gains.

A PROMOTE_CANDIDATE result is a recommendation that explicitly requires human approval. The evaluation layer never changes Model Router, Skill Registry or production policy automatically.

This v1 intentionally performs no live provider calls, A/B traffic splitting, external publishing or production mutation.
