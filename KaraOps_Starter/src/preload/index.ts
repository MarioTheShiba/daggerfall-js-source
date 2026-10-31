import { contextBridge, ipcRenderer } from 'electron'
import type { KaraOpsBridge } from '../shared/types'

// Explicit, narrow API. Never expose raw ipcRenderer or Node primitives to the UI.
const api: KaraOpsBridge = {
  hunter: {
    navigate: (mapId, request) => ipcRenderer.invoke('hunter:navigate',mapId,request),
    map: (mapId) => ipcRenderer.invoke('hunter:map', mapId),
    start: (request) => ipcRenderer.invoke('hunter:start', request),
    status: () => ipcRenderer.invoke('hunter:status'),
    cancel: () => ipcRenderer.invoke('hunter:cancel'),
    history: () => ipcRenderer.invoke('hunter:history'),
    observe: (mapId, actualCount, notes) => ipcRenderer.invoke('hunter:observe', mapId, actualCount, notes),
    copy: (text) => ipcRenderer.invoke('hunter:copy', text)
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  chooseFolder: (kind) => ipcRenderer.invoke('folders:choose', kind),
  getAppInfo: () => ipcRenderer.invoke('app:info')
}

contextBridge.exposeInMainWorld('karaops', api)
