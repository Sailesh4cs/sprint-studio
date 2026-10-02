import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  LIMITS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  emptyDraft,
  normalizeTags,
  taskToDraft,
  validateDraft,
  type DraftErrors,
  type Priority,
  type Status,
  type Task,
  type TaskDraft,
} from '../lib/tasks'
import { Modal } from './Modal'

interface TaskDialogProps {
  open: boolean
  task: Task | null
  initialStatus: Status
  assignees: string[]
  onSave: (draft: TaskDraft) => void
  onDelete: (task: Task) => void
  onClose: () => void
}

interface FormState {
  title: string
  description: string
  status: Status
  priority: Priority
  assignee: string
  points: string
  tags: string
  dueDate: string
}

const FIELD_ORDER: (keyof TaskDraft)[] = ['title', 'description', 'status', 'priority', 'assignee', 'points', 'dueDate', 'tags']

function toForm(draft: TaskDraft): FormState {
  return { ...draft, points: String(draft.points), tags: draft.tags.join(', ') }
}

function toDraft(form: FormState): TaskDraft {
  const points = form.points.trim() === '' ? Number.NaN : Number(form.points)
  return { ...form, points, tags: normalizeTags(form.tags) }
}

export function TaskDialog({ open, task, initialStatus, assignees, onSave, onDelete, onClose }: TaskDialogProps) {
  const [form, setForm] = useState<FormState>(() => toForm(emptyDraft(initialStatus)))
  const [errors, setErrors] = useState<DraftErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!open) return
    setForm(toForm(task ? taskToDraft(task) : emptyDraft(initialStatus)))
    setErrors({})
  }, [open, task, initialStatus])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const draft = toDraft(form)
    const nextErrors = validateDraft(draft)
    setErrors(nextErrors)
    const firstInvalid = FIELD_ORDER.find((key) => nextErrors[key])
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus()
      return
    }
    onSave(draft)
  }

  const fieldProps = (name: keyof TaskDraft) => ({
    id: `task-${name}`,
    name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `task-${name}-error` : undefined,
  })
  const error = (name: keyof TaskDraft) =>
    errors[name] ? (
      <p className="field-error" id={`task-${name}-error`}>
        {errors[name]}
      </p>
    ) : null

  return (
    <Modal open={open} title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <form ref={formRef} className="task-form" onSubmit={submit} noValidate>
        <div className="field span-2">
          <label htmlFor="task-title">
            Title <span aria-hidden="true">*</span>
          </label>
          <input {...fieldProps('title')} value={form.title} maxLength={LIMITS.title + 20} required autoFocus onChange={(e) => set('title', e.target.value)} />
          {error('title')}
        </div>
        <div className="field span-2">
          <label htmlFor="task-description">Description</label>
          <textarea {...fieldProps('description')} rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
          <p className="hint">
            {form.description.trim().length}/{LIMITS.description}
          </p>
          {error('description')}
        </div>
        <div className="field">
          <label htmlFor="task-status">Status</label>
          <select {...fieldProps('status')} value={form.status} onChange={(e) => set('status', e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="task-priority">Priority</label>
          <select {...fieldProps('priority')} value={form.priority} onChange={(e) => set('priority', e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="task-assignee">Assignee</label>
          <input {...fieldProps('assignee')} list="assignee-options" value={form.assignee} placeholder="Unassigned" onChange={(e) => set('assignee', e.target.value)} />
          <datalist id="assignee-options">
            {assignees.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          {error('assignee')}
        </div>
        <div className="field">
          <label htmlFor="task-points">Story points</label>
          <input {...fieldProps('points')} type="number" inputMode="numeric" min={0} max={LIMITS.points} step={1} value={form.points} onChange={(e) => set('points', e.target.value)} />
          {error('points')}
        </div>
        <div className="field">
          <label htmlFor="task-dueDate">Due date</label>
          <input {...fieldProps('dueDate')} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          {error('dueDate')}
        </div>
        <div className="field">
          <label htmlFor="task-tags">Tags</label>
          <input {...fieldProps('tags')} value={form.tags} placeholder="design, bug" onChange={(e) => set('tags', e.target.value)} />
          <p className="hint">Comma separated, up to {LIMITS.tags}.</p>
          {error('tags')}
        </div>
        <footer className="form-actions span-2">
          {task && (
            <button type="button" className="button danger-ghost" onClick={() => onDelete(task)}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary">
            {task ? 'Save changes' : 'Create task'}
          </button>
        </footer>
      </form>
    </Modal>
  )
}