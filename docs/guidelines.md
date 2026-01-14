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

#### Critical: Unique Droppable IDs
- **Every droppable must have a unique ID** - dnd-kit only registers the first droppable with a given ID
- When multiple components can register droppables for the same logical entity (e.g., a collapsed header vs expanded list), use distinct ID prefixes:
  - `domain-header-drop-${id}` for collapsed domain headers
  - `domain-drop-${id}` for expanded domain lists
- **Always apply refs unconditionally** - use the `disabled` prop to control active state, not conditional ref application

#### Architecture
- **Page-level DndContext**: Single DndContext at page level wrapping all containers
- **Multiple SortableContexts**: Each container has its own SortableContext with its items
- **Container droppables**: Each container uses `useDroppable` for cross-container drops
- **DragOverlay**: Shows ghost of dragged item following cursor

#### Collision Detection
- **Custom detector**: Prioritizes sortable items over container droppables to avoid "dead zones"
- **Implementation**: Use `pointerWithin` first, filter out container IDs (prefix `container-drop-*`) when item collisions exist, fall back to `closestCenter`
```typescript
const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length === 0) return closestCenter(args);
  const itemCollisions = pointerCollisions.filter(
    (c) => !String(c.id).startsWith("container-drop-")
  );
  return itemCollisions.length > 0 ? itemCollisions : pointerCollisions;
};
```

#### Visual Feedback During Drag
- **Ghosted source item**: Dragged item stays visible at 50% opacity in original position (no transform applied)
- **Drop indicator line**: Colored horizontal line shows insertion position
- **No item shifting**: Other items don't animate/shift during drag - only the drop indicator moves
- **End-of-list spacer**: Invisible droppable zone at bottom of target container for easy end drops

#### Drag State Management
```typescript
const [activeItem, setActiveItem] = useState<Item | null>(null);
const [sourceContainerId, setSourceContainerId] = useState<string | null>(null);
const [hoverContainerId, setHoverContainerId] = useState<string | null>(null);
const [dropTarget, setDropTarget] = useState<{ containerId: string; index: number } | null>(null);
```

#### Key Handler Patterns
- **onDragStart**: Set activeItem and sourceContainerId
- **onDragOver**: Compute hoverContainerId and dropTarget (containerId + insertion index)
- **onDragEnd**: Clear all drag state, perform reorder/move mutation

#### Sortable Item Styling
- **No transform during drag**: Only apply opacity, not CSS transform (prevents item shifting)
```typescript
const style = { opacity: isDragging ? 0.5 : 1 };
```

#### Drop Target Types
- `type: "item"` - Hovering over a sortable item
- `type: "container"` - Hovering over empty container area
- `type: "end-zone"` - Hovering over end-of-list spacer

#### Container Highlighting
- Pass `isBeingTargeted` prop to sortable list: `activeItem !== null && hoverContainerId === container.id`
- When true, container shows highlight background (e.g., `bg-accent/30`)
- EndDropZone spacer only renders when `isDragActive && isBeingTargeted`

#### Optimistic Updates
1. Update local state immediately with reordered/moved items
2. Call mutation (reorder or move)
3. On success: invalidate queries to sync with server
4. On error: show toast (local state clears on next server fetch)

#### Within-Container Reorder
Use `arrayMove` from `@dnd-kit/sortable` to reorder items:
```typescript
import { arrayMove } from "@dnd-kit/sortable";
const reordered = arrayMove(containerItems, oldIndex, newIndex);
setLocalItemsByContainer((prev) => ({ ...prev, [containerId]: reordered }));
```

#### Sort by sortOrder
When grouping items by container, always sort each container's items by `sortOrder`:
```typescript
Object.keys(grouped).forEach((containerId) => {
  grouped[containerId].sort((a, b) => a.sortOrder - b.sortOrder);
});
```

### State Management
- **Optimistic fallback pattern**: `const items = optimisticItems ?? serverItems` - use optimistic state when available, fall back to server state
- **Memo dependencies**: Ensure memos like `itemsByContainer` depend on combined state (which includes optimistic), not just server state

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
