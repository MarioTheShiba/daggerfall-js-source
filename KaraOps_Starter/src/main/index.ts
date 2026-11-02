import { app, BrowserWindow, clipboard, dialog, ipcMain, session } from 'electron'
import { HunterService } from './hunter/service'
import {CompanionService} from './companion/service'
import {OrreryObserver} from './orrery/observer'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {pathToFileURL} from 'node:url'
import { DEFAULT_SETTINGS, type FolderKind, type KaraOpsSettings } from '../shared/types'

let mainWindow: BrowserWindow | null = null
const rendererUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined
app.commandLine.appendSwitch('disable-background-networking')

// electron-builder sets PORTABLE_EXECUTABLE_DIR to the folder containing KaraOps.exe.
// In development we use Electron's normal userData directory, not the project tree.
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || ''
const dataDir = portableDir
  ? join(portableDir, 'KaraOpsData')
  : join(app.getPath('userData'), 'KaraOpsDev')
mkdirSync(dataDir, { recursive: true })
if (portableDir) {
  const profileDir = join(dataDir, 'ElectronProfile')
  mkdirSync(profileDir, { recursive: true })
  app.setPath('userData', profileDir)
}
const settingsFile = join(dataDir, 'settings.json')
process.env.KARAOPS_APP_PATH=app.getAppPath()
const hunter = new HunterService(app.isPackaged ? join(process.resourcesPath, 'hunter/worker.mjs') : join(app.getAppPath(), 'src/main/hunter/worker.mjs'), dataDir)
const companion=new CompanionService()
const orrery=new OrreryObserver()
app.on('before-quit',()=>orrery.stop())
app.on('before-quit',()=>{void companion.stop()})
app.on('before-quit', () => { void hunter.cancel() })

function cleanSettings(value: unknown): KaraOpsSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_SETTINGS }
  const v = value as Record<string, unknown>
  const safe = (x: unknown): string => typeof x === 'string' ? x.slice(0, 4096) : ''
  return { arena2Path: safe(v.arena2Path), dfoSourcePath: safe(v.dfoSourcePath) }
}

function loadSettings(): KaraOpsSettings {
  try { return cleanSettings(JSON.parse(readFileSync(settingsFile, 'utf8'))) }
  catch { return { ...DEFAULT_SETTINGS } }
}

function saveSettings(value: unknown): KaraOpsSettings {
  const clean = cleanSettings(value)
  const tempFile = `${settingsFile}.tmp`
  mkdirSync(dirname(settingsFile), { recursive: true })
  writeFileSync(tempFile, JSON.stringify(clean, null, 2), 'utf8')
  renameSync(tempFile, settingsFile)
  return clean
}

function verifySender(event: Electron.IpcMainInvokeEvent): void {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Unauthorized IPC sender')
  }
}

function installIpc(): void {
  ipcMain.handle('orrery:start',(event,port:unknown)=>{verifySender(event);return orrery.start(port)})
  ipcMain.handle('orrery:stop',event=>{verifySender(event);return orrery.stop()})
  ipcMain.handle('orrery:status',event=>{verifySender(event);return orrery.status()})
  ipcMain.handle('companion:start',(event,origin:unknown)=>{verifySender(event);companion.setGeometry(hunter.status().geometry);return companion.start(origin)})
  ipcMain.handle('companion:stop',event=>{verifySender(event);return companion.stop()})
  ipcMain.handle('companion:status',event=>{verifySender(event);companion.setGeometry(hunter.status().geometry);return companion.status()})
  ipcMain.handle('jackpot:run',(event,command:unknown)=>{verifySender(event);return hunter.jackpot(loadSettings(),command)})
  ipcMain.handle('jackpot:export',async(event,format:unknown)=>{verifySender(event);if(format!=='csv'&&format!=='json')throw new Error('Invalid export format');const result=hunter.status().jackpot?.ranking;if(!result||!mainWindow)throw new Error('Rank a capture first');const file=await dialog.showSaveDialog(mainWindow,{defaultPath:join(dataDir,'KaraOps-Jackpot.'+format),filters:[{name:format.toUpperCase(),extensions:[format]}]});if(file.canceled||!file.filePath)return null;const mod=await import(/* @vite-ignore */ pathToFileURL(app.isPackaged?join(process.resourcesPath,'hunter/jackpot.mjs'):join(app.getAppPath(),'src/main/hunter/jackpot.mjs')).href);writeFileSync(file.filePath,mod.exportRanking(result,format),'utf8');return file.filePath})

  ipcMain.handle('hunter:navigate',(event,mapId:unknown,request:unknown)=>{verifySender(event);return hunter.navigate(loadSettings(),mapId,request)})
  ipcMain.handle('hunter:map', (event, mapId: unknown) => { verifySender(event); return hunter.map(loadSettings(), mapId) })
  ipcMain.handle('hunter:start', (event, request: unknown) => { verifySender(event); return hunter.start(loadSettings(), request) })
  ipcMain.handle('hunter:status', (event) => { verifySender(event); return hunter.status() })
  ipcMain.handle('hunter:cancel', (event) => { verifySender(event); return hunter.cancel() })
  ipcMain.handle('hunter:history', (event) => { verifySender(event); return hunter.history() })
  ipcMain.handle('hunter:observe', (event, mapId: unknown, count: unknown, notes: unknown) => { verifySender(event); return hunter.observe(mapId, count, notes) })
  ipcMain.handle('hunter:copy', (event, text: unknown) => { verifySender(event); if (typeof text !== 'string' || text.length > 10000) throw new Error('Invalid clipboard text'); clipboard.writeText(text) })
  ipcMain.handle('settings:get', (event) => {
    verifySender(event)
    return loadSettings()
  })
  ipcMain.handle('settings:save', (event, value: unknown) => {
    verifySender(event)
    void hunter.cancel()
    void companion.stop()
    return saveSettings(value)
  })
  ipcMain.handle('folders:choose', async (event, kind: FolderKind) => {
    verifySender(event)
    if (kind !== 'arena2' && kind !== 'source') throw new Error('Unknown folder type')
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: kind === 'arena2' ? 'Select the ARENA2 folder' : 'Select DFO source directory',
      properties: ['openDirectory']
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })
  ipcMain.handle('app:info', (event) => {
    verifySender(event)
    return { version: app.getVersion(), mode: portableDir ? 'portable' : 'development', dataDir }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'KaraOps',
    width: 1190,
    height: 780,
    minWidth: 860,
    minHeight: 600,
    backgroundColor: '#0b1018',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  // Packaged UI and settings are entirely local; deny remote requests before dispatch.
  if (app.isPackaged) {
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_details, callback) => callback({ cancel: true }))
  }
  session.defaultSession.setPermissionCheckHandler(() => false)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))
  installIpc()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
