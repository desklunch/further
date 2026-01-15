# PRD v0.3.0 — Domain-Sequential Today & Inline Grooming

This document defines **PRD v0.3.0**, the next functional phase following v0.2 and v0.2.1.
It assumes **v0.2.1 stability fixes are complete** and builds directly on the existing codebase
(`desklunch/further`) without introducing new architectural primitives.

This PRD is written to minimize clarification needs and is intended to be used **verbatim**
by an AI software development agent.

---

## 1. Objective

Improve **daily execution flow** by:
- aligning the Today view with the intended **domain-as-day-sequence** mental model,
- enabling **inline grooming and editing** where work naturally originates,
- improving habit completion signaling without adding ceremony,
- strengthening Inbox data integrity and traceability.

This release is about **flow refinement**, not new systems.

---

## 2. Design Principles (Additive to v0.2)

1. **Domains represent chronological phases of a day**
2. **Today should bias attention toward what remains**
3. **Execution surfaces must allow lightweight grooming**
4. **Habits should disappear psychologically once satisfied**
5. **Inbox is raw intake, not backlog**

---

## 3. Scope

### In Scope
- Domain-grouped Today view
- Habit satisfied-state UX refinements
- Inline task editing from Today
- Inline InboxItem title editing
- Habit and HabitOption management UI
- Inbox data integrity improvements

### Explicitly Out of Scope
- Itineraries / timeboxing
- Close Day / end-of-day review
- Habit streaks or analytics
- Capacity limits
- Recurring tasks beyond habits

---

## 4. Today View Redesign (Primary Change)

### 4.1 High-Level Structure

Replace the current sectioned Today layout with **domain-grouped rendering**.

Render domains in `domain.sort_order`, each acting as a chronological block of the day.

For each domain, render in order:

1. Habits belonging to that domain
2. Tasks scheduled for today in that domain
3. Tasks added-to-today in that domain

After all domains:
4. Inbox (untriaged items)

---

### 4.2 Domain Section Behavior

- Domain headers remain visible at all times
- If a domain has no content for today, it may be visually collapsed
- Domains are rendered even if they contain only habits

---

## 5. Habit UX Refinements

### 5.1 Satisfied State

A habit is considered **Satisfied** when:
- Single-select: one option selected
- Multi-select: selected count ≥ `min_required`

### 5.2 Collapse Rules

- When a habit becomes satisfied:
  - Collapse only the **options list**
  - Keep the habit card visible
  - Display summary text: `Satisfied • N selected`
  - Display selected options as chips (1 line max)

- Tapping the habit header toggles expansion
- No automatic full-card collapse

### 5.3 No Quick-Add Options

Do **not** implement quick-add buttons for additional selections.
Expansion is explicit and intentional.

---

## 6. Inline Editing & Grooming (Critical)

### 6.1 Task Editing from Today

- Tasks rendered in Today must expose an **Edit** action
- Edit opens the same task editor used in the Tasks view
- Changes apply immediately and reflect in both views

### 6.2 InboxItem Title Editing

- InboxItem titles must be editable inline in Today
- Interaction pattern:
  - click-to-edit or pencil icon
  - Enter to save, Escape to cancel
- Editing does not change InboxItem status

### 6.3 Inbox → Task Conversion Flow

When converting an InboxItem to a Task (Add to Today or Schedule):

1. Require domain selection if not already specified
2. Convert InboxItem → Task
3. Create TaskDayAssignment OR set scheduled_date
4. Immediately open task editor (drawer/modal)
5. Mark InboxItem as `converted`

This prevents context switching to Tasks for basic grooming.

---

## 7. Habit Management UI

### 7.1 New /habits Page

Introduce a dedicated Habit Management surface at `/habits`.

Supported operations:
- Create habit
- Edit habit:
  - name
  - domain
  - selection_type
  - min_required
- Manage HabitOptions:
  - rename option
  - reorder options (optional but recommended)

This UI is separate from Today.

---

## 8. Inbox Data Integrity Improvements

### 8.1 InboxItem Status Expansion

Replace current binary status with:

- `untriaged`
- `converted`
- `dismissed`

### 8.2 Task Source Tracking

Add optional field on Task:
- `source_inbox_item_id` (nullable FK)

Set when a task is created via Inbox conversion.

This enables:
- auditing task origins
- future analytics
- debugging naming evolution

---

## 9. Data Model Changes (v0.3.0)

### InboxItem
- add `status = untriaged | converted | dismissed`

### Task
- add `source_inbox_item_id` (nullable)

No new core entities introduced.

---

## 10. Behavioral Rules (Hard Requirements)

1. Habits that are satisfied should de-emphasize visually
2. Today must group content by domain before inbox
3. Inbox must remain below all domains
4. Inline edits must not require navigation to Tasks
5. Inbox dismissal must not create tasks
6. Inbox conversion must mark status = converted
7. Task source tracking must be set only for inbox-created tasks

---

## 11. Acceptance Criteria

v0.3.0 is complete when:

- Today visually aligns with domain sequencing
- Completed habits naturally fade from attention
- Tasks and inbox items can be groomed in-place
- Habit definitions can be edited without touching Today
- Inbox integrity is preserved with clear outcomes

---

End of PRD v0.3.0.
