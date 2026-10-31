import { parentPort, workerData } from 'node:worker_threads'
import { openGame, scan } from './engine.mjs'
import { assembleGeometry } from './geometry.mjs'
import { cached, cacheKey } from './cache.mjs'
import { join } from 'node:path'
import { navigate } from './navigation.mjs'
// The offline worker has no browser globals or networking capability exposed to callers.
globalThis.fetch = async () => { throw new Error('Networking disabled in Hunter worker') }
try {
  const game = await openGame(workerData.settings, value => parentPort.postMessage({ kind: 'progress', value }))
  const { mapSpec, request, dataDir } = workerData
  if (mapSpec && (game.provenance.sourceFingerprint !== mapSpec.expected.sourceFingerprint || JSON.stringify(game.provenance.assetHashes) !== JSON.stringify(mapSpec.expected.assetHashes) || game.provenance.worldData.fingerprint !== mapSpec.expected.worldData?.fingerprint)) throw new Error('INPUT_VERSION_MISMATCH: source, world-data packs or ARENA2 changed after scan. Rescan before showing geometry.')
  const compute = () => mapSpec?.navigation ? navigate(game,mapSpec,mapSpec.navigation,value=>parentPort.postMessage({kind:'progress',value})) : mapSpec ? assembleGeometry(game,mapSpec) : scan(game,request,value=>parentPort.postMessage({kind:'progress',value}))
  const value = mapSpec || request ? await cached(join(dataDir,'hunter-cache'),cacheKey(game.provenance,mapSpec ?? request,mapSpec?.navigation?'navigation':mapSpec?'geometry':'scan'),compute) : game.catalog
  parentPort.postMessage({ kind: 'complete', value })
} catch (error) {
  parentPort.postMessage({ kind: 'error', message: String(error.message) })
}
