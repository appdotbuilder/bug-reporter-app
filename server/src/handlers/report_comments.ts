import { db } from '../db';
import { reportCommentsTable, reportsTable, usersTable } from '../db/schema';
import { 
    type ReportComment,
    type CreateReportCommentInput
} from '../schema';
import { eq, and } from 'drizzle-orm';

/**
 * Creates a new comment on a bug report
 * This handler will validate report exists, check permissions, and add comment
 */
export async function createReportComment(input: CreateReportCommentInput): Promise<ReportComment> {
    try {
        // Verify that the report exists
        const report = await db.select()
            .from(reportsTable)
            .where(eq(reportsTable.id, input.report_id))
            .limit(1)
            .execute();

        if (report.length === 0) {
            throw new Error('Report not found');
        }

        // Verify that the user exists
        const user = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, input.user_id))
            .limit(1)
            .execute();

        if (user.length === 0) {
            throw new Error('User not found');
        }

        // Insert the comment
        const result = await db.insert(reportCommentsTable)
            .values({
                report_id: input.report_id,
                user_id: input.user_id,
                comment: input.comment,
                is_internal: input.is_internal ?? false
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Create report comment failed:', error);
        throw error;
    }
}

/**
 * Retrieves all comments for a specific report
 * This handler will fetch comments with user information, filtering internal comments based on permissions
 */
export async function getReportComments(reportId: number, userRole?: string): Promise<(ReportComment & { 
    user: { 
        id: number; 
        username: string; 
        full_name: string; 
        avatar_url: string | null;
        role: string;
    } 
})[]> {
    try {
        // Build conditions array
        const conditions = [eq(reportCommentsTable.report_id, reportId)];

        // Filter internal comments for non-admin users
        if (userRole !== 'admin') {
            conditions.push(eq(reportCommentsTable.is_internal, false));
        }

        // Build complete query with where clause applied
        const results = await db.select({
            id: reportCommentsTable.id,
            report_id: reportCommentsTable.report_id,
            user_id: reportCommentsTable.user_id,
            comment: reportCommentsTable.comment,
            is_internal: reportCommentsTable.is_internal,
            created_at: reportCommentsTable.created_at,
            user: {
                id: usersTable.id,
                username: usersTable.username,
                full_name: usersTable.full_name,
                avatar_url: usersTable.avatar_url,
                role: usersTable.role
            }
        })
        .from(reportCommentsTable)
        .innerJoin(usersTable, eq(reportCommentsTable.user_id, usersTable.id))
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .execute();

        return results.map(result => ({
            id: result.id,
            report_id: result.report_id,
            user_id: result.user_id,
            comment: result.comment,
            is_internal: result.is_internal,
            created_at: result.created_at,
            user: result.user
        }));
    } catch (error) {
        console.error('Get report comments failed:', error);
        throw error;
    }
}

/**
 * Updates an existing comment (only by original author or admin)
 * This handler will validate permissions and update comment text
 */
export async function updateReportComment(id: number, comment: string, userId: number, userRole: string): Promise<ReportComment> {
    try {
        // Get the existing comment to check ownership
        const existingComment = await db.select()
            .from(reportCommentsTable)
            .where(eq(reportCommentsTable.id, id))
            .limit(1)
            .execute();

        if (existingComment.length === 0) {
            throw new Error('Comment not found');
        }

        const commentData = existingComment[0];

        // Check permissions: only the original author or admin can update
        if (commentData.user_id !== userId && userRole !== 'admin') {
            throw new Error('Insufficient permissions to update comment');
        }

        // Update the comment
        const result = await db.update(reportCommentsTable)
            .set({ comment })
            .where(eq(reportCommentsTable.id, id))
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Update report comment failed:', error);
        throw error;
    }
}

/**
 * Deletes a comment (only by original author or admin)
 * This handler will validate permissions and remove comment
 */
export async function deleteReportComment(id: number, userId: number, userRole: string): Promise<{ success: boolean }> {
    try {
        // Get the existing comment to check ownership
        const existingComment = await db.select()
            .from(reportCommentsTable)
            .where(eq(reportCommentsTable.id, id))
            .limit(1)
            .execute();

        if (existingComment.length === 0) {
            throw new Error('Comment not found');
        }

        const commentData = existingComment[0];

        // Check permissions: only the original author or admin can delete
        if (commentData.user_id !== userId && userRole !== 'admin') {
            throw new Error('Insufficient permissions to delete comment');
        }

        // Delete the comment
        await db.delete(reportCommentsTable)
            .where(eq(reportCommentsTable.id, id))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('Delete report comment failed:', error);
        throw error;
    }
}