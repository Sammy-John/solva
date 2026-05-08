#!/usr/bin/env node
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const tauriConfigPaths = [
  path.join(rootDir, 'src-tauri', 'tauri.conf.json'),
  path.join(rootDir, 'src-tauri', 'tauri.test.conf.json'),
];
const cargoTomlPath = path.join(rootDir, 'src-tauri', 'Cargo.toml');

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const writeJson = async (filePath, value) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readCargoVersion = async (filePath) => {
  const cargoToml = await readFile(filePath, 'utf8');
  const match = cargoToml.match(/(^version\s*=\s*")([^"]+)(")/m);
  if (!match) {
    throw new Error(`${path.relative(rootDir, filePath)} version is missing or invalid.`);
  }

  return {
    cargoToml,
    version: match[2],
  };
};

const writeCargoVersion = async (filePath, cargoToml, version) => {
  const updated = cargoToml.replace(/(^version\s*=\s*")([^"]+)(")/m, `$1${version}$3`);
  await writeFile(filePath, updated, 'utf8');
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const printUsage = () => {
  console.log('Usage: node scripts/release/sync-version.mjs --check|--write');
};

const main = async () => {
  const mode = process.argv[2];
  if (!mode || mode === '--help' || mode === '-h') {
    printUsage();
    process.exit(0);
  }

  if (mode !== '--check' && mode !== '--write') {
    console.error(`Unknown mode: ${mode}`);
    printUsage();
    process.exit(1);
  }

  const packageJson = await readJson(packageJsonPath);
  const packageVersion = packageJson.version;

  if (typeof packageVersion !== 'string' || !packageVersion.trim()) {
    console.error('package.json version is missing or invalid.');
    process.exit(1);
  }

  const existingConfigPaths = [];
  for (const cfgPath of tauriConfigPaths) {
    if (await fileExists(cfgPath)) {
      existingConfigPaths.push(cfgPath);
    }
  }

  if (existingConfigPaths.length === 0) {
    console.error('No Tauri config files found.');
    process.exit(1);
  }

  const configs = await Promise.all(existingConfigPaths.map(async (cfgPath) => ({
    cfgPath,
    cfg: await readJson(cfgPath),
  })));
  const cargo = await readCargoVersion(cargoTomlPath);

  for (const { cfgPath, cfg } of configs) {
    if (typeof cfg.version !== 'string' || !cfg.version.trim()) {
      console.error(`${path.relative(rootDir, cfgPath)} version is missing or invalid.`);
      process.exit(1);
    }
  }

  if (mode === '--check') {
    const mismatches = configs
      .filter(({ cfg }) => cfg.version !== packageVersion)
      .map(({ cfgPath, cfg }) => `${path.relative(rootDir, cfgPath)}=${cfg.version}`);

    if (cargo.version !== packageVersion) {
      mismatches.push(`${path.relative(rootDir, cargoTomlPath)}=${cargo.version}`);
    }

    if (mismatches.length > 0) {
      console.error(`Version mismatch: package.json=${packageVersion} ${mismatches.join(' ')}`);
      process.exit(1);
    }

    console.log(`Version check passed: ${packageVersion}`);
    process.exit(0);
  }

  for (const { cfgPath, cfg } of configs) {
    cfg.version = packageVersion;
    await writeJson(cfgPath, cfg);
    console.log(`Updated ${path.relative(rootDir, cfgPath)} version -> ${packageVersion}`);
  }

  await writeCargoVersion(cargoTomlPath, cargo.cargoToml, packageVersion);
  console.log(`Updated ${path.relative(rootDir, cargoTomlPath)} version -> ${packageVersion}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
