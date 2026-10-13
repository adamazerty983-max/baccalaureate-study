# Windows desktop app (Tauri 2)

## Architecture

The project remains a React 19 + TypeScript + Vite 6 application. Tauri 2 wraps the same frontend in the Windows WebView2 runtime. The desktop build writes a separate relative-path bundle to `dist-desktop/`; the website build still writes `dist/` with the existing GitHub Pages base path.

The existing Electron shell and `electron-updater` channel remain available for already-installed clients. New Windows releases publish both Electron's `latest.yml` and Tauri's signed `latest.json` in the same GitHub Release. `.github/workflows/deploy.yml` is unchanged.

## Development and builds

Requirements for a local Windows native build: Node.js 20, npm, Rust/Cargo 1.90 or newer, the Visual Studio C++ build tools, and WebView2. Tauri development mode does not need an updater signing key; a signed updater build does.

```powershell
npm ci
npm run dev                 # existing website development server
npm run build               # existing GitHub Pages bundle: dist/
npm run build:desktop       # Tauri frontend only: dist-desktop/
npm run tauri:dev           # native development window
npm run lint
npm test
```

The Windows installer build is `npm run tauri:build`. It deliberately fails before building if the updater signing inputs, matching versions, or committed `src-tauri/Cargo.lock` are missing. Generate that lockfile with:

```powershell
cargo generate-lockfile --manifest-path src-tauri/Cargo.toml
```

Commit the resulting `src-tauri/Cargo.lock` with the desktop source so release builds resolve the same Rust dependency graph.

## Update experience

- Tauri checks once about 3.5 seconds after startup, with a 10-second check timeout. A temporary network error does not block the study app.
- Settings has a manual **Check for Updates** action. The update notice shows current and available versions, release notes, and real download progress when the server reports a content length; if it does not, the notice reports downloaded megabytes without inventing a percentage.
- **Later** saves a per-version dismissal in the app's local WebView storage. Manual checks can show that version again.
- Downloads use the official updater plugin. Signature verification is mandatory and TLS is required. A Windows installation runs in passive mode; the app closes during install and restarts afterward.
- The Tauri updater uses the static signed manifest at `https://github.com/adamazerty983-max/baccalaureate-study/releases/latest/download/latest.json`.
- Electron update behavior remains separate and continues to use Electron's existing `latest.yml` feed.

## Signing key setup (one time)

I did not generate a key or configure repository secrets. Tauri's private signing key authorizes every future app update; losing it prevents installed copies from accepting later releases.

1. On a trusted Windows machine, create a private directory and generate the key pair once:

   ```powershell
   New-Item -ItemType Directory -Force "$env:USERPROFILE\.tauri" | Out-Null
   npm run tauri signer generate -- -w "$env:USERPROFILE\.tauri\baccalaureate-study.key"
   ```

2. Keep the generated `.key` private and backed up. Copy only the generated public-key text into `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`. That public key is safe to commit.
3. In GitHub repository **Settings → Secrets and variables → Actions**, add:

   | Secret | Value |
   | --- | --- |
   | `TAURI_SIGNING_PRIVATE_KEY` | The contents of the generated private `.key` file (never commit it). |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The key passphrase, if set; otherwise omit this secret. |

   `GITHUB_TOKEN` is supplied automatically to the workflow with `contents: write`; no personal access token is needed.

4. Do not put private key material in a Vite variable, `.env`, repository file, or release artifact. Do not generate a replacement key after publishing the first signed release.

## Release sequence

`npm run release patch|minor|major|<version>` changes only local version metadata in `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and (when present) the desktop package entry in `src-tauri/Cargo.lock`. It does not commit, tag, push, or publish. Review and commit those changes, then push a matching SemVer tag such as `v1.0.1` to start the release workflow. See [`RELEASE_WORKFLOW.md`](RELEASE_WORKFLOW.md) for first-release and update-testing steps.

The release workflow builds the existing website bundle, the Electron Windows installer, and a Tauri NSIS installer on Windows. It first creates a draft release, uploads the two updater channels, checks for the Tauri signature and both manifests, then publishes the release. A failing check leaves the release as a draft.

## Study data and feature compatibility

- Tauri's WebView2 profile has its own LocalStorage and IndexedDB. It does not share the browser or Electron profile. Existing data stays where it is; it is not erased by an installer update.
- To move browser-local data, export the app JSON from Settings in the website, install Tauri, then import that JSON from Settings. Alternatively, sign into the same account and allow the existing cloud sync to load. Back up local-only data before moving devices.
- Firebase email/password auth and cloud sync are reused. The existing Google flow uses Firebase `signInWithPopup`; it needs a Windows Tauri smoke test and may require Firebase authorized-domain/OAuth configuration for the WebView origin. Do not assume a browser session carries over.
- Browser service-worker registration is skipped in Tauri. Website PWA/offline caching and Web Push remain unchanged on GitHub Pages; the native Tauri app currently does not include browser push notifications.
- The installer has no Microsoft code-signing certificate configured, so Windows may show SmartScreen's unknown-publisher warning on first install. Updater bundle signatures are separate and remain mandatory.

## Environment and public settings

Cloud sync needs the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` build-time values. The release workflow uses the same public Supabase project values as the existing Pages workflow. Firebase web configuration is bundled from the existing public client config. No new private frontend secret is added.
