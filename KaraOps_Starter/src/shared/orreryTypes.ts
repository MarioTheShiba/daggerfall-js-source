export interface ObservedElite {seed:number;hall:number;law:number;stage:string;wake:number;decrees:number[][];fraying:0|1|2;hours?:number[];used?:number}
export interface OrreryStatus {enabled:boolean;phase:'off'|'connecting'|'watching'|'detected'|'stale'|'unsupported'|'error';message:string;revision:number;slot?:number;elite?:ObservedElite}
export interface OrreryBridge {start(port:number):Promise<OrreryStatus>;stop():Promise<OrreryStatus>;status():Promise<OrreryStatus>}
