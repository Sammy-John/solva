import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import WorkspacePage from '@/pages/Index'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  createProject,
  deleteProject,
  initDatabase,
  listProjects,
  migrateLocalStorageToSqlite,
  openDataFolder,
  prepareForUpdateInstall,
  updateProject,
} from '@/lib/projectsDb'
import type { Project } from '@/lib/projectsDb'
import { loadProjectSchedule, saveProjectSchedule } from '@/lib/scheduleDb'
import {
  createTemplate,
  deleteTemplate,
  getBlankTemplateSeed,
  instantiateTemplateSeed,
  listTemplates,
  toTemplateSeedFromSchedule,
  type ScheduleTemplate,
  type ScheduleTemplateSeed,
} from '@/lib/templatesDb'
import { getStorageStatus, type StorageStatus } from '@/lib/storageRuntime'
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  getCurrentAppVersion,
  type AppUpdateCheckResult,
  type UpdateInstallResult,
} from '@/lib/updater'
import './App.css'

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

type NewProjectSourceType = 'blank' | 'template' | 'saved-project'
type NewTemplateSourceType = 'blank' | 'saved-project'

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(getStorageStatus())
  const [storageError, setStorageError] = useState<string | null>(null)
  const [openFolderError, setOpenFolderError] = useState<string | null>(null)
  const [appVersion, setAppVersion] = useState<string>('unknown')
  const [updateCheck, setUpdateCheck] = useState<AppUpdateCheckResult | null>(null)
  const [updateInstall, setUpdateInstall] = useState<UpdateInstallResult | null>(null)
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false)
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false)
  const [backupBeforeInstall, setBackupBeforeInstall] = useState(true)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [createSourceType, setCreateSourceType] = useState<NewProjectSourceType>('blank')
  const [createFromTemplateId, setCreateFromTemplateId] = useState('')
  const [createFromProjectId, setCreateFromProjectId] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateSourceType, setTemplateSourceType] = useState<NewTemplateSourceType>('blank')
  const [templateFromProjectId, setTemplateFromProjectId] = useState('')
  const [templateSubmitAttempted, setTemplateSubmitAttempted] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectDescription, setEditProjectDescription] = useState('')
  const [editSubmitAttempted, setEditSubmitAttempted] = useState(false)

  const [projectsLoading, setProjectsLoading] = useState(true)

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [projects],
  )

  useEffect(() => {
    const load = async () => {
      try {
        const resolvedStorageStatus = await initDatabase()
        setStorageStatus(resolvedStorageStatus)
        console.info('Resolved SQLite DB path:', resolvedStorageStatus.dbPath)

        try {
          await migrateLocalStorageToSqlite()
        } catch (error) {
          console.error('LocalStorage to SQLite migration failed:', error)
        }

        const [dbProjects, savedTemplates] = await Promise.all([
          listProjects(),
          listTemplates(),
        ])

        setProjects(dbProjects)
        setTemplates(savedTemplates)
        setStorageError(null)
      } catch (error) {
        const message = formatError(error)
        setStorageStatus(getStorageStatus())
        setStorageError(message)
        console.error('Failed to load projects from SQLite:', error)
      } finally {
        setProjectsLoading(false)
      }
    }

    void load()
  }, [])

  useEffect(() => {
    const loadVersion = async () => {
      const version = await getCurrentAppVersion()
      setAppVersion(version)
    }

    void loadVersion()
  }, [])

  const closeCreateModal = () => {
    setIsCreateOpen(false)
    setProjectName('')
    setProjectDescription('')
    setCreateSourceType('blank')
    setCreateFromTemplateId('')
    setCreateFromProjectId('')
    setSubmitAttempted(false)
  }

  const closeCreateTemplateModal = () => {
    setIsCreateTemplateOpen(false)
    setTemplateName('')
    setTemplateDescription('')
    setTemplateSourceType('blank')
    setTemplateFromProjectId('')
    setTemplateSubmitAttempted(false)
  }

  const closeEditModal = () => {
    setIsEditOpen(false)
    setEditingProjectId(null)
    setEditProjectName('')
    setEditProjectDescription('')
    setEditSubmitAttempted(false)
  }

  const openEditModal = (project: Project) => {
    setEditingProjectId(project.id)
    setEditProjectName(project.name)
    setEditProjectDescription(project.description)
    setEditSubmitAttempted(false)
    setIsEditOpen(true)
  }

  const openProjectFromTemplate = (template: ScheduleTemplate) => {
    setIsCreateOpen(true)
    setProjectName(`${template.name} Project`)
    setProjectDescription(template.description)
    setCreateSourceType('template')
    setCreateFromTemplateId(template.id)
    setCreateFromProjectId('')
    setSubmitAttempted(false)
  }

  const handleOpenDataFolder = async () => {
    try {
      await openDataFolder()
      setOpenFolderError(null)
    } catch (error) {
      const message = formatError(error)
      setOpenFolderError(message)
      console.error('Failed to open data folder:', error)
    }
  }

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true)
    setUpdateInstall(null)

    try {
      const result = await checkForAppUpdate()
      setUpdateCheck(result)
    } finally {
      setIsCheckingUpdates(false)
    }
  }

  const handleInstallUpdate = async () => {
    if (!updateCheck || updateCheck.status !== 'update-available') {
      return
    }

    setIsInstallingUpdate(true)

    try {
      const preflight = await prepareForUpdateInstall({
        requireBackup: backupBeforeInstall,
      })

      if (!preflight.ok) {
        setUpdateInstall({
          status: 'error',
          code: 'unknown',
          message: (preflight as { message?: string }).message ?? 'Update blocked by storage safety checks.',
        })
        return
      }

      if (preflight.backupPath) {
        console.info(
          `[update] pre-install checks passed: projects=${preflight.projectCount}, backup=${preflight.backupPath}`,
        )
      }

      const result = await downloadAndInstallUpdate(updateCheck.update)
      setUpdateInstall(result)
    } finally {
      setIsInstallingUpdate(false)
    }
  }

  const resolveProjectSeed = async (): Promise<ScheduleTemplateSeed> => {
    if (createSourceType === 'blank') {
      return getBlankTemplateSeed()
    }

    if (createSourceType === 'template') {
      const template = templates.find((item) => item.id === createFromTemplateId)
      if (!template) {
        throw new Error('Please choose a template.')
      }
      return template.seed
    }

    const sourceProject = sortedProjects.find((item) => item.id === createFromProjectId)
    if (!sourceProject) {
      throw new Error('Please choose a saved project to import from.')
    }

    const sourceSchedule = await loadProjectSchedule(sourceProject.id)
    return toTemplateSeedFromSchedule(
      sourceSchedule.sections,
      sourceSchedule.tasks,
      sourceSchedule.dependencies,
    )
  }

  const handleCreateProject = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitAttempted(true)

    const name = projectName.trim()
    if (!name) {
      return
    }

    if (createSourceType === 'template' && !createFromTemplateId) {
      return
    }

    if (createSourceType === 'saved-project' && !createFromProjectId) {
      return
    }

    try {
      const nextProject = await createProject(name, projectDescription.trim())

      const seed = await resolveProjectSeed()
      const schedule = instantiateTemplateSeed(seed)

      await saveProjectSchedule(
        nextProject.id,
        schedule.tasks,
        schedule.sections,
        schedule.dependencies,
        [],
      )

      setProjects((current) => [nextProject, ...current])
      setActiveProjectId(nextProject.id)
      closeCreateModal()
    } catch (error) {
      setStorageError(formatError(error))
      console.error('Failed to create project in SQLite:', error)
    }
  }

  const handleCreateTemplate = async (event: FormEvent) => {
    event.preventDefault()
    setTemplateSubmitAttempted(true)

    const name = templateName.trim()
    if (!name) {
      return
    }

    if (templateSourceType === 'saved-project' && !templateFromProjectId) {
      return
    }

    try {
      let seed = getBlankTemplateSeed()

      if (templateSourceType === 'saved-project') {
        const sourceSchedule = await loadProjectSchedule(templateFromProjectId)
        seed = toTemplateSeedFromSchedule(
          sourceSchedule.sections,
          sourceSchedule.tasks,
          sourceSchedule.dependencies,
        )
      }

      const template = await createTemplate(name, templateDescription.trim(), seed)
      setTemplates((current) => [template, ...current])
      closeCreateTemplateModal()
    } catch (error) {
      setStorageError(formatError(error))
      console.error('Failed to create template:', error)
    }
  }

  const handleDeleteTemplate = async (template: ScheduleTemplate) => {
    const shouldDelete = window.confirm(`Delete template "${template.name}"?`)
    if (!shouldDelete) {
      return
    }

    try {
      await deleteTemplate(template.id)
      setTemplates((current) => current.filter((item) => item.id !== template.id))
    } catch (error) {
      setStorageError(formatError(error))
      console.error('Failed to delete template:', error)
    }
  }

  const handleEditProject = async (event: FormEvent) => {
    event.preventDefault()
    setEditSubmitAttempted(true)

    const projectId = editingProjectId?.trim() ?? ''
    const name = editProjectName.trim()
    if (!projectId || !name) {
      return
    }

    try {
      const updated = await updateProject(projectId, name, editProjectDescription.trim())
      setProjects((current) =>
        current.map((project) => (project.id === updated.id ? updated : project)),
      )
      closeEditModal()
    } catch (error) {
      setStorageError(formatError(error))
      console.error('Failed to update project in SQLite:', error)
    }
  }

  const handleDeleteProject = async (project: Project) => {
    const shouldDelete = window.confirm(`Delete project "${project.name}"? This cannot be undone.`)
    if (!shouldDelete) {
      return
    }

    try {
      await deleteProject(project.id)
      setProjects((current) => current.filter((p) => p.id !== project.id))
      if (activeProjectId === project.id) {
        setActiveProjectId(null)
      }
    } catch (error) {
      setStorageError(formatError(error))
      console.error('Failed to delete project from SQLite:', error)
    }
  }

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const canOpenDataFolder = storageStatus.runtime === 'tauri'
  const canInstallUpdate = updateCheck?.status === 'update-available' && !isInstallingUpdate

  const storagePanel = (
    <aside className="storage-panel" aria-label="Storage diagnostics">
      <div className="storage-panel-row">
        <span className={`storage-mode storage-mode-${storageStatus.storageMode}`}>
          {storageStatus.storageMode}
        </span>
        <span className="storage-runtime">
          {storageStatus.runtime} {storageStatus.isPackaged ? 'installed' : 'dev'}
        </span>
      </div>
      <p className="storage-panel-label">Current App Version</p>
      <p className="storage-panel-value" title={appVersion}>{appVersion}</p>
      <p className="storage-panel-label">Current Database Path</p>
      <p className="storage-panel-value" title={storageStatus.dbPath || 'Not available'}>
        {storageStatus.dbPath || 'Not available'}
      </p>
      <p className="storage-panel-label">Data Folder</p>
      <p className="storage-panel-value" title={storageStatus.dataDir || 'Not available'}>
        {storageStatus.dataDir || 'Not available'}
      </p>
      <p className="storage-panel-hint">{storageStatus.message}</p>

      {updateCheck ? (
        <p className={`storage-update-status storage-update-status-${updateCheck.status}`}>
          {updateCheck.message}
          {updateCheck.status === 'update-available' ? ` (${updateCheck.currentVersion} -> ${updateCheck.latestVersion})` : ''}
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
          onClick={handleCheckForUpdates}
          disabled={isCheckingUpdates || isInstallingUpdate}
        >
          {isCheckingUpdates ? 'Checking...' : 'Check for Updates'}
        </button>

        {canInstallUpdate ? (
          <button
            type="button"
            className="secondary-button storage-panel-button"
            onClick={handleInstallUpdate}
            disabled={!canInstallUpdate}
          >
            {isInstallingUpdate ? 'Installing...' : 'Install Update'}
          </button>
        ) : null}
      </div>

      {canOpenDataFolder ? (
        <button type="button" className="secondary-button storage-panel-button" onClick={handleOpenDataFolder}>
          Open Data Folder
        </button>
      ) : null}
      {openFolderError ? <p className="inline-error">{openFolderError}</p> : null}
    </aside>
  )
  if (activeProjectId) {
    return (
      <TooltipProvider>
        <WorkspacePage
          onBackToDashboard={() => setActiveProjectId(null)}
          projectId={activeProjectId}
          projectName={activeProject?.name ?? 'Project Details'}
          projectDescription={activeProject?.description ?? ''}
        />
      </TooltipProvider>
    )
  }

  return (
    <main className="dashboard-shell">
      {storagePanel}
      <header className="dashboard-header">
        <div>
          <h1>Construction Planner Desktop</h1>
          <p>
            Start a new project or open an existing one to continue planning your schedule.
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button type="button" className="secondary-button" onClick={() => setIsCreateTemplateOpen(true)}>
            New Template
          </button>
          <button type="button" className="primary-button" onClick={() => setIsCreateOpen(true)}>
            New Project
          </button>
        </div>
      </header>

      {storageError ? (
        <section className="status-alert status-alert-error">
          <strong>Storage Error</strong>
          <p>{storageError}</p>
        </section>
      ) : null}

      <section className="projects-panel">
        <div className="projects-panel-header">
          <h2>Projects</h2>
        </div>
        {projectsLoading ? (
          <div className="empty-state">
            <p>Loading projects...</p>
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="empty-state">
            <p>No projects yet. Create your first project to get started.</p>
          </div>
        ) : (
          <ul className="project-list">
            {sortedProjects.map((project) => (
              <li key={project.id} className="project-row">
                <div>
                  <h3>{project.name}</h3>
                  {project.description ? <p>{project.description}</p> : null}
                </div>
                <div className="project-row-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveProjectId(project.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openEditModal(project)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDeleteProject(project)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="projects-panel templates-panel">
        <div className="projects-panel-header templates-panel-header">
          <h2>Templates</h2>
          <button type="button" className="secondary-button" onClick={() => setIsCreateTemplateOpen(true)}>
            Create Template
          </button>
        </div>
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>No templates yet. Create one from blank or from a saved project.</p>
          </div>
        ) : (
          <ul className="project-list">
            {templates.map((template) => (
              <li key={template.id} className="project-row">
                <div>
                  <h3>{template.name}</h3>
                  {template.description ? <p>{template.description}</p> : null}
                  <p className="template-meta">
                    {template.seed.sections.length} sections · {template.seed.tasks.length} tasks · {template.seed.dependencies.length} links
                  </p>
                </div>
                <div className="project-row-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openProjectFromTemplate(template)}
                  >
                    Use for New Project
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => handleDeleteTemplate(template)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isCreateOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeCreateModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Create project"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>New Project</h2>
            <form onSubmit={handleCreateProject} className="modal-form">
              <label htmlFor="project-name">
                Project Name
                <input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  autoFocus
                  required
                />
              </label>
              {submitAttempted && !projectName.trim() ? (
                <p className="field-error">Project name is required.</p>
              ) : null}

              <label htmlFor="project-description">
                Description
                <textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  rows={3}
                />
              </label>

              <label htmlFor="project-source-type">
                Start From
                <select
                  id="project-source-type"
                  value={createSourceType}
                  onChange={(event) => setCreateSourceType(event.target.value as NewProjectSourceType)}
                >
                  <option value="blank">Blank Project</option>
                  <option value="template">Saved Template</option>
                  <option value="saved-project">Import Structure from Saved Project</option>
                </select>
              </label>

              {createSourceType === 'template' ? (
                <>
                  <label htmlFor="create-from-template">
                    Template
                    <select
                      id="create-from-template"
                      value={createFromTemplateId}
                      onChange={(event) => setCreateFromTemplateId(event.target.value)}
                      required
                    >
                      <option value="">Select a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {submitAttempted && !createFromTemplateId ? (
                    <p className="field-error">Please choose a template.</p>
                  ) : null}
                </>
              ) : null}

              {createSourceType === 'saved-project' ? (
                <>
                  <label htmlFor="create-from-project">
                    Saved Project
                    <select
                      id="create-from-project"
                      value={createFromProjectId}
                      onChange={(event) => setCreateFromProjectId(event.target.value)}
                      required
                    >
                      <option value="">Select a saved project</option>
                      {sortedProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="field-help">
                    Imports sections, task names, type, days (duration), and dependency chain links only.
                  </p>
                  {submitAttempted && !createFromProjectId ? (
                    <p className="field-error">Please choose a saved project.</p>
                  ) : null}
                </>
              ) : null}

              <div className="modal-actions">
                <button type="submit" className="primary-button">
                  Create Project
                </button>
                <button type="button" className="secondary-button" onClick={closeCreateModal}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isCreateTemplateOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeCreateTemplateModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Create template"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>New Template</h2>
            <form onSubmit={handleCreateTemplate} className="modal-form">
              <label htmlFor="template-name">
                Template Name
                <input
                  id="template-name"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  autoFocus
                  required
                />
              </label>
              {templateSubmitAttempted && !templateName.trim() ? (
                <p className="field-error">Template name is required.</p>
              ) : null}

              <label htmlFor="template-description">
                Description
                <textarea
                  id="template-description"
                  value={templateDescription}
                  onChange={(event) => setTemplateDescription(event.target.value)}
                  rows={3}
                />
              </label>

              <label htmlFor="template-source-type">
                Create From
                <select
                  id="template-source-type"
                  value={templateSourceType}
                  onChange={(event) => setTemplateSourceType(event.target.value as NewTemplateSourceType)}
                >
                  <option value="blank">Blank Template</option>
                  <option value="saved-project">Saved Project</option>
                </select>
              </label>

              {templateSourceType === 'saved-project' ? (
                <>
                  <label htmlFor="template-from-project">
                    Saved Project
                    <select
                      id="template-from-project"
                      value={templateFromProjectId}
                      onChange={(event) => setTemplateFromProjectId(event.target.value)}
                      required
                    >
                      <option value="">Select a saved project</option>
                      {sortedProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="field-help">
                    Saves only sections, task names, type, days (duration), and dependency chain links.
                  </p>
                  {templateSubmitAttempted && !templateFromProjectId ? (
                    <p className="field-error">Please choose a saved project.</p>
                  ) : null}
                </>
              ) : null}

              <div className="modal-actions">
                <button type="submit" className="primary-button">
                  Create Template
                </button>
                <button type="button" className="secondary-button" onClick={closeCreateTemplateModal}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isEditOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeEditModal}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label="Edit project"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Edit Project</h2>
            <form onSubmit={handleEditProject} className="modal-form">
              <label htmlFor="edit-project-name">
                Project Name
                <input
                  id="edit-project-name"
                  value={editProjectName}
                  onChange={(event) => setEditProjectName(event.target.value)}
                  autoFocus
                  required
                />
              </label>
              {editSubmitAttempted && !editProjectName.trim() ? (
                <p className="field-error">Project name is required.</p>
              ) : null}
              <label htmlFor="edit-project-description">
                Description
                <textarea
                  id="edit-project-description"
                  value={editProjectDescription}
                  onChange={(event) => setEditProjectDescription(event.target.value)}
                  rows={4}
                />
              </label>
              <div className="modal-actions">
                <button type="submit" className="primary-button">
                  Save Changes
                </button>
                <button type="button" className="secondary-button" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App






