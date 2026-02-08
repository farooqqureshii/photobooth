'use client';

import { useState } from 'react';
import { Download, ArrowLeft, Calendar, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface PhotoData {
  photoId: string;
  cloudinaryUrl: string;
  timestamp: string;
}

export default function PhotoViewer({ photos }: { photos: PhotoData[] }) {
  const [isDownloading, setIsDownloading] = useState<number | null>(null);

  const handleDownload = async (photo: PhotoData, index: number) => {
    setIsDownloading(index);
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
      setIsDownloading(null);
    }
  };

  // Use first photo's timestamp for date/time display
  const firstPhoto = photos[0];
  const date = new Date(firstPhoto.timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gray-900 p-6 text-white">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold mb-1 text-balance"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Your Photos
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-300 text-sm text-pretty"
            >
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} from your session
            </motion.p>
          </div>

          {/* Photos Grid */}
          <div className="p-8 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.photoId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="relative bg-black rounded-xl overflow-hidden border-2 border-gray-300 shadow-lg aspect-[3/4] flex items-center justify-center"
                >
                  <motion.img
                    src={photo.cloudinaryUrl}
                    alt={`Photo ${index + 1}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Metadata and Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-6 bg-white border-t border-gray-200"
          >
            {/* Date and Time - Clean and Minimal */}
            <div className="flex items-center justify-center gap-2 mb-6 text-gray-600 text-sm">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <span style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>{formattedDate}</span>
              <span className="text-gray-400">•</span>
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span style={{ fontFamily: 'var(--font-geist-mono), monospace' }}>{formattedTime}</span>
            </div>

            {/* Download Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {photos.map((photo, index) => (
                <motion.button
                  key={photo.photoId}
                  onClick={() => handleDownload(photo, index)}
                  disabled={isDownloading === index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-xl transition-colors disabled:cursor-not-allowed shadow-lg text-sm"
                  aria-label={isDownloading === index ? 'Downloading image' : `Download image ${index + 1}`}
                >
                  {isDownloading === index ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" aria-hidden="true" />
                      Download {photos.length > 1 ? `Photo ${index + 1}` : 'Photo'}
                    </>
                  )}
                </motion.button>
              ))}
            </div>

            {/* Back Link */}
            <div className="text-center pt-2">
              <motion.a
                href="/"
                whileHover={{ x: -5 }}
                className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Take More Photos
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
