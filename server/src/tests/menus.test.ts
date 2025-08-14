import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { menusTable, subMenusTable, usersTable, reportsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
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
} from '../handlers/menus';
import {
    type CreateMenuInput,
    type UpdateMenuInput,
    type CreateSubMenuInput,
    type UpdateSubMenuInput
} from '../schema';

describe('Menu Handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    describe('createMenu', () => {
        it('should create a menu with all fields', async () => {
            const input: CreateMenuInput = {
                name: 'Test Menu',
                description: 'Test description',
                is_active: true
            };

            const result = await createMenu(input);

            expect(result.name).toBe('Test Menu');
            expect(result.description).toBe('Test description');
            expect(result.is_active).toBe(true);
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
            expect(result.updated_at).toBeInstanceOf(Date);
        });

        it('should create a menu with minimal fields', async () => {
            const input: CreateMenuInput = {
                name: 'Minimal Menu'
            };

            const result = await createMenu(input);

            expect(result.name).toBe('Minimal Menu');
            expect(result.description).toBeNull();
            expect(result.is_active).toBe(true); // Default value
            expect(result.id).toBeDefined();
        });

        it('should save menu to database', async () => {
            const input: CreateMenuInput = {
                name: 'Database Menu',
                description: 'Saved to database'
            };

            const result = await createMenu(input);

            const menus = await db.select()
                .from(menusTable)
                .where(eq(menusTable.id, result.id))
                .execute();

            expect(menus).toHaveLength(1);
            expect(menus[0].name).toBe('Database Menu');
            expect(menus[0].description).toBe('Saved to database');
        });
    });

    describe('updateMenu', () => {
        it('should update menu fields', async () => {
            // Create a menu first
            const createInput: CreateMenuInput = {
                name: 'Original Menu',
                description: 'Original description'
            };
            const created = await createMenu(createInput);

            const updateInput: UpdateMenuInput = {
                id: created.id,
                name: 'Updated Menu',
                description: 'Updated description',
                is_active: false
            };

            const result = await updateMenu(updateInput);

            expect(result.id).toBe(created.id);
            expect(result.name).toBe('Updated Menu');
            expect(result.description).toBe('Updated description');
            expect(result.is_active).toBe(false);
            expect(result.updated_at.getTime()).toBeGreaterThan(result.created_at.getTime());
        });

        it('should update only specified fields', async () => {
            const created = await createMenu({
                name: 'Original Menu',
                description: 'Original description'
            });

            const updateInput: UpdateMenuInput = {
                id: created.id,
                name: 'Only Name Updated'
            };

            const result = await updateMenu(updateInput);

            expect(result.name).toBe('Only Name Updated');
            expect(result.description).toBe('Original description');
            expect(result.is_active).toBe(true);
        });

        it('should throw error for non-existent menu', async () => {
            const updateInput: UpdateMenuInput = {
                id: 99999,
                name: 'Non-existent'
            };

            await expect(updateMenu(updateInput)).rejects.toThrow(/not found/i);
        });
    });

    describe('getMenus', () => {
        it('should return only active menus', async () => {
            // Create active menu
            await createMenu({ name: 'Active Menu', is_active: true });
            
            // Create inactive menu
            const inactive = await createMenu({ name: 'Inactive Menu', is_active: true });
            await updateMenu({ id: inactive.id, is_active: false });

            const result = await getMenus();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Active Menu');
            expect(result[0].is_active).toBe(true);
        });

        it('should return empty array when no active menus', async () => {
            const result = await getMenus();
            expect(result).toHaveLength(0);
        });

        it('should return multiple active menus', async () => {
            await createMenu({ name: 'Menu 1' });
            await createMenu({ name: 'Menu 2' });

            const result = await getMenus();

            expect(result).toHaveLength(2);
            expect(result.some(m => m.name === 'Menu 1')).toBe(true);
            expect(result.some(m => m.name === 'Menu 2')).toBe(true);
        });
    });

    describe('getMenuWithSubMenus', () => {
        it('should return menu with its sub-menus', async () => {
            const menu = await createMenu({ name: 'Parent Menu' });
            
            await createSubMenu({
                menu_id: menu.id,
                name: 'Sub Menu 1'
            });
            
            await createSubMenu({
                menu_id: menu.id,
                name: 'Sub Menu 2'
            });

            const result = await getMenuWithSubMenus(menu.id);

            expect(result).not.toBeNull();
            expect(result!.name).toBe('Parent Menu');
            expect(result!.subMenus).toHaveLength(2);
            expect(result!.subMenus.some(sm => sm.name === 'Sub Menu 1')).toBe(true);
            expect(result!.subMenus.some(sm => sm.name === 'Sub Menu 2')).toBe(true);
        });

        it('should return only active sub-menus', async () => {
            const menu = await createMenu({ name: 'Parent Menu' });
            
            await createSubMenu({
                menu_id: menu.id,
                name: 'Active Sub Menu'
            });
            
            const inactive = await createSubMenu({
                menu_id: menu.id,
                name: 'Inactive Sub Menu'
            });
            
            await updateSubMenu({ id: inactive.id, is_active: false });

            const result = await getMenuWithSubMenus(menu.id);

            expect(result!.subMenus).toHaveLength(1);
            expect(result!.subMenus[0].name).toBe('Active Sub Menu');
        });

        it('should return null for non-existent menu', async () => {
            const result = await getMenuWithSubMenus(99999);
            expect(result).toBeNull();
        });
    });

    describe('deleteMenu', () => {
        it('should delete menu successfully', async () => {
            const menu = await createMenu({ name: 'To Delete' });

            const result = await deleteMenu(menu.id);

            expect(result.success).toBe(true);

            // Verify menu is deleted
            const menus = await db.select()
                .from(menusTable)
                .where(eq(menusTable.id, menu.id))
                .execute();

            expect(menus).toHaveLength(0);
        });

        it('should prevent deletion if menu has reports', async () => {
            // Create test user first
            const userResult = await db.insert(usersTable)
                .values({
                    username: 'testuser',
                    full_name: 'Test User',
                    email: 'test@example.com',
                    password_hash: 'hashedpassword'
                })
                .returning()
                .execute();

            const menu = await createMenu({ name: 'Menu with Reports' });
            const subMenu = await createSubMenu({ 
                menu_id: menu.id, 
                name: 'Sub Menu' 
            });

            // Create a report that references this menu
            await db.insert(reportsTable)
                .values({
                    user_id: userResult[0].id,
                    menu_id: menu.id,
                    sub_menu_id: subMenu.id,
                    name: 'Test Report',
                    description: 'Test report description'
                })
                .execute();

            await expect(deleteMenu(menu.id)).rejects.toThrow(/cannot delete menu/i);
        });

        it('should return false for non-existent menu', async () => {
            const result = await deleteMenu(99999);
            expect(result.success).toBe(false);
        });
    });

    describe('createSubMenu', () => {
        it('should create a sub-menu with all fields', async () => {
            const menu = await createMenu({ name: 'Parent Menu' });

            const input: CreateSubMenuInput = {
                menu_id: menu.id,
                name: 'Test Sub Menu',
                description: 'Test sub-menu description',
                is_active: true
            };

            const result = await createSubMenu(input);

            expect(result.menu_id).toBe(menu.id);
            expect(result.name).toBe('Test Sub Menu');
            expect(result.description).toBe('Test sub-menu description');
            expect(result.is_active).toBe(true);
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
        });

        it('should throw error for non-existent parent menu', async () => {
            const input: CreateSubMenuInput = {
                menu_id: 99999,
                name: 'Orphan Sub Menu'
            };

            await expect(createSubMenu(input)).rejects.toThrow(/parent menu.*not found/i);
        });
    });

    describe('updateSubMenu', () => {
        it('should update sub-menu fields', async () => {
            const menu = await createMenu({ name: 'Parent Menu' });
            const subMenu = await createSubMenu({
                menu_id: menu.id,
                name: 'Original Sub Menu'
            });

            const updateInput: UpdateSubMenuInput = {
                id: subMenu.id,
                name: 'Updated Sub Menu',
                description: 'Updated description',
                is_active: false
            };

            const result = await updateSubMenu(updateInput);

            expect(result.name).toBe('Updated Sub Menu');
            expect(result.description).toBe('Updated description');
            expect(result.is_active).toBe(false);
        });

        it('should validate new parent menu exists', async () => {
            const menu = await createMenu({ name: 'Parent Menu' });
            const subMenu = await createSubMenu({
                menu_id: menu.id,
                name: 'Sub Menu'
            });

            const updateInput: UpdateSubMenuInput = {
                id: subMenu.id,
                menu_id: 99999
            };

            await expect(updateSubMenu(updateInput)).rejects.toThrow(/parent menu.*not found/i);
        });

        it('should throw error for non-existent sub-menu', async () => {
            const updateInput: UpdateSubMenuInput = {
                id: 99999,
                name: 'Non-existent'
            };

            await expect(updateSubMenu(updateInput)).rejects.toThrow(/sub-menu.*not found/i);
        });
    });

    describe('getSubMenusByMenuId', () => {
        it('should return sub-menus for specific menu', async () => {
            const menu1 = await createMenu({ name: 'Menu 1' });
            const menu2 = await createMenu({ name: 'Menu 2' });

            await createSubMenu({ menu_id: menu1.id, name: 'Sub Menu 1A' });
            await createSubMenu({ menu_id: menu1.id, name: 'Sub Menu 1B' });
            await createSubMenu({ menu_id: menu2.id, name: 'Sub Menu 2A' });

            const result = await getSubMenusByMenuId(menu1.id);

            expect(result).toHaveLength(2);
            expect(result.every(sm => sm.menu_id === menu1.id)).toBe(true);
            expect(result.some(sm => sm.name === 'Sub Menu 1A')).toBe(true);
            expect(result.some(sm => sm.name === 'Sub Menu 1B')).toBe(true);
        });

        it('should return only active sub-menus', async () => {
            const menu = await createMenu({ name: 'Parent Menu' });

            await createSubMenu({ menu_id: menu.id, name: 'Active Sub Menu' });
            const inactive = await createSubMenu({ menu_id: menu.id, name: 'Inactive Sub Menu' });
            await updateSubMenu({ id: inactive.id, is_active: false });

            const result = await getSubMenusByMenuId(menu.id);

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Active Sub Menu');
        });
    });

    describe('deleteSubMenu', () => {
        it('should delete sub-menu successfully', async () => {
            const menu = await createMenu({ name: 'Parent Menu' });
            const subMenu = await createSubMenu({
                menu_id: menu.id,
                name: 'To Delete'
            });

            const result = await deleteSubMenu(subMenu.id);

            expect(result.success).toBe(true);

            // Verify sub-menu is deleted
            const subMenus = await db.select()
                .from(subMenusTable)
                .where(eq(subMenusTable.id, subMenu.id))
                .execute();

            expect(subMenus).toHaveLength(0);
        });

        it('should prevent deletion if sub-menu has reports', async () => {
            // Create test user first
            const userResult = await db.insert(usersTable)
                .values({
                    username: 'testuser',
                    full_name: 'Test User',
                    email: 'test@example.com',
                    password_hash: 'hashedpassword'
                })
                .returning()
                .execute();

            const menu = await createMenu({ name: 'Parent Menu' });
            const subMenu = await createSubMenu({
                menu_id: menu.id,
                name: 'Sub Menu with Reports'
            });

            // Create a report that references this sub-menu
            await db.insert(reportsTable)
                .values({
                    user_id: userResult[0].id,
                    menu_id: menu.id,
                    sub_menu_id: subMenu.id,
                    name: 'Test Report',
                    description: 'Test report description'
                })
                .execute();

            await expect(deleteSubMenu(subMenu.id)).rejects.toThrow(/cannot delete sub-menu/i);
        });

        it('should return false for non-existent sub-menu', async () => {
            const result = await deleteSubMenu(99999);
            expect(result.success).toBe(false);
        });
    });
});