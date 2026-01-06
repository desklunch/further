import { CheckCircle2, Archive, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskStatus } from "@shared/schema";

interface EmptyStateProps {
  status: TaskStatus;
  onAddTask?: () => void;
}

export function EmptyState({ status, onAddTask }: EmptyStateProps) {
  const content = {
    open: {
      icon: ListTodo,
      title: "No open tasks",
      description: "Create a task to get started with your productivity journey.",
      action: "Add your first task",
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
      description: "Archived tasks will appear here when you delete them.",
      action: null,
    },
  };

  const { icon: Icon, title, description, action } = content[status];

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
