'use client';

import { useEffect, useState } from 'react';
import PhotoViewer from './PhotoViewer';

export default function PhotoPageClient({ 
  photoId, 
  secureUrlFromQuery 
}: { 
  photoId: string;
  secureUrlFromQuery?: string;
}) {
  // Read URL immediately from browser (don't wait for useEffect)
  let secureUrl: string | null = null;
  
  if (secureUrlFromQuery) {
    secureUrl = secureUrlFromQuery;
    console.log('✅ Using secure_url from props:', secureUrl);
  } else if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlFromParams = urlParams.get('url');
    if (urlFromParams) {
      secureUrl = urlFromParams;
      console.log('✅ Found secure_url in URL params (client-side):', secureUrl);
    }
  }
  
  if (!secureUrl) {
    console.error('❌ NO secure_url found!');
    console.error('Current URL:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    console.error('Search params:', typeof window !== 'undefined' ? window.location.search : 'N/A');
  }
  
  if (!photoId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Photo ID
          </h1>
        </div>
      </div>
    );
  }
  
  if (!secureUrl) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Link
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            This link is missing the image URL parameter.
          </p>
          <p className="text-sm text-gray-500">
            URL must include: ?url=https://res.cloudinary.com/...
          </p>
        </div>
      </div>
    );
  }
  
  const decodedUrl = decodeURIComponent(secureUrl);
  console.log('=== FINAL URL BEING USED ===');
  console.log('✅ Decoded secure_url:', decodedUrl);
  console.log('✅ Photo ID:', photoId);
  
  if (!decodedUrl.includes('res.cloudinary.com')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Image URL
          </h1>
        </div>
      </div>
    );
  }
  
  return (
    <PhotoViewer 
      photo={{
        photoId,
        cloudinaryUrl: decodedUrl,
        timestamp: new Date().toISOString(),
      }}
    />
  );
}
