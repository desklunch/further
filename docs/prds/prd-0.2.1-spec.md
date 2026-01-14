# PRD v0.2.1 — Stability & Correctness Fixes

This document defines **PRD v0.2.1**, a non-feature release focused exclusively on
**correctness, data integrity, and operational stability** following v0.2.

This PRD does **not** introduce new user-facing features.
It provides **explicit instructions** on what to fix and how, based on a full code review of v0.2.

This document is intended to be used verbatim by an AI software development agent or engineer.

---

## 1. Scope & Intent

### In Scope
- Fix date handling bugs related to “Today”
- Enforce data integrity for TaskDayAssignment
- Correct task ordering logic during creation and reassignment
- Minor performance corrections directly related to Today queries

### Explicitly Out of Scope
- UX changes
- New features
- Habits UX refinements
- Domain-grouped Today redesign
- Undo system expansion

---

## 2. P0 Fixes (Mandatory)

### P0.1 — Server-side Date Handling Must Be Local-Date Driven

#### Problem
The server currently derives “today” using:

```
new Date().toISOString().split("T")[0]
```

This produces a **UTC date**, which diverges from the browser’s local date and violates
the v0.2 requirement that Today recalculates at **local midnight**.

#### Required Fix
- All endpoints that depend on a date (Today, Add-to-Today, Schedule, HabitDailyEntry)
  **must require an explicit `date` parameter from the client**.
- The server must **never derive a default date implicitly**.
- If `date` is missing:
  - return HTTP 400 with a clear error message.

#### Rationale
- The client already computes local date correctly.
- Eliminating server-side date inference prevents silent off-by-one-day bugs.

---

### P0.2 — Enforce Uniqueness for TaskDayAssignment

#### Problem
The `task_day_assignments` table does not enforce uniqueness for:

```
(user_id, task_id, date)
```

This allows duplicate assignments, violating v0.2 invariants and causing
duplicate task rendering in Today.

#### Required Fix
1. Add a **database-level unique constraint** on:
   - `(user_id, task_id, date)`
2. Update storage logic so that:
   - Creating an assignment is idempotent
   - Duplicate inserts are either ignored or resolved via upsert

#### Rationale
- This constraint is fundamental to Today correctness.
- Application-level checks are insufficient alone.

---

### P0.3 — Correct domainSortOrder Computation When Creating or Moving Tasks

#### Problem
When computing `domainSortOrder`:
- Queries do not consistently filter by `user_id`
- Archived tasks may be included
- This can produce incorrect ordering and collisions

#### Required Fix
When calculating the next `domainSortOrder`, always scope by:
- `user_id`
- `domain_id`
- `status = open`
- `archived_at IS NULL`

This applies to:
- Task creation
- Task domain reassignment

#### Rationale
- Ordering must be stable and user-scoped.
- Archived tasks must not affect visible ordering.

---

## 3. Secondary Fixes (Strongly Recommended)

### P1.1 — Batch HabitOption Fetching in Today Endpoint

#### Problem
The Today endpoint fetches habit options in a loop,
producing N+1 queries as habits scale.

#### Recommended Fix
- Fetch all HabitOptions for the user in a single query
- Group them in memory by habit_id
- Attach to HabitDefinitions before response assembly

This is a performance optimization, not a functional change.

---

## 4. Validation Checklist

Before merging v0.2.1, verify:

- [ ] Today always matches browser-local date
- [ ] No duplicate tasks appear in Today
- [ ] Repeated Add-to-Today actions are idempotent
- [ ] Task ordering is stable after create/move/archive
- [ ] Habit rendering still works with batched option fetch

---

## 5. Acceptance Criteria

v0.2.1 is complete when:
- All P0 fixes are implemented
- No new user-facing behavior is introduced
- Today behavior is deterministic across timezones
- TaskDayAssignment invariants are enforced at the DB level

---

End of PRD v0.2.1.
