export interface KaraOpsSettings {
  arena2Path: string
  dfoSourcePath: string
}

export type FolderKind = 'arena2' | 'source'

export interface AppInfo {
  version: string
  mode: 'portable' | 'development'
  dataDir: string
}

export interface KaraOpsBridge {
  orrery: import('./orreryTypes').OrreryBridge
  companion: import('./liveTypes').CompanionBridge
  jackpot: import('./jackpotTypes').JackpotBridge
  hunter: import('./hunterTypes').HunterBridge
  getSettings(): Promise<KaraOpsSettings>
  saveSettings(settings: KaraOpsSettings): Promise<KaraOpsSettings>
  chooseFolder(kind: FolderKind): Promise<string | null>
  getAppInfo(): Promise<AppInfo>
}

export const DEFAULT_SETTINGS: KaraOpsSettings = { arena2Path: '', dfoSourcePath: '' }
