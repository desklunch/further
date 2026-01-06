import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, taskStatusEnum, sortModeEnum } from "@shared/schema";
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
      const statusParam = req.query.status as string || "open";
      const sortParam = req.query.sort as string || "manual";

      const statusResult = z.enum(taskStatusEnum).safeParse(statusParam);
      const sortResult = z.enum(sortModeEnum).safeParse(sortParam);

      const status = statusResult.success ? statusResult.data : "open";
      const sort = sortResult.success ? sortResult.data : "manual";

      const tasks = await storage.getTasks(DEFAULT_USER_ID, status, sort);
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
      const { ordered_task_ids } = req.body;
      if (!Array.isArray(ordered_task_ids)) {
        return res.status(400).json({ error: "ordered_task_ids must be an array" });
      }
      await storage.reorderTasks(domainId, ordered_task_ids);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reorder tasks" });
    }
  });

  return httpServer;
}
