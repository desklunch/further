import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableTaskRow } from "./sortable-task-row";
import type { Task, TaskFilter } from "@shared/schema";

interface DroppableDomainProps {
  domainId: string;
  tasks: Task[];
  showDragHandle: boolean;
  status: TaskFilter;
  pendingTaskIds: Set<string>;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
  isOver?: boolean;
  activeTaskId?: string | null;
}

export function DroppableDomain({
  domainId,
  tasks,
  showDragHandle,
  status,
  pendingTaskIds,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
  isOver,
  activeTaskId,
}: DroppableDomainProps) {
  const { setNodeRef } = useDroppable({
    id: `domain-${domainId}`,
    data: {
      type: "domain",
      domainId,
    },
  });

  const taskIds = tasks.map((t) => t.id);
  const showEmptyDropZone = tasks.length === 0 && isOver;

  return (
    <div ref={setNodeRef} className="min-h-[1px]">
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        {tasks.map((task, index) => {
          const showDropIndicator = isOver && activeTaskId && task.id !== activeTaskId && index === 0;
          return (
            <div key={task.id} className="relative">
              {showDropIndicator && (
                <div className="absolute -top-[1px] left-0 right-0 z-10 h-[2px] bg-primary" />
              )}
              <SortableTaskRow
                task={task}
                showDragHandle={showDragHandle}
                status={status}
                isPending={pendingTaskIds.has(task.id)}
                onComplete={onComplete}
                onReopen={onReopen}
                onArchive={onArchive}
                onEdit={onEdit}
              />
            </div>
          );
        })}
      </SortableContext>
      {showEmptyDropZone && (
        <div className="flex h-[52px] items-center justify-center border-b border-dashed border-primary bg-primary/5 px-4">
          <span className="text-sm text-muted-foreground">Drop here</span>
        </div>
      )}
    </div>
  );
}
