import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTaskSchema, 
  updateTaskSchema, 
  filterModeEnum, 
  sortModeEnum,
  insertInboxItemSchema,
  insertHabitDefinitionSchema,
  insertHabitOptionSchema,
  insertHabitDailyEntrySchema,
  insertTaskDayAssignmentSchema,
} from "@shared/schema";
import { z } from "zod";

const DEFAULT_USER_ID = "default-user";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/domains", async (req, res) => {
    try {
      const domains = await storage.getDomains(DEFAULT_USER_ID);
      res.json(domains);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  app.post("/api/domains", async (req, res) => {
    try {
      const { name, isActive } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Name is required" });
      }
      const domain = await storage.createDomain({
        userId: DEFAULT_USER_ID,
        name: name.trim(),
        sortOrder: 0,
        isActive: isActive ?? true,
      });
      res.status(201).json(domain);
    } catch (error) {
      res.status(500).json({ error: "Failed to create domain" });
    }
  });

  app.patch("/api/domains/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const domain = await storage.updateDomain(id, updates);
      if (!domain) {
        return res.status(404).json({ error: "Domain not found" });
      }
      res.json(domain);
    } catch (error) {
      res.status(500).json({ error: "Failed to update domain" });
    }
  });

  app.post("/api/domains/reorder", async (req, res) => {
    try {
      const { ordered_domain_ids } = req.body;
      if (!Array.isArray(ordered_domain_ids)) {
        return res.status(400).json({ error: "ordered_domain_ids must be an array" });
      }
      await storage.reorderDomains(DEFAULT_USER_ID, ordered_domain_ids);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder domains" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    try {
      const filterParam = req.query.filter as string || "all";
      const sortParam = req.query.sort as string || "manual";

      const filterResult = z.enum(filterModeEnum).safeParse(filterParam);
      const sortResult = z.enum(sortModeEnum).safeParse(sortParam);

      const filter = filterResult.success ? filterResult.data : "all";
      const sort = sortResult.success ? sortResult.data : "manual";

      const tasks = await storage.getTasks(DEFAULT_USER_ID, filter, sort);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = { ...req.body, userId: DEFAULT_USER_ID };
      const result = insertTaskSchema.extend({ userId: z.string() }).safeParse(taskData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const domain = await storage.getDomain(result.data.domainId);
      if (!domain) {
        return res.status(400).json({ error: "Domain not found" });
      }

      const task = await storage.createTask(result.data);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = updateTaskSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      if (result.data.domainId) {
        const domain = await storage.getDomain(result.data.domainId);
        if (!domain) {
          return res.status(400).json({ error: "Domain not found" });
        }
      }

      const task = await storage.updateTask(id, result.data);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.post("/api/tasks/:id/complete", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.completeTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found or not open" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to complete task" });
    }
  });

  app.post("/api/tasks/:id/reopen", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.reopenTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found or not completed" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to reopen task" });
    }
  });

  app.post("/api/tasks/:id/archive", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.archiveTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found or already archived" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to archive task" });
    }
  });

  app.post("/api/tasks/:id/restore", async (req, res) => {
    try {
      const { id } = req.params;
      const task = await storage.restoreTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found or not archived" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to restore task" });
    }
  });

  app.post("/api/domains/:domainId/tasks/reorder", async (req, res) => {
    try {
      const { domainId } = req.params;
      const { taskId, newIndex, ordered_task_ids } = req.body;

      if (taskId !== undefined && newIndex !== undefined) {
        const task = await storage.moveTask(taskId, domainId, newIndex);
        if (!task) {
          return res.status(404).json({ error: "Task not found or not open" });
        }
        return res.json(task);
      }

      if (Array.isArray(ordered_task_ids)) {
        await storage.reorderTasks(domainId, ordered_task_ids);
        return res.json({ success: true });
      }

      return res.status(400).json({ error: "Either taskId+newIndex or ordered_task_ids is required" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder tasks" });
    }
  });

  app.get("/api/today", async (req, res) => {
    try {
      const dateParam = req.query.date as string || new Date().toISOString().split("T")[0];
      
      const [habits, scheduledTasks, inboxItems, assignedTasks] = await Promise.all([
        storage.getHabitDefinitions(DEFAULT_USER_ID),
        storage.getTasksScheduledForDate(DEFAULT_USER_ID, dateParam),
        storage.getInboxItems(DEFAULT_USER_ID),
        storage.getTasksAssignedToDate(DEFAULT_USER_ID, dateParam),
      ]);

      const habitOptionsMap: Record<string, Awaited<ReturnType<typeof storage.getHabitOptions>>> = {};
      for (const habit of habits) {
        habitOptionsMap[habit.id] = await storage.getHabitOptions(habit.id);
      }

      const dailyEntries = await storage.getHabitDailyEntriesForDate(DEFAULT_USER_ID, dateParam);
      const entriesMap: Record<string, typeof dailyEntries[0]> = {};
      for (const entry of dailyEntries) {
        entriesMap[entry.habitId] = entry;
      }

      const scheduledTaskIds = new Set(scheduledTasks.map(t => t.id));
      const filteredAssignedTasks = assignedTasks.filter(t => !scheduledTaskIds.has(t.id));

      res.json({
        date: dateParam,
        habits: habits.map(h => ({
          ...h,
          options: habitOptionsMap[h.id] || [],
          todayEntry: entriesMap[h.id] || null,
        })),
        scheduledTasks,
        inboxItems,
        assignedTasks: filteredAssignedTasks,
      });
    } catch (error) {
      console.error("Today endpoint error:", error);
      res.status(500).json({ error: "Failed to fetch today data" });
    }
  });

  app.get("/api/inbox", async (req, res) => {
    try {
      const items = await storage.getInboxItems(DEFAULT_USER_ID);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch inbox items" });
    }
  });

  app.post("/api/inbox", async (req, res) => {
    try {
      const itemData = { ...req.body, userId: DEFAULT_USER_ID };
      const result = insertInboxItemSchema.extend({ userId: z.string() }).safeParse(itemData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const item = await storage.createInboxItem(result.data);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create inbox item" });
    }
  });

  app.post("/api/inbox/:id/triage/add-to-today", async (req, res) => {
    try {
      const { id } = req.params;
      const { domainId, date } = req.body;
      
      if (!domainId) {
        return res.status(400).json({ error: "domainId is required" });
      }

      const inboxItem = await storage.getInboxItem(id);
      if (!inboxItem || inboxItem.status !== "untriaged") {
        return res.status(404).json({ error: "Inbox item not found or already triaged" });
      }

      const task = await storage.createTask({
        userId: DEFAULT_USER_ID,
        domainId,
        title: inboxItem.title,
        priority: 1,
        effortPoints: null,
        valence: 0,
        scheduledDate: null,
        dueDate: null,
      });

      const today = date || new Date().toISOString().split("T")[0];
      await storage.createTaskDayAssignment({
        userId: DEFAULT_USER_ID,
        taskId: task.id,
        date: today,
      });

      await storage.triageInboxItem(id);

      res.json({ task, triaged: true });
    } catch (error) {
      console.error("Triage add-to-today error:", error);
      res.status(500).json({ error: "Failed to triage inbox item" });
    }
  });

  app.post("/api/inbox/:id/triage/schedule", async (req, res) => {
    try {
      const { id } = req.params;
      const { domainId, scheduledDate } = req.body;
      
      if (!domainId || !scheduledDate) {
        return res.status(400).json({ error: "domainId and scheduledDate are required" });
      }

      const inboxItem = await storage.getInboxItem(id);
      if (!inboxItem || inboxItem.status !== "untriaged") {
        return res.status(404).json({ error: "Inbox item not found or already triaged" });
      }

      const task = await storage.createTask({
        userId: DEFAULT_USER_ID,
        domainId,
        title: inboxItem.title,
        priority: 1,
        effortPoints: null,
        valence: 0,
        scheduledDate,
        dueDate: null,
      });

      await storage.triageInboxItem(id);

      res.json({ task, triaged: true });
    } catch (error) {
      console.error("Triage schedule error:", error);
      res.status(500).json({ error: "Failed to triage inbox item" });
    }
  });

  app.post("/api/inbox/:id/archive", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.archiveInboxItem(id);
      if (!item) {
        return res.status(404).json({ error: "Inbox item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to archive inbox item" });
    }
  });

  app.get("/api/habits", async (req, res) => {
    try {
      const habits = await storage.getHabitDefinitions(DEFAULT_USER_ID);
      const habitsWithOptions = await Promise.all(
        habits.map(async (habit) => ({
          ...habit,
          options: await storage.getHabitOptions(habit.id),
        }))
      );
      res.json(habitsWithOptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch habits" });
    }
  });

  app.post("/api/habits", async (req, res) => {
    try {
      const { options: optionLabels, ...habitFields } = req.body;
      const habitData = { ...habitFields, userId: DEFAULT_USER_ID };
      const result = insertHabitDefinitionSchema.extend({ userId: z.string() }).safeParse(habitData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const habit = await storage.createHabitDefinition(result.data);
      
      if (Array.isArray(optionLabels)) {
        for (const label of optionLabels) {
          if (typeof label === "string" && label.trim()) {
            await storage.createHabitOption({ habitId: habit.id, label: label.trim() });
          }
        }
      }

      const options = await storage.getHabitOptions(habit.id);
      res.status(201).json({ ...habit, options });
    } catch (error) {
      console.error("Create habit error:", error);
      res.status(500).json({ error: "Failed to create habit" });
    }
  });

  app.patch("/api/habits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const habit = await storage.updateHabitDefinition(id, req.body);
      if (!habit) {
        return res.status(404).json({ error: "Habit not found" });
      }
      res.json(habit);
    } catch (error) {
      res.status(500).json({ error: "Failed to update habit" });
    }
  });

  app.delete("/api/habits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHabitDefinition(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete habit" });
    }
  });

  app.post("/api/habits/reorder", async (req, res) => {
    try {
      const { ordered_habit_ids } = req.body;
      if (!Array.isArray(ordered_habit_ids)) {
        return res.status(400).json({ error: "ordered_habit_ids must be an array" });
      }
      await storage.reorderHabitDefinitions(DEFAULT_USER_ID, ordered_habit_ids);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder habits" });
    }
  });

  app.get("/api/habits/:habitId/options", async (req, res) => {
    try {
      const { habitId } = req.params;
      const options = await storage.getHabitOptions(habitId);
      res.json(options);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch habit options" });
    }
  });

  app.post("/api/habits/:habitId/options", async (req, res) => {
    try {
      const { habitId } = req.params;
      const optionData = { ...req.body, habitId };
      const result = insertHabitOptionSchema.safeParse(optionData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const option = await storage.createHabitOption(result.data);
      res.status(201).json(option);
    } catch (error) {
      res.status(500).json({ error: "Failed to create habit option" });
    }
  });

  app.patch("/api/habits/options/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const option = await storage.updateHabitOption(id, req.body);
      if (!option) {
        return res.status(404).json({ error: "Habit option not found" });
      }
      res.json(option);
    } catch (error) {
      res.status(500).json({ error: "Failed to update habit option" });
    }
  });

  app.delete("/api/habits/options/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHabitOption(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete habit option" });
    }
  });

  app.post("/api/habits/:habitId/entries", async (req, res) => {
    try {
      const { habitId } = req.params;
      const entryData = { ...req.body, habitId, userId: DEFAULT_USER_ID };
      const result = insertHabitDailyEntrySchema.extend({ userId: z.string() }).safeParse(entryData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const entry = await storage.createOrUpdateHabitDailyEntry(result.data);
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to save habit entry" });
    }
  });

  app.get("/api/task-day-assignments", async (req, res) => {
    try {
      const dateParam = req.query.date as string || new Date().toISOString().split("T")[0];
      const assignments = await storage.getTaskDayAssignmentsForDate(DEFAULT_USER_ID, dateParam);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch task day assignments" });
    }
  });

  app.post("/api/task-day-assignments", async (req, res) => {
    try {
      const assignmentData = { ...req.body, userId: DEFAULT_USER_ID };
      const result = insertTaskDayAssignmentSchema.extend({ userId: z.string() }).safeParse(assignmentData);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors });
      }

      const assignment = await storage.createTaskDayAssignment(result.data);
      res.status(201).json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task day assignment" });
    }
  });

  app.delete("/api/task-day-assignments/:taskId/:date", async (req, res) => {
    try {
      const { taskId, date } = req.params;
      await storage.deleteTaskDayAssignment(taskId, date);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task day assignment" });
    }
  });

  app.post("/api/tasks/:id/add-to-today", async (req, res) => {
    try {
      const { id } = req.params;
      const { date } = req.body;
      
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      const today = date || new Date().toISOString().split("T")[0];
      const assignment = await storage.createTaskDayAssignment({
        userId: DEFAULT_USER_ID,
        taskId: id,
        date: today,
      });

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: "Failed to add task to today" });
    }
  });

  app.delete("/api/tasks/:id/remove-from-today", async (req, res) => {
    try {
      const { id } = req.params;
      const dateParam = req.query.date as string || new Date().toISOString().split("T")[0];
      
      await storage.deleteTaskDayAssignment(id, dateParam);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove task from today" });
    }
  });

  return httpServer;
}
