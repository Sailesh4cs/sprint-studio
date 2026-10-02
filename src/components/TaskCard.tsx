import { PRIORITY_LABELS, STATUS_LABELS, isOverdue, nextStatus, prevStatus, type Task } from '../lib/tasks'
import { formatDue, initials } from '../lib/format'

interface TaskCardProps {
  task: Task
  today: string
  onEdit: (task: Task) => void
  onMove: (task: Task, direction: 1 | -1) => void
  onDelete: (task: Task) => void
}

export function TaskCard({ task, today, onEdit, onMove, onDelete }: TaskCardProps) {
  const overdue = isOverdue(task, today)
  const prev = prevStatus(task.status)
  const next = nextStatus(task.status)
  return (
    <article
      className={`task-card priority-${task.priority}${overdue ? ' is-overdue' : ''}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      aria-label={task.title}
    >
      <div className="card-top">
        <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
        <span className="points" title="Story points">
          {task.points} pt<span className="sr-only">s</span>
        </span>
      </div>
      <h3 className="card-title">
        <button type="button" className="link-button" onClick={() => onEdit(task)}>
          {task.title}
        </button>
      </h3>
      {task.description && <p className="card-desc">{task.description}</p>}
      {task.tags.length > 0 && (
        <ul className="tag-list" aria-label="Tags">
          {task.tags.map((tag) => (
            <li key={tag} className="tag">
              #{tag}
            </li>
          ))}
        </ul>
      )}
      <div className="card-meta">
        <span className="assignee" title={task.assignee || 'Unassigned'}>
          <span className="avatar" aria-hidden="true">
            {initials(task.assignee)}
          </span>
          {task.assignee || 'Unassigned'}
        </span>
        {task.dueDate && <span className={`due${overdue ? ' overdue' : ''}`}>{formatDue(task.dueDate, today, task.status === 'done')}</span>}
      </div>
      <div className="card-actions">
        <button type="button" className="icon-button" disabled={!prev} onClick={() => onMove(task, -1)} aria-label={prev ? `Move "${task.title}" back to ${STATUS_LABELS[prev]}` : 'Already in first column'}>
          <span aria-hidden="true">&larr;</span>
        </button>
        <button type="button" className="icon-button" disabled={!next} onClick={() => onMove(task, 1)} aria-label={next ? `Move "${task.title}" forward to ${STATUS_LABELS[next]}` : 'Already done'}>
          <span aria-hidden="true">&rarr;</span>
        </button>
        <span className="spacer" />
        <button type="button" className="icon-button" onClick={() => onEdit(task)} aria-label={`Edit "${task.title}"`}>
          <span aria-hidden="true">&#9998;</span>
        </button>
        <button type="button" className="icon-button danger" onClick={() => onDelete(task)} aria-label={`Delete "${task.title}"`}>
          <span aria-hidden="true">&#128465;</span>
        </button>
      </div>
    </article>
  )
}