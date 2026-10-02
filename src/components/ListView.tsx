import { PRIORITY_LABELS, STATUSES, STATUS_LABELS, isOverdue, type Status, type Task } from '../lib/tasks'
import { formatDue, formatRelativeTime } from '../lib/format'

interface ListViewProps {
  tasks: Task[]
  today: string
  onEdit: (task: Task) => void
  onSetStatus: (id: string, status: Status) => void
  onDelete: (task: Task) => void
}

export function ListView({ tasks, today, onEdit, onSetStatus, onDelete }: ListViewProps) {
  if (tasks.length === 0) return <p className="empty-state">No tasks match the current filters.</p>
  return (
    <div className="table-wrap">
      <table className="task-table">
        <caption className="sr-only">Tasks matching the current filters</caption>
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Assignee</th>
            <th scope="col" className="num">
              Points
            </th>
            <th scope="col">Due</th>
            <th scope="col">Updated</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const overdue = isOverdue(task, today)
            return (
              <tr key={task.id}>
                <th scope="row">
                  <button type="button" className="link-button" onClick={() => onEdit(task)}>
                    {task.title}
                  </button>
                  {task.tags.length > 0 && <div className="row-tags">{task.tags.map((tag) => `#${tag}`).join(' ')}</div>}
                </th>
                <td>
                  <select
                    className="inline-select"
                    value={task.status}
                    aria-label={`Status for "${task.title}"`}
                    onChange={(e) => onSetStatus(task.id, e.target.value as Status)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                </td>
                <td>{task.assignee || <span className="muted">Unassigned</span>}</td>
                <td className="num">{task.points}</td>
                <td className={overdue ? 'overdue' : undefined}>{task.dueDate ? formatDue(task.dueDate, today, task.status === 'done') : <span className="muted">-</span>}</td>
                <td className="muted">{formatRelativeTime(task.updatedAt)}</td>
                <td className="row-actions">
                  <button type="button" className="button small ghost" onClick={() => onEdit(task)}>
                    Edit<span className="sr-only"> "{task.title}"</span>
                  </button>
                  <button type="button" className="button small danger-ghost" onClick={() => onDelete(task)}>
                    Delete<span className="sr-only"> "{task.title}"</span>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}