# Vaucher App

Angular app for creating/managing document details and exporting documents (PDF/DOCX/XLSX).

## Requirements

- Node.js 20+ (recommended, matches Firebase Functions engine)
- npm

## Install

```bash
npm install
```

## Run (frontend)

```bash
npm start
```

Open `http://localhost:4200`.

## Run (optional local API for development)

This repo includes a small Express dev server ([dev-server.js](dev-server.js)) that exposes `/api/*` endpoints and stores data in a local JSON file.

Start API server:

```bash
npm run dev:api
```

Then start Angular (in another terminal):

```bash
npm start
```

If your Angular dev server is configured with a proxy, it will forward `/api/*` to `http://localhost:4000` (see [proxy.conf.json](proxy.conf.json)).

## Firebase (Realtime Database)

The app is configured to use Firebase Realtime Database (client SDK) and can work without paid Firebase Functions.

- Setup guide: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- Troubleshooting guide: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Deploy to Firebase Hosting

```bash
npm run build
firebase login
firebase deploy --only hosting
```

## Scripts

- `npm start` – Angular dev server
- `npm run dev:api` – local Express API server (port 4000)
- `npm run dev` – runs API + frontend together (platform-dependent)
- `npm run build` – production build
- `npm test` – unit tests
- `npm run serve:ssr:vaucher` – serve SSR build from `dist/` (requires `npm run build` first)

## Notes

- Generated folders like `dist/`, `.angular/`, `.firebase/`, and `node_modules/` are intentionally ignored by git.
- Local development data under `data/` is generated automatically and is not committed.
# vaucher-app
