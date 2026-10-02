export const STATUSES = ['backlog', 'todo', 'in-progress', 'review', 'done'] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  'in-progress': 'In progress',
  review: 'Review',
  done: 'Done',
}

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type Priority = (typeof PRIORITIES)[number]

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2, urgent: 3 }

export interface Task {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  assignee: string
  points: number
  tags: string[]
  /** Local calendar date in YYYY-MM-DD form, or an empty string when there is no due date. */
  dueDate: string
  createdAt: string
  updatedAt: string
}

export type TaskDraft = Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'assignee' | 'points' | 'tags' | 'dueDate'>
export type DraftErrors = Partial<Record<keyof TaskDraft, string>>

export const LIMITS = {
  title: 120,
  description: 2000,
  assignee: 60,
  tag: 24,
  tags: 10,
  points: 100,
  importTasks: 5000,
} as const

export const UNASSIGNED = '__unassigned__'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isStatus(value: unknown): value is Status {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
}

export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

export function toLocalISODate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function makeId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function emptyDraft(status: Status = 'todo'): TaskDraft {
  return { title: '', description: '', status, priority: 'medium', assignee: '', points: 1, tags: [], dueDate: '' }
}

export function normalizeTags(input: string | readonly string[]): string[] {
  const parts = typeof input === 'string' ? input.split(',') : input
  const seen = new Set<string>()
  for (const part of parts) {
    const tag = part.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag) seen.add(tag)
  }
  return [...seen]
}

export function validateDraft(draft: TaskDraft): DraftErrors {
  const errors: DraftErrors = {}
  const title = draft.title.trim()
  if (!title) errors.title = 'Title is required.'
  else if (title.length > LIMITS.title) errors.title = `Title must be ${LIMITS.title} characters or fewer.`
  if (draft.description.trim().length > LIMITS.description) {
    errors.description = `Description must be ${LIMITS.description} characters or fewer.`
  }
  if (!isStatus(draft.status)) errors.status = 'Choose a valid status.'
  if (!isPriority(draft.priority)) errors.priority = 'Choose a valid priority.'
  if (draft.assignee.trim().length > LIMITS.assignee) {
    errors.assignee = `Assignee must be ${LIMITS.assignee} characters or fewer.`
  }
  if (!Number.isInteger(draft.points) || draft.points < 0 || draft.points > LIMITS.points) {
    errors.points = `Story points must be a whole number from 0 to ${LIMITS.points}.`
  }
  if (draft.tags.length > LIMITS.tags) errors.tags = `Use at most ${LIMITS.tags} tags.`
  else if (draft.tags.some((tag) => tag.length > LIMITS.tag)) errors.tags = `Each tag must be ${LIMITS.tag} characters or fewer.`
  if (draft.dueDate && !isValidDateString(draft.dueDate)) errors.dueDate = 'Use a valid date (YYYY-MM-DD).'
  return errors
}

function cleanDraft(draft: TaskDraft): TaskDraft {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    status: draft.status,
    priority: draft.priority,
    assignee: draft.assignee.trim(),
    points: draft.points,
    tags: normalizeTags(draft.tags),
    dueDate: draft.dueDate,
  }
}

export function taskToDraft(task: Task): TaskDraft {
  const { title, description, status, priority, assignee, points, tags, dueDate } = task
  return { title, description, status, priority, assignee, points, tags: [...tags], dueDate }
}

export function createTask(draft: TaskDraft, now: Date = new Date(), id: string = makeId()): Task {
  const timestamp = now.toISOString()
  return { id, ...cleanDraft(draft), createdAt: timestamp, updatedAt: timestamp }
}

export function updateTask(task: Task, patch: Partial<TaskDraft>, now: Date = new Date()): Task {
  return { ...task, ...cleanDraft({ ...taskToDraft(task), ...patch }), updatedAt: now.toISOString() }
}

export function nextStatus(status: Status): Status | null {
  const index = STATUSES.indexOf(status)
  return index < STATUSES.length - 1 ? STATUSES[index + 1] : null
}

export function prevStatus(status: Status): Status | null {
  const index = STATUSES.indexOf(status)
  return index > 0 ? STATUSES[index - 1] : null
}

export function moveTask(task: Task, direction: 1 | -1, now: Date = new Date()): Task {
  const target = direction === 1 ? nextStatus(task.status) : prevStatus(task.status)
  return target ? updateTask(task, { status: target }, now) : task
}

export interface Filters {
  query: string
  status: Status | 'all'
  priority: Priority | 'all'
  assignee: string
  tag: string
  overdueOnly: boolean
}

export const DEFAULT_FILTERS: Filters = {
  query: '',
  status: 'all',
  priority: 'all',
  assignee: 'all',
  tag: 'all',
  overdueOnly: false,
}

export function hasActiveFilters(filters: Filters): boolean {
  return (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).some((key) =>
    key === 'query' ? filters.query.trim() !== '' : filters[key] !== DEFAULT_FILTERS[key],
  )
}

export function isOverdue(task: Task, today: string): boolean {
  return task.dueDate !== '' && task.status !== 'done' && task.dueDate < today
}

export function filterTasks(tasks: readonly Task[], filters: Filters, today: string): Task[] {
  const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return tasks.filter((task) => {
    if (filters.status !== 'all' && task.status !== filters.status) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    if (filters.assignee !== 'all') {
      if (filters.assignee === UNASSIGNED ? task.assignee !== '' : task.assignee !== filters.assignee) return false
    }
    if (filters.tag !== 'all' && !task.tags.includes(filters.tag)) return false
    if (filters.overdueOnly && !isOverdue(task, today)) return false
    if (terms.length) {
      const haystack = [task.title, task.description, task.assignee, ...task.tags].join(' ').toLowerCase()
      return terms.every((term) => haystack.includes(term))
    }
    return true
  })
}

export type SortKey = 'priority' | 'dueDate' | 'updated' | 'points' | 'title'

export const SORT_LABELS: Record<SortKey, string> = {
  priority: 'Priority (highest first)',
  dueDate: 'Due date (soonest first)',
  updated: 'Recently updated',
  points: 'Story points (largest first)',
  title: 'Title (A-Z)',
}

function compareDue(a: Task, b: Task): number {
  if (a.dueDate === b.dueDate) return 0
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  return a.dueDate.localeCompare(b.dueDate)
}

export function sortTasks(tasks: readonly Task[], key: SortKey): Task[] {
  const byPriority = (a: Task, b: Task) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]
  const comparators: Record<SortKey, (a: Task, b: Task) => number> = {
    priority: (a, b) => byPriority(a, b) || compareDue(a, b),
    dueDate: (a, b) => compareDue(a, b) || byPriority(a, b),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    points: (a, b) => b.points - a.points,
    title: () => 0,
  }
  const compare = comparators[key]
  return [...tasks].sort((a, b) => compare(a, b) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
}

export function uniqueAssignees(tasks: readonly Task[]): string[] {
  return [...new Set(tasks.map((t) => t.assignee).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function uniqueTags(tasks: readonly Task[]): string[] {
  return [...new Set(tasks.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b))
}

export interface AssigneeLoad {
  name: string
  open: number
  done: number
  openPoints: number
}

export interface Stats {
  total: number
  done: number
  open: number
  totalPoints: number
  donePoints: number
  /** Percentage of story points completed; falls back to task count when no task has points. */
  completionPct: number
  byStatus: Record<Status, { count: number; points: number }>
  openByPriority: Record<Priority, number>
  overdue: Task[]
  dueSoon: Task[]
  assignees: AssigneeLoad[]
}

export function computeStats(tasks: readonly Task[], today: string): Stats {
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, { count: 0, points: 0 }])) as Stats['byStatus']
  const openByPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Stats['openByPriority']
  const loads = new Map<string, AssigneeLoad>()
  const soonLimit = addDays(today, 7)
  let totalPoints = 0
  let donePoints = 0
  let done = 0
  const overdue: Task[] = []
  const dueSoon: Task[] = []

  for (const task of tasks) {
    byStatus[task.status].count += 1
    byStatus[task.status].points += task.points
    totalPoints += task.points
    const isDone = task.status === 'done'
    if (isDone) {
      done += 1
      donePoints += task.points
    } else {
      openByPriority[task.priority] += 1
      if (isOverdue(task, today)) overdue.push(task)
      else if (task.dueDate && task.dueDate <= soonLimit) dueSoon.push(task)
    }
    const name = task.assignee || 'Unassigned'
    const load = loads.get(name) ?? { name, open: 0, done: 0, openPoints: 0 }
    if (isDone) load.done += 1
    else {
      load.open += 1
      load.openPoints += task.points
    }
    loads.set(name, load)
  }

  const total = tasks.length
  const completionPct =
    totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : total > 0 ? Math.round((done / total) * 100) : 0

  return {
    total,
    done,
    open: total - done,
    totalPoints,
    donePoints,
    completionPct,
    byStatus,
    openByPriority,
    overdue: sortTasks(overdue, 'dueDate'),
    dueSoon: sortTasks(dueSoon, 'dueDate'),
    assignees: [...loads.values()].sort((a, b) => b.openPoints - a.openPoints || a.name.localeCompare(b.name)),
  }
}

export const EXPORT_FORMAT = 'sprint-studio'
export const EXPORT_VERSION = 1

export function serializeTasks(tasks: readonly Task[], now: Date = new Date()): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION, exportedAt: now.toISOString(), tasks }, null, 2)
}

export type ImportResult = { ok: true; tasks: Task[]; warnings: string[] } | { ok: false; errors: string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseTasksJson(text: string, now: Date = new Date()): ImportResult {
  if (!text.trim()) return { ok: false, errors: ['Nothing to import - the file or text is empty.'] }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { ok: false, errors: [`Invalid JSON: ${(error as Error).message}`] }
  }
  return validateTaskCollection(data, now)
}

export function validateTaskCollection(data: unknown, now: Date = new Date()): ImportResult {
  let list: unknown = data
  if (isRecord(data)) {
    if (data.format !== undefined && data.format !== EXPORT_FORMAT) {
      return { ok: false, errors: [`Unsupported format "${String(data.format)}" - expected "${EXPORT_FORMAT}".`] }
    }
    if (data.version !== undefined && data.version !== EXPORT_VERSION) {
      return { ok: false, errors: [`Unsupported version ${String(data.version)} - expected ${EXPORT_VERSION}.`] }
    }
    list = data.tasks
  }
  if (!Array.isArray(list)) {
    return { ok: false, errors: ['Expected an array of tasks or an object with a "tasks" array.'] }
  }
  if (list.length > LIMITS.importTasks) {
    return { ok: false, errors: [`Too many tasks (${list.length}); the limit is ${LIMITS.importTasks}.`] }
  }

  const errors: string[] = []
  const tasks: Task[] = []
  const ids = new Set<string>()
  const fallbackTimestamp = now.toISOString()
  let generatedIds = 0

  list.forEach((raw, index) => {
    const label = `Task ${index + 1}`
    if (!isRecord(raw)) {
      errors.push(`${label}: must be an object.`)
      return
    }
    const problems: string[] = []
    const str = (key: string, fallback = ''): string => {
      const value = raw[key]
      if (value === undefined || value === null) return fallback
      if (typeof value !== 'string') {
        problems.push(`"${key}" must be a string`)
        return fallback
      }
      return value
    }
    const timestamp = (key: string): string => {
      const value = str(key)
      if (!value) return fallbackTimestamp
      const parsed = Date.parse(value)
      if (Number.isNaN(parsed)) {
        problems.push(`"${key}" must be an ISO date-time`)
        return fallbackTimestamp
      }
      return new Date(parsed).toISOString()
    }

    const title = str('title')
    const statusValue = str('status', 'todo')
    const priorityValue = str('priority', 'medium')
    if (!isStatus(statusValue)) problems.push(`"status" must be one of ${STATUSES.join(', ')}`)
    if (!isPriority(priorityValue)) problems.push(`"priority" must be one of ${PRIORITIES.join(', ')}`)

    let points = 0
    if (raw.points !== undefined && raw.points !== null) {
      if (typeof raw.points !== 'number') problems.push('"points" must be a number')
      else points = raw.points
    }
    let tags: string[] = []
    if (raw.tags !== undefined && raw.tags !== null) {
      if (!Array.isArray(raw.tags) || raw.tags.some((tag) => typeof tag !== 'string')) {
        problems.push('"tags" must be an array of strings')
      } else tags = normalizeTags(raw.tags as string[])
    }

    const draft: TaskDraft = {
      title,
      description: str('description'),
      status: isStatus(statusValue) ? statusValue : 'todo',
      priority: isPriority(priorityValue) ? priorityValue : 'medium',
      assignee: str('assignee'),
      points,
      tags,
      dueDate: str('dueDate'),
    }
    const draftErrors = validateDraft(draft)
    delete draftErrors.status
    delete draftErrors.priority
    problems.push(...Object.values(draftErrors).map((message) => message.replace(/\.$/, '')))

    let id = str('id').trim()
    if (!id) {
      id = makeId()
      generatedIds += 1
    } else if (ids.has(id)) problems.push(`duplicate id "${id}"`)

    const createdAt = timestamp('createdAt')
    const updatedAt = timestamp('updatedAt')

    if (problems.length) {
      const name = title.trim() ? ` ("${title.trim().slice(0, 40)}")` : ''
      errors.push(`${label}${name}: ${problems.join('; ')}.`)
    } else {
      ids.add(id)
      tasks.push({ id, ...cleanDraft(draft), createdAt, updatedAt })
    }
  })

  if (errors.length) return { ok: false, errors }
  const warnings = generatedIds ? [`${generatedIds} task(s) had no id; new ids were generated.`] : []
  return { ok: true, tasks, warnings }
}

export function mergeTasks(existing: readonly Task[], incoming: readonly Task[]): { tasks: Task[]; added: number; updated: number } {
  const incomingById = new Map(incoming.map((task) => [task.id, task]))
  let updated = 0
  const merged = existing.map((task) => {
    const replacement = incomingById.get(task.id)
    if (!replacement) return task
    updated += 1
    incomingById.delete(task.id)
    return replacement
  })
  const added = [...incomingById.values()]
  return { tasks: [...merged, ...added], added: added.length, updated }
}

export function sampleTasks(now: Date = new Date()): Task[] {
  const today = toLocalISODate(now)
  const due = (days: number) => addDays(today, days)
  const drafts: TaskDraft[] = [
    { title: 'Define sprint goal with stakeholders', description: 'Agree on the single outcome this sprint should deliver and pin it to the board.', status: 'done', priority: 'high', assignee: 'Asha', points: 2, tags: ['planning'], dueDate: due(-3) },
    { title: 'Update empty-state copy', description: 'Rewrite empty states for the dashboard and inbox in the new voice guidelines.', status: 'done', priority: 'low', assignee: 'Mateo', points: 1, tags: ['content'], dueDate: due(-5) },
    { title: 'Design onboarding checklist screen', description: 'High-fidelity mockups for desktop and mobile, including progress and completion states.', status: 'review', priority: 'medium', assignee: 'Leo', points: 5, tags: ['design', 'onboarding'], dueDate: due(2) },
    { title: 'Implement checklist persistence API', description: 'Store per-user checklist progress and expose GET/PATCH endpoints.', status: 'in-progress', priority: 'high', assignee: 'Priya', points: 8, tags: ['backend', 'onboarding'], dueDate: due(4) },
    { title: 'Run usability session with five users', description: 'Moderated sessions on the new onboarding flow; capture top three issues.', status: 'in-progress', priority: 'medium', assignee: 'Mateo', points: 3, tags: ['research'], dueDate: due(1) },
    { title: 'Fix focus ring on modal buttons', description: 'Focus indicator is invisible on the primary button in dark mode.', status: 'todo', priority: 'urgent', assignee: 'Leo', points: 1, tags: ['a11y', 'bug'], dueDate: due(-1) },
    { title: 'Write release notes draft', description: 'Summarise user-facing changes for the sprint review.', status: 'todo', priority: 'low', assignee: 'Asha', points: 2, tags: ['docs'], dueDate: due(6) },
    { title: 'Add analytics events for checklist', description: 'Track step completion and drop-off for the onboarding funnel.', status: 'backlog', priority: 'medium', assignee: '', points: 3, tags: ['analytics', 'onboarding'], dueDate: '' },
    { title: 'Load test sign-up endpoint', description: 'Target 200 requests/second with p95 latency under 300ms.', status: 'backlog', priority: 'high', assignee: 'Priya', points: 5, tags: ['backend', 'performance'], dueDate: due(10) },
  ]
  return drafts.map((draft, i) => createTask(draft, new Date(now.getTime() - (drafts.length - i) * 3600000), `sample-${i + 1}`))
}