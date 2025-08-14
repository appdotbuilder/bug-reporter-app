import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
    reportsTable, 
    usersTable, 
    menusTable, 
    subMenusTable 
} from '../db/schema';
import { type UpdateReportInput } from '../schema';
import { updateReport } from '../handlers/reports';
import { eq } from 'drizzle-orm';

describe('updateReport', () => {
    let testUserId: number;
    let testMenuId: number;
    let testSubMenuId: number;
    let testReportId: number;
    let testAssigneeId: number;

    beforeEach(async () => {
        await createDB();

        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'reporter',
                full_name: 'Test Reporter',
                email: 'reporter@test.com',
                password_hash: 'hashedpassword',
                role: 'user'
            })
            .returning()
            .execute();
        testUserId = userResult[0].id;

        // Create test assignee user
        const assigneeResult = await db.insert(usersTable)
            .values({
                username: 'assignee',
                full_name: 'Test Assignee',
                email: 'assignee@test.com',
                password_hash: 'hashedpassword',
                role: 'admin'
            })
            .returning()
            .execute();
        testAssigneeId = assigneeResult[0].id;

        // Create test menu
        const menuResult = await db.insert(menusTable)
            .values({
                name: 'Test Menu',
                description: 'Test menu description'
            })
            .returning()
            .execute();
        testMenuId = menuResult[0].id;

        // Create test sub menu
        const subMenuResult = await db.insert(subMenusTable)
            .values({
                menu_id: testMenuId,
                name: 'Test Sub Menu',
                description: 'Test sub menu description'
            })
            .returning()
            .execute();
        testSubMenuId = subMenuResult[0].id;

        // Create test report
        const reportResult = await db.insert(reportsTable)
            .values({
                user_id: testUserId,
                menu_id: testMenuId,
                sub_menu_id: testSubMenuId,
                name: 'Original Report',
                description: 'Original description',
                status: 'pending',
                priority: 'medium',
                screenshots: ['screenshot1.png']
            })
            .returning()
            .execute();
        testReportId = reportResult[0].id;
    });

    afterEach(resetDB);

    it('should update report name and description', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            name: 'Updated Report Name',
            description: 'Updated description'
        };

        const result = await updateReport(input);

        expect(result.id).toBe(testReportId);
        expect(result.name).toBe('Updated Report Name');
        expect(result.description).toBe('Updated description');
        expect(result.status).toBe('pending'); // Should remain unchanged
        expect(result.priority).toBe('medium'); // Should remain unchanged
    });

    it('should update report status and priority', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            status: 'progress',
            priority: 'high'
        };

        const result = await updateReport(input);

        expect(result.status).toBe('progress');
        expect(result.priority).toBe('high');
        expect(result.resolved_at).toBeNull();
    });

    it('should set resolved_at when status changes to resolved', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            status: 'resolved'
        };

        const result = await updateReport(input);

        expect(result.status).toBe('resolved');
        expect(result.resolved_at).toBeInstanceOf(Date);
        expect(result.resolved_at).not.toBeNull();
    });

    it('should clear resolved_at when moving away from resolved status', async () => {
        // First set to resolved
        await updateReport({
            id: testReportId,
            status: 'resolved'
        });

        // Then change to another status
        const result = await updateReport({
            id: testReportId,
            status: 'progress'
        });

        expect(result.status).toBe('progress');
        expect(result.resolved_at).toBeNull();
    });

    it('should update screenshots array', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            screenshots: ['new_screenshot1.png', 'new_screenshot2.png']
        };

        const result = await updateReport(input);

        expect(result.screenshots).toEqual(['new_screenshot1.png', 'new_screenshot2.png']);
    });

    it('should assign report to user', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            assigned_to: testAssigneeId
        };

        const result = await updateReport(input);

        expect(result.assigned_to).toBe(testAssigneeId);
    });

    it('should unassign report by setting assigned_to to null', async () => {
        // First assign
        await updateReport({
            id: testReportId,
            assigned_to: testAssigneeId
        });

        // Then unassign
        const result = await updateReport({
            id: testReportId,
            assigned_to: null
        });

        expect(result.assigned_to).toBeNull();
    });

    it('should update menu and sub_menu_id together', async () => {
        // Create another menu and sub menu
        const newMenuResult = await db.insert(menusTable)
            .values({
                name: 'New Menu',
                description: 'New menu description'
            })
            .returning()
            .execute();
        const newMenuId = newMenuResult[0].id;

        const newSubMenuResult = await db.insert(subMenusTable)
            .values({
                menu_id: newMenuId,
                name: 'New Sub Menu',
                description: 'New sub menu description'
            })
            .returning()
            .execute();
        const newSubMenuId = newSubMenuResult[0].id;

        const input: UpdateReportInput = {
            id: testReportId,
            menu_id: newMenuId,
            sub_menu_id: newSubMenuId
        };

        const result = await updateReport(input);

        expect(result.menu_id).toBe(newMenuId);
        expect(result.sub_menu_id).toBe(newSubMenuId);
    });

    it('should update updated_at timestamp', async () => {
        const originalReport = await db.select()
            .from(reportsTable)
            .where(eq(reportsTable.id, testReportId))
            .execute();
        const originalUpdatedAt = originalReport[0].updated_at;

        // Wait a bit to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 10));

        const result = await updateReport({
            id: testReportId,
            name: 'Updated Name'
        });

        expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('should persist changes to database', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            name: 'Database Updated Name',
            status: 'resolved',
            priority: 'critical'
        };

        await updateReport(input);

        // Verify changes were persisted
        const updatedReports = await db.select()
            .from(reportsTable)
            .where(eq(reportsTable.id, testReportId))
            .execute();

        expect(updatedReports).toHaveLength(1);
        expect(updatedReports[0].name).toBe('Database Updated Name');
        expect(updatedReports[0].status).toBe('resolved');
        expect(updatedReports[0].priority).toBe('critical');
        expect(updatedReports[0].resolved_at).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent report', async () => {
        const input: UpdateReportInput = {
            id: 99999,
            name: 'Updated Name'
        };

        expect(updateReport(input)).rejects.toThrow(/report not found/i);
    });

    it('should throw error for invalid menu_id', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            menu_id: 99999
        };

        expect(updateReport(input)).rejects.toThrow(/invalid menu selected/i);
    });

    it('should throw error for inactive menu', async () => {
        // Create inactive menu
        const inactiveMenuResult = await db.insert(menusTable)
            .values({
                name: 'Inactive Menu',
                is_active: false
            })
            .returning()
            .execute();

        const input: UpdateReportInput = {
            id: testReportId,
            menu_id: inactiveMenuResult[0].id
        };

        expect(updateReport(input)).rejects.toThrow(/invalid menu selected/i);
    });

    it('should throw error for invalid sub_menu_id', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            sub_menu_id: 99999
        };

        expect(updateReport(input)).rejects.toThrow(/invalid sub menu selected/i);
    });

    it('should throw error for inactive sub menu', async () => {
        // Create inactive sub menu
        const inactiveSubMenuResult = await db.insert(subMenusTable)
            .values({
                menu_id: testMenuId,
                name: 'Inactive Sub Menu',
                is_active: false
            })
            .returning()
            .execute();

        const input: UpdateReportInput = {
            id: testReportId,
            sub_menu_id: inactiveSubMenuResult[0].id
        };

        expect(updateReport(input)).rejects.toThrow(/invalid sub menu selected/i);
    });

    it('should throw error when sub menu does not belong to selected menu', async () => {
        // Create another menu and sub menu
        const otherMenuResult = await db.insert(menusTable)
            .values({
                name: 'Other Menu'
            })
            .returning()
            .execute();

        const otherSubMenuResult = await db.insert(subMenusTable)
            .values({
                menu_id: otherMenuResult[0].id,
                name: 'Other Sub Menu'
            })
            .returning()
            .execute();

        const input: UpdateReportInput = {
            id: testReportId,
            menu_id: testMenuId, // Original menu
            sub_menu_id: otherSubMenuResult[0].id // Sub menu from different menu
        };

        expect(updateReport(input)).rejects.toThrow(/sub menu does not belong to the selected menu/i);
    });

    it('should throw error for invalid assigned_to user', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            assigned_to: 99999
        };

        expect(updateReport(input)).rejects.toThrow(/invalid assigned user/i);
    });

    it('should throw error for inactive assigned user', async () => {
        // Create inactive user
        const inactiveUserResult = await db.insert(usersTable)
            .values({
                username: 'inactive',
                full_name: 'Inactive User',
                email: 'inactive@test.com',
                password_hash: 'hashedpassword',
                is_active: false
            })
            .returning()
            .execute();

        const input: UpdateReportInput = {
            id: testReportId,
            assigned_to: inactiveUserResult[0].id
        };

        expect(updateReport(input)).rejects.toThrow(/invalid assigned user/i);
    });

    it('should handle multiple field updates simultaneously', async () => {
        const input: UpdateReportInput = {
            id: testReportId,
            name: 'Multi Updated Report',
            description: 'Multi updated description',
            status: 'resolved',
            priority: 'critical',
            assigned_to: testAssigneeId,
            screenshots: ['multi1.png', 'multi2.png']
        };

        const result = await updateReport(input);

        expect(result.name).toBe('Multi Updated Report');
        expect(result.description).toBe('Multi updated description');
        expect(result.status).toBe('resolved');
        expect(result.priority).toBe('critical');
        expect(result.assigned_to).toBe(testAssigneeId);
        expect(result.screenshots).toEqual(['multi1.png', 'multi2.png']);
        expect(result.resolved_at).toBeInstanceOf(Date);
    });
});