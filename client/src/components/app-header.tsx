import { Link } from "wouter";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

interface AppHeaderProps {
  onAddTask: () => void;
}

export function AppHeader({ onAddTask }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold" data-testid="text-app-title">Tasks</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={onAddTask} data-testid="button-global-add-task">
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
        <Link href="/domains">
          <Button variant="ghost" size="icon" data-testid="button-manage-domains">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
