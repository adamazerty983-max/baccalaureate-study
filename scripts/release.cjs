/**
 * Prepare matching SemVer values for the web, Electron, and Tauri packages.
 * This script only edits local version metadata. It never creates tags, pushes,
 * publishes a GitHub Release, or handles signing credentials.
 *
 * Usage:
 *   npm run release patch
 *   npm run release minor
 *   npm run release 1.2.3
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
const tauri = readJson(tauriPath);
const currentVersion = pkg.version;
const newVersion = nextVersion(currentVersion, bump);
const cargo = fs.readFileSync(cargoPath, 'utf8');
const cargoLock = fs.existsSync(cargoLockPath) ? fs.readFileSync(cargoLockPath, 'utf8') : null;

if (lock.version !== currentVersion || lock.packages?.['']?.version !== currentVersion) {
  fail('package-lock.json version is already out of sync. Run npm install before preparing a release.');
}
if (tauri.version !== currentVersion) fail('Tauri version is already out of sync with package.json.');
if (!/^\[package\][\s\S]*?^version\s*=\s*"[^"]+"/m.test(cargo)) {
  fail('Could not find the package version in src-tauri/Cargo.toml.');
}
const cargoLockPackagePattern = /^(\[\[package\]\]\r?\n(?:(?!\[\[package\]\])[^\r\n]*\r?\n)*?name\s*=\s*"baccalaureate-study-hub"\r?\nversion\s*=\s*)"[^"]+"/m;
if (cargoLock && !cargoLockPackagePattern.test(cargoLock)) {
  fail('Could not find the desktop package entry in src-tauri/Cargo.lock.');
}

console.log(`Current version: v${currentVersion}`);
console.log(`Prepared version: v${newVersion}`);
console.log('This command only updates local metadata; it does not tag, push, build, or publish.');

if (dryRun) {
  console.log('Dry run: no files changed.');
  process.exit(0);
}

pkg.version = newVersion;
lock.version = newVersion;
lock.packages[''].version = newVersion;
tauri.version = newVersion;
const updatedCargo = cargo.replace(
  /(^\[package\][\s\S]*?^version\s*=\s*)"[^"]+"/m,
  `$1"${newVersion}"`
);
const updatedCargoLock = cargoLock?.replace(cargoLockPackagePattern, `$1"${newVersion}"`);

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
fs.writeFileSync(tauriPath, `${JSON.stringify(tauri, null, 2)}\n`, 'utf8');
fs.writeFileSync(cargoPath, updatedCargo, 'utf8');
if (updatedCargoLock) fs.writeFileSync(cargoLockPath, updatedCargoLock, 'utf8');

console.log('Updated package.json, package-lock.json, src-tauri/tauri.conf.json, and Cargo version metadata.');
console.log(`After reviewing the changes and configuring the signing key, create and push tag v${newVersion} to start the release workflow.`);
