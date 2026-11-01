import type { KaraOpsBridge } from '../../shared/types'

declare global {
  interface Window {
    karaops: KaraOpsBridge
  }
}
export {}
