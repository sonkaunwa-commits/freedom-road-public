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

function fakeResponse(url, body = 'OK_MARKER') {
  return {
    status: 200,
    url,
    headers: { get: name => name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null },
    text: async () => body,
  };
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

    const rootRelative = validateConfig({
      name: 'root-relative-path',
      baseUrl: `${baseUrl}nested/`,
      checks: [{ id: 'root-relative', path: '/data.json' }],
    });
    assert.equal(rootRelative.checks[0].url.toString(), `${baseUrl}data.json`);

    const defaultNameConfig = validateConfig({
      baseUrl,
      checks: [{ id: 'default-name', path: '/' }],
    });
    assert.equal(defaultNameConfig.name, 'release-smoke');
    assert.equal(defaultNameConfig.timeoutMs, 15000);

    const maxTimeoutConfig = validateConfig({ ...config, timeoutMs: 120000 });
    assert.equal(maxTimeoutConfig.timeoutMs, 120000);

    const bad = await runSmoke({
      ...config,
      name: 'release-smoke-negative-selftest',
      checks: [{ id: 'missing-marker', path: '/', contains: ['RELEASE_THAT_DOES_NOT_EXIST'] }],
    }, { cacheBustToken: 'selftest-bad' });
    assert.equal(bad.pass, false, 'negative self-test must fail');
    assert.equal(bad.checks[0].assertions.some(item => item.type === 'contains' && item.pass === false), true);

    const sameOriginRedirect = await runSmoke({
      name: 'same-origin-redirect',
      baseUrl,
      checks: [{ id: 'same-origin', path: 'start', contains: ['OK_MARKER'] }],
    }, {
      cacheBustToken: 'selftest-same-redirect',
      fetchImpl: async () => fakeResponse(`${baseUrl}final`),
    });
    assert.equal(sameOriginRedirect.pass, true, JSON.stringify(sameOriginRedirect, null, 2));
    assert.equal(sameOriginRedirect.checks[0].assertions.some(item => item.type === 'redirect_origin' && item.pass === true), true);

    const crossOriginRedirect = await runSmoke({
      name: 'cross-origin-redirect',
      baseUrl,
      checks: [{ id: 'cross-origin', path: 'start', contains: ['OK_MARKER'] }],
    }, {
      cacheBustToken: 'selftest-cross-redirect',
      fetchImpl: async () => fakeResponse('https://evil.test/final'),
    });
    assert.equal(crossOriginRedirect.pass, false, 'cross-origin redirect for path check must fail');
    const redirectAssertion = crossOriginRedirect.checks[0].assertions.find(item => item.type === 'redirect_origin');
    assert.equal(redirectAssertion.pass, false);
    assert.equal(redirectAssertion.expected, new URL(baseUrl).origin);
    assert.equal(redirectAssertion.actual, 'https://evil.test');

    const explicitUrlRedirect = await runSmoke({
      name: 'explicit-url-redirect',
      checks: [{ id: 'explicit-url', url: `${baseUrl}start`, contains: ['OK_MARKER'] }],
    }, {
      cacheBustToken: 'selftest-explicit-url-redirect',
      fetchImpl: async () => fakeResponse('https://evil.test/final'),
    });
    assert.equal(explicitUrlRedirect.pass, true, JSON.stringify(explicitUrlRedirect, null, 2));
    assert.equal(explicitUrlRedirect.checks[0].assertions.some(item => item.type === 'redirect_origin'), false);

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
    expectConfigError({ ...config, baseUrl: `http://user@127.0.0.1:${address.port}/` }, /baseUrl must not contain URL credentials/);
    expectConfigError({ ...config, baseUrl: `http://user:pass@127.0.0.1:${address.port}/` }, /baseUrl must not contain URL credentials/);
    expectConfigError({ name: 'credential-url', checks: [{ id: 'user-only', url: 'https://user@example.com/' }] }, /url must not contain URL credentials/);
    expectConfigError({ name: 'credential-url', checks: [{ id: 'user-pass', url: 'https://user:pass@example.com/' }] }, /url must not contain URL credentials/);
    expectConfigError({ ...config, checks: [{ id: 'absolute-path-url', path: 'https://evil.test/' }] }, /path must be relative to config\.baseUrl/);
    expectConfigError({ ...config, checks: [{ id: 'scheme-relative-path', path: '//evil.test/' }] }, /path must be relative to config\.baseUrl/);
    expectConfigError({ ...config, checks: [{ id: 'javascript-path', path: 'javascript:alert(1)' }] }, /path must be relative to config\.baseUrl/);
    expectConfigError({ ...config, checks: [{ id: 'bad-status-low', path: '/', status: 99 }] }, /status must be an integer HTTP status/);
    expectConfigError({ ...config, checks: [{ id: 'bad-status-high', path: '/', status: 600 }] }, /status must be an integer HTTP status/);
    expectConfigError({ ...config, checks: [{ id: 'bad-status-type', path: '/', status: 200.5 }] }, /status must be an integer HTTP status/);
    expectConfigError({ ...config, timeoutMs: 0 }, /timeoutMs must be a positive integer/);
    expectConfigError({ ...config, timeoutMs: true }, /timeoutMs must be a positive integer/);
    expectConfigError({ ...config, timeoutMs: 120001 }, /timeoutMs must be a positive integer <= 120000/);
    expectConfigError({ ...config, timeoutMs: Number.MAX_SAFE_INTEGER }, /timeoutMs must be a positive integer <= 120000/);

    console.log('release-smoke self-test PASS: URL/path/timeout guards and cross-origin path redirects fail closed');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
