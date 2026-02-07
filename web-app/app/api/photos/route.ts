import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// In-memory store for photo metadata (in production, use a database)
const photoStore = new Map<string, {
  photoId: string;
  cloudinaryUrl: string;
  timestamp: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoId, cloudinaryUrl, timestamp } = body;

    photoStore.set(photoId, { photoId, cloudinaryUrl, timestamp });

    return NextResponse.json({ success: true, photoId });
  } catch (error) {
    console.error('Error saving photo metadata:', error);
    return NextResponse.json(
      { error: 'Failed to save photo metadata' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');

  if (!photoId) {
    return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
  }

  const photo = photoStore.get(photoId);
  if (!photo) {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
  }

  return NextResponse.json(photo);
}
