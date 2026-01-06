import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [priority, setPriority] = useState<string>("");
  const [effortPoints, setEffortPoints] = useState<string>("");
  const [complexity, setComplexity] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [scheduledDate, setScheduledDate] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

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

    setTitle("");
    setPriority("");
    setEffortPoints("");
    setComplexity("");
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Priority (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                placeholder="1-5"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                data-testid="input-task-priority"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Effort (1-8)</Label>
              <Input
                type="number"
                min="1"
                max="8"
                placeholder="1-8"
                value={effortPoints}
                onChange={(e) => setEffortPoints(e.target.value)}
                data-testid="input-task-effort"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Complexity (1-5)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                placeholder="1-5"
                value={complexity}
                onChange={(e) => setComplexity(e.target.value)}
                data-testid="input-task-complexity"
              />
            </div>
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
