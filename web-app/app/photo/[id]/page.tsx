import { Metadata } from 'next';
import PhotoViewer from './PhotoViewer';

async function getPhotoData(photoId: string) {
  // Handle undefined or empty photoId
  if (!photoId || photoId === 'undefined') {
    console.error('Invalid photoId:', photoId);
    return null;
  }

  // Decode the photoId (it's URL encoded)
  const decodedPhotoId = decodeURIComponent(photoId);
  
  // Validate decoded photoId
  if (!decodedPhotoId || decodedPhotoId === 'undefined') {
    console.error('Invalid decoded photoId:', decodedPhotoId);
    return null;
  }
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/photos?id=${encodeURIComponent(decodedPhotoId)}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      // If metadata not found, try to construct Cloudinary URL from photoId
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (cloudName && decodedPhotoId) {
        // Cloudinary public_id might not have extension, try both
        const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${decodedPhotoId}`;
        return {
          photoId: decodedPhotoId,
          cloudinaryUrl,
          timestamp: new Date().toISOString(),
        };
      }
      return null;
    }

    const data = await response.json();
    // Ensure photoId matches the decoded version
    return { ...data, photoId: decodedPhotoId };
  } catch (error) {
    console.error('Error fetching photo:', error);
    // Fallback: try to construct Cloudinary URL
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (cloudName && decodedPhotoId) {
      const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${decodedPhotoId}`;
      return {
        photoId: decodedPhotoId,
        cloudinaryUrl,
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> | { id: string } }): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const photo = await getPhotoData(resolvedParams.id);
  
  return {
    title: photo ? 'Photo Receipt' : 'Photo Not Found',
    description: 'View your photo receipt',
  };
}

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // Handle both async and sync params (Next.js 15+ uses async params)
  const resolvedParams = await Promise.resolve(params);
  const photoId = resolvedParams.id;
  
  if (!photoId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Photo ID
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No photo ID provided in the URL.
          </p>
        </div>
      </div>
    );
  }
  
  const photo = await getPhotoData(photoId);

  if (!photo) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Photo Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            The photo you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return <PhotoViewer photo={photo} />;
}
