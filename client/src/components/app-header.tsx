import { Link, useLocation } from "wouter";
import { Plus, Settings, CalendarDays, ListTodo, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

interface AppHeaderProps {
  onAddTask?: () => void;
}

export function AppHeader({ onAddTask }: AppHeaderProps) {
  const [location] = useLocation();
  const isToday = location === "/";
  const isTasks = location === "/tasks";
  const isHabits = location === "/habits";

  const getTitle = () => {
    if (isToday) return "Today";
    if (isTasks) return "Tasks";
    if (isHabits) return "Habits";
    return "Tasks";
  };

  return (
    <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold" data-testid="text-app-title">
          {getTitle()}
        </h1>
        <nav className="flex items-center gap-1">
          <Link href="/">
            <Button 
              variant={isToday ? "secondary" : "ghost"} 
              size="sm"
              data-testid="nav-today"
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Today
            </Button>
          </Link>
          <Link href="/tasks">
            <Button 
              variant={isTasks ? "secondary" : "ghost"} 
              size="sm"
              data-testid="nav-tasks"
            >
              <ListTodo className="h-4 w-4 mr-1" />
              Tasks
            </Button>
          </Link>
          <Link href="/habits">
            <Button 
              variant={isHabits ? "secondary" : "ghost"} 
              size="sm"
              data-testid="nav-habits"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Habits
            </Button>
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {onAddTask && (
          <Button onClick={onAddTask} data-testid="button-global-add-task">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
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
