import { describe, expect, it } from 'vitest'
import { CORRUPT_BACKUP_KEY, STORAGE_KEY, loadTasks, saveTasks, type StorageLike } from './storage'
import { createTask, emptyDraft } from './tasks'

class MemoryStorage implements StorageLike {
  data = new Map<string, string>()
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
}

const NOW = new Date('2026-03-10T09:00:00.000Z')

describe('storage', () => {
  it('seeds sample tasks on first run', () => {
    const result = loadTasks(new MemoryStorage(), NOW)
    expect(result.source).toBe('sample')
    expect(result.tasks.length).toBeGreaterThan(0)
  })

  it('persists and reloads tasks', () => {
    const storage = new MemoryStorage()
    const tasks = [createTask({ ...emptyDraft(), title: 'Persist me' }, NOW, 'p1')]
    expect(saveTasks(storage, tasks, NOW)).toBe(true)
    expect(loadTasks(storage, NOW)).toEqual({ tasks, source: 'stored' })
  })

  it('keeps an empty board empty after reload', () => {
    const storage = new MemoryStorage()
    saveTasks(storage, [], NOW)
    expect(loadTasks(storage, NOW).tasks).toEqual([])
  })

  it('recovers from corrupt data and backs it up', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{not json')
    const result = loadTasks(storage, NOW)
    expect(result.source).toBe('recovered')
    expect(result.error).toBeDefined()
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe('{not json')
  })

  it('reports save failures such as quota errors', () => {
    const storage = new MemoryStorage()
    storage.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(saveTasks(storage, [], NOW)).toBe(false)
    expect(saveTasks(undefined, [], NOW)).toBe(false)
  })
})