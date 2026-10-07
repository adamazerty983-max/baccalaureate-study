# Baccalaureate Study Hub

Offline-first study companion for Baccalaureate (French/Arabic) students. Tracks
exams, homework, lecture notes, time-blocked study sessions, spaced-repetition
revision, habits, grades and goals — with cloud sync across devices, and a
packaged Electron desktop build.

## Features

| Area | What it does |
| --- | --- |
| Dashboard | Exam countdown, daily KPIs, animated streak flame, today overview |
| Tasks | Priorities, due dates, checklists, per-item change stamps |
| Quizzes | Target vs. actual scores, topics, difficulty, rooms |
| Homework | Progress %, project submissions, checklists |
| Lecture notes | Colours, tags, key formulas, linked deadlines, review reminders |
| Planner | Recurring time blocks with per-occurrence completion records |
| Revision | Spaced repetition (J+1/3/7/14/30) with mastery tracking |
| Average | Coefficient-weighted average + "what-if" simulator |
| Habits | Streaks, daily/weekly frequencies, calendar heatmap |
| Goals | Title, target date, completion |
| Weekly review | Reflection journal keyed by ISO week |

Extras: Focus mode timer, quick-add, keyboard shortcuts, three languages
(`fr` / `ar` / `en`) with RTL support, dark UI skin, PWA install, Web Push
notifications, offline queueing.

## Tech stack

- **Frontend** — React 19, TypeScript, Vite 6, Tailwind CSS 4, lucide-react, canvas-confetti
- **Data** — Supabase (Postgres + Realtime) per user, plus LocalStorage + IndexedDB with merge-based conflict handling
- **Auth** — Firebase Auth (Google / email) only; all study data lives in Supabase
- **Backend** — Express (`server.js`) serving `/api/sync` and `/api/push/*`
- **Desktop** — Electron + electron-builder + electron-updater

## Getting started

```bash
npm install
cp .env.example .env      # then fill in your keys
npm run dev               # http://localhost:3000
```

### Environment

Only these are read by the app:

| Variable | Used by |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Data sync (required) |
| Firebase keys (`VITE_FIREBASE_*`) | Google / email sign-in |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push (optional) |

The deploy workflow (`.github/workflows/deploy.yml`) injects the Supabase pair
at build time, so local builds need a `.env`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm start` | Serve `dist/` + API via Express |
| `npm test` | Vitest suite |
| `npm run lint` | `tsc --noEmit` type check |
| `npm run electron:dev` | Electron in dev mode |
| `npm run electron:build:win` | Windows installer → `release/` |
| `npm run electron:build:mac` | macOS dmg/zip → `release/` |

## Deployment

- **Web** — `npm run build`, then serve `dist/` from any static host. Built with
  `base: /baccalaureate-study/`, so it expects to live at that path.
- **API / Web Push** — needs a *persistent* Node host (Render, Railway, Fly).
  See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) and
  [`docs/WEB_PUSH_GUIDE.md`](docs/WEB_PUSH_GUIDE.md).
- **Desktop** — `npm run electron:build:win`, then `Run_App.bat` launches the
  unpacked build.

## Project layout

```
src/
├─ App.tsx              # root: state, auth listener, sync, modals, shortcuts
├─ components/
│  ├─ Dashboard.tsx
│  ├─ shared/           # sidebar, modals, toasts, badges
│  ├─ tabs/             # 12 lazy-loaded feature tabs
│  └─ gamification/     # streak flame, calendar heatmap
├─ services/            # supabase, firestore (auth only), notifications, web push
├─ utils/               # storage, merge, streak, i18n, audio, focus sessions
├─ lib/                 # firebase + supabase clients
└─ types/               # FullAppData and all domain types
server/                 # electron main/preload + push service
docs/                   # deployment and web push guides
```

## Data model notes

- `FullAppData` is the single sync document per user.
- Writes carry a `updatedAt` stamp; `utils/merge.ts` reconciles concurrent edits
  item-by-item so a stale whole-blob write can never erase a completion.
- Settings force `theme: 'dark'` and `uiStyle: 'mybac'`; those switches are
  vestigial and no longer user-selectable.
