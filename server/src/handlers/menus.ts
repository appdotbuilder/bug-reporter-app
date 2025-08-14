import { db } from '../db';
import { menusTable, subMenusTable, reportsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { 
    type Menu, 
    type SubMenu,
    type CreateMenuInput, 
    type UpdateMenuInput,
    type CreateSubMenuInput,
    type UpdateSubMenuInput
} from '../schema';

/**
 * Creates a new menu category
 */
export async function createMenu(input: CreateMenuInput): Promise<Menu> {
    try {
        const result = await db.insert(menusTable)
            .values({
                name: input.name,
                description: input.description || null,
                is_active: input.is_active ?? true
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Menu creation failed:', error);
        throw error;
    }
}

/**
 * Updates existing menu information
 */
export async function updateMenu(input: UpdateMenuInput): Promise<Menu> {
    try {
        const updateData: Partial<typeof menusTable.$inferInsert> = {
            updated_at: new Date()
        };

        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.is_active !== undefined) updateData.is_active = input.is_active;

        const result = await db.update(menusTable)
            .set(updateData)
            .where(eq(menusTable.id, input.id))
            .returning()
            .execute();

        if (result.length === 0) {
            throw new Error(`Menu with id ${input.id} not found`);
        }

        return result[0];
    } catch (error) {
        console.error('Menu update failed:', error);
        throw error;
    }
}

/**
 * Retrieves all active menus
 */
export async function getMenus(): Promise<Menu[]> {
    try {
        const result = await db.select()
            .from(menusTable)
            .where(eq(menusTable.is_active, true))
            .execute();

        return result;
    } catch (error) {
        console.error('Menu retrieval failed:', error);
        throw error;
    }
}

/**
 * Retrieves menu with its sub-menus
 */
export async function getMenuWithSubMenus(id: number): Promise<Menu & { subMenus: SubMenu[] } | null> {
    try {
        // First get the menu
        const menuResult = await db.select()
            .from(menusTable)
            .where(eq(menusTable.id, id))
            .execute();

        if (menuResult.length === 0) {
            return null;
        }

        // Then get its sub-menus
        const subMenusResult = await db.select()
            .from(subMenusTable)
            .where(and(
                eq(subMenusTable.menu_id, id),
                eq(subMenusTable.is_active, true)
            ))
            .execute();

        return {
            ...menuResult[0],
            subMenus: subMenusResult
        };
    } catch (error) {
        console.error('Menu with sub-menus retrieval failed:', error);
        throw error;
    }
}

/**
 * Deletes a menu category
 */
export async function deleteMenu(id: number): Promise<{ success: boolean }> {
    try {
        // Check if menu has any reports
        const reportsCount = await db.select()
            .from(reportsTable)
            .where(eq(reportsTable.menu_id, id))
            .execute();

        if (reportsCount.length > 0) {
            throw new Error('Cannot delete menu that has associated reports');
        }

        const result = await db.delete(menusTable)
            .where(eq(menusTable.id, id))
            .returning()
            .execute();

        return { success: result.length > 0 };
    } catch (error) {
        console.error('Menu deletion failed:', error);
        throw error;
    }
}

/**
 * Creates a new sub-menu item under a menu
 */
export async function createSubMenu(input: CreateSubMenuInput): Promise<SubMenu> {
    try {
        // Verify parent menu exists
        const menuExists = await db.select()
            .from(menusTable)
            .where(eq(menusTable.id, input.menu_id))
            .execute();

        if (menuExists.length === 0) {
            throw new Error(`Parent menu with id ${input.menu_id} not found`);
        }

        const result = await db.insert(subMenusTable)
            .values({
                menu_id: input.menu_id,
                name: input.name,
                description: input.description || null,
                is_active: input.is_active ?? true
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Sub-menu creation failed:', error);
        throw error;
    }
}

/**
 * Updates existing sub-menu information
 */
export async function updateSubMenu(input: UpdateSubMenuInput): Promise<SubMenu> {
    try {
        const updateData: Partial<typeof subMenusTable.$inferInsert> = {
            updated_at: new Date()
        };

        if (input.menu_id !== undefined) {
            // Verify parent menu exists
            const menuExists = await db.select()
                .from(menusTable)
                .where(eq(menusTable.id, input.menu_id))
                .execute();

            if (menuExists.length === 0) {
                throw new Error(`Parent menu with id ${input.menu_id} not found`);
            }
            updateData.menu_id = input.menu_id;
        }

        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.is_active !== undefined) updateData.is_active = input.is_active;

        const result = await db.update(subMenusTable)
            .set(updateData)
            .where(eq(subMenusTable.id, input.id))
            .returning()
            .execute();

        if (result.length === 0) {
            throw new Error(`Sub-menu with id ${input.id} not found`);
        }

        return result[0];
    } catch (error) {
        console.error('Sub-menu update failed:', error);
        throw error;
    }
}

/**
 * Retrieves sub-menus for a specific menu
 */
export async function getSubMenusByMenuId(menuId: number): Promise<SubMenu[]> {
    try {
        const result = await db.select()
            .from(subMenusTable)
            .where(and(
                eq(subMenusTable.menu_id, menuId),
                eq(subMenusTable.is_active, true)
            ))
            .execute();

        return result;
    } catch (error) {
        console.error('Sub-menus retrieval failed:', error);
        throw error;
    }
}

/**
 * Deletes a sub-menu item
 */
export async function deleteSubMenu(id: number): Promise<{ success: boolean }> {
    try {
        // Check if sub-menu has any reports
        const reportsCount = await db.select()
            .from(reportsTable)
            .where(eq(reportsTable.sub_menu_id, id))
            .execute();

        if (reportsCount.length > 0) {
            throw new Error('Cannot delete sub-menu that has associated reports');
        }

        const result = await db.delete(subMenusTable)
            .where(eq(subMenusTable.id, id))
            .returning()
            .execute();

        return { success: result.length > 0 };
    } catch (error) {
        console.error('Sub-menu deletion failed:', error);
        throw error;
    }
}