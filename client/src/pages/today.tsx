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
import { 
  Plus, 
  CalendarDays, 
  Inbox as InboxIcon, 
  Sparkles, 
  Circle as CircleIcon, 
  Triangle,
  X,
  Check
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

export default function TodayPage() {
  const { toast } = useToast();
  const [newInboxItem, setNewInboxItem] = useState("");
  const todayStr = format(new Date(), "yyyy-MM-dd");

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

  const triageInboxMutation = useMutation({
    mutationFn: async ({ id, action, domainId, scheduledDate }: { 
      id: string; 
      action: "add" | "schedule" | "dismiss"; 
      domainId?: string;
      scheduledDate?: string;
    }) => {
      return apiRequest("POST", `/api/inbox/${id}/triage`, { action, domainId, scheduledDate });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      const actionText = variables.action === "add" ? "Added to tasks" : 
                         variables.action === "schedule" ? "Scheduled" : "Dismissed";
      toast({ title: actionText });
    },
    onError: () => {
      toast({ title: "Failed to triage inbox item", variant: "destructive" });
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
      return apiRequest("POST", "/api/habits/entries", { 
        habitId, 
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

  const getValenceIcon = (valence: number | null) => {
    if (valence === -1) return <Triangle className="h-3 w-3 text-muted-foreground" />;
    if (valence === 1) return <Sparkles className="h-3 w-3 text-muted-foreground" />;
    return <CircleIcon className="h-3 w-3 text-muted-foreground" />;
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

  const { habits = [], scheduledTasks = [], inboxItems = [], assignedTasks = [] } = todayData || {};

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-8">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold">
              {format(new Date(), "EEEE, MMMM d")}
            </h1>
          </div>

          {habits.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
                Daily Habits
              </h2>
              <div className="space-y-4">
                {habits.filter(h => h.isActive).map(habit => {
                  const options = habit.options || [];
                  const selectedIds = habit.todayEntry?.selectedOptionIds || [];
                  const domain = domainMap[habit.domainId];
                  
                  return (
                    <Card key={habit.id} data-testid={`card-habit-${habit.id}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium flex items-center justify-between">
                          <span>{habit.name}</span>
                          {domain && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {domain.name}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
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
                            Select at least {habit.minRequired}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {scheduledTasks.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                Scheduled Today
              </h2>
              <div className="space-y-1">
                {scheduledTasks.map(task => {
                  const domain = domainMap[task.domainId];
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover-elevate"
                      data-testid={`row-scheduled-task-${task.id}`}
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
                      {domain && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {domain.name}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {assignedTasks.length > 0 && (
            <section>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
                Added to Today
              </h2>
              <div className="space-y-1">
                {assignedTasks.map(task => {
                  const domain = domainMap[task.domainId];
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover-elevate"
                      data-testid={`row-assigned-task-${task.id}`}
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
                      {domain && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {domain.name}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section>
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
                        <span className="text-sm flex-1">{item.title}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => triageInboxMutation.mutate({ 
                              id: item.id, 
                              action: "add",
                              domainId: domains[0]?.id 
                            })}
                            disabled={!domains.length}
                            title="Add to tasks"
                            data-testid={`button-triage-add-${item.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => triageInboxMutation.mutate({ 
                              id: item.id, 
                              action: "schedule",
                              domainId: domains[0]?.id,
                              scheduledDate: todayStr
                            })}
                            disabled={!domains.length}
                            title="Schedule for today"
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

          {scheduledTasks.length === 0 && assignedTasks.length === 0 && habits.length === 0 && inboxItems.length === 0 && (
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
    </div>
  );
}
