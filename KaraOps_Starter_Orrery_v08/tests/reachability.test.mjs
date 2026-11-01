import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeGraph } from '../src/main/hunter/reachability.mjs'
const graph = { nodes: ['entry', 'hall', 'pack1', 'pack2', 'sealed'], edges: [{ from: 'entry', to: 'hall' }, { from: 'hall', to: 'pack1' }, { from: 'hall', to: 'pack2' }, { from: 'pack2', to: 'hall' }], complete: true }
test('complete disconnected objective is impossible under the explicit graph, with closure witness', () => {
  const result = analyzeGraph(graph, 'entry', ['sealed'])
  assert.equal(result.status, 'proven_unreachable')
  assert.deepEqual(new Set(result.targets[0].witness.closure), new Set(['entry', 'hall', 'pack1', 'pack2']))
})
test('two reachable packs and a proven disconnected pack produce partial reachability', () => {
  const result = analyzeGraph(graph, 'entry', ['pack1', 'pack2', 'sealed'])
  assert.equal(result.status, 'partially_reachable')
  assert.equal(result.targets.filter(t => t.status === 'reachable').length, 2)
  assert.equal(result.targets[2].status, 'proven_unreachable')
})
test('incomplete model, unknown teleport, unmodeled ability and time cap never prove impossibility', () => {
  for (const g of [{ ...graph, complete: false }, { ...graph, unsupported: ['Open spell'] }, { ...graph, edges: [...graph.edges, { from: 'hall', to: 'sealed', unknown: true }] }]) {
    assert.equal(analyzeGraph(g, 'entry', ['sealed']).status, 'unknown')
  }
  assert.equal(analyzeGraph(graph, 'entry', ['sealed'], 1).status, 'unknown')
  assert.equal(analyzeGraph(graph, 'sealed', ['entry']).status, 'proven_unreachable')
  assert.equal(analyzeGraph(graph, 'missing', ['entry']).status, 'analysis_error')
})
