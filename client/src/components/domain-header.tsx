import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { Domain } from "@shared/schema";

interface DomainHeaderProps {
  domain: Domain;
  taskCount: number;
  onAddTask: (domainId: string) => void;
}

export function DomainHeader({ domain, taskCount, onAddTask }: DomainHeaderProps) {
  return (
    <div className="sticky top-[57px] z-30 flex items-center justify-between gap-4 border-b bg-muted/50 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" data-testid={`text-domain-name-${domain.id}`}>
          {domain.name}
        </h2>
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
