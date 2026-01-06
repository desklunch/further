# v0.1 PRD — Domains & Tasks Core

## Purpose
This document defines the **v0.1 implementation** of a personal productivity web app, scoped to the **minimal usable core**: Domains and Tasks.

This specification is intended to be used as a **prompt for an AI software development agent**.  
Assume **no prior context** beyond what is written here.

The goal of v0.1 is **daily usability**, not feature completeness. All architectural decisions must remain compatible with future expansion (Days, Itineraries, Habits, Recurrence), but those features are **explicitly out of scope**.

---

## 1. Product Scope (v0.1)

### In Scope
- Domain management (editable + reorderable)
- Task management (CRUD + completion)
- Task grouping by domain
- Task sorting (manual + property-based)
- Completed and archived task access

### Out of Scope
- Days / Itineraries / Sections
- Habits
- Inbox / capture
- Recurring tasks
- Subtasks or continuation tasks
- Projects / areas / collections
- Calendar integration
- Analytics or reporting

---

## 2. Core Concepts

### Domain
A **Domain** is a required, mutually-exclusive category for tasks (MECE).  
Every task must belong to exactly one domain.

Domains are:
- User-editable (rename)
- Reorderable
- Soft-disableable (via `is_active`)

### Task
A **Task** is a unit of work categorized into a Domain.

Tasks support:
- Optional planning metadata (priority, effort, complexity, dates)
- Manual ordering within a domain
- Completion and archival (soft delete)

---

## 3. Data Model / Schema

### 3.1 Domain

**Table: domains**
- `id` (string / uuid, PK)
- `user_id` (string / uuid, required)
- `name` (string, required)
- `sort_order` (integer, required)
- `is_active` (boolean, required, default true)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Constraints**
- `name` must be non-empty
- `(user_id, sort_order)` should be unique

---

### 3.2 Task

**Table: tasks**
- `id` (string / uuid, PK)
- `user_id` (string / uuid, required)
- `domain_id` (FK → domains.id, required)

Core:
- `title` (string, required)
- `status` (enum: `open | completed | archived`, required)

Optional metadata:
- `priority` (int, nullable; recommended 1–5)
- `effort_points` (int, nullable; recommended 1–8)
- `complexity` (int, nullable; recommended 1–5)
- `scheduled_date` (date, nullable)
- `due_date` (date, nullable)

Ordering:
- `domain_sort_order` (int, required for open tasks)

Timestamps:
- `created_at`
- `updated_at`
- `completed_at` (nullable)
- `archived_at` (nullable)

**Constraints**
- `title` non-empty
- `domain_id` required
- If `status = completed`, `completed_at` must be set
- If `status = archived`, `archived_at` must be set

---

## 4. State Machines

### 4.1 Task State Machine

States:
- `open`
- `completed`
- `archived`

Transitions:
- `open → completed`
- `completed → open`
- `open → archived`
- `completed → archived`
- `archived → open` (restore)

Side effects:
- Completion sets `completed_at`
- Archival sets `archived_at`
- Restore clears timestamps and reassigns `domain_sort_order` to end of domain list

---

## 5. Business Logic

### 5.1 Task Creation
- Domain is required
- `domain_sort_order` = max + 1 within domain (open tasks only)
- Status defaults to `open`

### 5.2 Task Editing
- All fields editable except `id`
- Domain change reassigns `domain_sort_order` in target domain

### 5.3 Deletion
- UI shows “Delete”
- Backend implements as **archive**
- Archived tasks hidden by default

---

## 6. Sorting Rules

Tasks are **always grouped by Domain** (ordered by `domain.sort_order`).  
Sorting applies **within each domain**.

### Sort Modes

**Manual (default)**
- `domain_sort_order ASC`

**Due Date**
1. `due_date IS NOT NULL`
2. `due_date ASC`
3. `priority DESC`
4. `created_at ASC`

**Scheduled Date**
1. `scheduled_date IS NOT NULL`
2. `scheduled_date ASC`
3. `priority DESC`
4. `created_at ASC`

**Priority**
1. `priority DESC`
2. `due_date ASC`
3. `created_at ASC`

**Effort**
1. `effort_points ASC`
2. `priority DESC`
3. `created_at ASC`

**Complexity**
1. `complexity ASC`
2. `priority DESC`
3. `created_at ASC`

**Created**
- `created_at DESC`

---

## 7. API Specification (REST, JSON)

### Domains

**GET /api/domains**  
Returns all domains ordered by `sort_order`.

**POST /api/domains**  
Create domain.

**PATCH /api/domains/:id**  
Rename, enable/disable, or change `sort_order`.

**POST /api/domains/reorder**  
Body:
```json
{ "ordered_domain_ids": ["d1","d2","d3"] }
```

---

### Tasks

**GET /api/tasks**
Query params:
- `status=open|completed|archived`
- `sort=manual|due_date|scheduled_date|priority|effort|complexity|created`

**POST /api/tasks**
```json
{
  "title": "Draft proposal",
  "domain_id": "…",
  "priority": 5,
  "effort_points": 3
}
```

**PATCH /api/tasks/:id**  
Partial updates allowed.

**POST /api/tasks/:id/complete**

**POST /api/tasks/:id/reopen**

**POST /api/tasks/:id/archive**

**POST /api/tasks/:id/restore**

**POST /api/domains/:domain_id/tasks/reorder**
```json
{ "ordered_task_ids": ["t1","t2","t3"] }
```

---

## 8. UI Requirements

### Primary Screen: Tasks
- Tasks grouped by domain
- Domain headers show count
- Inline “Add Task” per domain
- Global Add Task action
- Filter toggle: Open / Completed / Archived
- Sort dropdown
- Manual reorder enabled only when:
  - filter = Open
  - sort = Manual

### Task Row
- Title
- Metadata chips (only if present)
- Complete toggle
- Edit
- Delete (archive)

---

## 9. Seed Data

Seed domains (with initial sort order):
1. Body
2. Space
3. Mind
4. Plan
5. Connect
6. Attack
7. Create
8. Learn
9. Manage

---

## 10. Forward Compatibility Notes
- `scheduled_date` and `due_date` retained for future Day/Itinerary logic
- Soft-delete preserves historical integrity
- Domain model maps directly to future itinerary sections

---

# Agent-Ready Implementation Checklist

## Phase 1 — Foundation
- [ ] Database schema + migrations
- [ ] Seed domains
- [ ] Base API scaffolding
- [ ] Auth stub or single-user assumption with `user_id`

## Phase 2 — Domains
- [ ] List domains
- [ ] Rename domain
- [ ] Reorder domains
- [ ] Disable/enable domain

## Phase 3 — Tasks
- [ ] Create task (domain required)
- [ ] Edit task
- [ ] Complete / reopen task
- [ ] Archive / restore task

## Phase 4 — Sorting & Grouping
- [ ] Group tasks by domain
- [ ] Implement all sort modes
- [ ] Manual reorder within domain

## Phase 5 — UI Polish
- [ ] Hide completed by default
- [ ] Completed & archived filters
- [ ] Inline add per domain
- [ ] Empty states

---

# Test Plan (v0.1)

### Unit Tests
- Task creation validation
- State transitions (complete, reopen, archive)
- Sorting logic per mode
- Manual reorder stability

### Integration Tests
- Domain reorder persistence
- Task domain reassignment
- Archive/restore flows

### Manual QA
- Create tasks across all domains
- Switch sort modes
- Reorder tasks manually
- Complete → reopen → archive → restore
- Verify completed tasks hidden by default

---

End of document.
