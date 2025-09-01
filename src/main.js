const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { exec } = require('child_process');
const { shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const fixPath = require('fix-path');

let mainWindow = null;
let filepath = '';

if (process.platform !== 'win32') {
  fixPath();
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const checkGdalInstall = async () => {
  return new Promise((resolve, reject) => {
    exec('gdal_translate --version', (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

const gdalNotInstalled = async (error) => {
  const choice = await dialog.showMessageBox({
    type: 'error',
    title: 'GDAL Not Found',
    message: 'GDAL is required but not found on your system. Please install GDAL to use this application.',
    detail: error.message,
    buttons: ['Open Download Page', 'Quit'],
    defaultId: 0,
    cancelId: 1
  });

  if (choice.response === 0) {
    await shell.openExternal('https://gdal.org/en/stable/download.html');
  }
};

const createWindow = async () => {
  try {
    await checkGdalInstall();
  } catch (error) {
    await gdalNotInstalled(error);
    app.quit();
    return;
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hiddenInset'
  });

  ipcMain.on('change-pdf', changePdf);
  ipcMain.on('save-pdf', (event, ulLat, ulLong, lrLat, lrLong) => {
    savePdf(ulLat, ulLong, lrLat, lrLong);
  });

  // Show file dialog
  filepath = await openPDF();
  if (!filepath) {
    app.quit();
    return;
  }

  // Load the index.html of the app
  await mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Send the selected PDF path to the renderer
  mainWindow.webContents.send('pdf-file', filepath);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
const openPDF = async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (result.canceled) {
    return null;
  } else {
    return result.filePaths[0];
  }
}

const changePdf = async () => {
  const newFilepath = await openPDF();
  if (newFilepath) {
    filepath = newFilepath;
    mainWindow.webContents.send('pdf-file', filepath);
  }
}

const savePdf = async (ulLat, ulLong, lrLat, lrLong) => {
  try {
    await checkGdalInstall();
  } catch (error) {
    await gdalNotInstalled(error);
    return;
  }

  const dir = path.dirname(filepath);
  const ext = path.extname(filepath); // Should just be .pdf, but handle it anyway
  const basename = path.basename(filepath, ext);
  
  const newFilename = `${basename}_Geo${ext}`;
  
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Georeferenced PDF',
    defaultPath: path.join(dir, newFilename),
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  });

  if (!result.canceled && result.filePath) {
    // Create temporary file for WKT
    const wktContent = `GEOGCRS["WGS 84",
    ENSEMBLE["World Geodetic System 1984 ensemble",
        MEMBER["World Geodetic System 1984 (Transit)"],
        MEMBER["World Geodetic System 1984 (G730)"],
        MEMBER["World Geodetic System 1984 (G873)"],
        MEMBER["World Geodetic System 1984 (G1150)"],
        MEMBER["World Geodetic System 1984 (G1674)"],
        MEMBER["World Geodetic System 1984 (G1762)"],
        MEMBER["World Geodetic System 1984 (G2139)"],
        MEMBER["World Geodetic System 1984 (G2296)"],
        ELLIPSOID["WGS 84",6378137,298.257223563,
            LENGTHUNIT["metre",1]],
        ENSEMBLEACCURACY[2.0]],
    PRIMEM["Greenwich",0,
        ANGLEUNIT["degree",0.0174532925199433]],
    CS[ellipsoidal,2],
        AXIS["geodetic latitude (Lat)",north,
            ORDER[1],
            ANGLEUNIT["degree",0.0174532925199433]],
        AXIS["geodetic longitude (Lon)",east,
            ORDER[2],
            ANGLEUNIT["degree",0.0174532925199433]],
    USAGE[
        SCOPE["Horizontal component of 3D system."],
        AREA["World."],
        BBOX[-90,-180,90,180]],
    ID["EPSG",4326]]`;
    
    const tmpFile = path.join(os.tmpdir(), `wkt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.wkt`);
    
    try {
      fs.writeFileSync(tmpFile, wktContent, 'utf8');
      
      exec(`gdal_translate -a_srs "${tmpFile}" -a_ullr ${ulLong} ${ulLat} ${lrLong} ${lrLat} "${filepath}" "${result.filePath}"`, (error, stdout, stderr) => {
        // Clean up the temporary file
        fs.unlinkSync(tmpFile);
        
        if (error) {
          dialog.showErrorBox('Error', stderr || error.message);
          return;
        }
        shell.showItemInFolder(result.filePath);
      });
    } catch (error) {
      dialog.showErrorBox('Error', error.message);
      // Make sure to clean up if there was an error
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  }
}