# Issue Log

Documented issues with diagnosis, root cause, and resolution. Review to avoid repeating past mistakes.

---

## Template

When logging an issue, use this format:

```
### Issue: [Brief Title]
**Date**: YYYY-MM-DD
**Checkpoint**: `abc123`

**Summary**: What was the observed problem?

**Diagnosis**: How was the issue investigated?

**Root Cause**: What was the underlying cause?

**Resolution**: What was done to fix it?

**New Guidelines**: Any principles established? (Also add to guidelines.md)
```

---

## Resolved Issues

### Issue: Cannot drop tasks onto collapsed domains
**Date**: 2026-01-14
**Checkpoint**: `8689c059`

**Summary**: When dragging a task over a collapsed domain, the domain was not recognized as a drop target. Tasks would "skip over" collapsed domains entirely.

**Diagnosis**: 
1. First tried conditional ref application - didn't help
2. Used architect tool for deep analysis
3. Found that both DomainHeader and SortableTaskList registered droppables with the same ID pattern

**Root Cause**: Duplicate droppable IDs. Both components used `domain-drop-${domainId}` as the droppable ID. When dnd-kit encounters duplicate IDs, only the first registration wins. Since SortableTaskList remains mounted (just hidden) when collapsed, its droppable registration took precedence over the header's.

**Resolution**: 
- Changed DomainHeader's droppable ID to `domain-header-drop-${domain.id}`
- Changed data type from `domain` to `domain-header`
- Updated collision detection to prioritize `domain-header-drop-` zones
- Updated handleDragOver and handleDragEnd to recognize `domain-header` type

**New Guidelines**: 
- Never use duplicate droppable IDs in dnd-kit - each droppable must have a unique ID
- When adding droppable zones to components that may coexist with other droppables, use distinct ID prefixes
- Always apply refs unconditionally; use the `disabled` prop to control active state

---

### Issue: Drag-and-drop tasks snap back after drop
**Date**: 2026-01-08
**Checkpoint**: `2dc25c41`

**Summary**: When dragging tasks to reorder them, the UI would briefly show the new position but then snap back to the original order.

**Diagnosis**: Reviewed the optimistic update flow in `handleDragEnd`. The `setOptimisticTasks(newTasks)` was being called with tasks that had updated `domainSortOrder` values, but the UI wasn't reflecting the change.

**Root Cause**: The `tasksByDomain` memo was grouping tasks by domain but not sorting them by `domainSortOrder`. Even though the optimistic tasks had correct sort order values, the memo iterated the array in its original order.

**Resolution**: Added sorting by `domainSortOrder` inside the `tasksByDomain` memo:
```typescript
Object.keys(grouped).forEach((domainId) => {
  grouped[domainId].sort((a, b) => a.domainSortOrder - b.domainSortOrder);
});
```

**New Guidelines**: 
- Always sort by `domainSortOrder` when grouping tasks by domain for manual ordering
- Ensure memos depend on the combined state (`optimisticTasks ?? serverTasks`), not just server state
