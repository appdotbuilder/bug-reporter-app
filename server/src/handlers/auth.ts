import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

const JWT_SECRET = process.env['JWT_SECRET'] || 'fallback-secret-for-development';

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set<string>();

// Helper function to clear blacklist for testing
export function clearTokenBlacklist(): void {
  tokenBlacklist.clear();
}

// Simple password hashing using built-in crypto
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

// Verify password against hash
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const computedHash = createHash('sha256').update(password + salt).digest('hex');
  return hash === computedHash;
}

// Simple JWT-like token generation
function generateToken(payload: { userId: number; username: string; role: string }): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: now, exp: now + (24 * 60 * 60) }; // 24 hours
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const signature = createHash('sha256').update(`${headerB64}.${payloadB64}.${JWT_SECRET}`).digest('base64url');
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

// Verify and decode token
function verifyToken(token: string): { userId: number; username: string; role: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  
  const [headerB64, payloadB64, signature] = parts;
  
  // Verify signature
  const expectedSignature = createHash('sha256').update(`${headerB64}.${payloadB64}.${JWT_SECRET}`).digest('base64url');
  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }
  
  // Decode payload
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }
  
  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role
  };
}

/**
 * Authenticates a user with username and password
 * This handler will verify credentials against the database,
 * hash password comparison, and generate JWT token for authenticated sessions
 */
export async function login(input: LoginInput): Promise<AuthResponse> {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isPasswordValid = verifyPassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Update last login timestamp
    await db.update(usersTable)
      .set({ last_login: new Date() })
      .where(eq(usersTable.id, user.id))
      .execute();

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // Return user without password hash and token
    const { password_hash, ...userWithoutPassword } = user;
    
    return {
      user: {
        ...userWithoutPassword,
        last_login: new Date() // Return updated last_login
      },
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Validates JWT token and returns current user information
 * This handler will decode JWT, verify signature, and fetch current user data
 */
export async function getCurrentUser(token: string): Promise<AuthResponse['user']> {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been invalidated');
    }

    // Verify and decode JWT token
    const decoded = verifyToken(token);

    // Fetch current user data from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, decoded.userId))
      .execute();

    const user = users[0];
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is still active
    if (!user.is_active) {
      throw new Error('User account is inactive');
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Get current user failed:', error);
    throw error;
  }
}

/**
 * Logs out user by invalidating the token
 * This handler will blacklist the JWT token and update last_login timestamp
 */
export async function logout(token: string): Promise<{ success: boolean }> {
  try {
    // Verify token first to get user info
    const decoded = verifyToken(token);

    // Add token to blacklist
    tokenBlacklist.add(token);

    return { success: true };
  } catch (error) {
    console.error('Logout failed:', error);
    // Even if token verification fails, we consider logout successful
    // to handle cases where token is already expired/invalid
    return { success: true };
  }
}

// Export helper functions for testing
export { hashPassword, verifyPassword, generateToken, verifyToken };