import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Domain, InboxItem } from "@shared/schema";

interface InboxConversionDialogProps {
  open: boolean;
  onClose: () => void;
  inboxItem: InboxItem | null;
  domains: Domain[];
  mode: "add" | "schedule";
  todayDate: string;
  onSubmit: (data: {
    inboxItemId: string;
    title: string;
    domainId: string;
    priority: number;
    effortPoints: number | null;
    valence: number;
    dueDate: string | null;
    scheduledDate: string | null;
  }) => void;
}

export function InboxConversionDialog({
  open,
  onClose,
  inboxItem,
  domains,
  mode,
  todayDate,
  onSubmit,
}: InboxConversionDialogProps) {
  const [title, setTitle] = useState("");
  const [domainId, setDomainId] = useState("");
  const [priority, setPriority] = useState("1");
  const [effortPoints, setEffortPoints] = useState<string | null>(null);
  const [valence, setValence] = useState("0");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (inboxItem && open) {
      setTitle(inboxItem.title);
      if (mode === "add") {
        // Parse date as local time (not UTC) by splitting the string
        const [year, month, day] = todayDate.split("-").map(Number);
        setScheduledDate(new Date(year, month - 1, day));
      }
    }
  }, [inboxItem, open, mode, todayDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !domainId || !inboxItem) return;

    onSubmit({
      inboxItemId: inboxItem.id,
      title: title.trim(),
      domainId,
      priority: parseInt(priority),
      effortPoints: effortPoints !== null ? parseInt(effortPoints) : null,
      valence: parseInt(valence),
      dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      scheduledDate: scheduledDate ? format(scheduledDate, "yyyy-MM-dd") : null,
    });

    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle("");
    setDomainId("");
    setPriority("1");
    setEffortPoints(null);
    setValence("0");
    setDueDate(undefined);
    setScheduledDate(undefined);
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
      <DialogContent className="sm:max-w-md" data-testid="dialog-inbox-conversion">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add to Today" : "Schedule Task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="conversion-title">Title</Label>
            <Input
              id="conversion-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              data-testid="input-conversion-title"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conversion-domain">Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger data-testid="select-conversion-domain">
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
                data-testid="toggle-conversion-priority"
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
                value={effortPoints === null ? "unknown" : effortPoints}
                onValueChange={(val) => setEffortPoints(val === "unknown" ? null : val)}
                className="justify-start"
                data-testid="toggle-conversion-effort"
              >
                <ToggleGroupItem value="unknown" aria-label="Unknown effort">?</ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Low effort">1</ToggleGroupItem>
                <ToggleGroupItem value="2" aria-label="Medium effort">2</ToggleGroupItem>
                <ToggleGroupItem value="3" aria-label="High effort">3</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Valence</Label>
              <ToggleGroup
                type="single"
                value={valence}
                onValueChange={(val) => val && setValence(val)}
                className="justify-start"
                data-testid="toggle-conversion-valence"
              >
                <ToggleGroupItem value="-1" aria-label="Avoid">-1</ToggleGroupItem>
                <ToggleGroupItem value="0" aria-label="Neutral">0</ToggleGroupItem>
                <ToggleGroupItem value="1" aria-label="Enjoy">+1</ToggleGroupItem>
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
                      data-testid="button-conversion-due-date"
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
                    data-testid="button-clear-conversion-due-date"
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
                      data-testid="button-conversion-scheduled-date"
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
                    data-testid="button-clear-conversion-scheduled-date"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} data-testid="button-cancel-conversion">
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !domainId} data-testid="button-save-conversion">
              {mode === "add" ? "Add to Today" : "Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
