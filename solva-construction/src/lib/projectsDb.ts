import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import {
  detectTauriRuntime,
  setStorageStatus,
  shouldUseBrowserFallback,
  type StorageStatus,
} from '@/lib/storageRuntime'

export type Project = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

type ProjectRow = {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

type StorageStatusRow = {
  runtime: 'tauri' | 'browser'
  storage_mode: 'sqlite' | 'browser-fallback-localstorage' | 'sqlite-error'
  db_path: string
  data_dir: string
  executable_path: string
  is_packaged: boolean
  message: string
}

type FallbackSchedule = {
  tasks?: unknown[]
  sections?: unknown[]
  dependencies?: unknown[]
  people?: unknown[]
}

const PROJECTS_FALLBACK_KEY = 'construction-planner-desktop.projects.fallback.v1'
const SCHEDULE_FALLBACK_KEY = 'construction-planner-desktop.schedule.fallback.v1'

const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const fromProject = (project: Project): ProjectRow => ({
  id: project.id,
  name: project.name,
  description: project.description,
  created_at: project.createdAt,
  updated_at: project.updatedAt,
})

const toStorageStatus = (row: StorageStatusRow): StorageStatus => ({
  runtime: row.runtime,
  storageMode: row.storage_mode,
  dbPath: row.db_path,
  dataDir: row.data_dir,
  executablePath: row.executable_path,
  isPackaged: row.is_packaged,
  message: row.message,
})

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
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

const loadFallbackProjects = (): Project[] => {
  const raw = localStorage.getItem(PROJECTS_FALLBACK_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as Project[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const loadFallbackScheduleMap = (): Record<string, FallbackSchedule> => {
  const raw = localStorage.getItem(SCHEDULE_FALLBACK_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as Record<string, FallbackSchedule>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const saveFallbackProjects = (projects: Project[]): void => {
  localStorage.setItem(PROJECTS_FALLBACK_KEY, JSON.stringify(projects))
}

const shouldThrowForDatabaseError = (): boolean => detectTauriRuntime() && !shouldUseBrowserFallback()

export const initDatabase = async (): Promise<StorageStatus> => {
  const isTauriRuntime = detectTauriRuntime()
  const fallbackProjects = loadFallbackProjects()
  const fallbackScheduleMap = loadFallbackScheduleMap()

  console.info(`[storage] runtime hint: tauriRuntime=${isTauriRuntime}`)
  console.info(
    `[storage] localStorage snapshot (read-only): projects=${fallbackProjects.length}, scheduleProjects=${Object.keys(fallbackScheduleMap).length}`,
  )

  if (!isTauriRuntime) {
    const browserStatus: StorageStatus = {
      runtime: 'browser',
      storageMode: 'browser-fallback-localstorage',
      dbPath: '',
      dataDir: '',
      executablePath: '',
      isPackaged: false,
      message: 'Running outside Tauri, using browser fallback storage.',
    }

    setStorageStatus(browserStatus)
    console.info('[storage] Browser runtime detected, using localStorage fallback')
    return browserStatus
  }

  try {
    const row = await tauriInvoke<StorageStatusRow>('init_database')
    const status = toStorageStatus(row)
    setStorageStatus(status)
    console.info(`[storage] SQLite init succeeded, dbPath=${status.dbPath}`)
    return status
  } catch (error) {
    const message = formatError(error)
    const failureStatus: StorageStatus = {
      runtime: 'tauri',
      storageMode: 'sqlite-error',
      dbPath: '',
      dataDir: '',
      executablePath: '',
      isPackaged: true,
      message,
    }

    setStorageStatus(failureStatus)
    console.error(`[storage] SQLite init failed in Tauri runtime: ${message}`)
    throw new Error(message)
  }
}

export const openDataFolder = async (): Promise<string> => {
  if (!detectTauriRuntime()) {
    throw new Error('Open Data Folder is only available in the installed Tauri app.')
  }

  const openedPath = await tauriInvoke<string>('open_data_folder')
  console.info(`[storage] Opened data folder: ${openedPath}`)
  return openedPath
}

export const migrateLocalStorageToSqlite = async (): Promise<void> => {
  const fallbackProjects = loadFallbackProjects()
  const fallbackScheduleMap = loadFallbackScheduleMap()

  if (fallbackProjects.length === 0) {
    console.info('[migration] skipped: no fallback projects found in localStorage')
    return
  }

  let existingRows: ProjectRow[]
  try {
    existingRows = await tauriInvoke<ProjectRow[]>('list_projects')
  } catch (error) {
    console.info(`[migration] skipped: SQLite not available (${formatError(error)})`)
    return
  }

  const existingIds = new Set(existingRows.map((row) => row.id))

  let importedProjects = 0
  let importedSchedules = 0

  for (const fallbackProject of fallbackProjects) {
    if (existingIds.has(fallbackProject.id)) {
      continue
    }

    await tauriInvoke<ProjectRow>('import_project_with_id', {
      projectId: fallbackProject.id,
      name: fallbackProject.name,
      description: fallbackProject.description,
      createdAt: fallbackProject.createdAt,
      updatedAt: fallbackProject.updatedAt,
    })

    importedProjects += 1
    existingIds.add(fallbackProject.id)

    const schedule = fallbackScheduleMap[fallbackProject.id]
    if (schedule) {
      await tauriInvoke('save_project_schedule', {
        projectId: fallbackProject.id,
        tasksJson: JSON.stringify(schedule.tasks ?? []),
        sectionsJson: JSON.stringify(schedule.sections ?? []),
        dependenciesJson: JSON.stringify(schedule.dependencies ?? []),
        peopleJson: JSON.stringify(schedule.people ?? []),
      })

      importedSchedules += 1
    }
  }

  if (importedProjects === 0) {
    console.info('[migration] no missing projects to import into SQLite')
    return
  }

  const afterRows = await tauriInvoke<ProjectRow[]>('list_projects')
  const afterIds = new Set(afterRows.map((row) => row.id))

  const expectedIds = new Set([
    ...existingRows.map((row) => row.id),
    ...fallbackProjects.map((project) => project.id),
  ])
  const missingIds = [...expectedIds].filter((id) => !afterIds.has(id))

  if (missingIds.length > 0) {
    throw new Error(`Migration verification failed: missing project IDs in SQLite: ${missingIds.join(', ')}`)
  }

  console.info(
    `[migration] completed: importedProjects=${importedProjects}, importedSchedules=${importedSchedules}, localStorageUntouched=true`,
  )
}

export const listProjects = async (): Promise<Project[]> => {
  try {
    const rows = await tauriInvoke<ProjectRow[]>('list_projects')
    return rows.map(toProject)
  } catch (error) {
    if (shouldThrowForDatabaseError()) {
      throw error
    }

    console.warn(`[projects] list_projects fell back to localStorage: ${formatError(error)}`)
    return loadFallbackProjects()
  }
}

export const createProject = async (name: string, description?: string): Promise<Project> => {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Project name is required')
  }

  try {
    const row = await tauriInvoke<ProjectRow>('create_project', {
      name: trimmedName,
      description: description ?? '',
    })
    return toProject(row)
  } catch (error) {
    if (shouldThrowForDatabaseError()) {
      throw error
    }

    const now = new Date().toISOString()
    const next: Project = {
      id: crypto.randomUUID(),
      name: trimmedName,
      description: (description ?? '').trim(),
      createdAt: now,
      updatedAt: now,
    }

    const current = loadFallbackProjects()
    saveFallbackProjects([next, ...current])
    return next
  }
}

export const updateProject = async (
  projectId: string,
  name: string,
  description?: string,
): Promise<Project> => {
  const trimmedId = projectId.trim()
  const trimmedName = name.trim()
  if (!trimmedId) {
    throw new Error('Project ID is required')
  }
  if (!trimmedName) {
    throw new Error('Project name is required')
  }

  try {
    const row = await tauriInvoke<ProjectRow>('update_project', {
      projectId: trimmedId,
      name: trimmedName,
      description: description ?? '',
    })

    return toProject(row)
  } catch (error) {
    if (shouldThrowForDatabaseError()) {
      throw error
    }

    const current = loadFallbackProjects()
    const idx = current.findIndex((project) => project.id === trimmedId)
    if (idx < 0) {
      throw new Error('Project not found')
    }

    const updated: Project = {
      ...current[idx],
      name: trimmedName,
      description: (description ?? '').trim(),
      updatedAt: new Date().toISOString(),
    }

    const next = [...current]
    next[idx] = updated
    saveFallbackProjects(next)
    return updated
  }
}

export const deleteProject = async (projectId: string): Promise<void> => {
  const trimmedId = projectId.trim()
  if (!trimmedId) {
    throw new Error('Project ID is required')
  }

  try {
    await tauriInvoke('delete_project', { projectId: trimmedId })
  } catch (error) {
    if (shouldThrowForDatabaseError()) {
      throw error
    }

    const current = loadFallbackProjects()
    const next = current.filter((project) => project.id !== trimmedId)
    saveFallbackProjects(next)
  }
}

export const toProjectRow = fromProject
