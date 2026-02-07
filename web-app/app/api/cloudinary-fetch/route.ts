import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get('id');

  if (!photoId) {
    return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
  }

  try {
    // Try to get the resource from Cloudinary
    const result = await cloudinary.api.resource(photoId, {
      resource_type: 'image',
    });

    return NextResponse.json({
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      created_at: result.created_at,
      format: result.format,
    });
  } catch (error: any) {
    console.error('Cloudinary API error:', error);
    
    // If resource not found, try to construct the URL
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName) {
      // Try constructing the URL - Cloudinary serves images even if API fails
      const secureUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${photoId}`;
      return NextResponse.json({
        public_id: photoId,
        secure_url: secureUrl,
        url: secureUrl,
        created_at: new Date().toISOString(),
        format: 'jpg',
      });
    }

    return NextResponse.json(
      { error: 'Photo not found in Cloudinary' },
      { status: 404 }
    );
  }
}
