import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GripVertical, Pencil, Trash2, Calendar, Zap, BarChart3, Triangle, Circle, Sparkles, Check, X, HelpCircle, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import type { Task, FilterMode } from "@shared/schema";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTaskAgeDays(createdAt: string | Date | null | undefined): number {
  if (!createdAt) return 0;
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getAgeColorClass(days: number): string {
  if (days >= 14) return "text-red-600 dark:text-red-400";
  if (days >= 7) return "text-yellow-600 dark:text-yellow-400";
  return "text-muted-foreground";
}

interface DragHandleProps {
  attributes?: object;
  listeners?: object;
}

interface TaskAssignmentInfo {
  date: string;
  isToday: boolean;
  isYesterday: boolean;
}

interface TaskRowContentProps {
  task: Task;
  isHovered: boolean;
  showDragHandle: boolean;
  filterMode: FilterMode;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  onAddToToday?: (taskId: string) => void;
  dragHandleProps?: DragHandleProps;
  assignmentInfo?: TaskAssignmentInfo;
}

export function TaskRowContent({
  task,
  isHovered,
  showDragHandle,
  filterMode,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
  onTitleChange,
  onAddToToday,
  dragHandleProps,
  assignmentInfo,
}: TaskRowContentProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isCompleted = task.status === "completed";
  const isArchived = task.archivedAt !== null;

  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleCheckChange = () => {
    if (isCompleted) {
      onReopen(task.id);
    } else {
      onComplete(task.id);
    }
  };

  const handleStartEditTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(task.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title && onTitleChange) {
      onTitleChange(task.id, trimmed);
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditValue(task.title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDoubleClick = () => {
    if (!isArchived && onTitleChange) {
      setEditValue(task.title);
      setIsEditingTitle(true);
    }
  };

  return (
    <>
      {showDragHandle && (
        <div
          {...(dragHandleProps?.attributes || {})}
          {...(dragHandleProps?.listeners || {})}
          className="cursor-grab text-muted-foreground active:cursor-grabbing"
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

      <div className="flex flex-1 flex-col items-start gap-1 overflow-hidden md:flex-row md:items-center md:gap-2">
        {isEditingTitle ? (
          <div className="flex items-center gap-1 w-full md:flex-1">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveTitle}
              className="h-8 flex-1"
              data-testid={`input-task-title-${task.id}`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSaveTitle();
              }}
              data-testid={`button-save-title-${task.id}`}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCancelEdit();
              }}
              data-testid={`button-cancel-title-${task.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1 w-full md:flex-1">
            <span
              className={`flex-1 text-base md:truncate cursor-pointer ${
                isCompleted || isArchived
                  ? "text-muted-foreground line-through"
                  : "font-medium"
              }`}
              onDoubleClick={handleDoubleClick}
              data-testid={`text-task-title-${task.id}`}
            >
              {task.title}
            </span>
            {onTitleChange && !isArchived && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                style={{ visibility: isHovered ? "visible" : "hidden" }}
                onClick={handleStartEditTitle}
                data-testid={`button-inline-edit-${task.id}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1 md:gap-2">
          {/* Task age in days - only show if >= 4 days */}
          {(() => {
            const ageDays = getTaskAgeDays(task.createdAt);
            if (ageDays < 4) return null;
            return (
              <span 
                className={`text-xs font-medium ${getAgeColorClass(ageDays)}`}
                data-testid={`text-task-age-${task.id}`}
              >
                {ageDays}d
              </span>
            );
          })()}
          {task.priority && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Zap className="h-3 w-3" />
              P{task.priority}
            </Badge>
          )}
          {task.effortPoints != null && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              {task.effortPoints}pt
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1 text-xs">
            {task.valence === -1 && <Triangle className="h-3 w-3" />}
            {task.valence === 0 && <Circle className="h-3 w-3" />}
            {task.valence === 1 && <Sparkles className="h-3 w-3" />}
            {task.valence == null && <Circle className="h-3 w-3" />}
          </Badge>
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
          {assignmentInfo?.isToday && (
            <Badge variant="default" className="gap-1 text-xs">
              Today
            </Badge>
          )}
          {assignmentInfo?.isYesterday && (
            <Badge variant="secondary" className="gap-1 text-xs">
              Yesterday
            </Badge>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-1 transition-opacity"
        style={{ visibility: isHovered ? "visible" : "hidden" }}
      >
        {onAddToToday && !isCompleted && !isArchived && !assignmentInfo?.isToday && task.scheduledDate !== format(new Date(), "yyyy-MM-dd") && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAddToToday(task.id)}
            title="Add to Today"
            data-testid={`button-add-to-today-${task.id}`}
          >
            <CalendarPlus className="h-4 w-4" />
          </Button>
        )}
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
    </>
  );
}
