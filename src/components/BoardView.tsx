import { useState } from 'react'
import { STATUSES, STATUS_LABELS, type Status, type Task } from '../lib/tasks'
import { TaskCard } from './TaskCard'

interface BoardViewProps {
  tasks: Task[]
  today: string
  onAdd: (status: Status) => void
  onEdit: (task: Task) => void
  onMove: (task: Task, direction: 1 | -1) => void
  onSetStatus: (id: string, status: Status) => void
  onDelete: (task: Task) => void
}

export function BoardView({ tasks, today, onAdd, onEdit, onMove, onSetStatus, onDelete }: BoardViewProps) {
  const [dropTarget, setDropTarget] = useState<Status | null>(null)
  return (
    <div className="board" role="list" aria-label="Sprint board">
      {STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status)
        const points = columnTasks.reduce((sum, task) => sum + task.points, 0)
        return (
          <section
            key={status}
            role="listitem"
            className={`column column-${status}${dropTarget === status ? ' is-drop-target' : ''}`}
            aria-labelledby={`col-${status}`}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropTarget(status)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDropTarget(null)
              const id = event.dataTransfer.getData('text/plain')
              if (id) onSetStatus(id, status)
            }}
          >
            <header className="column-header">
              <h2 id={`col-${status}`}>
                <span className="status-dot" aria-hidden="true" />
                {STATUS_LABELS[status]}
              </h2>
              <span className="column-count" aria-label={`${columnTasks.length} tasks, ${points} points`}>
                {columnTasks.length} &middot; {points} pt
              </span>
            </header>
            <div className="column-body">
              {columnTasks.length === 0 && <p className="empty-column">No tasks here.</p>}
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} today={today} onEdit={onEdit} onMove={onMove} onDelete={onDelete} />
              ))}
            </div>
            <button type="button" className="add-in-column" onClick={() => onAdd(status)}>
              + Add to {STATUS_LABELS[status]}
            </button>
          </section>
        )
      })}
    </div>
  )
}