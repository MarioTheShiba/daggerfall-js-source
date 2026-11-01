import test from 'node:test'
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {mkdirSync,writeFileSync} from 'node:fs'
import {openGame} from '../src/main/hunter/engine.mjs'
const game=await openGame({dfoSourcePath:process.env.DFO_SOURCE_PATH||resolve('..'),arena2Path:process.env.ARENA2_PATH||'C:/Program Files (x86)/Steam/steamapps/common/The Elder Scrolls Daggerfall/DF/DAGGER/ARENA2'})
test('reserved-place gate matches the actual source TamrielPlaces host',async()=>{
 const {createTamrielPlaces}=await game.load('placeHost','scenes/tamrielPlacesHost'),C=game.modules.country,D=game.modules.lairs,a=game.world.auditInputs
 const host={_arenaTemplates:a.arenaTemplates,_capitalBase:game.modules.capitals.capitalBase(a.rows,game.modules.textures.isMainStoryDungeon),_countryTemplates:a.countryTemplates,_countryCounts:C.countryCounts(a.countryTemplates,(x,y)=>game.maps.getClimateIndex(x,y)),_lairTemplates:a.lairTemplates,_lairCounts:C.countryCounts(a.lairTemplates,(x,y)=>game.maps.getClimateIndex(x,y)),_lairPools:a.lairPools,arenaJoinLand:()=>true,arenaRoadsLanded:()=>{},arenaStands:true,blocks:{},locationIndex:new Map(game.index),maps:game.maps,tamrielLand:false,terrainGen:null,townSeats:null,woods:game.world.woods,worldPlaces:null,zoneHalls:null}
 const oracle=createTamrielPlaces(host).provinceQuestPlaces;let checked=0,mismatches=[]
 for(const t of game.catalog.theatres.slice(1))for(let i=0;i<1000;i++){
  const x=t.px+(i*7919)%401-200,y=t.py+(i*1543)%383-191;if(game.world.frame.inBay(x,y))continue
  const expected=oracle.placeOnPixel(x,y),actual=game.world.placeAt(x,y);checked++;if(expected!==actual)mismatches.push({x,y,expected,actual})
 }
 const sourceLand=C.bayLand((x,y)=>game.maps.getClimateIndex(x,y),(x,y,c)=>game.modules.water.isWaterPixel(c,game.world.woods.getHeightMapValue(x,y)))
 const rawLand=C.bayLand((x,y)=>a.rawMaps.getClimateIndex(x,y),(x,y,c)=>game.modules.water.isWaterPixel(c,a.rawWoods.getHeightMapValue(x,y)))
 mkdirSync('release/verification',{recursive:true});writeFileSync('release/verification/world-place-host.json',JSON.stringify({checked,mismatches,sourceLand:[...sourceLand],rawLand:[...rawLand]},null,2))
 assert.deepEqual(mismatches,[])
 assert.deepEqual([...sourceLand],[...a.bayLand],'density basis must match the actual source host')
})
