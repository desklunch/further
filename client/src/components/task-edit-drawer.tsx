import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
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
  const [priority, setPriority] = useState("1");
  const [effortPoints, setEffortPoints] = useState("1");
  const [complexity, setComplexity] = useState("1");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDomainId(task.domainId);
      setPriority((task.priority ?? 1).toString());
      setEffortPoints((task.effortPoints ?? 1).toString());
      setComplexity((task.complexity ?? 1).toString());
      setDueDate(task.dueDate ? parseISO(task.dueDate) : undefined);
      setScheduledDate(task.scheduledDate ? parseISO(task.scheduledDate) : undefined);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim()) return;

    onSave(task.id, {
      title: title.trim(),
      domainId,
      priority: parseInt(priority),
      effortPoints: parseInt(effortPoints),
      complexity: parseInt(complexity),
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      scheduledDate: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
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

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <ToggleGroup
                type="single"
                value={priority}
                onValueChange={(val) => val && setPriority(val)}
                className="justify-start"
                data-testid="toggle-edit-task-priority"
              >
                <ToggleGroupItem value="1" aria-label="Low priority">1</ToggleGroupItem>
                <ToggleGroupItem value="2" aria-label="Medium priority">2</ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="High priority">3</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Effort</Label>
              <ToggleGroup
                type="single"
                value={effortPoints}
                onValueChange={(val) => val && setEffortPoints(val)}
                className="justify-start"
                data-testid="toggle-edit-task-effort"
              >
                <ToggleGroupItem value="1" aria-label="Low effort">1</ToggleGroupItem>
                <ToggleGroupItem value="2" aria-label="Medium effort">2</ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="High effort">3</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Complexity</Label>
              <ToggleGroup
                type="single"
                value={complexity}
                onValueChange={(val) => val && setComplexity(val)}
                className="justify-start"
                data-testid="toggle-edit-task-complexity"
              >
                <ToggleGroupItem value="1" aria-label="Low complexity">1</ToggleGroupItem>
                <ToggleGroupItem value="2" aria-label="Medium complexity">2</ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="High complexity">3</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                      data-testid="button-edit-task-due-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {dueDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDueDate(undefined)}
                    data-testid="button-clear-edit-due-date"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Scheduled</Label>
              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                      data-testid="button-edit-task-scheduled-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {scheduledDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setScheduledDate(undefined)}
                    data-testid="button-clear-edit-scheduled-date"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4">
            {task?.archivedAt && onRestore && (
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
