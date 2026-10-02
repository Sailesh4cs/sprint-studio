# Sprint Studio

Sprint Studio is a standalone sprint board built with React, TypeScript and Vite. You can create and edit tasks, move them through a five-stage workflow, filter and sort them, and see a live dashboard. Everything is saved in the browser's `localStorage`. Tasks can be exported to JSON and imported back, with validation.

There is no backend, no account and no hosting dependency. The app runs from `npm run dev` or as static files from `dist/`.

---

## Features

### Tasks (CRUD)
- **Create** a task with the **+ New task** button, the **+ Add to <column>** button under any board column, or by pressing **`n`**.
- **Fields:** title (required, max 120 chars), description (max 2000), status, priority (`low`, `medium`, `high`, `urgent`), assignee, story points (whole number 0–100), up to 10 tags (lower-cased, de-duplicated, max 24 chars each) and an optional due date.
- **Edit** a task with the pencil icon or by clicking its title. All inputs are validated, with an error message next to each field.
- **Delete** a task with the bin icon. An **Undo** toast lets you restore it.

### Workflow
- The workflow is **Backlog → To do → In progress → Review → Done**.
- **Board view:** drag a card between columns, or use the ← / → buttons, which are keyboard and screen-reader friendly.
- **List view:** a sortable table with an inline status selector on each row.

### Filtering and sorting
- Free-text search across title, description, assignee and tags. Press **`/`** to jump to the search box.
- Filters for status, priority, assignee (including *Unassigned*), tag and **Overdue only**.
- Six sort orders: priority, due date, newest, recently updated, title, and points. The chosen view and sort order are remembered.
- The header shows a "Showing X of Y tasks" count.

### Dashboard
The dashboard is calculated from the **currently filtered** tasks, so you can slice by person or tag. It shows:
- completion % by story points, plus open, overdue and due-in-7-days counts
- a breakdown by status and by priority
- a workload table per assignee (open points and task count)

### Persistence
- Tasks are saved to `localStorage` under the key `sprint-studio:tasks:v1` after every change.
- On first run, sample tasks are loaded with due dates relative to today.
- If the stored data is corrupt, it is copied to `sprint-studio:tasks:v1:corrupt-backup`, sample data is loaded instead, and a warning is shown. If storage is unavailable (for example in private mode with storage blocked), the app still works but warns you that changes won't be saved.

### Import and export (JSON)
- **Data → Export JSON** downloads `sprint-studio-YYYY-MM-DD.json` in this format:
  ```json
  { "format": "sprint-studio", "version": 1, "exportedAt": "2026-10-02T09:00:00.000Z",
    "tasks": [ { "id": "...", "title": "...", "description": "", "status": "todo",
                 "priority": "medium", "assignee": "", "points": 3, "tags": ["ui"],
                 "dueDate": "2026-10-10", "createdAt": "...", "updatedAt": "..." } ] }
  ```
- **Data → Import JSON** accepts a file or pasted JSON. Two shapes are accepted: the export object above, or a bare array of tasks.
  - Validation is strict: unknown status or priority values, invalid dates, out-of-range points, over-long text and duplicate ids are rejected, with a message for each task.
  - Tasks with no id get a new one, and you see a warning.
  - **Merge** adds the tasks and replaces any with the same id. **Replace** discards the current tasks.
  - Both modes can be undone.
- **Data → Load sample data** and **Clear all tasks** can also be undone.

### UX and accessibility
- Responsive layout. On phones the board columns scroll horizontally with snap scrolling, and the filters stack.
- Light and dark themes follow the OS setting. Animations are disabled when *reduced motion* is requested.
- Semantic landmarks, a skip link, labelled controls, native `<dialog>` modals with focus handling, `aria-live` status and toast messages, and visible focus rings.

---

## Requirements

- Node.js **18.18 or newer** (tested with Node 18.18.0 and npm 9.8.1).
- Any modern browser (Chrome, Edge, Firefox, Safari).

## Setup

```powershell
git clone https://github.com/Sailesh4cs/sprint-studio.git
cd sprint-studio
npm ci             # installs exact versions from package-lock.json
```

## Run in development

```powershell
npm run dev        # starts Vite on http://localhost:5173 with hot reload
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the Vite dev server. |
| `npm test` | Runs the unit tests once with Vitest (node environment). |
| `npm run test:watch` | Runs the tests in watch mode. |
| `npm run typecheck` | Runs `tsc --noEmit` in strict mode. |
| `npm run build` | Type-checks, then builds an optimised static bundle into `dist/`. |
| `npm run preview` | Serves the built `dist/` on http://localhost:4173. |

## Tests

There are 25 tests in `src/lib/*.test.ts`. They cover the pure logic that drives the UI:

- `tasks.test.ts`
  - task creation, normalisation and validation (title, points, tags, dates)
  - filtering, including search, assignee "unassigned", tags and overdue
  - every sort order
  - workflow moves
  - dashboard statistics
  - JSON serialisation round-trip
  - import validation errors, duplicate ids and generated-id warnings
  - merge and replace import
- `storage.test.ts`: loading samples on an empty store, round-trip save and load, backup and recovery of corrupt data, a missing storage object, and a `setItem` that throws (quota exceeded)
- `format.test.ts`: due-date labels such as "Overdue by", "Due today" and "Due in"

## Build and deploy locally

```powershell
npm run build              # outputs dist/index.html and dist/assets/*
npm run preview            # option 1: Vite preview server on http://localhost:4173
npx serve dist             # option 2: any static file server
```

`vite.config.ts` sets `base: './'`, so `dist/` uses relative asset paths. You can copy it to any folder or sub-path on a static server (IIS, nginx, GitHub Pages and so on) without changing any config. No server-side code or environment variables are needed.

## Project structure

```
sprint-studio/
├─ index.html              # HTML shell
├─ src/
│  ├─ main.tsx             # React entry
│  ├─ App.tsx              # State, persistence, undo, shortcuts, layout
│  ├─ styles.css           # All styling (light and dark, responsive)
│  ├─ components/          # BoardView, ListView, Dashboard, FilterBar, TaskCard,
│  │                       # TaskDialog, ImportDialog, Modal
│  └─ lib/
│     ├─ tasks.ts          # Domain model, validation, filters, sorting, stats, import/export
│     ├─ storage.ts        # localStorage load/save with recovery
│     ├─ format.ts         # Date and label helpers
│     ├─ download.ts       # Browser file download helper
│     └─ *.test.ts         # Vitest unit tests
├─ vite.config.ts          # Vite + Vitest config
└─ tsconfig.json           # Strict TypeScript config
```

## Resetting data

Use **Data → Clear all tasks** or **Load sample data**. You can also clear the `sprint-studio:*` keys in your browser's DevTools under Application → Local Storage.