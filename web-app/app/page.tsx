'use client';

import { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export default function Home() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setIsLoadingCamera(true);
    setCameraError(null);
    
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      // Set state first so React renders the video element
      setIsCapturing(true);
      setIsLoadingCamera(false);
      
      // Use setTimeout to wait for React to render the video element
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          const video = videoRef.current;
          video.srcObject = streamRef.current;
          video.play().catch((err) => {
            console.error('Video play error (non-critical):', err);
          });
        }
      }, 100);
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setIsLoadingCamera(false);
      setIsCapturing(false);
      
      let errorMessage = 'Could not access camera. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += error.message || 'Unknown error occurred.';
      }
      
      setCameraError(errorMessage);
      alert(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0);

      const photoData = canvas.toDataURL('image/jpeg');
      setPhoto(photoData);
      stopCamera();
    }
  };

  const uploadAndGeneratePDF = async () => {
    if (!photo) return;

    setIsUploading(true);
    setIsGeneratingPDF(true);

    try {
      // Check environment variables
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error(`Missing Cloudinary configuration. Cloud Name: ${cloudName ? 'OK' : 'MISSING'}, Upload Preset: ${uploadPreset ? 'OK' : 'MISSING'}`);
      }

      // Upload photo to Cloudinary
      const formData = new FormData();
      const blob = await fetch(photo).then(r => r.blob());
      formData.append('file', blob, 'photo.jpg');
      formData.append('upload_preset', uploadPreset);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      console.log('Uploading to:', uploadUrl);
      console.log('Upload preset:', uploadPreset);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload error response:', errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData);
      
      const cloudinaryUrl = uploadData.secure_url;
      if (!cloudinaryUrl) {
        throw new Error('No secure_url in Cloudinary response');
      }
      setPhotoUrl(cloudinaryUrl);

      // Use the full public_id as photoId (Cloudinary handles folders/namespaces)
      const photoId = uploadData.public_id;
      if (!photoId) {
        console.error('No public_id in upload response:', uploadData);
        throw new Error('No public_id returned from Cloudinary. Check your upload preset configuration.');
      }
      
      console.log('=== UPLOAD SUCCESS ===');
      console.log('Photo ID (public_id):', photoId);
      console.log('Photo ID length:', photoId.length);
      console.log('Cloudinary URL (secure_url):', cloudinaryUrl);
      console.log('Full upload response:', uploadData);
      
      // URL encode the photoId for the route
      // IMPORTANT: Also encode the secure_url as a query param as backup
      const encodedPhotoId = encodeURIComponent(photoId);
      const encodedSecureUrl = encodeURIComponent(cloudinaryUrl);
      const viewUrl = `${window.location.origin}/photo/${encodedPhotoId}?url=${encodedSecureUrl}`;
      setViewUrl(viewUrl);
      console.log('View URL:', viewUrl);
      console.log('Encoded Photo ID:', encodedPhotoId);
      console.log('Secure URL (backup):', cloudinaryUrl);

      // Save metadata to API - CRITICAL: Save the secure_url, not a constructed URL
      const saveResponse = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId,
          cloudinaryUrl, // This is uploadData.secure_url - the REAL URL that works
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!saveResponse.ok) {
        console.error('Failed to save photo metadata to API');
      } else {
        console.log('Photo metadata saved successfully');
      }

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(viewUrl, {
        width: 200,
        margin: 2,
      });

      // Generate PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200], // Receipt size
      });

      // Add photo to PDF
      const img = new Image();
      img.src = photo;
      let photoHeight = 0;
      await new Promise((resolve) => {
        img.onload = () => {
          const imgWidth = 70;
          photoHeight = (img.height * imgWidth) / img.width;
          // Limit photo height to fit on page
          const maxPhotoHeight = 100;
          if (photoHeight > maxPhotoHeight) {
            const scale = maxPhotoHeight / photoHeight;
            photoHeight = maxPhotoHeight;
            pdf.addImage(photo, 'JPEG', 5, 10, imgWidth * scale, photoHeight);
          } else {
            pdf.addImage(photo, 'JPEG', 5, 10, imgWidth, photoHeight);
          }
          resolve(null);
        };
      });

      // Add QR code (positioned after photo)
      const qrYPos = 10 + photoHeight + 5;
      pdf.addImage(qrDataUrl, 'PNG', 20, qrYPos, 40, 40);

      // Add metadata (positioned after QR code)
      const metadataYPos = qrYPos + 45;
      pdf.setFontSize(8);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 5, metadataYPos);
      pdf.text(`Time: ${new Date().toLocaleTimeString()}`, 5, metadataYPos + 5);
      pdf.text(`View: ${viewUrl}`, 5, metadataYPos + 10, { maxWidth: 70 });

      // Download PDF
      pdf.save(`photo-receipt-${photoId}.pdf`);

      setIsUploading(false);
      setIsGeneratingPDF(false);
      
      // Reset for next photo
      setPhoto(null);
      setPhotoUrl(null);
      setViewUrl(null);
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = error?.message || 'Failed to upload photo or generate PDF';
      alert(`Error: ${errorMessage}\n\nCheck the browser console for more details.`);
      setIsUploading(false);
      setIsGeneratingPDF(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setPhotoUrl(null);
    setViewUrl(null);
    stopCamera();
  };

  // Attach stream to video element when it's rendered
  useEffect(() => {
    if (isCapturing && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      // Only set if not already set
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      // Ensure video plays
      if (video.paused) {
        video.play().catch((err) => {
          console.error('Video play error:', err);
        });
      }
    }
  }, [isCapturing]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Photo Booth
        </h1>

        {!photo ? (
          <div className="space-y-6">
            {!isCapturing ? (
              <div className="text-center space-y-4">
                {cameraError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-200">{cameraError}</p>
                  </div>
                )}
                <button
                  onClick={startCamera}
                  disabled={isLoadingCamera}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg disabled:cursor-not-allowed"
                >
                  {isLoadingCamera ? 'Starting Camera...' : 'Start Camera'}
                </button>
                {isLoadingCamera && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Please allow camera access when prompted...
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '400px' }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-auto max-h-[600px] object-contain"
                    style={{ transform: 'scaleX(-1)', display: 'block', minHeight: '300px' }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={capturePhoto}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Capture Photo
                  </button>
                  <button
                    onClick={stopCamera}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <img
                src={photo}
                alt="Captured"
                className="w-full h-auto"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={uploadAndGeneratePDF}
                disabled={isUploading || isGeneratingPDF}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isUploading || isGeneratingPDF ? 'Processing...' : 'Generate Receipt PDF'}
              </button>
              <button
                onClick={reset}
                disabled={isUploading || isGeneratingPDF}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Retake
              </button>
            </div>
            {viewUrl && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  PDF generated! View photo at:{' '}
                  <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    {viewUrl}
                  </a>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
