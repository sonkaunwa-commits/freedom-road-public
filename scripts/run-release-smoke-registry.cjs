#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runSmoke } = require('./release-smoke.cjs');
const { validateRegistry } = require('./validate-release-smoke-registry.cjs');

const SCHEMA_VERSION = 'release-smoke-registry-run/v1';
const DEFAULT_REGISTRY = 'release-smoke/registry.v1.json';

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read JSON ${filePath}: ${error.message}`);
  }
}

function uniqueConfigPaths(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    if (!seen.has(entry.config)) {
      seen.add(entry.config);
      result.push(entry.config);
    }
  }
  return result;
}

async function runRegistry(rawRegistry, repoRoot = process.cwd(), runtime = {}) {
  const root = path.resolve(repoRoot);
  const validated = validateRegistry(rawRegistry, root);
  const configPaths = uniqueConfigPaths(validated.entries);
  const started = Date.now();
  const results = [];

  for (const configPath of configPaths) {
    const rawConfig = readJson(path.resolve(root, configPath));
    const result = await runSmoke(rawConfig, runtime);
    results.push({ config: configPath, ...result });
  }

  return {
    schema_version: SCHEMA_VERSION,
    checked_at: new Date().toISOString(),
    pass: results.every(item => item.pass),
    entry_count: validated.entry_count,
    config_count: configPaths.length,
    duration_ms: Date.now() - started,
    configs: results,
  };
}

function formatTextReport(result) {
  const lines = [
    `release-smoke-registry-run ${result.pass ? 'PASS' : 'FAIL'} entries=${result.entry_count} configs=${result.config_count}`,
    `checked_at=${result.checked_at}`,
    `duration_ms=${result.duration_ms}`,
  ];
  for (const config of result.configs) {
    lines.push(`${config.pass ? 'PASS' : 'FAIL'} ${config.config} name=${config.name} checks=${config.checks.length} duration_ms=${config.duration_ms}`);
    for (const check of config.checks) {
      if (!check.pass) {
        lines.push(`  FAIL ${check.id} status=${check.status ?? 'n/a'} url=${check.url}`);
        if (check.error) lines.push(`    error=${check.error}`);
        for (const assertion of check.assertions || []) {
          if (!assertion.pass) {
            lines.push(`    assertion_failed type=${assertion.type} expected=${JSON.stringify(assertion.expected)} actual=${JSON.stringify(assertion.actual ?? null)}`);
          }
        }
      }
    }
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let registryPath = DEFAULT_REGISTRY;
  let registrySet = false;
  let jsonOnly = false;
  let outputPath = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') {
      jsonOnly = true;
    } else if (arg === '--output') {
      if (i + 1 >= args.length) throw new Error('--output requires a path');
      outputPath = args[++i];
    } else if (!registrySet) {
      registryPath = arg;
      registrySet = true;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }
  return { registryPath, jsonOnly, outputPath };
}

async function main() {
  const { registryPath, jsonOnly, outputPath } = parseArgs(process.argv);
  const repoRoot = process.cwd();
  const rawRegistry = readJson(path.resolve(repoRoot, registryPath));
  const result = await runRegistry(rawRegistry, repoRoot);
  const json = `${JSON.stringify(result, null, 2)}\n`;

  if (outputPath) {
    const resolved = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, json, 'utf8');
  }

  process.stdout.write(jsonOnly ? json : `${formatTextReport(result)}\n`);
  process.exitCode = result.pass ? 0 : 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(`release-smoke-registry-run ERROR: ${error && error.message ? error.message : error}`);
    process.exit(2);
  });
}

module.exports = { SCHEMA_VERSION, uniqueConfigPaths, runRegistry, formatTextReport };
