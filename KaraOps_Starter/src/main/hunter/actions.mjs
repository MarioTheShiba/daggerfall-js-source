// Inert, offline construction of the same per-block-instance ActionSystem as dungeonContext.
export async function actionIndex(game, context) {
  const A=await game.load('actions','world/actionSystem'), R=await game.load('rdb','world/rdbLayout')
  const sense=await game.load('sense','systems/dungeon/dungeonSense'), echo=await game.load('echo','systems/dungeon/dungeonEcho')
  const {Collider}=await game.load('collider','player/collider'), {multiply,trs}=await game.load('mat4','world/mat4')
  const {worldAabb}=await game.load('activate','player/activate')
  const collider=new Collider(()=>-Infinity), surfaces=new Collider(()=>-Infinity), actions=new A.ActionSystem(collider), positions=new Map(), records=new Map()
  for(const [bi,b] of context.dungeon.blocks.entries()) {
    const origin=trs(b.originX,0,b.originZ,0,0,0)
    for(const [key,p] of b.layout.objectPositions)positions.set(`${bi}:${key}`,{pos:[p.x+b.originX,p.y,p.z+b.originZ],yawDeg:p.yawDeg})
    for(const p of b.layout.placements){
      const cpu=game.getModel(p.modelIdNum),matrix=multiply(origin,p.matrix),box=worldAabb(cpu.positions,matrix)
      let o=null
      if(p.action){
        const cls=A.classifyPlacementAction(p.action.actionFlag)
        if(cls==='move')o=actions.addAction(bi,p.position,cpu,matrix,p.action)
        else if(cls==='specialDoor')o=actions.addSpecialDoor(bi,p.position,cpu,matrix,p.action)
        else if(cls==='effect')o=actions.addEffect(bi,p.position,p.action,[matrix[12],matrix[13],matrix[14]],p.modelIdNum)
        else o=actions.addRelay(bi,p.position,p.action,box,[matrix[12],matrix[13],matrix[14]],p.modelIdNum)
        o.aabb=box; o.actionFlag ??= p.action.actionFlag
        records.set(o.key,p.action)
        if(A.hasActionCollision(o))surfaces.addMesh(o.key,cpu.positions,cpu.indices,matrix)
      }
      if(!o || !['action','door'].includes(o.kind))collider.addMesh(`static:${bi}:${p.position}`,cpu.positions,cpu.indices,matrix)
    }
    for(const d of b.layout.actionDoors){
      if(d.disabled)continue
      const cpu=game.getModel(d.modelIdNum),matrix=multiply(origin,d.matrix)
      const o=actions.addDoor(cpu,matrix,{ns:bi,positionKey:d.position,action:d.action,startingLockValue:d.startingLockValue,loadID:d.loadID})
      o.aabb=worldAabb(cpu.positions,matrix)
      if(d.action){records.set(o.key,d.action);if(A.hasActionCollision(o))surfaces.addMesh(o.key,cpu.positions,cpu.indices,matrix)}
    }
    for(const [key,link] of b.layout.actionLinks){
      if(!link.action || actions.objectAt(bi,key))continue
      const p=positions.get(`${bi}:${key}`)?.pos
      if(!p)continue
      const a=link.action
      const o=R.MOVE_ACTION_FLAGS.has(a.actionFlag)?actions.addMoveFlat(bi,key,a,p):A.EFFECT_ACTION_FLAGS.has(a.actionFlag)?actions.addEffect(bi,key,a,p):actions.addRelay(bi,key,a,null,p)
      records.set(o.key,a)
    }
  }
  actions.resolvePosition=(ns,key)=>positions.get(`${ns}:${key}`)??null
  const chainTargets=actions.chainTargets(),names=Object.fromEntries(Object.entries(R.ACTION_FLAGS).map(([k,v])=>[v,k]))
  function chain(o){const out=[],seen=new Set();for(let n=o;n&&!seen.has(n.key)&&out.length<32;n=actions.nextOf(n)){seen.add(n.key);out.push(n)}return out}
  function safeDoor(o){
    if(o.kind!=='door'||o.special)return false
    const seen=new Set();let n=o
    while(n){if(seen.has(n.key)||seen.size>=32||n.kind!=='door'||n.special||![R.ACTION_FLAGS.None,R.ACTION_FLAGS.OpenDoor,R.ACTION_FLAGS.UnlockDoor].includes(n.actionFlag))return false;seen.add(n.key);n=actions.nextOf(n)}
    return true
  }
  const mechanisms=[...actions.objects.values()].map(o=>{
    const box=o.aabb,at=box?box.min.map((v,i)=>(v+box.max[i])/2):o.origin??positions.get(`${o.ns}:${o.positionKey}`)?.pos??[o.base?.[12]??0,o.base?.[13]??0,o.base?.[14]??0]
    const destination=o.actionFlag===R.ACTION_FLAGS.Teleport?actions.resolvePosition(o.ns,o.nextKey):null
    return {key:o.key,ns:o.ns,kind:o.kind,special:!!o.special,secret:sense.isSecretMover(o,chainTargets),action:names[o.actionFlag]??`Flag ${o.actionFlag}`,triggerFlag:o.triggerFlag,playerTriggers:sense.playerTriggers(o),triggers:A.TRIGGER_GATE[o.triggerFlag]??[],next:actions.nextOf(o)?.key??null,nextPosition:o.nextKey,chain:chain(o).slice(1).map(n=>n.key),chainMovers:echo.chainMovers(n=>actions.nextOf(n),o).map(n=>n.key),at,sheet:context.sheetAt(at[1]),lock:o.currentLockValue??null,teleportDestination:destination?.pos??null,movement:{translation:o.translation??records.get(o.key)?.translation??null,rotation:o.rotation??records.get(o.key)?.rotation??null,duration:o.duration??0},modeled:safeDoor(o),reason:safeDoor(o)?'Source ordinary-door Open/Unlock chain modeled; activation and motor passage still require validation.':'Indexed from source; dynamic/trigger/teleport semantics not admitted as automatic route edges.'}
  })
  return {actions,collider,surfaces,mechanisms,records,A,R,safeDoor}
}
