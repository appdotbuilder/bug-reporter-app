import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, menusTable, subMenusTable, reportsTable, reportCommentsTable } from '../db/schema';
import { type CreateReportCommentInput } from '../schema';
import { 
    createReportComment, 
    getReportComments, 
    updateReportComment, 
    deleteReportComment 
} from '../handlers/report_comments';
import { eq } from 'drizzle-orm';

describe('Report Comments Handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    let testUserId: number;
    let testAdminId: number;
    let testReportId: number;
    let testMenuId: number;
    let testSubMenuId: number;

    beforeEach(async () => {
        // Create test user
        const user = await db.insert(usersTable)
            .values({
                username: 'testuser',
                full_name: 'Test User',
                email: 'test@example.com',
                password_hash: 'hashedpassword',
                role: 'user'
            })
            .returning()
            .execute();
        testUserId = user[0].id;

        // Create test admin
        const admin = await db.insert(usersTable)
            .values({
                username: 'admin',
                full_name: 'Admin User',
                email: 'admin@example.com',
                password_hash: 'hashedpassword',
                role: 'admin'
            })
            .returning()
            .execute();
        testAdminId = admin[0].id;

        // Create test menu
        const menu = await db.insert(menusTable)
            .values({
                name: 'Test Menu',
                description: 'Test menu description'
            })
            .returning()
            .execute();
        testMenuId = menu[0].id;

        // Create test submenu
        const subMenu = await db.insert(subMenusTable)
            .values({
                menu_id: testMenuId,
                name: 'Test SubMenu',
                description: 'Test submenu description'
            })
            .returning()
            .execute();
        testSubMenuId = subMenu[0].id;

        // Create test report
        const report = await db.insert(reportsTable)
            .values({
                user_id: testUserId,
                menu_id: testMenuId,
                sub_menu_id: testSubMenuId,
                name: 'Test Report',
                description: 'Test report description'
            })
            .returning()
            .execute();
        testReportId = report[0].id;
    });

    describe('createReportComment', () => {
        const testInput: CreateReportCommentInput = {
            report_id: 0, // Will be set in tests
            user_id: 0, // Will be set in tests
            comment: 'This is a test comment',
            is_internal: false
        };

        it('should create a comment successfully', async () => {
            const input = {
                ...testInput,
                report_id: testReportId,
                user_id: testUserId
            };

            const result = await createReportComment(input);

            expect(result.id).toBeDefined();
            expect(result.report_id).toEqual(testReportId);
            expect(result.user_id).toEqual(testUserId);
            expect(result.comment).toEqual('This is a test comment');
            expect(result.is_internal).toEqual(false);
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should create an internal comment when specified', async () => {
            const input = {
                ...testInput,
                report_id: testReportId,
                user_id: testAdminId,
                is_internal: true
            };

            const result = await createReportComment(input);

            expect(result.is_internal).toEqual(true);
        });

        it('should default is_internal to false when not specified', async () => {
            const input = {
                report_id: testReportId,
                user_id: testUserId,
                comment: 'Comment without is_internal'
            };

            const result = await createReportComment(input);

            expect(result.is_internal).toEqual(false);
        });

        it('should save comment to database', async () => {
            const input = {
                ...testInput,
                report_id: testReportId,
                user_id: testUserId
            };

            const result = await createReportComment(input);

            const comments = await db.select()
                .from(reportCommentsTable)
                .where(eq(reportCommentsTable.id, result.id))
                .execute();

            expect(comments).toHaveLength(1);
            expect(comments[0].comment).toEqual('This is a test comment');
            expect(comments[0].report_id).toEqual(testReportId);
            expect(comments[0].user_id).toEqual(testUserId);
        });

        it('should throw error when report does not exist', async () => {
            const input = {
                ...testInput,
                report_id: 99999,
                user_id: testUserId
            };

            await expect(createReportComment(input)).rejects.toThrow(/report not found/i);
        });

        it('should throw error when user does not exist', async () => {
            const input = {
                ...testInput,
                report_id: testReportId,
                user_id: 99999
            };

            await expect(createReportComment(input)).rejects.toThrow(/user not found/i);
        });
    });

    describe('getReportComments', () => {
        let testCommentId: number;
        let internalCommentId: number;

        beforeEach(async () => {
            // Create a regular comment
            const comment = await db.insert(reportCommentsTable)
                .values({
                    report_id: testReportId,
                    user_id: testUserId,
                    comment: 'Regular comment',
                    is_internal: false
                })
                .returning()
                .execute();
            testCommentId = comment[0].id;

            // Create an internal comment
            const internalComment = await db.insert(reportCommentsTable)
                .values({
                    report_id: testReportId,
                    user_id: testAdminId,
                    comment: 'Internal comment',
                    is_internal: true
                })
                .returning()
                .execute();
            internalCommentId = internalComment[0].id;
        });

        it('should return all comments with user details for admin', async () => {
            const result = await getReportComments(testReportId, 'admin');

            expect(result).toHaveLength(2);

            const regularComment = result.find(c => c.id === testCommentId);
            const internalComment = result.find(c => c.id === internalCommentId);

            expect(regularComment).toBeDefined();
            expect(regularComment!.comment).toEqual('Regular comment');
            expect(regularComment!.is_internal).toEqual(false);
            expect(regularComment!.user.username).toEqual('testuser');
            expect(regularComment!.user.full_name).toEqual('Test User');

            expect(internalComment).toBeDefined();
            expect(internalComment!.comment).toEqual('Internal comment');
            expect(internalComment!.is_internal).toEqual(true);
            expect(internalComment!.user.username).toEqual('admin');
        });

        it('should filter internal comments for regular users', async () => {
            const result = await getReportComments(testReportId, 'user');

            expect(result).toHaveLength(1);
            expect(result[0].id).toEqual(testCommentId);
            expect(result[0].comment).toEqual('Regular comment');
            expect(result[0].is_internal).toEqual(false);
        });

        it('should filter internal comments when no role specified', async () => {
            const result = await getReportComments(testReportId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toEqual(testCommentId);
            expect(result[0].is_internal).toEqual(false);
        });

        it('should return empty array for non-existent report', async () => {
            const result = await getReportComments(99999, 'admin');

            expect(result).toHaveLength(0);
        });

        it('should include complete user information', async () => {
            const result = await getReportComments(testReportId, 'admin');

            const comment = result[0];
            expect(comment.user.id).toEqual(testUserId);
            expect(comment.user.username).toEqual('testuser');
            expect(comment.user.full_name).toEqual('Test User');
            expect(comment.user.avatar_url).toBeNull();
            expect(comment.user.role).toEqual('user');
        });
    });

    describe('updateReportComment', () => {
        let testCommentId: number;

        beforeEach(async () => {
            const comment = await db.insert(reportCommentsTable)
                .values({
                    report_id: testReportId,
                    user_id: testUserId,
                    comment: 'Original comment',
                    is_internal: false
                })
                .returning()
                .execute();
            testCommentId = comment[0].id;
        });

        it('should allow comment author to update their comment', async () => {
            const result = await updateReportComment(testCommentId, 'Updated comment', testUserId, 'user');

            expect(result.id).toEqual(testCommentId);
            expect(result.comment).toEqual('Updated comment');
            expect(result.user_id).toEqual(testUserId);
        });

        it('should allow admin to update any comment', async () => {
            const result = await updateReportComment(testCommentId, 'Admin updated comment', testAdminId, 'admin');

            expect(result.comment).toEqual('Admin updated comment');
        });

        it('should save updated comment to database', async () => {
            await updateReportComment(testCommentId, 'Updated comment', testUserId, 'user');

            const comments = await db.select()
                .from(reportCommentsTable)
                .where(eq(reportCommentsTable.id, testCommentId))
                .execute();

            expect(comments[0].comment).toEqual('Updated comment');
        });

        it('should throw error when comment does not exist', async () => {
            await expect(updateReportComment(99999, 'New comment', testUserId, 'user'))
                .rejects.toThrow(/comment not found/i);
        });

        it('should throw error when user is not author and not admin', async () => {
            // Create another user
            const otherUser = await db.insert(usersTable)
                .values({
                    username: 'otheruser',
                    full_name: 'Other User',
                    email: 'other@example.com',
                    password_hash: 'hashedpassword',
                    role: 'user'
                })
                .returning()
                .execute();

            await expect(updateReportComment(testCommentId, 'Unauthorized update', otherUser[0].id, 'user'))
                .rejects.toThrow(/insufficient permissions/i);
        });
    });

    describe('deleteReportComment', () => {
        let testCommentId: number;

        beforeEach(async () => {
            const comment = await db.insert(reportCommentsTable)
                .values({
                    report_id: testReportId,
                    user_id: testUserId,
                    comment: 'Comment to delete',
                    is_internal: false
                })
                .returning()
                .execute();
            testCommentId = comment[0].id;
        });

        it('should allow comment author to delete their comment', async () => {
            const result = await deleteReportComment(testCommentId, testUserId, 'user');

            expect(result.success).toEqual(true);

            // Verify comment is deleted
            const comments = await db.select()
                .from(reportCommentsTable)
                .where(eq(reportCommentsTable.id, testCommentId))
                .execute();

            expect(comments).toHaveLength(0);
        });

        it('should allow admin to delete any comment', async () => {
            const result = await deleteReportComment(testCommentId, testAdminId, 'admin');

            expect(result.success).toEqual(true);

            // Verify comment is deleted
            const comments = await db.select()
                .from(reportCommentsTable)
                .where(eq(reportCommentsTable.id, testCommentId))
                .execute();

            expect(comments).toHaveLength(0);
        });

        it('should throw error when comment does not exist', async () => {
            await expect(deleteReportComment(99999, testUserId, 'user'))
                .rejects.toThrow(/comment not found/i);
        });

        it('should throw error when user is not author and not admin', async () => {
            // Create another user
            const otherUser = await db.insert(usersTable)
                .values({
                    username: 'otheruser',
                    full_name: 'Other User',
                    email: 'other@example.com',
                    password_hash: 'hashedpassword',
                    role: 'user'
                })
                .returning()
                .execute();

            await expect(deleteReportComment(testCommentId, otherUser[0].id, 'user'))
                .rejects.toThrow(/insufficient permissions/i);
        });

        it('should not affect other comments when deleting one', async () => {
            // Create another comment
            const otherComment = await db.insert(reportCommentsTable)
                .values({
                    report_id: testReportId,
                    user_id: testUserId,
                    comment: 'Other comment',
                    is_internal: false
                })
                .returning()
                .execute();

            await deleteReportComment(testCommentId, testUserId, 'user');

            // Verify other comment still exists
            const comments = await db.select()
                .from(reportCommentsTable)
                .where(eq(reportCommentsTable.id, otherComment[0].id))
                .execute();

            expect(comments).toHaveLength(1);
            expect(comments[0].comment).toEqual('Other comment');
        });
    });
});