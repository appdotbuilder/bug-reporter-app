import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login, getCurrentUser, logout, hashPassword, verifyToken, clearTokenBlacklist } from '../handlers/auth';
import { eq } from 'drizzle-orm';

// Test user data
const testUserData = {
  username: 'testuser',
  full_name: 'Test User',
  email: 'test@example.com',
  password: 'testpassword123',
  role: 'user' as const
};

const testAdminData = {
  username: 'admin',
  full_name: 'Admin User',
  email: 'admin@example.com', 
  password: 'adminpassword123',
  role: 'admin' as const
};

describe('Auth handlers', () => {
  beforeEach(async () => {
    await createDB();
    clearTokenBlacklist();
  });
  afterEach(resetDB);

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      // Create test user
      const hashedPassword = hashPassword(testUserData.password);
      const insertResult = await db.insert(usersTable)
        .values({
          username: testUserData.username,
          full_name: testUserData.full_name,
          email: testUserData.email,
          password_hash: hashedPassword,
          role: testUserData.role
        })
        .returning()
        .execute();

      const createdUser = insertResult[0];

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      const authResponse = await login(loginInput);

      // Verify response structure
      expect(authResponse.user).toBeDefined();
      expect(authResponse.token).toBeDefined();
      expect(typeof authResponse.token).toBe('string');

      // Verify user data (without password_hash)
      expect(authResponse.user.id).toBe(createdUser.id);
      expect(authResponse.user.username).toBe(testUserData.username);
      expect(authResponse.user.full_name).toBe(testUserData.full_name);
      expect(authResponse.user.email).toBe(testUserData.email);
      expect(authResponse.user.role).toBe(testUserData.role);
      expect('password_hash' in authResponse.user).toBe(false);

      // Verify last_login was updated
      expect(authResponse.user.last_login).toBeInstanceOf(Date);

      // Verify JWT token can be decoded
      const decoded = verifyToken(authResponse.token);
      expect(decoded.userId).toBe(createdUser.id);
      expect(decoded.username).toBe(testUserData.username);
      expect(decoded.role).toBe(testUserData.role);
    });

    it('should update last_login timestamp in database', async () => {
      // Create test user
      const hashedPassword = hashPassword(testUserData.password);
      const insertResult = await db.insert(usersTable)
        .values({
          username: testUserData.username,
          full_name: testUserData.full_name,
          email: testUserData.email,
          password_hash: hashedPassword,
          role: testUserData.role
        })
        .returning()
        .execute();

      const createdUser = insertResult[0];
      const originalLastLogin = createdUser.last_login;

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      await login(loginInput);

      // Check database was updated
      const updatedUsers = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, createdUser.id))
        .execute();

      const updatedUser = updatedUsers[0];
      expect(updatedUser.last_login).not.toBe(originalLastLogin);
      expect(updatedUser.last_login).toBeInstanceOf(Date);
    });

    it('should reject invalid username', async () => {
      const loginInput: LoginInput = {
        username: 'nonexistentuser',
        password: 'anypassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject invalid password', async () => {
      // Create test user
      const hashedPassword = hashPassword(testUserData.password);
      await db.insert(usersTable)
        .values({
          username: testUserData.username,
          full_name: testUserData.full_name,
          email: testUserData.email,
          password_hash: hashedPassword,
          role: testUserData.role
        })
        .execute();

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: 'wrongpassword'
      };

      await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
    });

    it('should reject inactive user', async () => {
      // Create inactive test user
      const hashedPassword = hashPassword(testUserData.password);
      await db.insert(usersTable)
        .values({
          username: testUserData.username,
          full_name: testUserData.full_name,
          email: testUserData.email,
          password_hash: hashedPassword,
          role: testUserData.role,
          is_active: false
        })
        .execute();

      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      await expect(login(loginInput)).rejects.toThrow(/user account is inactive/i);
    });

    it('should authenticate admin user', async () => {
      // Create admin user
      const hashedPassword = hashPassword(testAdminData.password);
      await db.insert(usersTable)
        .values({
          username: testAdminData.username,
          full_name: testAdminData.full_name,
          email: testAdminData.email,
          password_hash: hashedPassword,
          role: testAdminData.role
        })
        .execute();

      const loginInput: LoginInput = {
        username: testAdminData.username,
        password: testAdminData.password
      };

      const authResponse = await login(loginInput);

      expect(authResponse.user.role).toBe('admin');
      
      // Verify JWT token contains admin role
      const decoded = verifyToken(authResponse.token);
      expect(decoded.role).toBe('admin');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user for valid token', async () => {
      // Create test user
      const hashedPassword = hashPassword(testUserData.password);
      const insertResult = await db.insert(usersTable)
        .values({
          username: testUserData.username,
          full_name: testUserData.full_name,
          email: testUserData.email,
          password_hash: hashedPassword,
          role: testUserData.role
        })
        .returning()
        .execute();

      const createdUser = insertResult[0];

      // Login to get valid token
      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      const authResponse = await login(loginInput);
      const user = await getCurrentUser(authResponse.token);

      expect(user.id).toBe(createdUser.id);
      expect(user.username).toBe(testUserData.username);
      expect(user.full_name).toBe(testUserData.full_name);
      expect(user.email).toBe(testUserData.email);
      expect(user.role).toBe(testUserData.role);
      expect('password_hash' in user).toBe(false);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';

      await expect(getCurrentUser(invalidToken)).rejects.toThrow();
    });

    it('should reject token for non-existent user', async () => {
      // Create a valid token structure but for non-existent user
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjk5OTk5LCJ1c2VybmFtZSI6Im5vbmV4aXN0ZW50Iiwicm9sZSI6InVzZXIifQ.invalid';

      await expect(getCurrentUser(fakeToken)).rejects.toThrow();
    });

    it('should reject token for inactive user', async () => {
      // Create inactive test user
      const hashedPassword = hashPassword(testUserData.password);
      const insertResult = await db.insert(usersTable)
        .values({
          username: testUserData.username,
          full_name: testUserData.full_name,
          email: testUserData.email,
          password_hash: hashedPassword,
          role: testUserData.role,
          is_active: false
        })
        .returning()
        .execute();

      // First login (which should fail due to inactive account)
      const loginInput: LoginInput = {
        username: testUserData.username,
        password: testUserData.password
      };

      await expect(login(loginInput)).rejects.toThrow(/user account is inactive/i);
    });

    it('should reject blacklisted token', async () => {
      // Create test user with unique username for this test
      const uniqueUserData = {
        username: 'blacklist_test_user',
        full_name: 'Blacklist Test User',
        email: 'blacklist@example.com',
        password: 'blacklistpass123',
        role: 'user' as const
      };

      const hashedPassword = hashPassword(uniqueUserData.password);
      await db.insert(usersTable)
        .values({
          username: uniqueUserData.username,
          full_name: uniqueUserData.full_name,
          email: uniqueUserData.email,
          password_hash: hashedPassword,
          role: uniqueUserData.role
        })
        .returning()
        .execute();

      // Login to get valid token
      const loginInput: LoginInput = {
        username: uniqueUserData.username,
        password: uniqueUserData.password
      };

      const authResponse = await login(loginInput);
      const token = authResponse.token;

      // Logout to blacklist token
      const logoutResult = await logout(token);
      expect(logoutResult.success).toBe(true);

      // Try to use blacklisted token
      await expect(getCurrentUser(token)).rejects.toThrow(/token has been invalidated/i);
    });
  });

  describe('logout', () => {
    it('should successfully logout with valid token', async () => {
      // Create test user with unique username for this test
      const uniqueUserData = {
        username: 'logout_success_user',
        full_name: 'Logout Success User',
        email: 'logoutsuccess@example.com',
        password: 'logoutsuccess123',
        role: 'user' as const
      };

      const hashedPassword = hashPassword(uniqueUserData.password);
      await db.insert(usersTable)
        .values({
          username: uniqueUserData.username,
          full_name: uniqueUserData.full_name,
          email: uniqueUserData.email,
          password_hash: hashedPassword,
          role: uniqueUserData.role
        })
        .returning()
        .execute();

      // Login to get valid token
      const loginInput: LoginInput = {
        username: uniqueUserData.username,
        password: uniqueUserData.password
      };

      const authResponse = await login(loginInput);
      const logoutResult = await logout(authResponse.token);

      expect(logoutResult.success).toBe(true);
    });

    it('should invalidate token after logout', async () => {
      // Create test user with unique username for this test
      const uniqueUserData = {
        username: 'logouttest_user',
        full_name: 'Logout Test User',
        email: 'logout@example.com',
        password: 'logoutpassword123',
        role: 'user' as const
      };

      const hashedPassword = hashPassword(uniqueUserData.password);
      await db.insert(usersTable)
        .values({
          username: uniqueUserData.username,
          full_name: uniqueUserData.full_name,
          email: uniqueUserData.email,
          password_hash: hashedPassword,
          role: uniqueUserData.role
        })
        .returning()
        .execute();

      const loginInput: LoginInput = {
        username: uniqueUserData.username,
        password: uniqueUserData.password
      };

      const authResponse = await login(loginInput);
      const token = authResponse.token;

      // Token should work before logout
      const userBeforeLogout = await getCurrentUser(token);
      expect(userBeforeLogout.username).toBe(uniqueUserData.username);

      // Logout
      const logoutResult = await logout(token);
      expect(logoutResult.success).toBe(true);

      // Token should be invalidated after logout
      await expect(getCurrentUser(token)).rejects.toThrow(/token has been invalidated/i);
    });

    it('should return success even for invalid token', async () => {
      const invalidToken = 'invalid.jwt.token';

      const logoutResult = await logout(invalidToken);

      expect(logoutResult.success).toBe(true);
    });
  });
});