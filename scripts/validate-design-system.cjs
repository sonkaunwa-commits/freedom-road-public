#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tokensPath = path.join(root, 'design', 'tokens.v1.json');
const designDocPath = path.join(root, 'DESIGN.md');

function fail(message) {
  console.error(`DESIGN_SYSTEM_INVALID: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

assert(fs.existsSync(tokensPath), 'design/tokens.v1.json is missing');
assert(fs.existsSync(designDocPath), 'DESIGN.md is missing');

let tokens;
try {
  tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
} catch (error) {
  fail(`tokens JSON cannot be parsed: ${error.message}`);
}

const designDoc = fs.readFileSync(designDocPath, 'utf8');
const requiredStates = [
  'FRESH',
  'DELAYED',
  'STALE',
  'DEGRADED',
  'UNAVAILABLE',
  'PROVISIONAL',
  'OFFICIAL'
];

assert(tokens.schema_version === '1.0', 'schema_version must be 1.0');
assert(tokens.token_set === 'freovia-design-v1', 'token_set must be freovia-design-v1');
assert(/^1\./.test(tokens.version || ''), 'version must remain within v1 for this contract');

assert(tokens.typography && typeof tokens.typography === 'object', 'typography block is required');
assert(tokens.typography.body_px >= 16, 'body text must be at least 16px');
assert(tokens.typography.metadata_px >= 13, 'metadata text must be at least 13px');
assert(tokens.typography.body_line_height >= 1.4, 'body line height is too dense');

assert(Array.isArray(tokens.spacing_px), 'spacing_px must be an array');
assert(tokens.spacing_px.join(',') === '4,8,12,16,24,32,48', 'spacing scale drifted');

assert(tokens.radius_px && tokens.radius_px.sm === 6, 'radius sm drifted');
assert(tokens.radius_px && tokens.radius_px.md === 10, 'radius md drifted');
assert(tokens.radius_px && tokens.radius_px.lg === 16, 'radius lg drifted');
assert(tokens.tap_target_min_px >= 44, 'tap target minimum must be at least 44px');

assert(tokens.semantic_states && typeof tokens.semantic_states === 'object', 'semantic_states block is required');
for (const state of requiredStates) {
  const entry = tokens.semantic_states[state];
  assert(entry, `semantic state ${state} is missing`);
  assert(entry.requires_text_label === true, `${state} must require a text label`);
  assert(designDoc.includes(`\`${state}\``), `DESIGN.md must document ${state}`);
}

const financial = tokens.financial_display || {};
for (const key of [
  'missing_value_must_not_render_as_zero',
  'gain_loss_requires_sign_and_unit',
  'delayed_quote_requires_disclosure',
  'portfolio_total_requires_valuation_timestamp',
  'fallback_quality_change_requires_visible_state'
]) {
  assert(financial[key] === true, `financial rule ${key} must remain enabled`);
}

const accessibility = tokens.accessibility || {};
assert(accessibility.target === 'WCAG-AA', 'accessibility target must be WCAG-AA');
assert(accessibility.meaning_must_not_depend_on_color === true, 'color-independent meaning is mandatory');
assert(accessibility.visible_keyboard_focus === true, 'visible keyboard focus is mandatory');

for (const heading of [
  '# FREOVIA Design System v1',
  '## 4. Semantic data states',
  '## 9. Release quality gate',
  '## 10. Extension policy'
]) {
  assert(designDoc.includes(heading), `DESIGN.md is missing required section: ${heading}`);
}

console.log('DESIGN_SYSTEM_VALID: v1 baseline and semantic financial states are consistent');
