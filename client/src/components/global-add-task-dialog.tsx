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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  const [priority, setPriority] = useState("2");
  const [effortPoints, setEffortPoints] = useState("2");
  const [complexity, setComplexity] = useState("2");
  const [dueDate, setDueDate] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !domainId) return;

    onSubmit({
      title: title.trim(),
      domainId,
      status: "open",
      priority: parseInt(priority),
      effortPoints: parseInt(effortPoints),
      complexity: parseInt(complexity),
      dueDate: dueDate || null,
      scheduledDate: scheduledDate || null,
    });

    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle("");
    setDomainId("");
    setPriority("2");
    setEffortPoints("2");
    setComplexity("2");
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

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <ToggleGroup
              type="single"
              value={priority}
              onValueChange={(val) => val && setPriority(val)}
              className="justify-start"
              data-testid="toggle-global-task-priority"
            >
              <ToggleGroupItem value="1" aria-label="Low priority">1</ToggleGroupItem>
              <ToggleGroupItem value="2" aria-label="Medium priority">2</ToggleGroupItem>
              <ToggleGroupItem value="3" aria-label="High priority">3</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Effort</Label>
            <ToggleGroup
              type="single"
              value={effortPoints}
              onValueChange={(val) => val && setEffortPoints(val)}
              className="justify-start"
              data-testid="toggle-global-task-effort"
            >
              <ToggleGroupItem value="1" aria-label="Low effort">1</ToggleGroupItem>
              <ToggleGroupItem value="2" aria-label="Medium effort">2</ToggleGroupItem>
              <ToggleGroupItem value="3" aria-label="High effort">3</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Complexity</Label>
            <ToggleGroup
              type="single"
              value={complexity}
              onValueChange={(val) => val && setComplexity(val)}
              className="justify-start"
              data-testid="toggle-global-task-complexity"
            >
              <ToggleGroupItem value="1" aria-label="Low complexity">1</ToggleGroupItem>
              <ToggleGroupItem value="2" aria-label="Medium complexity">2</ToggleGroupItem>
              <ToggleGroupItem value="3" aria-label="High complexity">3</ToggleGroupItem>
            </ToggleGroup>
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
