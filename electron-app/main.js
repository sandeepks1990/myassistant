const { app, BrowserWindow, ipcMain, desktopCapturer, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 850,
    minWidth: 800,
    minHeight: 650,
    title: 'Gemini Audio Assistant (PC 1 Controller)',
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Keep audio capture alive even if minimized
    }
  });

  // Enable loopback audio capture handler for system speaker output
  if (session.defaultSession.setDisplayMediaRequestHandler) {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
        if (sources.length > 0) {
          callback({ video: sources[0], audio: 'loopback' });
        } else {
          callback({});
        }
      }).catch(err => {
        console.error('Display media request error:', err);
        callback({});
      });
    });
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: Get available screen/window sources for system audio loopback
ipcMain.handle('get-desktop-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      fetchWindowIcons: true
    });
    return sources.map(s => ({
      id: s.id,
      name: s.name,
      display_id: s.display_id
    }));
  } catch (error) {
    console.error('Error fetching desktop sources:', error);
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
