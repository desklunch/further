import { useState, useRef, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GripVertical, Pencil, Trash2, Calendar, Triangle, Circle, Sparkles, Check, X, HelpCircle, CalendarPlus, MoreHorizontal, RotateCcw, Clock } from "lucide-react";
import { PriorityIcon } from "@/components/priority-icon";
import { EffortIcon } from "@/components/effort-icon";
import { format } from "date-fns";
import type { Task, TaskDayAssignment, FilterMode } from "@shared/schema";

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

interface TaskRowContentProps {
  task: Task;
  isHovered: boolean;
  showDragHandle: boolean;
  filterMode: FilterMode;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onRestore?: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onTitleChange?: (taskId: string, newTitle: string) => void;
  onAddToToday?: (taskId: string) => void;
  onRemoveFromToday?: (taskId: string) => void;
  onDismissCarryover?: (taskId: string) => void;
  onCompleteRetroactive?: (taskId: string, date: string) => void;
  dragHandleProps?: DragHandleProps;
  assignment?: TaskDayAssignment | null;
}

export function TaskRowContent({
  task,
  isHovered,
  showDragHandle,
  filterMode,
  onComplete,
  onReopen,
  onArchive,
  onRestore,
  onEdit,
  onTitleChange,
  onAddToToday,
  onRemoveFromToday,
  onDismissCarryover,
  onCompleteRetroactive,
  dragHandleProps,
  assignment,
}: TaskRowContentProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isCompleted = task.status === "completed";
  const isArchived = task.archivedAt !== null;
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  
  const isAssignedToday = assignment?.date === todayStr;
  
  const isCarryover = (() => {
    if (assignment && assignment.date < todayStr) {
      return true;
    }
    if (!assignment && task.scheduledDate && task.scheduledDate < todayStr) {
      return true;
    }
    return false;
  })();
  
  const carryoverDate = isCarryover 
    ? (assignment?.date || task.scheduledDate || null)
    : null;

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
            <PriorityIcon 
              level={task.priority} 
              className="h-3 w-auto" 
              data-testid={`icon-priority-${task.id}`}
            />
          )}
          {task.effortPoints != null && (
            <EffortIcon 
              level={task.effortPoints} 
              className="h-3 w-auto" 
              data-testid={`icon-effort-${task.id}`}
            />
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
          {isAssignedToday && (
            <Badge variant="default" className="gap-1 text-xs">
              Today
            </Badge>
          )}
          {isCarryover && carryoverDate && (onDismissCarryover || onCompleteRetroactive) && (
            <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {carryoverDate === format(new Date(Date.now() - 86400000), "yyyy-MM-dd") 
                ? "From yesterday" 
                : "From earlier"}
            </Badge>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-1 transition-opacity"
        style={{ visibility: isHovered || dropdownOpen ? "visible" : "hidden" }}
      >
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              data-testid={`button-task-menu-${task.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => onEdit(task)}
              data-testid={`menu-edit-task-${task.id}`}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit task
            </DropdownMenuItem>
            
            {!isArchived && (
              <DropdownMenuItem 
                onClick={() => onArchive(task.id)}
                data-testid={`menu-archive-task-${task.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Archive task
              </DropdownMenuItem>
            )}
            
            {isArchived && onRestore && (
              <DropdownMenuItem 
                onClick={() => onRestore(task.id)}
                data-testid={`menu-restore-task-${task.id}`}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore task
              </DropdownMenuItem>
            )}
            
            {onAddToToday && !isCompleted && !isArchived && !isAssignedToday && task.scheduledDate !== todayStr && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onAddToToday(task.id)}
                  data-testid={`menu-add-to-today-${task.id}`}
                >
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Add to Today
                </DropdownMenuItem>
              </>
            )}
            
            {isAssignedToday && onRemoveFromToday && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onRemoveFromToday(task.id)}
                  data-testid={`menu-remove-from-today-${task.id}`}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove from Today
                </DropdownMenuItem>
              </>
            )}
            
            {isCarryover && carryoverDate && onCompleteRetroactive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onCompleteRetroactive(task.id, carryoverDate)}
                  data-testid={`menu-complete-retroactive-${task.id}`}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Mark complete (yesterday)
                </DropdownMenuItem>
              </>
            )}
            
            {isCarryover && onDismissCarryover && (
              <DropdownMenuItem 
                onClick={() => onDismissCarryover(task.id)}
                data-testid={`menu-dismiss-carryover-${task.id}`}
              >
                <Clock className="h-4 w-4 mr-2" />
                Not today
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
