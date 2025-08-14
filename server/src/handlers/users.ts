import { db } from '../db';
import { usersTable } from '../db/schema';
import { 
    type User, 
    type CreateUserInput, 
    type UpdateUserInput, 
    type ChangePasswordInput,
    type UserFilters,
    type Pagination
} from '../schema';
import { eq, and, or, ilike, count, desc } from 'drizzle-orm';
import { SQL } from 'drizzle-orm';
// Using Bun's built-in password hashing
const hashPassword = async (password: string): Promise<string> => {
    return await Bun.password.hash(password);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return await Bun.password.verify(password, hash);
};

/**
 * Creates a new user account
 * This handler will hash password, validate unique constraints, and persist user data
 */
export async function createUser(input: CreateUserInput): Promise<User> {
    try {
        // Hash the password
        const password_hash = await hashPassword(input.password);

        // Insert user record
        const result = await db.insert(usersTable)
            .values({
                username: input.username,
                full_name: input.full_name,
                email: input.email,
                password_hash,
                role: input.role,
                avatar_url: input.avatar_url || null
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('User creation failed:', error);
        throw error;
    }
}

/**
 * Updates existing user information
 * This handler will validate user exists, update fields, and handle role changes
 */
export async function updateUser(input: UpdateUserInput): Promise<User> {
    try {
        // Prepare update values, excluding undefined fields
        const updateValues: any = {};
        
        if (input.username !== undefined) updateValues.username = input.username;
        if (input.full_name !== undefined) updateValues.full_name = input.full_name;
        if (input.email !== undefined) updateValues.email = input.email;
        if (input.role !== undefined) updateValues.role = input.role;
        if (input.avatar_url !== undefined) updateValues.avatar_url = input.avatar_url;
        if (input.is_active !== undefined) updateValues.is_active = input.is_active;
        
        // Always update the updated_at timestamp
        updateValues.updated_at = new Date();

        // Update user record
        const result = await db.update(usersTable)
            .set(updateValues)
            .where(eq(usersTable.id, input.id))
            .returning()
            .execute();

        if (result.length === 0) {
            throw new Error('User not found');
        }

        return result[0];
    } catch (error) {
        console.error('User update failed:', error);
        throw error;
    }
}

/**
 * Changes user password with current password verification
 * This handler will verify current password and update with new hashed password
 */
export async function changePassword(input: ChangePasswordInput): Promise<{ success: boolean }> {
    try {
        // Get user's current password hash
        const users = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, input.user_id))
            .execute();

        if (users.length === 0) {
            throw new Error('User not found');
        }

        const user = users[0];

        // Verify current password
        const isCurrentPasswordValid = await verifyPassword(input.current_password, user.password_hash);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        // Hash new password
        const new_password_hash = await hashPassword(input.new_password);

        // Update password
        await db.update(usersTable)
            .set({ 
                password_hash: new_password_hash,
                updated_at: new Date()
            })
            .where(eq(usersTable.id, input.user_id))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('Password change failed:', error);
        throw error;
    }
}

/**
 * Retrieves paginated list of users with filtering
 * This handler will apply filters, pagination, and return user list without passwords
 */
export async function getUsers(filters: UserFilters): Promise<{ 
    data: Omit<User, 'password_hash'>[]; 
    pagination: Pagination 
}> {
    try {
        // Set default pagination values
        const page = filters.page || 1;
        const per_page = filters.per_page || 10;
        const offset = (page - 1) * per_page;

        // Build conditions array
        const conditions: SQL<unknown>[] = [];

        if (filters.search) {
            conditions.push(
                or(
                    ilike(usersTable.username, `%${filters.search}%`),
                    ilike(usersTable.full_name, `%${filters.search}%`),
                    ilike(usersTable.email, `%${filters.search}%`)
                )!
            );
        }

        if (filters.role) {
            conditions.push(eq(usersTable.role, filters.role));
        }

        if (filters.is_active !== undefined) {
            conditions.push(eq(usersTable.is_active, filters.is_active));
        }

        // Build query with conditions
        const baseQuery = db.select({
            id: usersTable.id,
            username: usersTable.username,
            full_name: usersTable.full_name,
            email: usersTable.email,
            role: usersTable.role,
            avatar_url: usersTable.avatar_url,
            is_active: usersTable.is_active,
            last_login: usersTable.last_login,
            created_at: usersTable.created_at,
            updated_at: usersTable.updated_at
        }).from(usersTable);

        const whereClause = conditions.length > 0 
            ? (conditions.length === 1 ? conditions[0] : and(...conditions))
            : undefined;

        // Execute query with optional where clause
        const users = await (whereClause 
            ? baseQuery.where(whereClause).orderBy(desc(usersTable.created_at)).limit(per_page).offset(offset)
            : baseQuery.orderBy(desc(usersTable.created_at)).limit(per_page).offset(offset)
        ).execute();

        // Get total count for pagination
        const countQuery = db.select({ count: count() }).from(usersTable);
        const totalResult = await (whereClause 
            ? countQuery.where(whereClause)
            : countQuery
        ).execute();
        const total = totalResult[0].count;
        const total_pages = Math.ceil(total / per_page);

        return {
            data: users,
            pagination: {
                total,
                page,
                per_page,
                total_pages
            }
        };
    } catch (error) {
        console.error('Get users failed:', error);
        throw error;
    }
}

/**
 * Retrieves single user by ID
 * This handler will fetch user details excluding password hash
 */
export async function getUserById(id: number): Promise<Omit<User, 'password_hash'> | null> {
    try {
        const users = await db.select({
            id: usersTable.id,
            username: usersTable.username,
            full_name: usersTable.full_name,
            email: usersTable.email,
            role: usersTable.role,
            avatar_url: usersTable.avatar_url,
            is_active: usersTable.is_active,
            last_login: usersTable.last_login,
            created_at: usersTable.created_at,
            updated_at: usersTable.updated_at
        })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .execute();

        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Get user by ID failed:', error);
        throw error;
    }
}

/**
 * Deletes a user account
 * This handler will permanently remove user from database
 */
export async function deleteUser(id: number): Promise<{ success: boolean }> {
    try {
        const result = await db.delete(usersTable)
            .where(eq(usersTable.id, id))
            .execute();

        return { success: true };
    } catch (error) {
        console.error('User deletion failed:', error);
        throw error;
    }
}

/**
 * Toggles user active status
 * This handler will enable/disable user account access
 */
export async function toggleUserStatus(id: number): Promise<User> {
    try {
        // Get current status
        const users = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, id))
            .execute();

        if (users.length === 0) {
            throw new Error('User not found');
        }

        const currentStatus = users[0].is_active;

        // Toggle status
        const result = await db.update(usersTable)
            .set({ 
                is_active: !currentStatus,
                updated_at: new Date()
            })
            .where(eq(usersTable.id, id))
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Toggle user status failed:', error);
        throw error;
    }
}

/**
 * Resets user password to system generated one
 * This handler will generate new password and update user record
 */
export async function resetUserPassword(id: number): Promise<{ success: boolean; temporaryPassword?: string }> {
    try {
        // Check if user exists
        const users = await db.select()
            .from(usersTable)
            .where(eq(usersTable.id, id))
            .execute();

        if (users.length === 0) {
            throw new Error('User not found');
        }

        // Generate temporary password
        const temporaryPassword = Math.random().toString(36).slice(-12);
        const password_hash = await hashPassword(temporaryPassword);

        // Update user password
        await db.update(usersTable)
            .set({ 
                password_hash,
                updated_at: new Date()
            })
            .where(eq(usersTable.id, id))
            .execute();

        return { 
            success: true, 
            temporaryPassword 
        };
    } catch (error) {
        console.error('Reset user password failed:', error);
        throw error;
    }
}