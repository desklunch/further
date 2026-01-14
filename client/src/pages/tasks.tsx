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
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppHeader } from "@/components/app-header";
import { FilterSortBar } from "@/components/filter-sort-bar";
import { DomainHeader } from "@/components/domain-header";
import { DroppableDomain } from "@/components/droppable-domain";
import { TaskRowOverlay } from "@/components/sortable-task-row";
import { InlineTaskForm } from "@/components/inline-task-form";
import { TaskEditDrawer } from "@/components/task-edit-drawer";
import { GlobalAddTaskDialog } from "@/components/global-add-task-dialog";
import { TasksLoadingSkeleton } from "@/components/loading-skeleton";
import type { Domain, Task, FilterMode, SortMode, InsertTask, UpdateTask } from "@shared/schema";

interface ReorderPayload {
  taskId: string;
  newDomainId: string;
  newIndex: number;
}

interface TaskDragData {
  type: "task";
  task: Task;
  domainId: string;
}

interface DomainDragData {
  type: "domain";
  domain: Domain;
}

interface DomainDropData {
  type: "domain-drop";
  domainId: string;
}

type DragData = TaskDragData | DomainDragData | DomainDropData;

interface SortableDomainSectionProps {
  domain: Domain;
  taskCount: number;
  showDragHandle: boolean;
  onAddTask: (domainId: string) => void;
  onRename: (domainId: string, newName: string) => void;
  children: React.ReactNode;
}

function SortableDomainSection({ 
  domain, 
  taskCount, 
  showDragHandle,
  onAddTask, 
  onRename, 
  children 
}: SortableDomainSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `domain-sort-${domain.id}`,
    data: { type: "domain", domain }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="group"
      data-testid={`domain-section-${domain.id}`}
    >
      <DomainHeader
        domain={domain}
        taskCount={taskCount}
        onAddTask={onAddTask}
        onRename={onRename}
        showDragHandle={showDragHandle}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      {children}
    </div>
  );
}

function DomainHeaderOverlay({ domain }: { domain: Domain }) {
  return (
    <div className="rounded-md border bg-muted/90 px-4 py-3 shadow-lg backdrop-blur-sm">
      <span className="text-lg font-semibold">{domain.name}</span>
    </div>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("manual");
  const [addingToDomainId, setAddingToDomainId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showGlobalAddDialog, setShowGlobalAddDialog] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null);
  const [overDomainId, setOverDomainId] = useState<string | null>(null);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [optimisticTasks, setOptimisticTasks] = useState<Task[] | null>(null);
  const [optimisticDomains, setOptimisticDomains] = useState<Domain[] | null>(null);
  const [dragItemType, setDragItemType] = useState<"task" | "domain" | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: serverDomains = [], isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const domains = optimisticDomains ?? serverDomains;

  const { data: serverTasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { filter, sort: sortMode }],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?filter=${filter}&sort=${sortMode}`, {
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

  const reorderDomainsMutation = useMutation({
    mutationFn: async (orderedDomainIds: string[]) => {
      return apiRequest("POST", "/api/domains/reorder", { ordered_domain_ids: orderedDomainIds });
    },
    onSuccess: () => {
      setOptimisticDomains(null);
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
    },
    onError: () => {
      setOptimisticDomains(null);
      toast({ title: "Failed to reorder domains", variant: "destructive" });
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

  const activeDomainsList = useMemo(
    () => domains.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [domains]
  );

  const domainSortIds = useMemo(
    () => activeDomainsList.map((d) => `domain-sort-${d.id}`),
    [activeDomainsList]
  );

  const tasksByDomain = useMemo(() => {
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

  const showDragHandle = (filter === "open" || filter === "all") && sortMode === "manual";

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragData | undefined;
    
    if (!data) return;
    
    if (data.type === "domain") {
      setActiveDomain(data.domain);
      setDragItemType("domain");
    } else if (data.type === "task") {
      setActiveTask(data.task);
      setDragItemType("task");
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (dragItemType !== "task") return;

    const { over } = event;
    if (!over) {
      setOverDomainId(null);
      return;
    }

    const overData = over.data.current as DragData | undefined;
    if (!overData) {
      setOverDomainId(null);
      return;
    }
    
    if (overData.type === "domain-drop") {
      setOverDomainId(overData.domainId);
    } else if (overData.type === "task") {
      setOverDomainId(overData.domainId);
    } else {
      setOverDomainId(null);
    }
  }, [dragItemType]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveTask(null);
    setActiveDomain(null);
    setOverDomainId(null);
    setDragItemType(null);

    if (!over) return;
    if (active.id === over.id) return;

    const activeData = active.data.current as DragData | undefined;
    const overData = over.data.current as DragData | undefined;
    
    if (!activeData || !overData) return;

    // Handle domain reordering
    if (activeData.type === "domain" && overData.type === "domain") {
      const oldIndex = activeDomainsList.findIndex((d) => d.id === activeData.domain.id);
      const newIndex = activeDomainsList.findIndex((d) => d.id === overData.domain.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(activeDomainsList, oldIndex, newIndex);
        const newDomains = domains.map((d) => {
          const newIdx = newOrder.findIndex((nd) => nd.id === d.id);
          if (newIdx !== -1) {
            return { ...d, sortOrder: newIdx };
          }
          return d;
        });
        
        setOptimisticDomains(newDomains);
        reorderDomainsMutation.mutate(newOrder.map((d) => d.id));
      }
      return;
    }

    // Handle task reordering
    if (activeData.type !== "task") return;
    if (!showDragHandle) return;

    const activeId = active.id.toString();
    const currentTasks = optimisticTasks ?? serverTasks;
    const activeTaskData = activeData.task;

    const getGroupedTasks = (taskList: Task[]) => {
      const grouped: Record<string, Task[]> = {};
      activeDomainsList.forEach((d) => {
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

    if (overData.type === "domain-drop") {
      // Dropped on an empty domain area
      targetDomainId = overData.domainId;
      const domainTasks = currentGrouped[targetDomainId] || [];
      targetIndex = domainTasks.filter((t) => t.id !== activeId).length;
    } else if (overData.type === "task") {
      // Dropped on another task
      targetDomainId = overData.domainId;
      const domainTasks = currentGrouped[targetDomainId] || [];
      const filteredTasks = domainTasks.filter((t) => t.id !== activeId);
      const overIndex = filteredTasks.findIndex((t) => t.id === overData.task.id);
      targetIndex = Math.max(0, overIndex >= 0 ? overIndex : filteredTasks.length);
    } else {
      // Dropped on a domain header - ignore
      return;
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
  }, [serverTasks, optimisticTasks, activeDomainsList, domains, showDragHandle, reorderTaskMutation, reorderDomainsMutation]);

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
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="mx-auto max-w-6xl pb-8" data-testid="task-list-container">
              <SortableContext items={domainSortIds} strategy={verticalListSortingStrategy}>
                {activeDomainsList.map((domain) => {
                  const domainTasks = tasksByDomain[domain.id] || [];
                  const isAddingHere = addingToDomainId === domain.id;
                  const isOverThisDomain = overDomainId === domain.id;

                  return (
                    <SortableDomainSection
                      key={domain.id}
                      domain={domain}
                      taskCount={domainTasks.length}
                      showDragHandle={showDragHandle}
                      onAddTask={(id) => setAddingToDomainId(id)}
                      onRename={handleRenameDomain}
                    >
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
                        filterMode={filter}
                        pendingTaskIds={pendingTaskIds}
                        isOver={isOverThisDomain && dragItemType === "task"}
                        activeTaskId={activeTask?.id}
                        onComplete={(id) => completeTaskMutation.mutate(id)}
                        onReopen={(id) => reopenTaskMutation.mutate(id)}
                        onArchive={(id) => archiveTaskMutation.mutate(id)}
                        onEdit={setEditingTask}
                      />
                    </SortableDomainSection>
                  );
                })}
              </SortableContext>
            </div>

            <DragOverlay dropAnimation={{ duration: 250, easing: "ease" }}>
              {activeTask ? <TaskRowOverlay task={activeTask} /> : null}
              {activeDomain ? <DomainHeaderOverlay domain={activeDomain} /> : null}
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
