import { describe, expect, it } from 'vitest'
import { formatDate, formatDue, formatRelativeTime, initials } from './format'

describe('format helpers', () => {
  it('describes due dates relative to today', () => {
    expect(formatDue('2026-03-10', '2026-03-10', false)).toBe('Due today')
    expect(formatDue('2026-03-11', '2026-03-10', false)).toBe('Due tomorrow')
    expect(formatDue('2026-03-09', '2026-03-10', false)).toBe('Overdue by 1 day')
    expect(formatDue('2026-03-01', '2026-03-10', false)).toBe('Overdue by 9 days')
    expect(formatDue('2026-03-15', '2026-03-10', false)).toBe('Due in 5 days')
    expect(formatDue('2026-04-01', '2026-03-10', false)).toBe('Due 1 Apr 2026')
    expect(formatDue('2026-03-01', '2026-03-10', true)).toBe('Due 1 Mar 2026')
    expect(formatDate('2026-12-25')).toBe('25 Dec 2026')
  })

  it('builds initials and relative times', () => {
    expect(initials('ada lovelace byron')).toBe('AL')
    expect(initials('   ')).toBe('?')
    const now = new Date('2026-03-10T12:00:00Z')
    expect(formatRelativeTime('2026-03-10T11:59:30Z', now)).toBe('just now')
    expect(formatRelativeTime('2026-03-10T10:00:00Z', now)).toBe('2 h ago')
    expect(formatRelativeTime('2026-03-09T12:00:00Z', now)).toBe('1 day ago')
  })
})