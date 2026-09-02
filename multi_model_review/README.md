# Multi-Model Review v1

This module governs deterministic comparison between a primary run and an independent challenger run.

It preserves run identity, capability/version provenance, evidence references, quality/latency/cost context, disagreement dimensions and an explicit review recommendation.

Fail-closed rules:
- primary and challenger must be independent runs;
- material disagreement must name affected dimensions;
- HIGH/CRITICAL disagreement on HIGH/CRITICAL-risk work must become `REVIEW_REQUIRED`;
- reviewer recommendations require evidence references;
- `auto_promote` must remain false.

The module does not call any model provider and does not decide production routing. Consensus or a preferred candidate is review evidence only; promotion remains governed by the Evaluation Engine and human approval gates.
