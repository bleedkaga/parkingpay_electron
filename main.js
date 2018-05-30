const {app, BrowserWindow, autoUpdater, dialog,  ipcMain} = require('electron')
const path = require('path')
const url = require('url')
const config = require('./config.js')
const updateServer = 'https://github.com/bleedkaga/parkingpay_electron'
const updateFeedBack = `${updateServer}/releases/tag/${app.getVersion()}`

let win;

function createWindow () {
  // Create the browser window.
  const dialogOpts = {
    type: 'info',
    buttons: ['更新', '忽略'],
    title: '应用更新',
    message: '来自停吧的提示',
    detail: '停吧收费有新的更新， 是否现在更新？'
  }
  

  win = new BrowserWindow({width: 1100, height: 1080})
  win.maximize();
  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  ipcMain.on('openconsole', () => {
    win.webContents.openDevTools()
  })

  ipcMain.on('online-status-changed', (event, status) => {
    console.log(status)
  })

  ipcMain.on('load', event => {
    const request = {
      station_id: config.readSetting('station_id'),
      server: config.readSetting('server'),
      pid: config.readSetting('pid'),
      api: config.readSetting('api'),
      sync: config.readSetting('sync'),
      checkpay: config.readSetting('checkpay'),
      monitor: config.readSetting('monitor'),
    }
        
    event.sender.send('asychronous-request', JSON.stringify(request))
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.