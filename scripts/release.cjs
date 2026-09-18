/**
 * Release & Publishing Automation Script for Baccalaureate Study Hub
 *
 * Usage:
 *   node scripts/release.cjs [patch|minor|major|<specific-version>] [--dry-run] [--skip-publish]
 *
 * Examples:
 *   npm run release patch
 *   npm run release 1.0.1
 *   npm run release -- --dry-run
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');

// 1. Parse CLI arguments
const rawArgs = process.argv.slice(2);
const isDryRun = rawArgs.includes('--dry-run') || rawArgs.includes('-d');
const isSkipPublish = rawArgs.includes('--skip-publish') || isDryRun;
const cleanArgs = rawArgs.filter((arg) => !arg.startsWith('--') && !arg.startsWith('-'));

const bumpTypeOrVersion = cleanArgs[0] || 'patch';

// 2. Validate SemVer helper
const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;

function parseSemVer(version) {
  const match = version.match(SEMVER_REGEX);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
    build: match[5] || '',
  };
}

function bumpVersion(currentVersion, bumpType) {
  const parsed = parseSemVer(currentVersion);
  if (!parsed) {
    throw new Error(`Current version "${currentVersion}" in package.json is not valid semver.`);
  }

  if (bumpType === 'major') {
    return `${parsed.major + 1}.0.0`;
  } else if (bumpType === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  } else if (bumpType === 'patch') {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  } else {
    // Treat as explicit version
    if (!SEMVER_REGEX.test(bumpType)) {
      throw new Error(
        `Invalid version bump "${bumpType}". Must be "major", "minor", "patch", or an exact semver like "1.0.1".`
      );
    }
    return bumpType;
  }
}

// 3. Read current package.json
const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkgData.version;
const newVersion = bumpVersion(currentVersion, bumpTypeOrVersion);

console.log('====================================================');
console.log('🚀 Baccalaureate Study Hub Release Builder');
console.log('====================================================');
console.log(`Current version: v${currentVersion}`);
console.log(`Target version:  v${newVersion}`);
console.log(`Dry-run mode:    ${isDryRun ? 'YES (No publish)' : 'NO'}`);
console.log('----------------------------------------------------');

// 4. Validate GitHub Token requirement
const ghToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!ghToken && !isSkipPublish) {
  console.error('\n❌ ERROR: GH_TOKEN or GITHUB_TOKEN environment variable is not set!');
  console.error('Publishing to GitHub Releases requires a Personal Access Token with "repo" scope.\n');
  console.error('To set it in PowerShell:');
  console.error('   $env:GH_TOKEN="ghp_yourPersonalAccessTokenHere"');
  console.error('   npm run release\n');
  console.error('Or run a local package test without publishing:');
  console.error('   npm run release -- --dry-run\n');
  process.exit(1);
}

// 5. Update package.json version
if (!isDryRun) {
  pkgData.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8');
  console.log(`✔ Updated package.json version to ${newVersion}`);
} else {
  console.log(`[Dry-Run] Skipped writing new version to package.json`);
}

// 6. Execute Build
console.log('\n📦 Step 1: Building production web bundle (vite build)...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('✔ Web bundle built successfully.');
} catch (err) {
  console.error('❌ Web build failed:', err.message);
  process.exit(1);
}

// 7. Execute Electron Builder with publish
const publishFlag = isSkipPublish ? '--publish never' : '--publish always';
console.log(`\n🔨 Step 2: Packaging Electron app with electron-builder (${publishFlag})...`);

try {
  const isWin = process.platform === 'win32';
  const targetFlag = isWin ? '--win' : '--mac';
  const builderCmd = `npx electron-builder ${targetFlag} ${publishFlag}`;
  console.log(`Running: ${builderCmd}`);
  execSync(builderCmd, { cwd: rootDir, stdio: 'inherit' });
  console.log('\n✔ Standalone packaging completed successfully!');
} catch (err) {
  console.error('❌ electron-builder failed:', err.message);
  process.exit(1);
}

console.log('\n====================================================');
console.log(`🎉 Release v${newVersion} finished successfully!`);
if (!isSkipPublish) {
  console.log('Releases and update manifests (latest.yml) were uploaded to GitHub Releases.');
} else {
  console.log('Artifacts generated in the release/ directory (local build).');
}
console.log('====================================================\n');
