import type { Dispatch, SetStateAction } from 'react'
import type { AppUpdateCheckResult, UpdateInstallResult } from '@/lib/updater'
import type { StorageStatus } from '@/lib/storageRuntime'

type ProjectToolsPanelProps = {
  storageStatus: StorageStatus
  appVersion: string
  updateCheck: AppUpdateCheckResult | null
  updateInstall: UpdateInstallResult | null
  isCheckingUpdates: boolean
  isInstallingUpdate: boolean
  backupBeforeInstall: boolean
  setBackupBeforeInstall: Dispatch<SetStateAction<boolean>>
  onCheckForUpdates: () => Promise<void> | void
  canInstallUpdate: boolean
  onInstallUpdate: () => Promise<void> | void
  canOpenDataFolder: boolean
  onOpenDataFolder: () => Promise<void> | void
  openFolderError: string | null
}

const renderUpdateStatus = (updateCheck: AppUpdateCheckResult | null): string => {
  if (!updateCheck) return 'Click "Check for Updates" to check availability.'

  if (updateCheck.status === 'update-available') {
    return `Update available: ${updateCheck.currentVersion} -> ${updateCheck.latestVersion}`
  }

  return updateCheck.message
}

export function ProjectToolsPanel({
  storageStatus,
  appVersion,
  updateCheck,
  updateInstall,
  isCheckingUpdates,
  isInstallingUpdate,
  backupBeforeInstall,
  setBackupBeforeInstall,
  onCheckForUpdates,
  canInstallUpdate,
  onInstallUpdate,
  canOpenDataFolder,
  onOpenDataFolder,
  openFolderError,
}: ProjectToolsPanelProps) {
  const updateMessage = renderUpdateStatus(updateCheck)

  return (
    <section className="status-card" aria-label="Project tools">
      <h2>Project Tools</h2>

      <div className="status-grid">
        <div>
          <strong>Runtime</strong>
          <p>{storageStatus.runtime}</p>
        </div>
        <div>
          <strong>Storage</strong>
          <p>{storageStatus.storageMode}</p>
        </div>
        <div>
          <strong>Current App Version</strong>
          <p>{appVersion || 'unknown'}</p>
        </div>
        <div>
          <strong>Current Database Path</strong>
          <p>{storageStatus.dbPath || '(not set)'}</p>
        </div>
        <div>
          <strong>Data Folder</strong>
          <p>{storageStatus.dataDir || '(not set)'}</p>
        </div>
      </div>

      <p>{updateMessage}</p>
      {updateInstall ? <p>{updateInstall.message}</p> : null}
      {openFolderError ? <p className="status-error">{openFolderError}</p> : null}

      <label className="backup-checkbox">
        <input
          type="checkbox"
          checked={backupBeforeInstall}
          onChange={(event) => setBackupBeforeInstall(event.target.checked)}
        />
        Create DB backup before installing update
      </label>

      <div className="status-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            void onCheckForUpdates()
          }}
          disabled={isCheckingUpdates}
        >
          {isCheckingUpdates ? 'Checking...' : 'Check for Updates'}
        </button>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            void onInstallUpdate()
          }}
          disabled={!canInstallUpdate || isInstallingUpdate}
        >
          {isInstallingUpdate ? 'Installing...' : 'Install Update'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            void onOpenDataFolder()
          }}
          disabled={!canOpenDataFolder}
        >
          Open Data Folder
        </button>
      </div>
    </section>
  )
}
