import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2, Calendar, Zap, BarChart3, Target } from "lucide-react";
import type { Task, FilterMode } from "@shared/schema";

interface SortableTaskListProps {
  domainId: string;
  tasks: Task[];
  filterMode: FilterMode;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onReorder: (domainId: string, taskId: string, newIndex: number) => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface SortableTaskItemProps {
  task: Task;
  filterMode: FilterMode;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

function SortableTaskItem({
  task,
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
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
      className="group flex items-center gap-3 border-b px-4 py-3 hover-elevate"
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
  onReorder,
}: SortableTaskListProps) {
  const [localTasks, setLocalTasks] = useState(tasks);
  
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const taskIds = localTasks.map((t) => t.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = taskIds.indexOf(active.id as string);
    const newIndex = taskIds.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const newOrder = arrayMove(localTasks, oldIndex, newIndex);
      setLocalTasks(newOrder);
      onReorder(domainId, active.id as string, newIndex);
    }
  }

  if (localTasks.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        No tasks
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        {localTasks.map((task) => (
          <SortableTaskItem
            key={task.id}
            task={task}
            filterMode={filterMode}
            onComplete={onComplete}
            onReopen={onReopen}
            onArchive={onArchive}
            onEdit={onEdit}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
