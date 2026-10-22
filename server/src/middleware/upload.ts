import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

// Multer memory storage so we can inspect magic bytes before writing to disk
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES, // 5MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Validates actual file content header (magic bytes) to prevent extension spoofing.
 */
function validateMagicBytes(buffer: Buffer): { valid: boolean; ext: string } {
  if (buffer.length < 12) {
    return { valid: false, ext: '' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: '.jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: '.png' };
  }

  // WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, ext: '.webp' };
  }

  return { valid: false, ext: '' };
}

/**
 * Middleware that verifies magic bytes of the uploaded file in memory,
 * writes it to disk with a secure UUID filename, and attaches the saved path to req.file.
 */
export async function processUploadedImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.file) {
    res.status(400).json({
      error: 'No image file uploaded. Please upload a file from your device.',
      code: 'NO_FILE_UPLOADED',
    });
    return;
  }

  const { valid, ext } = validateMagicBytes(req.file.buffer);
  if (!valid) {
    res.status(400).json({
      error: 'File content verification failed. File is not a valid JPEG, PNG, or WebP image.',
      code: 'INVALID_IMAGE_CONTENT',
    });
    return;
  }

  // Generate safe random UUID filename - completely avoids path traversal or user-controlled filenames
  const safeFilename = `${crypto.randomUUID()}${ext}`;
  const destinationPath = path.join(uploadsDirectory, safeFilename);

  try {
    await fs.promises.writeFile(destinationPath, req.file.buffer);

    // Attach relative URL path for DB storage
    (req as any).savedImagePath = `/uploads/${safeFilename}`;
    next();
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to write uploaded image to disk',
      code: 'FILE_WRITE_ERROR',
    });
  }
}
