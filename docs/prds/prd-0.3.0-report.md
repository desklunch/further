# PRD v0.3.0 Implementation Report

## Overview
PRD v0.3.0 - Domain-Sequential Today & Inline Grooming has been fully implemented.

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| 4.1 Domain-grouped Today view | Complete | Domains sorted by sortOrder, each shows habits → scheduled → added tasks |
| 4.2 Domain section behavior | Complete | Empty domains show "No items for today" message |
| 5.1 Habit satisfied state | Complete | Single-select: 1+ option; Multi-select: minRequired+ options |
| 5.2 Habit collapse rules | Complete | Options collapse when satisfied, show summary chips |
| 5.3 No quick-add options | Complete | Expansion is explicit |
| 6.1 Task editing from Today | Complete | Click task title opens TaskEditDrawer |
| 6.2 InboxItem title editing | Complete | Click-to-edit inline in Today view |
| 6.3 Inbox→Task conversion flow | Complete | Domain selection dialog, creates task with sourceInboxItemId, opens editor |
| 7.1 Habits page enhancement | Complete | Edit name/domain/selectionType/minRequired inline |
| 7.2 Habit options management | Complete | Rename options inline, add/delete options |
| 8.1 InboxItem status expansion | Complete | untriaged/converted/dismissed (deprecated "triaged") |
| 8.2 Task sourceInboxItemId | Complete | Tracks inbox origin on converted tasks |

## Architecture Changes

### Schema Changes
- `InboxItem.status`: Changed from "untriaged/triaged" to "untriaged/converted/dismissed"
- `Task.sourceInboxItemId`: New nullable foreign key linking to originating InboxItem

### Backend Changes
- `POST /api/inbox/:id/triage/add-to-today`: Creates task assigned to today, returns created task
- `POST /api/inbox/:id/triage/schedule`: Creates task with scheduledDate, returns created task
- `POST /api/inbox/:id/dismiss`: Marks inbox item as dismissed
- `PATCH /api/habits/options/:id`: Updates habit option label

### Frontend Changes
- Today view (`/`) completely redesigned with domain grouping
- Habit cards with satisfied state collapse and summary chips
- TaskEditDrawer integration for inline task editing
- Inline inbox title editing with click-to-edit pattern
- Domain selection dialog for inbox conversion
- Enhanced habits page with inline editing

## Key Decisions

1. **Domain grouping**: Each domain section shows all content types (habits, scheduled, added) in order
2. **Inbox at bottom**: Inbox triage section appears after all domain sections
3. **Satisfied habit UX**: Options collapse but card stays visible with summary chips
4. **Conversion tracking**: Tasks created from inbox items track their source for data integrity

## Testing
- E2E tests verified Today view domain grouping
- Habit satisfaction and collapse/expand behavior tested
- Inbox conversion flow with domain selection tested
- Habits page inline editing tested

## Known Limitations
- Habit option reordering not implemented (per PRD out of scope decision)
- No keyboard shortcuts for habit selection

## Next Steps
- Consider adding Close Day / end-of-day review (future PRD)
- Consider habit streaks or analytics (future PRD)
