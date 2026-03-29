import { describe, expect, it, vi } from 'vitest'
import type { Update } from '@tauri-apps/plugin-updater'
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  type UpdaterDeps,
} from '@/lib/updater'

const makeDeps = (overrides: Partial<UpdaterDeps>): UpdaterDeps => ({
  isTauriRuntime: () => true,
  getAppVersion: async () => '1.0.0',
  checkForUpdate: async () => null,
  ...overrides,
})

const makeUpdate = (overrides?: Partial<Update>): Update =>
  ({
    currentVersion: '1.0.0',
    version: '1.0.1',
    body: 'Patch fixes',
    date: '2026-03-28',
    rawJson: {},
    close: vi.fn(async () => {}),
    download: vi.fn(async () => {}),
    install: vi.fn(async () => {}),
    downloadAndInstall: vi.fn(async () => {}),
    ...(overrides ?? {}),
  }) as unknown as Update

describe('checkForAppUpdate', () => {
  it('returns no-update when no update is available', async () => {
    const result = await checkForAppUpdate(
      makeDeps({
        checkForUpdate: async () => null,
      }),
    )

    expect(result.status).toBe('up-to-date')
    expect(result.currentVersion).toBe('1.0.0')
  })

  it('returns update-available metadata when update exists', async () => {
    const update = makeUpdate({ version: '1.1.0' })
    const result = await checkForAppUpdate(
      makeDeps({
        checkForUpdate: async () => update,
      }),
    )

    expect(result.status).toBe('update-available')
    expect(result.currentVersion).toBe('1.0.0')
    if (result.status === 'update-available') {
      expect(result.latestVersion).toBe('1.1.0')
      expect(result.update).toBe(update)
    }
  })
})

describe('downloadAndInstallUpdate', () => {
  it('returns installed on successful download/install', async () => {
    const update = makeUpdate()

    const result = await downloadAndInstallUpdate(update)

    expect(result.status).toBe('installed')
  })

  it('maps network, signature, and stale-resource errors to friendly messages', async () => {
    const networkUpdate = makeUpdate({
      downloadAndInstall: vi.fn(async () => {
        throw new Error('network timeout while downloading')
      }),
    })

    const signatureUpdate = makeUpdate({
      downloadAndInstall: vi.fn(async () => {
        throw new Error('signature verification failed')
      }),
    })

    const staleResourceUpdate = makeUpdate({
      downloadAndInstall: vi.fn(async () => {
        throw new Error('The resource id 2011843205 is invalid.')
      }),
    })

    const networkResult = await downloadAndInstallUpdate(networkUpdate)
    const signatureResult = await downloadAndInstallUpdate(signatureUpdate)
    const staleResourceResult = await downloadAndInstallUpdate(staleResourceUpdate)

    expect(networkResult.status).toBe('error')
    if (networkResult.status === 'error') {
      expect(networkResult.code).toBe('network')
    }

    expect(signatureResult.status).toBe('error')
    if (signatureResult.status === 'error') {
      expect(signatureResult.code).toBe('signature')
    }

    expect(staleResourceResult.status).toBe('error')
    if (staleResourceResult.status === 'error') {
      expect(staleResourceResult.code).toBe('unknown')
      expect(staleResourceResult.message).toContain('Check for Updates again')
    }
  })
})

