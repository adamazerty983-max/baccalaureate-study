const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const tauriConfig = JSON.parse(fs.readFileSync(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
const cargoToml = fs.readFileSync(path.join(root, 'src-tauri/Cargo.toml'), 'utf8');
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const cargoLockPath = path.join(root, 'src-tauri/Cargo.lock');
const cargoLock = fs.existsSync(cargoLockPath) ? fs.readFileSync(cargoLockPath, 'utf8') : null;
const cargoLockPackage = cargoLock?.match(/\[\[package\]\]\r?\n(?:(?!\[\[package\]\])[\s\S])*?name\s*=\s*"baccalaureate-study-hub"\r?\nversion\s*=\s*"([^"]+)"/m)?.[1];
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const errors = [];

if (!semver.test(packageJson.version)) errors.push('package.json version must be a valid semantic version.');
if (packageLock.version !== packageJson.version || packageLock.packages?.['']?.version !== packageJson.version) {
  errors.push('package-lock.json version does not match package.json. Run npm install after changing the app version.');
}
if (tauriConfig.version !== packageJson.version) errors.push('src-tauri/tauri.conf.json version does not match package.json.');
if (cargoVersion !== packageJson.version) errors.push('src-tauri/Cargo.toml version does not match package.json.');
if (cargoLock && cargoLockPackage !== packageJson.version) errors.push('The desktop package entry in src-tauri/Cargo.lock does not match package.json.');

const tag = process.env.DESKTOP_RELEASE_TAG || process.env.GITHUB_REF_NAME;
if (args.has('--tag')) {
  const tagIndex = process.argv.indexOf('--tag');
  if (tagIndex >= 0 && process.argv[tagIndex + 1]) process.env.DESKTOP_RELEASE_TAG = process.argv[tagIndex + 1];
}
const expectedTag = process.env.DESKTOP_RELEASE_TAG || process.env.GITHUB_REF_NAME;
if (expectedTag && expectedTag !== `v${packageJson.version}`) {
  errors.push(`Release tag ${expectedTag} must exactly match package version v${packageJson.version}.`);
}

if (args.has('--require-signing')) {
  const updaterConfig = tauriConfig.plugins?.updater;
  if (!fs.existsSync(path.join(root, 'src-tauri/Cargo.lock'))) {
    errors.push('src-tauri/Cargo.lock must be generated with Rust/Cargo and committed before release.');
  }
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY) errors.push('GitHub Actions secret TAURI_SIGNING_PRIVATE_KEY is required to sign updater bundles.');
  if (!updaterConfig?.pubkey || updaterConfig.pubkey.includes('REPLACE_WITH_')) {
    errors.push('Replace the public-key placeholder in src-tauri/tauri.conf.json before building a signed release.');
  }
}

if (errors.length > 0) {
  console.error('Desktop release validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Desktop release metadata is consistent for v${packageJson.version}.`);
  if (args.has('--require-signing')) console.log('Required signing inputs are present.');
}
