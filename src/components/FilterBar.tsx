import type { RefObject } from 'react'
import {
  DEFAULT_FILTERS,
  PRIORITIES,
  PRIORITY_LABELS,
  SORT_LABELS,
  STATUSES,
  STATUS_LABELS,
  UNASSIGNED,
  hasActiveFilters,
  type Filters,
  type Priority,
  type SortKey,
  type Status,
} from '../lib/tasks'

interface FilterBarProps {
  filters: Filters
  sortKey: SortKey
  assignees: string[]
  tags: string[]
  shown: number
  total: number
  searchRef: RefObject<HTMLInputElement>
  onChange: (filters: Filters) => void
  onSortChange: (key: SortKey) => void
}

export function FilterBar({ filters, sortKey, assignees, tags, shown, total, searchRef, onChange, onSortChange }: FilterBarProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => onChange({ ...filters, [key]: value })
  return (
    <section className="filter-bar" aria-label="Filter and sort tasks">
      <div className="field search-field">
        <label htmlFor="filter-query">Search</label>
        <input
          ref={searchRef}
          id="filter-query"
          type="search"
          placeholder="Title, description, person or tag  ( / )"
          value={filters.query}
          onChange={(e) => set('query', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="filter-status">Status</label>
        <select id="filter-status" value={filters.status} onChange={(e) => set('status', e.target.value as Status | 'all')}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-priority">Priority</label>
        <select id="filter-priority" value={filters.priority} onChange={(e) => set('priority', e.target.value as Priority | 'all')}>
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-assignee">Assignee</label>
        <select id="filter-assignee" value={filters.assignee} onChange={(e) => set('assignee', e.target.value)}>
          <option value="all">Everyone</option>
          <option value={UNASSIGNED}>Unassigned</option>
          {assignees.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filter-tag">Tag</label>
        <select id="filter-tag" value={filters.tag} onChange={(e) => set('tag', e.target.value)}>
          <option value="all">All tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              #{tag}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="sort-key">Sort by</label>
        <select id="sort-key" value={sortKey} onChange={(e) => onSortChange(e.target.value as SortKey)}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-footer">
        <label className="checkbox">
          <input type="checkbox" checked={filters.overdueOnly} onChange={(e) => set('overdueOnly', e.target.checked)} /> Overdue only
        </label>
        <p className="result-count" aria-live="polite">
          Showing {shown} of {total} task{total === 1 ? '' : 's'}
        </p>
        {hasActiveFilters(filters) && (
          <button type="button" className="button small ghost" onClick={() => onChange(DEFAULT_FILTERS)}>
            Clear filters
          </button>
        )}
      </div>
    </section>
  )
}