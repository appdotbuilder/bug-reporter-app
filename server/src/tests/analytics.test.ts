import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
    usersTable, 
    reportsTable, 
    menusTable,
    subMenusTable 
} from '../db/schema';
import {
    getDashboardStats,
    getReportsOvertime,
    getStatusDistribution,
    getTopMenusWithBugs,
    getAverageResolutionTime,
    getResolutionRate,
    getMostActiveUsers,
    exportAnalytics
} from '../handlers/analytics';
import type { AnalyticsDateRange } from '../schema';

describe('Analytics handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    // Helper function to create test data
    const createTestData = async () => {
        // Create test users
        const users = await db.insert(usersTable).values([
            {
                username: 'user1',
                full_name: 'User One',
                email: 'user1@test.com',
                password_hash: 'hash1',
                role: 'user',
                is_active: true
            },
            {
                username: 'user2', 
                full_name: 'User Two',
                email: 'user2@test.com',
                password_hash: 'hash2',
                role: 'user',
                is_active: true
            },
            {
                username: 'admin1',
                full_name: 'Admin One',
                email: 'admin1@test.com',
                password_hash: 'hash3',
                role: 'admin',
                is_active: true
            }
        ]).returning().execute();

        // Create test menus
        const menus = await db.insert(menusTable).values([
            {
                name: 'Dashboard',
                description: 'Main dashboard',
                is_active: true
            },
            {
                name: 'Reports',
                description: 'Reports section',
                is_active: true
            },
            {
                name: 'Settings',
                description: 'Settings section',
                is_active: true
            }
        ]).returning().execute();

        // Create test sub menus
        const subMenus = await db.insert(subMenusTable).values([
            {
                menu_id: menus[0].id,
                name: 'Overview',
                description: 'Dashboard overview',
                is_active: true
            },
            {
                menu_id: menus[1].id,
                name: 'Bug Reports',
                description: 'Bug reporting',
                is_active: true
            },
            {
                menu_id: menus[2].id,
                name: 'User Settings',
                description: 'User preferences',
                is_active: true
            }
        ]).returning().execute();

        // Create test reports with different statuses and dates
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const reports = await db.insert(reportsTable).values([
            {
                user_id: users[0].id,
                menu_id: menus[0].id,
                sub_menu_id: subMenus[0].id,
                name: 'Dashboard loading issue',
                description: 'Dashboard takes too long to load',
                status: 'pending',
                priority: 'high',
                screenshots: ['screenshot1.png'],
                created_at: now
            },
            {
                user_id: users[0].id,
                menu_id: menus[0].id,
                sub_menu_id: subMenus[0].id,
                name: 'Chart display bug',
                description: 'Charts not displaying correctly',
                status: 'progress',
                priority: 'medium',
                screenshots: [],
                created_at: yesterday
            },
            {
                user_id: users[1].id,
                menu_id: menus[1].id,
                sub_menu_id: subMenus[1].id,
                name: 'Report submission error',
                description: 'Cannot submit bug reports',
                status: 'resolved',
                priority: 'critical',
                screenshots: ['screenshot2.png'],
                created_at: weekAgo,
                resolved_at: yesterday
            },
            {
                user_id: users[1].id,
                menu_id: menus[1].id,
                sub_menu_id: subMenus[1].id,
                name: 'Export functionality',
                description: 'Export to PDF not working',
                status: 'closed',
                priority: 'low',
                screenshots: [],
                created_at: weekAgo,
                resolved_at: now
            },
            {
                user_id: users[1].id,
                menu_id: menus[2].id,
                sub_menu_id: subMenus[2].id,
                name: 'Settings save issue',
                description: 'User settings not saving',
                status: 'resolved',
                priority: 'medium',
                screenshots: ['screenshot3.png'],
                created_at: weekAgo,
                resolved_at: yesterday
            }
        ]).returning().execute();

        return { users, menus, subMenus, reports };
    };

    describe('getDashboardStats', () => {
        it('should return comprehensive dashboard statistics', async () => {
            await createTestData();
            
            const stats = await getDashboardStats();

            expect(stats.total_reports).toBe(5);
            expect(stats.pending_reports).toBe(1);
            expect(stats.resolved_reports).toBe(2);
            expect(stats.active_users).toBe(2); // Two distinct users created reports
            expect(typeof stats.reports_change).toBe('number');
            expect(typeof stats.pending_change).toBe('number');
            expect(typeof stats.resolved_change).toBe('number');
            expect(typeof stats.users_change).toBe('number');
        });

        it('should handle empty database', async () => {
            const stats = await getDashboardStats();

            expect(stats.total_reports).toBe(0);
            expect(stats.pending_reports).toBe(0);
            expect(stats.resolved_reports).toBe(0);
            expect(stats.active_users).toBe(0);
            expect(stats.reports_change).toBe(0);
            expect(stats.pending_change).toBe(0);
            expect(stats.resolved_change).toBe(0);
            expect(stats.users_change).toBe(0);
        });
    });

    describe('getReportsOvertime', () => {
        it('should return reports trend data for date range', async () => {
            await createTestData();

            const dateRange: AnalyticsDateRange = {
                start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                end_date: new Date()
            };

            const trend = await getReportsOvertime(dateRange);

            expect(Array.isArray(trend.labels)).toBe(true);
            expect(Array.isArray(trend.data)).toBe(true);
            expect(trend.labels.length).toBe(trend.data.length);
            expect(trend.labels.length).toBeGreaterThan(0);

            // Sum should match total reports in range
            const totalReports = trend.data.reduce((sum, count) => sum + count, 0);
            expect(totalReports).toBeGreaterThan(0);
        });

        it('should handle date range with no reports', async () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 1);
            
            const dateRange: AnalyticsDateRange = {
                start_date: futureDate,
                end_date: new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000)
            };

            const trend = await getReportsOvertime(dateRange);

            expect(trend.labels.length).toBeGreaterThan(0);
            expect(trend.data.every(count => count === 0)).toBe(true);
        });
    });

    describe('getStatusDistribution', () => {
        it('should return status distribution data', async () => {
            await createTestData();

            const distribution = await getStatusDistribution();

            expect(Array.isArray(distribution.labels)).toBe(true);
            expect(Array.isArray(distribution.data)).toBe(true);
            expect(Array.isArray(distribution.colors)).toBe(true);
            expect(distribution.labels.length).toBe(distribution.data.length);
            expect(distribution.data.length).toBe(distribution.colors.length);

            // Should have data for different statuses
            expect(distribution.data.some(count => count > 0)).toBe(true);

            // Colors should be valid hex codes
            distribution.colors.forEach(color => {
                expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
            });
        });

        it('should filter by date range', async () => {
            await createTestData();

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            const dateRange: AnalyticsDateRange = {
                start_date: yesterday,
                end_date: new Date()
            };

            const distribution = await getStatusDistribution(dateRange);

            expect(distribution.labels.length).toBeGreaterThan(0);
            expect(distribution.data.some(count => count > 0)).toBe(true);
        });
    });

    describe('getTopMenusWithBugs', () => {
        it('should return top menus with most reports', async () => {
            await createTestData();

            const topMenus = await getTopMenusWithBugs(5);

            expect(Array.isArray(topMenus.labels)).toBe(true);
            expect(Array.isArray(topMenus.data)).toBe(true);
            expect(topMenus.labels.length).toBe(topMenus.data.length);
            expect(topMenus.labels.length).toBeGreaterThan(0);
            expect(topMenus.labels.length).toBeLessThanOrEqual(5);

            // Data should be sorted in descending order
            for (let i = 1; i < topMenus.data.length; i++) {
                expect(topMenus.data[i]).toBeLessThanOrEqual(topMenus.data[i - 1]);
            }

            // All counts should be positive
            topMenus.data.forEach(count => {
                expect(count).toBeGreaterThan(0);
            });
        });

        it('should respect the limit parameter', async () => {
            await createTestData();

            const topMenus = await getTopMenusWithBugs(2);

            expect(topMenus.labels.length).toBeLessThanOrEqual(2);
            expect(topMenus.data.length).toBeLessThanOrEqual(2);
        });
    });

    describe('getAverageResolutionTime', () => {
        it('should calculate average resolution time correctly', async () => {
            await createTestData();

            const avgTime = await getAverageResolutionTime();

            expect(typeof avgTime.average_hours).toBe('number');
            expect(typeof avgTime.total_resolved).toBe('number');
            expect(avgTime.average_hours).toBeGreaterThan(0);
            expect(avgTime.total_resolved).toBeGreaterThan(0);
        });

        it('should handle no resolved reports', async () => {
            // Create test data with no resolved reports
            await createTestData();
            
            // Update all reports to pending status
            await db.update(reportsTable)
                .set({ status: 'pending', resolved_at: null })
                .execute();

            const avgTime = await getAverageResolutionTime();

            expect(avgTime.average_hours).toBe(0);
            expect(avgTime.total_resolved).toBe(0);
        });

        it('should filter by date range', async () => {
            await createTestData();

            const dateRange: AnalyticsDateRange = {
                start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                end_date: new Date()
            };

            const avgTime = await getAverageResolutionTime(dateRange);

            expect(typeof avgTime.average_hours).toBe('number');
            expect(typeof avgTime.total_resolved).toBe('number');
        });
    });

    describe('getResolutionRate', () => {
        it('should calculate resolution rate correctly', async () => {
            await createTestData();

            const rate = await getResolutionRate();

            expect(typeof rate.rate).toBe('number');
            expect(typeof rate.total_reports).toBe('number');
            expect(typeof rate.resolved_reports).toBe('number');
            expect(rate.rate).toBeGreaterThanOrEqual(0);
            expect(rate.rate).toBeLessThanOrEqual(100);
            expect(rate.total_reports).toBe(5);
            expect(rate.resolved_reports).toBe(2);
            expect(rate.rate).toBe(40); // 2/5 * 100 = 40%
        });

        it('should handle no reports', async () => {
            const rate = await getResolutionRate();

            expect(rate.rate).toBe(0);
            expect(rate.total_reports).toBe(0);
            expect(rate.resolved_reports).toBe(0);
        });
    });

    describe('getMostActiveUsers', () => {
        it('should return most active users', async () => {
            await createTestData();

            const activeUsers = await getMostActiveUsers(10);

            expect(Array.isArray(activeUsers.users)).toBe(true);
            expect(activeUsers.users.length).toBeGreaterThan(0);

            // Check structure of user objects
            activeUsers.users.forEach(user => {
                expect(typeof user.id).toBe('number');
                expect(typeof user.username).toBe('string');
                expect(typeof user.full_name).toBe('string');
                expect(typeof user.report_count).toBe('number');
                expect(user.report_count).toBeGreaterThan(0);
            });

            // Should be sorted by report count descending
            for (let i = 1; i < activeUsers.users.length; i++) {
                expect(activeUsers.users[i].report_count)
                    .toBeLessThanOrEqual(activeUsers.users[i - 1].report_count);
            }
        });

        it('should respect the limit parameter', async () => {
            await createTestData();

            const activeUsers = await getMostActiveUsers(1);

            expect(activeUsers.users.length).toBeLessThanOrEqual(1);
        });
    });

    describe('exportAnalytics', () => {
        it('should generate export metadata for PDF format', async () => {
            const dateRange: AnalyticsDateRange = {
                start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end_date: new Date()
            };

            const options = {
                include_summary: true,
                include_detailed: true,
                include_charts: false
            };

            const exportData = await exportAnalytics('pdf', dateRange, options);

            expect(typeof exportData.filename).toBe('string');
            expect(typeof exportData.url).toBe('string');
            expect(typeof exportData.size).toBe('number');
            expect(exportData.filename).toMatch(/\.pdf$/);
            expect(exportData.url).toContain(exportData.filename);
            expect(exportData.size).toBeGreaterThan(0);
        });

        it('should generate export metadata for Excel format', async () => {
            const dateRange: AnalyticsDateRange = {
                start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                end_date: new Date()
            };

            const options = {
                include_summary: false,
                include_detailed: true,
                include_charts: true
            };

            const exportData = await exportAnalytics('excel', dateRange, options);

            expect(exportData.filename).toMatch(/\.excel$/);
            expect(exportData.size).toBeGreaterThan(0);
        });

        it('should generate export metadata for CSV format', async () => {
            const dateRange: AnalyticsDateRange = {
                start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                end_date: new Date()
            };

            const options = {
                include_summary: true,
                include_detailed: false,
                include_charts: false
            };

            const exportData = await exportAnalytics('csv', dateRange, options);

            expect(exportData.filename).toMatch(/\.csv$/);
            expect(exportData.size).toBeGreaterThan(0);
        });

        it('should adjust file size based on options', async () => {
            const dateRange: AnalyticsDateRange = {
                start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end_date: new Date()
            };

            const minimalOptions = {
                include_summary: false,
                include_detailed: false,
                include_charts: false
            };

            const maximalOptions = {
                include_summary: true,
                include_detailed: true,
                include_charts: true
            };

            const minimalExport = await exportAnalytics('pdf', dateRange, minimalOptions);
            const maximalExport = await exportAnalytics('pdf', dateRange, maximalOptions);

            expect(maximalExport.size).toBeGreaterThan(minimalExport.size);
        });
    });
});