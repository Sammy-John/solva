#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

const packageJsonPath = path.join(rootDir, 'package.json');
const tauriConfigPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'));

const writeJson = async (filePath, value) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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
  const tauriConfig = await readJson(tauriConfigPath);

  const packageVersion = packageJson.version;
  const tauriVersion = tauriConfig.version;

  if (typeof packageVersion !== 'string' || !packageVersion.trim()) {
    console.error('package.json version is missing or invalid.');
    process.exit(1);
  }

  if (typeof tauriVersion !== 'string' || !tauriVersion.trim()) {
    console.error('src-tauri/tauri.conf.json version is missing or invalid.');
    process.exit(1);
  }

  if (mode === '--check') {
    if (packageVersion !== tauriVersion) {
      console.error(
        `Version mismatch: package.json=${packageVersion} src-tauri/tauri.conf.json=${tauriVersion}`,
      );
      process.exit(1);
    }

    console.log(`Version check passed: ${packageVersion}`);
    process.exit(0);
  }

  tauriConfig.version = packageVersion;
  await writeJson(tauriConfigPath, tauriConfig);
  console.log(`Updated src-tauri/tauri.conf.json version -> ${packageVersion}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
