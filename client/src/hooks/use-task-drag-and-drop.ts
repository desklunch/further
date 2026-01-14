import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  pointerWithin,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task } from "@shared/schema";

export interface TaskDragData {
  type: "task";
  task: Task;
  domainId: string;
}

interface UseTaskDragAndDropProps {
  tasksByDomain: Record<string, Task[]>;
  onReorderTask: (payload: { domainId: string; taskId: string; newIndex: number }) => void;
  onMoveTask: (payload: { taskId: string; newDomainId: string; newIndex: number }) => void;
}

interface UseTaskDragAndDropReturn {
  sensors: ReturnType<typeof useSensors>;
  collisionDetection: CollisionDetection;
  activeTask: Task | null;
  activeDomainId: string | null;
  hoverDomainId: string | null;
  dropTarget: { domainId: string; index: number } | null;
  localTasksByDomain: Record<string, Task[]>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  isDragActive: boolean;
}

export function useTaskDragAndDrop({
  tasksByDomain,
  onReorderTask,
  onMoveTask,
}: UseTaskDragAndDropProps): UseTaskDragAndDropReturn {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string | null>(null);
  const [hoverDomainId, setHoverDomainId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ domainId: string; index: number } | null>(null);
  const [localTasksByDomain, setLocalTasksByDomain] = useState<Record<string, Task[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length === 0) {
      return closestCenter(args);
    }

    // Prioritize domain-header-drop zones (for collapsed domains) when pointer is directly over them
    const domainHeaderCollisions = pointerCollisions.filter(
      (collision) => String(collision.id).startsWith("domain-header-drop-")
    );

    // If there's a direct hit on a domain-header-drop zone, prioritize it
    if (domainHeaderCollisions.length > 0) {
      const firstHeader = domainHeaderCollisions[0];
      const container = args.droppableContainers.find(c => c.id === firstHeader.id);
      if (container?.rect.current) {
        const rect = container.rect.current;
        const pointer = args.pointerCoordinates;
        if (pointer && 
            pointer.x >= rect.left && pointer.x <= rect.right &&
            pointer.y >= rect.top && pointer.y <= rect.bottom) {
          return domainHeaderCollisions;
        }
      }
    }

    // Filter out domain-drop and domain-header-drop to get task collisions
    const taskCollisions = pointerCollisions.filter(
      (collision) => {
        const id = String(collision.id);
        return !id.startsWith("domain-drop-") && !id.startsWith("domain-header-drop-");
      }
    );

    if (taskCollisions.length > 0) {
      return taskCollisions;
    }

    return pointerCollisions;
  }, []);

  const prevTasksByDomainRef = useRef(tasksByDomain);
  useEffect(() => {
    if (prevTasksByDomainRef.current !== tasksByDomain) {
      setLocalTasksByDomain({});
      prevTasksByDomainRef.current = tasksByDomain;
    }
  }, [tasksByDomain]);

  const mergedTasksByDomain = useMemo(() => {
    const result: Record<string, Task[]> = {};
    for (const domainId of Object.keys(tasksByDomain)) {
      result[domainId] = localTasksByDomain[domainId] || tasksByDomain[domainId];
    }
    return result;
  }, [tasksByDomain, localTasksByDomain]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as TaskDragData | undefined;
    if (data?.type === "task") {
      setActiveTask(data.task);
      setActiveDomainId(data.domainId);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over, active } = event;
    if (!over) {
      setHoverDomainId(null);
      setDropTarget(null);
      return;
    }

    let targetDomainId: string | null = null;
    let insertIndex: number | null = null;

    if (over.data.current?.type === "domain" || over.data.current?.type === "domain-header") {
      const domainId = over.data.current.domainId as string;
      targetDomainId = domainId;
      const domainTasks = mergedTasksByDomain[domainId] || [];
      insertIndex = domainTasks.length;
    } else if (over.data.current?.type === "end-zone") {
      const domainId = over.data.current.domainId as string;
      targetDomainId = domainId;
      insertIndex = over.data.current.index as number;
    } else if (over.data.current?.type === "task") {
      const taskData = over.data.current as TaskDragData;
      const domainId = taskData.domainId;
      targetDomainId = domainId;
      const domainTasks = mergedTasksByDomain[domainId] || [];
      const overIndex = domainTasks.findIndex((t) => t.id === over.id);
      insertIndex = overIndex >= 0 ? overIndex : domainTasks.length;
    }

    setHoverDomainId(targetDomainId);

    const activeData = active.data.current as TaskDragData | undefined;
    const sourceDomainId = activeData?.domainId;
    const activeTaskId = activeData?.task?.id;

    if (targetDomainId && insertIndex !== null) {
      let adjustedIndex = insertIndex;
      
      if (sourceDomainId === targetDomainId && activeTaskId) {
        const domainTasks = mergedTasksByDomain[targetDomainId] || [];
        const activeIndex = domainTasks.findIndex((t) => t.id === activeTaskId);
        if (activeIndex !== -1 && activeIndex < insertIndex) {
          adjustedIndex = insertIndex;
        }
      }
      
      setDropTarget({ domainId: targetDomainId, index: adjustedIndex });
    } else {
      setDropTarget(null);
    }
  }, [mergedTasksByDomain]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    setActiveDomainId(null);
    setHoverDomainId(null);
    setDropTarget(null);

    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current as TaskDragData | undefined;
    if (!activeData || activeData.type !== "task") return;

    const sourceDomainId = activeData.domainId;
    const draggedTask = activeData.task;

    let targetDomainId: string | null = null;
    let targetTaskId: string | null = null;
    let endZoneIndex: number | null = null;

    if (over.data.current?.type === "domain" || over.data.current?.type === "domain-header") {
      targetDomainId = over.data.current.domainId;
    } else if (over.data.current?.type === "end-zone") {
      targetDomainId = over.data.current.domainId as string;
      endZoneIndex = over.data.current.index as number;
    } else if (over.data.current?.type === "task") {
      targetDomainId = (over.data.current as TaskDragData).domainId;
      targetTaskId = over.id as string;
    } else {
      return;
    }

    if (!targetDomainId) return;

    if (sourceDomainId === targetDomainId) {
      const domainTasks = mergedTasksByDomain[sourceDomainId] || [];
      const oldIndex = domainTasks.findIndex((t) => t.id === draggedTask.id);
      let newIndex: number;
      if (endZoneIndex !== null) {
        newIndex = domainTasks.length - 1;
      } else if (targetTaskId) {
        newIndex = domainTasks.findIndex((t) => t.id === targetTaskId);
      } else {
        newIndex = domainTasks.length - 1;
      }

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(domainTasks, oldIndex, newIndex);
        setLocalTasksByDomain((prev) => ({
          ...prev,
          [sourceDomainId]: reordered,
        }));
        onReorderTask({
          domainId: sourceDomainId,
          taskId: draggedTask.id,
          newIndex,
        });
      }
    } else {
      const sourceTasks = mergedTasksByDomain[sourceDomainId] || [];
      const targetTasks = mergedTasksByDomain[targetDomainId] || [];

      const updatedSourceTasks = sourceTasks.filter((t) => t.id !== draggedTask.id);
      const movedTask = { ...draggedTask, domainId: targetDomainId };

      let insertIndex = targetTasks.length;
      if (endZoneIndex !== null) {
        insertIndex = targetTasks.length;
      } else if (targetTaskId) {
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

      onMoveTask({
        taskId: draggedTask.id,
        newDomainId: targetDomainId,
        newIndex: insertIndex,
      });
    }
  }, [mergedTasksByDomain, onReorderTask, onMoveTask]);

  return {
    sensors,
    collisionDetection,
    activeTask,
    activeDomainId,
    hoverDomainId,
    dropTarget,
    localTasksByDomain: mergedTasksByDomain,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    isDragActive: activeTask !== null,
  };
}
