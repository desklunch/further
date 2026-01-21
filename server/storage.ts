import { randomUUID } from "crypto";
import { eq, and, isNull, isNotNull, asc, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { 
  domains, 
  tasks, 
  users,
  inboxItems,
  habitDefinitions,
  habitOptions,
  habitDailyEntries,
  taskDayAssignments,
} from "@shared/schema";
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
  InboxItem,
  InsertInboxItem,
  HabitDefinition,
  InsertHabitDefinition,
  HabitOption,
  InsertHabitOption,
  HabitDailyEntry,
  InsertHabitDailyEntry,
  TaskDayAssignment,
  InsertTaskDayAssignment,
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
  getTasksScheduledForDate(userId: string, date: string): Promise<Task[]>;
  getTasksAssignedToDate(userId: string, date: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: UpdateTask): Promise<Task | undefined>;
  completeTask(id: string): Promise<Task | undefined>;
  reopenTask(id: string): Promise<Task | undefined>;
  archiveTask(id: string): Promise<Task | undefined>;
  restoreTask(id: string): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;
  reorderTasks(domainId: string, orderedIds: string[]): Promise<void>;
  moveTask(taskId: string, newDomainId: string, newIndex: number): Promise<Task | undefined>;
  
  getInboxItems(userId: string): Promise<InboxItem[]>;
  getInboxItem(id: string): Promise<InboxItem | undefined>;
  createInboxItem(item: InsertInboxItem): Promise<InboxItem>;
  updateInboxItem(id: string, updates: { title?: string }): Promise<InboxItem | undefined>;
  convertInboxItem(id: string): Promise<InboxItem | undefined>;
  dismissInboxItem(id: string): Promise<InboxItem | undefined>;
  
  getHabitDefinitions(userId: string, includeInactive?: boolean): Promise<HabitDefinition[]>;
  getHabitDefinition(id: string): Promise<HabitDefinition | undefined>;
  createHabitDefinition(habit: InsertHabitDefinition): Promise<HabitDefinition>;
  updateHabitDefinition(id: string, updates: Partial<InsertHabitDefinition>): Promise<HabitDefinition | undefined>;
  deleteHabitDefinition(id: string): Promise<void>;
  reorderHabitDefinitions(userId: string, orderedIds: string[]): Promise<void>;
  
  getHabitOptions(habitId: string): Promise<HabitOption[]>;
  getHabitOptionsByHabitIds(habitIds: string[]): Promise<HabitOption[]>;
  createHabitOption(option: InsertHabitOption): Promise<HabitOption>;
  updateHabitOption(id: string, updates: Partial<InsertHabitOption>): Promise<HabitOption | undefined>;
  deleteHabitOption(id: string): Promise<void>;
  reorderHabitOptions(habitId: string, orderedIds: string[]): Promise<void>;
  
  getHabitDailyEntry(habitId: string, date: string): Promise<HabitDailyEntry | undefined>;
  getHabitDailyEntriesForDate(userId: string, date: string): Promise<HabitDailyEntry[]>;
  createOrUpdateHabitDailyEntry(entry: InsertHabitDailyEntry): Promise<HabitDailyEntry>;
  
  getTaskDayAssignment(taskId: string, date: string): Promise<TaskDayAssignment | undefined>;
  getTaskDayAssignmentsForDate(userId: string, date: string): Promise<TaskDayAssignment[]>;
  getLastVisibleDateForTask(taskId: string): Promise<string | null>;
  createTaskDayAssignment(assignment: InsertTaskDayAssignment): Promise<TaskDayAssignment>;
  deleteTaskDayAssignment(taskId: string, date: string): Promise<void>;
  
  getCarryoverTasks(userId: string, today: string): Promise<Array<Task & { lastVisibleDate: string; carryoverLabel: string }>>;
  dismissCarryover(taskId: string, today: string): Promise<Task | undefined>;
  completeTaskWithDate(taskId: string, completedAsOf: 'today' | 'yesterday'): Promise<Task | undefined>;
  
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
        condition = and(eq(tasks.userId, userId), eq(tasks.status, "open"), isNull(tasks.archivedAt));
        break;
      case "open":
        condition = and(
          eq(tasks.userId, userId),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt),
          isNull(tasks.scheduledDate)
        );
        break;
      case "scheduled":
        condition = and(
          eq(tasks.userId, userId),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt),
          isNotNull(tasks.scheduledDate)
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

      case "valence":
        sorted.sort((a, b) => {
          const valenceA = a.valence ?? 0;
          const valenceB = b.valence ?? 0;
          if (valenceA !== valenceB) return valenceB - valenceA;
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
      .where(and(
        eq(tasks.userId, task.userId),
        eq(tasks.domainId, task.domainId),
        eq(tasks.status, "open"),
        isNull(tasks.archivedAt)
      ));
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
        effortPoints: task.effortPoints ?? null,
        valence: (task.valence ?? 0) as -1 | 0 | 1,
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
        .where(and(
          eq(tasks.userId, existingTask.userId),
          eq(tasks.domainId, updates.domainId),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt)
        ));
      const maxOrder = domainTasks.reduce((max, t) => Math.max(max, t.domainSortOrder), -1);
      domainSortOrder = maxOrder + 1;
    }

    const updateData: Record<string, unknown> = {
      domainSortOrder,
      updatedAt: new Date(),
    };
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.domainId !== undefined) updateData.domainId = updates.domainId;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.effortPoints !== undefined) updateData.effortPoints = updates.effortPoints;
    if (updates.valence !== undefined) updateData.valence = updates.valence as -1 | 0 | 1;
    if (updates.scheduledDate !== undefined) updateData.scheduledDate = updates.scheduledDate;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;

    const [updated] = await db
      .update(tasks)
      .set(updateData)
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

  async deleteTask(id: string): Promise<boolean> {
    // First delete any associated task-day-assignments
    await db
      .delete(taskDayAssignments)
      .where(eq(taskDayAssignments.taskId, id));
    
    // Then delete the task
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    return result.length > 0;
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

  async getTasksScheduledForDate(userId: string, date: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.scheduledDate, date),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt)
        )
      )
      .orderBy(asc(tasks.domainSortOrder));
  }

  async getTasksAssignedToDate(userId: string, date: string): Promise<Task[]> {
    const assignments = await db
      .select()
      .from(taskDayAssignments)
      .where(and(eq(taskDayAssignments.userId, userId), eq(taskDayAssignments.date, date)));
    
    if (assignments.length === 0) return [];
    
    const taskIds = assignments.map((a) => a.taskId);
    const assignedTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt)
        )
      );
    
    return assignedTasks.filter((t) => taskIds.includes(t.id));
  }

  async getInboxItems(userId: string): Promise<InboxItem[]> {
    return db
      .select()
      .from(inboxItems)
      .where(and(eq(inboxItems.userId, userId), eq(inboxItems.status, "untriaged")))
      .orderBy(desc(inboxItems.createdAt));
  }

  async getInboxItem(id: string): Promise<InboxItem | undefined> {
    const [item] = await db.select().from(inboxItems).where(eq(inboxItems.id, id)).limit(1);
    return item;
  }

  async createInboxItem(item: InsertInboxItem): Promise<InboxItem> {
    const id = randomUUID();
    const now = new Date();
    const [newItem] = await db
      .insert(inboxItems)
      .values({
        id,
        userId: item.userId,
        title: item.title,
        status: "untriaged",
        createdAt: now,
        triagedAt: null,
      })
      .returning();
    return newItem;
  }

  async updateInboxItem(id: string, updates: { title?: string }): Promise<InboxItem | undefined> {
    const [updated] = await db
      .update(inboxItems)
      .set(updates)
      .where(eq(inboxItems.id, id))
      .returning();
    return updated;
  }

  async convertInboxItem(id: string): Promise<InboxItem | undefined> {
    const now = new Date();
    const [converted] = await db
      .update(inboxItems)
      .set({ status: "converted", triagedAt: now })
      .where(eq(inboxItems.id, id))
      .returning();
    return converted;
  }

  async dismissInboxItem(id: string): Promise<InboxItem | undefined> {
    const now = new Date();
    const [dismissed] = await db
      .update(inboxItems)
      .set({ status: "dismissed", triagedAt: now })
      .where(eq(inboxItems.id, id))
      .returning();
    return dismissed;
  }

  async getHabitDefinitions(userId: string, includeInactive: boolean = false): Promise<HabitDefinition[]> {
    const conditions = [eq(habitDefinitions.userId, userId)];
    if (!includeInactive) {
      conditions.push(eq(habitDefinitions.isActive, true));
    }
    return db
      .select()
      .from(habitDefinitions)
      .where(and(...conditions))
      .orderBy(asc(habitDefinitions.sortOrder));
  }

  async getHabitDefinition(id: string): Promise<HabitDefinition | undefined> {
    const [habit] = await db.select().from(habitDefinitions).where(eq(habitDefinitions.id, id)).limit(1);
    return habit;
  }

  async createHabitDefinition(habit: InsertHabitDefinition): Promise<HabitDefinition> {
    const existingHabits = await this.getHabitDefinitions(habit.userId);
    const maxOrder = existingHabits.reduce((max, h) => Math.max(max, h.sortOrder), -1);

    const id = randomUUID();
    const now = new Date();
    const [newHabit] = await db
      .insert(habitDefinitions)
      .values({
        id,
        userId: habit.userId,
        domainId: habit.domainId,
        name: habit.name,
        selectionType: habit.selectionType ?? "single",
        minRequired: habit.minRequired ?? null,
        sortOrder: habit.sortOrder ?? maxOrder + 1,
        isActive: habit.isActive ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return newHabit;
  }

  async updateHabitDefinition(id: string, updates: Partial<InsertHabitDefinition>): Promise<HabitDefinition | undefined> {
    const [updated] = await db
      .update(habitDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(habitDefinitions.id, id))
      .returning();
    return updated;
  }

  async deleteHabitDefinition(id: string): Promise<void> {
    await db.update(habitDefinitions).set({ isActive: false, updatedAt: new Date() }).where(eq(habitDefinitions.id, id));
  }

  async reorderHabitDefinitions(userId: string, orderedIds: string[]): Promise<void> {
    const now = new Date();
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(habitDefinitions)
        .set({ sortOrder: i, updatedAt: now })
        .where(and(eq(habitDefinitions.id, orderedIds[i]), eq(habitDefinitions.userId, userId)));
    }
  }

  async getHabitOptions(habitId: string): Promise<HabitOption[]> {
    return db
      .select()
      .from(habitOptions)
      .where(eq(habitOptions.habitId, habitId))
      .orderBy(asc(habitOptions.sortOrder));
  }

  async getHabitOptionsByHabitIds(habitIds: string[]): Promise<HabitOption[]> {
    if (habitIds.length === 0) return [];
    return db
      .select()
      .from(habitOptions)
      .where(sql`${habitOptions.habitId} IN (${sql.join(habitIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(asc(habitOptions.sortOrder));
  }

  async createHabitOption(option: InsertHabitOption): Promise<HabitOption> {
    const existingOptions = await this.getHabitOptions(option.habitId);
    const maxOrder = existingOptions.reduce((max, o) => Math.max(max, o.sortOrder), -1);

    const id = randomUUID();
    const [newOption] = await db
      .insert(habitOptions)
      .values({
        id,
        habitId: option.habitId,
        label: option.label,
        sortOrder: option.sortOrder ?? maxOrder + 1,
        createdAt: new Date(),
      })
      .returning();
    return newOption;
  }

  async updateHabitOption(id: string, updates: Partial<InsertHabitOption>): Promise<HabitOption | undefined> {
    const [updated] = await db
      .update(habitOptions)
      .set(updates)
      .where(eq(habitOptions.id, id))
      .returning();
    return updated;
  }

  async deleteHabitOption(id: string): Promise<void> {
    await db.delete(habitOptions).where(eq(habitOptions.id, id));
  }

  async reorderHabitOptions(habitId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(habitOptions)
        .set({ sortOrder: i })
        .where(and(eq(habitOptions.id, orderedIds[i]), eq(habitOptions.habitId, habitId)));
    }
  }

  async getHabitDailyEntry(habitId: string, date: string): Promise<HabitDailyEntry | undefined> {
    const [entry] = await db
      .select()
      .from(habitDailyEntries)
      .where(and(eq(habitDailyEntries.habitId, habitId), eq(habitDailyEntries.date, date)))
      .limit(1);
    return entry;
  }

  async getHabitDailyEntriesForDate(userId: string, date: string): Promise<HabitDailyEntry[]> {
    return db
      .select()
      .from(habitDailyEntries)
      .where(and(eq(habitDailyEntries.userId, userId), eq(habitDailyEntries.date, date)));
  }

  async createOrUpdateHabitDailyEntry(entry: InsertHabitDailyEntry): Promise<HabitDailyEntry> {
    const existing = await this.getHabitDailyEntry(entry.habitId, entry.date);
    const now = new Date();

    if (existing) {
      const [updated] = await db
        .update(habitDailyEntries)
        .set({ selectedOptionIds: entry.selectedOptionIds, updatedAt: now })
        .where(eq(habitDailyEntries.id, existing.id))
        .returning();
      return updated;
    }

    const habit = await this.getHabitDefinition(entry.habitId);
    const id = randomUUID();
    const [newEntry] = await db
      .insert(habitDailyEntries)
      .values({
        id,
        userId: habit?.userId ?? entry.userId,
        habitId: entry.habitId,
        date: entry.date,
        selectedOptionIds: entry.selectedOptionIds,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return newEntry;
  }

  async getTaskDayAssignment(taskId: string, date: string): Promise<TaskDayAssignment | undefined> {
    const [assignment] = await db
      .select()
      .from(taskDayAssignments)
      .where(and(eq(taskDayAssignments.taskId, taskId), eq(taskDayAssignments.date, date)))
      .limit(1);
    return assignment;
  }

  async getTaskDayAssignmentsForDate(userId: string, date: string): Promise<TaskDayAssignment[]> {
    return db
      .select()
      .from(taskDayAssignments)
      .where(and(eq(taskDayAssignments.userId, userId), eq(taskDayAssignments.date, date)));
  }

  async createTaskDayAssignment(assignment: InsertTaskDayAssignment): Promise<TaskDayAssignment> {
    const task = await this.getTask(assignment.taskId);
    const id = randomUUID();
    const userId = task?.userId ?? assignment.userId;
    
    const result = await db
      .insert(taskDayAssignments)
      .values({
        id,
        userId,
        taskId: assignment.taskId,
        date: assignment.date,
        createdAt: new Date(),
      })
      .onConflictDoNothing({
        target: [taskDayAssignments.userId, taskDayAssignments.taskId, taskDayAssignments.date],
      })
      .returning();
    
    if (result.length > 0) {
      return result[0];
    }
    
    const existing = await this.getTaskDayAssignment(assignment.taskId, assignment.date);
    return existing!;
  }

  async deleteTaskDayAssignment(taskId: string, date: string): Promise<void> {
    await db
      .delete(taskDayAssignments)
      .where(and(eq(taskDayAssignments.taskId, taskId), eq(taskDayAssignments.date, date)));
  }

  async getLastVisibleDateForTask(taskId: string): Promise<string | null> {
    const task = await this.getTask(taskId);
    if (!task) return null;

    const [latestAssignment] = await db
      .select()
      .from(taskDayAssignments)
      .where(eq(taskDayAssignments.taskId, taskId))
      .orderBy(desc(taskDayAssignments.date))
      .limit(1);

    const assignmentDate = latestAssignment?.date || null;
    const scheduledDate = task.scheduledDate;

    if (!assignmentDate && !scheduledDate) return null;
    if (!assignmentDate) return scheduledDate;
    if (!scheduledDate) return assignmentDate;

    return assignmentDate > scheduledDate ? assignmentDate : scheduledDate;
  }

  async getCarryoverTasks(userId: string, today: string): Promise<Array<Task & { lastVisibleDate: string; carryoverLabel: string }>> {
    const allOpenTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, "open"),
          isNull(tasks.archivedAt)
        )
      );

    const yesterday = this.getYesterdayDate(today);
    const carryoverTasks: Array<Task & { lastVisibleDate: string; carryoverLabel: string }> = [];

    for (const task of allOpenTasks) {
      if (task.scheduledDate === today) continue;
      if (task.carryoverDismissedUntil && task.carryoverDismissedUntil >= today) continue;

      const lastVisibleDate = await this.getLastVisibleDateForTask(task.id);
      if (!lastVisibleDate || lastVisibleDate >= today) continue;

      const carryoverLabel = lastVisibleDate === yesterday ? "From yesterday" : "From earlier";
      carryoverTasks.push({ ...task, lastVisibleDate, carryoverLabel });
    }

    return carryoverTasks;
  }

  private getYesterdayDate(today: string): string {
    const date = new Date(today + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().split("T")[0];
  }

  async dismissCarryover(taskId: string, today: string): Promise<Task | undefined> {
    const task = await this.getTask(taskId);
    if (!task) return undefined;

    const now = new Date();
    const [updated] = await db
      .update(tasks)
      .set({ carryoverDismissedUntil: today, updatedAt: now })
      .where(eq(tasks.id, taskId))
      .returning();
    return updated;
  }

  async completeTaskWithDate(taskId: string, completedAsOf: 'today' | 'yesterday'): Promise<Task | undefined> {
    const task = await this.getTask(taskId);
    if (!task || task.status !== "open") return undefined;

    let completedAt: Date;
    if (completedAsOf === 'yesterday') {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      completedAt = yesterday;
    } else {
      completedAt = new Date();
    }

    const [completed] = await db
      .update(tasks)
      .set({ status: "completed", completedAt, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return completed;
  }
}

export const storage = new DatabaseStorage();
