import { S3Client } from "bun";

// Bun reads S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_REGION from env
const s3 = new S3Client();

export function uploadToS3(key: string, body: Uint8Array, contentType: string) {
  return s3.write(key, body, { type: contentType });
}

export function getPresignedDownloadUrl(key: string, expiresIn = 3600): string {
  return s3.presign(key, { expiresIn });
}

export function deleteFromS3(key: string) {
  return s3.delete(key);
}
