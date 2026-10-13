# Desktop release workflow

Releases are prepared locally, then published by the tag-triggered GitHub Actions workflow. This keeps website deployment, signing credentials, and release publishing separate.

## Prepare a release

1. Install Rust 1.90 or newer, Cargo, and the Windows C++ build tools. Generate and commit the Rust lockfile once:

   ```powershell
   cargo generate-lockfile --manifest-path src-tauri/Cargo.toml
   ```

2. Generate the Tauri updater signing pair once, following [`DESKTOP_APP.md`](DESKTOP_APP.md). Keep the private key outside the repository and back it up securely.
3. Put the public key text in `src-tauri/tauri.conf.json`, and configure the repository Actions secrets `TAURI_SIGNING_PRIVATE_KEY` and (if the key is password-protected) `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
4. Prepare matching versions:

   ```powershell
   npm run release patch
   npm run lint
   npm test
   npm run build
   npm run build:desktop
   ```

5. Review and commit the version changes. Push the commit to `main` if you want the website deployment workflow to publish it.
6. Create and push a tag that exactly matches the version, for example:

   ```powershell
   git tag v1.0.1
   git push origin v1.0.1
   ```

The tag push is the explicit release action. It triggers `.github/workflows/desktop-release.yml`; the workflow validates the version and signing inputs, runs checks, builds both Tauri and legacy Electron Windows installers, creates a draft, uploads both updater manifests and installers, verifies the signatures/assets, and only then publishes the GitHub Release. The workflow does not push commits or create a tag.

## First release and update test

- The first Tauri installer is the baseline. Install that exact `.exe` on a Windows test machine.
- Increment all versions with `npm run release patch`, commit, and push a matching tag. The release action uploads a signed Tauri installer, its `.sig`, and `latest.json`; it also retains Electron's `latest.yml` and installer assets for existing Electron clients.
- In the installed Tauri app, open **Settings → Application updates → Check for Updates**. Confirm the available version and release notes, choose **Download & Install**, and confirm the signed installer starts. The app closes while Windows installs and restarts it when installation finishes.
- Test offline checking and interrupted downloads on a disposable test install before distributing broadly. Never bypass a signature failure.

## Important

- Do not use the old release behavior that published directly from a developer machine. `npm run release` now updates only local version metadata; it never creates/pushes tags or publishes.
- A release tag must match `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` exactly.
- GitHub Pages remains on its existing `main`/manual workflow and continues to build from `dist/` with `/baccalaureate-study/` as its base path.
- Do not publish while the public-key placeholder remains in the Tauri config. Never store private signing keys in Git, `.env`, frontend code, or workflow logs.
