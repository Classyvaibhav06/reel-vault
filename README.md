# 🎬 Reel Vault

A **Next.js 14 PWA** that lets you save Instagram Reels via Android's native share sheet. Google Gemini AI auto-generates a title and 2–3 tags for each reel. All reels are saved to Supabase and shown in a dark, glassmorphism card grid with search and tag filters.

---

## ✨ Features

- 📲 **Web Share Target API** — share any Instagram reel directly from Android's share sheet
- 🤖 **Gemini AI** — auto-generates a catchy title and 2–3 relevant tags from the URL
- 🗄️ **Supabase** — all reels persisted in PostgreSQL
- 🔍 **Search & Filter** — search by title or tag, filter with chip buttons
- 📴 **Offline Support** — works offline via service worker caching
- 🌙 **Dark Mode UI** — glassmorphism, gradients, smooth animations

---

## 🚀 Setup

### 1. Clone & Install

```bash
git clone <your-repo>
cd reel-storage
npm install
```

### 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your keys:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
GEMINI_API_KEY=AIzaSy...
```

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. Open the **SQL Editor** and run the contents of `supabase/schema.sql`
3. Copy your **Project URL** and **anon key** from Settings → API

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📦 Deploy (Vercel)

```bash
vercel --prod
```

Add the same env variables in Vercel's dashboard under Settings → Environment Variables.

---

## 📲 Install as PWA on Android

1. Open your deployed URL in **Chrome on Android**
2. Tap the **"Add to Home Screen"** prompt (or Menu → Add to Home Screen)
3. Open Instagram → Share a reel → tap **Reel Vault** from the share sheet
4. The reel is automatically saved with AI-generated title and tags! 🎉

---

## 🗂️ Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout with PWA meta tags
│   ├── page.tsx             # Home page — reel grid, search, filters
│   ├── globals.css          # Design system — glassmorphism, animations
│   ├── save/
│   │   ├── page.tsx         # Save page (Share Target destination)
│   │   └── SavePageClient.tsx
│   └── api/
│       ├── save-reel/route.ts   # POST — calls Gemini, saves to Supabase
│       └── get-reels/route.ts   # GET — fetch all reels
├── components/
│   └── ReelCard.tsx         # Reel card with tags, date, link
└── lib/
    └── supabase.ts          # Supabase client + types

public/
├── manifest.json            # PWA manifest with share_target
├── offline.html             # Offline fallback page
└── icon.png                 # App icon

supabase/
└── schema.sql               # DB schema — run this in Supabase SQL editor
```

---

## 🛠️ Tech Stack

| Tool | Purpose |
|---|---|
| Next.js 14 (App Router) | Framework |
| next-pwa | Service Worker & PWA |
| Tailwind CSS | Styling |
| Supabase | Database (PostgreSQL) |
| Google Gemini | AI title & tag generation |
| lucide-react | Icons |
| date-fns | Date formatting |
