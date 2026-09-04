#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateConfig } = require('./release-smoke.cjs');

const SCHEMA_VERSION = 'release-smoke-registry/v1';

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read JSON ${filePath}: ${error.message}`);
  }
}

function validateEntryPath(value, label = 'entryPath') {
  const entryPath = requireString(value, label);
  if (entryPath === './') return entryPath;
  if (entryPath.includes('\\')) throw new Error(`${label} must use forward slashes only`);
  if (entryPath.includes('?') || entryPath.includes('#')) throw new Error(`${label} must not contain query or fragment`);
  if (entryPath.startsWith('/') || entryPath.startsWith('//')) throw new Error(`${label} must be relative to the registry base URL`);
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(entryPath)) throw new Error(`${label} must not be an absolute URL`);
  if (!entryPath.endsWith('/')) throw new Error(`${label} must identify a directory and end with /`);
  if (entryPath.includes('//')) throw new Error(`${label} must not contain empty path segments`);

  const segments = entryPath.slice(0, -1).split('/');
  if (segments.length === 0 || segments.some(segment => segment === '')) {
    throw new Error(`${label} must contain a relative directory path`);
  }
  for (const segment of segments) {
    let decoded;
    try {
      decoded = decodeURIComponent(segment);
    } catch (error) {
      throw new Error(`${label} contains invalid percent encoding`);
    }
    if (decoded === '.' || decoded === '..') throw new Error(`${label} must not contain dot-segment traversal`);
    if (decoded.includes('/') || decoded.includes('\\')) throw new Error(`${label} must not encode path separators`);
    if (/^[\x00-\x1f\x7f]+$/.test(decoded) || /[\x00-\x1f\x7f]/.test(decoded)) {
      throw new Error(`${label} must not contain control characters`);
    }
  }
  return entryPath;
}

function canonicalUrl(baseUrl, relativePath) {
  return new URL(validateEntryPath(relativePath), baseUrl).toString();
}

function sourceIndexPath(entryPath) {
  const safePath = validateEntryPath(entryPath);
  const cleaned = safePath === './' ? '' : safePath.slice(0, -1);
  return cleaned ? path.posix.join('site', cleaned, 'index.html') : 'site/index.html';
}

function validateRegistry(raw, repoRoot = process.cwd()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('registry must be a JSON object');
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`schemaVersion must be ${SCHEMA_VERSION}`);
  }

  const baseUrl = new URL(requireString(raw.baseUrl, 'baseUrl'));
  if (!['http:', 'https:'].includes(baseUrl.protocol)) {
    throw new Error('baseUrl must use http or https');
  }
  if (!Array.isArray(raw.entries) || raw.entries.length === 0) {
    throw new Error('entries must be a non-empty array');
  }

  const ids = new Set();
  const urls = new Set();
  const entries = [];
  const rootPath = path.resolve(repoRoot);
  const siteRoot = path.resolve(rootPath, 'site');
  const configCache = new Map();

  for (const [index, entry] of raw.entries.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`entries[${index}] must be an object`);
    }
    const id = requireString(entry.id, `entries[${index}].id`);
    const entryPath = validateEntryPath(entry.entryPath, `${id}.entryPath`);
    const configRel = requireString(entry.config, `${id}.config`);
    const checkId = requireString(entry.checkId, `${id}.checkId`);

    if (ids.has(id)) throw new Error(`duplicate entry id: ${id}`);
    ids.add(id);

    const expectedUrl = canonicalUrl(baseUrl, entryPath);
    if (!expectedUrl.startsWith(baseUrl.toString())) {
      throw new Error(`${id}.entryPath escapes registry base URL`);
    }
    if (urls.has(expectedUrl)) throw new Error(`duplicate entry URL: ${expectedUrl}`);
    urls.add(expectedUrl);

    if (!configRel.startsWith('release-smoke/') || configRel.includes('..')) {
      throw new Error(`${id}.config must stay under release-smoke/`);
    }
    const configPath = path.resolve(repoRoot, configRel);
    if (!configPath.startsWith(`${rootPath}${path.sep}`)) {
      throw new Error(`${id}.config escapes repository`);
    }
    if (!fs.existsSync(configPath)) {
      throw new Error(`${id}.config not found: ${configRel}`);
    }

    let config = configCache.get(configRel);
    if (!config) {
      config = validateConfig(readJson(configPath));
      const checkIds = new Set();
      for (const check of config.checks) {
        if (checkIds.has(check.id)) throw new Error(`${configRel} contains duplicate check id: ${check.id}`);
        checkIds.add(check.id);
      }
      configCache.set(configRel, config);
    }
    if (config.baseUrl !== baseUrl.toString()) {
      throw new Error(`${id}.config baseUrl differs from registry baseUrl`);
    }
    const check = config.checks.find(item => item.id === checkId);
    if (!check) throw new Error(`${id}.checkId not found in ${configRel}: ${checkId}`);
    if (check.url.toString() !== expectedUrl) {
      throw new Error(`${id} URL mismatch: registry=${expectedUrl} config=${check.url}`);
    }
    if (check.status !== 200) throw new Error(`${id} must expect HTTP 200`);
    if (!check.contentTypeContains || !check.contentTypeContains.toLowerCase().includes('text/html')) {
      throw new Error(`${id} must assert text/html content type`);
    }
    if (!Array.isArray(check.contains) || check.contains.length === 0) {
      throw new Error(`${id} must assert at least one release/key marker`);
    }

    const localSource = sourceIndexPath(entryPath);
    const localPath = path.resolve(repoRoot, localSource);
    if (!localPath.startsWith(`${siteRoot}${path.sep}`)) {
      throw new Error(`${id}.entryPath escapes local site root`);
    }
    if (!fs.existsSync(localPath)) {
      throw new Error(`${id} local entry source missing: ${localSource}`);
    }
    const localText = fs.readFileSync(localPath, 'utf8');
    for (const marker of check.contains) {
      if (!localText.includes(marker)) {
        throw new Error(`${id} marker missing from local source: ${JSON.stringify(marker)}`);
      }
    }

    entries.push({ id, entryPath, config: configRel, checkId, localSource, url: expectedUrl });
  }

  return {
    schema_version: SCHEMA_VERSION,
    pass: true,
    entry_count: entries.length,
    entries,
  };
}

function main() {
  const registryPath = process.argv[2] || 'release-smoke/registry.v1.json';
  const repoRoot = process.cwd();
  try {
    const result = validateRegistry(readJson(path.resolve(repoRoot, registryPath)), repoRoot);
    process.stdout.write(`release-smoke-registry PASS entries=${result.entry_count}\n`);
  } catch (error) {
    console.error(`release-smoke-registry FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = { SCHEMA_VERSION, validateEntryPath, validateRegistry, sourceIndexPath };
