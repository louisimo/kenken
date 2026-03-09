# KenKen 9×9 — PWA

A fully offline-capable 9×9 KenKen arithmetic puzzle game.
Progress saves to your device's localStorage and survives phone restarts.

## Deploy to Vercel (5 minutes)

### Option A — Vercel CLI (fastest)
```bash
npm install -g vercel
cd kenken-pwa
npm install
vercel --prod
```

### Option B — GitHub + Vercel dashboard
1. Create a new GitHub repo (public or private)
2. Push this folder:
   ```bash
   git init
   git add .
   git commit -m "KenKen PWA"
   git remote add origin https://github.com/YOUR_USERNAME/kenken-pwa.git
   git push -u origin main
   ```
3. Go to vercel.com → New Project → Import your repo → Deploy
   (Vercel auto-detects Vite — no settings needed)

## Install on Android as an app
1. Open the deployed URL in Chrome on your Android phone
2. Tap ⋮ menu → "Add to Home Screen"
3. Tap "Add" — done. Opens fullscreen like a native app.

## Local development
```bash
npm install
npm run dev
```

## Notes
- Progress stored in browser localStorage — survives restarts, survives offline
- Works fully offline after first visit (service worker caches all assets)
- Leaderboard is local-only (no server) — shared only on the same device/browser
