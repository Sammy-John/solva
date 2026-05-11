import { Dependency, Section, Task } from '@/types/scheduling'

type TemplateTask = {
  id: string
  name: string
  taskType: Task['taskType']
  sectionId: string
  duration: number
  comments?: string[]
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
const BUILT_IN_STARTER_TEMPLATE_ID = 'builtin-construction-starter'

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

export const getStarterTemplateSeed = (): ScheduleTemplateSeed => {
  const sections: Section[] = [
    { id: 'starter-prelim', name: 'Preliminaries', order: 0 },
    { id: 'starter-slab', name: 'Slab', order: 1 },
    { id: 'starter-frame', name: 'Frame', order: 2 },
    { id: 'starter-roof', name: 'Roof', order: 3 },
    { id: 'starter-services', name: 'Services', order: 4 },
    { id: 'starter-linings', name: 'Linings', order: 5 },
    { id: 'starter-fitoff', name: 'Fitoff', order: 6 },
    { id: 'starter-inspections', name: 'Inspections', order: 7 },
    { id: 'starter-handover', name: 'Handover', order: 8 },
  ]

  const tasks: TemplateTask[] = [
    { id: 'starter-site-setup', sectionId: 'starter-prelim', name: 'Site setup and temporary services', taskType: 'Internal', duration: 2, comments: ['Confirm access, fencing, toilet, power, and water before trades start.'] },
    { id: 'starter-order-concrete', sectionId: 'starter-slab', name: 'Order concrete and reinforcing', taskType: 'Ordering', duration: 1, comments: ['Confirm supplier lead time and delivery window.'] },
    { id: 'starter-deliver-concrete', sectionId: 'starter-slab', name: 'Concrete and reinforcing delivery', taskType: 'Delivery', duration: 1 },
    { id: 'starter-pour-slab', sectionId: 'starter-slab', name: 'Pour slab', taskType: 'Internal', duration: 2 },
    { id: 'starter-slab-inspection', sectionId: 'starter-inspections', name: 'Slab inspection', taskType: 'Inspection', duration: 0 },
    { id: 'starter-order-frame', sectionId: 'starter-frame', name: 'Order framing timber', taskType: 'Ordering', duration: 1 },
    { id: 'starter-frame-delivery', sectionId: 'starter-frame', name: 'Framing delivery', taskType: 'Delivery', duration: 1 },
    { id: 'starter-frame-up', sectionId: 'starter-frame', name: 'Stand frame', taskType: 'Internal', duration: 5 },
    { id: 'starter-frame-inspection', sectionId: 'starter-inspections', name: 'Frame inspection', taskType: 'Inspection', duration: 0 },
    { id: 'starter-roof-order', sectionId: 'starter-roof', name: 'Order roofing', taskType: 'Ordering', duration: 1 },
    { id: 'starter-roof-delivery', sectionId: 'starter-roof', name: 'Roofing delivery', taskType: 'Delivery', duration: 1 },
    { id: 'starter-roof-install', sectionId: 'starter-roof', name: 'Install roof', taskType: 'Internal', duration: 4 },
    { id: 'starter-rough-in', sectionId: 'starter-services', name: 'Services rough-in', taskType: 'Internal', duration: 5 },
    { id: 'starter-linings', sectionId: 'starter-linings', name: 'Install wall and ceiling linings', taskType: 'Internal', duration: 5 },
    { id: 'starter-fitoff', sectionId: 'starter-fitoff', name: 'Fitoff and fixtures', taskType: 'Internal', duration: 5 },
    { id: 'starter-final-inspection', sectionId: 'starter-inspections', name: 'Final inspection', taskType: 'Inspection', duration: 0 },
    { id: 'starter-handover', sectionId: 'starter-handover', name: 'Client handover', taskType: 'Internal', duration: 1 },
  ]

  const link = (predecessorId: string, successorId: string, index: number): TemplateDependency => ({
    id: `starter-link-${index}`,
    predecessorId,
    successorId,
    lagDays: 0,
    autoShift: true,
    notes: '',
  })

  const dependencies: TemplateDependency[] = [
    link('starter-site-setup', 'starter-order-concrete', 1),
    link('starter-order-concrete', 'starter-deliver-concrete', 2),
    link('starter-deliver-concrete', 'starter-pour-slab', 3),
    link('starter-pour-slab', 'starter-slab-inspection', 4),
    link('starter-slab-inspection', 'starter-order-frame', 5),
    link('starter-order-frame', 'starter-frame-delivery', 6),
    link('starter-frame-delivery', 'starter-frame-up', 7),
    link('starter-frame-up', 'starter-frame-inspection', 8),
    link('starter-frame-inspection', 'starter-roof-order', 9),
    link('starter-roof-order', 'starter-roof-delivery', 10),
    link('starter-roof-delivery', 'starter-roof-install', 11),
    link('starter-roof-install', 'starter-rough-in', 12),
    link('starter-rough-in', 'starter-linings', 13),
    link('starter-linings', 'starter-fitoff', 14),
    link('starter-fitoff', 'starter-final-inspection', 15),
    link('starter-final-inspection', 'starter-handover', 16),
  ]

  return { sections, tasks, dependencies }
}

const getStarterTemplate = (): ScheduleTemplate => ({
  id: BUILT_IN_STARTER_TEMPLATE_ID,
  name: 'Construction Starter Schedule',
  description: 'A starter residential build sequence with procurement, delivery, internal work, inspections, and handover.',
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
  seed: getStarterTemplateSeed(),
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
        comments: task.comments ?? [],
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
  const hasStarter = templates.some((template) => template.id === BUILT_IN_STARTER_TEMPLATE_ID)
  const allTemplates = hasStarter ? templates : [getStarterTemplate(), ...templates]
  return allTemplates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
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
