# Baccalaureate Study Hub - Instant Native Desktop Launcher
$ErrorActionPreference = "SilentlyContinue"
$projectDir = "c:\Users\Hp\Downloads\baccalaureate-study"
Set-Location $projectDir

# 1. Ensure dist/index.html exists; build only if absent
$distIndex = Join-Path $projectDir "dist\index.html"
if (-not (Test-Path $distIndex)) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run build" -WorkingDirectory $projectDir -Wait -WindowStyle Hidden
}

# 2. Check if Express production server on port 3000 is listening
$portActive = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if (-not $portActive) {
    Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $projectDir -WindowStyle Hidden
    
    # Fast TCP wait (max 3 seconds)
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Milliseconds 100
        $check = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
        if ($check) { break }
    }
}

# 3. Launch Chrome or Edge in standalone app mode
$appUrl = "http://localhost:3000"
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$edgePaths = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

$launched = $false
foreach ($cp in $chromePaths) {
    if (Test-Path $cp) {
        Start-Process -FilePath $cp -ArgumentList "--app=$appUrl"
        $launched = $true
        break
    }
}

if (-not $launched) {
    foreach ($ep in $edgePaths) {
        if (Test-Path $ep) {
            Start-Process -FilePath $ep -ArgumentList "--app=$appUrl"
            $launched = $true
            break
        }
    }
}

if (-not $launched) {
    Start-Process $appUrl
}
