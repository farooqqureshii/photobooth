'use client';

import { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Camera, X, Loader2, Printer, Plus, RotateCcw, Copy, ExternalLink, Images, AlertCircle, ArrowRight, CheckCircle2, Sparkles, Sun, Snowflake, Image as ImageIcon, Palette, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type FilterType = 'none' | 'vintage' | 'warm' | 'cool' | 'blackwhite' | 'sepia' | 'vibrant' | 'pastel';

interface PhotoWithFilter {
  data: string;
  filter: FilterType;
}

const FilterIcon = ({ type }: { type: FilterType }) => {
  switch (type) {
    case 'none': return <Sparkles className="w-5 h-5" />;
    case 'vintage': return <Camera className="w-5 h-5" />;
    case 'warm': return <Sun className="w-5 h-5" />;
    case 'cool': return <Snowflake className="w-5 h-5" />;
    case 'blackwhite': return <ImageIcon className="w-5 h-5" />;
    case 'sepia': return <Palette className="w-5 h-5" />;
    case 'vibrant': return <Palette className="w-5 h-5" />;
    case 'pastel': return <Palette className="w-5 h-5" />;
  }
};

const filters: { name: string; value: FilterType }[] = [
  { name: 'Original', value: 'none' },
  { name: 'Vintage', value: 'vintage' },
  { name: 'Warm', value: 'warm' },
  { name: 'Cool', value: 'cool' },
  { name: 'B&W', value: 'blackwhite' },
  { name: 'Sepia', value: 'sepia' },
  { name: 'Vibrant', value: 'vibrant' },
  { name: 'Pastel', value: 'pastel' },
];

const filterStyles: Record<FilterType, string> = {
  none: '',
  vintage: 'contrast-125 saturate-110 sepia-20',
  warm: 'brightness-110 contrast-110 saturate-125 hue-rotate-15',
  cool: 'brightness-105 contrast-110 saturate-110 hue-rotate-180',
  blackwhite: 'grayscale-100 contrast-120',
  sepia: 'sepia-100 contrast-110 brightness-105',
  vibrant: 'saturate-150 contrast-120 brightness-105',
  pastel: 'saturate-50 brightness-110 contrast-95',
};

export default function Home() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('none');
  const [photos, setPhotos] = useState<PhotoWithFilter[]>([]); // Max 3 photos
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // Wait for React to render, then attach stream
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          const video = videoRef.current;
          video.srcObject = streamRef.current;
          video.play().catch((err) => {
            console.error('Video play error:', err);
          });
        }
      }, 200);
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
      setCapturedPhoto(photoData);
      setSelectedFilter('none');
      stopCamera();
    }
  };

  const applyFilterToImage = (imageData: string, filter: FilterType): Promise<string> => {
    return new Promise((resolve) => {
      if (filter === 'none') {
        resolve(imageData);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageData);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const filtered = applyFilter(imageDataObj, filter);
        ctx.putImageData(filtered, 0, 0);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.src = imageData;
    });
  };

  const applyFilter = (imageData: ImageData, filter: FilterType): ImageData => {
    const data = imageData.data;
    const newData = new ImageData(
      new Uint8ClampedArray(data),
      imageData.width,
      imageData.height
    );
    const pixels = newData.data;

    switch (filter) {
      case 'vintage':
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = Math.min(255, pixels[i] * 0.9 + 20);
          pixels[i + 1] = Math.min(255, pixels[i + 1] * 0.85 + 15);
          pixels[i + 2] = Math.min(255, pixels[i + 2] * 0.8 + 10);
        }
        break;
      case 'warm':
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = Math.min(255, pixels[i] * 1.1);
          pixels[i + 1] = Math.min(255, pixels[i + 1] * 1.05);
          pixels[i + 2] = Math.min(255, pixels[i + 2] * 0.95);
        }
        break;
      case 'cool':
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = Math.min(255, pixels[i] * 0.95);
          pixels[i + 1] = Math.min(255, pixels[i + 1] * 1.0);
          pixels[i + 2] = Math.min(255, pixels[i + 2] * 1.1);
        }
        break;
      case 'blackwhite':
        for (let i = 0; i < pixels.length; i += 4) {
          const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          pixels[i] = gray;
          pixels[i + 1] = gray;
          pixels[i + 2] = gray;
        }
        break;
      case 'sepia':
        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          pixels[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          pixels[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          pixels[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
        break;
      case 'vibrant':
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = Math.min(255, pixels[i] * 1.2);
          pixels[i + 1] = Math.min(255, pixels[i + 1] * 1.2);
          pixels[i + 2] = Math.min(255, pixels[i + 2] * 1.2);
        }
        break;
      case 'pastel':
        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = Math.min(255, (pixels[i] + 255) / 2);
          pixels[i + 1] = Math.min(255, (pixels[i + 1] + 255) / 2);
          pixels[i + 2] = Math.min(255, (pixels[i + 2] + 255) / 2);
        }
        break;
    }
    return newData;
  };

  const addPhotoWithFilter = async () => {
    if (!capturedPhoto) return;
    if (photos.length >= 3) return; // Max 3 photos

    const filteredPhoto = await applyFilterToImage(capturedPhoto, selectedFilter);
    setPhotos([...photos, { data: filteredPhoto, filter: selectedFilter }]);
    setCapturedPhoto(null);
    setSelectedFilter('none');
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const startCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          // Capture photo when countdown reaches 0
          setTimeout(() => {
            capturePhoto();
            setCountdown(null);
          }, 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    countdownIntervalRef.current = interval;
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const uploadAndGeneratePDF = async () => {
    if (photos.length === 0) return;

    setIsUploading(true);
    setIsGeneratingPDF(true);
    setPdfGenerated(false);

    try {
      // Check environment variables
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error(`Missing Cloudinary configuration. Cloud Name: ${cloudName ? 'OK' : 'MISSING'}, Upload Preset: ${uploadPreset ? 'OK' : 'MISSING'}`);
      }

      // Upload all photos to Cloudinary
      const uploadedPhotos = await Promise.all(
        photos.map(async (photoWithFilter) => {
          const formData = new FormData();
          const blob = await fetch(photoWithFilter.data).then(r => r.blob());
          formData.append('file', blob, 'photo.jpg');
          formData.append('upload_preset', uploadPreset);

          const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`);
          }

          const uploadData = await uploadResponse.json();
          if (uploadData.error) {
            throw new Error(`Cloudinary upload failed: ${uploadData.error.message || JSON.stringify(uploadData.error)}`);
          }

          return {
            photoId: uploadData.public_id,
            cloudinaryUrl: uploadData.secure_url,
            localData: photoWithFilter.data,
            filter: photoWithFilter.filter,
          };
        })
      );

      // Use the first photo for QR code and view URL
      const firstPhoto = uploadedPhotos[0];
      const receiptId = `receipt-${firstPhoto.photoId}`;
      const timestamp = new Date().toISOString();

      // Save all photos as a receipt group
      const receiptPhotos = uploadedPhotos.map(p => ({
        photoId: p.photoId,
        cloudinaryUrl: p.cloudinaryUrl,
        timestamp,
      }));

      await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: firstPhoto.photoId,
          cloudinaryUrl: firstPhoto.cloudinaryUrl,
          timestamp,
          receiptId,
          photos: receiptPhotos,
        }),
      });

      // Save individual photos too
      for (const uploadedPhoto of uploadedPhotos) {
        await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId: uploadedPhoto.photoId,
            cloudinaryUrl: uploadedPhoto.cloudinaryUrl,
            timestamp,
          }),
        });
      }

      const encodedReceiptId = encodeURIComponent(receiptId);
      const viewUrl = `${window.location.origin}/photo/${encodedReceiptId}?receiptId=${encodedReceiptId}`;
      setViewUrl(viewUrl);

      // Generate QR code pointing to receipt view
      const qrDataUrl = await QRCode.toDataURL(viewUrl, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      // Generate receipt-style PDF with scrapbook style
      const numPhotos = uploadedPhotos.length;
      const receiptWidth = 80; // mm - receipt width
      const photoSize = numPhotos === 1 ? 50 : numPhotos === 2 ? 35 : 28; // Size per photo
      const spacing = 5;
      const headerHeight = 18;
      const footerHeight = 35;
      const totalHeight = headerHeight + (photoSize * numPhotos) + (spacing * (numPhotos - 1)) + footerHeight + 25;
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [receiptWidth, totalHeight],
      });

      // Receipt header - styled like a real receipt
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, receiptWidth, headerHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PHOTOBOOTH', receiptWidth / 2, 10, { align: 'center' });
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', receiptWidth / 2, headerHeight + 3, { align: 'center' });

      // Add photos to PDF with scrapbook style (angled)
      let currentY = headerHeight + 8;
      const centerX = receiptWidth / 2;
      const angles = [-8, 5, -5]; // Rotation angles for scrapbook effect

      for (let i = 0; i < uploadedPhotos.length; i++) {
        const photoData = uploadedPhotos[i].localData;
        const img = new Image();
        img.src = photoData;
        
        await new Promise((resolve) => {
          img.onload = () => {
            const aspectRatio = img.width / img.height;
            let finalWidth = photoSize;
            let finalHeight = finalWidth / aspectRatio;
            
            // Constrain height
            if (finalHeight > photoSize) {
              finalHeight = photoSize;
              finalWidth = finalHeight * aspectRatio;
            }
            
            // Scrapbook style - offset positions and slight rotation
            const angle = angles[i] || 0;
            const offsetX = i === 0 ? -2 : i === 1 ? 2 : -1; // Slight horizontal offset
            const xPos = centerX - (finalWidth / 2) + offsetX;
            
            // Add subtle shadow effect (offset)
            pdf.setFillColor(200, 200, 200);
            pdf.rect(xPos + 1.5, currentY + 1.5, finalWidth, finalHeight, 'F');
            
            // Draw the photo with rotation (9th parameter is rotation in degrees)
            pdf.addImage(photoData, 'JPEG', xPos, currentY, finalWidth, finalHeight, undefined, undefined, angle);
            
            currentY += finalHeight + spacing;
            resolve(null);
          };
        });
      }

      // Receipt footer
      currentY += 5;
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(5, currentY, receiptWidth - 5, currentY);
      currentY += 6;

      // Date and time - clean and minimal
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${dateStr} • ${timeStr}`, receiptWidth / 2, currentY, { align: 'center' });
      
      // QR code
      currentY += 7;
      const qrSize = 20;
      const qrX = (receiptWidth - qrSize) / 2;
      pdf.addImage(qrDataUrl, 'PNG', qrX, currentY, qrSize, qrSize);

      // Footer line
      currentY += qrSize + 5;
      pdf.line(5, currentY, receiptWidth - 5, currentY);
      pdf.setFontSize(5.5);
      pdf.text('Thanks for visiting!', receiptWidth / 2, currentY + 3, { align: 'center' });

      // Download PDF
      pdf.save(`photo-receipt-${firstPhoto.photoId}${numPhotos > 1 ? `-${numPhotos}photos` : ''}.pdf`);

      setIsUploading(false);
      setIsGeneratingPDF(false);
      setPdfGenerated(true);
      
      // Reset photos but keep viewUrl visible
      setPhotos([]);
      setCapturedPhoto(null);
      setSelectedFilter('none');
    } catch (error: any) {
      console.error('Error:', error);
      const errorMessage = error?.message || 'Failed to upload photo or generate PDF';
      alert(`Error: ${errorMessage}\n\nCheck the browser console for more details.`);
      setIsUploading(false);
      setIsGeneratingPDF(false);
    }
  };

  const reset = () => {
    setCapturedPhoto(null);
    setPhotos([]);
    setSelectedFilter('none');
    setPdfGenerated(false);
    setViewUrl(null);
    setCountdown(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    stopCamera();
  };

  // Attach stream to video element when it's rendered
  useEffect(() => {
    if (isCapturing && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      // Set srcObject if not already set
      if (!video.srcObject || video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      // Ensure video plays
      video.play().catch((err) => {
        console.error('Video play error:', err);
      });
    }
  }, [isCapturing]);

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      {/* Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="text-9xl font-bold text-white"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              {countdown}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl w-full">
        {isCapturing ? (
          // Camera View - Show this first when capturing
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center shadow-2xl" style={{ minHeight: '500px' }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[600px] object-contain"
                style={{ transform: 'scaleX(-1)', display: 'block' }}
              />
              <canvas ref={canvasRef} className="hidden" />
            </motion.div>
            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={startCountdown}
                disabled={countdown !== null}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-4 px-8 rounded-xl transition-colors disabled:cursor-not-allowed shadow-lg"
                aria-label="Take photo"
              >
                <Camera className="w-5 h-5" aria-hidden="true" />
                Take Photo
              </motion.button>
              <motion.button
                onClick={stopCamera}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-6 rounded-xl transition-colors"
                aria-label="Cancel and stop camera"
              >
                <X className="w-5 h-5" aria-hidden="true" />
                Cancel
              </motion.button>
            </div>
          </motion.div>
        ) : pdfGenerated ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              className="inline-block"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto" />
              </motion.div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3"
              style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
            >
              Receipt Generated!
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, delay: 0.4, repeat: 1 }}
              >
                <PartyPopper className="w-8 h-8 text-yellow-500" />
              </motion.div>
            </motion.h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Your photo receipt has been downloaded. Check your downloads folder!
            </p>
            {viewUrl && (
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 max-w-md mx-auto">
                <p className="text-sm font-medium text-gray-700 mb-3">Share your photo:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={viewUrl}
                    className="flex-1 p-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-mono text-gray-900"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(viewUrl);
                      alert('URL copied!');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    aria-label="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <motion.button
              onClick={reset}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-4 px-8 rounded-xl transition-colors shadow-lg"
            >
              <RotateCcw className="w-5 h-5" aria-hidden="true" />
              Take More Photos
            </motion.button>
          </motion.div>
        ) : !capturedPhoto && photos.length === 0 ? (
          // Landing Page
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            {cameraError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md mx-auto shadow-sm"
                role="alert"
              >
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" aria-hidden="true" />
                  <p className="text-sm font-medium">{cameraError}</p>
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-6xl md:text-7xl font-bold text-gray-900 leading-tight text-balance"
                style={{ fontFamily: 'var(--font-instrument-serif), serif' }}
              >
                Your Photos
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="inline-block mx-4 md:mx-6"
                >
                  <ArrowRight className="inline-block w-10 h-10 md:w-12 md:h-12 text-blue-500" aria-hidden="true" />
                </motion.span>
                <span className="italic font-normal">to receipt</span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-gray-600 max-w-2xl mx-auto text-pretty"
              >
                Transform your moments into beautiful receipt-style prints. 
                <br />Up to 3 photos per receipt.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <motion.button
                onClick={startCamera}
                disabled={isLoadingCamera}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group inline-flex items-center gap-3 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-4 px-8 rounded-xl transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                aria-label={isLoadingCamera ? 'Starting camera' : 'Start camera to take photos'}
              >
                {isLoadingCamera ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <span className="text-lg">Let's go</span>
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
                    >
                      <ArrowRight className="w-5 h-5" aria-hidden="true" />
                    </motion.div>
                  </>
                )}
              </motion.button>
            </motion.div>

            {isLoadingCamera && (
              <p className="text-sm text-gray-600">Please allow camera access when prompted</p>
            )}
          </motion.div>
        ) : !capturedPhoto && photos.length > 0 ? (
          // Photo Gallery - Ready to generate
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>
                <Images className="w-6 h-6" aria-hidden="true" />
                Your Receipt ({photos.length}/3)
              </h2>
              {photos.length < 3 && (
                <motion.button
                  onClick={startCamera}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md"
                  aria-label="Add another photo"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add Photo
                </motion.button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {photos.map((photoWithFilter, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg"
                >
                  <img
                    src={photoWithFilter.data}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <motion.button
                    onClick={() => removePhoto(index)}
                    initial={{ opacity: 0, scale: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full size-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </motion.div>
              ))}
              {photos.length < 3 && (
                <motion.button
                  onClick={startCamera}
                  whileHover={{ scale: 1.05, borderColor: '#3b82f6' }}
                  whileTap={{ scale: 0.95 }}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center group"
                  aria-label="Add photo"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
                  </motion.div>
                </motion.button>
              )}
            </div>

            <div className="flex gap-3 justify-center pt-4">
              <motion.button
                onClick={uploadAndGeneratePDF}
                disabled={isUploading || isGeneratingPDF || photos.length === 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-4 px-8 rounded-xl transition-colors disabled:cursor-not-allowed shadow-lg"
                aria-label={isUploading || isGeneratingPDF ? 'Processing PDF' : 'Generate receipt PDF'}
              >
                {isUploading || isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    Creating Receipt...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" aria-hidden="true" />
                    Generate Receipt
                  </>
                )}
              </motion.button>
              <motion.button
                onClick={reset}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-6 rounded-xl transition-colors"
                aria-label="Start over"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
                Reset
              </motion.button>
            </div>
          </motion.div>
        ) : capturedPhoto ? (
          // Filter Selection After Capture
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-gray-900 text-center" style={{ fontFamily: 'var(--font-instrument-serif), serif' }}>Choose a Filter</h2>
            
            <div className="relative rounded-xl overflow-hidden border-2 border-gray-200">
              <img
                src={capturedPhoto}
                alt="Captured photo preview"
                className={`w-full h-auto ${filterStyles[selectedFilter]}`}
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {filters.map((filter) => (
                <motion.button
                  key={filter.value}
                  onClick={() => setSelectedFilter(filter.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-xl font-medium text-sm transition-all ${
                    selectedFilter === filter.value
                      ? 'bg-gray-900 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  aria-label={`Apply ${filter.name} filter`}
                  aria-pressed={selectedFilter === filter.value}
                >
                  <div className={`mb-1 flex justify-center ${selectedFilter === filter.value ? 'text-white' : 'text-gray-600'}`}>
                    <FilterIcon type={filter.value} />
                  </div>
                  <div className="text-xs">{filter.name}</div>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3 justify-center">
              <motion.button
                onClick={addPhotoWithFilter}
                disabled={photos.length >= 3}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white font-medium py-4 px-8 rounded-xl transition-colors disabled:cursor-not-allowed shadow-lg"
                aria-label="Add photo to receipt"
              >
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                {photos.length >= 3 ? 'Max 3 Photos' : 'Add to Receipt'}
              </motion.button>
              <motion.button
                onClick={() => {
                  setCapturedPhoto(null);
                  setSelectedFilter('none');
                  startCamera();
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-4 px-6 rounded-xl transition-colors"
                aria-label="Retake photo"
              >
                <RotateCcw className="w-5 h-5" aria-hidden="true" />
                Retake
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
