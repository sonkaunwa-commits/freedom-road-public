#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'skill_registry', 'registry.v1.json');
const schemaPath = path.join(root, 'skill_registry', 'schema.v1.json');

function fail(message) {
  console.error(`SKILL_REGISTRY_INVALID: ${message}`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function loadJson(filePath) {
  assert(fs.existsSync(filePath), `${path.relative(root, filePath)} is missing`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${path.relative(root, filePath)} cannot be parsed: ${error.message}`);
  }
}

const registry = loadJson(registryPath);
const schema = loadJson(schemaPath);
const allowedStatuses = new Set(['WATCH', 'PILOT', 'APPROVED', 'DEPRECATED', 'REJECTED']);
const allowedPermissions = new Set([
  'NONE',
  'NETWORK_READ',
  'NETWORK_WRITE',
  'REPO_READ',
  'REPO_WRITE',
  'FILESYSTEM_READ',
  'FILESYSTEM_WRITE',
  'PRIVATE_DATA_READ',
  'PRIVATE_DATA_WRITE',
  'SECRETS_READ',
  'EXTERNAL_ACTION'
]);
const allowedRisk = new Set(['LOW', 'MEDIUM', 'HIGH']);
const allowedCost = new Set(['ZERO', 'LOW', 'VARIABLE', 'PAID']);

assert(schema.title === 'FREOVIA Skill Registry v1', 'schema title drifted');
assert(registry.schema_version === '1.0', 'schema_version must be 1.0');
assert(registry.registry_id === 'freovia-skill-registry-v1', 'registry_id drifted');
assert(Array.isArray(registry.entries), 'entries must be an array');

const ids = new Set();
for (const [index, entry] of registry.entries.entries()) {
  const prefix = `entries[${index}]`;
  assert(entry && typeof entry === 'object', `${prefix} must be an object`);
  assert(typeof entry.skill_id === 'string' && /^[a-z0-9][a-z0-9._-]+$/.test(entry.skill_id), `${prefix}.skill_id is invalid`);
  assert(!ids.has(entry.skill_id), `duplicate skill_id ${entry.skill_id}`);
  ids.add(entry.skill_id);

  for (const key of [
    'name',
    'source',
    'problem',
    'input_contract',
    'output_contract',
    'permissions',
    'overlap_with_existing',
    'maintenance',
    'risk',
    'cost',
    'status',
    'alternatives',
    'last_evaluated_at'
  ]) {
    assert(entry[key] !== undefined && entry[key] !== null, `${entry.skill_id} missing ${key}`);
  }

  assert(allowedStatuses.has(entry.status), `${entry.skill_id} has unsupported status ${entry.status}`);
  assert(Array.isArray(entry.permissions) && entry.permissions.length > 0, `${entry.skill_id} requires at least one permission declaration`);
  for (const permission of entry.permissions) {
    assert(allowedPermissions.has(permission), `${entry.skill_id} has unsupported permission ${permission}`);
  }
  assert(!(entry.permissions.includes('NONE') && entry.permissions.length > 1), `${entry.skill_id} cannot combine NONE with other permissions`);

  assert(entry.source && typeof entry.source.ref === 'string' && entry.source.ref.length > 0, `${entry.skill_id} source ref is required`);
  assert(entry.problem.length >= 10, `${entry.skill_id} problem statement is too short`);
  assert(Array.isArray(entry.overlap_with_existing), `${entry.skill_id} overlap_with_existing must be an array`);
  assert(Array.isArray(entry.alternatives), `${entry.skill_id} alternatives must be an array`);

  assert(entry.risk && allowedRisk.has(entry.risk.security), `${entry.skill_id} security risk is invalid`);
  assert(entry.risk && allowedRisk.has(entry.risk.privacy), `${entry.skill_id} privacy risk is invalid`);
  assert(entry.cost && allowedCost.has(entry.cost.class), `${entry.skill_id} cost class is invalid`);

  const metrics = entry.metrics || {};
  if (metrics.success_rate !== undefined && metrics.success_rate !== null) {
    assert(typeof metrics.success_rate === 'number' && metrics.success_rate >= 0 && metrics.success_rate <= 1, `${entry.skill_id} success_rate must be 0..1`);
  }
  if (metrics.p95_latency_ms !== undefined && metrics.p95_latency_ms !== null) {
    assert(typeof metrics.p95_latency_ms === 'number' && metrics.p95_latency_ms >= 0, `${entry.skill_id} p95_latency_ms must be non-negative`);
  }
  if (metrics.evaluated_runs !== undefined) {
    assert(Number.isInteger(metrics.evaluated_runs) && metrics.evaluated_runs >= 0, `${entry.skill_id} evaluated_runs must be a non-negative integer`);
  }

  if (entry.status === 'APPROVED') {
    assert(Array.isArray(entry.approval_evidence) && entry.approval_evidence.length > 0, `${entry.skill_id} cannot be APPROVED without approval_evidence`);
    assert(!entry.permissions.includes('SECRETS_READ') || entry.risk.security === 'HIGH', `${entry.skill_id} approved secret access must be explicitly HIGH security risk`);
  }

  if (entry.status === 'DEPRECATED' || entry.status === 'REJECTED') {
    assert(typeof entry.notes === 'string' && entry.notes.trim().length > 0, `${entry.skill_id} ${entry.status} entry needs disposition notes`);
  }
}

console.log(`SKILL_REGISTRY_VALID: ${registry.entries.length} entries, unique IDs, lifecycle and approval gates consistent`);
