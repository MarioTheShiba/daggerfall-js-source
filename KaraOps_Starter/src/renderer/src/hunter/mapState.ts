import type {HunterGeometry,HunterStatus,NavigationResult} from '../../../shared/hunterTypes'

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
