import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FILTERS,
  addDays,
  computeStats,
  createTask,
  emptyDraft,
  filterTasks,
  hasActiveFilters,
  isOverdue,
  isValidDateString,
  mergeTasks,
  moveTask,
  normalizeTags,
  parseTasksJson,
  sampleTasks,
  serializeTasks,
  sortTasks,
  UNASSIGNED,
  updateTask,
  validateDraft,
  type Task,
  type TaskDraft,
} from './tasks'

const NOW = new Date('2026-03-10T09:00:00.000Z')
const TODAY = '2026-03-10'

function make(overrides: Partial<TaskDraft> & { id?: string } = {}): Task {
  const { id = Math.random().toString(36).slice(2), ...draft } = overrides
  return createTask({ ...emptyDraft(), title: 'Task', ...draft }, NOW, id)
}

describe('validation', () => {
  it('requires a title and accepts a valid draft', () => {
    expect(validateDraft({ ...emptyDraft(), title: '   ' }).title).toMatch(/required/)
    expect(validateDraft({ ...emptyDraft(), title: 'Ship it' })).toEqual({})
  })

  it('rejects out-of-range or fractional points, bad dates and too many tags', () => {
    const errors = validateDraft({
      ...emptyDraft(),
      title: 'x',
      points: 2.5,
      dueDate: '2026-02-30',
      tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
    })
    expect(errors.points).toBeDefined()
    expect(errors.dueDate).toBeDefined()
    expect(errors.tags).toBeDefined()
    expect(validateDraft({ ...emptyDraft(), title: 'x', points: 101 }).points).toBeDefined()
    expect(validateDraft({ ...emptyDraft(), title: 'x'.repeat(121) }).title).toBeDefined()
  })

  it('checks real calendar dates', () => {
    expect(isValidDateString('2024-02-29')).toBe(true)
    expect(isValidDateString('2025-02-29')).toBe(false)
    expect(isValidDateString('2025-1-01')).toBe(false)
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('normalises tags (trim, lowercase, hyphenate, dedupe)', () => {
    expect(normalizeTags(' Bug, a11y ,bug,,Front End ')).toEqual(['bug', 'a11y', 'front-end'])
  })
})

describe('CRUD and workflow', () => {
  it('creates trimmed tasks with timestamps', () => {
    const task = createTask({ ...emptyDraft(), title: '  Hello  ', assignee: ' Ana ', tags: ['X'] }, NOW, 'id-1')
    expect(task).toMatchObject({ id: 'id-1', title: 'Hello', assignee: 'Ana', tags: ['x'], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() })
  })

  it('updates fields and bumps updatedAt only', () => {
    const task = make({ id: 'a' })
    const later = new Date('2026-03-11T00:00:00.000Z')
    const updated = updateTask(task, { title: 'Renamed', points: 8 }, later)
    expect(updated).toMatchObject({ id: 'a', title: 'Renamed', points: 8, createdAt: task.createdAt, updatedAt: later.toISOString() })
  })

  it('moves through the workflow and clamps at the ends', () => {
    const backlog = make({ status: 'backlog' })
    expect(moveTask(backlog, -1)).toBe(backlog)
    const todo = moveTask(backlog, 1)
    expect(todo.status).toBe('todo')
    expect(moveTask(moveTask(moveTask(todo, 1), 1), 1).status).toBe('done')
    const done = make({ status: 'done' })
    expect(moveTask(done, 1)).toBe(done)
    expect(moveTask(done, -1).status).toBe('review')
  })
})

describe('filtering and sorting', () => {
  const tasks = [
    make({ id: '1', title: 'Login page', description: 'OAuth flow', priority: 'high', assignee: 'Ana', tags: ['auth'], dueDate: '2026-03-01' }),
    make({ id: '2', title: 'Docs', priority: 'low', assignee: '', status: 'done', dueDate: '2026-03-01' }),
    make({ id: '3', title: 'Logout', priority: 'urgent', assignee: 'Bo', tags: ['auth'], dueDate: '2026-03-20' }),
    make({ id: '4', title: 'Metrics', priority: 'high', assignee: 'Ana' }),
  ]

  it('treats only open past-due tasks as overdue', () => {
    expect(isOverdue(tasks[0], TODAY)).toBe(true)
    expect(isOverdue(tasks[1], TODAY)).toBe(false)
    expect(isOverdue(tasks[2], TODAY)).toBe(false)
  })

  it('matches every search term across fields', () => {
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, query: 'oauth login' }, TODAY).map((t) => t.id)).toEqual(['1'])
    expect(filterTasks(tasks, { ...DEFAULT_FILTERS, query: 'AUTH' }, TODAY).map((t) => t.id)).toEqual(['1', '3'])
  })

  it('combines structured filters', () => {
    const ids = (f: Partial<typeof DEFAULT_FILTERS>) => filterTasks(tasks, { ...DEFAULT_FILTERS, ...f }, TODAY).map((t) => t.id)
    expect(ids({ assignee: 'Ana', priority: 'high' })).toEqual(['1', '4'])
    expect(ids({ assignee: UNASSIGNED })).toEqual(['2'])
    expect(ids({ tag: 'auth', overdueOnly: true })).toEqual(['1'])
    expect(ids({ status: 'done' })).toEqual(['2'])
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: ' x ' })).toBe(true)
  })

  it('sorts by priority then due date, and by due date with blanks last', () => {
    expect(sortTasks(tasks, 'priority').map((t) => t.id)).toEqual(['3', '1', '4', '2'])
    expect(sortTasks(tasks, 'dueDate').map((t) => t.id)).toEqual(['1', '2', '3', '4'])
    expect(sortTasks(tasks, 'title').map((t) => t.title)).toEqual(['Docs', 'Login page', 'Logout', 'Metrics'])
  })
})

describe('dashboard stats', () => {
  it('computes completion, overdue, due-soon and workload', () => {
    const tasks = [
      make({ status: 'done', points: 3, assignee: 'Ana' }),
      make({ status: 'todo', points: 5, assignee: 'Ana', dueDate: '2026-03-09', priority: 'urgent' }),
      make({ status: 'review', points: 2, dueDate: '2026-03-15' }),
      make({ status: 'backlog', points: 0, dueDate: '2026-04-30' }),
    ]
    const stats = computeStats(tasks, TODAY)
    expect(stats).toMatchObject({ total: 4, done: 1, open: 3, totalPoints: 10, donePoints: 3, completionPct: 30 })
    expect(stats.byStatus.todo).toEqual({ count: 1, points: 5 })
    expect(stats.openByPriority.urgent).toBe(1)
    expect(stats.overdue).toHaveLength(1)
    expect(stats.dueSoon).toHaveLength(1)
    expect(stats.assignees[0]).toEqual({ name: 'Ana', open: 1, done: 1, openPoints: 5 })
  })

  it('falls back to task counts when there are no points and handles empty boards', () => {
    expect(computeStats([make({ status: 'done', points: 0 }), make({ points: 0 })], TODAY).completionPct).toBe(50)
    expect(computeStats([], TODAY).completionPct).toBe(0)
  })
})

describe('import / export', () => {
  it('round-trips the export format', () => {
    const tasks = sampleTasks(NOW)
    const result = parseTasksJson(serializeTasks(tasks, NOW), NOW)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.tasks).toEqual(tasks)
  })

  it('accepts a bare array and fills optional fields', () => {
    const result = parseTasksJson(JSON.stringify([{ title: 'Minimal' }]), NOW)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.tasks[0]).toMatchObject({ title: 'Minimal', status: 'todo', priority: 'medium', points: 0, tags: [] })
      expect(result.warnings[0]).toMatch(/1 task/)
    }
  })

  it('reports invalid JSON and wrong shapes', () => {
    expect(parseTasksJson('{oops', NOW)).toMatchObject({ ok: false })
    expect(parseTasksJson('', NOW)).toMatchObject({ ok: false })
    expect(parseTasksJson('{"tasks": 3}', NOW)).toMatchObject({ ok: false })
    expect(parseTasksJson('{"format":"other","tasks":[]}', NOW)).toMatchObject({ ok: false })
    expect(parseTasksJson('{"format":"sprint-studio","version":2,"tasks":[]}', NOW)).toMatchObject({ ok: false })
  })

  it('lists per-task problems with positions and rejects duplicates', () => {
    const result = parseTasksJson(
      JSON.stringify([
        { id: 'a', title: 'Good' },
        { id: 'a', title: 'Dupe' },
        { title: '', status: 'doing', points: 'five', tags: 'x', dueDate: '2026-13-01' },
        'nope',
      ]),
      NOW,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors).toHaveLength(3)
      expect(result.errors[0]).toMatch(/^Task 2 .*duplicate id/)
      expect(result.errors[1]).toMatch(/^Task 3: .*status.*points.*tags/)
      expect(result.errors[1]).toMatch(/Title is required/)
      expect(result.errors[1]).toMatch(/valid date/)
      expect(result.errors[2]).toMatch(/^Task 4: must be an object/)
    }
  })

  it('merges by id, replacing matches and appending new tasks', () => {
    const a = make({ id: 'a', title: 'A' })
    const b = make({ id: 'b', title: 'B' })
    const result = mergeTasks([a, b], [{ ...b, title: 'B2' }, make({ id: 'c', title: 'C' })])
    expect(result.tasks.map((t) => t.title)).toEqual(['A', 'B2', 'C'])
    expect(result).toMatchObject({ added: 1, updated: 1 })
  })
})