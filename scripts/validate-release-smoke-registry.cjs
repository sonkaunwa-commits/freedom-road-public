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

function canonicalUrl(baseUrl, relativePath) {
  return new URL(requireString(relativePath, 'entryPath'), baseUrl).toString();
}

function sourceIndexPath(entryPath) {
  const cleaned = entryPath === './'
    ? ''
    : entryPath.replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '');
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
  const configCache = new Map();

  for (const [index, entry] of raw.entries.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`entries[${index}] must be an object`);
    }
    const id = requireString(entry.id, `entries[${index}].id`);
    const entryPath = requireString(entry.entryPath, `${id}.entryPath`);
    const configRel = requireString(entry.config, `${id}.config`);
    const checkId = requireString(entry.checkId, `${id}.checkId`);

    if (ids.has(id)) throw new Error(`duplicate entry id: ${id}`);
    ids.add(id);

    const expectedUrl = canonicalUrl(baseUrl, entryPath);
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
module.exports = { SCHEMA_VERSION, validateRegistry, sourceIndexPath };
