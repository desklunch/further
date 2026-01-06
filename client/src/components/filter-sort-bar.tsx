import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskStatus, SortMode } from "@shared/schema";

interface FilterSortBarProps {
  filter: TaskStatus;
  sortMode: SortMode;
  onFilterChange: (filter: TaskStatus) => void;
  onSortChange: (sort: SortMode) => void;
}

const filterOptions: { value: TaskStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const sortOptions: { value: SortMode; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "due_date", label: "Due Date" },
  { value: "scheduled_date", label: "Scheduled" },
  { value: "priority", label: "Priority" },
  { value: "effort", label: "Effort" },
  { value: "complexity", label: "Complexity" },
  { value: "created", label: "Created" },
];

export function FilterSortBar({
  filter,
  sortMode,
  onFilterChange,
  onSortChange,
}: FilterSortBarProps) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
      <div className="flex items-center gap-1">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange(option.value)}
            data-testid={`button-filter-${option.value}`}
            className={filter === option.value ? "font-medium" : ""}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <Select value={sortMode} onValueChange={(v) => onSortChange(v as SortMode)}>
        <SelectTrigger className="w-[140px]" data-testid="select-sort">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
