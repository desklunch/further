import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Pencil, Trash2, Calendar, Zap, BarChart3, Target } from "lucide-react";
import type { Task, TaskStatus, SortMode } from "@shared/schema";

interface TaskRowProps {
  task: Task;
  showDragHandle: boolean;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
  status: TaskStatus;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TaskRow({
  task,
  showDragHandle,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
  status,
}: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = task.status === "completed";
  const isArchived = task.status === "archived";

  const handleCheckChange = () => {
    if (isCompleted) {
      onReopen(task.id);
    } else {
      onComplete(task.id);
    }
  };

  return (
    <div
      className="group flex items-center gap-3 border-b px-4 py-3 hover-elevate"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`task-row-${task.id}`}
    >
      {showDragHandle && (
        <div
          className="cursor-grab text-muted-foreground transition-opacity"
          style={{ visibility: isHovered ? "visible" : "hidden" }}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      <Checkbox
        checked={isCompleted}
        onCheckedChange={handleCheckChange}
        disabled={isArchived}
        data-testid={`checkbox-task-${task.id}`}
        className="h-5 w-5"
      />

      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <span
          className={`flex-1 truncate text-base ${
            isCompleted || isArchived
              ? "text-muted-foreground line-through"
              : "font-medium"
          }`}
          data-testid={`text-task-title-${task.id}`}
        >
          {task.title}
        </span>

        <div className="flex flex-wrap items-center gap-2">
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
        {status !== "archived" && (
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
