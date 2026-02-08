# Photobooth

A web application that captures photos, applies filters, and generates receipt-style PDFs with QR codes for sharing.

## Features

- Camera capture with live preview
- Photo filters (vintage, warm, cool, black & white, sepia, vibrant, pastel)
- Up to 3 photos per receipt
- Automatic PDF generation in receipt format
- QR code generation for photo sharing
- Cloudinary integration for photo storage
- Photo viewer accessible via QR code

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Cloudinary (image storage)
- jsPDF (PDF generation)
- QRCode (QR code generation)

## Setup

1. Install dependencies:
```bash
cd web-app
npm install
```

2. Configure environment variables:
Create a `.env.local` file in the `web-app` directory with:
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

- `web-app/app/page.tsx` - Main photobooth interface
- `web-app/app/api/photos/route.ts` - API endpoint for photo metadata
- `web-app/app/photo/[id]/` - Photo viewer pages
- `web-app/app/api/cloudinary-fetch/` - Cloudinary fetch endpoint

## Deployment

The project is configured for Vercel deployment. See `vercel.json` for configuration.

## Notes

- Photo metadata is stored in-memory (use a database for production)
- Camera access requires HTTPS in production
- PDFs are generated client-side using jsPDF
