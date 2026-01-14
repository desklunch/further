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
  Sparkles 
} from "lucide-react";
import type { Domain, HabitDefinition, HabitOption } from "@shared/schema";

interface HabitWithOptions extends HabitDefinition {
  options: HabitOption[];
}

export default function HabitsPage() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithOptions | null>(null);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitDomainId, setNewHabitDomainId] = useState("");
  const [newHabitSelectionType, setNewHabitSelectionType] = useState<"single" | "multi">("single");
  const [newHabitMinRequired, setNewHabitMinRequired] = useState(1);
  const [newOptionLabels, setNewOptionLabels] = useState<string[]>([""]);

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
                return (
                  <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium flex items-center gap-3">
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
                        </CardTitle>
                        <Switch
                          checked={habit.isActive}
                          onCheckedChange={() => handleToggleActive(habit)}
                          data-testid={`switch-habit-active-${habit.id}`}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {habit.options.map(option => (
                          <Badge 
                            key={option.id} 
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            {option.label}
                            <button
                              onClick={() => deleteOptionMutation.mutate(option.id)}
                              className="ml-1 hover:text-destructive"
                              data-testid={`button-delete-option-${option.id}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                        <AddOptionButton 
                          habitId={habit.id} 
                          onAdd={(label) => addOptionMutation.mutate({ habitId: habit.id, label })}
                        />
                      </div>
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
      <div className="flex items-center gap-1">
        <Input
          className="h-6 w-24 text-xs"
          placeholder="Option"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") { setLabel(""); setIsEditing(false); }
          }}
          autoFocus
          data-testid={`input-new-option-${habitId}`}
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSubmit}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs"
      onClick={() => setIsEditing(true)}
      data-testid={`button-add-option-to-${habitId}`}
    >
      <Plus className="h-3 w-3 mr-1" />
      Add
    </Button>
  );
}
