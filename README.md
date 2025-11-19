# My Spend Tracker 💰

A mobile-friendly React single-page application for tracking monthly spending. The original static HTML/JS build has been replaced with a modern Vite + React stack while keeping the UI/UX identical.

## Features

- ⚛️ React 18 SPA with client-side routing (`/`, `/add`, `/detail`)
- 📊 Realtime summary cards and Chart.js visualizations
- 🧾 Quick ledger management with filtering and month-level bulk actions
- 📅 Month selector synced to the URL query string (shareable links)
- ☁️ Optional Firebase Firestore sync + automatic localStorage fallback
- 💸 Fixed expenses auto-injected each month via `src/data/fixed-expenses.json`

## Tech Stack

- [React 18](https://react.dev/) + [React Router 6](https://reactrouter.com/)
- [Vite 5](https://vitejs.dev/) for dev server & builds
- [Chart.js 4](https://www.chartjs.org/) for visualizations
- [Firebase v9 compat](https://firebase.google.com/docs/web/modular-upgrade) for Firestore (optional)

## Getting Started

```bash
npm install
npm run dev
```

- The dev server runs at `http://localhost:5173` by default.
- The Month selector and tab links keep the `?month=YYYY-MM` query string so you can bookmark/share the currently selected month.

### Production Build

```bash
npm run build
npm run preview # optional local preview of the dist bundle
```

Deploy the `dist` folder to Netlify, Vercel, GitHub Pages, etc. (Most hosts support Vite builds out of the box.)

## Usage

- **Summary (`/`)** – switch months, review totals, category breakdown, and charts.
- **Add Expense (`/add`)** – add a description, amount, category, and date for the selected month. Form defaults adjust automatically when you change months.
- **Detail (`/detail`)** – filter by category, delete single expenses, or clear the entire month. Category totals display when a filter is active.

Navigation tabs preserve the current month query string so moving between views keeps you in context.

## Data Storage

The data layer mirrors the legacy `ExpenseTracker` logic:

1. **Firebase Firestore (optional)**  
   - Configure credentials in `src/firebase/config.js` (same values as before).  
   - When valid credentials are present the app auto-initializes Firebase, syncs expenses, and migrates existing localStorage data.

2. **localStorage (default fallback)**  
   - Works entirely offline.  
   - Data is device/browser specific. Clearing storage removes expenses.

Fixed monthly charges live in `src/data/fixed-expenses.json`. Update that file to change recurring entries; they are auto-added for each month (current + past year) if missing.

## Deployment Notes

- **Netlify/Vercel**: Connect the repo, set build command to `npm run build`, output directory `dist`.
- **GitHub Pages**: Build locally, push the `dist` folder to `gh-pages`, or use an action such as `peaceiris/actions-gh-pages`.
- **Other static hosts**: Any service that can serve the built `dist` directory will work.

## Key Files

- `vite.config.js` – Vite + React config
- `src/main.jsx` – entry point + router/provider wiring
- `src/App.jsx` – route definitions
- `src/providers/ExpenseTrackerProvider.jsx` – React context + state sync
- `src/lib/ExpenseTracker.js` – shared data layer (Firebase/localStorage logic)
- `src/pages/*.jsx` – Summary, Add Expense, and Detail screens
- `src/styles.css` – shared styling (ported from the legacy build)
- `src/data/fixed-expenses.json` – editable recurring expenses
- `src/firebase/config.js` – Firebase credentials + compat initialization
- `FIREBASE_SETUP.md` – original walkthrough for provisioning Firebase (still valid)

## Legacy Docs

Older Markdown references (e.g., `MOBILE_FIREBASE_DEBUG.md`) are still relevant for troubleshooting even though the runtime is now React/Vite. The UI/UX remains the same—only the implementation changed.

