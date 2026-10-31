export interface LiveIdentity {mapId:number;sourceFingerprint:string;assetFingerprint:string;layoutFingerprint:string}
export interface LiveFrame {
 schema:1;streamId:string;sequence:number;epoch:number;identity:LiveIdentity
 feet:number[];yaw:number;pitch:number;foreground:boolean
 viewProjection:number[];viewport:{x:number;y:number;width:number;height:number;dpr:number}
}
export interface LiveStatus {
 enabled:boolean;state:'off'|'waiting'|'tracking'|'stale'|'mismatch'|'hidden'|'error';reason:string
 endpoint?:string;token?:string;origin?:string;ageMs?:number;frame?:LiveFrame;discontinuity?:boolean
}
export interface CompanionBridge {start(origin:string):Promise<LiveStatus>;stop():Promise<void>;status():Promise<LiveStatus>}
