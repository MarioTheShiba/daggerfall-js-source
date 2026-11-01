export interface OrreryStatus {
  enabled: boolean
  phase: 'off' | 'connecting' | 'watching' | 'detected' | 'error'
  message: string
  slot?: number
  room?: string
  port?: number
}
export interface OrreryBridge {
  start(port: number): Promise<OrreryStatus>
  stop(): Promise<OrreryStatus>
  status(): Promise<OrreryStatus>
}
