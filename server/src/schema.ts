import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['user', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Report status enum
export const reportStatusSchema = z.enum(['pending', 'progress', 'resolved', 'closed']);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

// Report priority enum
export const reportPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ReportPriority = z.infer<typeof reportPrioritySchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  avatar_url: z.string().nullable(),
  is_active: z.boolean(),
  last_login: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Menu schema
export const menuSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Menu = z.infer<typeof menuSchema>;

// Sub menu schema
export const subMenuSchema = z.object({
  id: z.number(),
  menu_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type SubMenu = z.infer<typeof subMenuSchema>;

// Report schema
export const reportSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  menu_id: z.number(),
  sub_menu_id: z.number(),
  name: z.string(),
  description: z.string(),
  status: reportStatusSchema,
  priority: reportPrioritySchema,
  assigned_to: z.number().nullable(),
  screenshots: z.array(z.string()),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  resolved_at: z.coerce.date().nullable()
});

export type Report = z.infer<typeof reportSchema>;

// Report comment schema
export const reportCommentSchema = z.object({
  id: z.number(),
  report_id: z.number(),
  user_id: z.number(),
  comment: z.string(),
  is_internal: z.boolean(),
  created_at: z.coerce.date()
});

export type ReportComment = z.infer<typeof reportCommentSchema>;

// Auth schemas
export const loginInputSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
  remember: z.boolean().optional()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const authResponseSchema = z.object({
  user: userSchema.omit({ password_hash: true }),
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// User input schemas
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  full_name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: userRoleSchema,
  avatar_url: z.string().nullable().optional()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50).optional(),
  full_name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: userRoleSchema.optional(),
  avatar_url: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const changePasswordInputSchema = z.object({
  user_id: z.number(),
  current_password: z.string().min(1),
  new_password: z.string().min(8),
  confirm_password: z.string().min(8)
}).refine(data => data.new_password === data.confirm_password, {
  message: "Password konfirmasi tidak cocok",
  path: ["confirm_password"]
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

// Menu input schemas
export const createMenuInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type CreateMenuInput = z.infer<typeof createMenuInputSchema>;

export const updateMenuInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateMenuInput = z.infer<typeof updateMenuInputSchema>;

// Sub menu input schemas
export const createSubMenuInputSchema = z.object({
  menu_id: z.number(),
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type CreateSubMenuInput = z.infer<typeof createSubMenuInputSchema>;

export const updateSubMenuInputSchema = z.object({
  id: z.number(),
  menu_id: z.number().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateSubMenuInput = z.infer<typeof updateSubMenuInputSchema>;

// Report input schemas
export const createReportInputSchema = z.object({
  user_id: z.number(),
  menu_id: z.number(),
  sub_menu_id: z.number(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  screenshots: z.array(z.string()).max(5).optional()
});

export type CreateReportInput = z.infer<typeof createReportInputSchema>;

export const updateReportInputSchema = z.object({
  id: z.number(),
  menu_id: z.number().optional(),
  sub_menu_id: z.number().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(1000).optional(),
  status: reportStatusSchema.optional(),
  priority: reportPrioritySchema.optional(),
  assigned_to: z.number().nullable().optional(),
  screenshots: z.array(z.string()).max(5).optional()
});

export type UpdateReportInput = z.infer<typeof updateReportInputSchema>;

// Report comment input schemas
export const createReportCommentInputSchema = z.object({
  report_id: z.number(),
  user_id: z.number(),
  comment: z.string().min(1).max(500),
  is_internal: z.boolean().optional()
});

export type CreateReportCommentInput = z.infer<typeof createReportCommentInputSchema>;

// Query filter schemas
export const reportFiltersSchema = z.object({
  search: z.string().optional(),
  status: reportStatusSchema.optional(),
  priority: reportPrioritySchema.optional(),
  user_id: z.number().optional(),
  menu_id: z.number().optional(),
  assigned_to: z.number().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional()
});

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: userRoleSchema.optional(),
  is_active: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  per_page: z.number().int().positive().max(100).optional()
});

export type UserFilters = z.infer<typeof userFiltersSchema>;

// Analytics schemas
export const analyticsDateRangeSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type AnalyticsDateRange = z.infer<typeof analyticsDateRangeSchema>;

export const dashboardStatsSchema = z.object({
  total_reports: z.number(),
  pending_reports: z.number(),
  resolved_reports: z.number(),
  active_users: z.number(),
  reports_change: z.number(),
  pending_change: z.number(),
  resolved_change: z.number(),
  users_change: z.number()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// Pagination schema
export const paginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  per_page: z.number(),
  total_pages: z.number()
});

export type Pagination = z.infer<typeof paginationSchema>;

// Generic paginated response schema
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    pagination: paginationSchema
  });

// Response schemas for reports with user and menu details
export const reportWithDetailsSchema = reportSchema.extend({
  user: userSchema.omit({ password_hash: true }),
  menu: menuSchema,
  sub_menu: subMenuSchema,
  assigned_user: userSchema.omit({ password_hash: true }).nullable()
});

export type ReportWithDetails = z.infer<typeof reportWithDetailsSchema>;

// File upload schema
export const fileUploadSchema = z.object({
  filename: z.string(),
  mimetype: z.string(),
  size: z.number(),
  url: z.string()
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

// Bulk action schemas
export const bulkUpdateReportStatusSchema = z.object({
  report_ids: z.array(z.number()).min(1),
  status: reportStatusSchema
});

export type BulkUpdateReportStatus = z.infer<typeof bulkUpdateReportStatusSchema>;

export const bulkAssignReportsSchema = z.object({
  report_ids: z.array(z.number()).min(1),
  assigned_to: z.number()
});

export type BulkAssignReports = z.infer<typeof bulkAssignReportsSchema>;