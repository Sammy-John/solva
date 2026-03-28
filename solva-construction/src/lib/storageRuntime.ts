export type StorageMode = 'sqlite' | 'browser-fallback-localstorage' | 'sqlite-error'

export type StorageStatus = {
  runtime: 'tauri' | 'browser'
  storageMode: StorageMode
  dbPath: string
  dataDir: string
  executablePath: string
  isPackaged: boolean
  message: string
}

type StorageRuntimeState = {
  __CPD_STORAGE_STATUS__?: StorageStatus
}

export const detectTauriRuntime = (): boolean => {
  const runtime = globalThis as typeof globalThis & {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }

  return Boolean(runtime.__TAURI__ || runtime.__TAURI_INTERNALS__)
}

const defaultStorageStatus = (): StorageStatus => ({
  runtime: detectTauriRuntime() ? 'tauri' : 'browser',
  storageMode: detectTauriRuntime() ? 'sqlite-error' : 'browser-fallback-localstorage',
  dbPath: '',
  dataDir: '',
  executablePath: '',
  isPackaged: false,
  message: detectTauriRuntime()
    ? 'SQLite has not been initialized yet.'
    : 'Running outside Tauri, using browser fallback storage.',
})

export const getStorageStatus = (): StorageStatus =>
  (globalThis as StorageRuntimeState).__CPD_STORAGE_STATUS__ ?? defaultStorageStatus()

export const setStorageStatus = (status: StorageStatus): void => {
  ;(globalThis as StorageRuntimeState).__CPD_STORAGE_STATUS__ = status
}

export const isSqliteReady = (): boolean => getStorageStatus().storageMode === 'sqlite'

export const shouldUseBrowserFallback = (): boolean => {
  const status = getStorageStatus()
  return status.runtime === 'browser' && status.storageMode === 'browser-fallback-localstorage'
}
