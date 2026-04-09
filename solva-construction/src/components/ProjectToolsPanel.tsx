import { useMemo, useState } from 'react';
import type { StorageStatus } from '@/lib/storageRuntime';
import type { AppUpdateCheckResult, UpdateInstallResult } from '@/lib/updater';
import { getLatestChanges } from '@/lib/releaseNotes';

export interface ProjectToolsPanelProps {
  storageStatus: StorageStatus;
  appVersion: string;
  updateCheck: AppUpdateCheckResult | null;
  updateInstall: UpdateInstallResult | null;
  isCheckingUpdates: boolean;
  isInstallingUpdate: boolean;
  backupBeforeInstall: boolean;
  setBackupBeforeInstall: (value: boolean) => void;
  onCheckForUpdates: () => void;
  canInstallUpdate: boolean;
  onInstallUpdate: () => void;
  canOpenDataFolder: boolean;
  onOpenDataFolder: () => void;
  openFolderError: string | null;
}

function PanelSection({
  title,
  toggleLabel,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  toggleLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="storage-panel-section">
      <div className="storage-panel-section-header">
        <h3 className="storage-panel-section-title">{title}</h3>
        <button
          type="button"
          className="secondary-button storage-panel-section-toggle"
          aria-label={toggleLabel}
          onClick={onToggle}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>
      {isOpen ? <div className="storage-panel-section-body">{children}</div> : null}
    </section>
  );
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
  const [showUpdates, setShowUpdates] = useState(true);
  const [showData, setShowData] = useState(true);

  const latestChanges = useMemo(() => getLatestChanges(appVersion), [appVersion]);

  return (
    <aside className="storage-panel" aria-label="Project tools">
      <div className="storage-panel-row">
        <span className={`storage-mode storage-mode-${storageStatus.storageMode}`}>
          {storageStatus.storageMode}
        </span>
        <span className="storage-runtime">
          {storageStatus.runtime} {storageStatus.isPackaged ? 'installed' : 'dev'}
        </span>
      </div>

      <PanelSection
        title="Version & Updates"
        toggleLabel="Toggle Version & Updates"
        isOpen={showUpdates}
        onToggle={() => setShowUpdates((current) => !current)}
      >
        <p className="storage-panel-label">Current App Version</p>
        <p className="storage-panel-value" title={appVersion}>
          {appVersion}
        </p>

        <p className="storage-panel-label">Latest Changes</p>
        {latestChanges.items.length > 0 ? (
          <ul className="storage-panel-changes" aria-label={`Latest changes ${latestChanges.version}`}>
            {latestChanges.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="storage-panel-hint">No release notes available for this version.</p>
        )}

        {updateCheck ? (
          <p className={`storage-update-status storage-update-status-${updateCheck.status}`}>
            {updateCheck.message}
            {updateCheck.status === 'update-available'
              ? ` (${updateCheck.currentVersion} -> ${updateCheck.latestVersion})`
              : ''}
          </p>
        ) : null}

        {updateInstall ? (
          <p className={`storage-update-status storage-update-status-${updateInstall.status}`}>
            {updateInstall.message}
          </p>
        ) : null}

        <div className="storage-panel-actions">
          <label className="storage-checkbox-row">
            <input
              type="checkbox"
              checked={backupBeforeInstall}
              onChange={(event) => setBackupBeforeInstall(event.target.checked)}
              disabled={isInstallingUpdate}
            />
            <span>Create DB backup before installing update</span>
          </label>

          <button
            type="button"
            className="secondary-button storage-panel-button"
            onClick={onCheckForUpdates}
            disabled={isCheckingUpdates || isInstallingUpdate}
          >
            {isCheckingUpdates ? 'Checking...' : 'Check for Updates'}
          </button>

          {canInstallUpdate ? (
            <button
              type="button"
              className="secondary-button storage-panel-button"
              onClick={onInstallUpdate}
              disabled={!canInstallUpdate}
            >
              {isInstallingUpdate ? 'Installing...' : 'Install Update'}
            </button>
          ) : null}
        </div>
      </PanelSection>

      <PanelSection
        title="Data & Storage"
        toggleLabel="Toggle Data & Storage"
        isOpen={showData}
        onToggle={() => setShowData((current) => !current)}
      >
        <p className="storage-panel-label">Current Database Path</p>
        <p className="storage-panel-value" title={storageStatus.dbPath || 'Not available'}>
          {storageStatus.dbPath || 'Not available'}
        </p>

        <p className="storage-panel-label">Data Folder</p>
        <p className="storage-panel-value" title={storageStatus.dataDir || 'Not available'}>
          {storageStatus.dataDir || 'Not available'}
        </p>

        <p className="storage-panel-hint">{storageStatus.message}</p>

        {canOpenDataFolder ? (
          <button
            type="button"
            className="secondary-button storage-panel-button"
            onClick={onOpenDataFolder}
          >
            Open Data Folder
          </button>
        ) : null}

        {openFolderError ? <p className="inline-error">{openFolderError}</p> : null}
      </PanelSection>
    </aside>
  );
}