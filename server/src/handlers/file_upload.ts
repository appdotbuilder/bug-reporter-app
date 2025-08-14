import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { randomUUID } from 'crypto';
import { type FileUpload } from '../schema';

// File storage configuration
const UPLOAD_DIR = process.env['UPLOAD_DIR'] || 'uploads';
const BASE_URL = process.env['BASE_URL'] || 'http://localhost:3000';

// Security constants
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.js', '.vbs', '.jar'];
const MAX_FILENAME_LENGTH = 255;

/**
 * Ensures upload directory exists
 */
async function ensureUploadDir(folder: string): Promise<string> {
  const fullPath = join(UPLOAD_DIR, folder);
  try {
    await fs.access(fullPath);
  } catch {
    await fs.mkdir(fullPath, { recursive: true });
  }
  return fullPath;
}

/**
 * Generates a secure filename to prevent path traversal and conflicts
 */
function generateSecureFilename(originalFilename: string): string {
  const ext = extname(originalFilename).toLowerCase();
  const name = basename(originalFilename, ext);
  
  // Sanitize filename - remove dangerous characters
  const safeName = name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 50); // Limit length
  
  // Add UUID to prevent conflicts
  const uuid = randomUUID().substring(0, 8);
  
  return `${safeName}_${uuid}${ext}`;
}

/**
 * Validates file before upload
 * This handler will check file type, size, and security constraints
 */
export async function validateFile(
  file: {
    filename: string;
    mimetype: string;
    size: number;
  },
  options: {
    maxSize: number;
    allowedTypes: string[];
  }
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const errors: string[] = [];
    
    // Check if file exists
    if (!file.filename || !file.mimetype || file.size === undefined) {
      errors.push('Invalid file data provided');
      return { valid: false, errors };
    }
    
    // Check file size
    if (file.size <= 0) {
      errors.push('File is empty');
    } else if (file.size > options.maxSize) {
      const maxSizeMB = (options.maxSize / 1024 / 1024).toFixed(1);
      errors.push(`File size exceeds limit of ${maxSizeMB}MB`);
    }
    
    // Check file type
    if (!options.allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
    }
    
    // Check filename length
    if (file.filename.length > MAX_FILENAME_LENGTH) {
      errors.push(`Filename too long (max ${MAX_FILENAME_LENGTH} characters)`);
    }
    
    // Check for dangerous extensions
    const ext = extname(file.filename).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      errors.push(`Dangerous file extension ${ext} not allowed`);
    }
    
    // Check for null bytes (security)
    if (file.filename.includes('\0')) {
      errors.push('Filename contains illegal characters');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    console.error('File validation failed:', error);
    return {
      valid: false,
      errors: ['File validation failed']
    };
  }
}

/**
 * Uploads a single file (image) for bug reports or user avatars
 * This handler will validate file type, size, process image, and store in cloud/local storage
 */
export async function uploadFile(
  file: {
    filename: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  },
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
    folder?: string;
  }
): Promise<FileUpload> {
  try {
    const defaultOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      folder: 'uploads'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Validate file
    const validation = await validateFile(file, {
      maxSize: config.maxSize,
      allowedTypes: config.allowedTypes
    });
    
    if (!validation.valid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Validate buffer
    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new Error('Invalid file buffer');
    }
    
    if (file.buffer.length !== file.size) {
      throw new Error('File size mismatch with buffer length');
    }
    
    // Generate secure filename
    const secureFilename = generateSecureFilename(file.filename);
    
    // Ensure upload directory exists
    const uploadPath = await ensureUploadDir(config.folder);
    const fullPath = join(uploadPath, secureFilename);
    
    // Write file to disk
    await fs.writeFile(fullPath, file.buffer);
    
    // Verify file was written correctly
    const stats = await fs.stat(fullPath);
    if (stats.size !== file.size) {
      // Clean up failed upload
      await fs.unlink(fullPath).catch(() => {});
      throw new Error('File upload verification failed');
    }
    
    const url = `${BASE_URL}/${config.folder}/${secureFilename}`;
    
    return {
      filename: secureFilename,
      mimetype: file.mimetype,
      size: file.size,
      url
    };
  } catch (error) {
    console.error('File upload failed:', error);
    throw error;
  }
}

/**
 * Uploads multiple files for bug report screenshots
 * This handler will process multiple files concurrently with validation
 */
export async function uploadMultipleFiles(
  files: Array<{
    filename: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }>,
  options?: {
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
    folder?: string;
  }
): Promise<FileUpload[]> {
  try {
    const defaultOptions = {
      maxFiles: 5,
      maxSize: 5 * 1024 * 1024, // 5MB per file
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      folder: 'screenshots'
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Validate file count
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided');
    }
    
    if (files.length > config.maxFiles) {
      throw new Error(`Maximum ${config.maxFiles} files allowed, got ${files.length}`);
    }
    
    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotalSize = config.maxSize * config.maxFiles;
    
    if (totalSize > maxTotalSize) {
      const maxTotalMB = (maxTotalSize / 1024 / 1024).toFixed(1);
      throw new Error(`Total file size exceeds limit of ${maxTotalMB}MB`);
    }
    
    // Upload files concurrently
    const uploadPromises = files.map(file =>
      uploadFile(file, {
        maxSize: config.maxSize,
        allowedTypes: config.allowedTypes,
        folder: config.folder
      })
    );
    
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple file upload failed:', error);
    throw error;
  }
}

/**
 * Deletes an uploaded file from storage
 * This handler will safely remove file from storage system
 */
export async function deleteFile(url: string): Promise<{ success: boolean }> {
  try {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }
    
    // Extract filename from URL (security: prevent path traversal)
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    
    // Validate filename and folder (prevent path traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
      throw new Error('Invalid filename in URL');
    }
    
    if (!folder || folder.includes('..') || folder.includes('/') || folder.includes('\\') || folder.includes('\0')) {
      throw new Error('Invalid folder in URL');
    }
    
    // Additional security: ensure we have at least 3 URL parts (protocol://domain/folder/filename)
    if (urlParts.length < 4) {
      throw new Error('Invalid URL format');
    }
    
    // Construct safe file path
    const filePath = join(UPLOAD_DIR, folder, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, consider it successfully deleted
      return { success: true };
    }
    
    // Delete file
    await fs.unlink(filePath);
    
    return { success: true };
  } catch (error) {
    console.error('File deletion failed:', error);
    throw error;
  }
}

/**
 * Gets file information without exposing file system details
 */
export async function getFileInfo(url: string): Promise<{
  exists: boolean;
  size?: number;
  mimetype?: string;
}> {
  try {
    if (!url || typeof url !== 'string') {
      return { exists: false };
    }
    
    // Extract filename from URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const folder = urlParts[urlParts.length - 2];
    
    // Validate filename and folder (prevent path traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
      return { exists: false };
    }
    
    if (!folder || folder.includes('..') || folder.includes('/') || folder.includes('\\') || folder.includes('\0')) {
      return { exists: false };
    }
    
    // Additional security: ensure we have at least 3 URL parts (protocol://domain/folder/filename)
    if (urlParts.length < 4) {
      return { exists: false };
    }
    
    const filePath = join(UPLOAD_DIR, folder, filename);
    
    try {
      const stats = await fs.stat(filePath);
      
      // Determine mimetype from extension
      const ext = extname(filename).toLowerCase();
      const mimetypeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      
      return {
        exists: true,
        size: stats.size,
        mimetype: mimetypeMap[ext] || 'application/octet-stream'
      };
    } catch {
      return { exists: false };
    }
  } catch (error) {
    console.error('Get file info failed:', error);
    return { exists: false };
  }
}