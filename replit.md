# Tasks - Personal Productivity App

## Pre-Task Checklist
Before starting any task, review these files:
- [ ] `docs/guidelines.md` - Design and technical principles (must adhere)
- [ ] `docs/issues.md` - Check for related past issues
- [ ] `replit.md` - Current architecture and state

## Post-Task Checklist
After completing a task:
- [ ] Update `docs/transcript.md` - Add entry with timestamp, checkpoint/commit ID, summary
- [ ] Update `docs/user-guide.md` - If user-facing features changed
- [ ] Update `docs/guidelines.md` - If new principles were established
- [ ] Update `docs/issues.md` - If issues were diagnosed and resolved
- [ ] Update `replit.md` - If architecture or data model changed

## Task List Guidelines
**Always include a documentation task in every task list.** The final task should be:
- "Update documentation (transcript.md, replit.md, etc.) as needed"

This ensures documentation is never forgotten. Mark it "not applicable" if the change didn't warrant updates, but always include it in the plan.

## Documentation Files
| File | Purpose | Update Frequency |
|------|---------|------------------|
| `docs/guidelines.md` | Design and technical principles | When principles established |
| `docs/issues.md` | Issue log with diagnosis and resolution | When issues resolved |
| `docs/transcript.md` | Reverse chronological session history | After each significant change |
| `docs/user-guide.md` | User documentation with step-by-step guides | When features change |

---

## PRDs

| PRD | Status | Spec | Report |
|-----|--------|------|--------|
| v0.1 - Domains & Tasks Core | Complete | `docs/prds/prd-v0.1-spec.md` | `docs/prds/prd-0.1-report.md` |
| v0.2 - Today, Habits, Inbox & Scheduling | Complete | `docs/prds/prd-v0.2.b-revised-spec.md` | `docs/prds/prd-0.2-report.md` |
| v0.2.1 - Stability & Correctness Fixes | Complete | `docs/prds/prd-0.2.1-spec.md` | `docs/prds/prd-0.2.1-report.md` |
| v0.3.0 - Domain-Sequential Today & Inline Grooming | Complete | `docs/prds/prd-0.3.0-spec.md` | `docs/prds/prd-0.3.0-report.md` |

### Implementation Report Directive
**You MUST maintain an implementation report for each active PRD.** The report should:
- Track feature implementation status with tables (Feature / Status / Notes)
- Document architecture decisions made during implementation
- Note any deviations from the PRD with justification
- List known limitations and future work
- Update the report as each phase/feature is completed

---

## Overview
A personal productivity web app focused on managing tasks across life domains. Built with React, Express, and PostgreSQL database.

## Current State
v0.3.0 - Domain-Sequential Today & Inline Grooming complete with:
- **Today View** (/) - Domain-grouped layout for daily execution
  - Each domain shows: habits → scheduled tasks → added tasks
  - Domains sorted by sortOrder (chronological day phases)
  - Habit satisfied UX: Options collapse with summary chips
  - Inline task editing: Click title opens TaskEditDrawer
  - Inline inbox title editing: Click-to-edit pattern
  - Inbox conversion: Domain selection dialog → create task → open editor
  - Inbox section at bottom of view
- **Habits Management** (/habits) - Enhanced editing capabilities
  - Edit habit name, domain, selection_type, min_required inline
  - Rename habit options with click-to-edit
  - Add/delete options, toggle active/inactive
- **Tasks View** (/tasks) - Enhanced with filters and valence display
  - Filters: All (open), Open (unscheduled), Scheduled, Completed, Archived
  - Valence icons: Triangle (-1), Circle (0), Sparkles (+1)
  - Effort unknown state: ? icon when null
  - Sort by: manual, due date, scheduled, priority, effort, valence, created
- **v0.1-v0.2 Features** preserved:
  - Domain management with 9 seed domains
  - Task CRUD with completion, archival, restoration
  - Drag-and-drop task reordering (within and across domains)
  - Collapsible domains, inline task title editing
  - Keyboard shortcut Cmd/Ctrl+N for new task

## Architecture

### Frontend (client/)
- **Framework**: React with TypeScript, Vite bundler
- **Styling**: Tailwind CSS with Shadcn UI components
- **State**: TanStack Query for server state
- **Routing**: Wouter
- **Drag-and-Drop**: dnd-kit
- **Key Pages**:
  - `pages/today.tsx` - Today View with habits, scheduled tasks, inbox, added tasks
  - `pages/tasks.tsx` - Tasks page with domain grouping
  - `pages/habits.tsx` - Habits management page
  - `pages/manage-domains.tsx` - Domain management page
- **Key Components**:
  - `hooks/use-task-drag-and-drop.ts` - DnD state management hook
  - `components/task-row-content.tsx` - Shared task row UI (inline editing)
  - `components/sortable-task-list.tsx` - Sortable task list with drop zones
  - `components/domain-header.tsx` - Domain header with collapse toggle
  - `components/filter-sort-bar.tsx` - Filter and sort controls
  - `components/inline-task-form.tsx` - Inline task creation per domain
  - `components/task-edit-drawer.tsx` - Side drawer for editing tasks
  - `components/global-add-task-dialog.tsx` - Modal for adding tasks from header

### Backend (server/)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: DatabaseStorage class implementing IStorage interface
- **API Endpoints**:
  - Domains: `GET/POST /api/domains`, `PATCH /api/domains/:id`, `POST /api/domains/reorder`
  - Tasks: `GET/POST /api/tasks`, `PATCH /api/tasks/:id`, `POST /api/tasks/:id/complete|reopen|archive|restore`
  - Reorder: `POST /api/domains/:domainId/tasks/reorder`
  - **v0.2 New**:
    - `GET /api/today` - Aggregated today data (habits, scheduled, inbox, assignments)
    - `GET/POST /api/inbox`, `PATCH/DELETE /api/inbox/:id`, `POST /api/inbox/:id/triage`
    - `GET/POST /api/habits`, `PATCH/DELETE /api/habits/:id`
    - `POST /api/habits/:id/entry` - Record habit selection for today
    - `GET/POST /api/task-day-assignments`, `DELETE /api/task-day-assignments/:id`

### Shared (shared/)
- `schema.ts` - TypeScript types and Zod schemas for all entities

## Data Model

### Domain
- id, userId, name, sortOrder, isActive, createdAt, updatedAt

### Task
- id, userId, domainId, title, status (open|completed)
- Required: priority (1-3) default 1
- Optional: effortPoints (1-3 or null), valence (-1/0/1), scheduledDate, dueDate, sourceInboxItemId (v0.3.0)
- domainSortOrder, createdAt, updatedAt, completedAt, archivedAt
- Archive is tracked via archivedAt timestamp (not status)

### InboxItem (v0.2, updated v0.3.0)
- id, userId, content, status (untriaged|converted|dismissed), createdAt, triagedAt

### HabitDefinition (v0.2)
- id, userId, domainId, name, selectionType (single|multi), minRequired (for multi), isActive, sortOrder, createdAt

### HabitOption (v0.2)
- id, habitId, label, sortOrder, createdAt

### HabitDailyEntry (v0.2)
- id, userId, habitId, date, selectedOptionIds[], createdAt

### TaskDayAssignment (v0.2)
- id, userId, taskId, date, createdAt

## Running the App
```bash
npm run dev
```
Server runs on port 5000, serving both API and frontend.

## Design System
- Font: Inter
- Primary color: Blue (210 hue)
- See design_guidelines.md for full design specs
