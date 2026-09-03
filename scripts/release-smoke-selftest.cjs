#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { runSmoke } = require('./release-smoke.cjs');

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

    const bad = await runSmoke({
      ...config,
      name: 'release-smoke-negative-selftest',
      checks: [{ id: 'missing-marker', path: '/', contains: ['RELEASE_THAT_DOES_NOT_EXIST'] }],
    }, { cacheBustToken: 'selftest-bad' });
    assert.equal(bad.pass, false, 'negative self-test must fail');
    assert.equal(bad.checks[0].assertions.some(item => item.type === 'contains' && item.pass === false), true);

    console.log('release-smoke self-test PASS: positive checks pass and missing release marker fails closed');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
