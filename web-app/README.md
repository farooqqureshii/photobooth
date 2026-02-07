# Photo Booth - Receipt Generator

A modern photo booth app that captures photos, uploads them to Cloudinary, and generates receipt-style PDFs with QR codes linking to a viewing page.

## Features

- 📸 Capture photos using your laptop camera
- ☁️ Automatic upload to Cloudinary
- 📄 Generate receipt-style PDFs with:
  - Your captured photo
  - QR code linking to the viewing page
  - Date, time, and metadata
- 🌐 Beautiful photo viewing page with download option
- 🎨 Modern, responsive UI

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Cloudinary (Free)

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. In your Cloudinary dashboard, go to **Settings** → **Upload**
3. Create an **Upload Preset**:
   - Name it something like `photobooth`
   - Set **Signing Mode** to **Unsigned** (for easiest setup)
   - Save it
4. Copy your **Cloud Name** from the dashboard

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your Cloudinary credentials in `.env.local`:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=photobooth
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to Vercel (Optional but Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add the same environment variables in Vercel's dashboard
4. Update `NEXT_PUBLIC_BASE_URL` in `.env.local` to your Vercel URL
5. Deploy!

That's it! 🎉

## Usage

1. Click **Start Camera** to access your webcam
2. Click **Capture Photo** when ready
3. Click **Generate Receipt PDF** to:
   - Upload the photo to Cloudinary
   - Generate a PDF with QR code
   - Get a link to view the photo online

The PDF will automatically download, and you can share the QR code or link with others to view the photo.

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Cloudinary** - Image hosting
- **jsPDF** - PDF generation
- **QRCode** - QR code generation

## Notes

- Photos are stored in Cloudinary (free tier: 25GB storage, 25GB bandwidth/month)
- Photo metadata is stored in-memory (resets on server restart)
- For production, consider using a database (PostgreSQL, MongoDB, etc.) for persistent metadata storage
