import { 
    type DashboardStats,
    type AnalyticsDateRange
} from '../schema';
import { db } from '../db';
import { 
    usersTable, 
    reportsTable, 
    menusTable,
    subMenusTable 
} from '../db/schema';
import { 
    count, 
    sql,
    eq,
    and,
    gte,
    lte,
    desc,
    isNotNull,
    avg,
    type SQL
} from 'drizzle-orm';

/**
 * Generates dashboard statistics for admin overview
 * This handler will calculate total reports, status distribution, user activity, and trends
 */
export async function getDashboardStats(): Promise<DashboardStats> {
    try {
        const now = new Date();
        const lastMonth = new Date(now);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        // Get current period stats
        const [currentStats] = await db
            .select({
                total_reports: count(reportsTable.id).as('total_reports'),
                pending_reports: count(sql`CASE WHEN ${reportsTable.status} = 'pending' THEN 1 END`).as('pending_reports'),
                resolved_reports: count(sql`CASE WHEN ${reportsTable.status} = 'resolved' THEN 1 END`).as('resolved_reports'),
                active_users: count(sql`DISTINCT ${reportsTable.user_id}`).as('active_users')
            })
            .from(reportsTable)
            .execute();

        // Get previous period stats for comparison
        const [previousStats] = await db
            .select({
                total_reports: count(reportsTable.id).as('total_reports'),
                pending_reports: count(sql`CASE WHEN ${reportsTable.status} = 'pending' THEN 1 END`).as('pending_reports'),
                resolved_reports: count(sql`CASE WHEN ${reportsTable.status} = 'resolved' THEN 1 END`).as('resolved_reports'),
                active_users: count(sql`DISTINCT ${reportsTable.user_id}`).as('active_users')
            })
            .from(reportsTable)
            .where(lte(reportsTable.created_at, lastMonth))
            .execute();

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            total_reports: currentStats.total_reports,
            pending_reports: currentStats.pending_reports,
            resolved_reports: currentStats.resolved_reports,
            active_users: currentStats.active_users,
            reports_change: calculateChange(currentStats.total_reports, previousStats.total_reports),
            pending_change: calculateChange(currentStats.pending_reports, previousStats.pending_reports),
            resolved_change: calculateChange(currentStats.resolved_reports, previousStats.resolved_reports),
            users_change: calculateChange(currentStats.active_users, previousStats.active_users)
        };
    } catch (error) {
        console.error('Dashboard stats generation failed:', error);
        throw error;
    }
}

/**
 * Generates reports trend data over time
 * This handler will create time-series data for report creation trends
 */
export async function getReportsOvertime(dateRange: AnalyticsDateRange): Promise<{
    labels: string[];
    data: number[];
}> {
    try {
        const startDate = new Date(dateRange.start_date);
        const endDate = new Date(dateRange.end_date);
        
        // Calculate the number of days between dates
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine grouping based on date range
        let groupFormat: string;
        let labelFormat: (date: Date) => string;
        
        if (daysDiff <= 7) {
            // Daily for week or less
            groupFormat = 'YYYY-MM-DD';
            labelFormat = (date: Date) => date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
        } else if (daysDiff <= 31) {
            // Daily for month or less
            groupFormat = 'YYYY-MM-DD';
            labelFormat = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        } else if (daysDiff <= 90) {
            // Weekly for quarter or less
            groupFormat = 'YYYY-"W"WW';
            labelFormat = (date: Date) => `Week ${Math.ceil(date.getDate() / 7)}, ${date.toLocaleDateString('id-ID', { month: 'short' })}`;
        } else {
            // Monthly for longer periods
            groupFormat = 'YYYY-MM';
            labelFormat = (date: Date) => date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        }

        const results = await db
            .select({
                date: sql<string>`DATE_TRUNC('day', ${reportsTable.created_at})::date`.as('date'),
                count: count(reportsTable.id).as('count')
            })
            .from(reportsTable)
            .where(and(
                gte(reportsTable.created_at, startDate),
                lte(reportsTable.created_at, endDate)
            ))
            .groupBy(sql`DATE_TRUNC('day', ${reportsTable.created_at})`)
            .orderBy(sql`DATE_TRUNC('day', ${reportsTable.created_at})`)
            .execute();

        // Fill in missing dates with zero counts
        const labels: string[] = [];
        const data: number[] = [];
        const resultMap = new Map(results.map(r => [r.date, r.count]));

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            labels.push(labelFormat(new Date(date)));
            data.push(resultMap.get(dateStr) || 0);
        }

        return { labels, data };
    } catch (error) {
        console.error('Reports overtime generation failed:', error);
        throw error;
    }
}

/**
 * Generates status distribution for reports
 * This handler will calculate percentage distribution of report statuses
 */
export async function getStatusDistribution(dateRange?: AnalyticsDateRange): Promise<{
    labels: string[];
    data: number[];
    colors: string[];
}> {
    try {
        let results;
        
        if (dateRange) {
            results = await db
                .select({
                    status: reportsTable.status,
                    count: count(reportsTable.id).as('count')
                })
                .from(reportsTable)
                .where(and(
                    gte(reportsTable.created_at, dateRange.start_date),
                    lte(reportsTable.created_at, dateRange.end_date)
                ))
                .groupBy(reportsTable.status)
                .orderBy(desc(count(reportsTable.id)))
                .execute();
        } else {
            results = await db
                .select({
                    status: reportsTable.status,
                    count: count(reportsTable.id).as('count')
                })
                .from(reportsTable)
                .groupBy(reportsTable.status)
                .orderBy(desc(count(reportsTable.id)))
                .execute();
        }

        const statusColors = {
            pending: '#f59e0b',
            progress: '#3b82f6', 
            resolved: '#10b981',
            closed: '#6b7280'
        };

        const statusLabels = {
            pending: 'Pending',
            progress: 'In Progress',
            resolved: 'Resolved',
            closed: 'Closed'
        };

        return {
            labels: results.map(r => statusLabels[r.status as keyof typeof statusLabels] || r.status),
            data: results.map(r => r.count),
            colors: results.map(r => statusColors[r.status as keyof typeof statusColors] || '#6b7280')
        };
    } catch (error) {
        console.error('Status distribution generation failed:', error);
        throw error;
    }
}

/**
 * Gets top menus with most bug reports
 * This handler will rank menus by number of reports for identifying problem areas
 */
export async function getTopMenusWithBugs(limit: number = 10, dateRange?: AnalyticsDateRange): Promise<{
    labels: string[];
    data: number[];
}> {
    try {
        let results;

        if (dateRange) {
            results = await db
                .select({
                    menu_name: menusTable.name,
                    report_count: count(reportsTable.id).as('report_count')
                })
                .from(reportsTable)
                .innerJoin(menusTable, eq(reportsTable.menu_id, menusTable.id))
                .where(and(
                    gte(reportsTable.created_at, dateRange.start_date),
                    lte(reportsTable.created_at, dateRange.end_date)
                ))
                .groupBy(menusTable.id, menusTable.name)
                .orderBy(desc(count(reportsTable.id)))
                .limit(limit)
                .execute();
        } else {
            results = await db
                .select({
                    menu_name: menusTable.name,
                    report_count: count(reportsTable.id).as('report_count')
                })
                .from(reportsTable)
                .innerJoin(menusTable, eq(reportsTable.menu_id, menusTable.id))
                .groupBy(menusTable.id, menusTable.name)
                .orderBy(desc(count(reportsTable.id)))
                .limit(limit)
                .execute();
        }

        return {
            labels: results.map(r => r.menu_name),
            data: results.map(r => r.report_count)
        };
    } catch (error) {
        console.error('Top menus with bugs generation failed:', error);
        throw error;
    }
}

/**
 * Calculates average resolution time for reports
 * This handler will compute average time between report creation and resolution
 */
export async function getAverageResolutionTime(dateRange?: AnalyticsDateRange): Promise<{
    average_hours: number;
    total_resolved: number;
}> {
    try {
        let result;

        if (dateRange) {
            [result] = await db
                .select({
                    avg_resolution_hours: avg(sql`EXTRACT(EPOCH FROM (${reportsTable.resolved_at} - ${reportsTable.created_at})) / 3600`).as('avg_resolution_hours'),
                    total_resolved: count(reportsTable.id).as('total_resolved')
                })
                .from(reportsTable)
                .where(and(
                    isNotNull(reportsTable.resolved_at),
                    gte(reportsTable.created_at, dateRange.start_date),
                    lte(reportsTable.created_at, dateRange.end_date)
                ))
                .execute();
        } else {
            [result] = await db
                .select({
                    avg_resolution_hours: avg(sql`EXTRACT(EPOCH FROM (${reportsTable.resolved_at} - ${reportsTable.created_at})) / 3600`).as('avg_resolution_hours'),
                    total_resolved: count(reportsTable.id).as('total_resolved')
                })
                .from(reportsTable)
                .where(isNotNull(reportsTable.resolved_at))
                .execute();
        }

        return {
            average_hours: result.avg_resolution_hours ? Math.round(parseFloat(result.avg_resolution_hours.toString()) * 100) / 100 : 0,
            total_resolved: result.total_resolved
        };
    } catch (error) {
        console.error('Average resolution time calculation failed:', error);
        throw error;
    }
}

/**
 * Gets resolution rate percentage
 * This handler will calculate what percentage of reports get resolved
 */
export async function getResolutionRate(dateRange?: AnalyticsDateRange): Promise<{
    rate: number;
    total_reports: number;
    resolved_reports: number;
}> {
    try {
        let result;

        if (dateRange) {
            [result] = await db
                .select({
                    total_reports: count(reportsTable.id).as('total_reports'),
                    resolved_reports: count(sql`CASE WHEN ${reportsTable.status} = 'resolved' THEN 1 END`).as('resolved_reports')
                })
                .from(reportsTable)
                .where(and(
                    gte(reportsTable.created_at, dateRange.start_date),
                    lte(reportsTable.created_at, dateRange.end_date)
                ))
                .execute();
        } else {
            [result] = await db
                .select({
                    total_reports: count(reportsTable.id).as('total_reports'),
                    resolved_reports: count(sql`CASE WHEN ${reportsTable.status} = 'resolved' THEN 1 END`).as('resolved_reports')
                })
                .from(reportsTable)
                .execute();
        }

        const rate = result.total_reports > 0 
            ? Math.round((result.resolved_reports / result.total_reports) * 100 * 100) / 100 
            : 0;

        return {
            rate,
            total_reports: result.total_reports,
            resolved_reports: result.resolved_reports
        };
    } catch (error) {
        console.error('Resolution rate calculation failed:', error);
        throw error;
    }
}

/**
 * Gets most active users (report creators)
 * This handler will rank users by number of reports created
 */
export async function getMostActiveUsers(limit: number = 10, dateRange?: AnalyticsDateRange): Promise<{
    users: Array<{
        id: number;
        username: string;
        full_name: string;
        report_count: number;
    }>;
}> {
    try {
        let results;

        if (dateRange) {
            results = await db
                .select({
                    id: usersTable.id,
                    username: usersTable.username,
                    full_name: usersTable.full_name,
                    report_count: count(reportsTable.id).as('report_count')
                })
                .from(reportsTable)
                .innerJoin(usersTable, eq(reportsTable.user_id, usersTable.id))
                .where(and(
                    gte(reportsTable.created_at, dateRange.start_date),
                    lte(reportsTable.created_at, dateRange.end_date)
                ))
                .groupBy(usersTable.id, usersTable.username, usersTable.full_name)
                .orderBy(desc(count(reportsTable.id)))
                .limit(limit)
                .execute();
        } else {
            results = await db
                .select({
                    id: usersTable.id,
                    username: usersTable.username,
                    full_name: usersTable.full_name,
                    report_count: count(reportsTable.id).as('report_count')
                })
                .from(reportsTable)
                .innerJoin(usersTable, eq(reportsTable.user_id, usersTable.id))
                .groupBy(usersTable.id, usersTable.username, usersTable.full_name)
                .orderBy(desc(count(reportsTable.id)))
                .limit(limit)
                .execute();
        }

        return {
            users: results
        };
    } catch (error) {
        console.error('Most active users generation failed:', error);
        throw error;
    }
}

/**
 * Exports analytics data to various formats
 * This handler will generate downloadable reports in PDF/Excel format
 */
export async function exportAnalytics(
    format: 'pdf' | 'excel' | 'csv',
    dateRange: AnalyticsDateRange,
    options: {
        include_summary?: boolean;
        include_detailed?: boolean;
        include_charts?: boolean;
    }
): Promise<{
    filename: string;
    url: string;
    size: number;
}> {
    try {
        // In a real implementation, this would generate actual files
        // For now, we'll simulate the export process
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `analytics-report-${timestamp}.${format}`;
        
        // Simulate file generation based on options
        let estimatedSize = 50000; // Base size
        
        if (options.include_summary) {
            estimatedSize += 25000;
        }
        
        if (options.include_detailed) {
            estimatedSize += 100000;
        }
        
        if (options.include_charts) {
            estimatedSize += 75000;
        }

        // In real implementation, you would:
        // 1. Fetch all required analytics data
        // 2. Generate the file using libraries like:
        //    - PDF: puppeteer, jsPDF, or pdfkit
        //    - Excel: exceljs or xlsx
        //    - CSV: built-in string manipulation
        // 3. Store the file in cloud storage or local filesystem
        // 4. Return the actual download URL

        return {
            filename,
            url: `/downloads/${filename}`,
            size: estimatedSize
        };
    } catch (error) {
        console.error('Analytics export failed:', error);
        throw error;
    }
}