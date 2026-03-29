import { getVersion } from '@tauri-apps/api/app'
import { check, type Update } from '@tauri-apps/plugin-updater'
import { detectTauriRuntime } from '@/lib/storageRuntime'

export type UpdaterErrorCode = 'network' | 'signature' | 'unknown'

export type UpdaterDeps = {
  isTauriRuntime: () => boolean
  getAppVersion: () => Promise<string>
  checkForUpdate: () => Promise<Update | null>
}

export type AppUpdateCheckResult =
  | {
      status: 'not-tauri'
      currentVersion: string
      message: string
    }
  | {
      status: 'up-to-date'
      currentVersion: string
      message: string
    }
  | {
      status: 'update-available'
      currentVersion: string
      latestVersion: string
      releaseDate?: string
      releaseNotes?: string
      update: Update
      message: string
    }
  | {
      status: 'error'
      currentVersion: string
      code: UpdaterErrorCode
      message: string
    }

export type UpdateInstallResult =
  | {
      status: 'installed'
      message: string
    }
  | {
      status: 'error'
      code: UpdaterErrorCode
      message: string
    }

const defaultDeps: UpdaterDeps = {
  isTauriRuntime: detectTauriRuntime,
  getAppVersion: getVersion,
  checkForUpdate: () => check(),
}

const stringifyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

const mapUpdaterError = (error: unknown): { code: UpdaterErrorCode; message: string } => {
  const raw = stringifyError(error)
  const normalized = raw.toLowerCase()

  const signatureHints = ['signature', 'minisign', 'public key', 'integrity', 'checksum', 'verification']
  if (signatureHints.some((hint) => normalized.includes(hint))) {
    return {
      code: 'signature',
      message: 'Update verification failed. Please retry or ask for a fresh installer.',
    }
  }

  const networkHints = ['network', 'timeout', 'timed out', 'dns', 'offline', 'connection', 'fetch']
  if (networkHints.some((hint) => normalized.includes(hint))) {
    return {
      code: 'network',
      message: 'Could not reach the update server. Check your connection and try again.',
    }
  }

  const staleUpdateHints = ['resource id', 'invalid resource']
  if (staleUpdateHints.some((hint) => normalized.includes(hint))) {
    return {
      code: 'unknown',
      message: 'Update session expired. Please click Check for Updates again, then install.',
    }
  }

  return {
    code: 'unknown',
    message: raw,
  }
}

const safeAppVersion = async (deps: Pick<UpdaterDeps, 'getAppVersion'>): Promise<string> => {
  try {
    const version = await deps.getAppVersion()
    return version || 'unknown'
  } catch {
    return 'unknown'
  }
}

export const getCurrentAppVersion = async (deps: Pick<UpdaterDeps, 'getAppVersion'> = defaultDeps): Promise<string> =>
  safeAppVersion(deps)

export const checkForAppUpdate = async (deps: UpdaterDeps = defaultDeps): Promise<AppUpdateCheckResult> => {
  const currentVersion = await safeAppVersion(deps)

  if (!deps.isTauriRuntime()) {
    return {
      status: 'not-tauri',
      currentVersion,
      message: 'Updates are available only in the installed desktop app.',
    }
  }

  try {
    const update = await deps.checkForUpdate()
    if (!update) {
      return {
        status: 'up-to-date',
        currentVersion,
        message: 'You are on the latest version.',
      }
    }

    return {
      status: 'update-available',
      currentVersion,
      latestVersion: update.version,
      releaseDate: update.date,
      releaseNotes: update.body,
      update,
      message: `Update available: ${update.currentVersion} -> ${update.version}`,
    }
  } catch (error) {
    const mapped = mapUpdaterError(error)
    return {
      status: 'error',
      currentVersion,
      code: mapped.code,
      message: mapped.message,
    }
  }
}

export const downloadAndInstallUpdate = async (update: Update): Promise<UpdateInstallResult> => {
  try {
    await update.downloadAndInstall()
    return {
      status: 'installed',
      message: 'Update installed. Restart the app to finish applying it.',
    }
  } catch (error) {
    const mapped = mapUpdaterError(error)
    return {
      status: 'error',
      code: mapped.code,
      message: mapped.message,
    }
  } finally {
    try {
      await update.close()
    } catch {
      // no-op
    }
  }
}

