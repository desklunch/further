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

### Drag-and-Drop (dnd-kit)

#### Architecture
- **Page-level DndContext**: Single DndContext at page level wrapping all domains
- **Multiple SortableContexts**: Each domain has its own SortableContext with its tasks
- **Domain droppables**: Each domain uses `useDroppable` for cross-domain drops
- **DragOverlay**: Shows ghost of dragged item following cursor

#### Collision Detection
- **Custom detector**: Prioritizes task items over domain containers to avoid "dead zones"
- **Implementation**: Use `pointerWithin` first, filter out `domain-drop-*` IDs when task collisions exist, fall back to `closestCenter`
```typescript
const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length === 0) return closestCenter(args);
  const taskCollisions = pointerCollisions.filter(
    (c) => !String(c.id).startsWith("domain-drop-")
  );
  return taskCollisions.length > 0 ? taskCollisions : pointerCollisions;
};
```

#### Visual Feedback During Drag
- **Ghosted source item**: Dragged item stays visible at 50% opacity in original position (no transform applied)
- **Drop indicator line**: Blue horizontal line shows insertion position
- **No item shifting**: Other items don't animate/shift during drag - only the drop indicator moves
- **End-of-list spacer**: Invisible droppable zone at bottom of target domain for easy end drops

#### Drag State Management
```typescript
const [activeTask, setActiveTask] = useState<Task | null>(null);
const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
const [hoverDomainId, setHoverDomainId] = useState<string | null>(null);
const [dropTarget, setDropTarget] = useState<{ domainId: string; index: number } | null>(null);
```

#### Key Handler Patterns
- **onDragStart**: Set activeTask and activeDomainId
- **onDragOver**: Compute hoverDomainId and dropTarget (domainId + insertion index)
- **onDragEnd**: Clear all drag state, perform reorder/move mutation

#### SortableTaskItem Styling
- **No transform during drag**: Only apply opacity, not CSS transform (prevents item shifting)
```typescript
const style = { opacity: isDragging ? 0.5 : 1 };
```

#### Drop Target Types
- `type: "task"` - Hovering over a task item
- `type: "domain"` - Hovering over empty domain area
- `type: "end-zone"` - Hovering over end-of-list spacer

#### Domain Highlighting
- Pass `isBeingTargeted` prop to SortableTaskList: `activeTask !== null && hoverDomainId === domain.id`
- When true, domain container shows `bg-accent/30` background
- EndDropZone spacer only renders when `isDragActive && isBeingTargeted`

#### Optimistic Updates
1. Update `localTasksByDomain` state immediately with reordered/moved tasks
2. Call mutation (reorder or move)
3. On success: invalidate queries to sync with server
4. On error: show toast (localTasksByDomain clears on next server fetch)

#### Within-Domain Reorder
Use `arrayMove` from `@dnd-kit/sortable` to reorder tasks:
```typescript
import { arrayMove } from "@dnd-kit/sortable";
const reordered = arrayMove(domainTasks, oldIndex, newIndex);
setLocalTasksByDomain((prev) => ({ ...prev, [domainId]: reordered }));
```

#### Sort by domainSortOrder
When grouping tasks by domain, always sort each domain's tasks by `domainSortOrder`:
```typescript
Object.keys(grouped).forEach((domainId) => {
  grouped[domainId].sort((a, b) => a.domainSortOrder - b.domainSortOrder);
});
```

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
