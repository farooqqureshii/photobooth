'use client';

import { useState, useEffect } from 'react';
import PhotoViewer from './PhotoViewer';

export default function PhotoPageClient({ 
  photoId, 
  secureUrlFromQuery 
}: { 
  photoId: string;
  secureUrlFromQuery?: string;
}) {
  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Read from browser URL - this is the source of truth
    const urlParams = new URLSearchParams(window.location.search);
    const urlFromParams = urlParams.get('url');
    
    console.log('=== PHOTO PAGE CLIENT MOUNTED ===');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', window.location.search);
    console.log('URL from query param:', urlFromParams);
    console.log('secureUrlFromQuery prop:', secureUrlFromQuery);
    
    if (urlFromParams) {
      console.log('✅ Found secure_url in browser URL');
      setSecureUrl(urlFromParams);
    } else if (secureUrlFromQuery) {
      console.log('✅ Using secure_url from props');
      setSecureUrl(secureUrlFromQuery);
    } else {
      console.error('❌ NO secure_url found anywhere!');
    }
  }, [secureUrlFromQuery]);
  
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
  
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!secureUrl) {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'N/A';
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Link
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            This link is missing the image URL parameter.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            URL must include: ?url=https://res.cloudinary.com/...
          </p>
          <div className="mt-4 p-3 bg-gray-800 rounded text-left">
            <p className="text-xs text-gray-400 mb-1">Current URL:</p>
            <p className="text-xs font-mono text-gray-300 break-all">{currentUrl}</p>
          </div>
        </div>
      </div>
    );
  }
  
  const decodedUrl = decodeURIComponent(secureUrl);
  console.log('=== FINAL URL BEING USED ===');
  console.log('✅ Decoded secure_url:', decodedUrl);
  console.log('✅ Photo ID:', photoId);
  console.log('✅ URL has version number:', decodedUrl.includes('/v'));
  console.log('✅ URL has file extension:', /\.(jpg|jpeg|png)/i.test(decodedUrl));
  
  if (!decodedUrl.includes('res.cloudinary.com')) {
    console.error('❌ URL does not contain res.cloudinary.com:', decodedUrl);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Invalid Image URL
          </h1>
          <p className="text-xs text-gray-500 font-mono break-all">
            {decodedUrl}
          </p>
        </div>
      </div>
    );
  }
  
  // CRITICAL: Use the decoded secure_url - this is the REAL Cloudinary URL
  return (
    <PhotoViewer 
      photo={{
        photoId,
        cloudinaryUrl: decodedUrl, // This MUST be the secure_url from query param
        timestamp: new Date().toISOString(),
      }}
    />
  );
}
