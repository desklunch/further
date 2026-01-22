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
- `client/src/pages/today.tsx` - Carryover section, dropdown menu, actions, sticky headers
- `client/src/pages/tasks.tsx` - Add-to-Today row action, mutation
- `client/src/components/task-row-content.tsx` - Carryover labels, consolidated dropdown menu, priority/effort icons
- `client/src/components/sortable-task-list.tsx` - CalendarPlus action support, assignment prop
- `client/src/components/task-edit-drawer.tsx` - onAddToToday prop and button
- `client/src/components/priority-icon.tsx` - Custom SVG priority indicator (new)
- `client/src/components/effort-icon.tsx` - Custom SVG effort indicator (new)

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
| Completed tasks visible | Completed tasks remain visible in Today view instead of disappearing | `storage.ts` (getTasksScheduledForDate, getTasksAssignedToDate) |
| Empty domains collapsed by default | Empty domains (no tasks/habits) start collapsed on Today view | `today.tsx` |
| Domain completion indicator | Green checkmark in top right corner when all tasks/habits completed | `today.tsx` |
| Auto-collapse on domain completion | Domain auto-collapses when last incomplete item is completed | `today.tsx` |

### Technical Details

1. **Task Deletion**: Added `DELETE /api/tasks/:id` endpoint that also removes associated task-day-assignments
2. **Assignment Tracking in Tasks View**: Fetches `/api/task-day-assignments` to build `taskAssignmentMap` with isToday/isYesterday flags, preferring today > yesterday > most recent
3. **TaskRowContent assignmentInfo prop**: New prop controls Add-to-Today visibility (hidden only for isToday) and badge display
4. **TaskEditDrawer hasTodayAssignment prop**: Controls Add-to-Today button visibility in drawer (hidden only for today assignments)
5. **Completed Tasks Visibility**: Removed `eq(tasks.status, "open")` filter from `getTasksScheduledForDate` and `getTasksAssignedToDate` methods in storage layer. Tasks are now returned regardless of completion status, filtered only by `archivedAt IS NULL`.
6. **Empty Domains Collapsed by Default**: Added `useEffect` hook in `today.tsx` that initializes `collapsedDomains` Set with empty domain IDs on initial page load only (guarded by `hasInitializedCollapse` flag). This prevents re-collapsing domains during the session when content changes.
7. **Domain Completion Indicator**: Added `isDomainCompleted(domainContent)` helper function that checks if all habits are satisfied AND all tasks are completed. When true, a green `CheckCircle2` icon is displayed in the top-right corner of the domain card using absolute positioning.
8. **Auto-Collapse on Domain Completion**: Added `prevIncompleteCountsRef` (useRef) to track previous incomplete item counts per domain. A useEffect monitors changes: when a domain goes from 1 incomplete item to 0 (i.e., user completes the last item), the domain is automatically added to `collapsedDomains`. Additionally, fully completed domains are collapsed on initial page load.

### Specifications for New Features

#### Completed Tasks Visible (User Specification)
> "On the Today view, I would like tasks that I mark as complete to remain visible"

**Implementation:**
- When a task is completed in Today view, it stays visible in the same domain section
- Completed tasks have strikethrough styling and muted appearance (existing TaskRowContent behavior)
- Domain badges show `completedCount/totalCount` format
- Only archived tasks are hidden; completion does not remove from view

#### Empty Domains Collapsed by Default (User Specification)
> "On the Today view, empty domains should be collapsed by default"

**Implementation:**
- Empty domains (no habits, scheduled tasks, or assigned tasks) render as collapsible sections
- On initial load, empty domains start in collapsed state
- User can expand/collapse by clicking domain header
- Non-empty domains start expanded as before
- Collapse state preserved during session for user-triggered changes

#### Domain Completion Indicator (User Specification)
> "On the Today view, a big green checkmark should be displayed in the top right corner of the domain card/container when all the habits and tasks in the domain are completed/satisfied"

**Implementation:**
- Green `CheckCircle2` icon (24x24px) positioned absolute top-3 right-3 in domain card
- Only displayed when `isDomainCompleted()` returns true:
  - All habits in domain have required selections (satisfied)
  - All tasks in domain have status "completed"
  - Domain has at least one habit or task (no checkmark for empty domains)
- Icon uses `text-green-500` color class
- Data-testid: `icon-domain-complete-${domainId}`

#### Auto-Collapse on Domain Completion (User Specification)
> "On the Today view, when all the tasks and habits in a domain have been completed/satisfied, the domain should be collapsed by default. Additionally, if there is only one task/habit that's incomplete in a domain, the domain should automatically collapse when the user completes that task/habit"

**Implementation:**
- **Initial load behavior:** Fully completed domains are collapsed on page load
- **Dynamic behavior:** When user completes the last incomplete item (going from 1 to 0 incomplete), the domain auto-collapses
- Uses `prevIncompleteCountsRef` (useRef<Map<string, number>>) to track previous incomplete counts
- useEffect compares current vs previous: if prev === 1 && current === 0, collapse domain
- User can still manually expand collapsed domains
- Reopening a task does NOT auto-expand the domain (auto-collapse is one-way on completion)

#### Domain Display Order (User Specification)
> Domains in Today view should respect sortOrder for all domains (both with content and empty)

**Implementation:**
- All domains (with content and empty) are rendered in a unified list sorted by `sortOrder`
- Previously, empty domains were grouped separately after content domains; this violated expected order
- `allDomainsSorted` useMemo combines `domainGroupedContent` and empty domains into one sorted list
- Each domain rendered with correct test ID: `section-domain-${id}` or `section-empty-domain-${id}`

#### Task Sorting Within Domains (User Specification)
> "On the Today view, tasks within a domain should be sorted by scheduled_date (ascending), followed by priority (descending)"

**Implementation:**
- Generic `sortTasks<T extends Task>()` helper function preserves task subtypes (e.g., CarryoverTask)
- **Primary sort:** `scheduledDate` ascending (earlier dates first)
  - Tasks with scheduledDate appear before tasks without
  - Null scheduledDate treated as "last"
- **Secondary sort:** `priority` descending (higher priority first: 3 > 2 > 1)
  - Null priority treated as 0
- Applied to all task arrays: `carryoverTasks`, `scheduledTasks`, `assignedTasks`
- Sort happens in `domainGroupedContent` useMemo before rendering

### Consolidated Task Action Dropdown (2026-01-22)

| Change | Description | Files Modified |
|--------|-------------|----------------|
| Unified dropdown menu | All task actions consolidated into single MoreHorizontal dropdown | `task-row-content.tsx` |
| Assignment prop | TaskRowContent receives assignment prop for internal state derivation | `task-row-content.tsx`, `sortable-task-list.tsx` |
| Callback-gated visibility | Actions only appear when corresponding callbacks provided | `task-row-content.tsx` |
| Carryover badge gating | Carryover badge only shows when carryover callbacks provided (Today view) | `task-row-content.tsx` |

**Dropdown Menu Items:**
- **Edit** - Always visible, opens TaskEditDrawer
- **Archive** - Visible for non-archived tasks, archives the task
- **Restore** - Visible for archived tasks (when onRestore provided)
- **Add to Today** - Visible when not already assigned today, not scheduled for today
- **Remove from Today** - Visible when assigned today (Today view only)
- **Mark complete (yesterday)** - Visible for carryover tasks (Today view only)
- **Not today** - Visible for carryover tasks (Today view only)

**Implementation Details:**
- TaskRowContent derives `isCarryover` and `carryoverDate` internally from `assignment.date` and `task.scheduledDate`
- `isAssignedToday` computed by comparing `assignment.date` to today's date string
- View-specific behavior achieved through callback availability, not explicit view flags

### Custom Priority and Effort Icons (2026-01-22)

| Change | Description | Files Modified |
|--------|-------------|----------------|
| PriorityIcon component | SVG with 3 horizontal stacked bars, fills from bottom based on level | `priority-icon.tsx` |
| EffortIcon component | SVG with 3 ascending vertical bars (bar chart), fills from left based on level | `effort-icon.tsx` |
| Badge replacement | Task rows use icons instead of text-based Badge components | `task-row-content.tsx` |

**Visual Design:**
- Priority: Three horizontal bars stacked vertically; level 1 fills bottom bar, level 2 fills bottom two, level 3 fills all
- Effort: Three vertical bars of ascending height (bar chart pattern); level 1 fills first bar, level 2 fills first two, level 3 fills all
- Filled bars use 100% opacity, unfilled bars use 25% opacity
- Icons inherit currentColor for theme compatibility

### Sticky Domain Headers (2026-01-22)

| Change | Description | Files Modified |
|--------|-------------|----------------|
| Sticky headers | Domain headers stick to top of viewport when scrolling | `today.tsx` |
| Consistent with Tasks view | Uses same top-0 positioning pattern as Tasks page | `today.tsx` |

## Implementation Log

### 2026-01-22
- Added sticky domain headers to Today view (matching Tasks view pattern)
- Consolidated all task actions into single dropdown menu in TaskRowContent
- Added assignment prop to TaskRowContent for internal carryover/today detection
- Created PriorityIcon component (3 horizontal bars, fills from bottom by level)
- Created EffortIcon component (3 ascending vertical bars, fills from left by level)
- Replaced priority/effort text badges with new SVG icons
- Updated transcript.md and implementation report

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
- **Additional UX refinements:** 12 changes implemented (see table above)
- **API fix:** GET /api/task-day-assignments now works without date param (returns all assignments)
- **Cache invalidation:** Added assignment query invalidation after Add-to-Today action
- **Domain sorting fix:** All domains (content and empty) now rendered in unified list by sortOrder
- **Task sorting:** Added `sortTasks()` helper to sort by scheduledDate (asc) then priority (desc)
