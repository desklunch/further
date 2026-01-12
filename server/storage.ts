import { randomUUID } from "crypto";
import { eq, and, isNull, isNotNull, asc, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { domains, tasks, users } from "@shared/schema";
import type {
  User,
  InsertUser,
  Domain,
  InsertDomain,
  Task,
  InsertTask,
  UpdateTask,
  FilterMode,
  SortMode,
} from "@shared/schema";

const DEFAULT_USER_ID = "default-user";

const SEED_DOMAINS = [
  "Body",
  "Space",
  "Mind",
  "Plan",
  "Connect",
  "Attack",
  "Create",
  "Learn",
  "Manage",
];

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getDomains(userId: string): Promise<Domain[]>;
  getDomain(id: string): Promise<Domain | undefined>;
  createDomain(domain: InsertDomain): Promise<Domain>;
  updateDomain(id: string, updates: Partial<InsertDomain>): Promise<Domain | undefined>;
  reorderDomains(userId: string, orderedIds: string[]): Promise<void>;
  
  getTasks(userId: string, filterMode: FilterMode, sortMode: SortMode): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: UpdateTask): Promise<Task | undefined>;
  completeTask(id: string): Promise<Task | undefined>;
  reopenTask(id: string): Promise<Task | undefined>;
  archiveTask(id: string): Promise<Task | undefined>;
  restoreTask(id: string): Promise<Task | undefined>;
  reorderTasks(domainId: string, orderedIds: string[]): Promise<void>;
  moveTask(taskId: string, newDomainId: string, newIndex: number): Promise<Task | undefined>;
  
  seedDomainsIfNeeded(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async seedDomainsIfNeeded(): Promise<void> {
    const existingDomains = await db
      .select()
      .from(domains)
      .where(eq(domains.userId, DEFAULT_USER_ID))
      .limit(1);

    if (existingDomains.length === 0) {
      const now = new Date();
      for (let i = 0; i < SEED_DOMAINS.length; i++) {
        await db.insert(domains).values({
          id: randomUUID(),
          userId: DEFAULT_USER_ID,
          name: SEED_DOMAINS[i],
          sortOrder: i,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, id })
      .returning();
    return user;
  }

  async getDomains(userId: string): Promise<Domain[]> {
    return db
      .select()
      .from(domains)
      .where(eq(domains.userId, userId))
      .orderBy(asc(domains.sortOrder));
  }

  async getDomain(id: string): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.id, id)).limit(1);
    return domain;
  }

  async createDomain(domain: InsertDomain): Promise<Domain> {
    const existingDomains = await this.getDomains(domain.userId);
    const maxOrder = existingDomains.reduce((max, d) => Math.max(max, d.sortOrder), -1);

    const id = randomUUID();
    const now = new Date();
    const [newDomain] = await db
      .insert(domains)
      .values({
        id,
        userId: domain.userId,
        name: domain.name,
        sortOrder: domain.sortOrder ?? maxOrder + 1,
        isActive: domain.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return newDomain;
  }

  async updateDomain(id: string, updates: Partial<InsertDomain>): Promise<Domain | undefined> {
    const [updated] = await db
      .update(domains)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(domains.id, id))
      .returning();
    return updated;
  }

  async reorderDomains(userId: string, orderedIds: string[]): Promise<void> {
    const now = new Date();
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(domains)
        .set({ sortOrder: i, updatedAt: now })
        .where(and(eq(domains.id, orderedIds[i]), eq(domains.userId, userId)));
    }
  }

  async getTasks(userId: string, filterMode: FilterMode, sortMode: SortMode): Promise<Task[]> {
    let condition;
    switch (filterMode) {
      case "all":
        condition = and(eq(tasks.userId, userId), isNull(tasks.archivedAt));
        break;
      case "open":
        condition = and(
          eq(tasks.userId, userId),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt)
        );
        break;
      case "completed":
        condition = and(
          eq(tasks.userId, userId),
          eq(tasks.status, "completed"),
          isNull(tasks.archivedAt)
        );
        break;
      case "archived":
        condition = and(eq(tasks.userId, userId), isNotNull(tasks.archivedAt));
        break;
      default:
        condition = and(eq(tasks.userId, userId), isNull(tasks.archivedAt));
    }

    const allTasks = await db.select().from(tasks).where(condition);

    const userDomains = await this.getDomains(userId);
    const domainOrderMap = new Map(userDomains.map((d) => [d.id, d.sortOrder]));

    const tasksByDomain: Record<string, Task[]> = {};
    allTasks.forEach((task) => {
      if (!tasksByDomain[task.domainId]) {
        tasksByDomain[task.domainId] = [];
      }
      tasksByDomain[task.domainId].push(task);
    });

    Object.keys(tasksByDomain).forEach((domainId) => {
      tasksByDomain[domainId] = this.sortTasks(tasksByDomain[domainId], sortMode);
    });

    const sortedDomainIds = Object.keys(tasksByDomain).sort((a, b) => {
      const orderA = domainOrderMap.get(a) ?? 999;
      const orderB = domainOrderMap.get(b) ?? 999;
      return orderA - orderB;
    });

    const result: Task[] = [];
    sortedDomainIds.forEach((domainId) => {
      result.push(...tasksByDomain[domainId]);
    });

    return result;
  }

  private sortTasks(taskList: Task[], sortMode: SortMode): Task[] {
    const sorted = [...taskList];

    switch (sortMode) {
      case "manual":
        sorted.sort((a, b) => a.domainSortOrder - b.domainSortOrder);
        break;

      case "due_date":
        sorted.sort((a, b) => {
          const aHasDue = a.dueDate !== null;
          const bHasDue = b.dueDate !== null;
          if (aHasDue !== bHasDue) return aHasDue ? -1 : 1;
          if (aHasDue && bHasDue) {
            const dateCompare = new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
            if (dateCompare !== 0) return dateCompare;
          }
          const priorityA = a.priority ?? 0;
          const priorityB = b.priority ?? 0;
          if (priorityA !== priorityB) return priorityB - priorityA;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;

      case "scheduled_date":
        sorted.sort((a, b) => {
          const aHasSched = a.scheduledDate !== null;
          const bHasSched = b.scheduledDate !== null;
          if (aHasSched !== bHasSched) return aHasSched ? -1 : 1;
          if (aHasSched && bHasSched) {
            const dateCompare = new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime();
            if (dateCompare !== 0) return dateCompare;
          }
          const priorityA = a.priority ?? 0;
          const priorityB = b.priority ?? 0;
          if (priorityA !== priorityB) return priorityB - priorityA;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;

      case "priority":
        sorted.sort((a, b) => {
          const priorityA = a.priority ?? 0;
          const priorityB = b.priority ?? 0;
          if (priorityA !== priorityB) return priorityB - priorityA;
          const aHasDue = a.dueDate !== null;
          const bHasDue = b.dueDate !== null;
          if (aHasDue && bHasDue) {
            const dateCompare = new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
            if (dateCompare !== 0) return dateCompare;
          }
          if (aHasDue !== bHasDue) return aHasDue ? -1 : 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;

      case "effort":
        sorted.sort((a, b) => {
          const effortA = a.effortPoints ?? Infinity;
          const effortB = b.effortPoints ?? Infinity;
          if (effortA !== effortB) return effortA - effortB;
          const priorityA = a.priority ?? 0;
          const priorityB = b.priority ?? 0;
          if (priorityA !== priorityB) return priorityB - priorityA;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;

      case "complexity":
        sorted.sort((a, b) => {
          const complexityA = a.complexity ?? Infinity;
          const complexityB = b.complexity ?? Infinity;
          if (complexityA !== complexityB) return complexityA - complexityB;
          const priorityA = a.priority ?? 0;
          const priorityB = b.priority ?? 0;
          if (priorityA !== priorityB) return priorityB - priorityA;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        break;

      case "created":
        sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return sorted;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const domainTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.domainId, task.domainId), eq(tasks.status, "open")));
    const maxOrder = domainTasks.reduce((max, t) => Math.max(max, t.domainSortOrder), -1);

    const id = randomUUID();
    const now = new Date();
    const [newTask] = await db
      .insert(tasks)
      .values({
        id,
        userId: task.userId,
        domainId: task.domainId,
        title: task.title,
        status: "open",
        priority: task.priority ?? 1,
        effortPoints: task.effortPoints ?? 1,
        complexity: task.complexity ?? 1,
        scheduledDate: task.scheduledDate ?? null,
        dueDate: task.dueDate ?? null,
        domainSortOrder: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        archivedAt: null,
      })
      .returning();
    return newTask;
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    const existingTask = await this.getTask(id);
    if (!existingTask) return undefined;

    let domainSortOrder = existingTask.domainSortOrder;

    if (updates.domainId && updates.domainId !== existingTask.domainId) {
      const domainTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.domainId, updates.domainId), eq(tasks.status, "open")));
      const maxOrder = domainTasks.reduce((max, t) => Math.max(max, t.domainSortOrder), -1);
      domainSortOrder = maxOrder + 1;
    }

    const [updated] = await db
      .update(tasks)
      .set({
        ...updates,
        domainSortOrder,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    return updated;
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task || task.status !== "open") return undefined;

    const now = new Date();
    const [completed] = await db
      .update(tasks)
      .set({ status: "completed", completedAt: now, updatedAt: now })
      .where(eq(tasks.id, id))
      .returning();
    return completed;
  }

  async reopenTask(id: string): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task || task.status !== "completed") return undefined;

    const now = new Date();
    const [reopened] = await db
      .update(tasks)
      .set({ status: "open", completedAt: null, updatedAt: now })
      .where(eq(tasks.id, id))
      .returning();
    return reopened;
  }

  async archiveTask(id: string): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task || task.archivedAt !== null) return undefined;

    const now = new Date();
    const [archived] = await db
      .update(tasks)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(tasks.id, id))
      .returning();
    return archived;
  }

  async restoreTask(id: string): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task || task.archivedAt === null) return undefined;

    const domainTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.domainId, task.domainId),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt)
        )
      );
    const maxOrder = domainTasks.reduce((max, t) => Math.max(max, t.domainSortOrder), -1);

    const now = new Date();
    const [restored] = await db
      .update(tasks)
      .set({ archivedAt: null, domainSortOrder: maxOrder + 1, updatedAt: now })
      .where(eq(tasks.id, id))
      .returning();
    return restored;
  }

  async reorderTasks(domainId: string, orderedIds: string[]): Promise<void> {
    const now = new Date();
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(tasks)
        .set({ domainSortOrder: i, updatedAt: now })
        .where(and(eq(tasks.id, orderedIds[i]), eq(tasks.domainId, domainId)));
    }
  }

  async moveTask(taskId: string, newDomainId: string, newIndex: number): Promise<Task | undefined> {
    const task = await this.getTask(taskId);
    if (!task || task.status !== "open") return undefined;

    const oldDomainId = task.domainId;
    const now = new Date();
    const clampedIndex = Math.max(0, newIndex);

    if (oldDomainId === newDomainId) {
      const domainTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.domainId, newDomainId), eq(tasks.status, "open")))
        .orderBy(asc(tasks.domainSortOrder));

      const oldIndex = domainTasks.findIndex((t) => t.id === taskId);
      if (oldIndex === -1) return undefined;

      const reordered = [...domainTasks];
      reordered.splice(oldIndex, 1);
      const targetIndex = Math.min(clampedIndex, reordered.length);
      reordered.splice(targetIndex, 0, task);

      for (let i = 0; i < reordered.length; i++) {
        await db
          .update(tasks)
          .set({ domainSortOrder: i, updatedAt: now })
          .where(eq(tasks.id, reordered[i].id));
      }
    } else {
      const oldDomainTasks = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.domainId, oldDomainId),
            eq(tasks.status, "open")
          )
        )
        .orderBy(asc(tasks.domainSortOrder));

      const filteredOldTasks = oldDomainTasks.filter((t) => t.id !== taskId);
      for (let i = 0; i < filteredOldTasks.length; i++) {
        await db
          .update(tasks)
          .set({ domainSortOrder: i, updatedAt: now })
          .where(eq(tasks.id, filteredOldTasks[i].id));
      }

      const newDomainTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.domainId, newDomainId), eq(tasks.status, "open")))
        .orderBy(asc(tasks.domainSortOrder));

      const targetIndex = Math.min(clampedIndex, newDomainTasks.length);

      for (let i = 0; i < newDomainTasks.length; i++) {
        const newOrder = i >= targetIndex ? i + 1 : i;
        await db
          .update(tasks)
          .set({ domainSortOrder: newOrder, updatedAt: now })
          .where(eq(tasks.id, newDomainTasks[i].id));
      }

      await db
        .update(tasks)
        .set({ domainId: newDomainId, domainSortOrder: targetIndex, updatedAt: now })
        .where(eq(tasks.id, taskId));
    }

    return this.getTask(taskId);
  }
}

export const storage = new DatabaseStorage();
