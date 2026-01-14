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
| v0.2 - Today, Habits, Inbox & Scheduling | In Progress | `docs/prds/prd-v0.2.b-revised-spec.md` | `docs/prds/prd-0.2-report.md` |

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
v0.1 - Domains & Tasks Core implementation complete with:
- Domain management with 9 seed domains (Body, Space, Mind, Plan, Connect, Attack, Create, Learn, Manage)
- Manage Domains page (/domains) with create, rename, reorder, enable/disable
- Task CRUD with completion, archival, and restoration
- Multiple sort modes (manual, due date, scheduled, priority, effort, complexity, created)
- Filter modes: All (open+completed), Open, Completed, Archived
- Dark/light theme toggle
- Drag-and-drop task reordering (within and across domains)
- Shadcn date pickers for due date and scheduled date
- Collapsible domains with auto-expand during drag
- Inline task title editing (double-click or edit icon)
- Keyboard shortcut Cmd/Ctrl+N for new task
- Domain enable/disable with task reassignment prompt

## Architecture

### Frontend (client/)
- **Framework**: React with TypeScript, Vite bundler
- **Styling**: Tailwind CSS with Shadcn UI components
- **State**: TanStack Query for server state
- **Routing**: Wouter
- **Drag-and-Drop**: dnd-kit
- **Key Components**:
  - `pages/tasks.tsx` - Main tasks page with domain grouping
  - `pages/manage-domains.tsx` - Domain management page
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
  - `GET /api/domains` - List all domains
  - `POST /api/domains` - Create domain
  - `PATCH /api/domains/:id` - Update domain
  - `POST /api/domains/reorder` - Reorder domains
  - `GET /api/tasks?filter=&sort=` - List tasks with filters
  - `POST /api/tasks` - Create task
  - `PATCH /api/tasks/:id` - Update task
  - `POST /api/tasks/:id/complete` - Complete task
  - `POST /api/tasks/:id/reopen` - Reopen task
  - `POST /api/tasks/:id/archive` - Archive task
  - `POST /api/tasks/:id/restore` - Restore archived task
  - `POST /api/domains/:domainId/tasks/reorder` - Reorder tasks within domain

### Shared (shared/)
- `schema.ts` - TypeScript types and Zod schemas for domains and tasks

## Data Model

### Domain
- id, userId, name, sortOrder, isActive, createdAt, updatedAt

### Task
- id, userId, domainId, title, status (open|completed)
- Required: priority (1-3), effortPoints (1-3), complexity (1-3) - all default to 1
- Optional: scheduledDate, dueDate
- domainSortOrder, createdAt, updatedAt, completedAt, archivedAt
- Archive is tracked via archivedAt timestamp (not status)

## Running the App
```bash
npm run dev
```
Server runs on port 5000, serving both API and frontend.

## Design System
- Font: Inter
- Primary color: Blue (210 hue)
- See design_guidelines.md for full design specs
