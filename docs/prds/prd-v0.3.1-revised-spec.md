# PRD v0.3.1 — Continuity, Follow-Through, and Correction (Revised)

This document defines **PRD v0.3.1**, a focused refinement release following v0.3.0.
It incorporates real usage feedback and adds missing working-set controls while preserving
the system's core principles: passive encouragement, no ceremony, and explicit intent.

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
1. Unresolved/carryover task visibility in Today (chained across days)
2. Add-to-Today action from Tasks view (assignment-based)
3. Remove-from-Today (unassign) action for today-assigned tasks
4. Dismiss-carryover action for unresolved tasks
5. Retroactive completion ("completed yesterday")
6. Minor visual affordances to support the above

### Explicitly Out of Scope
- Close Day or review flows
- Auto-carryover or rescheduling
- Notifications or reminders
- Habit analytics or streaks
- Itinerary sections or timeboxing

---

## 3. Definitions

### 3.1 "Visible on Today"
A task is visible on Today if:
- `task.scheduled_date == today`, OR
- `task_day_assignment(date=today)` exists, OR
- Task qualifies as **carryover** (see §3.3)

### 3.2 "Last Visible Date"
The last visible date for a task is determined by:
- The most recent `task_day_assignment.date` for that task, OR
- The `scheduled_date` if it is in the past

> **Clarification:** Both past `scheduled_date` and past assignments contribute to visibility history.

### 3.3 "Carryover" (Unresolved from Prior Days)
A task is **carryover** if:
- It has a last visible date < today
- It is still `status = open` and `archivedAt IS NULL`
- It does not have `scheduled_date == today`
- It does not have `carryover_dismissed_until >= today`

> **Clarification:** Carryover is **chained**—tasks remain visible until completed, rescheduled to a future date, or explicitly dismissed. They do not disappear after one day.

---

## 4. Carryover Visibility

### 4.1 Detection Logic
A task qualifies as carryover if it meets all criteria in §3.3.

To determine the "last visible date":
1. Find the most recent `task_day_assignment.date` for the task
2. If `scheduled_date` is in the past and more recent, use that instead
3. The task is carryover if this date < today

### 4.2 Today Placement
Within each Domain section in Today, tasks must be ordered as:
1. **Carryover** (unresolved from prior days)
2. **Scheduled for today** (`scheduled_date == today`)
3. **Added to today** (`task_day_assignment(date=today)`)

Inbox remains below all domains.

### 4.3 Visual Treatment
- **Label placement:** On each task row (not as a subsection header)
- **Label text:**
  - If last visible date = yesterday → `From yesterday`
  - If last visible date < yesterday → `From earlier`
- Subtle visual emphasis only
- No failure language or warning icons

> **Clarification:** Row-level labels support scanning. Tasks in the same domain may have different recency, so subsection headers would be inaccurate.

---

## 5. Working Set Controls (Today Assignments)

### 5.1 Add to Today (from Tasks View)
From the Tasks view, every open task must support **Add to Today**:

- Creates `task_day_assignment(task_id, today)`
- Does **not** modify `scheduled_date`
- Is idempotent (silently succeeds if already assigned)
- Causes immediate visibility in Today

**UI locations (priority order):**
1. **Required:** Inline action on each task row in Tasks view
2. **Recommended:** Also available in TaskEditDrawer

**Idempotency behavior:**
- Prefer showing "On Today" state / disabling button when already assigned
- If action is invoked anyway, API returns 200 OK with unchanged state
- No toast or error feedback for duplicate adds

### 5.2 Remove from Today (Unassign)

For tasks visible on Today **because of a task_day_assignment(date=today)**:

- Provide a **Remove from Today** action
- Deletes the corresponding `task_day_assignment(date=today)`
- Does **not** modify:
  - `scheduled_date`
  - task status
  - task domain or ordering
- Task may still appear if it qualifies as carryover

> **Clarification:** This action only removes today's assignment. It does not affect carryover visibility from prior days.

### 5.3 Dismiss Carryover

For tasks visible on Today **as carryover** (from prior days):

- Provide a **Dismiss** (or "Not today") action
- Sets `task.carryover_dismissed_until = today`
- Task no longer appears as carryover until:
  - Re-added via Add to Today, OR
  - Rescheduled to a future date
- Does **not**:
  - Complete or archive the task
  - Modify `scheduled_date`
  - Delete any historical assignments

> **Clarification:** This is distinct from Remove-from-Today. You cannot "remove" carryover by deleting yesterday's assignment—that would be incorrect history.

### 5.4 Interaction with Scheduled Tasks

- If a task is visible on Today due to `scheduled_date == today`:
  - Do **not** show Remove-from-Today (no assignment to remove)
  - Do **not** show Dismiss (it's scheduled, not carryover)
- If a task has both a future `scheduled_date` and a Today assignment:
  - Removing the assignment hides it from Today
  - Scheduled date remains unchanged

---

## 6. Retroactive Completion (Yesterday Only)

### 6.1 Supported Behavior
When completing a task that is **carryover**:

- **Default:** Mark completed today (standard checkbox click)
- **Secondary option:** Mark completed as of yesterday

### 6.2 UI Pattern

- Only show the backdate option for tasks in the carryover bucket
- **Recommended UX:** Small dropdown/caret next to checkbox, or hover action menu
  - Option text: "Mark complete (yesterday)"
- Avoid dialogs or question-asking toasts

> **Clarification:** Keep it literal and one extra click at most. No confirmation flows.

### 6.3 Constraints
- Backdating allowed **only to yesterday**
- No arbitrary historical backdating
- Completing as of yesterday:
  - Sets `completed_at` to a timestamp on yesterday's date (e.g., yesterday 23:59:59)
  - Does not modify assignments or scheduling

---

## 7. Behavioral Rules

1. Carryover tasks remain visible until completed, rescheduled, or dismissed
2. Tasks may be freely added to or removed from Today
3. Remove-from-Today never modifies scheduling intent
4. Add-to-Today never modifies scheduling intent
5. Dismiss-carryover allows intentional deferral without archiving
6. Retroactive completion is optional and never forced
7. No new prompts, reminders, or review steps introduced

---

## 8. Data Model Impact

### Schema Changes
Add one nullable field to the `tasks` table:

```
carryover_dismissed_until: date (nullable)
```

When set to a date >= today, the task is excluded from carryover visibility.

### Rationale
- Simplest approach: single field on existing table
- Avoids new junction table
- Dismissal is per-task, not per-day (most recent dismissal wins)

### No Other Changes
- No new tables required
- Existing `task_day_assignments` table unchanged

---

## 9. API Expectations

### Existing Endpoints (modified)
- `GET /api/today` — Must compute carryover dynamically:
  - Find tasks with last visible date < today
  - Exclude if `carryover_dismissed_until >= today`
  - Include carryover bucket label per task
- `POST /api/tasks/:id/complete` — Accept optional `completed_as_of: 'today' | 'yesterday'`

### Assignment Endpoints
- `POST /api/task-day-assignments` — Idempotent (200 OK if exists)
- `DELETE /api/task-day-assignments/:id` — Standard deletion

### New Endpoint
- `POST /api/tasks/:id/dismiss-carryover` — Sets `carryover_dismissed_until = today`

---

## 10. Validation Checklist

- [ ] Carryover tasks appear on Today with correct label (`From yesterday` / `From earlier`)
- [ ] Carryover persists across multiple days until resolved
- [ ] Tasks can be added to Today from Tasks view (row action)
- [ ] Tasks can be removed from Today (today-assignment only)
- [ ] Carryover tasks can be dismissed without archiving
- [ ] Scheduled-today tasks cannot be "removed" or "dismissed"
- [ ] Retroactive completion sets correct date
- [ ] Add-to-Today is idempotent with appropriate UI state
- [ ] No additional friction vs v0.3.0

---

## 11. Acceptance Criteria

v0.3.1 is complete when:

- Today reflects both intent and flexibility
- Users can revise daily focus without rescheduling
- Follow-through is encouraged passively via carryover visibility
- Carryover can be intentionally dismissed without completing/archiving
- Completion records match reality (retroactive option available)
- The system remains lightweight and non-judgmental

---

End of PRD v0.3.1 (Revised).
