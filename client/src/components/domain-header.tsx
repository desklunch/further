import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, GripVertical, Check, X, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Domain } from "@shared/schema";

interface DomainHeaderProps {
  domain: Domain;
  taskCount: number;
  onAddTask: (domainId: string) => void;
  onRename?: (domainId: string, newName: string) => void;
  showDragHandle?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isCollapsed?: boolean;
  onToggleCollapse?: (domainId: string) => void;
  isDropTarget?: boolean;
}

export function DomainHeader({ 
  domain, 
  taskCount, 
  onAddTask, 
  onRename,
  showDragHandle = false,
  dragHandleProps,
  isCollapsed = false,
  onToggleCollapse,
  isDropTarget = false,
}: DomainHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(domain.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef } = useDroppable({
    id: `domain-header-drop-${domain.id}`,
    data: {
      type: "domain-header",
      domainId: domain.id,
    },
    disabled: !isCollapsed,
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(domain.name);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== domain.name && onRename) {
      onRename(domain.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(domain.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "sticky top-[57px] z-30 flex items-center justify-between gap-4 border-b bg-muted/50 px-4 py-4 backdrop-blur-sm transition-colors",
        isDropTarget && "bg-primary/10 border-primary ring-2 ring-primary/30"
      )}
    >
      <div className="flex items-center gap-2">
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleCollapse(domain.id)}
            className="h-7 w-7"
            data-testid={`button-toggle-collapse-${domain.id}`}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
        {showDragHandle && (
          <button
            {...dragHandleProps}
            className="cursor-grab touch-none text-muted-foreground hover-elevate active-elevate-2 rounded p-1"
            data-testid={`drag-handle-domain-${domain.id}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              className="h-8 w-40 text-lg font-semibold"
              data-testid={`input-domain-name-${domain.id}`}
            />
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSave();
              }}
              className="h-8 w-8"
              data-testid={`button-save-domain-${domain.id}`}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onMouseDown={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              className="h-8 w-8"
              data-testid={`button-cancel-domain-${domain.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold" data-testid={`text-domain-name-${domain.id}`}>
              {domain.name}
            </h2>
            {onRename && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartEdit}
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`button-edit-domain-${domain.id}`}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
        <Badge variant="secondary" className="text-xs" data-testid={`badge-task-count-${domain.id}`}>
          {taskCount}
        </Badge>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddTask(domain.id)}
        data-testid={`button-add-task-${domain.id}`}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
