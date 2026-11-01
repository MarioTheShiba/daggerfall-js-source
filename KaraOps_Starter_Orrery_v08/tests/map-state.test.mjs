import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import {readFileSync} from 'node:fs'
import {proposalGrid} from '../src/main/hunter/navigation.mjs'
const js=ts.transpileModule(readFileSync('src/renderer/src/hunter/mapState.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const {retainedMap,shownNavigation,validMapFocus}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
const g={mapId:1137342,plans:[{index:0},{index:1}],provenance:{sourceFingerprint:'source'}}
test('valid reconstructed map survives navigation running, failure, cancellation and completion',()=>{
 for(const state of ['running','analysis_error','cancelled','complete'])assert.equal(retainedMap({geometry:g,state,error:'NAV_BUDGET'},g.mapId),g)
 assert.equal(retainedMap({geometry:g,state:'complete'},1),undefined)
})
test('failed/cancelled/in-progress jobs cannot display stale successful routes',()=>{
 const navigation={mapId:g.mapId},coffer={approved:true,mapId:g.mapId,navigationResult:{mapId:g.mapId,id:'older-coffer'}}
 for(const state of ['running','analysis_error','cancelled'])assert.equal(shownNavigation({state,navigation,jackpot:{aurum:coffer}},g),undefined)
 assert.equal(shownNavigation({state:'complete',navigation,jackpot:{aurum:coffer}},g),navigation)
 assert.equal(shownNavigation({state:'complete',navigation:{mapId:5}},g),undefined)
 assert.equal(shownNavigation({state:'complete',jackpot:{aurum:{...coffer,approved:false}}},g),undefined)
})
test('unknown floor or non-finite waypoint never changes the map to a blank sheet',()=>{
 assert.equal(validMapFocus(g,[1,2,3],1),true)
 for(const [at,sheet]of [[[1,2,3],-1],[[1,2,3],3],[[NaN,0,0],0],[[1,2],0]])assert.equal(validMapFocus(g,at,sheet),false)
})
test('large-dungeon proposal grids remain bounded and do not remove motor validation',()=>{
 assert.equal(proposalGrid(30000),.25);assert.equal(proposalGrid(48000),.35);assert.equal(proposalGrid(150000),.5)
 assert.equal(proposalGrid(300000),null);assert.equal(proposalGrid(Infinity),null)
})
