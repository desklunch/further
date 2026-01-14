# PRD v0.2 — Today, Habits, Inbox & Scheduling (Revised)

This document is the **authoritative, agent-ready specification** for PRD v0.2.
It supersedes all prior v0.2 drafts and incorporates clarification decisions and edge-case resolutions.

This file is intended to be used **verbatim** as an instruction prompt for an AI software development agent.

---

## 1. Objective

Extend the v0.1 Domains & Tasks core with a **thin daily execution layer** that enables:
- clear daily focus,
- menu-based habits,
- inbox triage,
- and meaningful scheduling,

without introducing itineraries, timeboxing, or end-of-day ceremony.

---

## 2. Design Principles (Non-Negotiable)

1. **Today is a lens, not a container**
2. **Tasks remain the system of record**
3. **Out of mind = scheduled**
4. **Habits are not tasks**
5. **Execution (Today) and grooming (Tasks) are separate**
6. **No ceremony, no streaks, no moral framing**

---

## 3. Scope

### In Scope
- Today View (default landing page)
- Inbox / triage
- Habits (daily choice sets)
- Scheduling semantics
- Task assignment to Today (thin)
- Valence + effort model updates
- Tasks View updates
- Lightweight undo for high-risk actions

### Out of Scope
- Itineraries / sections
- Durations / timeboxing
- Close Day
- Analytics / streaks
- Recurring tasks (beyond habits)
- Subtasks / continuation
- Projects / areas

---

## 4. Core Concepts

### 4.1 Today

Today represents the **current local calendar date** and acts as a temporary execution surface.

Today shows, in order:
1. Habits
2. Tasks scheduled for today
3. Inbox items (untriaged)
4. Tasks explicitly added to today

Today never owns tasks.

---

### 4.2 InboxItem (Lifecycle Clarified)

InboxItem is a **transient intake object**.

#### InboxItem states
- `untriaged`
- `triaged`

InboxItems appear **only in Today** while untriaged.

#### Triage outcomes

##### Add to Today
- Convert InboxItem → Task
- Require domain selection if missing
- Create TaskDayAssignment(task_id, today)
- Mark InboxItem as triaged
- InboxItem disappears from Today immediately

##### Schedule
- Convert InboxItem → Task
- Set Task.scheduled_date = chosen future date
- Mark InboxItem as triaged
- InboxItem disappears from Today immediately
- Task will reappear on Today when scheduled_date == today

##### Leave
- InboxItem remains untriaged
- Continues to appear in Today
- No automatic aging
- Optional action: Archive InboxItem (does not create Task)

---

### 4.3 Habits (Daily Choice Sets)

Habits are **daily menu-based actions**, not tasks.

Each HabitDefinition includes:
- name
- domain
- selection_type: `single` or `multi`
- min_required (multi-select only)

Each day creates (on first interaction) a HabitDailyEntry:
- date
- selected_option_ids[]

Completion is implicit via selection.

Habits appear every day regardless of prior completion.

---

### 4.4 Task–Day Assignment (Precedence Clarified)

TaskDayAssignment is a minimal mapping:
- task_id
- date

#### Visibility rules
A task appears on Today if **either**:
- Task.scheduled_date == today
- TaskDayAssignment(date=today) exists

If both exist:
- Assignment controls visibility on its date
- Scheduled_date controls visibility on its date

Add to Today **does not modify scheduled_date**.

---

## 5. Data Model Changes

### New Tables
- InboxItem
- HabitDefinition
- HabitOption
- HabitDailyEntry
- TaskDayAssignment

### Task Model Updates
- Replace `complexity` with `valence`
  - -1 = dislike
  - 0 = neutral (default)
  - 1 = enjoy
- Make `effort` nullable (NULL = unknown)
- scheduled_date drives visibility rules

---

## 6. View Definitions

### 6.1 Today View (Landing Page)

Render in this exact order:
1. Habits
2. Scheduled Today (scheduled_date == today)
3. Inbox (untriaged)
4. Added to Today (TaskDayAssignment)

Rules:
- Completing a task removes it from Today
- Scheduling future removes from Today immediately
- Archiving removes from Today immediately
- Today recalculates at local midnight

---

### 6.2 Tasks View (Updated)

Filters:
- **All** (open scheduled + open unscheduled)
- **Open** (open unscheduled only)
- **Scheduled** (open scheduled only)
- Completed
- Archived

Tasks are grouped by Domain.

Valence is displayed via icons (not numbers).
Effort shows "Effort ?" when unknown.

Completing tasks works from both views.

---

## 7. Behavioral Rules (Hard Requirements)

1. Scheduled-future tasks never appear in Today
2. Scheduling removes items from Today immediately
3. Tasks scheduled for today appear automatically
4. Add to Today never modifies scheduled_date
5. Completing a task removes it from Today
6. Habits appear daily with no failure state
7. InboxItems must be triaged to leave Today

---

## 8. Time & Timezone Handling

- All date-based logic uses **browser local date**
- Dates are stored as date-only (YYYY-MM-DD)
- UTC timestamps used only for created/updated/completed metadata

---

## 9. Undo Policy (Lightweight)

Implement toast-based undo (5–10s) for:
- Archive task
- Schedule / reschedule task
- Inbox triage (Add to Today, Schedule)

No general undo framework required.

---

## 10. Migration Plan

### Valence Migration
Map existing complexity values:
- complexity 1 → valence -1
- complexity 2 → valence 0
- complexity 3 → valence +1

### Effort Migration
- Existing effort values preserved
- New tasks default to effort = NULL

No retroactive habit or inbox data created.

---

## 11. Performance Requirements

Required indexes:
- tasks(user_id, status)
- tasks(user_id, scheduled_date)
- task_day_assignments(user_id, date)
- habit_daily_entries(user_id, date)
- inbox_items(user_id, status)

Today endpoint must be implemented as multiple indexed queries, not a monolithic join.

---

## 12. Acceptance Criteria

v0.2 is complete when:
- Today is the default entry point
- Inbox items disappear via triage, not magic
- Habits no longer require daily recreation
- Scheduling feels meaningful and out-of-mind
- Tasks remain the single source of truth

---

End of PRD v0.2.
