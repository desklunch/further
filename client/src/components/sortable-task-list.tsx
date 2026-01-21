import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { TaskRowContent } from "@/components/task-row-content";
import type { Task, FilterMode } from "@shared/schema";

export interface TaskDragData {
  type: "task";
  task: Task;
  domainId: string;
}

interface SortableTaskListProps {
  domainId: string;
  tasks: Task[];
  filterMode: FilterMode;
  showDragHandles: boolean;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  onAddToToday?: (taskId: string) => void;
  isBeingTargeted?: boolean;
  dropTargetIndex?: number | null;
  isDragActive?: boolean;
}

function DropIndicator() {
  return (
    <div className="h-1 bg-primary mx-4 rounded-full" />
  );
}

function EndDropZone({ domainId, taskCount }: { domainId: string; taskCount: number }) {
  const { setNodeRef } = useDroppable({
    id: `end-${domainId}`,
    data: {
      type: "end-zone",
      domainId,
      index: taskCount,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="h-12"
    />
  );
}

interface SortableTaskItemProps {
  task: Task;
  domainId: string;
  filterMode: FilterMode;
  showDragHandle: boolean;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  onAddToToday?: (taskId: string) => void;
}

export function SortableTaskItem({
  task,
  domainId,
  filterMode,
  showDragHandle,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
  onTitleChange,
  onAddToToday,
}: SortableTaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      domainId,
    } as TaskDragData,
  });

  const style = {
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 border-b px-4 py-3 hover-elevate bg-background"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`task-row-${task.id}`}
    >
      <TaskRowContent
        task={task}
        isHovered={isHovered}
        showDragHandle={showDragHandle}
        filterMode={filterMode}
        onComplete={onComplete}
        onReopen={onReopen}
        onArchive={onArchive}
        onEdit={onEdit}
        onTitleChange={onTitleChange}
        onAddToToday={onAddToToday}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

export function SortableTaskList({
  domainId,
  tasks,
  filterMode,
  showDragHandles,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
  onTitleChange,
  onAddToToday,
  isBeingTargeted = false,
  dropTargetIndex = null,
  isDragActive = false,
}: SortableTaskListProps) {
  const taskIds = tasks.map((t) => t.id);

  const { setNodeRef, isOver } = useDroppable({
    id: `domain-drop-${domainId}`,
    data: {
      type: "domain",
      domainId,
    },
  });

  const showHighlight = isOver || isBeingTargeted;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[48px] transition-colors ${showHighlight ? "bg-accent/30" : ""}`}
      data-testid={`droppable-domain-${domainId}`}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <>
            {dropTargetIndex !== null && <DropIndicator />}
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No tasks
            </div>
          </>
        ) : (
          <>
            {tasks.map((task, index) => (
              <div key={task.id}>
                {dropTargetIndex === index && <DropIndicator />}
                <SortableTaskItem
                  task={task}
                  domainId={domainId}
                  filterMode={filterMode}
                  showDragHandle={showDragHandles}
                  onComplete={onComplete}
                  onReopen={onReopen}
                  onArchive={onArchive}
                  onEdit={onEdit}
                  onTitleChange={onTitleChange}
                  onAddToToday={onAddToToday}
                />
              </div>
            ))}
            {dropTargetIndex !== null && dropTargetIndex >= tasks.length && <DropIndicator />}
            {isDragActive && isBeingTargeted && <EndDropZone domainId={domainId} taskCount={tasks.length} />}
          </>
        )}
      </SortableContext>
    </div>
  );
}
