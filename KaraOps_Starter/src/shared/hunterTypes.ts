export type Feasibility = 'reachable' | 'reachable_with_conditions' | 'partially_reachable' | 'proven_unreachable' | 'unknown' | 'analysis_error'
export interface ScanRequest {
  px: number; py: number; radius: number; species: number; level: number; region: number; minTargets: number
  eliteOnly: boolean; alternate: boolean; profile: 'vanilla' | 'dex' | 'dex-mudex'
}
export interface Provenance { schema: number; sourceFingerprint: string; assetHashes: Record<string, string>; templates: number; scope: string; warnings: string[]; worldData?: { fingerprint: string; diagnostic: string; rdbOverrides: string[]; files: { path: string; sha256: string; entries: number; rdb: number }[] } }
export interface HunterCatalog { provenance: Provenance; towns: { name: string; px: number; py: number; region: number }[]; species: { id: number; name: string }[]; regions: { id: number; name: string }[] }
export interface HunterProgress { phase: string; pixels?: number; hashCandidates?: number; eligible?: number; simulated?: number; errors?: number; elapsedMs?: number }
export interface EnemyMarker { x: number; y: number; z: number; mobileType: number; fixed: boolean; blockIndex: number; loadID: number; copies: number }
export interface HunterResult {
  mapId: number; templateId: number; name: string; px: number; py: number; elite: boolean; type: number; size: string; curated: number | null
  count: number; fixed: number; random: number; copies: number; counts: Record<string, number>; distance: number; targets: EnemyMarker[]
  population: { base: number; expanded: number; targetBase: number; targetExpanded: number; unresolved: number; excluded: number; markerCandidates: number }
  blocks: { index: number; name: string; x: number; z: number; starting: boolean; waterLevel: number }[]
  entrance: { x: number; y: number; z: number } | null
  nearest: { name: string; px: number; py: number; distance: number; dx: number; dy: number } | null
  populationSeed: number; tableSeed: { unknown2: number; region: number }; spawnRoll: number; gates: string[]
  reachability: Feasibility; liveAvailability: 'unknown'
}
export interface HunterScan { request: ScanRequest; provenance: Provenance; stats: HunterProgress; results: HunterResult[]; diagnostics: { px?: number; py?: number; status: Feasibility; message: string }[]; cache?: { hit: boolean; key: string } }
export interface HunterGeometry {
  mapId: number; name: string; px: number; py: number; cell: number; request: ScanRequest; provenance: Provenance
  bounds: { x0: number; z0: number; x1: number; z1: number }
  plans: { index: number; label: string; y: number; y0: number; y1: number; storeys: number[]; fill: string; walls: string; openings: string; cells: number }[]
  storeys: { index: number; y: number; y0: number; y1: number }[]
  enemies: (EnemyMarker & { id: string; sheet: number; eliteCopy?: boolean })[]
  doors: { id: string; sheet: number; x: number; y: number; z: number; x0: number; x1: number; z0: number; z1: number; lock: number; state: string }[]
  stairs: { id: string; x: number; y: number; z: number; from: number; to: number; dx: number; dz: number }[]
  entrance: { x: number; y: number; z: number; sheet: number } | null
  stats: { blocks: number; rows: number; floorTriangles: number; sheets: number; storeys: number; enemyBase: number; enemyExpanded: number }
  warnings: string[]; cache?: { hit: boolean; key: string }
}
export interface NavigationRequest { goal: 'single' | 'species' | 'tour' | 'between'; targetIds: string[]; startId: string; species: number; openDoors: boolean; openSpellLevel: number; maxDrop: number; returnToEntrance: boolean; doorStates: Record<string,'open'|'closed'|'unlocked'> }
export interface NavigationPoint { at: number[]; sheet: number }
export interface NavigationOutcome { id: string; status: Feasibility; reasons: string[]; conditions?: string[]; points?: NavigationPoint[]; distance?: number }
export interface NavigationMechanism { key: string; ns: number; kind: string; secret: boolean; special: boolean; action: string; triggers: string[]; next: string | null; chain: string[]; chainMovers: string[]; at: number[]; sheet: number; lock: number | null; teleportDestination: number[] | null; modeled: boolean; reason: string }
export interface NavigationResult { mapId: number; status: Feasibility; profile: NavigationRequest; outcomes: NavigationOutcome[]; routes: (NavigationOutcome & { kind: 'outbound'|'return'; points: NavigationPoint[] })[]; steps: {kind: string; at: number[]; sheet: number; text: string; object?: string}[]; exit: NavigationOutcome | null; mechanisms: NavigationMechanism[]; assumptions: string[]; completeModel: boolean; entrance: NavigationPoint; stats: {targets: number; reached: number; probes: number; elapsedMs: number; polys: number; cells: number; cs: number; outOfBudget: boolean}; failures: {id: string; reason: string; at?: number[]; sheet?: number}[]; cache?: {hit:boolean} }
export interface HunterStatus { id: number; state: 'idle' | 'running' | 'complete' | 'cancelled' | 'analysis_error'; progress: HunterProgress; catalog?: HunterCatalog; scan?: HunterScan; geometry?: HunterGeometry; navigation?: NavigationResult; error?: string }
export interface HunterObservation { mapId: number; px: number; py: number; name: string; sourceFingerprint: string; assetHashes: Record<string, string>; request: ScanRequest; observedAt: string; actualCount: number | null; notes: string }
export interface HunterHistory { lastRequest?: ScanRequest; observations: HunterObservation[] }
export interface HunterBridge {
  start(request: ScanRequest | null): Promise<number>
  status(): Promise<HunterStatus>
  cancel(): Promise<void>
  history(): Promise<HunterHistory>
  observe(mapId: number, actualCount: number | null, notes: string): Promise<HunterHistory>
  copy(text: string): Promise<void>
  map(mapId: number): Promise<number>
  navigate(mapId: number, request: NavigationRequest): Promise<number>
}

// Contract for later stages only; no graph or proof is fabricated in Stage 1.
export interface DungeonAnalysisIR {
  schema: 1
  identity: { mapId: number; provenance: Provenance; request: ScanRequest }
  structure: { blocks: HunterResult['blocks']; complete: boolean }
  targets: EnemyMarker[]
  interactables: { key: string; position: [number, number, number]; kind: string; triggerFlag: number; nextKey: string | null; semanticsKnown: boolean }[]
  graph: { from: string; to: string; conditions: string[]; evidence: string[] }[]
  state: { known: Record<string, string>; unknown: string[] }
  route: { position: [number, number, number]; instruction: string; conditions: string[] }[]
  outcome: { status: Feasibility; modelComplete: boolean; reasons: string[]; proofWitness?: string[] }
}
