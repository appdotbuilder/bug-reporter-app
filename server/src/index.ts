import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  loginInputSchema,
  createUserInputSchema,
  updateUserInputSchema,
  changePasswordInputSchema,
  userFiltersSchema,
  createMenuInputSchema,
  updateMenuInputSchema,
  createSubMenuInputSchema,
  updateSubMenuInputSchema,
  createReportInputSchema,
  updateReportInputSchema,
  reportFiltersSchema,
  createReportCommentInputSchema,
  analyticsDateRangeSchema,
  bulkUpdateReportStatusSchema,
  bulkAssignReportsSchema
} from './schema';

// Import handlers
import { login, getCurrentUser, logout } from './handlers/auth';
import { 
  createUser, 
  updateUser, 
  changePassword, 
  getUsers, 
  getUserById, 
  deleteUser, 
  toggleUserStatus, 
  resetUserPassword 
} from './handlers/users';
import { 
  createMenu, 
  updateMenu, 
  getMenus, 
  getMenuWithSubMenus, 
  deleteMenu,
  createSubMenu,
  updateSubMenu,
  getSubMenusByMenuId,
  deleteSubMenu
} from './handlers/menus';
import { 
  createReport, 
  updateReport, 
  getReports, 
  getUserReports, 
  getReportById, 
  deleteReport, 
  assignReport,
  bulkUpdateReportStatus,
  bulkAssignReports,
  getRecentReports
} from './handlers/reports';
import { 
  createReportComment, 
  getReportComments, 
  updateReportComment, 
  deleteReportComment 
} from './handlers/report_comments';
import { 
  getDashboardStats, 
  getReportsOvertime, 
  getStatusDistribution, 
  getTopMenusWithBugs,
  getAverageResolutionTime,
  getResolutionRate,
  getMostActiveUsers,
  exportAnalytics
} from './handlers/analytics';
import { 
  uploadFile, 
  uploadMultipleFiles, 
  deleteFile, 
  validateFile 
} from './handlers/file_upload';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  auth: router({
    login: publicProcedure
      .input(loginInputSchema)
      .mutation(({ input }) => login(input)),
    
    getCurrentUser: publicProcedure
      .input(z.string())
      .query(({ input }) => getCurrentUser(input)),
    
    logout: publicProcedure
      .input(z.string())
      .mutation(({ input }) => logout(input)),
  }),

  // User management routes
  users: router({
    create: publicProcedure
      .input(createUserInputSchema)
      .mutation(({ input }) => createUser(input)),
    
    update: publicProcedure
      .input(updateUserInputSchema)
      .mutation(({ input }) => updateUser(input)),
    
    changePassword: publicProcedure
      .input(changePasswordInputSchema)
      .mutation(({ input }) => changePassword(input)),
    
    getAll: publicProcedure
      .input(userFiltersSchema)
      .query(({ input }) => getUsers(input)),
    
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getUserById(input)),
    
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteUser(input)),
    
    toggleStatus: publicProcedure
      .input(z.number())
      .mutation(({ input }) => toggleUserStatus(input)),
    
    resetPassword: publicProcedure
      .input(z.number())
      .mutation(({ input }) => resetUserPassword(input)),
  }),

  // Menu management routes
  menus: router({
    create: publicProcedure
      .input(createMenuInputSchema)
      .mutation(({ input }) => createMenu(input)),
    
    update: publicProcedure
      .input(updateMenuInputSchema)
      .mutation(({ input }) => updateMenu(input)),
    
    getAll: publicProcedure
      .query(() => getMenus()),
    
    getWithSubMenus: publicProcedure
      .input(z.number())
      .query(({ input }) => getMenuWithSubMenus(input)),
    
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteMenu(input)),
    
    // Sub-menu operations
    subMenus: router({
      create: publicProcedure
        .input(createSubMenuInputSchema)
        .mutation(({ input }) => createSubMenu(input)),
      
      update: publicProcedure
        .input(updateSubMenuInputSchema)
        .mutation(({ input }) => updateSubMenu(input)),
      
      getByMenuId: publicProcedure
        .input(z.number())
        .query(({ input }) => getSubMenusByMenuId(input)),
      
      delete: publicProcedure
        .input(z.number())
        .mutation(({ input }) => deleteSubMenu(input)),
    }),
  }),

  // Report management routes
  reports: router({
    create: publicProcedure
      .input(createReportInputSchema)
      .mutation(({ input }) => createReport(input)),
    
    update: publicProcedure
      .input(updateReportInputSchema)
      .mutation(({ input }) => updateReport(input)),
    
    getAll: publicProcedure
      .input(reportFiltersSchema)
      .query(({ input }) => getReports(input)),
    
    getUserReports: publicProcedure
      .input(z.object({
        userId: z.number(),
        filters: reportFiltersSchema.partial().optional()
      }))
      .query(({ input }) => getUserReports(input.userId, input.filters)),
    
    getById: publicProcedure
      .input(z.number())
      .query(({ input }) => getReportById(input)),
    
    delete: publicProcedure
      .input(z.number())
      .mutation(({ input }) => deleteReport(input)),
    
    assign: publicProcedure
      .input(z.object({
        reportId: z.number(),
        assignedTo: z.number()
      }))
      .mutation(({ input }) => assignReport(input.reportId, input.assignedTo)),
    
    bulkUpdateStatus: publicProcedure
      .input(bulkUpdateReportStatusSchema)
      .mutation(({ input }) => bulkUpdateReportStatus(input)),
    
    bulkAssign: publicProcedure
      .input(bulkAssignReportsSchema)
      .mutation(({ input }) => bulkAssignReports(input)),
    
    getRecent: publicProcedure
      .input(z.number().optional())
      .query(({ input }) => getRecentReports(input)),
  }),

  // Report comments routes
  reportComments: router({
    create: publicProcedure
      .input(createReportCommentInputSchema)
      .mutation(({ input }) => createReportComment(input)),
    
    getByReportId: publicProcedure
      .input(z.object({
        reportId: z.number(),
        userRole: z.string().optional()
      }))
      .query(({ input }) => getReportComments(input.reportId, input.userRole)),
    
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        comment: z.string(),
        userId: z.number(),
        userRole: z.string()
      }))
      .mutation(({ input }) => updateReportComment(input.id, input.comment, input.userId, input.userRole)),
    
    delete: publicProcedure
      .input(z.object({
        id: z.number(),
        userId: z.number(),
        userRole: z.string()
      }))
      .mutation(({ input }) => deleteReportComment(input.id, input.userId, input.userRole)),
  }),

  // Analytics routes
  analytics: router({
    getDashboardStats: publicProcedure
      .query(() => getDashboardStats()),
    
    getReportsOvertime: publicProcedure
      .input(analyticsDateRangeSchema)
      .query(({ input }) => getReportsOvertime(input)),
    
    getStatusDistribution: publicProcedure
      .input(analyticsDateRangeSchema.optional())
      .query(({ input }) => getStatusDistribution(input)),
    
    getTopMenusWithBugs: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        dateRange: analyticsDateRangeSchema.optional()
      }))
      .query(({ input }) => getTopMenusWithBugs(input.limit, input.dateRange)),
    
    getAverageResolutionTime: publicProcedure
      .input(analyticsDateRangeSchema.optional())
      .query(({ input }) => getAverageResolutionTime(input)),
    
    getResolutionRate: publicProcedure
      .input(analyticsDateRangeSchema.optional())
      .query(({ input }) => getResolutionRate(input)),
    
    getMostActiveUsers: publicProcedure
      .input(z.object({
        limit: z.number().optional(),
        dateRange: analyticsDateRangeSchema.optional()
      }))
      .query(({ input }) => getMostActiveUsers(input.limit, input.dateRange)),
    
    exportData: publicProcedure
      .input(z.object({
        format: z.enum(['pdf', 'excel', 'csv']),
        dateRange: analyticsDateRangeSchema,
        options: z.object({
          include_summary: z.boolean().optional(),
          include_detailed: z.boolean().optional(),
          include_charts: z.boolean().optional()
        })
      }))
      .mutation(({ input }) => exportAnalytics(input.format, input.dateRange, input.options)),
  }),

  // File upload routes
  files: router({
    uploadSingle: publicProcedure
      .input(z.object({
        file: z.object({
          filename: z.string(),
          mimetype: z.string(),
          size: z.number(),
          buffer: z.any() // In real implementation, this would be properly typed
        }),
        options: z.object({
          maxSize: z.number().optional(),
          allowedTypes: z.array(z.string()).optional(),
          folder: z.string().optional()
        }).optional()
      }))
      .mutation(({ input }) => uploadFile(input.file as any, input.options)),
    
    uploadMultiple: publicProcedure
      .input(z.object({
        files: z.array(z.object({
          filename: z.string(),
          mimetype: z.string(),
          size: z.number(),
          buffer: z.any()
        })),
        options: z.object({
          maxFiles: z.number().optional(),
          maxSize: z.number().optional(),
          allowedTypes: z.array(z.string()).optional(),
          folder: z.string().optional()
        }).optional()
      }))
      .mutation(({ input }) => uploadMultipleFiles(input.files as any, input.options)),
    
    delete: publicProcedure
      .input(z.string())
      .mutation(({ input }) => deleteFile(input)),
    
    validate: publicProcedure
      .input(z.object({
        file: z.object({
          filename: z.string(),
          mimetype: z.string(),
          size: z.number()
        }),
        options: z.object({
          maxSize: z.number(),
          allowedTypes: z.array(z.string())
        })
      }))
      .query(({ input }) => validateFile(input.file, input.options)),
  }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Bug Reporter TRPC server listening at port: ${port}`);
  console.log(`Available routes: auth, users, menus, reports, reportComments, analytics, files`);
}

start();