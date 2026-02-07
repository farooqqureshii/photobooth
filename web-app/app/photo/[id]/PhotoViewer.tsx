'use client';

import { useState } from 'react';

interface PhotoData {
  photoId: string;
  cloudinaryUrl: string;
  timestamp: string;
}

export default function PhotoViewer({ photo }: { photo: PhotoData }) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Log the URL for debugging
  console.log('=== PHOTO VIEWER RENDERED ===');
  console.log('Photo ID:', photo.photoId);
  console.log('Photo Cloudinary URL:', photo.cloudinaryUrl);
  console.log('URL includes res.cloudinary.com:', photo.cloudinaryUrl.includes('res.cloudinary.com'));
  console.log('URL length:', photo.cloudinaryUrl.length);
  
  // Validate URL
  if (!photo.cloudinaryUrl || !photo.cloudinaryUrl.includes('res.cloudinary.com')) {
    console.error('❌ INVALID CLOUDINARY URL:', photo.cloudinaryUrl);
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(photo.cloudinaryUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-${photo.photoId}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo');
    } finally {
      setIsDownloading(false);
    }
  };

  const date = new Date(photo.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Photo Receipt</h1>
            <p className="text-indigo-100">Your captured moment</p>
          </div>

          {/* Photo */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
              <img
                src={photo.cloudinaryUrl}
                alt="Photo"
                className="max-w-full max-h-full w-auto h-auto object-contain"
                onLoad={() => {
                  console.log('✅ Image loaded successfully:', photo.cloudinaryUrl);
                }}
                onError={(e) => {
                  console.error('❌ Image failed to load:', photo.cloudinaryUrl);
                  console.error('Photo ID:', photo.photoId);
                  // Don't try alternatives - if secure_url doesn't work, nothing will
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Date</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formattedDate}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formattedTime}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Photo ID</p>
              <p className="text-sm font-mono text-gray-900 dark:text-white break-all">
                {photo.photoId}
              </p>
            </div>
            
            {/* Debug: Show URL - always show for debugging */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border-2 border-yellow-400 dark:border-yellow-600">
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2 font-bold">🔍 DEBUG INFO</p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-1">Image URL Being Used:</p>
              <p className="text-xs font-mono text-yellow-900 dark:text-yellow-100 break-all bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded border border-yellow-300">
                {photo.cloudinaryUrl}
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-2 mb-1">Photo ID:</p>
              <p className="text-xs font-mono text-yellow-900 dark:text-yellow-100">
                {photo.photoId}
              </p>
              <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-2 mb-1">URL Has Version Number:</p>
              <p className="text-xs font-mono text-yellow-900 dark:text-yellow-100">
                {photo.cloudinaryUrl.includes('/v') ? '✅ YES' : '❌ NO - THIS IS THE PROBLEM'}
              </p>
              {!photo.cloudinaryUrl.includes('/v') && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-300">
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                    ❌ ERROR: URL is missing version number!
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    The URL should look like: .../upload/v1234567890/am0.jpg
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    But it's showing: {photo.cloudinaryUrl}
                  </p>
                </div>
              )}
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors shadow-lg"
            >
              {isDownloading ? 'Downloading...' : 'Download Image'}
            </button>

            {/* Back Link */}
            <div className="text-center pt-4">
              <a
                href="/"
                className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
              >
                ← Take Another Photo
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
