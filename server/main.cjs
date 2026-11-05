const { app, BrowserWindow, protocol, net, shell, Menu, ipcMain, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Register privileged custom scheme before app ready
// Note: allowServiceWorkers is explicitly omitted so desktop does not run service workers
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

const isDev = process.env.ELECTRON_DEV === 'true' || process.argv.includes('--dev');
let mainWindow = null;

// Updater settings persistence in userData (single source of truth for main process)
let settingsFilePath = '';
let updaterSettings = {
  autoDownload: true,
  autoInstallOnAppQuit: false,
};

function getSettingsFilePath() {
  if (!settingsFilePath) {
    settingsFilePath = path.join(app.getPath('userData'), 'updater-settings.json');
  }
  return settingsFilePath;
}

function loadUpdaterSettings() {
  try {
    const file = getSettingsFilePath();
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (typeof parsed.autoDownload === 'boolean') updaterSettings.autoDownload = parsed.autoDownload;
      if (typeof parsed.autoInstallOnAppQuit === 'boolean') updaterSettings.autoInstallOnAppQuit = parsed.autoInstallOnAppQuit;
    }
  } catch (err) {
    console.warn('[Updater Settings] Could not load updater-settings.json:', err.message);
  }
}

function saveUpdaterSettings(patch) {
  if (typeof patch.autoDownload === 'boolean') updaterSettings.autoDownload = patch.autoDownload;
  if (typeof patch.autoInstallOnAppQuit === 'boolean') updaterSettings.autoInstallOnAppQuit = patch.autoInstallOnAppQuit;
  try {
    fs.writeFileSync(getSettingsFilePath(), JSON.stringify(updaterSettings, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Updater Settings] Could not save updater-settings.json:', err.message);
  }
  autoUpdater.autoDownload = updaterSettings.autoDownload;
  autoUpdater.autoInstallOnAppQuit = updaterSettings.autoInstallOnAppQuit;
}

/**
 * Validate external URLs: strictly https and allowlisted host (github.com).
 * Reject everything else to prevent arbitrary URL launching.
 */
function validateExternalUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') return false;
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'github.com' || host.endsWith('.github.com');
  } catch {
    return false;
  }
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getAppIcon() {
  if (process.platform === 'win32') {
    const icoPath = path.join(__dirname, '../public/app_icon.ico');
    if (fs.existsSync(icoPath)) return icoPath;
  }
  const pngPath = path.join(__dirname, '../public/original_icon_512.png');
  if (fs.existsSync(pngPath)) return pngPath;
  return undefined;
}

function setupCustomProtocol() {
  const distDir = path.join(__dirname, '../dist');

  protocol.handle('app', (request) => {
    const parsedUrl = new URL(request.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Root path points to index.html
    if (!pathname || pathname === '/') {
      pathname = '/index.html';
    }

    // Strip repository subpath if present (e.g. /baccalaureate-study/assets/...)
    if (pathname.startsWith('/baccalaureate-study')) {
      pathname = pathname.replace(/^\/baccalaureate-study/, '') || '/index.html';
    }

    let filePath = path.join(distDir, pathname);

    // Guard against directory traversal attacks
    const normalizedDist = path.resolve(distDir);
    const normalizedPath = path.resolve(filePath);
    if (!normalizedPath.startsWith(normalizedDist)) {
      return new Response('Forbidden', { status: 403 });
    }

    // SPA routing fallback: if asset does not exist on disk, return index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    return net.fetch(url.pathToFileURL(filePath).toString());
  });
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Fichier',
      submenu: [isMac ? { role: 'close' } : { role: 'quit', label: 'Quitter' }],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Actualiser' },
        { role: 'forceReload', label: 'Actualiser de force' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Fenêtre',
      submenu: [
        { role: 'minimize', label: 'Réduire' },
        { role: 'zoom', label: 'Agrandir' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close', label: 'Fermer' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'Baccalaureate Study Hub - منصة التحضير للبكالوريا',
    icon: getAppIcon(),
    backgroundColor: '#0c121e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  createApplicationMenu();

  // Show window smoothly when content is ready to prevent any white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open target external links in user default browser (strictly validated)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (validateExternalUrl(targetUrl)) {
      shell.openExternal(targetUrl);
    } else {
      console.warn('[Security] Refused to open untrusted external URL:', targetUrl);
    }
    return { action: 'deny' };
  });

  // Load URL
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    setupCustomProtocol();
    mainWindow.loadURL('app://localhost/index.html');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initAutoUpdater() {
  autoUpdater.logger = console;
  // Apply persisted settings directly
  autoUpdater.autoDownload = updaterSettings.autoDownload;
  autoUpdater.autoInstallOnAppQuit = updaterSettings.autoInstallOnAppQuit;

  if (process.env.ELECTRON_UPDATER_URL) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: process.env.ELECTRON_UPDATER_URL,
    });
  }

  function sendStatusToWindow(status, extra = {}) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status, ...extra });
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('checking');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('available', {
      version: info?.version,
      releaseNotes: typeof info?.releaseNotes === 'string' ? info.releaseNotes : Array.isArray(info?.releaseNotes) ? info.releaseNotes.map(n => n.note).join('\n') : undefined,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('not-available', {
      version: info?.version,
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow('downloading', {
      percent: Math.floor(progressObj?.percent || 0),
      transferred: progressObj?.transferred,
      total: progressObj?.total,
      bytesPerSecond: progressObj?.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('downloaded', {
      version: info?.version,
      releaseNotes: typeof info?.releaseNotes === 'string' ? info.releaseNotes : Array.isArray(info?.releaseNotes) ? info.releaseNotes.map(n => n.note).join('\n') : undefined,
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater Error:', err);
    sendStatusToWindow('error', {
      message: err == null ? 'unknown' : (err.message || err.toString()),
    });
  });

  // IPC Handlers
  ipcMain.handle('updater:check', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (err) {
      console.warn('Manual update check failed:', err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle('updater:restart-and-install', () => {
    // isSilent: false, isForceRunAfter: true (ensures automatic restart into updated build)
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('updater:get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('updater:get-settings', () => {
    return { ...updaterSettings };
  });

  ipcMain.handle('updater:set-settings', (_event, patch) => {
    saveUpdaterSettings(patch || {});
    return { ...updaterSettings };
  });

  ipcMain.handle('updater:open-external', async (_event, targetUrl) => {
    if (validateExternalUrl(targetUrl)) {
      await shell.openExternal(targetUrl);
      return { success: true };
    }
    console.warn('[Security] Refused to open untrusted external URL via IPC:', targetUrl);
    return { success: false, error: 'Untrusted URL' };
  });

  // Check for updates on startup (after 5s delay so UI loads smoothly)
  if (!isDev || process.env.ELECTRON_UPDATER_URL) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.log('Initial update check skipped or failed:', err.message);
      });
    }, 5000);

    // Periodic check every 4 hours while running
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 4 * 60 * 60 * 1000);
  }
}

app.whenReady().then(async () => {
  // Purge desktop service worker and cache storage ONLY before loading the window.
  // CRITICAL: indexeddb and localstorage are NEVER included, protecting all student study data!
  try {
    await session.defaultSession.clearStorageData({
      storages: ['serviceworkers', 'cachestorage'],
    });
  } catch (err) {
    console.warn('[Storage Cleanup] Failed to clear stale service worker caches:', err.message);
  }

  // Synchronously load updater settings before creating window or starting updater
  loadUpdaterSettings();
  createWindow();
  initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
