'use client';

import { useState, useEffect } from 'react';
import PhotoViewer from './PhotoViewer';

interface PhotoData {
  photoId: string;
  cloudinaryUrl: string;
  timestamp: string;
}

export default function PhotoPageClient({ 
  photoId, 
  secureUrlFromQuery 
}: { 
  photoId: string;
  secureUrlFromQuery?: string;
}) {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Check if this is a receipt (has receiptId param)
        const urlParams = new URLSearchParams(window.location.search);
        const receiptId = urlParams.get('receiptId');
        
        if (receiptId) {
          // Fetch receipt with all photos
          const response = await fetch(`/api/photos?receiptId=${encodeURIComponent(receiptId)}`);
          if (response.ok) {
            const receipt = await response.json();
            if (receipt.photos && Array.isArray(receipt.photos)) {
              setPhotos(receipt.photos);
              setLoading(false);
              return;
            }
          }
        }
        
        // Fallback: single photo (legacy support)
        if (secureUrlFromQuery) {
          setPhotos([{
            photoId,
            cloudinaryUrl: decodeURIComponent(secureUrlFromQuery),
            timestamp: new Date().toISOString(),
          }]);
          setLoading(false);
          return;
        }
        
        // Try fetching single photo from API
        const response = await fetch(`/api/photos?id=${encodeURIComponent(photoId)}`);
        if (response.ok) {
          const photo = await response.json();
          setPhotos([photo]);
        } else {
          setError('Photo not found');
        }
      } catch (err) {
        console.error('Error fetching photos:', err);
        setError('Failed to load photos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPhotos();
  }, [photoId, secureUrlFromQuery]);
  
  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (error || photos.length === 0) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Photo not found'}
          </h1>
        </div>
      </div>
    );
  }
  
  return <PhotoViewer photos={photos} />;
}
