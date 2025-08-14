import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { 
    type CreateUserInput, 
    type UpdateUserInput, 
    type ChangePasswordInput, 
    type UserFilters 
} from '../schema';
import { 
    createUser, 
    updateUser, 
    changePassword, 
    getUsers, 
    getUserById, 
    deleteUser, 
    toggleUserStatus, 
    resetUserPassword 
} from '../handlers/users';
import { eq } from 'drizzle-orm';
// Using Bun's built-in password verification
const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return await Bun.password.verify(password, hash);
};

// Test inputs
const testUserInput: CreateUserInput = {
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
    avatar_url: 'https://example.com/avatar.jpg'
};

const testAdminInput: CreateUserInput = {
    username: 'admin',
    full_name: 'Admin User',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    avatar_url: null
};

describe('User Handlers', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    describe('createUser', () => {
        it('should create a user with hashed password', async () => {
            const result = await createUser(testUserInput);

            expect(result.username).toBe('testuser');
            expect(result.full_name).toBe('Test User');
            expect(result.email).toBe('test@example.com');
            expect(result.role).toBe('user');
            expect(result.avatar_url).toBe('https://example.com/avatar.jpg');
            expect(result.is_active).toBe(true);
            expect(result.id).toBeDefined();
            expect(result.created_at).toBeInstanceOf(Date);
            expect(result.updated_at).toBeInstanceOf(Date);

            // Verify password is hashed
            expect(result.password_hash).not.toBe('password123');
            expect(result.password_hash.length).toBeGreaterThan(50);
        });

        it('should create user with null avatar_url when not provided', async () => {
            const inputWithoutAvatar = { ...testUserInput };
            delete inputWithoutAvatar.avatar_url;

            const result = await createUser(inputWithoutAvatar);

            expect(result.avatar_url).toBeNull();
        });

        it('should save user to database', async () => {
            const result = await createUser(testUserInput);

            const users = await db.select()
                .from(usersTable)
                .where(eq(usersTable.id, result.id))
                .execute();

            expect(users).toHaveLength(1);
            expect(users[0].username).toBe('testuser');
            expect(users[0].email).toBe('test@example.com');

            // Verify password can be validated
            const isValidPassword = await verifyPassword('password123', users[0].password_hash);
            expect(isValidPassword).toBe(true);
        });

        it('should throw error for duplicate username', async () => {
            await createUser(testUserInput);

            const duplicateInput = { ...testUserInput, email: 'different@example.com' };

            await expect(createUser(duplicateInput)).rejects.toThrow();
        });

        it('should throw error for duplicate email', async () => {
            await createUser(testUserInput);

            const duplicateInput = { ...testUserInput, username: 'differentuser' };

            await expect(createUser(duplicateInput)).rejects.toThrow();
        });
    });

    describe('updateUser', () => {
        it('should update user fields', async () => {
            const user = await createUser(testUserInput);

            const updateInput: UpdateUserInput = {
                id: user.id,
                full_name: 'Updated Name',
                email: 'updated@example.com',
                role: 'admin',
                is_active: false
            };

            const result = await updateUser(updateInput);

            expect(result.id).toBe(user.id);
            expect(result.username).toBe('testuser'); // Not updated
            expect(result.full_name).toBe('Updated Name');
            expect(result.email).toBe('updated@example.com');
            expect(result.role).toBe('admin');
            expect(result.is_active).toBe(false);
            expect(result.updated_at).not.toEqual(user.updated_at);
        });

        it('should update only provided fields', async () => {
            const user = await createUser(testUserInput);

            const updateInput: UpdateUserInput = {
                id: user.id,
                full_name: 'Only Name Updated'
            };

            const result = await updateUser(updateInput);

            expect(result.full_name).toBe('Only Name Updated');
            expect(result.username).toBe(user.username); // Unchanged
            expect(result.email).toBe(user.email); // Unchanged
            expect(result.role).toBe(user.role); // Unchanged
        });

        it('should throw error for non-existent user', async () => {
            const updateInput: UpdateUserInput = {
                id: 999,
                full_name: 'Does not exist'
            };

            await expect(updateUser(updateInput)).rejects.toThrow(/User not found/);
        });

        it('should save updates to database', async () => {
            const user = await createUser(testUserInput);

            const updateInput: UpdateUserInput = {
                id: user.id,
                full_name: 'Database Updated'
            };

            await updateUser(updateInput);

            const users = await db.select()
                .from(usersTable)
                .where(eq(usersTable.id, user.id))
                .execute();

            expect(users[0].full_name).toBe('Database Updated');
        });
    });

    describe('changePassword', () => {
        it('should change password with correct current password', async () => {
            const user = await createUser(testUserInput);

            const changeInput: ChangePasswordInput = {
                user_id: user.id,
                current_password: 'password123',
                new_password: 'newpassword456',
                confirm_password: 'newpassword456'
            };

            const result = await changePassword(changeInput);

            expect(result.success).toBe(true);

            // Verify new password works
            const users = await db.select()
                .from(usersTable)
                .where(eq(usersTable.id, user.id))
                .execute();

            const isNewPasswordValid = await verifyPassword('newpassword456', users[0].password_hash);
            expect(isNewPasswordValid).toBe(true);

            // Verify old password doesn't work
            const isOldPasswordValid = await verifyPassword('password123', users[0].password_hash);
            expect(isOldPasswordValid).toBe(false);
        });

        it('should throw error with incorrect current password', async () => {
            const user = await createUser(testUserInput);

            const changeInput: ChangePasswordInput = {
                user_id: user.id,
                current_password: 'wrongpassword',
                new_password: 'newpassword456',
                confirm_password: 'newpassword456'
            };

            await expect(changePassword(changeInput)).rejects.toThrow(/Current password is incorrect/);
        });

        it('should throw error for non-existent user', async () => {
            const changeInput: ChangePasswordInput = {
                user_id: 999,
                current_password: 'password123',
                new_password: 'newpassword456',
                confirm_password: 'newpassword456'
            };

            await expect(changePassword(changeInput)).rejects.toThrow(/User not found/);
        });
    });

    describe('getUsers', () => {
        beforeEach(async () => {
            // Create test users
            await createUser(testUserInput);
            await createUser(testAdminInput);
            await createUser({
                username: 'inactive',
                full_name: 'Inactive User',
                email: 'inactive@example.com',
                password: 'password123',
                role: 'user'
            });
            
            // Make the inactive user inactive
            const users = await db.select().from(usersTable).where(eq(usersTable.username, 'inactive')).execute();
            await db.update(usersTable).set({ is_active: false }).where(eq(usersTable.id, users[0].id)).execute();
        });

        it('should return paginated users without password hash', async () => {
            const filters: UserFilters = {
                page: 1,
                per_page: 2
            };

            const result = await getUsers(filters);

            expect(result.data).toHaveLength(2);
            expect(result.pagination.total).toBe(3);
            expect(result.pagination.page).toBe(1);
            expect(result.pagination.per_page).toBe(2);
            expect(result.pagination.total_pages).toBe(2);

            // Verify no password hash in response
            result.data.forEach(user => {
                expect(user).not.toHaveProperty('password_hash');
                expect(user.id).toBeDefined();
                expect(user.username).toBeDefined();
                expect(user.email).toBeDefined();
            });
        });

        it('should filter by search term', async () => {
            const filters: UserFilters = {
                search: 'admin'
            };

            const result = await getUsers(filters);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].username).toBe('admin');
        });

        it('should filter by role', async () => {
            const filters: UserFilters = {
                role: 'admin'
            };

            const result = await getUsers(filters);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].role).toBe('admin');
        });

        it('should filter by active status', async () => {
            const filters: UserFilters = {
                is_active: false
            };

            const result = await getUsers(filters);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].username).toBe('inactive');
            expect(result.data[0].is_active).toBe(false);
        });

        it('should combine multiple filters', async () => {
            const filters: UserFilters = {
                role: 'user',
                is_active: true,
                search: 'test'
            };

            const result = await getUsers(filters);

            expect(result.data).toHaveLength(1);
            expect(result.data[0].username).toBe('testuser');
            expect(result.data[0].role).toBe('user');
            expect(result.data[0].is_active).toBe(true);
        });

        it('should use default pagination values', async () => {
            const result = await getUsers({});

            expect(result.pagination.page).toBe(1);
            expect(result.pagination.per_page).toBe(10);
        });
    });

    describe('getUserById', () => {
        it('should return user by ID without password hash', async () => {
            const user = await createUser(testUserInput);

            const result = await getUserById(user.id);

            expect(result).not.toBeNull();
            expect(result!.id).toBe(user.id);
            expect(result!.username).toBe('testuser');
            expect(result!.email).toBe('test@example.com');
            expect(result).not.toHaveProperty('password_hash');
        });

        it('should return null for non-existent user', async () => {
            const result = await getUserById(999);

            expect(result).toBeNull();
        });
    });

    describe('deleteUser', () => {
        it('should delete user from database', async () => {
            const user = await createUser(testUserInput);

            const result = await deleteUser(user.id);

            expect(result.success).toBe(true);

            // Verify user is deleted
            const users = await db.select()
                .from(usersTable)
                .where(eq(usersTable.id, user.id))
                .execute();

            expect(users).toHaveLength(0);
        });

        it('should return success even for non-existent user', async () => {
            const result = await deleteUser(999);

            expect(result.success).toBe(true);
        });
    });

    describe('toggleUserStatus', () => {
        it('should toggle active user to inactive', async () => {
            const user = await createUser(testUserInput);
            expect(user.is_active).toBe(true);

            const result = await toggleUserStatus(user.id);

            expect(result.is_active).toBe(false);
            expect(result.updated_at).not.toEqual(user.updated_at);
        });

        it('should toggle inactive user to active', async () => {
            const user = await createUser(testUserInput);
            
            // Make user inactive first
            await db.update(usersTable)
                .set({ is_active: false })
                .where(eq(usersTable.id, user.id))
                .execute();

            const result = await toggleUserStatus(user.id);

            expect(result.is_active).toBe(true);
        });

        it('should throw error for non-existent user', async () => {
            await expect(toggleUserStatus(999)).rejects.toThrow(/User not found/);
        });

        it('should save status change to database', async () => {
            const user = await createUser(testUserInput);

            await toggleUserStatus(user.id);

            const users = await db.select()
                .from(usersTable)
                .where(eq(usersTable.id, user.id))
                .execute();

            expect(users[0].is_active).toBe(false);
        });
    });

    describe('resetUserPassword', () => {
        it('should reset password and return temporary password', async () => {
            const user = await createUser(testUserInput);

            const result = await resetUserPassword(user.id);

            expect(result.success).toBe(true);
            expect(result.temporaryPassword).toBeDefined();
            expect(typeof result.temporaryPassword).toBe('string');
            expect(result.temporaryPassword!.length).toBe(12);

            // Verify password is changed in database
            const users = await db.select()
                .from(usersTable)
                .where(eq(usersTable.id, user.id))
                .execute();

            // Old password should not work
            const isOldPasswordValid = await verifyPassword('password123', users[0].password_hash);
            expect(isOldPasswordValid).toBe(false);

            // New temporary password should work
            const isNewPasswordValid = await verifyPassword(result.temporaryPassword!, users[0].password_hash);
            expect(isNewPasswordValid).toBe(true);
        });

        it('should throw error for non-existent user', async () => {
            await expect(resetUserPassword(999)).rejects.toThrow(/User not found/);
        });

        it('should generate different passwords each time', async () => {
            const user1 = await createUser(testUserInput);
            const user2 = await createUser(testAdminInput);

            const result1 = await resetUserPassword(user1.id);
            const result2 = await resetUserPassword(user2.id);

            expect(result1.temporaryPassword).not.toBe(result2.temporaryPassword);
        });
    });
});