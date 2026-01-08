import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { AppHeader } from "@/components/app-header";
import { FilterSortBar } from "@/components/filter-sort-bar";
import { DomainHeader } from "@/components/domain-header";
import { DroppableDomain } from "@/components/droppable-domain";
import { TaskRowOverlay } from "@/components/sortable-task-row";
import { InlineTaskForm } from "@/components/inline-task-form";
import { TaskEditDrawer } from "@/components/task-edit-drawer";
import { GlobalAddTaskDialog } from "@/components/global-add-task-dialog";
import { EmptyState } from "@/components/empty-state";
import { TasksLoadingSkeleton } from "@/components/loading-skeleton";
import type { Domain, Task, TaskStatus, SortMode, InsertTask, UpdateTask } from "@shared/schema";

interface ReorderPayload {
  taskId: string;
  newDomainId: string;
  newIndex: number;
}

export default function TasksPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<TaskStatus>("open");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [addingToDomainId, setAddingToDomainId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showGlobalAddDialog, setShowGlobalAddDialog] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overDomainId, setOverDomainId] = useState<string | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [optimisticTasks, setOptimisticTasks] = useState<Task[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: domains = [], isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: serverTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { status: filter, sort: sortMode }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?status=${filter}&sort=${sortMode}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const tasks = optimisticTasks ?? serverTasks;

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

  const reorderTaskMutation = useMutation({
    mutationFn: async (payload: ReorderPayload) => {
      return apiRequest("POST", `/api/domains/${payload.newDomainId}/tasks/reorder`, {
        taskId: payload.taskId,
        newIndex: payload.newIndex,
      });
    },
    onSuccess: (_, variables) => {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.taskId);
        return next;
      });
      setOptimisticTasks(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (_, variables) => {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(variables.taskId);
        return next;
      });
      setOptimisticTasks(null);
      toast({ title: "Failed to reorder task", variant: "destructive" });
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
    Object.keys(grouped).forEach((domainId) => {
      grouped[domainId].sort((a, b) => a.domainSortOrder - b.domainSortOrder);
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }, [tasks]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverDomainId(null);
      return;
    }

    const overId = over.id.toString();
    if (overId.startsWith("domain-")) {
      setOverDomainId(overId.replace("domain-", ""));
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        setOverDomainId(overTask.domainId);
      }
    }
  }, [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverDomainId(null);

    if (!over || !showDragHandle) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId === overId) return;

    const currentTasks = optimisticTasks ?? serverTasks;
    const activeTaskData = currentTasks.find((t) => t.id === activeId);
    if (!activeTaskData) return;

    const getGroupedTasks = (taskList: Task[]) => {
      const grouped: Record<string, Task[]> = {};
      activeDomains.forEach((d) => {
        grouped[d.id] = [];
      });
      taskList.forEach((task) => {
        if (grouped[task.domainId]) {
          grouped[task.domainId].push(task);
        }
      });
      Object.keys(grouped).forEach((domainId) => {
        grouped[domainId].sort((a, b) => a.domainSortOrder - b.domainSortOrder);
      });
      return grouped;
    };

    const currentGrouped = getGroupedTasks(currentTasks);

    let targetDomainId: string;
    let targetIndex: number;

    if (overId.startsWith("domain-")) {
      targetDomainId = overId.replace("domain-", "");
      const domainTasks = currentGrouped[targetDomainId] || [];
      targetIndex = domainTasks.filter((t) => t.id !== activeId).length;
    } else {
      const overTask = currentTasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetDomainId = overTask.domainId;
      const domainTasks = currentGrouped[targetDomainId] || [];
      const filteredTasks = domainTasks.filter((t) => t.id !== activeId);
      const overIndex = filteredTasks.findIndex((t) => t.id === overId);
      targetIndex = Math.max(0, overIndex >= 0 ? overIndex : filteredTasks.length);
    }

    targetIndex = Math.max(0, targetIndex);

    const sourceDomainId = activeTaskData.domainId;
    const isSameDomain = sourceDomainId === targetDomainId;

    const newTasks = currentTasks.map((t) => ({ ...t }));

    if (isSameDomain) {
      const domainTasks = newTasks
        .filter((t) => t.domainId === targetDomainId)
        .sort((a, b) => a.domainSortOrder - b.domainSortOrder);
      
      const taskIds = domainTasks.map((t) => t.id);
      const oldIndex = taskIds.indexOf(activeId);
      
      if (oldIndex !== -1 && oldIndex !== targetIndex) {
        taskIds.splice(oldIndex, 1);
        taskIds.splice(targetIndex, 0, activeId);
        
        taskIds.forEach((id, idx) => {
          const task = newTasks.find((t) => t.id === id);
          if (task) {
            task.domainSortOrder = idx;
          }
        });
      }
    } else {
      const sourceDomainTasks = newTasks
        .filter((t) => t.domainId === sourceDomainId && t.id !== activeId)
        .sort((a, b) => a.domainSortOrder - b.domainSortOrder);
      
      sourceDomainTasks.forEach((t, idx) => {
        t.domainSortOrder = idx;
      });

      const destDomainTasks = newTasks
        .filter((t) => t.domainId === targetDomainId && t.id !== activeId)
        .sort((a, b) => a.domainSortOrder - b.domainSortOrder);
      
      const clampedIndex = Math.min(targetIndex, destDomainTasks.length);
      
      destDomainTasks.forEach((t, idx) => {
        t.domainSortOrder = idx >= clampedIndex ? idx + 1 : idx;
      });

      const movedTask = newTasks.find((t) => t.id === activeId);
      if (movedTask) {
        movedTask.domainId = targetDomainId;
        movedTask.domainSortOrder = clampedIndex;
      }
    }

    setOptimisticTasks(newTasks);
    setPendingTaskIds((prev) => new Set(prev).add(activeId));

    const finalIndex = isSameDomain ? targetIndex : Math.min(targetIndex, (currentGrouped[targetDomainId] || []).filter((t) => t.id !== activeId).length);

    reorderTaskMutation.mutate({
      taskId: activeId,
      newDomainId: targetDomainId,
      newIndex: finalIndex,
    });
  }, [serverTasks, optimisticTasks, activeDomains, showDragHandle, reorderTaskMutation]);

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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="mx-auto max-w-6xl pb-8" data-testid="task-list-container">
              {activeDomains.map((domain) => {
                const domainTasks = tasksByDomain[domain.id] || [];
                const isAddingHere = addingToDomainId === domain.id;
                const isOverThisDomain = overDomainId === domain.id;

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
                    <DroppableDomain
                      domainId={domain.id}
                      tasks={domainTasks}
                      showDragHandle={showDragHandle}
                      status={filter}
                      pendingTaskIds={pendingTaskIds}
                      isOver={isOverThisDomain}
                      activeTaskId={activeTask?.id}
                      onComplete={(id) => completeTaskMutation.mutate(id)}
                      onReopen={(id) => reopenTaskMutation.mutate(id)}
                      onArchive={(id) => archiveTaskMutation.mutate(id)}
                      onEdit={setEditingTask}
                    />
                  </div>
                );
              })}
            </div>

            <DragOverlay dropAnimation={{ duration: 250, easing: "ease" }}>
              {activeTask ? <TaskRowOverlay task={activeTask} /> : null}
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
