import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowLeft, Plus, GripVertical, Pencil, Check, X } from "lucide-react";
import type { Domain, Task } from "@shared/schema";

interface SortableDomainRowProps {
  domain: Domain;
  onRename: (id: string, name: string) => void;
  onToggleActive: (domain: Domain) => void;
}

function SortableDomainRow({ domain, onRename, onToggleActive }: SortableDomainRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(domain.name);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: domain.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== domain.name) {
      onRename(domain.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(domain.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border-b px-4 py-3 bg-background hover-elevate ${!domain.isActive ? "opacity-50" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`domain-row-${domain.id}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
        style={{ visibility: isHovered ? "visible" : "hidden" }}
        data-testid={`drag-handle-domain-${domain.id}`}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {isEditing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-8 flex-1"
            data-testid={`input-domain-name-${domain.id}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSave();
            }}
            data-testid={`button-save-domain-${domain.id}`}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCancel();
            }}
            data-testid={`button-cancel-domain-${domain.id}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 font-medium cursor-pointer ${!domain.isActive ? "line-through text-muted-foreground" : ""}`}
            onDoubleClick={() => {
              setEditValue(domain.name);
              setIsEditing(true);
            }}
            data-testid={`text-domain-name-${domain.id}`}
          >
            {domain.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            style={{ visibility: isHovered ? "visible" : "hidden" }}
            onClick={() => {
              setEditValue(domain.name);
              setIsEditing(true);
            }}
            data-testid={`button-edit-domain-${domain.id}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Switch
            checked={domain.isActive}
            onCheckedChange={() => onToggleActive(domain)}
            data-testid={`switch-domain-active-${domain.id}`}
          />
        </>
      )}
    </div>
  );
}

export default function ManageDomainsPage() {
  const { toast } = useToast();
  const [newDomainName, setNewDomainName] = useState("");
  const [localDomains, setLocalDomains] = useState<Domain[]>([]);
  const [reassignDialog, setReassignDialog] = useState<{
    domain: Domain;
    taskCount: number;
  } | null>(null);
  const [selectedTargetDomain, setSelectedTargetDomain] = useState<string>("");

  const { data: domains = [], isLoading } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { filter: "all", sort: "manual" }],
    queryFn: async () => {
      const res = await fetch("/api/tasks?filter=all&sort=manual", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  useEffect(() => {
    setLocalDomains(domains.slice().sort((a, b) => a.sortOrder - b.sortOrder));
  }, [domains]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const createDomainMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/domains", { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({ title: "Domain created" });
      setNewDomainName("");
    },
    onError: () => {
      toast({ title: "Failed to create domain", variant: "destructive" });
    },
  });

  const updateDomainMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { name?: string; isActive?: boolean } }) => {
      return apiRequest("PATCH", `/api/domains/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Domain updated" });
    },
    onError: () => {
      toast({ title: "Failed to update domain", variant: "destructive" });
    },
  });

  const reorderDomainsMutation = useMutation({
    mutationFn: async (domainIds: string[]) => {
      return apiRequest("POST", "/api/domains/reorder", { domainIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
    },
    onError: () => {
      toast({ title: "Failed to reorder domains", variant: "destructive" });
    },
  });

  const reassignTasksMutation = useMutation({
    mutationFn: async ({ fromDomainId, toDomainId }: { fromDomainId: string; toDomainId: string }) => {
      const tasksToMove = allTasks.filter((t) => t.domainId === fromDomainId);
      for (const task of tasksToMove) {
        await apiRequest("PATCH", `/api/tasks/${task.id}`, { domainId: toDomainId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to reassign tasks", variant: "destructive" });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localDomains.findIndex((d) => d.id === active.id);
    const newIndex = localDomains.findIndex((d) => d.id === over.id);

    const newOrder = arrayMove(localDomains, oldIndex, newIndex);
    setLocalDomains(newOrder);
    reorderDomainsMutation.mutate(newOrder.map((d) => d.id));
  };

  const handleCreateDomain = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDomainName.trim();
    if (trimmed) {
      createDomainMutation.mutate(trimmed);
    }
  };

  const handleRenameDomain = (id: string, name: string) => {
    updateDomainMutation.mutate({ id, updates: { name } });
  };

  const handleToggleActive = (domain: Domain) => {
    if (domain.isActive) {
      const tasksInDomain = allTasks.filter((t) => t.domainId === domain.id);
      if (tasksInDomain.length > 0) {
        setReassignDialog({ domain, taskCount: tasksInDomain.length });
        const otherActiveDomains = domains.filter((d) => d.isActive && d.id !== domain.id);
        if (otherActiveDomains.length > 0) {
          setSelectedTargetDomain(otherActiveDomains[0].id);
        }
      } else {
        updateDomainMutation.mutate({ id: domain.id, updates: { isActive: false } });
      }
    } else {
      updateDomainMutation.mutate({ id: domain.id, updates: { isActive: true } });
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignDialog || !selectedTargetDomain) return;
    
    await reassignTasksMutation.mutateAsync({
      fromDomainId: reassignDialog.domain.id,
      toDomainId: selectedTargetDomain,
    });
    
    await updateDomainMutation.mutateAsync({
      id: reassignDialog.domain.id,
      updates: { isActive: false },
    });
    
    setReassignDialog(null);
    setSelectedTargetDomain("");
  };

  const handleCancelReassign = () => {
    setReassignDialog(null);
    setSelectedTargetDomain("");
  };

  const otherActiveDomains = domains.filter(
    (d) => d.isActive && d.id !== reassignDialog?.domain.id
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-to-tasks">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">
            Manage Domains
          </h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Domain</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDomain} className="flex gap-2">
                <Input
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="Enter domain name"
                  className="flex-1"
                  data-testid="input-new-domain-name"
                />
                <Button
                  type="submit"
                  disabled={!newDomainName.trim() || createDomainMutation.isPending}
                  data-testid="button-create-domain"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Domains</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : localDomains.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No domains yet</div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localDomains.map((d) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localDomains.map((domain) => (
                      <SortableDomainRow
                        key={domain.id}
                        domain={domain}
                        onRename={handleRenameDomain}
                        onToggleActive={handleToggleActive}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!reassignDialog} onOpenChange={(open) => !open && handleCancelReassign()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Tasks</DialogTitle>
            <DialogDescription>
              {reassignDialog?.domain.name} has {reassignDialog?.taskCount} task(s). 
              Please select a domain to move them to before disabling.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {otherActiveDomains.length > 0 ? (
              <Select value={selectedTargetDomain} onValueChange={setSelectedTargetDomain}>
                <SelectTrigger data-testid="select-target-domain">
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {otherActiveDomains.map((d) => (
                    <SelectItem key={d.id} value={d.id} data-testid={`option-domain-${d.id}`}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No other active domains available. Please create or enable another domain first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelReassign} data-testid="button-cancel-reassign">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReassign}
              disabled={!selectedTargetDomain || reassignTasksMutation.isPending}
              data-testid="button-confirm-reassign"
            >
              Reassign & Disable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
