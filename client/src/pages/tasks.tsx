import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app-header";
import { FilterSortBar } from "@/components/filter-sort-bar";
import { DomainHeader } from "@/components/domain-header";
import { TaskRow } from "@/components/task-row";
import { InlineTaskForm } from "@/components/inline-task-form";
import { TaskEditDrawer } from "@/components/task-edit-drawer";
import { GlobalAddTaskDialog } from "@/components/global-add-task-dialog";
import { EmptyState } from "@/components/empty-state";
import { TasksLoadingSkeleton } from "@/components/loading-skeleton";
import type { Domain, Task, TaskStatus, SortMode, InsertTask, UpdateTask } from "@shared/schema";

export default function TasksPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<TaskStatus>("open");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [addingToDomainId, setAddingToDomainId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showGlobalAddDialog, setShowGlobalAddDialog] = useState(false);

  const { data: domains = [], isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { status: filter, sort: sortMode }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?status=${filter}&sort=${sortMode}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (task: Omit<InsertTask, "userId">) => {
      return apiRequest("POST", "/api/tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created" });
      setAddingToDomainId(null);
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTask }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/tasks/${id}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to complete task", variant: "destructive" });
    },
  });

  const reopenTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/tasks/${id}/reopen`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to reopen task", variant: "destructive" });
    },
  });

  const archiveTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/tasks/${id}/archive`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task archived" });
    },
    onError: () => {
      toast({ title: "Failed to archive task", variant: "destructive" });
    },
  });

  const restoreTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/tasks/${id}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task restored" });
    },
    onError: () => {
      toast({ title: "Failed to restore task", variant: "destructive" });
    },
  });

  const activeDomains = useMemo(
    () => domains.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [domains]
  );

  const tasksByDomain = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    activeDomains.forEach((d) => {
      grouped[d.id] = [];
    });
    tasks.forEach((task) => {
      if (grouped[task.domainId]) {
        grouped[task.domainId].push(task);
      }
    });
    return grouped;
  }, [tasks, activeDomains]);

  const totalTaskCount = tasks.length;
  const showDragHandle = filter === "open" && sortMode === "manual";

  const handleAddTask = (task: Omit<InsertTask, "userId">) => {
    createTaskMutation.mutate(task);
  };

  const handleUpdateTask = (taskId: string, updates: UpdateTask) => {
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  const handleGlobalAddTask = () => {
    if (activeDomains.length > 0) {
      setShowGlobalAddDialog(true);
    } else {
      toast({ title: "No domains available", variant: "destructive" });
    }
  };

  const isLoading = domainsLoading || tasksLoading;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader onAddTask={handleGlobalAddTask} />
      <FilterSortBar
        filter={filter}
        sortMode={sortMode}
        onFilterChange={setFilter}
        onSortChange={setSortMode}
      />

      <main className="flex-1">
        {isLoading ? (
          <TasksLoadingSkeleton />
        ) : totalTaskCount === 0 && filter !== "open" ? (
          <EmptyState status={filter} />
        ) : (
          <div className="mx-auto max-w-6xl pb-8" data-testid="task-list-container">
            {activeDomains.map((domain) => {
              const domainTasks = tasksByDomain[domain.id] || [];
              const isAddingHere = addingToDomainId === domain.id;

              return (
                <div key={domain.id} data-testid={`domain-section-${domain.id}`}>
                  <DomainHeader
                    domain={domain}
                    taskCount={domainTasks.length}
                    onAddTask={(id) => setAddingToDomainId(id)}
                  />
                  {isAddingHere && (
                    <InlineTaskForm
                      domainId={domain.id}
                      onSubmit={handleAddTask}
                      onCancel={() => setAddingToDomainId(null)}
                    />
                  )}
                  {domainTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      showDragHandle={showDragHandle}
                      status={filter}
                      onComplete={(id) => completeTaskMutation.mutate(id)}
                      onReopen={(id) => reopenTaskMutation.mutate(id)}
                      onArchive={(id) => archiveTaskMutation.mutate(id)}
                      onEdit={setEditingTask}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <TaskEditDrawer
        task={editingTask}
        domains={domains}
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
        onRestore={filter === "archived" ? (id) => restoreTaskMutation.mutate(id) : undefined}
      />

      <GlobalAddTaskDialog
        open={showGlobalAddDialog}
        onClose={() => setShowGlobalAddDialog(false)}
        domains={domains}
        onSubmit={handleAddTask}
      />
    </div>
  );
}
