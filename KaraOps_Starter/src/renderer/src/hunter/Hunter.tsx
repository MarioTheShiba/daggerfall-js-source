import { useEffect, useState } from 'react'
import type { HunterCatalog, HunterHistory, HunterResult, HunterStatus, ScanRequest, NavigationRequest } from '../../../shared/hunterTypes'
import { XRay } from './XRay'
import {Jackpot} from './Jackpot'
import {retainedMap,shownNavigation} from './mapState'

const initial: ScanRequest = { px: 780, py: 100, radius: 15, species: 34, level: 1, region: -1, minTargets: 1, eliteOnly: true, alternate: false, profile: 'dex-mudex' }
const bridge = () => window.karaops.hunter
const directions = (r: HunterResult): string => r.nearest ? `${r.name}: tile (${r.px}, ${r.py}). From ${r.nearest.name} (${r.nearest.px}, ${r.nearest.py}): ${Math.abs(r.nearest.dx)} tiles ${r.nearest.dx < 0 ? 'west' : 'east'}, ${Math.abs(r.nearest.dy)} tiles ${r.nearest.dy < 0 ? 'north' : 'south'}. Geometric offset only; travel route and live availability unverified.` : `Tile ${r.px}, ${r.py}; no nearby town indexed.`

export function Hunter() {
  const [request, setRequest] = useState(initial)
  const [coordinates,setCoordinates]=useState({px:String(initial.px),py:String(initial.py)})
  const [status, setStatus] = useState<HunterStatus>({ id: 0, state: 'idle', progress: { phase: 'Choose Validate data to load the local source and ARENA2' } })
  const [catalog, setCatalog] = useState<HunterCatalog | null>(null)
  const [history, setHistory] = useState<HunterHistory>({ observations: [] })
  const [error, setError] = useState('')
  const [selection, setSelection] = useState<number | null>(null)
  const [sort, setSort] = useState('targets')
  const [actual, setActual] = useState('')
  const [notes, setNotes] = useState('')
  const [now, setNow] = useState(Date.now())
  const [started, setStarted] = useState(Date.now())
  const busy = status.state === 'running'
  useEffect(() => {
    let active = true, polling = false
    void bridge().history().then(value => { if (active) { setHistory(value); if (value.lastRequest){setRequest(value.lastRequest);setCoordinates({px:String(value.lastRequest.px),py:String(value.lastRequest.py)})} } }).catch(e => { if (active) setError(String(e)) })
    const poll = async () => {
      if (polling) return
      polling = true
      try { const value = await bridge().status(); if (active) { setStatus(value); if (value.catalog) setCatalog(value.catalog); setNow(Date.now()) } }
      catch (e) { if (active) setError(String(e)) } finally { polling = false }
    }
    void poll()
    const timer = setInterval(() => { void poll() }, 500)
    return () => { active = false; clearInterval(timer) }
  }, [])
  const patch = (value: Partial<ScanRequest>) => {setRequest(r => ({ ...r, ...value }));if(value.px!==undefined||value.py!==undefined)setCoordinates(c=>({px:value.px!==undefined?String(value.px):c.px,py:value.py!==undefined?String(value.py):c.py}))}
  function coordinate(axis:'px'|'py',value:string){setCoordinates(c=>({...c,[axis]:value}));if(/^-?\d+$/.test(value))setRequest(r=>({...r,[axis]:Number(value)}))}
  async function start(validate: boolean) {
    if(!validate&&(!/^-?\d+$/.test(coordinates.px)||! /^-?\d+$/.test(coordinates.py))){setError('Enter whole signed world coordinates before scanning.');return}
    setError(''); setSelection(null); setStarted(Date.now())
    try { const id = await bridge().start(validate ? null : request); setStatus({ id, state: 'running', progress: { phase: 'Loading local data' } }) }
    catch (e) { setError(String(e)) }
  }
  async function observe(bookmark: boolean) {
    if (!selected) return
    try { setHistory(await bridge().observe(selected.mapId, bookmark ? null : Number(actual), notes)); setError(bookmark ? 'Bookmark saved locally.' : 'Manual observation saved with source, assets, level and scenario.'); setNotes('') }
    catch (e) { setError(String(e)) }
  }
  async function openMap() {
    if (!selected) return
    setError(''); setStarted(Date.now())
    try { const id=await bridge().map(selected.mapId); setStatus(s=>({...s,id,state:'running',geometry:undefined,progress:{phase:'Reconstructing source automap geometry'}})) }
    catch(e) { setError(String(e)) }
  }
  async function navigate(request:NavigationRequest){
    if(!status.geometry)return
    setError('');setStarted(Date.now())
    try{const id=await bridge().navigate(status.geometry.mapId,request);setStatus(s=>({...s,id,state:'running',navigation:undefined,progress:{phase:'Baking source traversal graph and validating routes'}}))}
    catch(e){setError(String(e))}
  }
  const results = [...(status.scan?.results ?? [])].sort((a, b) => sort === 'distance' ? a.distance - b.distance :sort==='province'?a.province.localeCompare(b.province)||b.count-a.count:sort==='purity'?b.dragonlingPercentage-a.dragonlingPercentage||b.count-a.count:b.count - a.count || a.distance - b.distance)
  const selected = results.find(r => r.mapId === selection) ?? results[0]
  const geometry=retainedMap(status,selected?.mapId)
  const progress = busy || status.geometry || status.state==='analysis_error' ? status.progress : status.scan?.stats ?? status.progress
  const provenance = status.scan?.provenance ?? catalog?.provenance
  return <section className="hunter">
    <div className="eyebrow">OFFLINE / TAMRIEL DUNGEON HUNTER / v0.6</div>
    <h1>Find your quarry.</h1>
    <Jackpot status={status} requestValid={/^-?\d+$/.test(coordinates.px)&&/^-?\d+$/.test(coordinates.py)} request={request} onInspect={id=>setSelection(id)}/>
    <p className="lead">Source-generated online layouts, resolved enemy populations, and a floor-based 2D X-Ray. Live availability and reachability remain unknown.</p>
    <div className="hunter-caution">Bounded searches across source Tamriel theatres. Original ARENA2, traced geography, source-generated roads and curated blocks. External world-data/land edits, runtime quests and live spawn clocks are not reproduced. Cyrodiil's open zone excludes generated spawns. This is not an exhaustive world scan.</div>
    <div className="hunter-controls">
      <button type="button" disabled={busy} onClick={() => void start(true)}>Validate data</button>
      <label>Province / theatre<select disabled={busy||!catalog} value={request.theatre??-1} onChange={e=>patch({theatre:Number(e.target.value),region:-1})}><option value="-1">Any theatre in search circle</option>{catalog?.theatres.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Jump search center to province<select disabled={busy||!catalog} value="" onChange={e=>{const t=catalog?.theatres.find(t=>t.id===Number(e.target.value));if(t)patch({px:t.px,py:t.py,theatre:t.id,region:-1})}}><option value="">Choose source theatre…</option>{catalog?.theatres.map(t=><option key={t.id} value={t.id}>{t.name} ({t.px},{t.py})</option>)}</select></label>
      <label>Retain best 100 by<select disabled={busy} value={request.rankBy??'targets'} onChange={e=>patch({rankBy:e.target.value as 'targets'|'purity'})}><option value="targets">Selected species count</option><option value="purity">Dragonling population purity</option></select></label>
      <label>Species<select value={request.species} onChange={e => patch({ species: Number(e.target.value) })} disabled={busy}>
        {(catalog?.species ?? [{ id: 34, name: 'Dragonling' }, { id: 40, name: 'Dragonling_Alternate (quest)' }]).map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
      </select></label>
      <label>Effective level (manual)<input type="number" min="1" max="1000" value={request.level} disabled={busy} onChange={e => patch({ level: Number(e.target.value) })}/></label>
      <label>Scenario<select value={request.profile} disabled={busy} onChange={e => patch({ profile: e.target.value as ScanRequest['profile'] })}>
        <option value="dex-mudex">Online default: DEX + MUDEX</option><option value="dex">DEX only (comparison)</option><option value="vanilla">Vanilla (comparison)</option>
      </select></label>
      <label><input type="checkbox" checked={request.alternate} disabled={busy} onChange={e => patch({ alternate: e.target.checked })}/> Alternate random selection</label>
      <label><input type="checkbox" checked={request.eliteOnly} disabled={busy} onChange={e => patch({ eliteOnly: e.target.checked })}/> Elite only</label>
      <label>Center X (east)<input type="text" inputMode="numeric" maxLength={6} value={coordinates.px} disabled={busy} onChange={e => coordinate('px',e.target.value)}/></label>
      <label>Center Y (south)<input type="text" inputMode="numeric" maxLength={6} value={coordinates.py} disabled={busy} onChange={e => coordinate('py',e.target.value)}/></label>
      <label>Or center on town<select disabled={busy || !catalog} value="" onChange={e => { const town = catalog?.towns[Number(e.target.value)]; if (town) patch({ px: town.px, py: town.py,theatre:0,region:-1 }) }}>
        <option value="">Choose a Bay town…</option>{catalog?.towns.map((t, i) => <option key={i} value={i}>{t.name} ({t.px},{t.py})</option>)}
      </select></label>
      <label>Region<select disabled={busy || !catalog} value={request.region} onChange={e => patch({ region: Number(e.target.value) })}><option value="-1">All source regions</option>{catalog?.regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label>Radius (0–50 tiles)<input type="number" min="0" max="50" disabled={busy} value={request.radius} onChange={e => patch({ radius: Number(e.target.value) })}/></label>
      <label>Minimum targets<input type="number" min="1" max="1000" disabled={busy} value={request.minTargets} onChange={e => patch({ minTargets: Number(e.target.value) })}/></label>
      <button type="button" disabled={busy || !catalog} onClick={() => void start(false)}>Scan</button>
      <button type="button" disabled={!busy} onClick={() => void bridge().cancel().catch(e => setError(String(e)))}>Cancel</button>
    </div>
    <div className="hunter-progress" role="status"><strong>{progress.phase}</strong> · {busy ? Math.round((now - started) / 1000) : ((progress.elapsedMs ?? 0) / 1000).toFixed(2)}s<br/>
      Pixels visited {progress.pixels ?? 0} → hash candidates {progress.hashCandidates ?? 0} → world-gated {progress.eligible ?? 0} → simulated {progress.simulated ?? 0} · errors {progress.errors ?? 0}
    </div>
    {(error || status.error) && <div className="notice" role="alert">{error || status.error}</div>}
    {status.scan && <p>Results for mobileType {status.scan.request.species}, effective level {status.scan.request.level}, {status.scan.request.profile}, {status.scan.request.alternate ? 'alternate' : 'classic'} selection. Changing filters takes effect on the next scan.</p>}
    {status.scan?.cache && <p>Scan cache: {status.scan.cache.hit?'hit (source, assets and world-data contents freshly verified)':'miss; computed and stored locally'}.</p>}
    {status.scan?.coverage&&<div className="hunter-caution"><strong>Coverage: {status.scan.coverage.completeWithinQuery?'requested circle complete':'partial / errors'}</strong> · {status.scan.coverage.visitedPixels} pixels examined · {status.scan.coverage.populationsExamined}/{status.scan.coverage.eligible} eligible populations analyzed · {status.scan.coverage.matchingResults} matching results, {status.scan.coverage.retained} retained{status.scan.coverage.truncated?' (ranked list truncated)':''}. {status.scan.coverage.note}<details><summary>Coverage by theatre and prepared road regions</summary><pre>{JSON.stringify(status.scan.coverage,null,2)}</pre></details></div>}
    {status.scan?.diagnostics.map((d, i) => <div className="notice" key={i}>{d.status}: {d.px},{d.py} {d.message}</div>)}
    {status.scan && results.length === 0 && <p>No matching base populations in this completed/partial search. This does not prove the species absent elsewhere, or any objective impossible.</p>}
    {results.length > 0 && <div className="hunter-columns">
      <div><label>Sort<select value={sort} onChange={e => setSort(e.target.value)}><option value="targets">Target count, then distance</option><option value="purity">Dragonling purity</option><option value="province">Province</option><option value="distance">Distance from center</option></select></label>
        <p>{results.length} results (best 100 retained). Distance is straight-line travel effort; reachability is not ranked.</p>
        <div className="hunter-results">{results.map(r => <button className={selected?.mapId === r.mapId ? 'hunter-result selected' : 'hunter-result'} key={r.mapId} onClick={() => setSelection(r.mapId)}>
          <strong>{r.name}</strong><span>{r.population.targetBase} base targets → {r.population.targetExpanded} {r.elite?'Elite-expanded':'normal'} targets · type {r.type}</span><span>({r.px},{r.py}) · {(r.distance * .8192).toFixed(2)} km from center · nearest {r.nearest?.name ?? 'unknown'}</span>
          <span>{r.province} · map {r.mapId} · Dragonlings {r.dragonlings}/{r.totalEnemies} ({r.dragonlingPercentage.toFixed(1)}%) · template {r.templateId}</span>
        </button>)}</div>
      </div>
      {selected && <article className="hunter-details">
        <h2>{selected.name}</h2>
        <p>{selected.province} · world ({selected.px},{selected.py}) · map ID {selected.mapId} · template {selected.templateId} · {selected.elite?'Elite':'Normal'} · {selected.eligibility}. {selected.verification}. Dragonlings: {selected.dragonlings}/{selected.totalEnemies} ({selected.dragonlingPercentage.toFixed(1)}% of resolved population; unresolved markers excluded).</p>
        <p>Selected species: {selected.population.targetBase} base enemies ({selected.fixed} fixed + {selected.random} resolved random) × {selected.copies} = <strong>{selected.population.targetExpanded} {selected.elite?'Elite-expanded':'normal'} targets</strong>.</p>
        <p>All species: {selected.population.base} resolved base enemies → {selected.population.expanded} expanded enemies. Unresolved: {selected.population.unresolved}. Excluded by source marker/water rules: {selected.population.excluded}. Layout {selected.size}, {selected.blocks.length} blocks{selected.curated !== null ? `, curated ${selected.curated}` : ''}.</p>
        <p>{directions(selected)}</p>
        <button onClick={() => void bridge().copy(`${selected.px},${selected.py}`).catch(e => setError(String(e)))}>Copy tile</button> <button onClick={() => void bridge().copy(directions(selected)).catch(e => setError(String(e)))}>Copy directions</button>
        {selected.markerCoordinatesOmitted&&<p>Compact capture: marker coordinates were omitted to bound memory. Open 2D X-Ray to reconstruct all real species positions against current, matching inputs.</p>}
        <BlockOverview result={selected}/>
        <details><summary>Target marker coordinates (metres, Y up)</summary><div className="hunter-table"><table><thead><tr><th>Block</th><th>X</th><th>Y</th><th>Z</th><th>Origin</th><th>Copies</th></tr></thead><tbody>{selected.targets.map((m, i) => <tr key={i}><td>{m.blockIndex}</td><td>{m.x.toFixed(2)}</td><td>{m.y.toFixed(2)}</td><td>{m.z.toFixed(2)}</td><td>{m.fixed ? 'fixed' : 'random'}</td><td>{m.copies}</td></tr>)}</tbody></table></div></details>
        <details><summary>Evidence and population by species</summary><pre>{JSON.stringify({ mapId: selected.mapId, templateId: selected.templateId, populationSeed: selected.populationSeed, encounterSeed: selected.tableSeed, spawnRoll: selected.spawnRoll, gates: selected.gates, counts: selected.counts, blocks: selected.blocks }, null, 2)}</pre></details>
        <div className="hunter-future"><button disabled={busy} onClick={()=>void openMap()}>Open 2D X-Ray</button><button disabled>Interior 3D — coming later</button><button disabled>Full mechanism solver — coming later</button><button disabled>Full puzzle walkthrough — coming later</button></div>
        <p>Reachability: <strong>unknown</strong>. The block overview shows base markers; 2D X-Ray reconstructs expanded enemy positions against at-rest geometry. Neither establishes live state or a valid route.</p>
        <h3>My findings</h3><label>Actual enemies seen (manual)<input type="number" min="0" max="9999" value={actual} onChange={e => setActual(e.target.value)}/></label>
        <label>Notes<textarea maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)}/></label>
        <button disabled={busy} onClick={() => void observe(true)}>Save target</button> <button disabled={busy || actual === '' || !Number.isInteger(Number(actual))} onClick={() => void observe(false)}>Record visit</button>
      </article>}
    </div>}
    {geometry&&<>
      {status.state==='analysis_error'&&<p role="status">The last reconstructed map is retained. The latest analysis failed; its route is Unverified. See the diagnostic above. Reopen the map to verify changed source/assets.</p>}
      {status.state==='cancelled'&&<p role="status">Analysis cancelled. The reconstructed map is retained; no route from the cancelled job is displayed.</p>}
      <XRay key={`${geometry.mapId}:${geometry.cache?.key??geometry.provenance.sourceFingerprint}`} geometry={geometry} catalog={catalog} coffer={status.jackpot?.aurum?.mapId===geometry.mapId?status.jackpot.aurum:undefined} navigation={shownNavigation(status,geometry)} busy={busy} onNavigate={request=>void navigate(request)}/>
    </>}
    {provenance && <details><summary>Source / asset provenance and limits</summary><p>{provenance.scope}</p>{provenance.warnings.map(w => <p key={w}>{w}</p>)}<pre>{JSON.stringify(provenance, null, 2)}</pre></details>}
    <details><summary>Saved targets and manual observations ({history.observations.length})</summary>{[...history.observations].reverse().map((o, i) => <p key={i}>{o.name} · {new Date(o.observedAt).toLocaleString()} · {o.actualCount === null ? 'Bookmark' : `Saw ${o.actualCount}`} · {o.notes}<br/><small>Source {o.sourceFingerprint.slice(0, 16)} · level {o.request.level} · {o.request.profile}. Historical, not current live state.</small></p>)}</details>
  </section>
}

function BlockOverview({ result }: { result: HunterResult }) {
  const minX = Math.min(...result.blocks.map(b => b.x)), minZ = Math.min(...result.blocks.map(b => b.z))
  const width = Math.max(...result.blocks.map(b => b.x)) - minX + 51.2, height = Math.max(...result.blocks.map(b => b.z)) - minZ + 51.2
  return <figure className="hunter-blocks"><figcaption>Actual online block placement · all heights projected · block index, not a floor plan</figcaption>
    <svg viewBox={`${minX - 5} ${minZ - 5} ${width + 10} ${height + 10}`} role="img" aria-label="Actual dungeon block overview">
      {result.blocks.map(b => <g key={b.index}><rect x={b.x} y={b.z} width={51.2} height={51.2} fill={b.starting ? '#3e4230' : '#192532'} stroke="#9b8555" strokeWidth=".5"/><text x={b.x + 2} y={b.z + 7} fill="#d7c28c" fontSize="5">{b.index}: {b.name}</text></g>)}
      {result.targets.map((m, i) => <circle key={i} cx={m.x} cy={m.z} r="1.3" fill={m.fixed ? '#79d6b1' : '#ffb35a'}><title>Block {m.blockIndex}: {m.fixed ? 'fixed' : 'random'} ×{m.copies}; Y {m.y.toFixed(2)}</title></circle>)}
      {result.entrance && <circle cx={result.entrance.x} cy={result.entrance.z} r="2" fill="#74baff"><title>Entrance</title></circle>}
    </svg><figcaption>Green: fixed · amber: random target marker · blue: entrance. No connectivity or route is implied.</figcaption></figure>
}
