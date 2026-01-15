import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  X, 
  Sparkles,
  Pencil,
  Check,
  GripVertical
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import type { Domain, HabitDefinition, HabitOption } from "@shared/schema";

interface HabitWithOptions extends HabitDefinition {
  options: HabitOption[];
}

export default function HabitsPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitDomainId, setNewHabitDomainId] = useState("");
  const [newHabitSelectionType, setNewHabitSelectionType] = useState<"single" | "multi">("single");
  const [newHabitMinRequired, setNewHabitMinRequired] = useState(1);
  const [newOptionLabels, setNewOptionLabels] = useState<string[]>([""]);
  
  const [editForm, setEditForm] = useState<{
    name: string;
    domainId: string;
    selectionType: "single" | "multi";
    minRequired: number;
  }>({ name: "", domainId: "", selectionType: "single", minRequired: 1 });

  const { data: domains = [] } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: habits = [], isLoading } = useQuery<HabitWithOptions[]>({
    queryKey: ["/api/habits"],
    queryFn: async () => {
      const res = await fetch("/api/habits", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch habits");
      return res.json();
    },
  });

  const createHabitMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      domainId: string; 
      selectionType: "single" | "multi";
      minRequired?: number;
      options: string[];
    }) => {
      return apiRequest("POST", "/api/habits", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      toast({ title: "Habit created" });
      resetForm();
      setShowCreateDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create habit", variant: "destructive" });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HabitDefinition> }) => {
      return apiRequest("PATCH", `/api/habits/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      toast({ title: "Habit updated" });
      setEditingHabitId(null);
    },
    onError: () => {
      toast({ title: "Failed to update habit", variant: "destructive" });
    },
  });

  const addOptionMutation = useMutation({
    mutationFn: async ({ habitId, label }: { habitId: string; label: string }) => {
      return apiRequest("POST", `/api/habits/${habitId}/options`, { label });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
    onError: () => {
      toast({ title: "Failed to add option", variant: "destructive" });
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ optionId, label }: { optionId: string; label: string }) => {
      return apiRequest("PATCH", `/api/habits/options/${optionId}`, { label });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
    onError: () => {
      toast({ title: "Failed to update option", variant: "destructive" });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return apiRequest("DELETE", `/api/habits/options/${optionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
    onError: () => {
      toast({ title: "Failed to delete option", variant: "destructive" });
    },
  });

  const [localOptionOrder, setLocalOptionOrder] = useState<Record<string, HabitOption[]>>({});
  
  // DnD state per guidelines
  const [activeOption, setActiveOption] = useState<HabitOption | null>(null);
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ habitId: string; index: number } | null>(null);

  const reorderOptionsMutation = useMutation({
    mutationFn: async ({ habitId, orderedIds }: { habitId: string; orderedIds: string[] }) => {
      return apiRequest("POST", `/api/habits/${habitId}/options/reorder`, { orderedIds });
    },
    onSuccess: (_, { habitId }) => {
      setLocalOptionOrder(prev => {
        const next = { ...prev };
        delete next[habitId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
    },
    onError: (_, { habitId }) => {
      setLocalOptionOrder(prev => {
        const next = { ...prev };
        delete next[habitId];
        return next;
      });
      toast({ title: "Failed to reorder options", variant: "destructive" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getOptionsForHabit = (habit: HabitWithOptions): HabitOption[] => {
    return localOptionOrder[habit.id] || habit.options;
  };

  // Custom collision detection per guidelines
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length === 0) return closestCenter(args);
    const itemCollisions = pointerCollisions.filter(
      (c) => !String(c.id).startsWith("end-zone-")
    );
    return itemCollisions.length > 0 ? itemCollisions : pointerCollisions;
  };

  const handleOptionDragStart = (habitId: string, displayedOptions: HabitOption[]) => (event: DragStartEvent) => {
    const option = displayedOptions.find(o => o.id === event.active.id);
    if (option) {
      setActiveOption(option);
      setActiveHabitId(habitId);
    }
  };

  const handleOptionDragOver = (habitId: string, displayedOptions: HabitOption[]) => (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setDropTarget(null);
      return;
    }

    // Check if hovering over end zone
    if (String(over.id).startsWith("end-zone-")) {
      setDropTarget({ habitId, index: displayedOptions.length });
      return;
    }

    // Find the index of the option being hovered over
    const overIndex = displayedOptions.findIndex(o => o.id === over.id);
    if (overIndex !== -1) {
      setDropTarget({ habitId, index: overIndex });
    }
  };

  const handleOptionDragEnd = (habitId: string, displayedOptions: HabitOption[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear drag state
    setActiveOption(null);
    setActiveHabitId(null);
    setDropTarget(null);

    if (!over || active.id === over.id) return;

    const oldIndex = displayedOptions.findIndex(o => o.id === active.id);
    let newIndex: number;

    // Check if dropped on end zone
    if (String(over.id).startsWith("end-zone-")) {
      newIndex = displayedOptions.length - 1;
    } else {
      newIndex = displayedOptions.findIndex(o => o.id === over.id);
    }
    
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(displayedOptions, oldIndex, newIndex);
    setLocalOptionOrder(prev => ({ ...prev, [habitId]: reordered }));
    
    const orderedIds = reordered.map(o => o.id);
    reorderOptionsMutation.mutate({ habitId, orderedIds });
  };

  const resetForm = () => {
    setNewHabitName("");
    setNewHabitDomainId("");
    setNewHabitSelectionType("single");
    setNewHabitMinRequired(1);
    setNewOptionLabels([""]);
  };

  const handleCreateHabit = () => {
    if (!newHabitName.trim() || !newHabitDomainId) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    const validOptions = newOptionLabels.filter(l => l.trim());
    if (validOptions.length === 0) {
      toast({ title: "Please add at least one option", variant: "destructive" });
      return;
    }

    createHabitMutation.mutate({
      name: newHabitName.trim(),
      domainId: newHabitDomainId,
      selectionType: newHabitSelectionType,
      minRequired: newHabitSelectionType === "multi" ? newHabitMinRequired : undefined,
      options: validOptions,
    });
  };

  const handleAddOptionLabel = () => {
    setNewOptionLabels([...newOptionLabels, ""]);
  };

  const handleUpdateOptionLabel = (index: number, value: string) => {
    const updated = [...newOptionLabels];
    updated[index] = value;
    setNewOptionLabels(updated);
  };

  const handleRemoveOptionLabel = (index: number) => {
    if (newOptionLabels.length > 1) {
      setNewOptionLabels(newOptionLabels.filter((_, i) => i !== index));
    }
  };

  const handleToggleActive = (habit: HabitWithOptions) => {
    updateHabitMutation.mutate({ 
      id: habit.id, 
      updates: { isActive: !habit.isActive } 
    });
  };

  const startEditingHabit = (habit: HabitWithOptions) => {
    setEditingHabitId(habit.id);
    setEditForm({
      name: habit.name,
      domainId: habit.domainId,
      selectionType: habit.selectionType,
      minRequired: habit.minRequired || 1,
    });
  };

  const saveHabitEdit = () => {
    if (!editingHabitId || !editForm.name.trim()) return;
    
    updateHabitMutation.mutate({
      id: editingHabitId,
      updates: {
        name: editForm.name.trim(),
        domainId: editForm.domainId,
        selectionType: editForm.selectionType,
        minRequired: editForm.selectionType === "multi" ? editForm.minRequired : null,
      },
    });
  };

  const cancelHabitEdit = () => {
    setEditingHabitId(null);
  };

  const activeDomains = domains.filter(d => d.isActive);

  const domainMap = domains.reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {} as Record<string, Domain>);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Daily Habits
            </h1>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-habit">
                  <Plus className="h-4 w-4 mr-2" />
                  New Habit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Habit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="habit-name">Name</Label>
                    <Input
                      id="habit-name"
                      placeholder="e.g., Morning Exercise"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      data-testid="input-habit-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="habit-domain">Domain</Label>
                    <Select value={newHabitDomainId} onValueChange={setNewHabitDomainId}>
                      <SelectTrigger data-testid="select-habit-domain">
                        <SelectValue placeholder="Select domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeDomains.map(domain => (
                          <SelectItem key={domain.id} value={domain.id}>
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="habit-selection-type">Selection Type</Label>
                    <Select 
                      value={newHabitSelectionType} 
                      onValueChange={(v) => setNewHabitSelectionType(v as "single" | "multi")}
                    >
                      <SelectTrigger data-testid="select-habit-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single (pick one)</SelectItem>
                        <SelectItem value="multi">Multi (pick several)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newHabitSelectionType === "multi" && (
                    <div className="space-y-2">
                      <Label htmlFor="habit-min-required">Minimum Required</Label>
                      <Input
                        id="habit-min-required"
                        type="number"
                        min={1}
                        value={newHabitMinRequired}
                        onChange={(e) => setNewHabitMinRequired(parseInt(e.target.value) || 1)}
                        data-testid="input-habit-min-required"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Options</Label>
                    <div className="space-y-2">
                      {newOptionLabels.map((label, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={label}
                            onChange={(e) => handleUpdateOptionLabel(index, e.target.value)}
                            data-testid={`input-option-${index}`}
                          />
                          {newOptionLabels.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveOptionLabel(index)}
                              data-testid={`button-remove-option-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddOptionLabel}
                        data-testid="button-add-option"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => { resetForm(); setShowCreateDialog(false); }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateHabit}
                    disabled={createHabitMutation.isPending}
                    data-testid="button-save-habit"
                  >
                    Create Habit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No habits yet</h3>
              <p className="text-muted-foreground mb-4">
                Create daily habits to build consistent routines.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {habits.map(habit => {
                const domain = domainMap[habit.domainId];
                const isEditing = editingHabitId === habit.id;
                
                return (
                  <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-4">
                        {isEditing ? (
                          <div className="flex-1 space-y-3">
                            <div className="flex gap-2">
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Habit name"
                                data-testid={`input-edit-habit-name-${habit.id}`}
                              />
                              <Select value={editForm.domainId} onValueChange={(v) => setEditForm(prev => ({ ...prev, domainId: v }))}>
                                <SelectTrigger className="w-32" data-testid={`select-edit-habit-domain-${habit.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeDomains.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2 items-center">
                              <Select 
                                value={editForm.selectionType} 
                                onValueChange={(v) => setEditForm(prev => ({ ...prev, selectionType: v as "single" | "multi" }))}
                              >
                                <SelectTrigger className="w-36" data-testid={`select-edit-habit-type-${habit.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">Single</SelectItem>
                                  <SelectItem value="multi">Multi</SelectItem>
                                </SelectContent>
                              </Select>
                              {editForm.selectionType === "multi" && (
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs whitespace-nowrap">Min:</Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={editForm.minRequired}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, minRequired: parseInt(e.target.value) || 1 }))}
                                    className="w-16"
                                    data-testid={`input-edit-habit-min-${habit.id}`}
                                  />
                                </div>
                              )}
                              <Button size="sm" onClick={saveHabitEdit} data-testid={`button-save-habit-edit-${habit.id}`}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelHabitEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <CardTitle className="text-base font-medium flex items-center gap-3 flex-wrap">
                            <span className={!habit.isActive ? "text-muted-foreground" : ""}>
                              {habit.name}
                            </span>
                            {domain && (
                              <Badge variant="outline" className="text-xs font-normal">
                                {domain.name}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {habit.selectionType === "single" ? "Pick one" : `Pick ${habit.minRequired || 1}+`}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => startEditingHabit(habit)}
                              data-testid={`button-edit-habit-${habit.id}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </CardTitle>
                        )}
                        <Switch
                          checked={habit.isActive}
                          onCheckedChange={() => handleToggleActive(habit)}
                          data-testid={`switch-habit-active-${habit.id}`}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const displayOptions = getOptionsForHabit(habit);
                        const isDragActive = activeOption !== null && activeHabitId === habit.id;
                        return (
                          <DndContext
                            sensors={sensors}
                            collisionDetection={customCollisionDetection}
                            onDragStart={handleOptionDragStart(habit.id, displayOptions)}
                            onDragOver={handleOptionDragOver(habit.id, displayOptions)}
                            onDragEnd={handleOptionDragEnd(habit.id, displayOptions)}
                          >
                            <SortableContext
                              items={displayOptions.map(o => o.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="flex flex-col">
                                {displayOptions.map((option, index) => (
                                  <div key={option.id}>
                                    {/* Drop indicator above this item */}
                                    {isDragActive && 
                                     dropTarget?.habitId === habit.id && 
                                     dropTarget?.index === index && 
                                     activeOption?.id !== option.id && (
                                      <DropIndicator />
                                    )}
                                    <SortableOption
                                      option={option}
                                      isDragging={activeOption?.id === option.id}
                                      onSave={(label) => updateOptionMutation.mutate({ optionId: option.id, label })}
                                      onDelete={() => deleteOptionMutation.mutate(option.id)}
                                    />
                                  </div>
                                ))}
                                {/* End drop zone - always render with ref, use disabled when not active */}
                                <EndDropZone 
                                  habitId={habit.id}
                                  disabled={!isDragActive}
                                  showIndicator={isDragActive && dropTarget?.habitId === habit.id && dropTarget?.index === displayOptions.length}
                                />
                                <AddOptionButton 
                                  habitId={habit.id} 
                                  onAdd={(label) => addOptionMutation.mutate({ habitId: habit.id, label })}
                                />
                              </div>
                            </SortableContext>
                            {/* DragOverlay shows ghost following cursor per guidelines */}
                            <DragOverlay>
                              {activeOption && activeHabitId === habit.id && (
                                <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-background border shadow-md">
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{activeOption.label}</span>
                                </div>
                              )}
                            </DragOverlay>
                          </DndContext>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Drop indicator line per guidelines
function DropIndicator() {
  return (
    <div className="h-0.5 bg-primary rounded-full mx-2 my-0.5" />
  );
}

// End drop zone for dropping at end of list per guidelines
// Always apply ref unconditionally, use disabled prop to control active state
function EndDropZone({ habitId, disabled, showIndicator }: { habitId: string; disabled: boolean; showIndicator: boolean }) {
  const { setNodeRef } = useDroppable({
    id: `end-zone-${habitId}`,
    disabled,
  });

  return (
    <div ref={setNodeRef} className={disabled ? "h-0" : "h-4 -mt-1"}>
      {showIndicator && <DropIndicator />}
    </div>
  );
}

function SortableOption({ 
  option, 
  isDragging,
  onSave, 
  onDelete 
}: { 
  option: HabitOption; 
  isDragging: boolean;
  onSave: (label: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(option.label);

  const {
    attributes,
    listeners,
    setNodeRef,
  } = useSortable({ id: option.id });

  // Per guidelines: only opacity, no transform (prevents item shifting)
  const style = {
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (label.trim() && label.trim() !== option.label) {
      onSave(label.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setLabel(option.label);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/50"
      >
        <div className="text-muted-foreground/50 cursor-not-allowed">
          <GripVertical className="h-4 w-4" />
        </div>
        <Input
          className="h-7 flex-1 text-sm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          data-testid={`input-edit-option-${option.id}`}
        />
      </div>
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1.5 px-2 rounded-md hover-elevate group"
      data-testid={`row-option-${option.id}`}
    >
      <button
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        data-testid={`button-drag-option-${option.id}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span 
        onClick={() => setIsEditing(true)}
        className="flex-1 text-sm cursor-pointer"
        data-testid={`text-option-${option.id}`}
      >
        {option.label}
      </span>
      <button
        onClick={() => setIsEditing(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        data-testid={`button-edit-option-${option.id}`}
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        data-testid={`button-delete-option-${option.id}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddOptionButton({ habitId, onAdd }: { habitId: string; onAdd: (label: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState("");

  const handleSubmit = () => {
    if (label.trim()) {
      onAdd(label.trim());
      setLabel("");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/50">
        <Input
          className="h-7 flex-1 text-sm"
          placeholder="New option..."
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") { setLabel(""); setIsEditing(false); }
          }}
          autoFocus
          data-testid={`input-new-option-${habitId}`}
        />
        <Button size="sm" variant="ghost" onClick={handleSubmit}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-2 py-1.5 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover-elevate"
      onClick={() => setIsEditing(true)}
      data-testid={`button-add-option-to-${habitId}`}
    >
      <Plus className="h-3.5 w-3.5" />
      Add option
    </button>
  );
}
