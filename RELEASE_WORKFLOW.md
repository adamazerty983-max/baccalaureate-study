# Desktop & Web Release Workflow

This document details the single, canonical workflow for releasing updates for **Baccalaureate Study Hub** (Desktop Electron and Web PWA), as well as safety protocols and rollback procedures.

---

## 1. Single Documented Release Pipeline

### Step 1: Pre-Release Quality Checks
Ensure all tests and lint checks pass cleanly before cutting a release:
```bash
# 1. Run full unit test suite (must pass 100%)
npm test

# 2. Verify TypeScript types
npm run lint

# 3. Test production build locally
npm run build
```

### Step 2: Prepare Release & Extract Notes
Update `CHANGELOG.md` under `[Unreleased]` with student-facing notes, then run the release preparation script:
```bash
# Bump version (patch, minor, or major)
npm run release patch
```
This automatically:
- Increments SemVer in `package.json` and `package-lock.json`.
- Extracts release notes from `CHANGELOG.md` and generates `release/release-notes.md`.
- Updates `CHANGELOG.md` with the new version section and release date.

### Step 3: Test Desktop Locally (Smoke Test)
Launch the local desktop app to verify normal startup:
```bash
npm run electron:dev
```

### Step 4: Build & Publish Draft to GitHub
> [!IMPORTANT]
> `electron-builder.json` is configured with `"releaseType": "draft"`.
> Publishing will create a **DRAFT** release on GitHub. **No live users will receive this update** until you manually inspect and publish it on GitHub.
>
> **Hard Rule**: Never run `--publish` or publish any live release without explicit owner approval. Never commit or print `GH_TOKEN`.

In PowerShell:
```powershell
# Set token only in your active terminal session (never commit or hardcode)
$env:GH_TOKEN = "ghp_your_secure_github_token_here"

# Build desktop installer and upload to GitHub as a DRAFT
npm run electron:build -- --publish always
```

### Step 5: Review & Publish Gate on GitHub
1. Open the GitHub Releases page:  
   `https://github.com/adamazerty983-max/baccalaureate-study/releases`
2. Locate the newly uploaded release marked **Draft**.
3. Inspect:
   - Release title (e.g. `v1.0.1`).
   - Release notes body (automatically filled from `release/release-notes.md`).
   - Binaries attached (`Baccalaureate Study Hub-Setup-1.0.1.exe`, `latest.yml`).
4. To test before general availability, you can save as a **Pre-release**.
5. Once verified, click **Publish release**. Live Electron client apps will detect it within 4 hours (or upon next restart) and download it automatically in the background.

---

## 2. Emergency Rollback Procedure

If a published version contains a critical flaw:

### Scenario A: Flaw detected while release is still a DRAFT
- **Action**: Go to GitHub Releases, edit the draft, and click **Delete draft**.
- **Impact**: Zero clients are affected. No updates were distributed.

### Scenario B: Flaw detected AFTER release was published to users
> [!CAUTION]
> Do NOT simply delete the release tag if users have already downloaded it. `electron-updater` compares SemVer numbers; deleting the tag will not downgrade already-updated clients.

- **Immediate Hotfix Procedure**:
  1. Fix the bug on `main` or revert the offending commit (`git revert <commit>`).
  2. Bump a new patch version:
     ```bash
     npm run release patch
     ```
  3. Build and publish the draft hotfix:
     ```powershell
     npm run electron:build -- --publish always
     ```
  4. Inspect the draft on GitHub and click **Publish release**.
  5. Because the patch version is higher (e.g. `v1.0.2` > `v1.0.1`), all client machines will immediately see `v1.0.2` as available, automatically download the fix, and prompt students to restart.

---

## 3. Desktop Safety & Verification Procedures

### (a) Packaged App Launch Verification
Verify that the production package loads cleanly:
```bash
npm run electron:build
```
Open `release/win-unpacked/Baccalaureate Study Hub.exe`. Confirm the window opens smoothly with dark mode, title bar, and all navigation tabs functional.

### (b) Persistent Data Protection Test (Seeded Profile Purge)
To verify that service worker caches are purged on desktop while student study data survives untouched:
1. Open DevTools in Electron (`Ctrl+Shift+I` or from the menu `Affichage -> Outils de développement`).
2. In the **Application / Storage** tab:
   - Check `IndexedDB` (`baccalaureate_study_hub_db`): contains student tasks, pomodoros, notes.
   - Check `LocalStorage`: contains student preferences and local state.
   - Seed a dummy cache in `Cache Storage` (`test-cache-purge`).
3. Close the application.
4. Relaunch the app.
5. In DevTools, inspect storage:
   - **Service Workers**: unregistered (0 registrations).
   - **Cache Storage**: `test-cache-purge` is purged.
   - **IndexedDB**: 100% intact with all user tasks and notes.
   - **LocalStorage**: 100% intact with all user preferences.

### (c) Manual Update Test Steps (Using a Draft / Pre-Release)
1. Prepare a test bump on a feature branch (e.g. `v1.0.1-test.0`).
2. Run `npm run electron:build -- --publish always` with your `GH_TOKEN`.
3. In GitHub Releases, edit the release and ensure it is saved as a **Pre-release** (or draft).
4. Run an older version (e.g. `v1.0.0`) with environment variable:
   ```powershell
   $env:ELECTRON_UPDATER_URL = "https://github.com/adamazerty983-max/baccalaureate-study/releases/download/v1.0.1-test.0"
   ```
5. Confirm that:
   - The update is detected.
   - The `UpdateBanner` displays download progress (`transform: scaleX`).
   - "What's new" opens the sanitized release notes modal.
   - Clicking "Restart & update" relaunches into the new version.
   - Student notes, timer streaks, and tasks remain completely intact.
