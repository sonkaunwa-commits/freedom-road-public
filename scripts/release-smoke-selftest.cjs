#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { runSmoke, validateConfig } = require('./release-smoke.cjs');

function startFixtureServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<html><head><meta name="release" content="TEST_RELEASE_1"></head><body>Freedom Road fixture</body></html>');
      return;
    }
    if (url.pathname === '/app.js') {
      res.writeHead(200, { 'content-type': 'application/javascript' });
      res.end('globalThis.TEST_APP = "ready";');
      return;
    }
    if (url.pathname === '/data.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"version":"1","freshness":"ok"}');
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function expectConfigError(config, pattern) {
  assert.throws(() => validateConfig(config), pattern);
}

(async () => {
  const server = await startFixtureServer();
  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/`;
    const config = {
      name: 'release-smoke-selftest',
      baseUrl,
      timeoutMs: 2000,
      checks: [
        { id: 'entry', path: '/', status: 200, contentTypeContains: 'text/html', contains: ['TEST_RELEASE_1', 'Freedom Road fixture'] },
        { id: 'script', path: 'app.js', status: 200, contains: ['TEST_APP', 'ready'] },
        { id: 'data', path: 'data.json', status: 200, contentTypeContains: 'application/json', contains: ['"freshness":"ok"'] },
      ],
    };

    const good = await runSmoke(config, { cacheBustToken: 'selftest-good' });
    assert.equal(good.pass, true, JSON.stringify(good, null, 2));
    assert.equal(good.checks.length, 3);

    const absoluteUrlConfig = validateConfig({
      name: 'absolute-url',
      checks: [{ id: 'absolute', url: `${baseUrl}data.json`, status: 200 }],
    });
    assert.equal(absoluteUrlConfig.checks[0].url.toString(), `${baseUrl}data.json`);

    const sameOriginAbsolutePath = validateConfig({
      name: 'same-origin-absolute-path',
      baseUrl,
      checks: [{ id: 'same-origin', path: `${baseUrl}data.json`, status: 200 }],
    });
    assert.equal(sameOriginAbsolutePath.checks[0].url.toString(), `${baseUrl}data.json`);

    const rootRelativePath = validateConfig({
      name: 'root-relative',
      baseUrl: `${baseUrl}nested/`,
      checks: [{ id: 'root-relative', path: '/data.json', status: 200 }],
    });
    assert.equal(rootRelativePath.checks[0].url.toString(), `${baseUrl}data.json`);

    const defaultNameConfig = validateConfig({
      baseUrl,
      checks: [{ id: 'default-name', path: '/' }],
    });
    assert.equal(defaultNameConfig.name, 'release-smoke');

    const bad = await runSmoke({
      ...config,
      name: 'release-smoke-negative-selftest',
      checks: [{ id: 'missing-marker', path: '/', contains: ['RELEASE_THAT_DOES_NOT_EXIST'] }],
    }, { cacheBustToken: 'selftest-bad' });
    assert.equal(bad.pass, false, 'negative self-test must fail');
    assert.equal(bad.checks[0].assertions.some(item => item.type === 'contains' && item.pass === false), true);

    expectConfigError({ ...config, checks: { id: 'scalar-check', path: '/' } }, /config\.checks must be a non-empty array/);
    expectConfigError({ ...config, checks: [] }, /config\.checks must be a non-empty array/);
    expectConfigError({ ...config, name: '' }, /name must be a non-empty string/);
    expectConfigError({ ...config, name: false }, /name must be a non-empty string/);
    expectConfigError({ ...config, checks: [{ id: 'empty-content-type', path: '/', contentTypeContains: '' }] }, /contentTypeContains must be a non-empty string/);
    expectConfigError({ ...config, checks: [{ id: 'null-content-type', path: '/', contentTypeContains: null }] }, /contentTypeContains must be a non-empty string/);
    expectConfigError({ ...config, checks: [{ id: 'dup', path: '/' }, { id: 'dup', path: 'app.js' }] }, /duplicate check id/);
    expectConfigError({ ...config, checks: [{ id: 'ambiguous', path: '/', url: baseUrl }] }, /exactly one of path or url/);
    expectConfigError({ ...config, checks: [{ id: 'missing-locator' }] }, /exactly one of path or url/);
    expectConfigError({ ...config, checks: [{ id: '', path: '/' }] }, /id must be a non-empty string/);
    expectConfigError({ name: 'empty-base', baseUrl: '', checks: [{ id: 'entry', path: '/' }] }, /baseUrl must be a non-empty string/);
    expectConfigError({ ...config, checks: [{ id: 'absolute-cross-origin-path', path: 'https://example.com/data.json' }] }, /path must stay on config\.baseUrl origin/);
    expectConfigError({ ...config, checks: [{ id: 'scheme-relative-cross-origin-path', path: '//example.com/data.json' }] }, /path must stay on config\.baseUrl origin/);
    expectConfigError({ ...config, checks: [{ id: 'protocol-cross-origin-path', path: `https://127.0.0.1:${address.port}/data.json` }] }, /path must stay on config\.baseUrl origin/);
    expectConfigError({ ...config, checks: [{ id: 'bad-status-low', path: '/', status: 99 }] }, /status must be an integer HTTP status/);
    expectConfigError({ ...config, checks: [{ id: 'bad-status-high', path: '/', status: 600 }] }, /status must be an integer HTTP status/);
    expectConfigError({ ...config, checks: [{ id: 'bad-status-type', path: '/', status: 200.5 }] }, /status must be an integer HTTP status/);
    expectConfigError({ ...config, timeoutMs: 0 }, /timeoutMs must be a positive integer/);
    expectConfigError({ ...config, timeoutMs: true }, /timeoutMs must be a positive integer/);

    console.log('release-smoke self-test PASS: valid configs execute and cross-origin/ambiguous/malformed path contracts fail closed');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
