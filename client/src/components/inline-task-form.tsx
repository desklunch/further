import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { InsertTask } from "@shared/schema";

interface InlineTaskFormProps {
  domainId: string;
  onSubmit: (task: Omit<InsertTask, "userId">) => void;
  onCancel: () => void;
}

export function InlineTaskForm({ domainId, onSubmit, onCancel }: InlineTaskFormProps) {
  const [title, setTitle] = useState("");
  const [showMetadata, setShowMetadata] = useState(false);
  const [priority, setPriority] = useState("2");
  const [effortPoints, setEffortPoints] = useState("2");
  const [complexity, setComplexity] = useState("2");
  const [dueDate, setDueDate] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");

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
      dueDate: dueDate || null,
      scheduledDate: scheduledDate || null,
    });

    setTitle("");
    setPriority("2");
    setEffortPoints("2");
    setComplexity("2");
    setDueDate("");
    setScheduledDate("");
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

        <button
          type="button"
          onClick={() => setShowMetadata(!showMetadata)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          {showMetadata ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          {showMetadata ? "Hide details" : "Add details"}
        </button>

        {showMetadata && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Priority</Label>
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
              <Label className="text-sm">Effort</Label>
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
              <Label className="text-sm">Complexity</Label>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  data-testid="input-task-due-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Scheduled</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  data-testid="input-task-scheduled-date"
                />
              </div>
            </div>
          </div>
        )}

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
