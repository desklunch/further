import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskEditDrawer } from "@/components/task-edit-drawer";
import { 
  Plus, 
  CalendarDays, 
  Inbox as InboxIcon, 
  Sparkles, 
  Circle as CircleIcon, 
  Triangle,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Pencil
} from "lucide-react";
import type { 
  Task, 
  Domain, 
  InboxItem, 
  HabitDefinition, 
  HabitOption,
  HabitDailyEntry 
} from "@shared/schema";

interface HabitWithDetails extends HabitDefinition {
  options: HabitOption[];
  todayEntry: HabitDailyEntry | null;
}

interface TodayData {
  date: string;
  habits: HabitWithDetails[];
  scheduledTasks: Task[];
  inboxItems: InboxItem[];
  assignedTasks: Task[];
}

interface TriageDialogState {
  open: boolean;
  action: "add" | "schedule";
  inboxItem: InboxItem | null;
  domainId: string;
  scheduledDate: string;
}

interface DomainContent {
  domain: Domain;
  habits: HabitWithDetails[];
  scheduledTasks: Task[];
  assignedTasks: Task[];
}

export default function TodayPage() {
  const { toast } = useToast();
  const [newInboxItem, setNewInboxItem] = useState("");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [collapsedDomains, setCollapsedDomains] = useState<Set<string>>(new Set());
  const [collapsedHabits, setCollapsedHabits] = useState<Set<string>>(new Set());
  const [editingInboxId, setEditingInboxId] = useState<string | null>(null);
  const [editingInboxTitle, setEditingInboxTitle] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [triageDialog, setTriageDialog] = useState<TriageDialogState>({
    open: false,
    action: "add",
    inboxItem: null,
    domainId: "",
    scheduledDate: todayStr,
  });

  const { data: domains = [] } = useQuery<Domain[]>({
    queryKey: ["/api/domains"],
  });

  const { data: todayData, isLoading } = useQuery<TodayData>({
    queryKey: ["/api/today", { date: todayStr }],
    queryFn: async () => {
      const res = await fetch(`/api/today?date=${todayStr}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch today data");
      return res.json();
    },
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const createInboxItemMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/inbox", { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      setNewInboxItem("");
    },
    onError: () => {
      toast({ title: "Failed to add inbox item", variant: "destructive" });
    },
  });

  const updateInboxItemMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return apiRequest("PATCH", `/api/inbox/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      setEditingInboxId(null);
      setEditingInboxTitle("");
    },
    onError: () => {
      toast({ title: "Failed to update inbox item", variant: "destructive" });
    },
  });

  const triageInboxMutation = useMutation({
    mutationFn: async ({ id, action, domainId, scheduledDate }: { 
      id: string; 
      action: "add" | "schedule" | "dismiss"; 
      domainId?: string;
      scheduledDate?: string;
    }): Promise<{ task?: Task; converted?: boolean }> => {
      let res: Response;
      if (action === "add") {
        res = await apiRequest("POST", `/api/inbox/${id}/triage/add-to-today`, { domainId, date: todayStr });
      } else if (action === "schedule") {
        res = await apiRequest("POST", `/api/inbox/${id}/triage/schedule`, { domainId, scheduledDate });
      } else {
        res = await apiRequest("POST", `/api/inbox/${id}/dismiss`, {});
      }
      return res.json();
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const actionText = variables.action === "add" ? "Added to tasks" : 
                         variables.action === "schedule" ? "Scheduled" : "Dismissed";
      toast({ title: actionText });
      
      if ((variables.action === "add" || variables.action === "schedule") && response?.task) {
        setEditingTask(response.task);
      }
    },
    onError: () => {
      toast({ title: "Failed to triage inbox item", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to reopen task", variant: "destructive" });
    },
  });

  const saveHabitEntryMutation = useMutation({
    mutationFn: async ({ habitId, selectedOptionIds }: { habitId: string; selectedOptionIds: string[] }) => {
      return apiRequest("POST", `/api/habits/${habitId}/entries`, { 
        date: todayStr, 
        selectedOptionIds 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
    },
    onError: () => {
      toast({ title: "Failed to save habit selection", variant: "destructive" });
    },
  });

  const domainMap = useMemo(() => {
    return domains.reduce((acc, d) => {
      acc[d.id] = d;
      return acc;
    }, {} as Record<string, Domain>);
  }, [domains]);

  const domainGroupedContent = useMemo((): DomainContent[] => {
    if (!todayData) return [];
    
    const { habits = [], scheduledTasks = [], assignedTasks = [] } = todayData;
    
    const activeDomains = domains.filter(d => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    
    return activeDomains.map(domain => ({
      domain,
      habits: habits.filter(h => h.domainId === domain.id && h.isActive),
      scheduledTasks: scheduledTasks.filter(t => t.domainId === domain.id),
      assignedTasks: assignedTasks.filter(t => t.domainId === domain.id),
    })).filter(dc => dc.habits.length > 0 || dc.scheduledTasks.length > 0 || dc.assignedTasks.length > 0);
  }, [domains, todayData]);

  const emptyDomains = useMemo(() => {
    if (!todayData) return [];
    const activeDomains = domains.filter(d => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
    const domainIdsWithContent = new Set(domainGroupedContent.map(dc => dc.domain.id));
    return activeDomains.filter(d => !domainIdsWithContent.has(d.id));
  }, [domains, domainGroupedContent, todayData]);

  const handleAddInboxItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newInboxItem.trim()) {
      createInboxItemMutation.mutate(newInboxItem.trim());
    }
  };

  const handleToggleHabitOption = (habit: HabitWithDetails, optionId: string) => {
    const currentSelected = habit.todayEntry?.selectedOptionIds || [];
    
    let newSelected: string[];
    if (habit.selectionType === "single") {
      newSelected = currentSelected.includes(optionId) ? [] : [optionId];
    } else {
      newSelected = currentSelected.includes(optionId)
        ? currentSelected.filter(id => id !== optionId)
        : [...currentSelected, optionId];
    }
    
    saveHabitEntryMutation.mutate({ habitId: habit.id, selectedOptionIds: newSelected });
  };

  const isHabitSatisfied = (habit: HabitWithDetails): boolean => {
    const selectedCount = habit.todayEntry?.selectedOptionIds?.length || 0;
    if (habit.selectionType === "single") {
      return selectedCount >= 1;
    } else {
      return selectedCount >= (habit.minRequired || 1);
    }
  };

  const toggleDomainCollapse = (domainId: string) => {
    setCollapsedDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  };

  const toggleHabitCollapse = (habitId: string) => {
    setCollapsedHabits(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const openTriageDialog = (item: InboxItem, action: "add" | "schedule") => {
    setTriageDialog({
      open: true,
      action,
      inboxItem: item,
      domainId: domains[0]?.id || "",
      scheduledDate: todayStr,
    });
  };

  const closeTriageDialog = () => {
    setTriageDialog(prev => ({ ...prev, open: false, inboxItem: null }));
  };

  const handleTriageSubmit = () => {
    if (!triageDialog.inboxItem || !triageDialog.domainId) return;
    
    triageInboxMutation.mutate({
      id: triageDialog.inboxItem.id,
      action: triageDialog.action,
      domainId: triageDialog.domainId,
      scheduledDate: triageDialog.action === "schedule" ? triageDialog.scheduledDate : undefined,
    });
    closeTriageDialog();
  };

  const startEditingInbox = (item: InboxItem) => {
    setEditingInboxId(item.id);
    setEditingInboxTitle(item.title);
  };

  const cancelEditingInbox = () => {
    setEditingInboxId(null);
    setEditingInboxTitle("");
  };

  const saveInboxEdit = () => {
    if (editingInboxId && editingInboxTitle.trim()) {
      updateInboxItemMutation.mutate({ id: editingInboxId, title: editingInboxTitle.trim() });
    }
  };

  const handleInboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveInboxEdit();
    } else if (e.key === "Escape") {
      cancelEditingInbox();
    }
  };

  const getValenceIcon = (valence: number | null) => {
    if (valence === -1) return <Triangle className="h-3 w-3 text-muted-foreground" />;
    if (valence === 1) return <Sparkles className="h-3 w-3 text-muted-foreground" />;
    return <CircleIcon className="h-3 w-3 text-muted-foreground" />;
  };

  const renderHabit = (habit: HabitWithDetails) => {
    const options = habit.options || [];
    const selectedIds = habit.todayEntry?.selectedOptionIds || [];
    const satisfied = isHabitSatisfied(habit);
    const isCollapsed = satisfied && !collapsedHabits.has(habit.id);
    const selectedOptions = options.filter(o => selectedIds.includes(o.id));

    return (
      <div 
        key={habit.id} 
        className={`rounded-md border p-3 ${satisfied ? "bg-muted/30" : "bg-card"}`}
        data-testid={`habit-card-${habit.id}`}
      >
        <Collapsible open={!isCollapsed}>
          <CollapsibleTrigger 
            className="flex items-center justify-between w-full text-left"
            onClick={() => satisfied && toggleHabitCollapse(habit.id)}
          >
            <div className="flex items-center gap-2">
              {satisfied && (
                isCollapsed ? 
                  <ChevronRight className="h-4 w-4 text-muted-foreground" /> :
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`font-medium text-sm ${satisfied ? "text-muted-foreground" : ""}`}>
                {habit.name}
              </span>
            </div>
            {satisfied && isCollapsed && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Satisfied
                </span>
                <div className="flex gap-1 flex-wrap max-w-[200px]">
                  {selectedOptions.slice(0, 3).map(opt => (
                    <Badge key={opt.id} variant="secondary" className="text-xs">
                      {opt.label}
                    </Badge>
                  ))}
                  {selectedOptions.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{selectedOptions.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-wrap gap-2 mt-3">
              {options.map(option => {
                const isSelected = selectedIds.includes(option.id);
                return (
                  <Button
                    key={option.id}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleHabitOption(habit, option.id)}
                    data-testid={`button-habit-option-${option.id}`}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
            {habit.selectionType === "multi" && habit.minRequired && (
              <p className="text-xs text-muted-foreground mt-2">
                Select at least {habit.minRequired} • {selectedIds.length} selected
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  const renderTask = (task: Task, type: "scheduled" | "assigned") => {
    return (
      <div
        key={task.id}
        className="flex items-center gap-3 px-3 py-2 rounded-md hover-elevate group"
        data-testid={`row-${type}-task-${task.id}`}
      >
        <Checkbox
          checked={task.status === "completed"}
          onCheckedChange={(checked) => {
            if (checked) {
              completeTaskMutation.mutate(task.id);
            } else {
              reopenTaskMutation.mutate(task.id);
            }
          }}
          data-testid={`checkbox-task-${task.id}`}
        />
        <span className={`flex-1 text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
          {task.title}
        </span>
        {getValenceIcon(task.valence)}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setEditingTask(task)}
          data-testid={`button-edit-task-${task.id}`}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { inboxItems = [] } = todayData || {};
  const hasAnyContent = domainGroupedContent.length > 0 || inboxItems.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold">
              {format(new Date(), "EEEE, MMMM d")}
            </h1>
          </div>

          {domainGroupedContent.map(({ domain, habits, scheduledTasks, assignedTasks }) => {
            const isCollapsed = collapsedDomains.has(domain.id);
            const taskCount = scheduledTasks.length + assignedTasks.length;
            const completedCount = [...scheduledTasks, ...assignedTasks].filter(t => t.status === "completed").length;
            
            return (
              <section key={domain.id} data-testid={`section-domain-${domain.id}`}>
                <Collapsible open={!isCollapsed}>
                  <CollapsibleTrigger 
                    className="flex items-center gap-2 w-full text-left mb-3"
                    onClick={() => toggleDomainCollapse(domain.id)}
                  >
                    {isCollapsed ? 
                      <ChevronRight className="h-5 w-5 text-muted-foreground" /> :
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    }
                    <h2 className="text-lg font-medium">{domain.name}</h2>
                    {taskCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {completedCount}/{taskCount}
                      </Badge>
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3">
                    {habits.length > 0 && (
                      <div className="space-y-2">
                        {habits.map(renderHabit)}
                      </div>
                    )}
                    
                    {(scheduledTasks.length > 0 || assignedTasks.length > 0) && (
                      <div className="space-y-1">
                        {scheduledTasks.map(task => renderTask(task, "scheduled"))}
                        {assignedTasks.map(task => renderTask(task, "assigned"))}
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </section>
            );
          })}

          {emptyDomains.length > 0 && domainGroupedContent.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex flex-wrap gap-2">
                {emptyDomains.map(domain => (
                  <Badge 
                    key={domain.id} 
                    variant="outline" 
                    className="text-muted-foreground"
                    data-testid={`badge-empty-domain-${domain.id}`}
                  >
                    {domain.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <section className="border-t pt-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <InboxIcon className="h-5 w-5 text-muted-foreground" />
              Inbox
              {inboxItems.length > 0 && (
                <Badge variant="secondary" className="ml-2">{inboxItems.length}</Badge>
              )}
            </h2>
            
            <form onSubmit={handleAddInboxItem} className="mb-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Quick capture..."
                  value={newInboxItem}
                  onChange={(e) => setNewInboxItem(e.target.value)}
                  data-testid="input-inbox-capture"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!newInboxItem.trim() || createInboxItemMutation.isPending}
                  data-testid="button-add-inbox"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {inboxItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Inbox is empty. Capture quick thoughts above.
              </p>
            ) : (
              <div className="space-y-2">
                {inboxItems.map(item => (
                  <Card key={item.id} data-testid={`card-inbox-${item.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between gap-4">
                        {editingInboxId === item.id ? (
                          <Input
                            value={editingInboxTitle}
                            onChange={(e) => setEditingInboxTitle(e.target.value)}
                            onKeyDown={handleInboxKeyDown}
                            onBlur={saveInboxEdit}
                            autoFocus
                            className="flex-1"
                            data-testid={`input-edit-inbox-${item.id}`}
                          />
                        ) : (
                          <span 
                            className="text-sm flex-1 cursor-pointer hover:text-primary"
                            onClick={() => startEditingInbox(item)}
                            data-testid={`text-inbox-title-${item.id}`}
                          >
                            {item.title}
                          </span>
                        )}
                        <div className="flex items-center gap-1">
                          {editingInboxId !== item.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditingInbox(item)}
                              title="Edit"
                              data-testid={`button-edit-inbox-${item.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openTriageDialog(item, "add")}
                            disabled={!domains.length}
                            title="Add to today"
                            data-testid={`button-triage-add-${item.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openTriageDialog(item, "schedule")}
                            disabled={!domains.length}
                            title="Schedule"
                            data-testid={`button-triage-schedule-${item.id}`}
                          >
                            <CalendarDays className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => triageInboxMutation.mutate({ id: item.id, action: "dismiss" })}
                            title="Dismiss"
                            data-testid={`button-triage-dismiss-${item.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {!hasAnyContent && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2">Nothing on your plate today</h3>
              <p className="text-muted-foreground mb-4">
                Schedule tasks or set up habits to see them here.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/tasks">
                  <Button variant="outline" data-testid="button-view-all-tasks">
                    View All Tasks
                  </Button>
                </Link>
                <Link href="/habits">
                  <Button data-testid="button-manage-habits">
                    Set Up Habits
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Dialog open={triageDialog.open} onOpenChange={(open) => !open && closeTriageDialog()}>
        <DialogContent data-testid="dialog-triage">
          <DialogHeader>
            <DialogTitle>
              {triageDialog.action === "add" ? "Add to Today" : "Schedule Task"}
            </DialogTitle>
          </DialogHeader>
          
          {triageDialog.inboxItem && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                "{triageDialog.inboxItem.title}"
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="triage-domain">Domain</Label>
                <Select
                  value={triageDialog.domainId}
                  onValueChange={(value) => setTriageDialog(prev => ({ ...prev, domainId: value }))}
                >
                  <SelectTrigger id="triage-domain" data-testid="select-triage-domain">
                    <SelectValue placeholder="Select a domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.filter(d => d.isActive).map(domain => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {triageDialog.action === "schedule" && (
                <div className="space-y-2">
                  <Label htmlFor="triage-date">Scheduled Date</Label>
                  <Input
                    id="triage-date"
                    type="date"
                    value={triageDialog.scheduledDate}
                    onChange={(e) => setTriageDialog(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    min={todayStr}
                    data-testid="input-triage-date"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeTriageDialog} data-testid="button-triage-cancel">
              Cancel
            </Button>
            <Button 
              onClick={handleTriageSubmit} 
              disabled={!triageDialog.domainId || triageInboxMutation.isPending}
              data-testid="button-triage-confirm"
            >
              {triageDialog.action === "add" ? "Add to Today" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskEditDrawer
        task={editingTask}
        domains={domains}
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={(taskId, updates) => {
          updateTaskMutation.mutate({ taskId, updates });
          setEditingTask(null);
        }}
      />
    </div>
  );
}
