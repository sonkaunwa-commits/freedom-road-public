# Creator Engine Pilot v1

This module defines the minimum deterministic content-production contract for FREOVIA P2.

Pipeline: TOPIC → RESEARCH → THESIS → DRAFT → STYLE_CHECK → VISUAL → PUBLISH_READY → PUBLISHED → PERFORMANCE → LEARNING.

Key invariants:
- the schema contract is validated before record evaluation; malformed enums, required gates or policy values fail closed;
- research evidence precedes publish readiness and provenance/reference collections must be explicit unique string lists;
- thesis ownership and final approval remain human decisions;
- channel adaptation and evidence provenance are retained;
- all required publish gates must pass;
- performance feedback may create a learning hypothesis but may not silently change policy;
- this pilot grants no external publishing authority.

Malformed record containers or reference collections raise `CreatorEngineError` instead of relying on truthiness or leaking raw `TypeError`/`KeyError` failures.

The module intentionally has no network, model, credential, platform API or paid-service dependency. External publishing remains a separately authorized future integration.
