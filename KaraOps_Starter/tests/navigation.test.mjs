import test from 'node:test'
import assert from 'node:assert/strict'
import {navigationRequest} from '../src/main/hunter/navigation.mjs'
const profile={goal:'single',targetIds:['enemy:87'],species:34,startId:'entrance',openDoors:true,returnToEntrance:true,openSpellLevel:30,maxDrop:1,doorStates:{}}
test('navigation boundary accepts explicit modeled capabilities and rejects malformed objectives/states',()=>{
  assert.deepEqual(navigationRequest(profile),profile)
  for(const patch of [{goal:'teleport'},{targetIds:[]},{targetIds:['enemy:87','enemy:87']},{targetIds:['act:0:1']},{maxDrop:NaN},{openSpellLevel:-1},{openDoors:'yes'},{doorStates:[]},{doorStates:{'act:0:1':'broken'}},{startId:'../../data'}])assert.throws(()=>navigationRequest({...profile,...patch}))
})
