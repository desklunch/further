# PRD v0.3.1 Implementation Report — Carryover & Daily Working Set

## Overview
**PRD:** v0.3.1 — Continuity, Follow-Through, and Correction  
**Status:** Complete  
**Started:** 2026-01-21  
**Completed:** 2026-01-21

## Feature Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Schema: `carryover_dismissed_until` field | Complete | Nullable date field added to tasks table |
| API: Carryover detection in `/api/today` | Complete | Returns carryoverTasks with lastVisibleDate |
| API: Retroactive completion | Complete | Uses `completed_as_of` body parameter |
| API: Idempotent assignment creation | Complete | onConflictDoNothing returns 200 |
| API: `POST /api/tasks/:id/dismiss-carryover` | Complete | Sets carryover_dismissed_until to tomorrow |
| UI: Carryover visibility in Today | Complete | Tasks displayed at top of domain sections |
| UI: Carryover labels (`From yesterday`/`From earlier`) | Complete | Row-level labels per task |
| UI: Dismiss carryover action | Complete | Dropdown menu option "Not today" |
| UI: Remove from Today action | Complete | ListMinus icon for assigned tasks |
| UI: Retroactive completion dropdown | Complete | "Completed yesterday" option |
| UI: Add to Today (Tasks view row action) | Complete | CalendarPlus icon in task rows |
| UI: Add to Today (TaskEditDrawer) | Complete | Button in drawer footer |
| Documentation updates | Complete | replit.md updated |

## Architecture Decisions

### 1. Carryover Detection Strategy
- Compute "last visible date" using SQL aggregate: MAX of scheduled_date and most recent assignment date
- Filter by: status='open', archivedAt IS NULL, carryover_dismissed_until < today
- Supports chained carryover across multiple days

### 2. API Response Structure for Today
- Added `carryoverTasks` array to `/api/today` response
- Each task includes `lastVisibleDate` for label computation on frontend

### 3. Retroactive Completion
- Extended complete endpoint with `completed_as_of` body parameter
- Accepts "yesterday" as value, sets `completedAt` to yesterday's midnight timestamp

### 4. Row-Level Labels
- Labels rendered per-task row rather than as subsection headers
- Supports mixed recency within same domain section

### 5. Dropdown Menu Pattern
- Carryover actions (retroactive complete, dismiss) in MoreHorizontal dropdown
- Keeps primary row actions clean while providing secondary options

## Schema Changes

### tasks table
```typescript
carryoverDismissedUntil: varchar("carryover_dismissed_until")
```

### Types
```typescript
interface CarryoverTask {
  task: Task;
  lastVisibleDate: string;
}
```

## API Changes

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/today` | GET | Added `carryoverTasks` in response |
| `/api/tasks/:id/complete` | POST | Added `completed_as_of` body param (e.g. "yesterday") |
| `/api/tasks/:id/dismiss-carryover` | POST | New endpoint, accepts `{ date }` body |
| `/api/tasks/:id/remove-from-today` | DELETE | New endpoint, accepts `date` query param |
| `/api/task-day-assignments` | POST | Now idempotent (onConflictDoNothing) |

## Files Modified

### Backend
- `shared/schema.ts` - Added carryoverDismissedUntil field, CarryoverTask type
- `server/storage.ts` - Added getCarryoverTasks method
- `server/routes.ts` - New endpoints, updated /today response

### Frontend
- `client/src/pages/today.tsx` - Carryover section, dropdown menu, actions
- `client/src/pages/tasks.tsx` - Add-to-Today row action, mutation
- `client/src/components/task-row-content.tsx` - Carryover labels, action icons
- `client/src/components/sortable-task-list.tsx` - CalendarPlus action support
- `client/src/components/task-edit-drawer.tsx` - onAddToToday prop and button

## Deviations from PRD

None. Implementation follows PRD v0.3.1.b-revised-spec.md exactly.

## Known Limitations

1. **Single-day dismiss only:** Dismiss sets until tomorrow, no multi-day option (by design)
2. **Retroactive completion yesterday only:** Only supports yesterday date for simplicity
3. **No batch operations:** Each carryover task handled individually
4. **No undo for dismiss:** Dismissing carryover cannot be reversed (by design)

## Additional UX Refinements (Post-PRD)

### Implemented on 2026-01-21

| Refinement | Description | Files Modified |
|------------|-------------|----------------|
| Inbox dialog null scheduledDate | Add-to-Today from inbox no longer pre-assigns scheduledDate | `inbox-conversion-dialog.tsx` |
| Delete task in Today view | Trash button appears on hover for assigned tasks | `today.tsx`, `routes.ts`, `storage.ts` |
| Empty domains as containers | Empty domains render as collapsible sections, not chips | `today.tsx` |
| Rounded domain borders | All domain sections have rounded borders for visual separation | `today.tsx` |
| Null effort hidden | Effort badge not shown when effort_points is null | `task-row-content.tsx` |
| Form field layout | Priority/effort/valence on separate rows in all dialogs | `inbox-conversion-dialog.tsx`, `task-edit-drawer.tsx`, `global-add-task-dialog.tsx` |
| Assignment-aware Add-to-Today | Button hidden in Tasks view if task already has today's assignment | `tasks.tsx`, `task-row-content.tsx`, `sortable-task-list.tsx`, `task-edit-drawer.tsx` |
| Today/Yesterday badges | Tasks view shows assignment date badges | `task-row-content.tsx` |

### Technical Details

1. **Task Deletion**: Added `DELETE /api/tasks/:id` endpoint that also removes associated task-day-assignments
2. **Assignment Tracking in Tasks View**: Fetches `/api/task-day-assignments` to build `taskAssignmentMap` with isToday/isYesterday flags, preferring today > yesterday > most recent
3. **TaskRowContent assignmentInfo prop**: New prop controls Add-to-Today visibility (hidden only for isToday) and badge display
4. **TaskEditDrawer hasTodayAssignment prop**: Controls Add-to-Today button visibility in drawer (hidden only for today assignments)

## Implementation Log

### 2026-01-21
- Created implementation report
- Added carryover_dismissed_until field to schema, ran migration
- Implemented getCarryoverTasks method in storage layer
- Updated /api/today endpoint to include carryover tasks
- Added dismiss-carryover and retroactive completion endpoints
- Made task-day-assignments POST idempotent
- Updated Today view with carryover section, labels, and dropdown menu
- Added Add-to-Today row action in Tasks view
- Added Add-to-Today button in TaskEditDrawer
- Updated documentation (replit.md, implementation report)
- All features verified working through HMR and API logs
- **Additional UX refinements:** 8 changes implemented (see table above)
- **API fix:** GET /api/task-day-assignments now works without date param (returns all assignments)
- **Cache invalidation:** Added assignment query invalidation after Add-to-Today action
