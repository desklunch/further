# PRD v0.3.1 — Continuity, Follow-Through, and Correction (Revised)

This document defines **PRD v0.3.1**, a focused refinement release following v0.3.0.
It incorporates real usage feedback and adds missing working-set controls while preserving
the system’s core principles: passive encouragement, no ceremony, and explicit intent.

This PRD is intended to be used **verbatim** by an AI software development agent or engineer.
It assumes completion of v0.2.1 and v0.3.0.

---

## 1. Objective

Improve **continuity of intent across days** and **flexibility of the daily working set** by:

- Keeping unfinished daily work visible until resolved
- Allowing tasks to be freely added to and removed from Today
- Allowing lightweight correction when tasks were completed but not checked off
- Avoiding forced rescheduling or end-of-day rituals

---

## 2. Scope

### In Scope
1. Unresolved-from-yesterday task visibility in Today
2. Add-to-Today action from Tasks view (assignment-based)
3. Remove-from-Today (unassign) action
4. Retroactive completion (“completed yesterday”)
5. Minor visual affordances to support the above

### Explicitly Out of Scope
- Close Day or review flows
- Auto-carryover or rescheduling
- Notifications or reminders
- Habit analytics or streaks
- Itinerary sections or timeboxing
- New data primitives beyond what already exists

---

## 3. Definitions

### 3.1 “Visible on Today”
A task is visible on Today if:
- `task.scheduled_date == today`, OR
- `task_day_assignment(date=today)` exists

### 3.2 “Visible yesterday”
A task was visible yesterday if:
- `task.scheduled_date == yesterday`, OR
- `task_day_assignment(date=yesterday)` existed

---

## 4. Unresolved-From-Yesterday Visibility

### 4.1 Detection Logic
A task is **Unresolved From Yesterday** if:
- It was visible yesterday
- It is still `status = open` and `archivedAt IS NULL`
- It does not have `scheduled_date = today`

No new records are created for unresolved tasks.

### 4.2 Today Placement
Within each Domain section in Today, tasks must be ordered as:
1. Unresolved From Yesterday
2. Scheduled for today
3. Added to today

Inbox remains below all domains.

### 4.3 Visual Treatment
- Label: `From yesterday`
- Subtle visual emphasis only
- No failure language or warning icons

---

## 5. Working Set Controls (Today Assignments)

### 5.1 Add to Today (from Tasks View)
From the Tasks view, every open task must support **Add to Today**:

- Creates `task_day_assignment(task_id, today)`
- Does **not** modify `scheduled_date`
- Is idempotent
- Causes immediate visibility in Today

### 5.2 Remove from Today (Unassign)

For any task visible on Today **because of a task_day_assignment(today)**:

- Provide a **Remove from Today** (or “Unassign”) action
- Deletes the corresponding `task_day_assignment`
- Does **not** modify:
  - `scheduled_date`
  - task status
  - task domain or ordering

### 5.3 Interaction with Scheduled Tasks

- If a task is visible on Today due to `scheduled_date == today`:
  - Do **not** show Remove-from-Today (assignment removal would be confusing)
- If a task has both a future `scheduled_date` and a Today assignment:
  - Removing the assignment hides it from Today
  - Scheduled date remains unchanged

---

## 6. Retroactive Completion (Yesterday Only)

### 6.1 Supported Behavior
When completing a task marked **Unresolved From Yesterday**:

- Default: mark completed today
- Secondary option: mark completed as of yesterday

### 6.2 Constraints
- Backdating allowed **only to yesterday**
- No arbitrary historical backdating
- Completing as of yesterday:
  - sets `completed_at` to a timestamp on yesterday’s date
  - does not modify assignments or scheduling

---

## 7. Behavioral Rules

1. Unresolved tasks remain visible until completed or rescheduled
2. Tasks may be freely added to or removed from Today
3. Remove-from-Today never modifies scheduling intent
4. Add-to-Today never modifies scheduling intent
5. Retroactive completion is optional and never forced
6. No new prompts, reminders, or review steps introduced

---

## 8. Data Model Impact

- No new tables
- No required schema changes
- Behavior implemented via:
  - `tasks`
  - `task_day_assignments`

---

## 9. API Expectations

- Assignment creation and deletion endpoints must be idempotent
- Today endpoint must compute unresolved-from-yesterday dynamically
- Task completion endpoint must accept optional `completed_as_of = today | yesterday`

---

## 10. Validation Checklist

- [ ] Unresolved tasks appear on Today with correct label
- [ ] Tasks can be added to Today from Tasks view
- [ ] Tasks can be removed from Today without side effects
- [ ] Scheduled-today tasks cannot be “removed” erroneously
- [ ] Retroactive completion sets correct date
- [ ] No additional friction vs v0.3

---

## 11. Acceptance Criteria

v0.3.1 is complete when:

- Today reflects both intent and flexibility
- Users can revise daily focus without rescheduling
- Follow-through is encouraged passively
- Completion records match reality
- The system remains lightweight and non-judgmental

---

End of PRD v0.3.1.
