# FREOVIA Design System v1

Status: ACTIVE_BASELINE  
Version: 1.0.0  
Updated: 2026-09-02

This document is the shared presentation contract for FREOVIA user-facing interfaces, reports and lightweight tools. Product-specific themes may extend it, but they must not silently override the usability, data-state or financial-disclosure rules below.

## 1. Objectives

The design system exists to make independent products feel like one system while preserving clarity under dense information. It optimizes for:

- mobile-first reading and operation;
- rapid scanning before deep reading;
- explicit data freshness and degradation state;
- consistent financial-data semantics;
- restrained visual hierarchy rather than decorative complexity;
- reusable tokens and components instead of page-local styling drift.

## 2. Design principles

### 2.1 Information before decoration

A page must make the current state, decision-relevant facts and next action easier to understand. Decorative effects must not obscure data provenance, uncertainty, timestamps or risk.

### 2.2 Mobile first

The primary reading width is a phone viewport. Dense tables must either become horizontally scrollable with preserved headers or degrade into labeled key-value rows. Critical status and action controls must not depend on hover.

### 2.3 One semantic meaning per status

Freshness, availability, severity and action state are different dimensions. A warning color must not be reused to mean success, neutral information or unavailable data.

### 2.4 Financial truth is visible

Every financial or market-data surface that can influence a decision must expose, when applicable:

- data source or provenance;
- observed/updated time;
- freshness state;
- degraded/unavailable state;
- whether a number is estimate, delayed, official close or live/provisional;
- material risk or uncertainty.

A fallback must never silently look identical to fully trusted data when its quality has changed.

### 2.5 Progressive density

The first viewport should answer what happened, why it matters and what needs attention. Supporting evidence, raw tables and audit details should remain available below or behind an explicit expansion.

## 3. Core tokens

The canonical machine-readable token set lives in `design/tokens.v1.json`. Product code should consume or map from those values rather than inventing new primitives.

### Typography

- Base family: system UI stack; no required proprietary font.
- Body size: 16px minimum for normal mobile reading.
- Compact metadata: 13px minimum.
- Line height: 1.5 for body copy, 1.25 for headings.
- Financial numerals should use tabular numerals where supported.

### Spacing

Use the shared scale: 4, 8, 12, 16, 24, 32 and 48px. Arbitrary one-off spacing should be treated as a defect unless it solves a documented component constraint.

### Radius

- small: 6px;
- medium: 10px;
- large: 16px.

### Borders and elevation

Prefer subtle borders and spacing over heavy shadows. Elevation is reserved for transient overlays, menus and dialogs, not routine cards.

## 4. Semantic data states

The following states are mandatory vocabulary for market/report surfaces:

- `FRESH`: data satisfies the declared freshness contract.
- `DELAYED`: usable but intentionally delayed.
- `STALE`: age exceeds the expected freshness window.
- `DEGRADED`: a fallback or reduced-quality path is active.
- `UNAVAILABLE`: no acceptable value is available.
- `PROVISIONAL`: value is usable but not yet final/official.
- `OFFICIAL`: value has passed the product's official/final gate.

The visible label must be understandable without relying on color alone.

## 5. Report hierarchy

A standard FREOVIA report page should use this order unless a product has a documented reason to differ:

1. title and reporting period;
2. one-screen executive summary;
3. current state / key changes;
4. judgment and confidence;
5. recommended or conditional actions;
6. evidence and detailed data;
7. source, freshness and update metadata;
8. risk, caveat or non-advice disclosure where applicable.

The page must not bury a material degradation warning below the evidence section.

## 6. Components

### Status badge

Use for compact state labels only. Badge text must remain visible and meaningful in monochrome or high-contrast rendering.

### Metric card

A metric card requires: label, value, unit where relevant, comparison context where relevant, and freshness/provenance when the metric can change materially with time.

### Decision card

A decision card separates:

- observation/fact;
- interpretation;
- action or condition;
- confidence;
- invalidation trigger.

Do not collapse fact and recommendation into a single unlabeled sentence.

### Table

Tables require visible headers and consistent units. Numeric columns align right. Long explanatory text aligns left. Missing data must use an explicit unavailable marker, not `0`.

### Alert

Alerts are reserved for information that changes user action, trust or system availability. Routine metadata should not be rendered as an alert.

## 7. Interaction and accessibility

- Tap targets should be at least 44×44 CSS px where practical.
- Keyboard focus must remain visible on web surfaces.
- Meaning cannot depend on color alone.
- Text/background contrast should target WCAG AA for normal text.
- Motion is optional and must respect reduced-motion preference.
- Destructive or irreversible actions need explicit labeling and confirmation appropriate to risk.

## 8. Financial presentation rules

- Gains and losses must include sign and unit; do not rely only on red/green.
- Percentages and currency must state their basis when ambiguous.
- Estimated values must be labeled estimate/provisional.
- Delayed quotes must disclose delay status.
- Portfolio totals must identify the valuation timestamp.
- A missing position, source failure or partial sync must not be rendered as a true zero.

## 9. Release quality gate

A user-visible release fails the design gate when any of the following is true:

- required data-state metadata is absent;
- a financial fallback is visually indistinguishable from trusted data;
- text is unreadable at a common mobile viewport;
- a table loses units or headers on mobile;
- critical meaning depends only on color;
- the implementation introduces undeclared primitive colors, spacing or radii instead of mapped tokens;
- source/update/risk metadata required by the product contract is omitted.

`node scripts/validate-design-system.cjs` validates the machine-readable baseline and guards the mandatory semantic states. Visual regression checks can be added later without changing this contract.

## 10. Extension policy

Products may add component-level or theme-level tokens under their own namespace. Extensions must:

1. inherit the base semantic states;
2. preserve accessibility and financial truth rules;
3. document why a new token cannot reuse an existing primitive;
4. avoid changing the meaning of an existing token;
5. remain removable without breaking the base system.

Changes to shared semantic states or token meaning require a version bump and review because they can change the interpretation of every FREOVIA interface.