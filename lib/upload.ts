/**
 * DigitalOcean Spaces File Upload Helper
 *
 * Uses the AWS S3 SDK (DO Spaces is S3-compatible).
 * Handles candidate photo uploads with validation.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import path from 'path';

// ─── S3 Client (DigitalOcean Spaces) ──────────────────────────────────────────

const s3Client = new S3Client({
  region: process.env.DO_SPACES_REGION || 'nyc3',
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY || '',
  },
  forcePathStyle: false,
});

const BUCKET = process.env.DO_SPACES_BUCKET || 'elp-voting-uploads';
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT || '';

// ─── Configuration ────────────────────────────────────────────────────────────

export const UPLOAD_CONFIG = {
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  allowedMimeTypes: ['image/jpeg', 'image/png'] as string[],
  allowedExtensions: ['.jpg', '.jpeg', '.png'] as string[],
  candidatePhotosPrefix: 'candidates/',
};

// ─── File Validation ──────────────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  filename: string,
  size: number,
  mimeType: string
): FileValidationResult {
  // Check file size
  if (size > UPLOAD_CONFIG.maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${UPLOAD_CONFIG.maxSizeBytes / (1024 * 1024)}MB limit`,
    };
  }

  // Check MIME type
  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(mimeType)) {
    return {
      valid: false,
      error: `File type ${mimeType} not allowed. Use JPEG or PNG.`,
    };
  }

  // Check extension
  const ext = path.extname(filename).toLowerCase();
  if (!UPLOAD_CONFIG.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension ${ext} not allowed. Use .jpg, .jpeg, or .png.`,
    };
  }

  return { valid: true };
}

// ─── Magic Bytes Validation ───────────────────────────────────────────────────

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
};

/**
 * Verify the file content matches the claimed MIME type by checking magic bytes.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return false;

  return signatures.some((sig) =>
    sig.every((byte, index) => buffer[index] === byte)
  );
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Generate a unique storage key for a candidate photo.
 */
function generateKey(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const uniqueId = crypto.randomUUID();
  return `${UPLOAD_CONFIG.candidatePhotosPrefix}${uniqueId}${ext}`;
}

/**
 * Upload a file to DigitalOcean Spaces.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<string> {
  const key = generateKey(originalFilename);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    })
  );

  // Return CDN URL if available, otherwise construct the standard URL
  if (CDN_ENDPOINT) {
    return `${CDN_ENDPOINT}/${key}`;
  }
  return `${process.env.DO_SPACES_ENDPOINT}/${BUCKET}/${key}`;
}

/**
 * Delete a file from DigitalOcean Spaces.
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

/**
 * Extract the storage key from a full URL.
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // CDN URL: https://bucket.region.cdn.digitaloceanspaces.com/candidates/uuid.jpg
    // Standard URL: https://region.digitaloceanspaces.com/bucket/candidates/uuid.jpg
    const pathname = urlObj.pathname;
    if (pathname.startsWith(`/${BUCKET}/`)) {
      return pathname.slice(`/${BUCKET}/`.length);
    }
    // CDN format — key starts after the leading /
    return pathname.startsWith('/') ? pathname.slice(1) : pathname;
  } catch {
    return null;
  }
}
