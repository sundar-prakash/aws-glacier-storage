import { NextRequest, NextResponse } from 'next/server';
import { getMetadata, saveMetadata, getUploadUrls, isConfigured } from '@/lib/s3';
import type { FileMetadata } from '@/lib/s3';
import crypto from 'crypto';

export async function GET() {
  try {
    const configured = isConfigured();
    if (!configured) {
      return NextResponse.json({
        files: [],
        s3Configured: false,
        warning: "AWS S3 Glacier environment variables are not configured."
      });
    }

    const files = await getMetadata();
    return NextResponse.json({ files, s3Configured: true });
  } catch (error: any) {
    console.error('Error fetching files metadata:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch file index from S3', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json({ error: 'AWS S3 configuration is incomplete.' }, { status: 400 });
    }

    const body = await request.json();
    const { name, size, mimeType, storageClass, hasPreview, isFolder, parentId } = body;

    // Handle Virtual Folder Creation
    if (isFolder) {
      if (!name) {
        return NextResponse.json({ error: 'Folder name is required.' }, { status: 400 });
      }

      const folderId = crypto.randomUUID();
      const currentFiles = await getMetadata();

      const newFolder: FileMetadata = {
        id: folderId,
        key: '', // Virtual folders don't have a physical S3 key
        name,
        size: 0,
        mimeType: 'application/x-directory',
        hasPreview: false,
        storageClass: 'STANDARD',
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        restoreStatus: 'RESTORED', // Folders are instantly browseable
        restoreTier: null,
        restoredUntil: null,
        isFolder: true,
        parentId: parentId || null,
      };

      currentFiles.push(newFolder);
      await saveMetadata(currentFiles);

      return NextResponse.json({ file: newFolder });
    }

    if (!name || size === undefined || !mimeType || !storageClass) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    if (storageClass !== 'GLACIER' && storageClass !== 'DEEP_ARCHIVE') {
      return NextResponse.json({ error: 'Invalid storage class. Must be GLACIER or DEEP_ARCHIVE.' }, { status: 400 });
    }

    const fileId = crypto.randomUUID();
    
    // Generate S3 upload URLs (one for main file, one optional for preview thumbnail)
    const uploadDetails = await getUploadUrls(fileId, name, mimeType, storageClass, hasPreview);
    
    // Read current metadata, append new record, and write back
    const currentFiles = await getMetadata();
    
    const newFile: FileMetadata = {
      id: fileId,
      key: uploadDetails.fileKey,
      name,
      size,
      mimeType,
      hasPreview,
      storageClass,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      restoreStatus: 'ARCHIVED',
      restoreTier: null,
      restoredUntil: null,
      parentId: parentId || null, // Bind to parent folder
    };
    
    currentFiles.push(newFile);
    await saveMetadata(currentFiles);
    
    return NextResponse.json({
      file: newFile,
      fileUploadUrl: uploadDetails.fileUploadUrl,
      previewUploadUrl: uploadDetails.previewUploadUrl,
    });
  } catch (error: any) {
    console.error('Error initiating upload:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate upload', 
      details: error.message 
    }, { status: 500 });
  }
}
