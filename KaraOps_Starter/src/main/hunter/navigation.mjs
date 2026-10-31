import { assembleGeometry } from './geometry.mjs'
import { actionIndex } from './actions.mjs'

export function navigationRequest(value,coffer=false){
  if(!value||typeof value!=='object')throw new Error('Invalid navigation request')
  if(!['single','species','tour','between'].includes(value.goal))throw new Error('Invalid route goal')
  if(!Array.isArray(value.targetIds)||value.targetIds.length>16||value.targetIds.some(id=>typeof id!=='string'||!(/^enemy:\d{1,5}$/.test(id)||coffer&&id==='coffer')))throw new Error('Select up to 16 target IDs')
  if(new Set(value.targetIds).size!==value.targetIds.length||(value.goal==='single'||value.goal==='between')&&value.targetIds.length!==1||value.goal==='tour'&&value.targetIds.length===0)throw new Error('Select distinct objectives; single/between requires one target')
  if(!Number.isInteger(value.species)||value.species<0||value.species>1023)throw new Error('Invalid species')
  if(typeof value.startId!=='string'||(value.startId!=='entrance'&&!/^enemy:\d{1,5}$/.test(value.startId)))throw new Error('Invalid start')
  if(typeof value.openDoors!=='boolean'||typeof value.returnToEntrance!=='boolean'||!Number.isInteger(value.openSpellLevel)||value.openSpellLevel<0||value.openSpellLevel>1000||![0,1,2,3].includes(value.maxDrop))throw new Error('Invalid character capabilities')
  const doorStates=value.doorStates??{}
  if(typeof doorStates!=='object'||Array.isArray(doorStates)||Object.keys(doorStates).length>256||Object.entries(doorStates).some(([key,state])=>!/^act:\d+:\d+$/.test(key)||!['open','closed','unlocked'].includes(state)))throw new Error('Invalid declared door states')
  return {goal:value.goal,targetIds:value.targetIds,species:value.species,startId:value.startId,openDoors:value.openDoors,returnToEntrance:value.returnToEntrance,openSpellLevel:value.openSpellLevel,maxDrop:value.maxDrop,doorStates}
}

export async function navigate(game,spec,input,progress=()=>{},limits={}){
  const profile=navigationRequest(input,!!limits.objective),started=performance.now(),context={}
  const geometry=await assembleGeometry(game,spec,context)
  const index=await actionIndex(game,context),{actions,collider,mechanisms,A,R,safeDoor,surfaces}=index
  const bake=await game.load('navBake','ai/nav/navBake'), nav=await game.load('navmesh','ai/nav/navmesh'),motor=await game.load('motor','player/motor'),entry=await game.load('entry','player/enterExit'),mystic=await game.load('mystic','systems/mysticism')
  const marker=context.dungeon.startMarker
  if(!marker)throw new Error('NAV_ENTRY_MISSING: source walk-in requires startMarker')
  const entrance=entry.floorLanding(collider,[marker.x,marker.y+1.08,marker.z])
  const initialDoorStates=[]
  for(const [key,state]of Object.entries(profile.doorStates)){
    const o=actions.objects.get(key)
    if(!o||o.kind!=='door'||o.special)throw new Error(`Unknown/unmodeled ordinary door: ${key}`)
    if(state==='open'){o.currentLockValue=0;actions.toggleDoor(o,false);actions.update(2)}
    if(state==='unlocked')o.currentLockValue=0
    initialDoorStates.push(`User-declared ${key} ${state}; not observed live`)
  }
  const enemies=[...geometry.enemies,...(limits.objective?[{...limits.objective,id:'coffer',mobileType:-1}]:[])],selected=profile.goal==='species'?enemies.filter(e=>e.mobileType===profile.species&&!e.eliteCopy):profile.targetIds.map(id=>enemies.find(e=>e.id===id))
  if(selected.some(e=>!e))throw new Error('Unknown target ID in selected geometry')
  const targets=selected.slice(0,128)
  const startEnemy=profile.startId==='entrance'?null:enemies.find(e=>e.id===profile.startId)
  if(profile.startId!=='entrance'&&!startEnemy)throw new Error('Unknown route start enemy')
  const landed=e=>entry.floorLanding(collider,[e.x,e.y+.2,e.z])
  const start=startEnemy?landed(startEnemy):entrance
  if(startEnemy&&Math.abs(startEnemy.y-start[1])>3)throw new Error('NAV_START_UNVERIFIED: selected start has no reliable floor landing')
  progress({phase:'Baking source collider navmesh; doors remain state-checked during motor replay'})
  const exclude=new Set([...actions.objects.values()].filter(o=>o.kind==='door'&&!o.special).map(o=>o.key))
  const soup=bake.navInputFromCollider(collider,{exclude})
  const xs=[],zs=[];for(let i=0;i<soup.positions.length;i+=3){xs.push(soup.positions[i]);zs.push(soup.positions[i+2])}
  const extent=axis=>axis.reduce((a,x)=>[Math.min(a[0],x),Math.max(a[1],x)],[Infinity,-Infinity])
  const [x0,x1]=extent(xs),[z0,z1]=extent(zs)
  if((x1-x0)*(z1-z0)/(.25*.25)>750000||soup.tris>80000)throw new Error('NAV_BUDGET: source bake exceeds safe cell/triangle budget; no impossibility conclusion')
  const ag={...bake.SOUP_AGENT,height:motor.CAPSULE_HEIGHT,maxStep:Math.min(bake.SOUP_AGENT.maxStep,motor.STEP_OFFSET)}
  const baked=bake.bakeSoup(soup.positions,soup.indices,{floor:soup.minY-10,anchor:start,anchors:enemies.map(landed),agent:ag})
  const failures=[],conditions=[...initialDoorStates],routes=[],steps=[]
  let probes=0,current=[...start],outOfBudget=false
  const summaryReason='Sampled source navmesh is not a completeness proof: narrow/missing spans, one-way drops, water, movement abilities and unsupported action transitions remain possible.'
  const checkpoint=()=>{if(performance.now()-started>(limits.maxMs??90000)||probes>(limits.maxProbes??100000)){outOfBudget=true;return false}return true}
  function clearHazards(at,wish){
    for(const b of context.dungeon.blocks)if(b.layout.waterLevel!==10000&&at[0]>=b.originX&&at[0]<=b.originX+51.2&&at[2]>=b.originZ&&at[2]<=b.originZ+51.2&&at[1]<-b.layout.waterLevel*.025+.05)return 'Water traversal is not modeled; swimming/underwater capability is Unverified'
    for(const o of actions.objects.values()){
      if(!A.walkHears(o))continue
      let contact=null
      if(o.aabb){const b=o.aabb;if(at[0]<b.min[0]-.5||at[0]>b.max[0]+.5||at[1]>b.max[1]+.1||at[1]+motor.CAPSULE_HEIGHT<b.min[1]||at[2]<b.min[2]-.5||at[2]>b.max[2]+.5)continue}
      if(o.isFlat&&!o.aabb){if(o.origin&&Math.hypot(at[0]-o.origin[0],at[1]-o.origin[1],at[2]-o.origin[2])<3)return `Unmodeled flat collision trigger ${o.key}`;continue}
      contact=A.actionContact(o,at,motor.CAPSULE_HEIGHT,surfaces,wish)
      if(contact&&(A.TRIGGER_GATE[o.triggerFlag]??[]).includes(contact))return `Unmodeled automatic ${contact} action ${o.key}; chain ${mechanisms.find(m=>m.key===o.key)?.chain.join(' → ')}`
    }
    return null
  }
  function openNear(at){
    if(!profile.openDoors)return
    for(const o of actions.objects.values()){
      if(!safeDoor(o)||o.state!=='start'||!o.aabb)continue
      const c=o.aabb.min.map((v,i)=>(v+o.aabb.max[i])/2),eye=[at[0],at[1]+1.6,at[2]],dist=Math.hypot(...c.map((v,i)=>v-eye[i]))
      if(dist>3.2)continue
      const dir=c.map((v,i)=>(v-eye[i])/dist),hit=collider.raycastHit(eye,dir,dist+.05)
      if(hit.key!==o.key)continue
      if(o.currentLockValue>0){if(!profile.openSpellLevel)continue;const result=mystic.triggerOpen(o,profile.openSpellLevel);if(!result.opened)continue;conditions.push(`Cast Open at holder level ${profile.openSpellLevel} on ${o.key}; source lock threshold satisfied`)}
      const was=o.state
      actions.activate(o.key);actions.update(2)
      if(was==='start'&&o.state==='end'){const text=`Open ${o.key} at (${c.map(v=>v.toFixed(2)).join(', ')}); source ordinary-door activation and chain replayed offline`;conditions.push(text);steps.push({kind:'interaction',at:[...at],object:o.key,text,sheet:context.sheetAt(at[1])})}
    }
  }
  function replay(points,from){
    const m=new motor.PlayerMotor(collider,{speed:50,running:30,swimming:30});m.spawn(...from)
    const walked=[{at:[...m.pos],sheet:context.sheetAt(m.pos[1])}]
    let instructionAt=[...m.pos],instructionSheet=context.sheetAt(m.pos[1]),instructionDistance=0
    for(const goal of points.slice(1)){
      let stuck=0
      for(let frame=0;frame<1200;frame++){
        probes++;if(!checkpoint())return {ok:false,reason:'Motor replay budget exhausted',walked}
        const dx=goal[0]-m.pos[0],dz=goal[2]-m.pos[2],d=Math.hypot(dx,dz)
        if(d<.12&&Math.abs(goal[1]-m.pos[1])<.65)break
        const danger=clearHazards(m.pos,[dx,dz]);if(danger)return {ok:false,reason:danger,walked}
        openNear(m.pos)
        const before=[...m.pos],v=Math.min(1,d/(motor.walkSpeed(50)/60)),yaw=Math.atan2(dx,dz)
        m.update(1/60,{forward:v,strafe:0,run:false,jump:false,crouch:false},yaw)
        if(!m.pos.every(Number.isFinite))return {ok:false,reason:'Non-finite motor position',walked}
        if((m.landedFallDistance??0)>profile.maxDrop+.1||(before[1]-m.pos[1]>.05&&m.falling&&(m.fallStart-m.pos[1])>profile.maxDrop+.1))return {ok:false,reason:`Drop exceeds declared ${profile.maxDrop}m limit`,walked}
        if(Math.hypot(m.pos[0]-before[0],m.pos[2]-before[2])<.001)stuck++;else stuck=0
        if(stuck>45){
          const dir=[dx/(d||1),0,dz/(d||1)],hit=collider.raycastHit([m.pos[0],m.pos[1]+.9,m.pos[2]],dir,2),obstacle=actions.objects.get(hit.key)
          const reason=obstacle?`Source PlayerMotor blocked by ${obstacle.key}; kind ${obstacle.kind}, state ${obstacle.state}, lock ${obstacle.currentLockValue??'n/a'}, safe ordinary-door chain ${safeDoor(obstacle)}. Open spell holder level ${profile.openSpellLevel}; other bypasses unmodeled.`:`Source PlayerMotor blocked near collider ${hit.key??'unknown'}: collision, low clearance or unsampled transition`
          return {ok:false,reason,at:[...m.pos],walked}
        }
        if(frame===1199)return {ok:false,reason:'Motor could not follow source funnel within per-segment budget',walked}
        if(frame%6===0)walked.push({at:[...m.pos],sheet:context.sheetAt(m.pos[1])})
        instructionDistance+=Math.hypot(...m.pos.map((p,i)=>p-before[i]))
        const sheet=context.sheetAt(m.pos[1])
        if(instructionDistance>=5||sheet!==instructionSheet){steps.push({kind:sheet===instructionSheet?'walk':'vertical',at:[...m.pos],sheet,text:`Follow the highlighted motor-validated trace ${instructionDistance.toFixed(1)}m to (${m.pos.map(v=>v.toFixed(2)).join(', ')}), map floor ${sheet+1}${sheet!==instructionSheet?' (validated height transition)':''}.`});instructionAt=[...m.pos];instructionDistance=0;instructionSheet=sheet}
      }
    }
    if(!m.grounded){for(let i=0;i<30&&!m.grounded;i++){
      probes++;if(!checkpoint())return {ok:false,reason:'Motor settling budget exhausted',walked}
      const danger=clearHazards(m.pos,[0,0]);if(danger)return {ok:false,reason:danger,walked}
      m.update(1/60,{forward:0,strafe:0,run:false,jump:false,crouch:false},0)
      if((m.landedFallDistance??0)>profile.maxDrop+.1||m.falling&&m.fallStart-m.pos[1]>profile.maxDrop+.1)return {ok:false,reason:`Endpoint drop exceeds declared ${profile.maxDrop}m limit`,walked}
      walked.push({at:[...m.pos],sheet:context.sheetAt(m.pos[1])})
    }}
    if(!m.grounded)return {ok:false,reason:'Endpoint is not supported ground under the source motor',walked}
    const danger=clearHazards(m.pos,[0,0]);if(danger)return {ok:false,reason:danger,walked}
    walked.push({at:[...m.pos],sheet:context.sheetAt(m.pos[1])})
    return {ok:true,at:[...m.pos],walked}
  }
  function plan(from,to,id){
    const path=bake.navPath(baked,from,to)
    if(!path)return {id,status:'unknown',reasons:['No source navmesh corridor for this endpoint under current bake.',summaryReason]}
    if(Math.abs(path[0][1]-from[1])>.6||Math.abs(path.at(-1)[1]-to[1])>.6)return {id,status:'unknown',reasons:['Nav endpoint located onto a different height; route rejected.',summaryReason]}
    const before=conditions.length,stepBefore=steps.length,snapshot=actions.collectSaveData(),counts=new Map([...actions.objects.values()].map(o=>[o.key,o.activationCount])),played=replay(path,from)
    const rollback=()=>{actions.restoreSaveData(snapshot);for(const o of actions.objects.values())o.activationCount=counts.get(o.key);conditions.length=before;steps.length=stepBefore}
    if(!played.ok){rollback();if(failures.length<20)failures.push({id,reason:played.reason,at:played.at??played.walked.at(-1)?.at});return {id,status:'unknown',reasons:[played.reason,summaryReason]}}
    if(Math.hypot(played.at[0]-to[0],played.at[1]-to[1],played.at[2]-to[2])>.8){rollback();return {id,status:'unknown',reasons:['Motor endpoint differs from requested landed target; no route claimed.']}}
    return {id,status:conditions.length>before||conditions.length?'reachable_with_conditions':'reachable',points:played.walked,distance:played.walked.slice(1).reduce((n,p,i)=>n+Math.hypot(...p.at.map((v,k)=>v-played.walked[i].at[k])),0),end:played.at,reasons:[],conditions:[...conditions]}
  }
  progress({phase:'Source navmesh baked; validating paths with PlayerMotor'})
  const pending=[...targets],outcomes=[]
  while(pending.length&&checkpoint()){
    if(['species','tour'].includes(profile.goal))pending.sort((a,b)=>Math.hypot(a.x-current[0],a.z-current[2])-Math.hypot(b.x-current[0],b.z-current[2]))
    const enemy=pending.shift(),target=landed(enemy)
    if(Math.abs(enemy.y-target[1])>3){outcomes.push({id:enemy.id,status:'unknown',reasons:['Target marker landing differs by more than 3m; vertical target access unverified.']});continue}
    const route=plan(current,target,enemy.id);outcomes.push(route)
    if(route.points){routes.push({kind:'outbound',target:enemy.id,...route});current=route.end;steps.push({kind:'destination',at:[...current],sheet:context.sheetAt(current[1]),text:enemy.id==='coffer'?'Reach the source-verified Aurum coffer foot; account reward availability remains unverified.':`Reach ${enemy.id} mobileType ${enemy.mobileType} near source marker (${enemy.x.toFixed(2)}, ${enemy.y.toFixed(2)}, ${enemy.z.toFixed(2)}); combat and moving enemies are not modeled.`})}
    await new Promise(resolve=>setImmediate(resolve))
  }
  for(const enemy of pending)outcomes.push({id:enemy.id,status:'unknown',reasons:['Search budget exhausted; not proof of impossibility.']})
  for(const enemy of selected.slice(128))outcomes.push({id:enemy.id,status:'unknown',reasons:['128-objective budget exceeded; not proof of impossibility.']})
  const exit=profile.returnToEntrance?plan(current,entrance,'entrance'):null
  if(exit?.points){routes.push({kind:'return',...exit});steps.push({kind:'exit',at:exit.end,sheet:context.sheetAt(exit.end[1]),text:'Return to the source walk-in entrance landing; exiting the game instance is a manual action.'})}
  const reached=outcomes.filter(o=>o.points).length
  const status=reached===0?'unknown':reached<outcomes.length||(exit&&!exit.points)?'partially_reachable':[...outcomes,...(exit?[exit]:[])].some(o=>o.status==='reachable_with_conditions')?'reachable_with_conditions':'reachable'
  return {schema:1,mapId:geometry.mapId,profile,status,outcomes,routes,steps,exit,mechanisms,entrance:{at:entrance,sheet:context.sheetAt(entrance[1])},stats:{...baked.stats,targets:outcomes.length,reached,probes,elapsedMs:Math.round(performance.now()-started),outOfBudget},failures:failures.map(f=>({...f,sheet:f.at?context.sheetAt(f.at[1]):-1})),assumptions:['Fresh static source geometry; source startMarker walk-in landing (or selected marker start); standing walking only. No combat, swimming, climbing, jumping, levitation or dynamic mover timing.',`Maximum modeled drop ${profile.maxDrop}m; source PlayerMotor fixed 60Hz, speed 50; user-declared door states are assumptions.`, 'Source navBake uses 0.25m cells; candidate paths are replayed through the real capsule motor. Missing sampled edges never prove impossibility.', 'Multi-target order is nearest-next heuristic, not a globally shortest tour. Up to 128 base objectives per species request; Elite copies may be selected individually.', 'Action chains/secrets/teleport destinations are indexed from source. Unsupported automatic triggers stop validation; teleporters/movers are not yet route transitions.'],provenance:game.provenance,completeModel:false}
}
