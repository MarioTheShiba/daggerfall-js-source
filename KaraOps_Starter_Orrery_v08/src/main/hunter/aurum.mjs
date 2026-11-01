import fs from 'node:fs'
import {join} from 'node:path'
import {createRequire} from 'node:module'
import {digest} from './compatibility.mjs'
import {assembleGeometry} from './geometry.mjs'
import {actionIndex} from './actions.mjs'
export const AURUM_REVISION='090f4288666940c9b47f08cf0264d9a40ad29097'
const requireHere=createRequire(import.meta.url)
function dependencies(appPath){const req=appPath?createRequire(join(appPath,'package.json')):requireHere;return {parse:req('acorn').parse}}
export function selectDeclarations(source,names,parse){
 const found=new Set(),out=[]
 for(const node of parse(source,{ecmaVersion:'latest',sourceType:'module'}).body){const d=node.type==='ExportNamedDeclaration'?node.declaration:node;if(!d)continue
  if(d.type==='FunctionDeclaration'&&names.includes(d.id.name)){found.add(d.id.name);out.push(source.slice(d.start,d.end))}
  if(d.type==='VariableDeclaration')for(const v of d.declarations)if(v.id.type==='Identifier'&&names.includes(v.id.name)){found.add(v.id.name);out.push(`${d.kind} ${source.slice(v.start,v.end)};`)}
 }
 if(names.some(n=>!found.has(n)))throw new Error(`AURUM_SOURCE_MISMATCH: missing pure declarations ${names.filter(n=>!found.has(n)).join(', ')}`)
 return out.join('\n')
}
export async function aurumSource(settings,game,appPath){
 const {parse}=dependencies(appPath),bundle=JSON.parse(fs.readFileSync(new URL('aurum-source.json',import.meta.url),'utf8')),source=bundle.hashes
 if(bundle.revision!==AURUM_REVISION)throw new Error('AURUM_SOURCE_MISMATCH: reference revision')
 for(const [path,hash]of Object.entries(bundle.helpers))if(digest(fs.readFileSync(join(settings.dfoSourcePath,'src/'+path+'.js'),'utf8').replaceAll('\r\n','\n'))!==hash)throw new Error('AURUM_HELPER_VERSION_MISMATCH: '+path+'; coffer prediction withheld')
 const current=fs.readFileSync(join(settings.dfoSourcePath,'src/net/wire.js'),'utf8')
 if(selectDeclarations(current,['isHallMapId'],parse)!==bundle.isHallMapId)throw new Error('AURUM_HELPER_VERSION_MISMATCH: isHallMapId')
 const {lawText,host,art}=bundle
 if(digest(lawText)!==source['net/aurumCacheLaw']||digest(host)!==source['scenes/aurumCacheHost']||digest(art)!==source['world/aurumCofferArt'])throw new Error('AURUM_SOURCE_MISMATCH: reference checksum')
 const law=await import(`data:text/javascript;base64,${Buffer.from(lawText).toString('base64')}`)
 const names=['AURUM_CACHE_GAP_M','AURUM_CACHE_CLEAR_M','AURUM_CACHE_SIDE_M','AURUM_CACHE_SHIN_M','AURUM_CACHE_KNEE_M','AURUM_CACHE_STEP_M','COFFER_HW','COFFER_H','MESH','MESH_ONLY','NOT_MESH','DOWN','UP','EIGHT','aurumCachePlaceOf','meets','aurumCofferBox','aurumPileBox','aurumCacheFoot','footBeside','walled','aurumCofferYaw']
 const bindings={...law,GLOBAL_SCALE:game.modules.mesh.GLOBAL_SCALE,...await game.load('aurumWire','net/wire'),...await game.load('identity','scenes/dungeonIdentity'),...await game.load('made','systems/madeLevel'),...await game.load('tier','systems/dungeon/dungeonTier'),...await game.load('arenaFloor','world/arena/arenaFloor'),...await game.load('arenaCity','world/arena/arenaCity')}
 const needed=['aurumCacheDungeonKey','GLOBAL_SCALE','isHallMapId','dungeonIdOf','madeLevelOf','dungeonTier','isArenaFloor','isArenaUndercroft']
 // Compile only audited pure AST declarations. Account, storage, claim, activation and host functions are excluded.
 const code=selectDeclarations(art,['AURUM_COFFER_SIZE'],parse)+'\n'+selectDeclarations(host,names,parse)
 const api=new Function(...needed,`"use strict";${code};return {aurumCachePlaceOf,aurumCacheFoot,aurumCofferBox,aurumPileBox,aurumCofferYaw}`)(...needed.map(n=>bindings[n]))
 return {...api,...law,revision:AURUM_REVISION,fingerprint:digest(JSON.stringify(source)),source}
}
export async function reconstructPiles(game,context,arena){
 const {TextureFile}=await game.load('textureFile','formats/textureFile'),{classicBillboardSize}=await game.load('flats','world/rmbFlats'),{floorLanding}=await game.load('landing','player/enterExit'),L=await game.load('lootTables','systems/loot/loot')
 const bytes=fs.readFileSync(join(arena,'TEXTURE.216')),t=new TextureFile();if(!t.load(new Uint8Array(bytes),'TEXTURE.216'))throw new Error('AURUM_TEXTURE_ERROR: TEXTURE.216')
 const piles=[]
 for(const [bi,b] of context.dungeon.blocks.entries())for(const m of b.layout.markers){const random=!m.archive&&m.record===L.RANDOM_TREASURE_MARKER_RECORD,fixed=m.archive===L.RANDOM_TREASURE_ARCHIVE;if(!random&&!fixed)continue
  const roll=game.modules.roomLoot.seededRolls(`dungeon:${context.built.dungeon?.recordElement?.header?.locationId??'probe'}|loot:${piles.length}|icon`)
  const record=fixed?m.record:L.RANDOM_TREASURE_ICONS[Math.floor(roll()*L.RANDOM_TREASURE_ICONS.length)],raw=[m.x+b.originX,m.y,m.z+b.originZ]
  // A missing texture stands no batch in the host and is not sized for placement.
  if(record>=t.recordCount){piles.push({pos:raw,isFixed:fixed,record,blockIndex:bi});continue}
  const size=classicBillboardSize(t,record),pos=fixed?[raw[0],raw[1]-size.h/2,raw[2]]:floorLanding(context.collider,[raw[0],raw[1]+.2,raw[2]])
  piles.push({pos,isFixed:fixed,record,lawHalf:[size.w/2,size.h/2],half:[size.w/2,size.h/2],blockIndex:bi})
 }
 return {piles,textureFingerprint:digest(bytes)}
}
export function publicCoffer(privateResult,approval){
 const {foot,sheet,pile,navigationResult,...ordinary}=privateResult
 return {...ordinary,approved:approval?.approved===true&&typeof approval.authority==='string'&&approval.authority.trim().length>0&&typeof approval.evidence==='string'&&approval.evidence.trim().length>0,...(approval?.approved===true&&approval.authority?.trim()&&approval.evidence?.trim()?{foot,sheet,pile,navigationResult}:{})}
}
export async function analyzeCoffer(game,settings,spec,appPath){
 const src=await aurumSource(settings,game,appPath),context={}
 const geometry=await assembleGeometry(game,spec,context),{collider}=await actionIndex(game,context,'dungeon');context.collider=collider
 const {piles,textureFingerprint}=await reconstructPiles(game,context,settings.arena2Path),id=src.aurumCachePlaceOf(context.built),spot=id?src.aurumCacheSpotOf(id):null
 let chosen=-1
 const probe={raycastHit:(origin,...args)=>{chosen=piles.findIndex(p=>p.pos[0]===origin[0]&&Math.abs(p.pos[1]+.5-origin[1])<1e-9&&p.pos[2]===origin[2]);return collider.raycastHit(origin,...args)},raycast:collider.raycast.bind(collider),bucketBoxes:collider.bucketBoxes.bind(collider)}
 const foot=id?src.aurumCacheFoot(piles,spot,probe):null,p=foot?piles[chosen]:null,pile=p?{index:chosen,record:p.record,isFixed:p.isFixed,blockIndex:p.blockIndex}:null
 return {mapId:geometry.mapId,status:!id?'ineligible':foot?'placement_verified':'no_valid_placement',id,foot,sheet:foot?context.sheetAt(foot[1]):null,pile,navigation:'unknown',sourceRevision:src.revision,sourceFingerprint:src.fingerprint,textureFingerprint,reward:src.AURUM_CACHE_AURUM,dailyMax:src.AURUM_CACHE_DAY_MAX,accountState:'unknown',diagnostic:!id?'Source eligibility excludes this dungeon.':foot?'Source placement succeeded for original texture sizes and closed doors / at-rest movers. Navigation to the coffer has not been verified; placement is not a reachability claim. Exact position requires recorded developer approval.':'Source exhausted all eight directions for every eligible pile; no valid placement in this reconstructed at-rest collider. This is not a navigation impossibility proof.',geometryIdentity:{mapId:geometry.mapId,sourceFingerprint:game.provenance.sourceFingerprint}}
}
