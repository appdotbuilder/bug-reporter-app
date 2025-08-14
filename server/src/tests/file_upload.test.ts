import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { promises as fs } from 'fs';
import { join } from 'path';
import { uploadFile, uploadMultipleFiles, deleteFile, validateFile, getFileInfo } from '../handlers/file_upload';

// Test file data
const createTestBuffer = (size: number): Buffer => {
  return Buffer.alloc(size, 'test data');
};

const validImageFile = {
  filename: 'test-image.jpg',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: createTestBuffer(1024)
};

const validPngFile = {
  filename: 'test-screenshot.png',
  mimetype: 'image/png',
  size: 2048,
  buffer: createTestBuffer(2048)
};

const invalidFile = {
  filename: 'malicious.exe',
  mimetype: 'application/exe',
  size: 512,
  buffer: createTestBuffer(512)
};

const oversizedFile = {
  filename: 'large.jpg',
  mimetype: 'image/jpeg',
  size: 10 * 1024 * 1024, // 10MB
  buffer: createTestBuffer(10 * 1024 * 1024)
};

// Cleanup function
const cleanupUploads = async () => {
  try {
    const uploadDir = process.env['UPLOAD_DIR'] || 'uploads';
    await fs.rm(uploadDir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, ignore
  }
};

describe('validateFile', () => {
  const defaultValidationOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  };

  it('should validate a correct image file', async () => {
    const result = await validateFile(validImageFile, defaultValidationOptions);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject file with invalid mimetype', async () => {
    const result = await validateFile(invalidFile, defaultValidationOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('File type application/exe not allowed. Allowed types: image/jpeg, image/png, image/gif, image/webp');
  });

  it('should reject oversized file', async () => {
    const result = await validateFile(oversizedFile, defaultValidationOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('File size exceeds limit'))).toBe(true);
  });

  it('should reject empty file', async () => {
    const emptyFile = { ...validImageFile, size: 0 };
    const result = await validateFile(emptyFile, defaultValidationOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('File is empty');
  });

  it('should reject file with dangerous extension', async () => {
    const dangerousFile = {
      filename: 'virus.exe',
      mimetype: 'image/jpeg', // Fake mimetype
      size: 1024
    };
    
    const result = await validateFile(dangerousFile, defaultValidationOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('Dangerous file extension'))).toBe(true);
  });

  it('should reject file with extremely long filename', async () => {
    const longFilename = 'a'.repeat(300) + '.jpg';
    const longNameFile = { ...validImageFile, filename: longFilename };
    
    const result = await validateFile(longNameFile, defaultValidationOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(error => error.includes('Filename too long'))).toBe(true);
  });

  it('should reject file with null bytes in filename', async () => {
    const maliciousFile = { ...validImageFile, filename: 'test\0.jpg' };
    
    const result = await validateFile(maliciousFile, defaultValidationOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Filename contains illegal characters');
  });

  it('should reject invalid file data', async () => {
    const invalidData = {
      filename: '',
      mimetype: '',
      size: undefined as any
    };
    
    const result = await validateFile(invalidData, defaultValidationOptions);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid file data provided');
  });
});

describe('uploadFile', () => {
  beforeEach(cleanupUploads);
  afterEach(cleanupUploads);

  it('should upload a valid image file', async () => {
    const result = await uploadFile(validImageFile);
    
    expect(result.mimetype).toBe('image/jpeg');
    expect(result.size).toBe(1024);
    expect(result.url).toMatch(/http:\/\/localhost:3000\/uploads\/.*\.jpg$/);
    expect(result.filename).toMatch(/^.*_[a-f0-9]{8}\.jpg$/);
  });

  it('should upload file to custom folder', async () => {
    const result = await uploadFile(validImageFile, { folder: 'avatars' });
    
    expect(result.url).toMatch(/http:\/\/localhost:3000\/avatars\/.*\.jpg$/);
  });

  it('should upload file with custom options', async () => {
    const customOptions = {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png'],
      folder: 'custom'
    };
    
    const result = await uploadFile(validImageFile, customOptions);
    
    expect(result.url).toMatch(/http:\/\/localhost:3000\/custom\/.*\.jpg$/);
  });

  it('should reject invalid file type', async () => {
    await expect(uploadFile(invalidFile)).rejects.toThrow(/File validation failed.*not allowed/);
  });

  it('should reject oversized file', async () => {
    await expect(uploadFile(oversizedFile)).rejects.toThrow(/File validation failed.*exceeds limit/);
  });

  it('should reject empty buffer', async () => {
    const emptyBufferFile = {
      ...validImageFile,
      buffer: Buffer.alloc(0),
      size: 0
    };
    
    await expect(uploadFile(emptyBufferFile)).rejects.toThrow(/File validation failed.*File is empty/);
  });

  it('should reject non-buffer data', async () => {
    const invalidBufferFile = {
      ...validImageFile,
      buffer: 'not a buffer' as any
    };
    
    await expect(uploadFile(invalidBufferFile)).rejects.toThrow(/Invalid file buffer/);
  });

  it('should reject buffer size mismatch', async () => {
    const mismatchFile = {
      ...validImageFile,
      size: 2048, // Different from buffer size
      buffer: createTestBuffer(1024)
    };
    
    await expect(uploadFile(mismatchFile)).rejects.toThrow(/File size mismatch with buffer length/);
  });

  it('should generate secure filename', async () => {
    const unsafeFile = {
      ...validImageFile,
      filename: '../../../etc/passwd.jpg'
    };
    
    const result = await uploadFile(unsafeFile);
    
    // Filename should be sanitized and not contain path traversal
    expect(result.filename).not.toContain('../');
    expect(result.filename).not.toContain('/');
    expect(result.filename).toMatch(/^.*_[a-f0-9]{8}\.jpg$/);
  });
});

describe('uploadMultipleFiles', () => {
  beforeEach(cleanupUploads);
  afterEach(cleanupUploads);

  it('should upload multiple valid files', async () => {
    const files = [validImageFile, validPngFile];
    const results = await uploadMultipleFiles(files);
    
    expect(results).toHaveLength(2);
    expect(results[0].mimetype).toBe('image/jpeg');
    expect(results[1].mimetype).toBe('image/png');
    expect(results[0].url).toMatch(/http:\/\/localhost:3000\/screenshots\/.*\.jpg$/);
    expect(results[1].url).toMatch(/http:\/\/localhost:3000\/screenshots\/.*\.png$/);
  });

  it('should upload files to custom folder', async () => {
    const files = [validImageFile, validPngFile];
    const results = await uploadMultipleFiles(files, { folder: 'reports' });
    
    expect(results).toHaveLength(2);
    expect(results[0].url).toMatch(/http:\/\/localhost:3000\/reports\/.*\.jpg$/);
    expect(results[1].url).toMatch(/http:\/\/localhost:3000\/reports\/.*\.png$/);
  });

  it('should reject empty file array', async () => {
    await expect(uploadMultipleFiles([])).rejects.toThrow(/No files provided/);
  });

  it('should reject non-array input', async () => {
    await expect(uploadMultipleFiles(null as any)).rejects.toThrow(/No files provided/);
  });

  it('should reject too many files', async () => {
    const manyFiles = Array(6).fill(validImageFile);
    
    await expect(uploadMultipleFiles(manyFiles)).rejects.toThrow(/Maximum 5 files allowed, got 6/);
  });

  it('should reject files exceeding total size limit', async () => {
    const largeFile = {
      filename: 'large.jpg',
      mimetype: 'image/jpeg',
      size: 4 * 1024 * 1024, // 4MB each
      buffer: createTestBuffer(4 * 1024 * 1024)
    };
    
    const files = Array(6).fill(largeFile); // 6 * 4MB = 24MB total, exceeds 5 * 5MB = 25MB limit
    
    await expect(uploadMultipleFiles(files)).rejects.toThrow(/Maximum 5 files allowed/);
  });

  it('should handle mixed file types within limits', async () => {
    const files = [
      validImageFile,
      validPngFile,
      { ...validImageFile, filename: 'test3.gif', mimetype: 'image/gif' }
    ];
    
    const options = {
      maxFiles: 5,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
    };
    
    const results = await uploadMultipleFiles(files, options);
    
    expect(results).toHaveLength(3);
    expect(results.map(r => r.mimetype)).toEqual(['image/jpeg', 'image/png', 'image/gif']);
  });

  it('should reject if any file is invalid', async () => {
    const files = [validImageFile, invalidFile];
    
    await expect(uploadMultipleFiles(files)).rejects.toThrow(/File validation failed/);
  });
});

describe('deleteFile', () => {
  beforeEach(cleanupUploads);
  afterEach(cleanupUploads);

  it('should delete existing file', async () => {
    // First upload a file
    const uploadResult = await uploadFile(validImageFile);
    
    // Verify file exists
    const fileInfo = await getFileInfo(uploadResult.url);
    expect(fileInfo.exists).toBe(true);
    
    // Delete file
    const result = await deleteFile(uploadResult.url);
    expect(result.success).toBe(true);
    
    // Verify file no longer exists
    const fileInfoAfter = await getFileInfo(uploadResult.url);
    expect(fileInfoAfter.exists).toBe(false);
  });

  it('should handle deletion of non-existent file', async () => {
    const fakeUrl = 'http://localhost:3000/uploads/nonexistent.jpg';
    const result = await deleteFile(fakeUrl);
    
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', async () => {
    await expect(deleteFile('')).rejects.toThrow(/Invalid URL provided/);
    await expect(deleteFile(null as any)).rejects.toThrow(/Invalid URL provided/);
  });

  it('should reject URL with path traversal in filename', async () => {
    // Create URL where the filename contains ..
    // URL: 'http://localhost:3000/uploads/..test.jpg'
    // Parts: ['http:', '', 'localhost:3000', 'uploads', '..test.jpg']  
    // filename = '..test.jpg' (contains ..), folder = 'uploads'
    const maliciousUrl = 'http://localhost:3000/uploads/..test.jpg';
    
    await expect(deleteFile(maliciousUrl)).rejects.toThrow(/Invalid filename in URL/);
  });

  it('should reject URL with path traversal in folder', async () => {
    // Create URL where the folder contains ..
    // URL: 'http://localhost:3000/..uploads/test.jpg'
    // Parts: ['http:', '', 'localhost:3000', '..uploads', 'test.jpg']
    // filename = 'test.jpg', folder = '..uploads' (contains ..)
    const maliciousUrl = 'http://localhost:3000/..uploads/test.jpg';
    
    await expect(deleteFile(maliciousUrl)).rejects.toThrow(/Invalid folder in URL/);
  });

  it('should handle URL with invalid characters', async () => {
    const invalidUrl = 'http://localhost:3000/uploads/test\\file.jpg';
    
    await expect(deleteFile(invalidUrl)).rejects.toThrow(/Invalid filename in URL/);
  });
});

describe('getFileInfo', () => {
  beforeEach(cleanupUploads);
  afterEach(cleanupUploads);

  it('should get info for existing file', async () => {
    // Upload a file first
    const uploadResult = await uploadFile(validImageFile);
    
    const info = await getFileInfo(uploadResult.url);
    
    expect(info.exists).toBe(true);
    expect(info.size).toBe(1024);
    expect(info.mimetype).toBe('image/jpeg');
  });

  it('should return false for non-existent file', async () => {
    const fakeUrl = 'http://localhost:3000/uploads/nonexistent.jpg';
    const info = await getFileInfo(fakeUrl);
    
    expect(info.exists).toBe(false);
    expect(info.size).toBeUndefined();
    expect(info.mimetype).toBeUndefined();
  });

  it('should handle invalid URL', async () => {
    const info1 = await getFileInfo('');
    expect(info1.exists).toBe(false);
    
    const info2 = await getFileInfo(null as any);
    expect(info2.exists).toBe(false);
  });

  it('should reject path traversal attempts', async () => {
    const maliciousUrl = 'http://localhost:3000/uploads/../test.jpg';
    const info = await getFileInfo(maliciousUrl);
    
    expect(info.exists).toBe(false);
  });

  it('should detect correct mimetypes', async () => {
    const pngFile = { ...validImageFile, filename: 'test.png', mimetype: 'image/png' };
    const uploadResult = await uploadFile(pngFile);
    
    const info = await getFileInfo(uploadResult.url);
    
    expect(info.exists).toBe(true);
    expect(info.mimetype).toBe('image/png');
  });

  it('should handle unknown file extensions', async () => {
    // Create a file with unknown extension but valid mimetype for upload
    const unknownFile = {
      filename: 'test.unknown',
      mimetype: 'image/jpeg', // Valid for upload
      size: 1024,
      buffer: createTestBuffer(1024)
    };
    
    const uploadResult = await uploadFile(unknownFile, {
      allowedTypes: ['image/jpeg']
    });
    
    const info = await getFileInfo(uploadResult.url);
    
    expect(info.exists).toBe(true);
    expect(info.mimetype).toBe('application/octet-stream'); // Default for unknown extensions
  });
});

describe('file upload integration', () => {
  beforeEach(cleanupUploads);
  afterEach(cleanupUploads);

  it('should handle complete upload and delete cycle', async () => {
    // Upload file
    const uploadResult = await uploadFile(validImageFile);
    
    expect(uploadResult.size).toBe(1024);
    expect(uploadResult.mimetype).toBe('image/jpeg');
    
    // Check file exists
    const info = await getFileInfo(uploadResult.url);
    expect(info.exists).toBe(true);
    expect(info.size).toBe(1024);
    
    // Delete file
    const deleteResult = await deleteFile(uploadResult.url);
    expect(deleteResult.success).toBe(true);
    
    // Verify deletion
    const infoAfter = await getFileInfo(uploadResult.url);
    expect(infoAfter.exists).toBe(false);
  });

  it('should handle multiple file operations', async () => {
    const files = [validImageFile, validPngFile];
    
    // Upload multiple files
    const uploadResults = await uploadMultipleFiles(files);
    expect(uploadResults).toHaveLength(2);
    
    // Check all files exist
    for (const result of uploadResults) {
      const info = await getFileInfo(result.url);
      expect(info.exists).toBe(true);
    }
    
    // Delete all files
    for (const result of uploadResults) {
      const deleteResult = await deleteFile(result.url);
      expect(deleteResult.success).toBe(true);
    }
    
    // Verify all deletions
    for (const result of uploadResults) {
      const info = await getFileInfo(result.url);
      expect(info.exists).toBe(false);
    }
  });
});