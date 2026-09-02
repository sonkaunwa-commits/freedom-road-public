# FREOVIA Research Orchestrator v1

This package defines the minimum traceable research contract used by FREOVIA before any model- or search-provider integration.

## Pipeline

`REQUEST -> SOURCES -> EVIDENCE -> CONTRADICTIONS -> FINDINGS -> CONFIDENCE -> ARCHIVE`

The v1 invariant is simple: a final finding is not valid unless its supporting evidence can be traced back to declared sources.

## Evidence classes

- `FACT`: directly supported by a cited source.
- `INFERENCE`: derived from one or more evidence items and must list those inputs.
- `OPINION`: interpretation or recommendation; never presented as a source fact.

## Source state

Every source records acquisition time, publication/observation time when known, quality tier and freshness state. `STALE` and `UNKNOWN` sources remain usable for background context but cannot silently satisfy a current-fact requirement.

## Contradictions

Conflicting evidence is first-class data. A contradiction may be `OPEN`, `RESOLVED` or `ACCEPTED_UNCERTAINTY`. It must not disappear simply because one side is inconvenient.

## Scope boundary

This package does not fetch the web, call an LLM, access private data or publish investment conclusions. It supplies the deterministic contract those later adapters must satisfy.