import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { SOURCE_CONTRACT } from './source-contract.mjs'
export const digest = value => createHash('sha256').update(value).digest('hex')
export function verifySource(source, read = path => readFileSync(join(source, path))) {
  const mismatches = []
  for (const [path, hash] of Object.entries(SOURCE_CONTRACT)) {
    try { if (digest(read(path)) !== hash) mismatches.push(path) } catch { mismatches.push(path) }
  }
  if (mismatches.length) throw new Error(`SOURCE_VERSION_MISMATCH: audited generation/automap contract changed or missing: ${mismatches.join(', ')}. Prediction disabled; audit and parity-test this checkout before updating the contract.`)
}
export function inspectWorldData(source, read = path => readFileSync(join(source, path))) {
  const hash = createHash('sha256'), files = [], targets = []
  for (const vendor of readdirSync(join(source, 'vendor'), { withFileTypes: true }).filter(e => e.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
    for (const kind of ['WorldData', 'WorldDataPatches', 'WorldDataPack']) {
      let entries
      try { entries = readdirSync(join(source, 'vendor', vendor.name, kind)).sort() } catch { continue }
      for (const name of entries.filter(n => /\.json(?:\.gz)?$/.test(n))) {
        const path = `vendor/${vendor.name}/${kind}/${name}`, bytes = read(path)
        hash.update(path).update(bytes)
        const json = JSON.parse((name.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8'))
        const names = kind === 'WorldDataPack' ? Object.keys(json.files ?? {}) : [name]
        targets.push(...names)
        files.push({ path, sha256: digest(bytes), entries: names.length, rdb: names.filter(n => /\.RDB/i.test(n)).length })
      }
    }
  }
  return { fingerprint: hash.digest('hex'), files, rdbOverrides: targets.filter(n => /\.RDB/i.test(n)),
    diagnostic: 'WORLD_DATA_SCENARIO: original MAPS/BLOCKS plus generated curated blocks. Local mod files inventoried, not activated. Browser world-data packs, layout pins and quest state are not read; live configuration parity is unverified.' }
}
