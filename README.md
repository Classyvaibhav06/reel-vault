# Reel Vault

Reel Vault is a Next.js app for saving and organizing Instagram Reels in one personal library.

You can paste a reel link manually or install the app on Android and save reels straight from the native share sheet. When a reel is saved, the app can use Google Gemini to generate a cleaner title, short caption, category, and tags automatically.

## Why this app is useful

- Save Instagram Reel links in one private vault
- Create separate reel collections per user account
- Auto-generate metadata with Gemini AI
- Search by title, caption, or tags
- Filter by category and tag
- Delete reels you no longer need
- Install as a PWA and use Android share-to-app flow
- Keep a cached view of your vault for a smoother experience

## Main flow

1. Sign in or create an account
2. Paste a public Instagram Reel URL, or share a reel to Reel Vault on Android
3. The app fetches available metadata from the reel page
4. Gemini improves the title, caption, category, and tags when configured
5. The reel is stored in MongoDB and shown in your vault

## Tech stack

- Next.js 14
- React 18
- Tailwind CSS
- MongoDB with Mongoose
- JWT-based auth
- Google Gemini API
- `next-pwa` for installable PWA support

## Project features

### Personal accounts

Each user has their own reel vault. Login and registration are handled with API routes and JWT tokens.

### Smart reel metadata

When `GEMINI_API_KEY` is available, the app tries to:

- clean up the reel title
- write a short caption
- assign a category
- generate useful tags

If Gemini is not configured, the app still works and falls back to the metadata it can extract from the reel page.

### Android share target

The app includes a web share target, so you can install it on Android and save reels directly from Instagram's share sheet.

### Filtering and search

Saved reels can be explored with:

- search
- category chips
- tag chips

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally or a hosted MongoDB connection string
- Optional: a Google Gemini API key

### 1. Install dependencies

```bash
npm install
```

### 2. Create your environment file

Copy `.env.local.example` to `.env.local`.

```bash
cp .env.local.example .env.local
```

If you are on PowerShell, you can use:

```powershell
Copy-Item .env.local.example .env.local
```

### 3. Add environment variables

Use the following values in `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/reel-storage

# Optional but recommended for AI-generated metadata
GEMINI_API_KEY=your_gemini_api_key_here

# Recommended for production
JWT_SECRET=your_long_random_secret
```

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## How to use the app

### Save a reel manually

1. Open the app
2. Sign in or create an account
3. Paste a public Instagram Reel URL into the input box
4. Click `Save`

### Use the Android share sheet

1. Deploy the app to a live HTTPS URL
2. Open the app in Chrome on Android
3. Add it to your home screen
4. Open Instagram
5. Tap `Share` on a reel
6. Choose `Reel Vault`

The shared URL is sent to `/save`, and the app stores it in your vault.

## Important notes

- The share target experience is mainly useful in a deployed production build over HTTPS.
- PWA behavior is disabled during development in `next.config.js`.
- Gemini metadata generation is optional. The app can still save reels without it.
- Only public reel links are likely to work reliably.

## Demo account

The login page includes a demo/admin account:

- Email: `admin@gmail.com`
- Password: `admin123`

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project structure

```text
src/
  app/
    api/
      auth/
        login/route.ts
        register/route.ts
      delete-reel/route.ts
      get-reels/route.ts
      save-reel/route.ts
    login/page.tsx
    save/
      page.tsx
      SavePageClient.tsx
    globals.css
    layout.tsx
    page.tsx
  components/
    ReelCard.tsx
    SaveReelForm.tsx
  lib/
    auth.ts
    mongodb.ts

public/
  manifest.json
  offline.html
  icon.png
```

## Troubleshooting

### Reels are not loading

Check that:

- `MONGODB_URI` is set correctly
- MongoDB is running
- you are logged in

### AI metadata is missing

Check that:

- `GEMINI_API_KEY` is present
- the API key is valid
- the reel page is publicly accessible

### Android share target is not showing up

Check that:

- the app is deployed over HTTPS
- the app is installed on Android
- you are opening it from Chrome

## Future improvements

Ideas you could build next:

- favorites or bookmarks
- notes per reel
- duplicate detection
- thumbnail refresh jobs
- export and import
- better reel preview support

