import { randomUUID } from "crypto";
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private domains: Map<string, Domain>;
  private tasks: Map<string, Task>;

  constructor() {
    this.users = new Map();
    this.domains = new Map();
    this.tasks = new Map();
    this.seedDomains();
  }

  private seedDomains(): void {
    const now = new Date();
    SEED_DOMAINS.forEach((name, index) => {
      const id = randomUUID();
      this.domains.set(id, {
        id,
        userId: DEFAULT_USER_ID,
        name,
        sortOrder: index,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getDomains(userId: string): Promise<Domain[]> {
    return Array.from(this.domains.values())
      .filter((d) => d.userId === userId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getDomain(id: string): Promise<Domain | undefined> {
    return this.domains.get(id);
  }

  async createDomain(domain: InsertDomain): Promise<Domain> {
    const existingDomains = await this.getDomains(domain.userId);
    const maxOrder = existingDomains.reduce(
      (max, d) => Math.max(max, d.sortOrder),
      -1
    );

    const id = randomUUID();
    const now = new Date();
    const newDomain: Domain = {
      id,
      userId: domain.userId,
      name: domain.name,
      sortOrder: domain.sortOrder ?? maxOrder + 1,
      isActive: domain.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.domains.set(id, newDomain);
    return newDomain;
  }

  async updateDomain(
    id: string,
    updates: Partial<InsertDomain>
  ): Promise<Domain | undefined> {
    const domain = this.domains.get(id);
    if (!domain) return undefined;

    const updatedDomain: Domain = {
      ...domain,
      ...updates,
      updatedAt: new Date(),
    };
    this.domains.set(id, updatedDomain);
    return updatedDomain;
  }

  async reorderDomains(userId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const domain = this.domains.get(id);
      if (domain && domain.userId === userId) {
        this.domains.set(id, {
          ...domain,
          sortOrder: index,
          updatedAt: new Date(),
        });
      }
    });
  }

  async getTasks(
    userId: string,
    filterMode: FilterMode,
    sortMode: SortMode
  ): Promise<Task[]> {
    const filtered = Array.from(this.tasks.values()).filter((t) => {
      if (t.userId !== userId) return false;
      const isArchived = t.archivedAt !== null;
      switch (filterMode) {
        case "all":
          return !isArchived;
        case "open":
          return t.status === "open" && !isArchived;
        case "completed":
          return t.status === "completed" && !isArchived;
        case "archived":
          return isArchived;
        default:
          return !isArchived;
      }
    });

    const domains = await this.getDomains(userId);
    const domainOrderMap = new Map(domains.map((d) => [d.id, d.sortOrder]));

    const tasksByDomain: Record<string, Task[]> = {};
    filtered.forEach((task) => {
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

  private sortTasks(tasks: Task[], sortMode: SortMode): Task[] {
    const sorted = [...tasks];

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
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const domainTasks = Array.from(this.tasks.values()).filter(
      (t) => t.domainId === task.domainId && t.status === "open"
    );
    const maxOrder = domainTasks.reduce(
      (max, t) => Math.max(max, t.domainSortOrder),
      -1
    );

    const id = randomUUID();
    const now = new Date();
    const newTask: Task = {
      id,
      userId: task.userId,
      domainId: task.domainId,
      title: task.title,
      status: "open",
      priority: task.priority ?? 2,
      effortPoints: task.effortPoints ?? 2,
      complexity: task.complexity ?? 2,
      scheduledDate: task.scheduledDate ?? null,
      dueDate: task.dueDate ?? null,
      domainSortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      archivedAt: null,
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: string, updates: UpdateTask): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    let domainSortOrder = task.domainSortOrder;
    
    if (updates.domainId && updates.domainId !== task.domainId) {
      const domainTasks = Array.from(this.tasks.values()).filter(
        (t) => t.domainId === updates.domainId && t.status === "open"
      );
      const maxOrder = domainTasks.reduce(
        (max, t) => Math.max(max, t.domainSortOrder),
        -1
      );
      domainSortOrder = maxOrder + 1;
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      domainSortOrder,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async completeTask(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.status !== "open") return undefined;

    const now = new Date();
    const completedTask: Task = {
      ...task,
      status: "completed",
      completedAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, completedTask);
    return completedTask;
  }

  async reopenTask(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.status !== "completed") return undefined;

    const now = new Date();
    const reopenedTask: Task = {
      ...task,
      status: "open",
      completedAt: null,
      updatedAt: now,
    };
    this.tasks.set(id, reopenedTask);
    return reopenedTask;
  }

  async archiveTask(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.archivedAt !== null) return undefined;

    const now = new Date();
    const archivedTask: Task = {
      ...task,
      archivedAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, archivedTask);
    return archivedTask;
  }

  async restoreTask(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task || task.archivedAt === null) return undefined;

    const domainTasks = Array.from(this.tasks.values()).filter(
      (t) => t.domainId === task.domainId && t.status === "open" && t.archivedAt === null
    );
    const maxOrder = domainTasks.reduce(
      (max, t) => Math.max(max, t.domainSortOrder),
      -1
    );

    const now = new Date();
    const restoredTask: Task = {
      ...task,
      archivedAt: null,
      domainSortOrder: maxOrder + 1,
      updatedAt: now,
    };
    this.tasks.set(id, restoredTask);
    return restoredTask;
  }

  async reorderTasks(domainId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      const task = this.tasks.get(id);
      if (task && task.domainId === domainId) {
        this.tasks.set(id, {
          ...task,
          domainSortOrder: index,
          updatedAt: new Date(),
        });
      }
    });
  }

  async moveTask(taskId: string, newDomainId: string, newIndex: number): Promise<Task | undefined> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "open") return undefined;

    const oldDomainId = task.domainId;
    const now = new Date();
    const clampedIndex = Math.max(0, newIndex);

    if (oldDomainId === newDomainId) {
      const domainTasks = Array.from(this.tasks.values())
        .filter((t) => t.domainId === newDomainId && t.status === "open")
        .sort((a, b) => a.domainSortOrder - b.domainSortOrder);

      const oldIndex = domainTasks.findIndex((t) => t.id === taskId);
      if (oldIndex === -1) return undefined;

      domainTasks.splice(oldIndex, 1);
      const targetIndex = Math.min(clampedIndex, domainTasks.length);
      domainTasks.splice(targetIndex, 0, task);

      domainTasks.forEach((t, index) => {
        this.tasks.set(t.id, {
          ...this.tasks.get(t.id)!,
          domainSortOrder: index,
          updatedAt: now,
        });
      });
    } else {
      const oldDomainTasks = Array.from(this.tasks.values())
        .filter((t) => t.domainId === oldDomainId && t.status === "open" && t.id !== taskId)
        .sort((a, b) => a.domainSortOrder - b.domainSortOrder);

      oldDomainTasks.forEach((t, index) => {
        this.tasks.set(t.id, {
          ...this.tasks.get(t.id)!,
          domainSortOrder: index,
          updatedAt: now,
        });
      });

      const newDomainTasks = Array.from(this.tasks.values())
        .filter((t) => t.domainId === newDomainId && t.status === "open")
        .sort((a, b) => a.domainSortOrder - b.domainSortOrder);

      const targetIndex = Math.min(clampedIndex, newDomainTasks.length);

      newDomainTasks.forEach((t, index) => {
        const newOrder = index >= targetIndex ? index + 1 : index;
        this.tasks.set(t.id, {
          ...this.tasks.get(t.id)!,
          domainSortOrder: newOrder,
          updatedAt: now,
        });
      });

      this.tasks.set(taskId, {
        ...task,
        domainId: newDomainId,
        domainSortOrder: targetIndex,
        updatedAt: now,
      });
    }

    return this.tasks.get(taskId);
  }
}

export const storage = new MemStorage();
