/**
 * Prepare matching SemVer values for the web, Electron, and desktop packages,
 * and extract release notes from CHANGELOG.md for electron-builder.
 *
 * Usage:
 *   npm run release patch
 *   npm run release minor
 *   npm run release major
 *   npm run release 1.0.1
 *   npm run release patch -- --dry-run
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');
const tauriPath = path.join(root, 'src-tauri/tauri.conf.json');
const cargoPath = path.join(root, 'src-tauri/Cargo.toml');
const cargoLockPath = path.join(root, 'src-tauri/Cargo.lock');
const changelogPath = path.join(root, 'CHANGELOG.md');
const releaseDir = path.join(root, 'release');
const releaseNotesPath = path.join(releaseDir, 'release-notes.md');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');
const bump = args.find((arg) => !arg.startsWith('-')) || 'patch';
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function fail(message) {
  console.error(`Version preparation failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Could not read ${path.relative(root, filePath)}: ${error.message}`);
  }
}

function nextVersion(currentVersion, bumpArg) {
  if (!semverPattern.test(currentVersion)) fail(`package.json version ${currentVersion} is not SemVer.`);
  if (semverPattern.test(bumpArg)) return bumpArg;

  const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) fail('Only explicit versions can be used when the current version is a prerelease.');
  const [, majorText, minorText, patchText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);
  if (bumpArg === 'major') return `${major + 1}.0.0`;
  if (bumpArg === 'minor') return `${major}.${minor + 1}.0`;
  if (bumpArg === 'patch') return `${major}.${minor}.${patch + 1}`;
  fail(`Unknown version ${bumpArg}. Use patch, minor, major, or an explicit version such as 1.2.3.`);
}

const pkg = readJson(packagePath);
const lock = readJson(lockPath);
const currentVersion = pkg.version;
const newVersion = nextVersion(currentVersion, bump);

if (lock.version !== currentVersion || lock.packages?.['']?.version !== currentVersion) {
  fail('package-lock.json version is already out of sync. Run npm install before preparing a release.');
}

// Handle Tauri if present in the repo
const hasTauri = fs.existsSync(tauriPath) && fs.existsSync(cargoPath);
let tauri = null;
let cargo = null;
let cargoLock = null;
const cargoLockPackagePattern = /^(\[\[package\]\]\r?\n(?:(?!\[\[package\]\])[^\r\n]*\r?\n)*?name\s*=\s*"baccalaureate-study-hub"\r?\nversion\s*=\s*)"[^"]+"/m;

if (hasTauri) {
  tauri = readJson(tauriPath);
  cargo = fs.readFileSync(cargoPath, 'utf8');
  cargoLock = fs.existsSync(cargoLockPath) ? fs.readFileSync(cargoLockPath, 'utf8') : null;

  if (tauri.version !== currentVersion) fail('Tauri version is already out of sync with package.json.');
  if (!/^\[package\][\s\S]*?^version\s*=\s*"[^"]+"/m.test(cargo)) {
    fail('Could not find the package version in src-tauri/Cargo.toml.');
  }
  if (cargoLock && !cargoLockPackagePattern.test(cargoLock)) {
    fail('Could not find the desktop package entry in src-tauri/Cargo.lock.');
  }
}

console.log(`Current version: v${currentVersion}`);
console.log(`Target version:  v${newVersion}`);

// Extract release notes from CHANGELOG.md
let releaseNotes = '';
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const match = changelog.match(/##\s*\[Unreleased\]([\s\S]*?)(?=##\s*\[|$)/i);
  if (match && match[1].trim()) {
    releaseNotes = match[1].trim();
  }
}

if (!releaseNotes) {
  releaseNotes = `### v${newVersion}\n\n- Performance improvements and routine updates.`;
}

console.log('\n--- Release Notes Preview ---');
console.log(releaseNotes);
console.log('-----------------------------\n');

if (dryRun) {
  console.log('Dry run: no files changed.');
  process.exit(0);
}

// Update package.json & lock
pkg.version = newVersion;
lock.version = newVersion;
lock.packages[''].version = newVersion;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');

// Update Tauri if present
if (hasTauri && tauri) {
  tauri.version = newVersion;
  const updatedCargo = cargo.replace(
    /(^\[package\][\s\S]*?^version\s*=\s*)"[^"]+"/m,
    `$1"${newVersion}"`
  );
  const updatedCargoLock = cargoLock?.replace(cargoLockPackagePattern, `$1"${newVersion}"`);

  fs.writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`, 'utf8');
  fs.writeFileSync(cargoPath, updatedCargo, 'utf8');
  if (updatedCargoLock) fs.writeFileSync(cargoLockPath, updatedCargoLock, 'utf8');
}

// Write release/release-notes.md for electron-builder
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}
fs.writeFileSync(releaseNotesPath, releaseNotes, 'utf8');

// Update CHANGELOG.md header with today's date
if (fs.existsSync(changelogPath)) {
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  const updatedChangelog = changelog.replace(
    /##\s*\[Unreleased\]/i,
    `## [Unreleased]\n\n## [${newVersion}] - ${today}`
  );
  fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
}

console.log(`\nSuccessfully prepared v${newVersion}:`);
console.log(`- Updated package.json and package-lock.json`);
if (hasTauri) console.log(`- Updated src-tauri version metadata`);
console.log(`- Wrote release/release-notes.md`);
console.log(`- Updated CHANGELOG.md`);
console.log(`\nNext step to build and publish draft release:`);
console.log(`  $env:GH_TOKEN="ghp_..."; npm run electron:build -- --publish always`);
