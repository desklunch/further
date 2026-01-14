import { useState } from "react";
import { TaskRowContent } from "@/components/task-row-content";
import type { Task, FilterMode } from "@shared/schema";

interface TaskRowProps {
  task: Task;
  showDragHandle: boolean;
  filterMode: FilterMode;
  onComplete: (taskId: string) => void;
  onReopen: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  onEdit: (task: Task) => void;
}

export function TaskRow({
  task,
  showDragHandle,
  filterMode,
  onComplete,
  onReopen,
  onArchive,
  onEdit,
}: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group flex items-center gap-3 border-b px-4 py-3 hover-elevate"
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
      />
    </div>
  );
}
