import { app, protocol, BrowserWindow } from 'electron';
import {
  createProtocol,
} from 'vue-cli-plugin-electron-builder/lib';

const fs = require('fs');
const path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';

let win;

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } },
]);

function createWindow() {
  const wndOptions = {
    width: 700,
    height: 740,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
    },
  };

  try {
    const isProdMode = process.mainModule.filename && process.mainModule.filename.includes('app.asar');
    const appPath = isProdMode ? path.join(process.resourcesPath, '..') : app.getAppPath();
    const stateFilePath = appPath + '\\state.json';
    if (fs.existsSync(stateFilePath)) {
      const state = JSON.parse(fs.readFileSync(stateFilePath)).window;
      wndOptions.width = state.width;
      wndOptions.height = state.height;
      wndOptions.x = state.left;
      wndOptions.y = state.top;
    }

    win = new BrowserWindow(wndOptions);

    if (isProdMode) {
      win.setMenu(null);
    }
  } catch (err) {
    fs.writeFileSync('c:\\sudoku_error.log', JSON.stringify({
      error: err,
    }, null, 2), 'utf-8');
  }

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL);
    if (!process.env.IS_TEST) win.webContents.openDevTools();
  } else {
    createProtocol('app');
    win.loadURL('app://./index.html');
  }

  win.on('closed', () => {
    win = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

app.on('ready', async () => {
  createWindow();
});

if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit();
      }
    });
  } else {
    process.on('SIGTERM', () => {
      app.quit();
    });
  }
}
