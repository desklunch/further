import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { InsertTask } from "@shared/schema";

interface InlineTaskFormProps {
  domainId: string;
  onSubmit: (task: Omit<InsertTask, "userId">) => void;
  onCancel: () => void;
}

export function InlineTaskForm({ domainId, onSubmit, onCancel }: InlineTaskFormProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("1");
  const [effortPoints, setEffortPoints] = useState("1");
  const [complexity, setComplexity] = useState("1");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      domainId,
      status: "open",
      priority: parseInt(priority),
      effortPoints: parseInt(effortPoints),
      complexity: parseInt(complexity),
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      scheduledDate: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
    });

    setTitle("");
    setPriority("1");
    setEffortPoints("1");
    setComplexity("1");
    setDueDate(undefined);
    setScheduledDate(undefined);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b bg-card p-4"
      data-testid="form-inline-task"
    >
      <div className="space-y-3">
        <Input
          autoFocus
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="input-task-title"
          className="text-base"
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <ToggleGroup
              type="single"
              value={priority}
              onValueChange={(val) => val && setPriority(val)}
              className="justify-start"
              data-testid="toggle-task-priority"
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
              data-testid="toggle-task-effort"
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
              data-testid="toggle-task-complexity"
            >
              <ToggleGroupItem value="1" aria-label="Low complexity">1</ToggleGroupItem>
              <ToggleGroupItem value="2" aria-label="Medium complexity">2</ToggleGroupItem>
              <ToggleGroupItem value="3" aria-label="High complexity">3</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                  data-testid="button-task-due-date"
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Scheduled</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                  data-testid="button-task-scheduled-date"
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
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} data-testid="button-cancel-task">
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim()} data-testid="button-save-task">
            Add Task
          </Button>
        </div>
      </div>
    </form>
  );
}
