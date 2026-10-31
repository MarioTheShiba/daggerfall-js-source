import test from 'node:test'
import assert from 'node:assert/strict'
import { scanRequest } from '../src/main/hunter/engine.mjs'
const valid = { px: 780, py: 100, radius: 15, species: 34, level: 30, minTargets: 1, region: -1, eliteOnly: true, alternate: false, profile: 'dex-mudex' }
test('bounded requests preserve Dragonling 34 separately from alternate 40', () => {
  assert.equal(scanRequest(valid).species, 34)
  assert.equal(scanRequest({ ...valid, species: 40 }).species, 40)
})
test('rejects off-Bay, unbounded, nonnumeric and malformed scan requests', () => {
  for (const value of [null, {}, { ...valid, px: -1 }, { ...valid, py: 500 }, { ...valid, radius: 51 }, { ...valid, level: 0 }, { ...valid, px: '780' }, { ...valid, profile: 'unknown' }, { ...valid, alternate: 1 }, { ...valid, species: Infinity }]) assert.throws(() => scanRequest(value))
})
