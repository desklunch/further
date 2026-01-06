import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Task, Domain, UpdateTask } from "@shared/schema";

interface TaskEditDrawerProps {
  task: Task | null;
  domains: Domain[];
  open: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: UpdateTask) => void;
  onRestore?: (taskId: string) => void;
}

export function TaskEditDrawer({
  task,
  domains,
  open,
  onClose,
  onSave,
  onRestore,
}: TaskEditDrawerProps) {
  const [title, setTitle] = useState("");
  const [domainId, setDomainId] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [effortPoints, setEffortPoints] = useState<string>("");
  const [complexity, setComplexity] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDomainId(task.domainId);
      setPriority(task.priority?.toString() || "");
      setEffortPoints(task.effortPoints?.toString() || "");
      setComplexity(task.complexity?.toString() || "");
      setDueDate(task.dueDate || "");
      setScheduledDate(task.scheduledDate || "");
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    onSave(task.id, {
      title: title.trim(),
      domainId,
      priority: priority ? parseInt(priority) : null,
      effortPoints: effortPoints ? parseInt(effortPoints) : null,
      complexity: complexity ? parseInt(complexity) : null,
      dueDate: dueDate || null,
      scheduledDate: scheduledDate || null,
    });
    onClose();
  };

  const activeDomains = domains.filter((d) => d.isActive);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md" data-testid="drawer-task-edit">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              data-testid="input-edit-task-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="domain">Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger data-testid="select-edit-task-domain">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {activeDomains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="priority">Priority (1-5)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="5"
                placeholder="1-5"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                data-testid="input-edit-task-priority"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="effort">Effort (1-8)</Label>
              <Input
                id="effort"
                type="number"
                min="1"
                max="8"
                placeholder="1-8"
                value={effortPoints}
                onChange={(e) => setEffortPoints(e.target.value)}
                data-testid="input-edit-task-effort"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="complexity">Complexity (1-5)</Label>
            <Input
              id="complexity"
              type="number"
              min="1"
              max="5"
              placeholder="1-5"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              data-testid="input-edit-task-complexity"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-edit-task-due-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scheduledDate">Scheduled</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                data-testid="input-edit-task-scheduled-date"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            {task?.status === "archived" && onRestore && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onRestore(task.id);
                  onClose();
                }}
                data-testid="button-restore-task"
              >
                Restore
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()} data-testid="button-save-edit">
              Save
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
