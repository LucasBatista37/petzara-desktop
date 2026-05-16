'use strict';

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const APP_URL = 'https://app.petzara.app';

// Error codes that indicate no internet connection
const OFFLINE_ERROR_CODES = [-2, -6, -105, -106, -109, -137, -3];

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    title: 'Petzara',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
    show: false, // show after ready-to-show to avoid white flash
  });

  // Remove native menu on all platforms
  Menu.setApplicationMenu(null);

  // Show window gracefully once content is ready
  win.once('ready-to-show', () => {
    win.show();
  });

  win.loadURL(APP_URL);

  // Offline / load error handling
  win.webContents.on('did-fail-load', (_event, errorCode, _errorDescription, validatedURL) => {
    // Ignore sub-resource failures; only handle main-frame navigation failures
    if (validatedURL !== APP_URL && !validatedURL.startsWith(APP_URL + '/')) return;

    if (OFFLINE_ERROR_CODES.includes(errorCode)) {
      win.loadFile(path.join(__dirname, 'offline.html'));
    }
  });

  // Open external links in the default OS browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Intercept in-page navigations that leave app.petzara.app
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(APP_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
