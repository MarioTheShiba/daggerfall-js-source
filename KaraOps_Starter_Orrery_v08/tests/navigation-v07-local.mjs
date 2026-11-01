import test from 'node:test'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {pathToFileURL} from 'node:url'
import {resolve} from 'node:path'
import {mkdirSync,writeFileSync} from 'node:fs'
import {openGame} from '../src/main/hunter/engine.mjs'
import {navigate} from '../src/main/hunter/navigation.mjs'
const game=await openGame({dfoSourcePath:resolve('..'),arena2Path:'C:/Program Files (x86)/Steam/steamapps/common/The Elder Scrolls Daggerfall/DF/DAGGER/ARENA2'})
const request={px:785,py:100,level:30,species:34,profile:'dex-mudex',alternate:false},spec={px:785,py:100,request},profile={goal:'species',targetIds:[],species:34,startId:'entrance',openDoors:true,returnToEntrance:true,openSpellLevel:0,maxDrop:0,doorStates:{}}
test('v0.6 large multi-floor regression reproduced; v0.7 retains bounded, motor-validated positive routes',async()=>{
 let old=execFileSync('git',['show','a269f52b6336f5b1b1b29bad10c48f7589dfa4e2:KaraOps_Starter/src/main/hunter/navigation.mjs'],{encoding:'utf8',windowsHide:true})
 for(const name of ['geometry','actions'])old=old.replace(`'./${name}.mjs'`,JSON.stringify(pathToFileURL(resolve(`src/main/hunter/${name}.mjs`)).href))
 const baseline=await import('data:text/javascript;base64,'+Buffer.from(old).toString('base64'))
 await assert.rejects(()=>baseline.navigate(game,spec,profile),/NAV_BUDGET/)
 const result=await navigate(game,spec,profile)
 assert.equal(result.stats.cs,.35);assert.ok(result.stats.reached>0);assert.equal(result.stats.targets,9);assert.equal(result.status,'partially_reachable');assert.equal(result.completeModel,false)
 assert.ok(result.outcomes.some(o=>o.status==='unknown'));assert.ok(result.routes.every(r=>r.points.length>1&&r.points.every(p=>p.at.every(Number.isFinite))))
 mkdirSync('release/verification/v07',{recursive:true});writeFileSync('release/verification/v07/large-navigation.json',JSON.stringify({mapId:result.mapId,stats:result.stats,status:result.status,exit:result.exit?.status,source:game.provenance.sourceFingerprint,baseline:'NAV_BUDGET',assumptions:result.assumptions},null,2))
})
