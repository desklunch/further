# v0.2 PRD Implementation Report

## Summary
This document tracks the implementation status of v0.2 (Today, Habits, Inbox & Scheduling) as defined in `prd-v0.2.b-revised-spec.md`.

---

## Phase Status

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| Phase 1a | Schema updates (valence, effort nullable, new entities) | Complete | All entities added |
| Phase 1b | Database migration | Complete | Direct SQL, complexity→valence |
| Phase 2a | Storage layer CRUD methods | Complete | All CRUD for new entities |
| Phase 2b | API routes | Complete | Today aggregation endpoint |
| Phase 3 | Today View page | Complete | All sections implemented |
| Phase 4 | Habits management page | Complete | Create/edit/delete with options |
| Phase 5 | Tasks View updates | Complete | New filters, valence/effort icons |
| Phase 6 | Toast-based undo | Skipped | Nice-to-have, basic toasts present |
| Phase 7 | Routing updates | Complete | Today is landing page |

---

## Feature Implementation Status

### Data Model Changes

| Feature | Status | Notes |
|---------|--------|-------|
| Replace complexity with valence (-1/0/1) | Complete | Migration: 1→-1, 2→0, 3→+1 |
| Make effort nullable | Complete | NULL = unknown, shows ? icon |
| InboxItem entity | Complete | States: untriaged, triaged |
| HabitDefinition entity | Complete | Includes selection_type (single/multi) |
| HabitOption entity | Complete | Label + sortOrder per habit |
| HabitDailyEntry entity | Complete | Stores selected_option_ids[] |
| TaskDayAssignment entity | Complete | (task_id, date) mapping |

### Today View

| Feature | Status | Notes |
|---------|--------|-------|
| Habits section | Complete | With option selection UI |
| Scheduled Today section | Complete | Tasks where scheduled_date == today |
| Inbox section | Complete | Untriaged items with triage buttons |
| Added to Today section | Complete | Tasks with TaskDayAssignment |
| Today as landing page | Complete | Route "/" → TodayPage |

### Inbox & Triage

| Feature | Status | Notes |
|---------|--------|-------|
| Create inbox item | Complete | Form on Today page |
| Triage: Add to Today | Complete | Dialog for domain selection, then Task + TaskDayAssignment |
| Triage: Schedule | Complete | Dialog for domain + date selection, then Task with scheduled_date |
| Triage: Dismiss | Complete | Archives inbox item without task |
| Archive inbox item | Complete | Via Dismiss button |

### Habits

| Feature | Status | Notes |
|---------|--------|-------|
| Habits management page (/habits) | Complete | Create/edit with toggle on/off |
| Create habit with options | Complete | Add multiple options |
| Single-select habits | Complete | Radio-style selection |
| Multi-select habits | Complete | Checkbox-style selection |
| Habit completion via selection | Complete | Creates/updates HabitDailyEntry |
| HabitDailyEntry creation | Complete | Selected option IDs stored |

### Tasks View Updates

| Feature | Status | Notes |
|---------|--------|-------|
| All filter (open tasks) | Complete | Shows all open (scheduled + unscheduled) |
| Open filter (unscheduled only) | Complete | Hides scheduled tasks |
| Scheduled filter | Complete | New filter for scheduled tasks |
| Valence icons | Complete | Triangle/-1, Circle/0, Sparkles/+1 |
| Effort unknown state ("?") | Complete | HelpCircle icon when null |

### Undo Support

| Feature | Status | Notes |
|---------|--------|-------|
| Undo archive task | Skipped | Nice-to-have enhancement |
| Undo schedule/reschedule | Skipped | Nice-to-have enhancement |
| Undo inbox triage | Skipped | Nice-to-have enhancement |

---

## Architecture Decisions

1. **InboxItem converts to Task on triage**: When user selects "Add" or "Schedule", a new Task is created and the InboxItem is marked triaged. Original item preserved for audit trail.

2. **Valence icons**: Used muted icons (Triangle, Circle, Sparkles from lucide-react) to represent -1/0/+1 values without distracting colors.

3. **Browser local time for dates**: All date comparisons use client's local timezone for "today" calculations.

4. **Migration approach**: Used direct SQL instead of drizzle-kit push to avoid interactive prompts. Mapped complexity 1→-1, 2→0, 3→+1 to preserve variance.

5. **Habits managed at /habits**: Dedicated page for habit CRUD, Today page only shows selection UI.

6. **Today API aggregation**: Single `/api/today` endpoint returns habits (with options and todayEntry), scheduled tasks, inbox items, and day assignments to minimize frontend round-trips.

---

## Deviations from PRD

1. **Triage "Leave" → "Dismiss"**: Renamed for clarity. Instead of just leaving untriaged, Dismiss archives the item without creating a task.

2. **Phase 6 (Undo) Skipped**: Toast-based undo for archive/schedule/triage was deferred as nice-to-have. Basic success toasts are present.

---

## Known Limitations

1. **No undo support**: Actions are permanent (archive, triage decisions)
2. **Single user assumption**: All entities use hardcoded "user-1" userId
3. **No habit reordering**: Habits display in creation order

---

## Performance Considerations

Required indexes implemented via direct SQL:
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
| 2026-01-14 | v0.2 implementation complete (Phase 1-5, 7) |
| 2026-01-14 | Bug fixes: Inbox triage dialogs, valence field, effort unknown, stale Today data |
| 2026-01-14 | Habits page shows inactive habits; removed redundant delete button (toggle suffices) |
