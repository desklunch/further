import { CheckCircle2, Archive, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FilterMode } from "@shared/schema";

interface EmptyStateProps {
  filterMode: FilterMode;
  onAddTask?: () => void;
}

export function EmptyState({ filterMode, onAddTask }: EmptyStateProps) {
  const content: Record<FilterMode, { icon: typeof ListTodo; title: string; description: string; action: string | null }> = {
    all: {
      icon: ListTodo,
      title: "No tasks yet",
      description: "Create a task to get started with your productivity journey.",
      action: "Add your first task",
    },
    open: {
      icon: ListTodo,
      title: "No open tasks",
      description: "All tasks are completed or archived.",
      action: "Add a new task",
    },
    completed: {
      icon: CheckCircle2,
      title: "No completed tasks",
      description: "Complete some tasks to see them here.",
      action: null,
    },
    archived: {
      icon: Archive,
      title: "No archived tasks",
      description: "Archived tasks will appear here.",
      action: null,
    },
  };

  const { icon: Icon, title, description, action } = content[filterMode];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-state">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-medium">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && onAddTask && (
        <Button onClick={onAddTask} data-testid="button-add-first-task">
          {action}
        </Button>
      )}
    </div>
  );
}
