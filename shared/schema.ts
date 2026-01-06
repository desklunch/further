import { pgTable, text, varchar, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const taskStatusEnum = ["open", "completed", "archived"] as const;
export type TaskStatus = (typeof taskStatusEnum)[number];

export const sortModeEnum = ["manual", "due_date", "scheduled_date", "priority", "effort", "complexity", "created"] as const;
export type SortMode = (typeof sortModeEnum)[number];

export const domains = pgTable("domains", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDomainSchema = createInsertSchema(domains).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domains.$inferSelect;

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  domainId: varchar("domain_id", { length: 36 }).notNull(),
  title: text("title").notNull(),
  status: text("status").$type<TaskStatus>().notNull().default("open"),
  priority: integer("priority"),
  effortPoints: integer("effort_points"),
  complexity: integer("complexity"),
  scheduledDate: date("scheduled_date"),
  dueDate: date("due_date"),
  domainSortOrder: integer("domain_sort_order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
});

const nullableInt = (min: number, max: number) =>
  z.union([
    z.coerce.number().int().min(min).max(max),
    z.null(),
  ]).optional().transform((val) => val ?? null);

const nullableString = z.union([z.string(), z.null()]).optional().transform((val) => val || null);

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  archivedAt: true,
  domainSortOrder: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  domainId: z.string().min(1, "Domain is required"),
  priority: nullableInt(1, 5),
  effortPoints: nullableInt(1, 8),
  complexity: nullableInt(1, 5),
  scheduledDate: nullableString,
  dueDate: nullableString,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  domainId: z.string().min(1).optional(),
  priority: nullableInt(1, 5),
  effortPoints: nullableInt(1, 8),
  complexity: nullableInt(1, 5),
  scheduledDate: nullableString,
  dueDate: nullableString,
});

export type UpdateTask = z.infer<typeof updateTaskSchema>;
