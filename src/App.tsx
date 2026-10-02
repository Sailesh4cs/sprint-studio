import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BoardView } from './components/BoardView'
import { Dashboard } from './components/Dashboard'
import { FilterBar } from './components/FilterBar'
import { ImportDialog, type ImportMode } from './components/ImportDialog'
import { ListView } from './components/ListView'
import { TaskDialog } from './components/TaskDialog'
import { downloadFile } from './lib/download'
import { getBrowserStorage, loadTasks, readPreference, saveTasks, writePreference } from './lib/storage'
import {
  DEFAULT_FILTERS,
  SORT_LABELS,
  STATUS_LABELS,
  computeStats,
  createTask,
  filterTasks,
  hasActiveFilters,
  mergeTasks,
  moveTask,
  sampleTasks,
  serializeTasks,
  sortTasks,
  toLocalISODate,
  uniqueAssignees,
  uniqueTags,
  updateTask,
  type Filters,
  type SortKey,
  type Status,
  type Task,
  type TaskDraft,
} from './lib/tasks'

type View = 'board' | 'list' | 'dashboard'
const VIEWS: { id: View; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'list', label: 'List' },
  { id: 'dashboard', label: 'Dashboard' },
]
const VIEW_KEY = 'sprint-studio:view'
const SORT_KEY = 'sprint-studio:sort'

interface EditorState {
  open: boolean
  task: Task | null
  status: Status
}

interface Toast {
  message: string
  undo?: Task[]
}

export default function App() {
  const storage = useMemo(getBrowserStorage, [])
  const [initial] = useState(() => loadTasks(storage))
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [view, setView] = useState<View>(() => {
    const saved = readPreference(storage, VIEW_KEY)
    return saved === 'list' || saved === 'dashboard' ? saved : 'board'
  })
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const saved = readPreference(storage, SORT_KEY)
    return saved && Object.prototype.hasOwnProperty.call(SORT_LABELS, saved) ? (saved as SortKey) : 'priority'
  })
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [editor, setEditor] = useState<EditorState>({ open: false, task: null, status: 'todo' })
  const [importOpen, setImportOpen] = useState(false)
  const [toast, setToast] = useState<Toast | null>(initial.error ? { message: initial.error } : null)
  const [saveFailed, setSaveFailed] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const today = toLocalISODate()

  useEffect(() => {
    setSaveFailed(!saveTasks(storage, tasks))
  }, [storage, tasks])
  useEffect(() => writePreference(storage, VIEW_KEY, view), [storage, view])
  useEffect(() => writePreference(storage, SORT_KEY, sortKey), [storage, sortKey])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.undo ? 8000 : 5000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const notify = useCallback((message: string, undo?: Task[]) => setToast({ message, undo }), [])
  const openNew = useCallback((status: Status = 'todo') => setEditor({ open: true, task: null, status }), [])
  const openEdit = useCallback((task: Task) => setEditor({ open: true, task, status: task.status }), [])
  const closeEditor = useCallback(() => setEditor((current) => ({ ...current, open: false })), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.ctrlKey || event.metaKey || event.altKey || target.closest('input, textarea, select, dialog, [contenteditable="true"]')) return
      if (event.key === 'n') {
        event.preventDefault()
        openNew()
      } else if (event.key === '/') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNew])

  const visible = useMemo(() => sortTasks(filterTasks(tasks, filters, today), sortKey), [tasks, filters, today, sortKey])
  const stats = useMemo(() => computeStats(visible, today), [visible, today])
  const assignees = useMemo(() => uniqueAssignees(tasks), [tasks])
  const tags = useMemo(() => uniqueTags(tasks), [tasks])

  const saveDraft = (draft: TaskDraft) => {
    if (editor.task) {
      const id = editor.task.id
      setTasks((current) => current.map((task) => (task.id === id ? updateTask(task, draft) : task)))
      notify(`Saved "${draft.title.trim()}".`)
    } else {
      setTasks((current) => [...current, createTask(draft)])
      notify(`Created "${draft.title.trim()}" in ${STATUS_LABELS[draft.status]}.`)
    }
    closeEditor()
  }

  const setStatus = (id: string, status: Status) => {
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    setTasks((current) => current.map((t) => (t.id === id ? updateTask(t, { status }) : t)))
    notify(`Moved "${task.title}" to ${STATUS_LABELS[status]}.`)
  }

  const move = (task: Task, direction: 1 | -1) => {
    const moved = moveTask(task, direction)
    if (moved === task) return
    setTasks((current) => current.map((t) => (t.id === task.id ? moved : t)))
    notify(`Moved "${task.title}" to ${STATUS_LABELS[moved.status]}.`)
  }

  const remove = (task: Task) => {
    const snapshot = tasks
    setTasks((current) => current.filter((t) => t.id !== task.id))
    if (editor.open) closeEditor()
    notify(`Deleted "${task.title}".`, snapshot)
  }

  const importTasks = (incoming: Task[], mode: ImportMode, warnings: string[]) => {
    const snapshot = tasks
    if (mode === 'replace') {
      setTasks(incoming)
      notify(`Replaced the board with ${incoming.length} imported task(s). ${warnings.join(' ')}`, snapshot)
    } else {
      const result = mergeTasks(tasks, incoming)
      setTasks(result.tasks)
      notify(`Imported: ${result.added} added, ${result.updated} updated. ${warnings.join(' ')}`, snapshot)
    }
    setImportOpen(false)
  }

  const exportTasks = () => {
    downloadFile(`sprint-studio-${today}.json`, serializeTasks(tasks), 'application/json')
    notify(`Exported ${tasks.length} task(s).`)
  }

  const loadSamples = () => {
    if (tasks.length && !window.confirm('Replace the current board with sample tasks? You can undo right after.')) return
    const snapshot = tasks
    setTasks(sampleTasks())
    setFilters(DEFAULT_FILTERS)
    notify('Loaded sample tasks.', snapshot)
  }

  const clearAll = () => {
    if (!tasks.length || !window.confirm(`Delete all ${tasks.length} tasks? You can undo right after.`)) return
    const snapshot = tasks
    setTasks([])
    notify('Cleared the board.', snapshot)
  }

  const undo = () => {
    if (!toast?.undo) return
    setTasks(toast.undo)
    setToast({ message: 'Change undone.' })
  }

  const filtered = hasActiveFilters(filters)

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            &#10003;
          </span>
          <div>
            <h1>Sprint Studio</h1>
            <p className="tagline">
              {stats.completionPct}% complete &middot; {stats.open} open &middot; {stats.overdue.length} overdue
            </p>
          </div>
        </div>
        <nav className="view-tabs" aria-label="Views">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className={view === v.id ? 'active' : undefined} aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button type="button" className="button primary" onClick={() => openNew()} title="Shortcut: N">
            + New task
          </button>
          <details className="menu">
            <summary className="button ghost">Data</summary>
            <div className="menu-panel">
              <button type="button" onClick={exportTasks}>
                Export JSON
              </button>
              <button type="button" onClick={() => setImportOpen(true)}>
                Import JSON...
              </button>
              <button type="button" onClick={loadSamples}>
                Load sample data
              </button>
              <button type="button" className="danger" onClick={clearAll}>
                Clear all tasks
              </button>
            </div>
          </details>
        </div>
      </header>

      {saveFailed && (
        <p className="banner" role="alert">
          Changes could not be saved to this browser (storage full or disabled). Export your data to keep it.
        </p>
      )}

      <main id="main" className="app-main">
        <FilterBar
          filters={filters}
          sortKey={sortKey}
          assignees={assignees}
          tags={tags}
          shown={visible.length}
          total={tasks.length}
          searchRef={searchRef}
          onChange={setFilters}
          onSortChange={setSortKey}
        />
        {tasks.length === 0 ? (
          <div className="empty-state">
            <h2>Your board is empty</h2>
            <p>Create your first task or load the sample sprint to explore.</p>
            <div className="empty-actions">
              <button type="button" className="button primary" onClick={() => openNew()}>
                Create a task
              </button>
              <button type="button" className="button ghost" onClick={loadSamples}>
                Load sample data
              </button>
            </div>
          </div>
        ) : view === 'board' ? (
          <BoardView tasks={visible} today={today} onAdd={openNew} onEdit={openEdit} onMove={move} onSetStatus={setStatus} onDelete={remove} />
        ) : view === 'list' ? (
          <ListView tasks={visible} today={today} onEdit={openEdit} onSetStatus={setStatus} onDelete={remove} />
        ) : (
          <Dashboard stats={stats} today={today} filtered={filtered} onEdit={openEdit} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Saved locally in this browser. Shortcuts: <kbd>N</kbd> new task, <kbd>/</kbd> search. Drag cards between columns or use the arrow buttons.
        </p>
      </footer>

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast">
            <span>{toast.message}</span>
            {toast.undo && (
              <button type="button" className="button small" onClick={undo}>
                Undo
              </button>
            )}
            <button type="button" className="icon-button" aria-label="Dismiss notification" onClick={() => setToast(null)}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        )}
      </div>

      <TaskDialog open={editor.open} task={editor.task} initialStatus={editor.status} assignees={assignees} onSave={saveDraft} onDelete={remove} onClose={closeEditor} />
      <ImportDialog open={importOpen} onImport={importTasks} onClose={() => setImportOpen(false)} />
    </div>
  )
}