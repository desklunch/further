# v0.2.1 PRD Implementation Report

## Summary
This document tracks the implementation status of v0.2.1 (Stability & Correctness Fixes) as defined in `prd-0.2.1-spec.md`.

---

## Fix Status

| Fix | Priority | Description | Status | Notes |
|-----|----------|-------------|--------|-------|
| P0.1 | Critical | Server-side date handling must require explicit date parameter | Complete | 6 endpoints updated |
| P0.2 | Critical | Unique constraint on TaskDayAssignment | Complete | DB constraint + idempotent upsert |
| P0.3 | Critical | Correct domainSortOrder filtering | Complete | Added userId + archivedAt IS NULL |
| P1.1 | Recommended | Batch HabitOption fetching | Complete | Single query replaces N+1 loop |

---

## Implementation Details

### P0.1 - Required Date Parameter

**Endpoints Updated:**
- `GET /api/today` - Now requires `?date=YYYY-MM-DD` query parameter
- `POST /api/inbox/:id/triage/add-to-today` - Now requires `date` in body
- `POST /api/tasks/:id/add-to-today` - Now requires `date` in body
- `DELETE /api/tasks/:id/remove-from-today` - Now requires `?date=YYYY-MM-DD` query parameter
- `GET /api/task-day-assignments` - Now requires `?date=YYYY-MM-DD` query parameter

**Behavior:**
- Missing date parameter returns HTTP 400 with clear error message
- Client must always send local date; server never derives it

**Rationale:**
- Eliminates timezone-related off-by-one bugs near UTC midnight
- Client already computes local date correctly

---

### P0.2 - TaskDayAssignment Uniqueness

**Database Change:**
- Added unique index on `(user_id, task_id, date)` via Drizzle schema

**Application Logic:**
- `createTaskDayAssignment` uses `onConflictDoNothing` to handle race conditions
- If INSERT succeeds, returns new assignment; if conflict, fetches existing
- Eliminates race condition between SELECT and INSERT

**Schema Update (shared/schema.ts):**
```typescript
uniqueIndex("task_day_unique_idx").on(table.userId, table.taskId, table.date)
```

---

### P0.3 - domainSortOrder Computation

**Methods Fixed:**
- `createTask()` - Query now filters by `userId`, `domainId`, `status='open'`, `archivedAt IS NULL`
- `updateTask()` (domain change) - Same filtering applied

**Before:**
```typescript
.where(and(eq(tasks.domainId, task.domainId), eq(tasks.status, "open")))
```

**After:**
```typescript
.where(and(
  eq(tasks.userId, task.userId),
  eq(tasks.domainId, task.domainId),
  eq(tasks.status, "open"),
  isNull(tasks.archivedAt)
))
```

---

### P1.1 - Batch Habit Options

**New Method:**
- `getHabitOptionsByHabitIds(habitIds: string[])` - Fetches all options for multiple habits in one query

**Today Endpoint Optimization:**
- Replaced N+1 loop with single batched query
- Options grouped in memory by habitId

**Performance Impact:**
- N+1 queries reduced to 1 query for habit options
- Daily entries fetch parallelized with options fetch

---

## Validation Checklist

- [x] Today always matches browser-local date (client passes date)
- [x] No duplicate tasks appear in Today (unique constraint enforced)
- [x] Repeated Add-to-Today actions are idempotent (returns existing assignment)
- [x] Task ordering is stable after create/move/archive (proper filtering)
- [x] Habit rendering works with batched option fetch

---

## Acceptance Criteria

- [x] All P0 fixes implemented
- [x] No new user-facing behavior introduced
- [x] Today behavior is deterministic across timezones
- [x] TaskDayAssignment invariants enforced at DB level

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-14 | Initial v0.2.1 implementation complete |
