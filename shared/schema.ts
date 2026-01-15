import { pgTable, text, varchar, integer, boolean, timestamp, date, index, uniqueIndex } from "drizzle-orm/pg-core";
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

export const filterModeEnum = ["all", "open", "scheduled", "completed", "archived"] as const;
export type FilterMode = (typeof filterModeEnum)[number];

export const sortModeEnum = ["manual", "due_date", "scheduled_date", "priority", "effort", "valence", "created"] as const;
export type SortMode = (typeof sortModeEnum)[number];

export const valenceEnum = [-1, 0, 1] as const;
export type Valence = (typeof valenceEnum)[number];

export const inboxItemStatusEnum = ["untriaged", "converted", "dismissed"] as const;
export type InboxItemStatus = (typeof inboxItemStatusEnum)[number];

export const habitSelectionTypeEnum = ["single", "multi"] as const;
export type HabitSelectionType = (typeof habitSelectionTypeEnum)[number];

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
  valence: integer("valence").$type<Valence>().default(0),
  scheduledDate: date("scheduled_date"),
  dueDate: date("due_date"),
  sourceInboxItemId: varchar("source_inbox_item_id", { length: 36 }),
  domainSortOrder: integer("domain_sort_order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("tasks_user_status_idx").on(table.userId, table.status),
  index("tasks_user_scheduled_idx").on(table.userId, table.scheduledDate),
]);

const requiredInt = (min: number, max: number, defaultVal: number) =>
  z.coerce.number().int().min(min).max(max).default(defaultVal);

const nullableString = z.union([z.string(), z.null()]).optional().transform((val) => val || null);

const nullableInt = (min: number, max: number) =>
  z.union([z.coerce.number().int().min(min).max(max), z.null()]).optional().transform((val) => val ?? null);

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
  effortPoints: nullableInt(1, 3),
  valence: z.coerce.number().int().min(-1).max(1).default(0),
  scheduledDate: nullableString,
  dueDate: nullableString,
  sourceInboxItemId: nullableString,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  domainId: z.string().min(1).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  effortPoints: z.union([z.coerce.number().int().min(1).max(3), z.null()]).optional(),
  valence: z.coerce.number().int().min(-1).max(1).optional(),
  scheduledDate: z.union([z.string(), z.null()]).optional(),
  dueDate: z.union([z.string(), z.null()]).optional(),
  sourceInboxItemId: z.union([z.string(), z.null()]).optional(),
});

export type UpdateTask = z.infer<typeof updateTaskSchema>;

export const inboxItems = pgTable("inbox_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  title: text("title").notNull(),
  status: text("status").$type<InboxItemStatus>().notNull().default("untriaged"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  triagedAt: timestamp("triaged_at"),
}, (table) => [
  index("inbox_items_user_status_idx").on(table.userId, table.status),
]);

export const insertInboxItemSchema = createInsertSchema(inboxItems).omit({
  id: true,
  createdAt: true,
  triagedAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
});

export type InsertInboxItem = z.infer<typeof insertInboxItemSchema>;
export type InboxItem = typeof inboxItems.$inferSelect;

export const habitDefinitions = pgTable("habit_definitions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  domainId: varchar("domain_id", { length: 36 }).notNull(),
  name: text("name").notNull(),
  selectionType: text("selection_type").$type<HabitSelectionType>().notNull().default("single"),
  minRequired: integer("min_required"),
  sortOrder: integer("sort_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHabitDefinitionSchema = createInsertSchema(habitDefinitions).omit({
  id: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Name is required"),
  domainId: z.string().min(1, "Domain is required"),
  selectionType: z.enum(habitSelectionTypeEnum).default("single"),
  minRequired: z.coerce.number().int().min(1).optional(),
});

export type InsertHabitDefinition = z.infer<typeof insertHabitDefinitionSchema>;
export type HabitDefinition = typeof habitDefinitions.$inferSelect;

export const habitOptions = pgTable("habit_options", {
  id: varchar("id", { length: 36 }).primaryKey(),
  habitId: varchar("habit_id", { length: 36 }).notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHabitOptionSchema = createInsertSchema(habitOptions).omit({
  id: true,
  sortOrder: true,
  createdAt: true,
}).extend({
  habitId: z.string().min(1, "Habit is required"),
  label: z.string().min(1, "Label is required"),
});

export type InsertHabitOption = z.infer<typeof insertHabitOptionSchema>;
export type HabitOption = typeof habitOptions.$inferSelect;

export const habitDailyEntries = pgTable("habit_daily_entries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  habitId: varchar("habit_id", { length: 36 }).notNull(),
  date: date("date").notNull(),
  selectedOptionIds: text("selected_option_ids").array().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("habit_entries_user_date_idx").on(table.userId, table.date),
  index("habit_entries_habit_date_idx").on(table.habitId, table.date),
]);

export const insertHabitDailyEntrySchema = createInsertSchema(habitDailyEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  habitId: z.string().min(1, "Habit is required"),
  date: z.string().min(1, "Date is required"),
  selectedOptionIds: z.array(z.string()),
});

export type InsertHabitDailyEntry = z.infer<typeof insertHabitDailyEntrySchema>;
export type HabitDailyEntry = typeof habitDailyEntries.$inferSelect;

export const taskDayAssignments = pgTable("task_day_assignments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  taskId: varchar("task_id", { length: 36 }).notNull(),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("task_day_user_date_idx").on(table.userId, table.date),
  uniqueIndex("task_day_unique_idx").on(table.userId, table.taskId, table.date),
]);

export const insertTaskDayAssignmentSchema = createInsertSchema(taskDayAssignments).omit({
  id: true,
  createdAt: true,
}).extend({
  taskId: z.string().min(1, "Task is required"),
  date: z.string().min(1, "Date is required"),
});

export type InsertTaskDayAssignment = z.infer<typeof insertTaskDayAssignmentSchema>;
export type TaskDayAssignment = typeof taskDayAssignments.$inferSelect;
