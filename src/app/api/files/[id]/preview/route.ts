import { NextRequest } from 'next/server';
import { getS3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getS3Client();
    const bucket = process.env.AWS_S3_BUCKET_NAME;

    if (!bucket) {
      return new Response('AWS_S3_BUCKET_NAME is not configured', { status: 500 });
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `previews/${id}.webp`,
    });

    const response = await client.send(command);
    const body = response.Body;

    if (!body) {
      return new Response('Preview body empty', { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'image/webp');
    // Cache for 30 days
    headers.set('Cache-Control', 'public, max-age=2592000, immutable');

    // Convert to Response stream
    return new Response(body as any, { headers });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return new Response('Preview not found', { status: 404 });
    }
    console.error('Error fetching S3 preview:', error);
    return new Response('Error loading preview', { status: 500 });
  }
}
