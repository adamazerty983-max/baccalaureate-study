# Run Doc — Bac Hub (Vite + React 19)

## Reproduce artifacts for a fresh checkout

1. Install dependencies with npm (project has `package-lock.json`; a `bun.lock` also exists but the scripts/npm flow is canonical here):
   ```
   npm install
   ```
2. Copy env config from the main checkout (procedures only — never commit values):
   - `.env` — contains Firebase web config and API keys consumed by `src/services/firestoreService.ts` and `src/services/aiService.ts` (the latter reads `VITE_NVIDIA_API_KEY`).
   - If a `.env.local` exists in the main checkout, copy it too (none at time of writing).
   - Vite only exposes vars prefixed with `VITE_` to the client bundle.

## Run the dev server

```
npm run dev
```

- Script: `vite --port=3000 --host=0.0.0.0` → app at http://localhost:3000
- Default port 3000; if taken, pick a free port with `npm run dev -- --port=<free>` (or pass `--port` to vite).
- Typecheck: `npm run lint` (tsc --noEmit). Production build: `npm run build`.

## Preview detach recipe (Windows, used by this workspace)

```
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -WorkingDirectory 'C:\Users\Hp\Downloads\baccalaureate-study' -RedirectStandardOutput '<log>' -RedirectStandardError '<log>.err' -WindowStyle Hidden -PassThru).Id"
```

- stdout → `<log>`, stderr → `<log>.err` (must be different files).
- Confirm with `powershell -NoProfile -Command "Get-Process -Id <pid>"`, then wait for http://localhost:3000 to answer before registering the preview.
