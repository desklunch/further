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

export const taskStatusEnum = ["open", "completed"] as const;
export type TaskStatus = (typeof taskStatusEnum)[number];

export const filterModeEnum = ["all", "open", "completed", "archived"] as const;
export type FilterMode = (typeof filterModeEnum)[number];

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

const requiredInt = (min: number, max: number, defaultVal: number) =>
  z.coerce.number().int().min(min).max(max).default(defaultVal);

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
  priority: requiredInt(1, 3, 1),
  effortPoints: requiredInt(1, 3, 1),
  complexity: requiredInt(1, 3, 1),
  scheduledDate: nullableString,
  dueDate: nullableString,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  domainId: z.string().min(1).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  effortPoints: z.coerce.number().int().min(1).max(3).optional(),
  complexity: z.coerce.number().int().min(1).max(3).optional(),
  scheduledDate: nullableString,
  dueDate: nullableString,
});

export type UpdateTask = z.infer<typeof updateTaskSchema>;
