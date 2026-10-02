import { useEffect, useState, type ChangeEvent } from 'react'
import { parseTasksJson, type Task } from '../lib/tasks'
import { Modal } from './Modal'

export type ImportMode = 'merge' | 'replace'

interface ImportDialogProps {
  open: boolean
  onImport: (tasks: Task[], mode: ImportMode, warnings: string[]) => void
  onClose: () => void
}

const MAX_SHOWN_ERRORS = 8

export function ImportDialog({ open, onImport, onClose }: ImportDialogProps) {
  const [text, setText] = useState('')
  const [mode, setMode] = useState<ImportMode>('merge')
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    if (open) {
      setText('')
      setErrors([])
      setFileName('')
      setMode('merge')
    }
  }, [open])

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setErrors(['File is larger than 5 MB.'])
      return
    }
    setFileName(file.name)
    setText(await file.text())
    setErrors([])
  }

  const submit = () => {
    const result = parseTasksJson(text)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    onImport(result.tasks, mode, result.warnings)
  }

  return (
    <Modal open={open} title="Import tasks from JSON" onClose={onClose} wide>
      <div className="import-form">
        <p className="muted">
          Accepts a Sprint Studio export or a plain array of task objects. Only <code>title</code> is required; everything is validated before
          anything changes.
        </p>
        <div className="field">
          <label htmlFor="import-file">Choose a .json file</label>
          <input id="import-file" type="file" accept="application/json,.json" onChange={readFile} />
          {fileName && <p className="hint">Loaded {fileName}</p>}
        </div>
        <div className="field">
          <label htmlFor="import-text">Or paste JSON</label>
          <textarea
            id="import-text"
            rows={9}
            className="mono"
            value={text}
            spellCheck={false}
            placeholder='[{ "title": "My task", "status": "todo", "priority": "high", "points": 3 }]'
            aria-invalid={errors.length ? true : undefined}
            aria-describedby={errors.length ? 'import-errors' : undefined}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <fieldset className="radio-group">
          <legend>When importing</legend>
          <label>
            <input type="radio" name="import-mode" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Merge - update
            tasks with matching ids, add the rest
          </label>
          <label>
            <input type="radio" name="import-mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace -
            discard the current board
          </label>
        </fieldset>
        {errors.length > 0 && (
          <div className="error-box" id="import-errors" role="alert">
            <strong>
              {errors.length} problem{errors.length === 1 ? '' : 's'} found - nothing was imported.
            </strong>
            <ul>
              {errors.slice(0, MAX_SHOWN_ERRORS).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            {errors.length > MAX_SHOWN_ERRORS && <p>...and {errors.length - MAX_SHOWN_ERRORS} more.</p>}
          </div>
        )}
        <footer className="form-actions">
          <span className="spacer" />
          <button type="button" className="button ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button primary" onClick={submit} disabled={!text.trim()}>
            Validate and import
          </button>
        </footer>
      </div>
    </Modal>
  )
}