# Design & Technical Guidelines

Principles established during project development. Review before starting any task.

---

## UI/UX Principles

### Form Design
- **Metadata fields on single row**: Priority, effort, and complexity should be displayed horizontally in a grid layout, not stacked vertically
- **ToggleGroup for discrete values**: Use Shadcn ToggleGroup (type="single") for small fixed sets of options (1-3 scales)
- **Calendar date pickers**: Use Shadcn Popover + Calendar for date selection, not native HTML date inputs

### Task Metadata
- **Simplified scales**: Priority, effort, and complexity use 1-3 scale (not 1-5 or 1-8)
- **Always required**: These fields default to 2 and cannot be empty (ToggleGroup prevents deselection)

---

## Technical Principles

### Drag-and-Drop
- **Sort by domainSortOrder**: When grouping tasks by domain, always sort each domain's tasks by `domainSortOrder` to reflect manual ordering
- **Optimistic updates pattern**: 
  1. Clone task array and update relevant fields
  2. Call `setOptimisticTasks(newTasks)` immediately
  3. Add task ID to pending set for visual feedback
  4. Make API call
  5. On success: clear optimistic state, invalidate queries
  6. On error: clear optimistic state, show toast

### State Management
- **Optimistic fallback pattern**: `const tasks = optimisticTasks ?? serverTasks` - use optimistic state when available, fall back to server state
- **Memo dependencies**: Ensure memos like `tasksByDomain` depend on `tasks` (which includes optimistic), not just `serverTasks`

### Data Validation
- **Zod schemas**: Use `createInsertSchema` from drizzle-zod with `.omit()` for auto-generated fields
- **Backend validation**: Always validate request body before storage operations

---

## File Organization

### Component Colocation
- Page-specific components can live in the same file if small
- Extract to separate file when component exceeds ~100 lines or is reused

### Naming Conventions
- Components: PascalCase (`TaskRow.tsx`)
- Utilities: camelCase (`queryClient.ts`)
- Types: PascalCase, suffix with type (`InsertTask`, `UpdateTask`)

---

## Documentation Maintenance

### When to Update docs/
- `guidelines.md` - When establishing new design or technical principles
- `issues.md` - When diagnosing and resolving issues (include root cause)
- `transcript.md` - After each significant change (include checkpoint ID)
- `user-guide.md` - When user-facing features change

### Entry Formats
- **Transcript**: `- **HH:MM UTC** | Checkpoint \`abc123\` | Brief description`
- **Issues**: Summary → Diagnosis → Root Cause → Resolution → New Guidelines
- **Guidelines**: Bullet points, grouped by category
