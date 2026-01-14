import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTaskDragAndDrop } from "@/hooks/use-task-drag-and-drop";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { AppHeader } from "@/components/app-header";
import { FilterSortBar } from "@/components/filter-sort-bar";
import { DomainHeader } from "@/components/domain-header";
import { SortableTaskList } from "@/components/sortable-task-list";
import { InlineTaskForm } from "@/components/inline-task-form";
import { TaskEditDrawer } from "@/components/task-edit-drawer";
import { GlobalAddTaskDialog } from "@/components/global-add-task-dialog";
import { TasksLoadingSkeleton } from "@/components/loading-skeleton";
import type { Domain, Task, FilterMode, SortMode, InsertTask, UpdateTask } from "@shared/schema";

export default function TasksPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [addingToDomainId, setAddingToDomainId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showGlobalAddDialog, setShowGlobalAddDialog] = useState(false);
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const collapsedBeforeDragRef = useRef<Set<string>>(new Set());

  const { data: domains = [], isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { filter, sort: sortMode }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?filter=${filter}&sort=${sortMode}`, {
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

  const updateDomainMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; isActive?: boolean } }) => {
      return apiRequest("PATCH", `/api/domains/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain updated" });
    },
    onError: () => {
      toast({ title: "Failed to update domain", variant: "destructive" });
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

  const reorderTaskMutation = useMutation({
    mutationFn: async (payload: { domainId: string; taskId: string; newIndex: number }) => {
      return apiRequest("POST", `/api/domains/${payload.domainId}/tasks/reorder`, {
        taskId: payload.taskId,
        newIndex: payload.newIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to reorder task", variant: "destructive" });
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: async (payload: { taskId: string; newDomainId: string; newIndex: number }) => {
      await apiRequest("PATCH", `/api/tasks/${payload.taskId}`, {
        domainId: payload.newDomainId,
      });
      await apiRequest("POST", `/api/domains/${payload.newDomainId}/tasks/reorder`, {
        taskId: payload.taskId,
        newIndex: payload.newIndex,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to move task", variant: "destructive" });
    },
  });

  const activeDomainsList = useMemo(
    () => domains.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [domains]
  );

  const serverTasksByDomain = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    activeDomainsList.forEach((d) => {
      grouped[d.id] = [];
    });
    tasks.forEach((task) => {
      if (grouped[task.domainId]) {
        grouped[task.domainId].push(task);
      }
    });
    Object.keys(grouped).forEach((domainId) => {
      grouped[domainId].sort((a, b) => a.domainSortOrder - b.domainSortOrder);
    });
    return grouped;
  }, [tasks, activeDomainsList]);

  const {
    sensors,
    collisionDetection,
    activeTask,
    hoverDomainId,
    dropTarget,
    localTasksByDomain,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    isDragActive,
  } = useTaskDragAndDrop({
    tasksByDomain: serverTasksByDomain,
    onReorderTask: (payload) => reorderTaskMutation.mutate(payload),
    onMoveTask: (payload) => moveTaskMutation.mutate(payload),
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        if (activeDomainsList.length > 0) {
          setShowGlobalAddDialog(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDomainsList]);

  const handleAddTask = (task: Omit<InsertTask, "userId">) => {
    createTaskMutation.mutate(task);
  };

  const handleUpdateTask = (taskId: string, updates: UpdateTask) => {
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  const handleRenameDomain = (domainId: string, newName: string) => {
    updateDomainMutation.mutate({ id: domainId, updates: { name: newName } });
  };

  const handleTitleChange = (taskId: string, newTitle: string) => {
    updateTaskMutation.mutate({ id: taskId, updates: { title: newTitle } });
  };

  const handleGlobalAddTask = () => {
    if (activeDomainsList.length > 0) {
      setShowGlobalAddDialog(true);
    } else {
      toast({ title: "No domains available", variant: "destructive" });
    }
  };

  const handleToggleCollapse = (domainId: string) => {
    setCollapsedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const wrappedHandleDragStart = (event: Parameters<typeof handleDragStart>[0]) => {
    collapsedBeforeDragRef.current = new Set(collapsedDomains);
    setCollapsedDomains(new Set());
    handleDragStart(event);
  };

  const wrappedHandleDragEnd = (event: Parameters<typeof handleDragEnd>[0]) => {
    handleDragEnd(event);
    setCollapsedDomains(collapsedBeforeDragRef.current);
  };

  const isLoading = domainsLoading || tasksLoading;
  
  const showDragHandles = filter === "all" && sortMode === "manual";

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
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={wrappedHandleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={wrappedHandleDragEnd}
          >
            <div className="mx-auto max-w-6xl pb-8" data-testid="task-list-container">
              {activeDomainsList.map((domain) => {
                const domainTasks = localTasksByDomain[domain.id] || [];
                const isAddingHere = addingToDomainId === domain.id;

                const isCollapsed = collapsedDomains.has(domain.id) && !isDragActive;

                return (
                  <div key={domain.id} data-testid={`domain-section-${domain.id}`}>
                    <DomainHeader
                      domain={domain}
                      taskCount={domainTasks.length}
                      onAddTask={(id) => setAddingToDomainId(id)}
                      onRename={handleRenameDomain}
                      showDragHandle={false}
                      isCollapsed={isCollapsed}
                      onToggleCollapse={handleToggleCollapse}
                    />
                    {isAddingHere && (
                      <InlineTaskForm
                        domainId={domain.id}
                        onSubmit={handleAddTask}
                        onCancel={() => setAddingToDomainId(null)}
                      />
                    )}
                    {!isCollapsed && (
                      <SortableTaskList
                        domainId={domain.id}
                        tasks={domainTasks}
                        filterMode={filter}
                        showDragHandles={showDragHandles}
                        onComplete={(id) => completeTaskMutation.mutate(id)}
                        onReopen={(id) => reopenTaskMutation.mutate(id)}
                        onArchive={(id) => archiveTaskMutation.mutate(id)}
                        onEdit={setEditingTask}
                        onTitleChange={handleTitleChange}
                        isBeingTargeted={
                          activeTask !== null && hoverDomainId === domain.id
                        }
                        dropTargetIndex={
                          dropTarget?.domainId === domain.id ? dropTarget.index : null
                        }
                        isDragActive={isDragActive}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="rounded-md border bg-background px-4 py-3 shadow-lg">
                  <span className="font-medium">{activeTask.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
