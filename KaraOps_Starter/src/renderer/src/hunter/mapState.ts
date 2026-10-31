import type {HunterGeometry,HunterStatus,NavigationResult} from '../../../shared/hunterTypes'
import type {LiveStatus} from '../../../shared/liveTypes'

// A route job owns its result/error, not the independently reconstructed map.
export function retainedMap(status:HunterStatus,selectedMapId:number|undefined):HunterGeometry|undefined {
  return status.geometry?.mapId===selectedMapId?status.geometry:undefined
}
export function shownNavigation(status:HunterStatus,g:HunterGeometry):NavigationResult|undefined {
  if(status.state!=='complete')return undefined
  // The latest ordinary navigation takes precedence over an older coffer analysis.
  const coffer=status.jackpot?.aurum
  const result=status.navigation??(coffer?.approved&&coffer.mapId===g.mapId?coffer.navigationResult:undefined)
  return result?.mapId===g.mapId?result:undefined
}
export function validMapFocus(g:HunterGeometry,at:number[],sheet:number):boolean {
  return at.length===3&&at.every(Number.isFinite)&&Number.isInteger(sheet)&&g.plans.some(p=>p.index===sheet)
}
export function telemetryMarker(g:HunterGeometry,status:LiveStatus|undefined){
 const f=status?.state==='tracking'?status.frame:undefined
 if(!f?.foreground||f.identity.mapId!==g.mapId||f.identity.sourceFingerprint!==g.provenance.sourceFingerprint||f.identity.layoutFingerprint!==g.layoutFingerprint||f.identity.assetFingerprint!==g.assetFingerprint)return null
 const [x,y,z]=f.feet,b=g.bounds
 if(x<b.x0-2||x>b.x1+2||z<b.z0-2||z>b.z1+2)return null
 let nearest=g.storeys[0];for(const s of g.storeys)if(!nearest||Math.abs(s.y-y)<Math.abs(nearest.y-y))nearest=s
 if(!nearest||Math.abs(nearest.y-y)>3)return null
 const sheet=g.plans.find(p=>p.storeys.includes(nearest.index))?.index
 return sheet===undefined?null:{x,y,z,yaw:f.yaw,sheet,sequence:f.sequence,epoch:f.epoch}
}
