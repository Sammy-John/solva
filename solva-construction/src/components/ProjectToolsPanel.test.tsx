// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ProjectToolsPanel } from '@/components/ProjectToolsPanel';
import type { StorageStatus } from '@/lib/storageRuntime';

const storageStatus: StorageStatus = {
  runtime: 'tauri',
  storageMode: 'sqlite',
  dbPath: 'C:/db.sqlite',
  dataDir: 'C:/data',
  executablePath: 'C:/app.exe',
  isPackaged: true,
  message: 'SQLite database is active.',
};

describe('ProjectToolsPanel', () => {
  afterEach(() => cleanup());
  it('renders two collapsible sections and toggles visibility', () => {
    render(
      <ProjectToolsPanel
        storageStatus={storageStatus}
        appVersion="1.1.0"
        updateCheck={null}
        updateInstall={null}
        isCheckingUpdates={false}
        isInstallingUpdate={false}
        backupBeforeInstall={true}
        setBackupBeforeInstall={() => undefined}
        onCheckForUpdates={() => undefined}
        canInstallUpdate={false}
        onInstallUpdate={() => undefined}
        canOpenDataFolder={true}
        onOpenDataFolder={() => undefined}
        openFolderError={null}
      />,
    );

    expect(screen.getByText('Version & Updates')).toBeInTheDocument();
    expect(screen.getByText('Data & Storage')).toBeInTheDocument();

    // Collapsed by default
    expect(screen.queryByText('Current App Version')).not.toBeInTheDocument();
    expect(screen.queryByText('Current Database Path')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Version & Updates' }));
    expect(screen.getByText('Current App Version')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Data & Storage' }));
    expect(screen.getByText('Current Database Path')).toBeInTheDocument();

    // Hide again
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Version & Updates' }));
    expect(screen.queryByText('Current App Version')).not.toBeInTheDocument();
  });

  it('shows a latest changes list', () => {
    render(
      <ProjectToolsPanel
        storageStatus={storageStatus}
        appVersion="1.1.0"
        updateCheck={null}
        updateInstall={null}
        isCheckingUpdates={false}
        isInstallingUpdate={false}
        backupBeforeInstall={true}
        setBackupBeforeInstall={() => undefined}
        onCheckForUpdates={() => undefined}
        canInstallUpdate={false}
        onInstallUpdate={() => undefined}
        canOpenDataFolder={false}
        onOpenDataFolder={() => undefined}
        openFolderError={null}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Version & Updates' }));

    expect(screen.getByText('Latest Changes')).toBeInTheDocument();
    expect(screen.getByText(/Move mode/i)).toBeInTheDocument();
  });
});
