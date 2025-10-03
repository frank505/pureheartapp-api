import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { screenshotStorageConfig } from '../config/environment';

const clientConfig: S3ClientConfig = {
  region: screenshotStorageConfig.region,
  credentials: screenshotStorageConfig.credentials,
};

if (screenshotStorageConfig.endpoint) {
  clientConfig.endpoint = screenshotStorageConfig.endpoint;
}

if (screenshotStorageConfig.forcePathStyle) {
  clientConfig.forcePathStyle = true;
}

const client = new S3Client(clientConfig);

const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

const mimeToExtension: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

export interface UploadScreenshotOptions {
  userId: number;
  buffer: Buffer;
  mimeType?: string;
  prefix?: string;
}

export interface UploadScreenshotResult {
  storageKey: string;
  publicUrl?: string;
  mimeType?: string;
  contentLength: number;
}

function ensureMimeType(mimeType?: string): string {
  if (mimeType && mimeType.startsWith('image/')) {
    return mimeType.toLowerCase();
  }
  return 'image/jpeg';
}

function buildStorageKey(userId: number, extension: string, prefix?: string): string {
  const basePrefix = prefix?.replace(/\/$/, '') || 'screenshots';
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '') || 'jpg';
  const filename = `${Date.now()}-${randomUUID()}.${safeExtension}`;
  return `${basePrefix}/${userId}/${filename}`;
}

function derivePublicUrl(key: string): string | undefined {
  if (screenshotStorageConfig.publicBaseUrl) {
    return `${screenshotStorageConfig.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }
  // Default AWS S3 virtual hosted-style URL
  if (!screenshotStorageConfig.endpoint && screenshotStorageConfig.region) {
    return `https://${screenshotStorageConfig.bucket}.s3.${screenshotStorageConfig.region}.amazonaws.com/${key}`;
  }
  return undefined;
}

export async function uploadScreenshotImage(options: UploadScreenshotOptions): Promise<UploadScreenshotResult> {
  const mimeType = ensureMimeType(options.mimeType);
  const extension = mimeToExtension[mimeType] || mimeType.split('/')[1] || 'jpg';
  const storageKey = buildStorageKey(options.userId, extension, options.prefix);

  await client.send(new PutObjectCommand({
    Bucket: screenshotStorageConfig.bucket,
    Key: storageKey,
    Body: options.buffer,
    ContentType: mimeType,
  }));

  const result: UploadScreenshotResult = {
    storageKey,
    mimeType,
    contentLength: options.buffer.byteLength,
  };

  const publicUrl = derivePublicUrl(storageKey);
  if (publicUrl) {
    result.publicUrl = publicUrl;
  }

  return result;
}

export async function deleteScreenshotImage(storageKey: string): Promise<void> {
  if (!storageKey) return;
  await client.send(new DeleteObjectCommand({
    Bucket: screenshotStorageConfig.bucket,
    Key: storageKey,
  }));
}

export async function getScreenshotAccessUrl(storageKey: string, expiresInSeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS): Promise<string> {
  if (!storageKey) {
    throw new Error('Storage key is required');
  }

  if (screenshotStorageConfig.publicBaseUrl) {
    return `${screenshotStorageConfig.publicBaseUrl.replace(/\/$/, '')}/${storageKey}`;
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: screenshotStorageConfig.bucket,
      Key: storageKey,
    }),
    { expiresIn: expiresInSeconds }
  );
}
