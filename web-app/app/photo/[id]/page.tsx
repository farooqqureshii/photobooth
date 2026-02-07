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
      // API doesn't have the photo (server restarted or photo not saved)
      // ALWAYS try to fetch from Cloudinary - this is the only reliable way
      console.log('API returned 404, fetching from Cloudinary...');
      
      try {
        // Use server-side API route to fetch from Cloudinary
        const cloudinaryFetchUrl = `${baseUrl}/api/cloudinary-fetch?id=${encodeURIComponent(decodedPhotoId)}`;
        const cloudinaryResponse = await fetch(cloudinaryFetchUrl, { cache: 'no-store' });
        
        if (cloudinaryResponse.ok) {
          const cloudinaryData = await cloudinaryResponse.json();
          console.log('✅ Fetched from Cloudinary:', cloudinaryData);
          if (cloudinaryData.secure_url) {
            return {
              photoId: decodedPhotoId,
              cloudinaryUrl: cloudinaryData.secure_url,
              timestamp: cloudinaryData.created_at || new Date().toISOString(),
            };
          }
        } else {
          console.error('❌ Cloudinary fetch failed:', cloudinaryResponse.status);
        }
      } catch (err) {
        console.error('❌ Error fetching from Cloudinary:', err);
      }
      
      // If we get here, the photo doesn't exist - don't construct a fake URL
      console.error('❌ Photo not found in Cloudinary. Photo ID:', decodedPhotoId);
      return null;
    }

    const data = await response.json();
    console.log('Photo data from API:', data);
    
    // CRITICAL: Always use the cloudinaryUrl from API if it exists
    // It's the secure_url from Cloudinary which is guaranteed to work
    if (!data.cloudinaryUrl) {
      console.error('❌ No cloudinaryUrl in API response!', data);
      // Try fetching from Cloudinary API instead
      try {
        const cloudinaryFetchUrl = `${baseUrl}/api/cloudinary-fetch?id=${encodeURIComponent(decodedPhotoId)}`;
        const cloudinaryResponse = await fetch(cloudinaryFetchUrl, { cache: 'no-store' });
        if (cloudinaryResponse.ok) {
          const cloudinaryData = await cloudinaryResponse.json();
          return {
            photoId: decodedPhotoId,
            cloudinaryUrl: cloudinaryData.secure_url,
            timestamp: data.timestamp || cloudinaryData.created_at || new Date().toISOString(),
          };
        }
      } catch (err) {
        console.error('Error fetching from Cloudinary:', err);
      }
      return null;
    }
    
    // Use the cloudinaryUrl from API (this is the secure_url from Cloudinary)
    return { 
      ...data, 
      photoId: decodedPhotoId,
      cloudinaryUrl: data.cloudinaryUrl // This should be the secure_url
    };
  } catch (error) {
    console.error('❌ Error fetching photo:', error);
    // Don't construct fake URLs - they don't work
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

export default async function PhotoPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ url?: string }> | { url?: string };
}) {
  // Handle both async and sync params (Next.js 15+ uses async params)
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};
  const photoId = resolvedParams.id;
  const secureUrlFromQuery = resolvedSearchParams.url;
  
  console.log('=== PHOTO PAGE LOADED ===');
  console.log('Photo ID from URL:', photoId);
  console.log('Search params:', resolvedSearchParams);
  console.log('Secure URL from query:', secureUrlFromQuery);
  
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
  
  // If secure_url is in query params, use it directly (most reliable)
  if (secureUrlFromQuery) {
    const decodedUrl = decodeURIComponent(secureUrlFromQuery);
    console.log('=== USING SECURE_URL FROM QUERY PARAMS ===');
    console.log('✅ URL from query:', decodedUrl);
    console.log('✅ Photo ID:', photoId);
    console.log('✅ URL is valid:', decodedUrl.includes('res.cloudinary.com'));
    
    // Verify the URL is valid
    if (!decodedUrl.includes('res.cloudinary.com')) {
      console.error('❌ Invalid Cloudinary URL in query params:', decodedUrl);
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Invalid Image URL
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              The image URL in the link is invalid.
            </p>
          </div>
        </div>
      );
    }
    
    // Use the secure_url from query - it's guaranteed to work
    return (
      <PhotoViewer 
        photo={{
          photoId,
          cloudinaryUrl: decodedUrl, // Use the secure_url from query - this is the REAL URL
          timestamp: new Date().toISOString(),
        }}
      />
    );
  }
  
  console.log('⚠️ No secure_url in query params, trying to fetch from API/Cloudinary...');
  
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
