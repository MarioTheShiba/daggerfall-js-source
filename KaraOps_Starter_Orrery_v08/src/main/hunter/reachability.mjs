// Future solver proof-policy core. Accepts an explicitly supplied directed graph, not dungeon geometry.
// No UI calls this until collision/action reconstruction can certify a complete applicable model.
export function analyzeGraph({ nodes, edges, complete, unsupported = [] }, start, objectives, cap = 10000) {
  const known = new Set(nodes)
  if (!known.has(start) || objectives.some(n => !known.has(n)) || edges.some(e => !known.has(e.from) || !known.has(e.to))) return { status: 'analysis_error', targets: [], reasons: ['Graph references missing nodes'] }
  const visited = new Set([start]), queue = [start], parent = new Map()
  let exhausted = false
  for (let i = 0; i < queue.length; i++) {
    if (i >= cap) { exhausted = true; break }
    for (const edge of edges.filter(e => e.from === queue[i])) {
      if (edge.unknown || edge.blocked || visited.has(edge.to)) continue
      visited.add(edge.to); queue.push(edge.to); parent.set(edge.to, edge.from)
    }
  }
  const proofComplete = complete === true && unsupported.length === 0 && !exhausted && !edges.some(e => visited.has(e.from) && e.unknown)
  const targets = objectives.map(id => {
    if (visited.has(id)) {
      const path = [id]; let at = id
      while (parent.has(at)) { at = parent.get(at); path.unshift(at) }
      return { id, status: 'reachable', path }
    }
    return proofComplete ? { id, status: 'proven_unreachable', witness: { closure: [...visited], blockingFrontier: edges.filter(e => visited.has(e.from) && !visited.has(e.to)), assumptions: 'Only listed directed transitions; complete explicit model' } }
      : { id, status: 'unknown', reasons: exhausted ? ['State budget exhausted'] : ['Incomplete geometry, unknown transition, or unsupported mechanic'] }
  })
  const count = targets.filter(t => t.status === 'reachable').length
  return { status: count === targets.length && count > 0 ? 'reachable' : count > 0 ? 'partially_reachable' : targets.length > 0 && proofComplete ? 'proven_unreachable' : 'unknown', targets }
}
