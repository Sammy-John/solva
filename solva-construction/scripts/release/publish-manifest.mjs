#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')

const packageJsonPath = path.join(rootDir, 'package.json')
const nsisDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis')

const parseArgs = (argv) => {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const [key, inlineValue] = arg.slice(2).split('=', 2)
    if (inlineValue !== undefined) {
      out[key] = inlineValue
      continue
    }
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = 'true'
      continue
    }
    out[key] = next
    i += 1
  }
  return out
}

const readJson = async (filePath) => JSON.parse(await readFile(filePath, 'utf8'))

const ensureNonEmpty = (value, message) => {
  if (!value || !String(value).trim()) {
    throw new Error(message)
  }
  return String(value).trim()
}

const findNsisArtifacts = async (version, installerPattern) => {
  const entries = await readdir(nsisDir)
  const installerName = entries.find((name) => {
    const versionMatch = name.endsWith('-setup.exe') && name.includes(`_${version}_`)
    if (!versionMatch) return false
    if (!installerPattern) return true
    return name.includes(installerPattern)
  })

  if (!installerName) {
    throw new Error(
      `Could not find NSIS installer for version ${version}${installerPattern ? ` and pattern "${installerPattern}"` : ''} in ${nsisDir}`,
    )
  }

  const signatureName = `${installerName}.sig`
  if (!entries.includes(signatureName)) {
    throw new Error(`Could not find updater signature file: ${signatureName}`)
  }

  return { installerName, signatureName }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const packageJson = await readJson(packageJsonPath)

  const version = ensureNonEmpty(args.version ?? packageJson.version, 'Version is required')
  const baseUrl = ensureNonEmpty(
    args['base-url'] ?? process.env.SOLVA_UPDATE_BASE_URL,
    'Missing base URL. Pass --base-url or set SOLVA_UPDATE_BASE_URL.',
  ).replace(/\/+$/, '')

  const notes = args.notes ?? `Alpha build ${version}`
  const pubDate = args['pub-date'] ?? new Date().toISOString()
  const installerPattern = (args['installer-pattern'] ?? '').trim() || null
  const omitVersionDir = String(args['omit-version-dir'] ?? 'false').toLowerCase() === 'true'
  const urlFilenameMode = String(args['url-filename-mode'] ?? 'raw').toLowerCase()

  const artifactsRoot = path.join(rootDir, args['artifacts-root'] ?? 'artifacts')
  const latestManifestPath = path.join(rootDir, args['latest-manifest'] ?? 'artifacts/latest.json')

  const { installerName, signatureName } = await findNsisArtifacts(version, installerPattern)
  const signaturePath = path.join(nsisDir, signatureName)
  const signature = ensureNonEmpty(
    (await readFile(signaturePath, 'utf8')).trim(),
    `Signature file is empty: ${signaturePath}`,
  )

  const platformKey = 'windows-x86_64'
  const urlInstallerName = urlFilenameMode === 'github-dot' ? installerName.replace(/ /g, '.') : installerName
  const installerUrl = omitVersionDir
    ? `${baseUrl}/${encodeURIComponent(urlInstallerName)}`
    : `${baseUrl}/${version}/${encodeURIComponent(urlInstallerName)}`

  const manifest = {
    version,
    notes,
    pub_date: pubDate,
    platforms: {
      [platformKey]: {
        signature,
        url: installerUrl,
      },
    },
  }

  const versionArtifactDir = path.join(artifactsRoot, version)
  await mkdir(versionArtifactDir, { recursive: true })

  const versionManifestPath = path.join(versionArtifactDir, 'latest.json')

  await writeFile(versionManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await writeFile(latestManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  console.log(`Manifest written: ${versionManifestPath}`)
  console.log(`Manifest written: ${latestManifestPath}`)
  console.log(`Installer URL: ${installerUrl}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})

