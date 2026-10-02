import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Stats, type Task } from '../lib/tasks'
import { formatDue } from '../lib/format'

interface DashboardProps {
  stats: Stats
  today: string
  filtered: boolean
  onEdit: (task: Task) => void
}

export function Dashboard({ stats, today, filtered, onEdit }: DashboardProps) {
  const maxPriority = Math.max(1, ...PRIORITIES.map((p) => stats.openByPriority[p]))
  const maxLoad = Math.max(1, ...stats.assignees.map((a) => a.openPoints))
  return (
    <div className="dashboard">
      {filtered && <p className="notice">Dashboard figures reflect the active filters.</p>}
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Completion</span>
          <strong className="kpi-value">{stats.completionPct}%</strong>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stats.completionPct} aria-label="Sprint completion by story points">
            <span style={{ width: `${stats.completionPct}%` }} />
          </div>
          <span className="kpi-sub">
            {stats.donePoints} of {stats.totalPoints} points done
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Open tasks</span>
          <strong className="kpi-value">{stats.open}</strong>
          <span className="kpi-sub">
            {stats.done} done &middot; {stats.total} total
          </span>
        </div>
        <div className={`kpi${stats.overdue.length ? ' kpi-alert' : ''}`}>
          <span className="kpi-label">Overdue</span>
          <strong className="kpi-value">{stats.overdue.length}</strong>
          <span className="kpi-sub">open tasks past due</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Due in 7 days</span>
          <strong className="kpi-value">{stats.dueSoon.length}</strong>
          <span className="kpi-sub">open tasks coming up</span>
        </div>
      </div>

      <div className="panels">
        <section className="panel" aria-labelledby="dist-title">
          <h2 id="dist-title">Workflow distribution</h2>
          <div className="stacked" aria-hidden="true">
            {STATUSES.map((s) =>
              stats.byStatus[s].count ? <span key={s} className={`seg seg-${s}`} style={{ flexGrow: stats.byStatus[s].count }} title={`${STATUS_LABELS[s]}: ${stats.byStatus[s].count}`} /> : null,
            )}
          </div>
          <table className="mini-table">
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col" className="num">
                  Tasks
                </th>
                <th scope="col" className="num">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {STATUSES.map((s) => (
                <tr key={s}>
                  <th scope="row">
                    <span className={`legend-dot seg-${s}`} aria-hidden="true" />
                    {STATUS_LABELS[s]}
                  </th>
                  <td className="num">{stats.byStatus[s].count}</td>
                  <td className="num">{stats.byStatus[s].points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel" aria-labelledby="prio-title">
          <h2 id="prio-title">Open work by priority</h2>
          <ul className="bars">
            {[...PRIORITIES].reverse().map((p) => (
              <li key={p}>
                <span className="bar-label">{PRIORITY_LABELS[p]}</span>
                <span className="bar-track">
                  <span className={`bar-fill badge-${p}`} style={{ width: `${(stats.openByPriority[p] / maxPriority) * 100}%` }} />
                </span>
                <span className="bar-value">{stats.openByPriority[p]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="load-title">
          <h2 id="load-title">Workload by person</h2>
          {stats.assignees.length === 0 ? (
            <p className="muted">No tasks yet.</p>
          ) : (
            <ul className="bars">
              {stats.assignees.map((a) => (
                <li key={a.name}>
                  <span className="bar-label">{a.name}</span>
                  <span className="bar-track">
                    <span className="bar-fill accent" style={{ width: `${(a.openPoints / maxLoad) * 100}%` }} />
                  </span>
                  <span className="bar-value" title={`${a.open} open, ${a.done} done`}>
                    {a.openPoints} pt
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel" aria-labelledby="attention-title">
          <h2 id="attention-title">Needs attention</h2>
          {stats.overdue.length + stats.dueSoon.length === 0 ? (
            <p className="muted">Nothing overdue or due this week.</p>
          ) : (
            <ul className="attention-list">
              {[...stats.overdue, ...stats.dueSoon].slice(0, 8).map((task) => (
                <li key={task.id}>
                  <button type="button" className="link-button" onClick={() => onEdit(task)}>
                    {task.title}
                  </button>
                  <span className={task.dueDate < today ? 'overdue' : 'muted'}>{formatDue(task.dueDate, today, false)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}