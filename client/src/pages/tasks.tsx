import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  pointerWithin,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { AppHeader } from "@/components/app-header";
import { FilterSortBar } from "@/components/filter-sort-bar";
import { DomainHeader } from "@/components/domain-header";
import { SortableTaskList, type TaskDragData } from "@/components/sortable-task-list";
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
  const [localTasksByDomain, setLocalTasksByDomain] = useState<Record<string, Task[]>>({});
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [hoverDomainId, setHoverDomainId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length === 0) {
      return closestCenter(args);
    }

    const taskCollisions = pointerCollisions.filter(
      (collision) => !String(collision.id).startsWith("domain-drop-")
    );

    if (taskCollisions.length > 0) {
      return taskCollisions;
    }

    return pointerCollisions;
  };

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

  const tasksByDomain = useMemo(() => {
    const result: Record<string, Task[]> = {};
    for (const domainId of Object.keys(serverTasksByDomain)) {
      result[domainId] = localTasksByDomain[domainId] || serverTasksByDomain[domainId];
    }
    return result;
  }, [serverTasksByDomain, localTasksByDomain]);

  const prevTasksRef = useRef(tasks);
  useEffect(() => {
    if (prevTasksRef.current !== tasks) {
      setLocalTasksByDomain({});
      prevTasksRef.current = tasks;
    }
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as TaskDragData | undefined;
    if (data?.type === "task") {
      setActiveTask(data.task);
      setActiveDomainId(data.domainId);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setHoverDomainId(null);
      return;
    }

    let targetDomainId: string | null = null;
    if (over.data.current?.type === "domain") {
      targetDomainId = over.data.current.domainId;
    } else if (over.data.current?.type === "task") {
      targetDomainId = (over.data.current as TaskDragData).domainId;
    }
    setHoverDomainId(targetDomainId);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    setActiveDomainId(null);
    setHoverDomainId(null);
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current as TaskDragData | undefined;
    if (!activeData || activeData.type !== "task") return;

    const sourceDomainId = activeData.domainId;
    const draggedTask = activeData.task;

    let targetDomainId: string | null = null;
    let targetTaskId: string | null = null;

    if (over.data.current?.type === "domain") {
      targetDomainId = over.data.current.domainId;
    } else if (over.data.current?.type === "task") {
      targetDomainId = (over.data.current as TaskDragData).domainId;
      targetTaskId = over.id as string;
    } else {
      return;
    }

    if (!targetDomainId) return;

    if (sourceDomainId === targetDomainId) {
      const domainTasks = tasksByDomain[sourceDomainId] || [];
      const oldIndex = domainTasks.findIndex((t) => t.id === draggedTask.id);
      const newIndex = targetTaskId
        ? domainTasks.findIndex((t) => t.id === targetTaskId)
        : domainTasks.length - 1;

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(domainTasks, oldIndex, newIndex);
        setLocalTasksByDomain((prev) => ({
          ...prev,
          [sourceDomainId]: reordered,
        }));
        reorderTaskMutation.mutate({
          domainId: sourceDomainId,
          taskId: draggedTask.id,
          newIndex,
        });
      }
    } else {
      const sourceTasks = tasksByDomain[sourceDomainId] || [];
      const targetTasks = tasksByDomain[targetDomainId] || [];

      const updatedSourceTasks = sourceTasks.filter((t) => t.id !== draggedTask.id);
      const movedTask = { ...draggedTask, domainId: targetDomainId };

      let insertIndex = targetTasks.length;
      if (targetTaskId) {
        const targetIdx = targetTasks.findIndex((t) => t.id === targetTaskId);
        if (targetIdx !== -1) {
          insertIndex = targetIdx;
        }
      }

      const updatedTargetTasks = [
        ...targetTasks.slice(0, insertIndex),
        movedTask,
        ...targetTasks.slice(insertIndex),
      ];

      setLocalTasksByDomain((prev) => ({
        ...prev,
        [sourceDomainId]: updatedSourceTasks,
        [targetDomainId]: updatedTargetTasks,
      }));

      moveTaskMutation.mutate({
        taskId: draggedTask.id,
        newDomainId: targetDomainId,
        newIndex: insertIndex,
      });
    }
  }

  const handleAddTask = (task: Omit<InsertTask, "userId">) => {
    createTaskMutation.mutate(task);
  };

  const handleUpdateTask = (taskId: string, updates: UpdateTask) => {
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  const handleRenameDomain = (domainId: string, newName: string) => {
    updateDomainMutation.mutate({ id: domainId, updates: { name: newName } });
  };

  const handleGlobalAddTask = () => {
    if (activeDomainsList.length > 0) {
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
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="mx-auto max-w-6xl pb-8" data-testid="task-list-container">
              {activeDomainsList.map((domain) => {
                const domainTasks = tasksByDomain[domain.id] || [];
                const isAddingHere = addingToDomainId === domain.id;

                return (
                  <div key={domain.id} data-testid={`domain-section-${domain.id}`}>
                    <DomainHeader
                      domain={domain}
                      taskCount={domainTasks.length}
                      onAddTask={(id) => setAddingToDomainId(id)}
                      onRename={handleRenameDomain}
                      showDragHandle={false}
                    />
                    {isAddingHere && (
                      <InlineTaskForm
                        domainId={domain.id}
                        onSubmit={handleAddTask}
                        onCancel={() => setAddingToDomainId(null)}
                      />
                    )}
                    <SortableTaskList
                      domainId={domain.id}
                      tasks={domainTasks}
                      filterMode={filter}
                      onComplete={(id) => completeTaskMutation.mutate(id)}
                      onReopen={(id) => reopenTaskMutation.mutate(id)}
                      onArchive={(id) => archiveTaskMutation.mutate(id)}
                      onEdit={setEditingTask}
                      isBeingTargeted={
                        activeDomainId !== null &&
                        activeDomainId !== domain.id &&
                        hoverDomainId === domain.id
                      }
                    />
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
