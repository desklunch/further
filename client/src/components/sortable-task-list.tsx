import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2, Calendar, Zap, BarChart3, Target } from "lucide-react";
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
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface SortableTaskItemProps {
  task: Task;
  domainId: string;
  filterMode: FilterMode;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

export function SortableTaskItem({
  task,
  domainId,
  filterMode,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
}: SortableTaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = task.status === "completed";
  const isArchived = task.archivedAt !== null;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
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

  const handleCheckChange = () => {
    if (isCompleted) {
      onReopen(task.id);
    } else {
      onComplete(task.id);
    }
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
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        style={{ visibility: isHovered ? "visible" : "hidden" }}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleCheckChange}
        disabled={isArchived}
        data-testid={`checkbox-task-${task.id}`}
        className="h-5 w-5"
      />

      <div className="flex flex-1 flex-col items-start gap-1 overflow-hidden md:flex-row md:items-center md:gap-2">
        <span
          className={`w-full text-base md:flex-1 md:truncate ${
            isCompleted || isArchived
              ? "text-muted-foreground line-through"
              : "font-medium"
          }`}
          data-testid={`text-task-title-${task.id}`}
        >
          {task.title}
        </span>

        <div className="flex flex-wrap items-center gap-1 md:gap-2">
          {task.priority && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Zap className="h-3 w-3" />
              P{task.priority}
            </Badge>
          )}
          {task.effortPoints && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              {task.effortPoints}pt
            </Badge>
          )}
          {task.complexity && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Target className="h-3 w-3" />
              C{task.complexity}
            </Badge>
          )}
          {task.dueDate && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </Badge>
          )}
          {task.scheduledDate && !task.dueDate && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              {formatDate(task.scheduledDate)}
            </Badge>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-1 transition-opacity"
        style={{ visibility: isHovered ? "visible" : "hidden" }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(task)}
          data-testid={`button-edit-task-${task.id}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {filterMode !== "archived" && !isArchived && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onArchive(task.id)}
            data-testid={`button-archive-task-${task.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function SortableTaskList({
  domainId,
  tasks,
  filterMode,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
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
                  onComplete={onComplete}
                  onReopen={onReopen}
                  onArchive={onArchive}
                  onEdit={onEdit}
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
