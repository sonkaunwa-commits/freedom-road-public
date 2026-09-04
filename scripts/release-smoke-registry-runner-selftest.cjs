#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runRegistry } = require('./run-release-smoke-registry.cjs');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function fakeResponse(url, body, contentType = 'text/html; charset=utf-8', status = 200) {
  return {
    status,
    url: url.toString(),
    headers: { get: name => name.toLowerCase() === 'content-type' ? contentType : null },
    text: async () => body,
  };
}

async function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-smoke-registry-runner-'));
  try {
    writeText(path.join(root, 'site', 'index.html'), 'ROOT_MARKER');
    writeText(path.join(root, 'site', 'alpha', 'index.html'), 'ALPHA_MARKER');
    writeText(path.join(root, 'site', 'beta', 'index.html'), 'BETA_MARKER');

    writeJson(path.join(root, 'release-smoke', 'core.v1.json'), {
      name: 'core',
      baseUrl: 'https://example.test/',
      checks: [
        { id: 'root', path: './', status: 200, contentTypeContains: 'text/html', contains: ['ROOT_MARKER'] },
        { id: 'alpha', path: 'alpha/', status: 200, contentTypeContains: 'text/html', contains: ['ALPHA_MARKER'] },
      ],
    });
    writeJson(path.join(root, 'release-smoke', 'beta.v1.json'), {
      name: 'beta',
      baseUrl: 'https://example.test/',
      checks: [
        { id: 'beta', path: 'beta/', status: 200, contentTypeContains: 'text/html', contains: ['BETA_MARKER'] },
      ],
    });

    const registry = {
      schemaVersion: 'release-smoke-registry/v1',
      baseUrl: 'https://example.test/',
      entries: [
        { id: 'root', entryPath: './', config: 'release-smoke/core.v1.json', checkId: 'root' },
        { id: 'alpha', entryPath: 'alpha/', config: 'release-smoke/core.v1.json', checkId: 'alpha' },
        { id: 'beta', entryPath: 'beta/', config: 'release-smoke/beta.v1.json', checkId: 'beta' },
      ],
    };

    const calls = [];
    const bodies = new Map([
      ['/', 'ROOT_MARKER'],
      ['/alpha/', 'ALPHA_MARKER'],
      ['/beta/', 'BETA_MARKER'],
    ]);
    const fetchImpl = async input => {
      const url = input instanceof URL ? input : new URL(input);
      calls.push(url.pathname);
      return fakeResponse(url, bodies.get(url.pathname) || 'missing', 'text/html; charset=utf-8', bodies.has(url.pathname) ? 200 : 404);
    };

    const clean = await runRegistry(registry, root, { fetchImpl, cacheBustToken: 'selftest-pass' });
    if (!clean.pass) throw new Error('clean registry run did not pass');
    if (clean.entry_count !== 3) throw new Error(`expected 3 entries, got ${clean.entry_count}`);
    if (clean.config_count !== 2) throw new Error(`expected 2 unique configs, got ${clean.config_count}`);
    if (calls.length !== 3) throw new Error(`config deduplication failed; expected 3 HTTP checks, got ${calls.length}`);

    const failed = await runRegistry(registry, root, {
      cacheBustToken: 'selftest-fail',
      fetchImpl: async input => {
        const url = input instanceof URL ? input : new URL(input);
        const body = url.pathname === '/beta/' ? 'STALE_BETA' : (bodies.get(url.pathname) || 'missing');
        return fakeResponse(url, body, 'text/html; charset=utf-8', bodies.has(url.pathname) ? 200 : 404);
      },
    });
    if (failed.pass) throw new Error('live assertion failure unexpectedly passed');
    const beta = failed.configs.find(item => item.config === 'release-smoke/beta.v1.json');
    if (!beta || beta.pass) throw new Error('failed beta config was not preserved in aggregate report');

    process.stdout.write('release-smoke-registry-runner self-test PASS: registry configs deduplicate and live assertion failures fail closed\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch(error => {
  console.error(`release-smoke-registry-runner self-test FAIL: ${error.message}`);
  process.exit(1);
});
