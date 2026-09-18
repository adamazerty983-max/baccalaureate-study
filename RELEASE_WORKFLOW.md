# Release & Auto-Update Workflow

This guide details how releases are built, published to GitHub Releases, and automatically distributed to desktop installations of **Baccalaureate Study Hub** using `electron-updater`.

---

## 1. Prerequisites

### A. GitHub Personal Access Token (`GH_TOKEN`)
To publish releases directly to GitHub Releases via `electron-builder`, you need a Personal Access Token with repository permissions:
1. Go to [GitHub Tokens Settings](https://github.com/settings/tokens) (Classic or Fine-grained).
2. Generate a new token with the `repo` scope (or `contents:write` for fine-grained tokens).
3. Export the token into your shell environment before running releases:
   - **PowerShell (Windows)**:
     ```powershell
     $env:GH_TOKEN = "ghp_yourPersonalAccessTokenHere"
     ```
   - **Bash / macOS / Linux**:
     ```bash
     export GH_TOKEN="ghp_yourPersonalAccessTokenHere"
     ```

### B. GitHub Repository Configuration
In `electron-builder.json`, ensure the `publish` block matches your target repository:
```json
"publish": {
  "provider": "github",
  "owner": "YOUR_GITHUB_USERNAME_OR_ORG",
  "repo": "baccalaureate-study",
  "releaseType": "release"
}
```

---

## 2. Release Commands

We provide a streamlined release script (`scripts/release.cjs`):

```bash
# Bump patch version (e.g., 1.0.0 -> 1.0.1) and publish to GitHub Releases
npm run release

# Or specify a bump type:
npm run release minor   # (e.g., 1.0.0 -> 1.1.0)
npm run release major   # (e.g., 1.0.0 -> 2.0.0)

# Or set an explicit semantic version:
npm run release 1.0.5

# Test the build locally without uploading to GitHub:
npm run release -- --dry-run
```

### What `npm run release` Does Automatically:
1. **Validates Semantic Versioning** (ensures SemVer format `X.Y.Z`).
2. **Bumps Version** in `package.json`.
3. **Builds Production Web Assets** (`npm run build` -> `dist/`).
4. **Packages Electron Standalone Executables** for your OS (`--win` or `--mac`).
5. **Generates Update Manifests** (`latest.yml` for Windows, `latest-mac.yml` for macOS) containing SHA-512 hashes, block maps, and binary sizes.
6. **Uploads Draft/Release** assets directly to GitHub Releases using `GH_TOKEN`.

---

## 3. GitHub Releases & Update Manifests

When a release finishes, the following artifacts are hosted under `https://github.com/OWNER/REPO/releases/tag/vX.Y.Z`:

| File | Platform | Description |
|---|---|---|
| `Baccalaureate-Study-Hub-Setup-X.Y.Z.exe` | Windows | NSIS full desktop installer |
| `Baccalaureate-Study-Hub-Setup-X.Y.Z.exe.blockmap` | Windows | Differential block map (enables fast delta downloads) |
| `latest.yml` | Windows | Version metadata, SHA-512 hashes, and release date for auto-updater |
| `Baccalaureate-Study-Hub-X.Y.Z-x64.dmg` / `.zip` | macOS | Disk image / archive installer |
| `latest-mac.yml` | macOS | macOS version metadata and checksums |

---

## 4. How Desktop Clients Detect & Apply Updates

1. **Launch Check**: 5 seconds after application boot, `electron/main.cjs` contacts the GitHub Releases API (via `electron-updater`) to check `latest.yml` or `latest-mac.yml`.
2. **Periodic Check**: Every 4 hours while running, `autoUpdater.checkForUpdates()` runs automatically in the background.
3. **Background Download**:
   - When a newer version is found, `electron-updater` silently downloads the update package in the background.
   - Download progress (`percent`, `transferred`, `bytesPerSecond`) is dispatched via IPC to the renderer.
   - An unobtrusive in-app banner displays the progress bar.
4. **User Confirmation (No Forced Restarts)**:
   - Once the download is complete, the banner updates to **"Update Ready to Install"** (`Mise à jour prête à installer !`).
   - The user is presented with two options:
     - **Restart & Update**: Calls `autoUpdater.quitAndInstall()`, safely closing the app and launching the installer.
     - **Later**: Dismisses the banner so the student can finish their study session without interruption.

---

## 5. Code Signing & Operating System Trust

### Windows SmartScreen
- **Unsigned Binaries**: If released without an EV (Extended Validation) code-signing certificate, Windows Defender SmartScreen will display an *"Unknown Publisher"* warning banner upon initial download.
- **Remedy for Users**: Users must click **"More info"** (`Informations complémentaires`) -> **"Run anyway"** (`Exécuter quand même`).
- **Production Code Signing**:
  To eliminate SmartScreen warnings, configure a Code Signing Certificate in `electron-builder.json` (or environment variables `CSC_LINK` and `CSC_KEY_PASSWORD`).

### macOS Gatekeeper
- **Unsigned / Unnotarized Binaries**: macOS Gatekeeper strictly prevents launching unsigned third-party applications, and `electron-updater` cannot silently auto-update unsigned `.app` bundles on macOS without Apple Notarization.
- **Remedy for Users (Without Developer Account)**:
  Right-click `Baccalaureate Study Hub.app` -> **Open** -> click **Open** in the dialog; or run:
  ```bash
  xattr -cr "/Applications/Baccalaureate Study Hub.app"
  ```
- **Production Apple Notarization**:
  To support seamless zero-click background updates on macOS, sign with an Apple Developer ID Application certificate and configure `notarize` in `electron-builder.json` with `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD`.

---

## 6. Offline Support & Testing

To test update detection locally without creating a real GitHub Release:
1. Run a local HTTP server serving a test `latest.yml`.
2. Launch Electron with the test feed URL:
   ```powershell
   $env:ELECTRON_UPDATER_URL = "http://localhost:9876"
   npm run electron:dev
   ```
3. The app will connect to your local test server, log detection in the console, and display the update banner in the UI.
