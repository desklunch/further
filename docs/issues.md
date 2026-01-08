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
