# v0.2 PRD Implementation Report

## Summary
This document tracks the implementation status of v0.2 (Today, Habits, Inbox & Scheduling) as defined in `prd-v0.2.b-revised-spec.md`.

---

## Phase Status

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| Phase 1a | Schema updates (valence, effort nullable, new entities) | Not Started | |
| Phase 1b | Database migration | Not Started | |
| Phase 2a | Storage layer CRUD methods | Not Started | |
| Phase 2b | API routes | Not Started | |
| Phase 3 | Today View page | Not Started | |
| Phase 4 | Habits management page | Not Started | |
| Phase 5 | Tasks View updates | Not Started | |
| Phase 6 | Toast-based undo | Not Started | |
| Phase 7 | Routing updates | Not Started | |

---

## Feature Implementation Status

### Data Model Changes

| Feature | Status | Notes |
|---------|--------|-------|
| Replace complexity with valence (-1/0/1) | Not Started | Migration: 1→-1, 2→0, 3→+1 |
| Make effort nullable | Not Started | NULL = unknown |
| InboxItem entity | Not Started | States: untriaged, triaged |
| HabitDefinition entity | Not Started | Includes selection_type (single/multi) |
| HabitOption entity | Not Started | |
| HabitDailyEntry entity | Not Started | Stores selected_option_ids[] |
| TaskDayAssignment entity | Not Started | (task_id, date) mapping |

### Today View

| Feature | Status | Notes |
|---------|--------|-------|
| Habits section | Not Started | |
| Scheduled Today section | Not Started | Tasks where scheduled_date == today |
| Inbox section | Not Started | Untriaged inbox items |
| Added to Today section | Not Started | Tasks with TaskDayAssignment |
| Today as landing page | Not Started | |

### Inbox & Triage

| Feature | Status | Notes |
|---------|--------|-------|
| Create inbox item | Not Started | |
| Triage: Add to Today | Not Started | Convert to Task + TaskDayAssignment |
| Triage: Schedule | Not Started | Convert to Task with scheduled_date |
| Triage: Leave | Not Started | Keep untriaged |
| Archive inbox item | Not Started | Does not create task |

### Habits

| Feature | Status | Notes |
|---------|--------|-------|
| Habits management page (/habits) | Not Started | |
| Create habit with options | Not Started | |
| Single-select habits | Not Started | |
| Multi-select habits | Not Started | |
| Habit completion via selection | Not Started | |
| HabitDailyEntry creation | Not Started | |

### Tasks View Updates

| Feature | Status | Notes |
|---------|--------|-------|
| All filter (open scheduled + unscheduled) | Not Started | Replaces current All |
| Open filter (unscheduled only) | Not Started | |
| Scheduled filter | Not Started | New filter |
| Valence icons | Not Started | -1/0/+1 visual representation |
| Effort unknown state ("?") | Not Started | |

### Undo Support

| Feature | Status | Notes |
|---------|--------|-------|
| Undo archive task | Not Started | Toast-based, 5-10s |
| Undo schedule/reschedule | Not Started | |
| Undo inbox triage | Not Started | |

---

## Architecture Decisions

*To be documented as implementation progresses.*

---

## Deviations from PRD

*None yet.*

---

## Known Limitations

*To be documented as implementation progresses.*

---

## Performance Considerations

Required indexes (from PRD):
- `tasks(user_id, status)`
- `tasks(user_id, scheduled_date)`
- `task_day_assignments(user_id, date)`
- `habit_daily_entries(user_id, date)`
- `inbox_items(user_id, status)`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-14 | Initial report created |
