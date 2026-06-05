import { NextRequest, NextResponse } from 'next/server';
import { getMetadata, getDownloadUrl } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const files = await getMetadata();
    const file = files.find(f => f.id === id);

    if (!file) {
      return NextResponse.json({ error: 'File not found in index.' }, { status: 404 });
    }

    // Verify file is indeed restored and download is possible
    if (file.restoreStatus !== 'RESTORED') {
      return NextResponse.json({ error: 'File is not restored. Please restore it first.' }, { status: 400 });
    }

    if (file.restoredUntil) {
      const expiry = new Date(file.restoredUntil);
      if (expiry < new Date()) {
        return NextResponse.json({ error: 'Restored copy has expired. Please initiate restore again.' }, { status: 400 });
      }
    }

    // Generate a secure, 1-hour presigned GET url for the browser to download directly
    const downloadUrl = await getDownloadUrl(file.key, file.name);

    return NextResponse.json({ downloadUrl });
  } catch (error: any) {
    console.error(`Error generating download URL:`, error);
    return NextResponse.json({ 
      error: 'Failed to generate download URL', 
      details: error.message 
    }, { status: 500 });
  }
}
