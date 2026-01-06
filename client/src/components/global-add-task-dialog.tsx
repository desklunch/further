import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Domain, InsertTask } from "@shared/schema";

interface GlobalAddTaskDialogProps {
  open: boolean;
  onClose: () => void;
  domains: Domain[];
  onSubmit: (task: Omit<InsertTask, "userId">) => void;
}

export function GlobalAddTaskDialog({
  open,
  onClose,
  domains,
  onSubmit,
}: GlobalAddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [domainId, setDomainId] = useState("");
  const [priority, setPriority] = useState<string>("");
  const [effortPoints, setEffortPoints] = useState<string>("");
  const [complexity, setComplexity] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !domainId) return;

    onSubmit({
      title: title.trim(),
      domainId,
      status: "open",
      priority: priority ? parseInt(priority) : null,
      effortPoints: effortPoints ? parseInt(effortPoints) : null,
      complexity: complexity ? parseInt(complexity) : null,
      dueDate: dueDate || null,
      scheduledDate: scheduledDate || null,
    });

    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle("");
    setDomainId("");
    setPriority("");
    setEffortPoints("");
    setComplexity("");
    setDueDate("");
    setScheduledDate("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
      onClose();
    }
  };

  const activeDomains = domains.filter((d) => d.isActive);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-global-add-task">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="global-title">Title</Label>
            <Input
              id="global-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              data-testid="input-global-task-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="global-domain">Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger data-testid="select-global-task-domain">
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
              <Label htmlFor="global-priority">Priority (1-5)</Label>
              <Input
                id="global-priority"
                type="number"
                min="1"
                max="5"
                placeholder="1-5"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                data-testid="input-global-task-priority"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="global-effort">Effort (1-8)</Label>
              <Input
                id="global-effort"
                type="number"
                min="1"
                max="8"
                placeholder="1-8"
                value={effortPoints}
                onChange={(e) => setEffortPoints(e.target.value)}
                data-testid="input-global-task-effort"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="global-complexity">Complexity (1-5)</Label>
            <Input
              id="global-complexity"
              type="number"
              min="1"
              max="5"
              placeholder="1-5"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              data-testid="input-global-task-complexity"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="global-dueDate">Due Date</Label>
              <Input
                id="global-dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-global-task-due-date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="global-scheduledDate">Scheduled</Label>
              <Input
                id="global-scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                data-testid="input-global-task-scheduled-date"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} data-testid="button-cancel-global-task">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !domainId} data-testid="button-save-global-task">
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
