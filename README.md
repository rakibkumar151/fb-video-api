# VidSnap – Free Video Downloader

A beautiful, premium-looking video downloader web app. Paste any Instagram, TikTok, YouTube, or Facebook video link and download instantly — no watermark, no signup.

## ✨ Features
- Supports Instagram Reels, TikTok, YouTube, Facebook, Twitter/X and 1000+ sites
- Instant in-browser video preview before download
- Copy direct video link to clipboard
- Fully responsive design (mobile + desktop)
- Dark glassmorphism UI with smooth animations
- 100% free, no ads, no account required

## 🚀 Deployment

### Vercel (Recommended)
1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import the GitHub repo
4. Set **Root Directory** to `web` (or the folder containing `index.html`)
5. Click **Deploy** — that's it!

### Local Preview
Just open `index.html` in your browser. No build step needed.

## 🔌 API
Uses the backend at `https://videoapi-c4eq.onrender.com/get_video?url=<encoded-url>`

## 📁 File Structure
```
web/
├── index.html      # Main page
├── style.css       # All styles (glassmorphism dark theme)
├── app.js          # Download logic & API integration
├── vercel.json     # Vercel deployment config
└── README.md
```
