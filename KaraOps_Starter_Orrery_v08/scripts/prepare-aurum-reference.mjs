// Build-time, read-only extraction from a pinned fetched commit. Git is not needed by the portable app.
import {execFileSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {parse} from 'acorn'
import {selectDeclarations,AURUM_REVISION} from '../src/main/hunter/aurum.mjs'
import {digest} from '../src/main/hunter/compatibility.mjs'
const root=new URL('../../',import.meta.url),hashes={}
const read=path=>{const text=execFileSync('git',['-C',root.pathname.slice(1),'show',`${AURUM_REVISION}:src/${path}.js`],{encoding:'utf8',maxBuffer:4000000,windowsHide:true});hashes[path]=digest(text);return text}
const helpers=Object.fromEntries(['world/meshReader','world/rmbFlats','world/actionSystem','world/rdbLayout','world/dungeon/dungeonLayout','player/collider','player/motor','player/enterExit','formats/textureFile','systems/roomLoot','systems/loot/loot','systems/loot/lootDataTables','scenes/dungeonIdentity','systems/madeLevel','systems/dungeon/dungeonTier','world/arena/arenaFloor','world/arena/arenaCity'].map(p=>[p,digest(read(p))]))
const lawText=read('net/aurumCacheLaw'),host=read('scenes/aurumCacheHost'),art=read('world/aurumCofferArt'),isHallMapId=selectDeclarations(read('net/wire'),['isHallMapId'],parse)
writeFileSync(new URL('../src/main/hunter/aurum-source.json',import.meta.url),JSON.stringify({revision:AURUM_REVISION,hashes,helpers,lawText,host,art,isHallMapId},null,2))
writeFileSync(new URL('../src/main/hunter/DFO-LICENSE.txt',import.meta.url),execFileSync('git',['-C',root.pathname.slice(1),'show',`${AURUM_REVISION}:LICENSE`],{encoding:'utf8',windowsHide:true}))
console.log('Pinned Aurum reference prepared:',AURUM_REVISION)
