#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateRegistry } = require('./validate-release-smoke-registry.cjs');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function expectFailure(label, fn, pattern) {
  let failed = false;
  try {
    fn();
  } catch (error) {
    failed = true;
    if (pattern && !pattern.test(error.message)) {
      throw new Error(`${label} failed for unexpected reason: ${error.message}`);
    }
  }
  if (!failed) throw new Error(`${label} unexpectedly passed`);
}

function cleanCoreConfig() {
  return {
    name: 'core',
    baseUrl: 'https://example.test/',
    checks: [{ id: 'root', path: './', status: 200, contentTypeContains: 'text/html', contains: ['ROOT_MARKER'] }],
  };
}

function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-smoke-registry-'));
  try {
    fs.mkdirSync(path.join(root, 'site', 'fund-assistant'), { recursive: true });
    fs.writeFileSync(path.join(root, 'site', 'index.html'), 'ROOT_MARKER', 'utf8');
    fs.writeFileSync(path.join(root, 'site', 'fund-assistant', 'index.html'), 'FUND_MARKER', 'utf8');

    const corePath = path.join(root, 'release-smoke', 'core.v1.json');
    writeJson(corePath, cleanCoreConfig());
    writeJson(path.join(root, 'release-smoke', 'fund.v1.json'), {
      name: 'fund',
      baseUrl: 'https://example.test/',
      checks: [{ id: 'fund', path: 'fund-assistant/', status: 200, contentTypeContains: 'text/html', contains: ['FUND_MARKER'] }],
    });

    const registry = {
      schemaVersion: 'release-smoke-registry/v1',
      baseUrl: 'https://example.test/',
      entries: [
        { id: 'root', entryPath: './', config: 'release-smoke/core.v1.json', checkId: 'root' },
        { id: 'fund', entryPath: 'fund-assistant/', config: 'release-smoke/fund.v1.json', checkId: 'fund' },
      ],
    };

    const clean = validateRegistry(registry, root);
    if (!clean.pass || clean.entry_count !== 2) throw new Error('clean registry did not pass');

    expectFailure('duplicate URL', () => validateRegistry({ ...registry, entries: [...registry.entries, { ...registry.entries[0], id: 'duplicate' }] }, root), /duplicate entry URL/);
    expectFailure('missing config', () => validateRegistry({ ...registry, entries: [{ ...registry.entries[0], config: 'release-smoke/missing.json' }] }, root), /config not found/);
    expectFailure('missing check', () => validateRegistry({ ...registry, entries: [{ ...registry.entries[0], checkId: 'missing' }] }, root), /checkId not found/);

    const noMarker = cleanCoreConfig();
    delete noMarker.checks[0].contains;
    writeJson(corePath, noMarker);
    expectFailure('missing marker assertion', () => validateRegistry(registry, root), /release\/key marker/);

    const staleMarker = cleanCoreConfig();
    staleMarker.checks[0].contains = ['STALE_MARKER'];
    writeJson(corePath, staleMarker);
    expectFailure('stale local marker', () => validateRegistry(registry, root), /marker missing from local source/);

    const duplicateChecks = cleanCoreConfig();
    duplicateChecks.checks.push({ ...duplicateChecks.checks[0] });
    writeJson(corePath, duplicateChecks);
    expectFailure('duplicate check id', () => validateRegistry(registry, root), /duplicate check id/);

    writeJson(corePath, cleanCoreConfig());
    const invalidEntryPaths = [
      '../escape/',
      '%2e%2e/escape/',
      'https://evil.test/',
      '//evil.test/',
      '/absolute/',
      'back\\slash/',
      'query/?v=1',
      'fragment/#x',
      './nested/',
      'file.html',
      'double//slash/',
    ];
    for (const entryPath of invalidEntryPaths) {
      expectFailure(`invalid entryPath ${entryPath}`, () => validateRegistry({
        ...registry,
        entries: [{ ...registry.entries[0], entryPath }],
      }, root), /entryPath/);
    }

    process.stdout.write('release-smoke-registry self-test PASS: valid coverage passes and duplicate/missing/stale/path-escape coverage fails closed\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run();
