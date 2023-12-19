const { app, Menu, Tray, globalShortcut, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

function createWindow() {
  const allDisplays = screen.getAllDisplays();
  const combinedBounds = allDisplays.reduce((bounds, display) => {
    bounds.x += display.bounds.x;
    bounds.y += display.bounds.y;
    bounds.width += display.bounds.width;
    bounds.height += display.bounds.height;
    return bounds;
  }, { x: 0, y: 0, width: 0, height: 0 });
  const win = new BrowserWindow({
    width: combinedBounds.width,
    height: combinedBounds.height,
    alwaysOnTop: true,
    frame: false,
    menuBarVisible: false,
    resizable: false,
    transparent: true,
    focusable: false,
    type: 'splash',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Enable preload script
    },
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setPosition(allDisplays[0].bounds.x, allDisplays[0].bounds.y);
  // win.webContents.openDevTools({ mode: 'detach' });

  win.loadFile('index.html');

  ipcMain.on('message-from-renderer', (_event, message) => {
    console.log('Received message from renderer:', message);
  });

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();
  const fps60 = 1000 / 60;
  let interval;
  let crosshairState = "on";

  const tray = new Tray(path.join(__dirname, 'assets', 'icon-active.png'));
  const contextMenu = Menu.buildFromTemplate([{
    label: 'Quit', type: 'normal', click: () => {
      clearInterval(interval);
      app.quit();
    }
  }]);

  function updateCrosshairState(newState) {
    crosshairState = newState;

    switch (crosshairState) {
      case "on":
        interval = setInterval(() => {
          const mousePosition = screen.getCursorScreenPoint();
          const windowPosition = win.getPosition();
          const relativeMousePosition = {
            x: mousePosition.x - windowPosition[0],
            y: mousePosition.y
          };
          win.webContents.send('mouse-update', relativeMousePosition);
        }, fps60);
        win.show();
        tray.setImage(path.join(__dirname, 'assets', 'icon-active.png'));
        break;
      case "off":
        clearInterval(interval);
        win.hide();
        tray.setImage(path.join(__dirname, 'assets', 'icon.png'));
        break;
      case "detached":
        clearInterval(interval);
        win.show();
        tray.setImage(path.join(__dirname, 'assets', 'icon-detached.png'));
        break;
    }
  }

  // Set an interval to check the mouse position every second (1000 milliseconds)
  interval = setInterval(() => {
    const mousePosition = screen.getCursorScreenPoint();
    // relay mouse position to renderer
    // make position relative to the window
    const windowPosition = win.getPosition();

    const relativeMousePosition = {
      x: mousePosition.x - windowPosition[0],
      y: mousePosition.y
    };

    win.webContents.send('mouse-update', relativeMousePosition);
  }, fps60);

  // Update F9 shortcut to toggle on/off state
  globalShortcut.register('F9', () => {
    updateCrosshairState(crosshairState !== "off" ? "off" : "on");
  });

  // F8 shortcut to toggle detached state
  globalShortcut.register('F8', () => {
    if (crosshairState === "detached") {
      updateCrosshairState("on");
    } else {
      updateCrosshairState("detached");
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });


  tray.setContextMenu(contextMenu);
  // Tray icon setup
  tray.on('click', () => {
    if (crosshairState === "detached") {
      updateCrosshairState("on");
    } else {
      updateCrosshairState(crosshairState === "on" ? "off" : "on");
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
