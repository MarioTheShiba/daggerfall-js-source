import { useEffect, useRef, useState } from 'react'
import type { HunterGeometry, HunterCatalog, NavigationRequest, NavigationResult } from '../../../shared/hunterTypes'
import { Navigation } from './Navigation'
import {validMapFocus,telemetryMarker} from './mapState'
import {NavigationBoundary} from './NavigationBoundary'

export function XRay({ geometry: g, catalog, navigation, coffer, telemetry, busy=false, onNavigate }: { geometry: HunterGeometry; catalog: HunterCatalog | null; navigation?: NavigationResult; telemetry?:import('../../../shared/liveTypes').LiveStatus; coffer?:import('../../../shared/jackpotTypes').JackpotStatus['aurum']; busy?: boolean; onNavigate: (request:NavigationRequest)=>void }) {
  const full = { x:g.bounds.x0-3, y:-g.bounds.z1-3, w:g.bounds.x1-g.bounds.x0+6, h:g.bounds.z1-g.bounds.z0+6 }
  const [view,setView] = useState(full)
  const [floor,setFloor] = useState(g.plans.some(p=>p.index===g.entrance?.sheet)?g.entrance!.sheet:g.plans[0]?.index??0)
  const [species,setSpecies] = useState(g.request.species)
  const [copies,setCopies] = useState(false)
  const [doors,setDoors] = useState(true)
  const [stairs,setStairs] = useState(true)
  const [inspect,setInspect] = useState<Record<string,unknown> | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{x:number;y:number;scale:number;view:typeof full} | null>(null)
  const [followFloor,setFollowFloor]=useState(true)
  const player=telemetryMarker(g,telemetry)
  useEffect(()=>{if(followFloor&&player)setFloor(player.sheet)},[followFloor,player?.sheet,player?.sequence])
  const plan = g.plans[floor]
  const markers = g.enemies.filter(e=>e.sheet===floor && (species===-1 || e.mobileType===species) && (copies || !e.eliteCopy))
  const name = (id:number) => catalog?.species.find(s=>s.id===id)?.name ?? `Mobile ${id}`
  const radius = Math.max(.08,view.w/220)
  function focus(at:number[],sheet:number){if(!validMapFocus(g,at,sheet)){setInspect({kind:'Unverified floor projection',at,sheet,reason:'No matching reconstructed map floor; current view retained.'});return}setFloor(sheet);setView(v=>({...v,x:at[0]-v.w/2,y:-at[2]-v.h/2}))}
  const routePath=(points:{at:number[];sheet:number}[])=>points.map((p,i)=>p.sheet===floor?`${i>0&&points[i-1].sheet===floor?'L':'M'}${p.at[0]},${-p.at[2]}`:'').join(' ')
  function zoom(factor:number, anchor?:{x:number;y:number}) {
    setView(v=>{
      const f=Math.max(full.w/64,Math.min(full.w*2,v.w*factor))/v.w
      const p=anchor ?? {x:v.x+v.w/2,y:v.y+v.h/2}
      return {x:p.x+(v.x-p.x)*f,y:p.y+(v.y-p.y)*f,w:v.w*f,h:v.h*f}
    })
  }
  function entrance() {
    if (!g.entrance) return
    if(!validMapFocus(g,[g.entrance.x,g.entrance.y,g.entrance.z],g.entrance.sheet)){setInspect({kind:'Unverified entrance floor; current map retained',...g.entrance});return}
    setFloor(g.entrance.sheet)
    setView(v=>({...v,x:g.entrance!.x-v.w/2,y:-g.entrance!.z-v.h/2}))
    setInspect({kind:'Entrance',...g.entrance})
  }
  useEffect(()=>{
    const el=svg.current
    if(!el)return
    const wheel=(event:WheelEvent)=>{
      event.preventDefault()
      const matrix=el.getScreenCTM();if(!matrix)return
      const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse())
      zoom(Math.exp(Math.max(-.3,Math.min(.3,event.deltaY*.001))),point)
    }
    el.addEventListener('wheel',wheel,{passive:false})
    return ()=>el.removeEventListener('wheel',wheel)
  },[g])
  return <section className="xray" aria-label="Dungeon X-Ray 2D">
    <h2>Dungeon X-Ray · 2D</h2><p>{g.name} · {g.stats.blocks} blocks · {g.stats.storeys} source storeys grouped into {g.plans.length} map floors · {g.cell}m source automap raster · {g.cache?.hit?'cached after fresh input verification':'reconstructed from verified inputs'}</p>
    <p className="hunter-caution">At-rest geometry, not live state or a route. The checked DFO automap reader drops mesh normals; this adapter retains authored facing so ceilings do not become false floors. Floor extraction and stair grouping use the source algorithms.</p>
    {telemetry?.enabled&&<p>Telemetry: {telemetry.state} ? {player?'identity-matched receiver position; game parity not yet certified':'no matching mapped player position'}. {telemetry.discontinuity?'Teleport/discontinuity detected; old routes are not current-position GPS.':''}</p>}
    <div className="xray-tools">
      <label><input type="checkbox" checked={followFloor} onChange={e=>setFollowFloor(e.target.checked)}/>Follow telemetry floor (source nearest-storey rule)</label>
      <label>Map floor<select aria-label="Map floor" value={floor} onChange={e=>setFloor(Number(e.target.value))}>{g.plans.map(p=><option key={p.index} value={p.index}>{p.label} · Y {p.y0.toFixed(1)} to {p.y1.toFixed(1)}m</option>)}</select></label>
      <label>Map species<select aria-label="Map species" value={species} onChange={e=>setSpecies(Number(e.target.value))}><option value="-1">All resolved species</option>{[...new Set(g.enemies.map(e=>e.mobileType))].sort((a,b)=>a-b).map(id=><option key={id} value={id}>{name(id)} ({id})</option>)}</select></label>
      <label><input type="checkbox" checked={copies} onChange={e=>setCopies(e.target.checked)}/>Elite copies</label>
      <label><input type="checkbox" checked={doors} onChange={e=>setDoors(e.target.checked)}/>Doors at rest</label>
      <label><input type="checkbox" checked={stairs} onChange={e=>setStairs(e.target.checked)}/>Stairs / ramps</label>
      <button onClick={()=>zoom(.7)} aria-label="Zoom in">+</button><button onClick={()=>zoom(1/.7)} aria-label="Zoom out">−</button>
      <button onClick={()=>setView(full)}>Fit map</button><button onClick={entrance} disabled={!g.entrance}>Show entrance</button>
    </div>
    <p>{markers.length} resolved enemy records shown on this floor · {(full.w/view.w).toFixed(1)}× zoom. Drag to pan, scroll to zoom, click a marker to inspect. North is +Z (up); east is +X (right). World-local metres remain unchanged between floors.</p>
    <svg ref={svg} className="xray-map" role="img" aria-label="Reconstructed dungeon floor map" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      onPointerDown={e=>{ if((e.target as Element).closest('[data-inspect]'))return; const m=svg.current?.getScreenCTM();if(!m)return; drag.current={x:e.clientX,y:e.clientY,scale:m.a,view};e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={e=>{const d=drag.current;if(d)setView({...d.view,x:d.view.x-(e.clientX-d.x)/d.scale,y:d.view.y-(e.clientY-d.y)/d.scale})}}
      onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}>
      <path d={plan?.fill} className="xray-floor"/>
      <path d={plan?.walls} className="xray-walls" vectorEffect="non-scaling-stroke"/>
      <defs><marker id="nav-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#98f3b1"/></marker></defs>
      {navigation?.routes.map((r,i)=><g key={`${r.id}:${i}`}><path data-route={r.id} d={routePath(r.points)} fill="none" stroke={r.kind==='return'?'#8ecbff':'#98f3b1'} strokeWidth="2.5" strokeDasharray={r.kind==='return'?'6 4':undefined} markerEnd="url(#nav-arrow)" vectorEffect="non-scaling-stroke"><title>{r.kind==='return'?'Return':'Outbound'} motor-replayed route to {r.id}; {r.distance?.toFixed(1)}m</title></path>{r.points.filter((p,k)=>p.sheet===floor&&k>0&&r.points[k-1].sheet!==floor).map((p,k)=><circle key={k} cx={p.at[0]} cy={-p.at[2]} r={radius*1.6} fill="#98f3b1"><title>Validated physical floor transition</title></circle>)}</g>)}
      {navigation?.entrance.sheet===floor&&<circle data-inspect="walk-in" cx={navigation.entrance.at[0]} cy={-navigation.entrance.at[2]} r={radius*2} fill="#cf94ff" onClick={()=>setInspect({kind:'Source walk-in startMarker landing',...navigation.entrance})}><title>Navigation walk-in start (source startMarker)</title></circle>}
      {navigation?.steps.filter(s=>s.sheet===floor&&s.kind==='interaction').map((s,i)=><rect key={i} data-inspect="interaction" x={s.at[0]-radius} y={-s.at[2]-radius} width={radius*2} height={radius*2} fill="#ff91bd" onClick={()=>setInspect({...s})}><title>{s.text}</title></rect>)}
      {navigation?.failures.filter(f=>f.sheet===floor&&f.at).map((f,i)=><path key={i} data-inspect="frontier" d={`M${f.at![0]-radius*2},${-f.at![2]-radius*2}l${radius*4},${radius*4}m${-radius*4},0l${radius*4},${-radius*4}`} stroke="#ff7979" strokeWidth="2" vectorEffect="non-scaling-stroke" onClick={()=>setInspect({...f})}><title>Unverified frontier: {f.reason}</title></path>)}
      {doors && g.doors.filter(d=>d.sheet===floor).map(d=><rect key={d.id} data-inspect="door" x={d.x0} y={-d.z1} width={Math.max(.08,d.x1-d.x0)} height={Math.max(.08,d.z1-d.z0)} className="xray-door" vectorEffect="non-scaling-stroke" onClick={()=>setInspect({kind:'Door',...d})}><title>{`Door at (${d.x.toFixed(2)},${d.y.toFixed(2)},${d.z.toFixed(2)}) · lock ${d.lock} · predicted closed, not live state`}</title></rect>)}
      {stairs && g.stairs.filter(s=>s.from===floor).filter((s,i,all)=>!all.slice(0,i).some(p=>p.to===s.to && Math.hypot(p.x-s.x,p.z-s.z)<6)).map(s=><g key={s.id} data-inspect="stair" data-stair-id={s.id} className="xray-stair" onClick={()=>{setInspect({kind:'Source automap surface join; not a validated route',...s});if(g.plans.some(p=>p.index===s.to))setFloor(s.to)}}>
        <circle cx={s.x} cy={-s.z} r={radius*1.4}/><path d={`M${s.x-s.dx*2},${-s.z+s.dz*2}L${s.x+s.dx*2},${-s.z-s.dz*2}`} vectorEffect="non-scaling-stroke"/>
        <title>{s.from===s.to?'Stair/ramp within this map floor':`Stair/ramp toward ${g.plans[s.to]?.label}. Click to switch floors.`}</title>
      </g>)}
      {markers.map(e=><g key={e.id} data-inspect="enemy" className={e.fixed?'xray-fixed':'xray-random'} onClick={()=>setInspect({kind:e.fixed?'Fixed enemy':'Resolved random enemy',species:name(e.mobileType),...e})}>
        {e.fixed?<rect x={e.x-radius} y={-e.z-radius} width={radius*2} height={radius*2}/>:<circle cx={e.x} cy={-e.z} r={radius} fill={e.eliteCopy?'none':undefined} strokeWidth={e.eliteCopy?radius*.4:radius*.15}/>}
        <title>{`${name(e.mobileType)} (${e.mobileType}) · ${e.fixed?'fixed':'resolved random'} · ${e.eliteCopy?'Elite copy':'base record'} · block ${e.blockIndex} · XYZ ${e.x.toFixed(2)}, ${e.y.toFixed(2)}, ${e.z.toFixed(2)}`}</title>
      </g>)}
      {g.entrance?.sheet===floor && <g data-inspect="entrance" onClick={entrance} className="xray-entrance"><circle cx={g.entrance.x} cy={-g.entrance.z} r={radius*1.7}/><title>Dungeon entrance</title></g>}
      {coffer?.approved&&coffer.foot&&coffer.sheet===floor&&<rect data-inspect="aurum-coffer" x={coffer.foot[0]-radius} y={-coffer.foot[2]-radius} width={radius*2} height={radius*2} fill="#ffdc75" onClick={()=>setInspect({kind:'Verified coffer placement',...coffer})}><title>Aurum coffer; navigation {coffer.navigation}; account {coffer.accountState}</title></rect>}
      {player?.sheet===floor&&<g data-inspect="telemetry-player" transform={`translate(${player.x},${-player.z}) rotate(${player.yaw*180/Math.PI})`} onClick={()=>setInspect({kind:'Received telemetry position; game parity unverified',...player})}><circle r={radius*2} fill="#6bccff"/><path d={`M0,${-radius*4}L${radius*1.5},0L${-radius*1.5},0Z`} fill="#e7f8ff"/><title>Identity-matched telemetry player; source nearest-storey floor assignment</title></g>}
    </svg>
    <p className="xray-legend">Floor fill / boundary walls: source mesh raster · green square: fixed · amber circle: resolved random · hollow: Elite copy · blue: entrance · red: door at rest · cyan: source stair/ramp join.</p>
    {navigation&&<p className="xray-legend">Green arrows: motor-validated outbound traces · blue dashed: validated return · purple: walk-in navigation start · pink: verified ordinary-door interaction. No route is drawn for Unverified objectives. Traces stop at floor boundaries and continue on their matching floors.</p>}
    <details><summary>Inspect enemy records on this floor ({markers.length})</summary><p>Use this list when markers overlap; their coordinates are never spread artificially.</p><div className="hunter-table"><table><thead><tr><th>Species</th><th>Origin</th><th>XYZ metres</th><th>Inspect</th></tr></thead><tbody>{markers.map(e=><tr key={e.id}><td>{name(e.mobileType)} ({e.mobileType})</td><td>{e.fixed?'fixed':'resolved random'} / {e.eliteCopy?'Elite copy':'base'}</td><td>{e.x.toFixed(2)}, {e.y.toFixed(2)}, {e.z.toFixed(2)}</td><td><button onClick={()=>setInspect({kind:e.fixed?'Fixed enemy':'Resolved random enemy',species:name(e.mobileType),...e})}>Inspect {e.id}</button></td></tr>)}</tbody></table></div></details>
    {inspect && <div className="xray-inspector" role="status"><h3>Inspect marker</h3><pre>{JSON.stringify(inspect,null,2)}</pre></div>}
    <NavigationBoundary key={navigation?JSON.stringify([navigation.mapId,navigation.profile,navigation.stats]):'no-route'}><Navigation geometry={g} result={navigation} busy={busy} inspectedId={typeof inspect?.id==='string'?inspect.id:undefined} onNavigate={onNavigate} onFocus={focus}/></NavigationBoundary>
    <details><summary>Geometry provenance and limitations</summary>{g.warnings.map(w=><p key={w}>{w}</p>)}<pre>{JSON.stringify({stats:g.stats,source:g.provenance.sourceFingerprint,assets:g.provenance.assetHashes,worldData:g.provenance.worldData?.fingerprint,request:g.request},null,2)}</pre></details>
  </section>
}
