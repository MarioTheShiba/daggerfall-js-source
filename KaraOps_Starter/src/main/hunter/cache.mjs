import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { digest } from './compatibility.mjs'
export const CACHE_SCHEMA = 'karaops-2a-1'
const adapterHash = digest(['engine.mjs','world.mjs','geometry.mjs','navigation.mjs','actions.mjs','cache.mjs','compatibility.mjs','source-contract.mjs'].map(name=>readFileSync(new URL(name,import.meta.url),'utf8')).join('\n'))
export function cacheKey(provenance, request, operation) {
  return digest(JSON.stringify([CACHE_SCHEMA, adapterHash, operation, provenance.sourceFingerprint, provenance.assetHashes, provenance.worldData?.fingerprint, request]))
}
export function cached(dir, key, compute) {
  return (async () => {
    const started=performance.now()
    try { mkdirSync(dir, { recursive: true }) } catch { return { ...await compute(), cache: {hit:false,key,disabled:true} } }
    const path = join(dir, `${key}.json`)
    try {
      const text = readFileSync(path, 'utf8')
      if (text.length > 16000000) throw new Error('oversize')
      const envelope = JSON.parse(text)
      if (envelope.key !== key || envelope.schema !== CACHE_SCHEMA || digest(JSON.stringify(envelope.value)) !== envelope.checksum) throw new Error('Invalid cache checksum')
      return { ...envelope.value, cache: { hit: true, key, operationMs:Math.round(performance.now()-started) } }
    } catch { /* Absent or corrupt entries are rebuilt, never treated as evidence. */ }
    const value = await compute(), body = JSON.stringify(value)
    if (body.length < 16000000 && !value.stats?.outOfBudget && (!value.stats?.phase || (value.stats.phase==='Complete' && value.stats.errors===0))) {
      try {
        writeFileSync(`${path}.tmp`, JSON.stringify({ schema: CACHE_SCHEMA, key, checksum: digest(body), value }), 'utf8')
        renameSync(`${path}.tmp`, path)
        const entries = readdirSync(dir).filter(n => /^[a-f0-9]{64}\.json$/.test(n)).map(n => ({ path: join(dir, n), ...statSync(join(dir, n)) })).sort((a,b) => b.mtimeMs-a.mtimeMs)
        let size = 0
        entries.forEach((entry, i) => { size += entry.size; if (size > 64000000 || i >= 12) unlinkSync(entry.path) })
      } catch { /* A read-only/full cache must not break a correct scan. */ }
    }
    return { ...value, cache: { hit: false, key, operationMs:Math.round(performance.now()-started) } }
  })()
}
