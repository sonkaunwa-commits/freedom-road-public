#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SCHEMA_VERSION = 'release-smoke/v1';

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function resolveTargetUrl(baseUrl, check) {
  if (check.url !== undefined && check.url !== null) return new URL(requireString(check.url, `${check.id}.url`));
  if (!baseUrl) throw new Error(`${check.id} needs url or config.baseUrl`);
  return new URL(requireString(check.path, `${check.id}.path`), baseUrl);
}

function addCacheBust(url, token) {
  const copy = new URL(url);
  copy.searchParams.set('__release_smoke', token);
  return copy;
}

function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('config must be a JSON object');
  }
  if (!Array.isArray(config.checks) || config.checks.length === 0) {
    throw new Error('config.checks must be a non-empty array');
  }
  const checks = config.checks;

  const name = config.name === undefined
    ? 'release-smoke'
    : requireString(config.name, 'name');

  let baseUrl = null;
  if (config.baseUrl !== undefined && config.baseUrl !== null) {
    baseUrl = new URL(requireString(config.baseUrl, 'baseUrl'));
    if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('baseUrl must use http or https');
  }

  let timeoutMs = 15000;
  if (config.timeoutMs !== undefined) {
    if (!Number.isInteger(config.timeoutMs) || config.timeoutMs <= 0) {
      throw new Error('timeoutMs must be a positive integer');
    }
    timeoutMs = config.timeoutMs;
  }

  const checkIds = new Set();
  const normalized = checks.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`checks[${index}] must be an object`);
    const id = raw.id === undefined
      ? `check-${index + 1}`
      : requireString(raw.id, `checks[${index}].id`);
    if (checkIds.has(id)) throw new Error(`duplicate check id: ${id}`);
    checkIds.add(id);

    const hasPath = raw.path !== undefined && raw.path !== null;
    const hasUrl = raw.url !== undefined && raw.url !== null;
    if (hasPath === hasUrl) {
      throw new Error(`${id} must declare exactly one of path or url`);
    }

    let status = 200;
    if (raw.status !== undefined) {
      if (!Number.isInteger(raw.status) || raw.status < 100 || raw.status > 599) {
        throw new Error(`${id}.status must be an integer HTTP status between 100 and 599`);
      }
      status = raw.status;
    }

    let contentTypeContains = null;
    if (raw.contentTypeContains !== undefined) {
      contentTypeContains = requireString(raw.contentTypeContains, `${id}.contentTypeContains`);
    }

    const target = { ...raw, id };
    const url = resolveTargetUrl(baseUrl, target);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${id} must use http or https`);
    return {
      id,
      url,
      status,
      contains: asArray(raw.contains).map((item, i) => requireString(item, `${id}.contains[${i}]`)),
      notContains: asArray(raw.notContains).map((item, i) => requireString(item, `${id}.notContains[${i}]`)),
      contentTypeContains,
    };
  });

  return {
    name,
    baseUrl: baseUrl ? baseUrl.toString() : null,
    timeoutMs,
    checks: normalized,
  };
}

async function fetchWithTimeout(url, timeoutMs, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'user-agent': 'freedom-road-release-smoke/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function runOne(check, options) {
  const started = Date.now();
  const assertions = [];
  const targetUrl = addCacheBust(check.url, options.cacheBustToken);

  try {
    const response = await fetchWithTimeout(targetUrl, options.timeoutMs, options.fetchImpl);
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';

    assertions.push({
      type: 'status',
      expected: check.status,
      actual: response.status,
      pass: response.status === check.status,
    });

    for (const text of check.contains) {
      assertions.push({ type: 'contains', expected: text, pass: body.includes(text) });
    }
    for (const text of check.notContains) {
      assertions.push({ type: 'not_contains', expected: text, pass: !body.includes(text) });
    }
    if (check.contentTypeContains) {
      assertions.push({
        type: 'content_type_contains',
        expected: check.contentTypeContains,
        actual: contentType,
        pass: contentType.toLowerCase().includes(check.contentTypeContains.toLowerCase()),
      });
    }

    return {
      id: check.id,
      url: check.url.toString(),
      final_url: response.url || targetUrl.toString(),
      status: response.status,
      content_type: contentType,
      pass: assertions.every(item => item.pass),
      duration_ms: Date.now() - started,
      assertions,
    };
  } catch (error) {
    return {
      id: check.id,
      url: check.url.toString(),
      pass: false,
      duration_ms: Date.now() - started,
      error: error && error.name === 'AbortError' ? `timeout after ${options.timeoutMs}ms` : String(error && error.message ? error.message : error),
      assertions,
    };
  }
}

async function runSmoke(rawConfig, runtime = {}) {
  const config = validateConfig(rawConfig);
  const started = Date.now();
  const fetchImpl = runtime.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('global fetch is unavailable; use Node 18+');

  const cacheBustToken = runtime.cacheBustToken || `${Date.now()}-${process.pid}`;
  const checks = [];
  for (const check of config.checks) {
    checks.push(await runOne(check, { timeoutMs: config.timeoutMs, fetchImpl, cacheBustToken }));
  }

  return {
    schema_version: SCHEMA_VERSION,
    name: config.name,
    checked_at: new Date().toISOString(),
    base_url: config.baseUrl,
    pass: checks.every(item => item.pass),
    duration_ms: Date.now() - started,
    checks,
  };
}

function formatTextReport(result) {
  const lines = [
    `release-smoke ${result.pass ? 'PASS' : 'FAIL'} name=${result.name}`,
    `checked_at=${result.checked_at}`,
    `duration_ms=${result.duration_ms}`,
  ];
  for (const check of result.checks) {
    lines.push(`${check.pass ? 'PASS' : 'FAIL'} ${check.id} status=${check.status ?? 'n/a'} duration_ms=${check.duration_ms} url=${check.url}`);
    if (check.error) lines.push(`  error=${check.error}`);
    for (const assertion of check.assertions || []) {
      if (!assertion.pass) {
        lines.push(`  assertion_failed type=${assertion.type} expected=${JSON.stringify(assertion.expected)} actual=${JSON.stringify(assertion.actual ?? null)}`);
      }
    }
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let configPath = null;
  let jsonOnly = false;
  let outputPath = null;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') jsonOnly = true;
    else if (arg === '--output') outputPath = args[++i];
    else if (!configPath) configPath = arg;
    else throw new Error(`unexpected argument: ${arg}`);
  }
  if (!configPath) throw new Error('usage: node scripts/release-smoke.cjs <config.json> [--json] [--output <report.json>]');
  if (outputPath === undefined) throw new Error('--output requires a path');
  return { configPath, jsonOnly, outputPath };
}

async function main() {
  const { configPath, jsonOnly, outputPath } = parseArgs(process.argv);
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  const result = await runSmoke(config);
  const json = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
    fs.writeFileSync(outputPath, json, 'utf8');
  }
  process.stdout.write(jsonOnly ? json : `${formatTextReport(result)}\n`);
  process.exitCode = result.pass ? 0 : 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(`release-smoke ERROR: ${error && error.message ? error.message : error}`);
    process.exit(2);
  });
}

module.exports = { SCHEMA_VERSION, validateConfig, runSmoke, formatTextReport };
