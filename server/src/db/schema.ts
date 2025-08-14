import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  boolean, 
  integer,
  pgEnum,
  jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'progress', 'resolved', 'closed']);
export const reportPriorityEnum = pgEnum('report_priority', ['low', 'medium', 'high', 'critical']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  full_name: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  avatar_url: text('avatar_url'),
  is_active: boolean('is_active').notNull().default(true),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Menus table
export const menusTable = pgTable('menus', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Sub menus table
export const subMenusTable = pgTable('sub_menus', {
  id: serial('id').primaryKey(),
  menu_id: integer('menu_id').notNull().references(() => menusTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Reports table
export const reportsTable = pgTable('reports', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  menu_id: integer('menu_id').notNull().references(() => menusTable.id, { onDelete: 'restrict' }),
  sub_menu_id: integer('sub_menu_id').notNull().references(() => subMenusTable.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  status: reportStatusEnum('status').notNull().default('pending'),
  priority: reportPriorityEnum('priority').notNull().default('medium'),
  assigned_to: integer('assigned_to').references(() => usersTable.id, { onDelete: 'set null' }),
  screenshots: jsonb('screenshots').$type<string[]>().default([]),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  resolved_at: timestamp('resolved_at')
});

// Report comments table
export const reportCommentsTable = pgTable('report_comments', {
  id: serial('id').primaryKey(),
  report_id: integer('report_id').notNull().references(() => reportsTable.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  comment: text('comment').notNull(),
  is_internal: boolean('is_internal').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  reports: many(reportsTable),
  assignedReports: many(reportsTable),
  comments: many(reportCommentsTable)
}));

export const menusRelations = relations(menusTable, ({ many }) => ({
  subMenus: many(subMenusTable),
  reports: many(reportsTable)
}));

export const subMenusRelations = relations(subMenusTable, ({ one, many }) => ({
  menu: one(menusTable, {
    fields: [subMenusTable.menu_id],
    references: [menusTable.id]
  }),
  reports: many(reportsTable)
}));

export const reportsRelations = relations(reportsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [reportsTable.user_id],
    references: [usersTable.id]
  }),
  assignedUser: one(usersTable, {
    fields: [reportsTable.assigned_to],
    references: [usersTable.id]
  }),
  menu: one(menusTable, {
    fields: [reportsTable.menu_id],
    references: [menusTable.id]
  }),
  subMenu: one(subMenusTable, {
    fields: [reportsTable.sub_menu_id],
    references: [subMenusTable.id]
  }),
  comments: many(reportCommentsTable)
}));

export const reportCommentsRelations = relations(reportCommentsTable, ({ one }) => ({
  report: one(reportsTable, {
    fields: [reportCommentsTable.report_id],
    references: [reportsTable.id]
  }),
  user: one(usersTable, {
    fields: [reportCommentsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Menu = typeof menusTable.$inferSelect;
export type NewMenu = typeof menusTable.$inferInsert;

export type SubMenu = typeof subMenusTable.$inferSelect;
export type NewSubMenu = typeof subMenusTable.$inferInsert;

export type Report = typeof reportsTable.$inferSelect;
export type NewReport = typeof reportsTable.$inferInsert;

export type ReportComment = typeof reportCommentsTable.$inferSelect;
export type NewReportComment = typeof reportCommentsTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  menus: menusTable,
  subMenus: subMenusTable,
  reports: reportsTable,
  reportComments: reportCommentsTable
};