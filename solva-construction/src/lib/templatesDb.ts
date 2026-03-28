import { Dependency, Section, Task } from '@/types/scheduling'

type TemplateTask = {
  id: string
  name: string
  taskType: Task['taskType']
  sectionId: string
  duration: number
}

type TemplateDependency = {
  id: string
  predecessorId: string
  successorId: string
  lagDays: number
  autoShift: boolean
  notes: string
}

export type ScheduleTemplateSeed = {
  sections: Section[]
  tasks: TemplateTask[]
  dependencies: TemplateDependency[]
}

export type ScheduleTemplate = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  seed: ScheduleTemplateSeed
}

const TEMPLATES_KEY = 'construction-planner-desktop.templates.v1'

const readTemplates = (): ScheduleTemplate[] => {
  const raw = localStorage.getItem(TEMPLATES_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as ScheduleTemplate[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeTemplates = (templates: ScheduleTemplate[]): void => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
}

const clampLagDays = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export const getBlankTemplateSeed = (): ScheduleTemplateSeed => ({
  sections: [],
  tasks: [],
  dependencies: [],
})

export const toTemplateSeedFromSchedule = (
  sections: Section[],
  tasks: Task[],
  dependencies: Dependency[],
): ScheduleTemplateSeed => {
  const normalizedSections = [...sections]
    .map((section, index) => ({
      id: section.id,
      name: section.name,
      order: Number.isFinite(section.order) ? section.order : index,
    }))
    .sort((a, b) => a.order - b.order)

  const sectionIds = new Set(normalizedSections.map((section) => section.id))

  const normalizedTasks: TemplateTask[] = tasks
    .filter((task) => sectionIds.has(task.sectionId))
    .map((task) => ({
      id: task.id,
      name: task.name,
      taskType: task.taskType,
      sectionId: task.sectionId,
      duration: Math.max(0, Math.floor(task.duration || 0)),
    }))

  const taskIds = new Set(normalizedTasks.map((task) => task.id))

  const normalizedDependencies: TemplateDependency[] = dependencies
    .filter(
      (dep) => taskIds.has(dep.predecessorId) && taskIds.has(dep.successorId),
    )
    .map((dep) => ({
      id: dep.id,
      predecessorId: dep.predecessorId,
      successorId: dep.successorId,
      lagDays: clampLagDays(dep.lagDays),
      autoShift: dep.autoShift,
      notes: dep.notes ?? '',
    }))

  return {
    sections: normalizedSections,
    tasks: normalizedTasks,
    dependencies: normalizedDependencies,
  }
}

export const instantiateTemplateSeed = (
  seed: ScheduleTemplateSeed,
): { sections: Section[]; tasks: Task[]; dependencies: Dependency[] } => {
  const sectionIdMap = new Map<string, string>()
  const taskIdMap = new Map<string, string>()

  const sections: Section[] = seed.sections
    .map((section, index) => {
      const nextId = `sec-${crypto.randomUUID()}`
      sectionIdMap.set(section.id, nextId)
      return {
        id: nextId,
        name: section.name,
        order: Number.isFinite(section.order) ? section.order : index,
      }
    })
    .sort((a, b) => a.order - b.order)

  const tasks: Task[] = seed.tasks
    .filter((task) => sectionIdMap.has(task.sectionId))
    .map((task) => {
      const nextId = `t-${crypto.randomUUID()}`
      taskIdMap.set(task.id, nextId)

      const taskType = task.taskType
      const userGroup: Task['userGroup'] =
        taskType === 'Delivery' || taskType === 'Ordering' ? 'Suppliers' : 'Internal'

      return {
        id: nextId,
        name: task.name,
        taskType,
        sectionId: sectionIdMap.get(task.sectionId)!,
        startDate: '',
        endDate: '',
        duration: Math.max(0, Math.floor(task.duration || 0)),
        assignedTo: [],
        userGroup,
        status: 'Planned',
        comments: [],
      }
    })

  const dependencies: Dependency[] = seed.dependencies
    .map((dep) => {
      const predecessorId = taskIdMap.get(dep.predecessorId)
      const successorId = taskIdMap.get(dep.successorId)
      if (!predecessorId || !successorId) return null

      return {
        id: `d-${crypto.randomUUID()}`,
        predecessorId,
        successorId,
        lagDays: clampLagDays(dep.lagDays),
        autoShift: dep.autoShift,
        notes: dep.notes ?? '',
      }
    })
    .filter((value): value is Dependency => value !== null)

  return { sections, tasks, dependencies }
}

export const listTemplates = async (): Promise<ScheduleTemplate[]> => {
  const templates = readTemplates()
  return templates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const createTemplate = async (
  name: string,
  description: string,
  seed: ScheduleTemplateSeed,
): Promise<ScheduleTemplate> => {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Template name is required')
  }

  const now = new Date().toISOString()
  const template: ScheduleTemplate = {
    id: `tpl-${crypto.randomUUID()}`,
    name: trimmedName,
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
    seed,
  }

  const current = readTemplates()
  writeTemplates([template, ...current])
  return template
}

export const deleteTemplate = async (templateId: string): Promise<void> => {
  const trimmedId = templateId.trim()
  if (!trimmedId) {
    throw new Error('Template ID is required')
  }

  const current = readTemplates()
  writeTemplates(current.filter((template) => template.id !== trimmedId))
}
