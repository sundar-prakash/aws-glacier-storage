import { NextRequest, NextResponse } from 'next/server';
import { getMetadata, saveMetadata, syncFileStatus } from '@/lib/s3';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const files = await getMetadata();
    const fileIndex = files.findIndex(f => f.id === id);

    if (fileIndex === -1) {
      return NextResponse.json({ error: 'File not found in index.' }, { status: 404 });
    }

    const file = files[fileIndex];

    // Query S3 for object headers to parse current restoration state
    const s3Status = await syncFileStatus(file.key);

    // Update metadata properties
    file.restoreStatus = s3Status.restoreStatus;
    file.restoredUntil = s3Status.restoredUntil;
    
    // If it's archived, clear the tier
    if (s3Status.restoreStatus === 'ARCHIVED') {
      file.restoreTier = null;
    }

    files[fileIndex] = file;
    await saveMetadata(files);

    return NextResponse.json({ success: true, file });
  } catch (error: any) {
    console.error(`Error syncing S3 status:`, error);
    return NextResponse.json({ 
      error: 'Failed to sync status with S3', 
      details: error.message 
    }, { status: 500 });
  }
}
