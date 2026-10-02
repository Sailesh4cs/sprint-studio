import { parseTasksJson, sampleTasks, serializeTasks, type Task } from './tasks'

export const STORAGE_KEY = 'sprint-studio:tasks:v1'
export const CORRUPT_BACKUP_KEY = `${STORAGE_KEY}:corrupt-backup`

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface LoadResult {
  tasks: Task[]
  source: 'stored' | 'sample' | 'recovered'
  error?: string
}

export function getBrowserStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

export function loadTasks(storage: StorageLike | undefined, now: Date = new Date()): LoadResult {
  if (!storage) return { tasks: sampleTasks(now), source: 'sample', error: 'Browser storage is unavailable; changes will not be saved.' }
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { tasks: sampleTasks(now), source: 'sample', error: 'Browser storage could not be read; changes may not be saved.' }
  }
  if (raw === null) return { tasks: sampleTasks(now), source: 'sample' }
  const result = parseTasksJson(raw, now)
  if (result.ok) return { tasks: result.tasks, source: 'stored' }
  try {
    storage.setItem(CORRUPT_BACKUP_KEY, raw)
  } catch {
    // Backup is best effort only.
  }
  return {
    tasks: sampleTasks(now),
    source: 'recovered',
    error: 'Saved data was unreadable, so sample tasks were loaded. The original data was backed up in localStorage.',
  }
}

export function saveTasks(storage: StorageLike | undefined, tasks: readonly Task[], now: Date = new Date()): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, serializeTasks(tasks, now))
    return true
  } catch {
    return false
  }
}

export function readPreference(storage: StorageLike | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function writePreference(storage: StorageLike | undefined, key: string, value: string): void {
  try {
    storage?.setItem(key, value)
  } catch {
    // Preferences are optional.
  }
}