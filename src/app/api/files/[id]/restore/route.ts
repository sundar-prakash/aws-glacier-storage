import { NextRequest, NextResponse } from 'next/server';
import { getMetadata, saveMetadata, initiateRestore } from '@/lib/s3';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { tier, days } = await request.json();

    if (!tier || !days || (tier !== 'Standard' && tier !== 'Bulk')) {
      return NextResponse.json({ error: 'Invalid or missing tier/days parameters.' }, { status: 400 });
    }

    const files = await getMetadata();
    const fileIndex = files.findIndex(f => f.id === id);

    if (fileIndex === -1) {
      return NextResponse.json({ error: 'File not found in index.' }, { status: 404 });
    }

    const file = files[fileIndex];

    // Request S3 to restore the Glacier object
    await initiateRestore(file.key, tier, Number(days));

    // Update metadata status
    file.restoreStatus = 'RESTORING';
    file.restoreTier = tier;
    file.restoredUntil = null; // reset if previously set

    files[fileIndex] = file;
    await saveMetadata(files);

    return NextResponse.json({ success: true, file });
  } catch (error: any) {
    console.error(`Error requesting restore for file:`, error);
    return NextResponse.json({ 
      error: 'Failed to initiate restore', 
      details: error.message 
    }, { status: 500 });
  }
}
