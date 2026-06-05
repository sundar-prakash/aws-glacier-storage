import { 
  S3Client, 
  GetObjectCommand, 
  PutObjectCommand, 
  RestoreObjectCommand, 
  HeadObjectCommand, 
  DeleteObjectCommand,
  StorageClass
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface FileMetadata {
  id: string;
  key: string;
  name: string;
  size: number;
  mimeType: string;
  hasPreview: boolean;
  storageClass: 'GLACIER' | 'DEEP_ARCHIVE' | 'STANDARD';
  uploadedAt: string;
  createdAt?: string;
  modifiedAt?: string;
  restoreStatus: 'ARCHIVED' | 'RESTORING' | 'RESTORED';
  restoreTier: 'Standard' | 'Bulk' | null;
  restoredUntil: string | null;
  
  // Folder additions
  isFolder?: boolean;
  parentId?: string | null;
}

const getS3Config = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "us-east-1";
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  return { accessKeyId, secretAccessKey, region, bucketName };
};

export const isConfigured = (): boolean => {
  const { accessKeyId, secretAccessKey, bucketName } = getS3Config();
  return !!(accessKeyId && secretAccessKey && bucketName);
};

let s3ClientInstance: S3Client | null = null;

export const getS3Client = (): S3Client => {
  if (!isConfigured()) {
    throw new Error("AWS credentials or S3 bucket name are not configured in environment variables.");
  }
  
  if (!s3ClientInstance) {
    const { accessKeyId, secretAccessKey, region } = getS3Config();
    s3ClientInstance = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }
  return s3ClientInstance;
};

const getBucketName = (): string => {
  const { bucketName } = getS3Config();
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured.");
  }
  return bucketName;
};

// Reads metadata.json from S3, returns empty array if not found
export async function getMetadata(): Promise<FileMetadata[]> {
  if (!isConfigured()) return [];
  
  const client = getS3Client();
  const bucket = getBucketName();
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: "metadata.json",
    });
    const response = await client.send(command);
    const bodyString = await response.Body?.transformToString();
    if (!bodyString) return [];
    return JSON.parse(bodyString) as FileMetadata[];
  } catch (error: any) {
    // If metadata.json doesn't exist yet, return empty list
    if (error.name === "NoSuchKey") {
      return [];
    }
    console.error("Error reading metadata.json from S3:", error);
    throw error;
  }
}

// Writes metadata.json back to S3
export async function saveMetadata(files: FileMetadata[]): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: "metadata.json",
    Body: JSON.stringify(files, null, 2),
    ContentType: "application/json",
    StorageClass: "STANDARD",
  });
  
  await client.send(command);
}

// Generate presigned PUT URL for uploading directly to S3 Glacier
export async function getUploadUrls(
  fileId: string,
  fileName: string,
  mimeType: string,
  storageClass: 'GLACIER' | 'DEEP_ARCHIVE',
  hasPreview: boolean
) {
  const client = getS3Client();
  const bucket = getBucketName();
  const fileKey = `files/${fileId}`;
  
  // Presigned URL for the Glacier-bound file
  const fileCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    StorageClass: storageClass as StorageClass,
  });
  const fileUploadUrl = await getSignedUrl(client, fileCommand, { expiresIn: 3600 });
  
  let previewUploadUrl = null;
  if (hasPreview) {
    // Presigned URL for the thumbnail, stored in STANDARD
    const previewCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: `previews/${fileId}.webp`,
      StorageClass: "STANDARD",
    });
    previewUploadUrl = await getSignedUrl(client, previewCommand, { expiresIn: 3600 });
  }
  
  return {
    fileKey,
    fileUploadUrl,
    previewUploadUrl,
  };
}

// Initiate restoration from Glacier
export async function initiateRestore(
  fileKey: string,
  tier: 'Standard' | 'Bulk',
  days: number
): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new RestoreObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    RestoreRequest: {
      Days: days,
      GlacierJobParameters: {
        Tier: tier,
      },
    },
  });
  
  await client.send(command);
}

// Parse x-amz-restore response header value
// Example header: ongoing-request="false", expiry-date="Fri, 23 Dec 2022 00:00:00 GMT"
export function parseRestoreHeader(restoreHeader: string | undefined): {
  status: 'ARCHIVED' | 'RESTORING' | 'RESTORED';
  expiresAt: string | null;
} {
  if (!restoreHeader) {
    return { status: 'ARCHIVED', expiresAt: null };
  }
  
  const isOngoing = restoreHeader.includes('ongoing-request="true"');
  if (isOngoing) {
    return { status: 'RESTORING', expiresAt: null };
  }
  
  // Extract expiry-date
  const expiryMatch = restoreHeader.match(/expiry-date="([^"]+)"/);
  if (expiryMatch && expiryMatch[1]) {
    try {
      const expiresDate = new Date(expiryMatch[1]);
      return { status: 'RESTORED', expiresAt: expiresDate.toISOString() };
    } catch {
      return { status: 'RESTORED', expiresAt: null };
    }
  }
  
  return { status: 'RESTORED', expiresAt: null };
}

// Check actual S3 state for the file
export async function syncFileStatus(fileKey: string): Promise<{
  restoreStatus: 'ARCHIVED' | 'RESTORING' | 'RESTORED';
  restoredUntil: string | null;
}> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: fileKey,
    });
    const response = await client.send(command);
    const restoreResult = parseRestoreHeader(response.Restore);
    
    return {
      restoreStatus: restoreResult.status,
      restoredUntil: restoreResult.expiresAt,
    };
  } catch (error: any) {
    console.error(`Error checking S3 status for ${fileKey}:`, error);
    throw error;
  }
}

// Generate presigned GET URL for downloading (only works if restored)
export async function getDownloadUrl(fileKey: string, fileName: string): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
  });
  
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

// Delete file and preview from S3
export async function deleteS3File(fileKey: string, hasPreview: boolean): Promise<void> {
  const client = getS3Client();
  const bucket = getBucketName();
  
  // Delete main file
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: fileKey,
      })
    );
  } catch (err) {
    console.error(`Error deleting main file ${fileKey} from S3:`, err);
  }
  
  // Delete preview if exists
  if (hasPreview) {
    const fileId = fileKey.replace("files/", "");
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: `previews/${fileId}.webp`,
        })
      );
    } catch (err) {
      console.error(`Error deleting preview for ${fileId} from S3:`, err);
    }
  }
}
