/** Patch a COPY of the KaraOps_Starter project, preserving the source project. Run: node apply.mjs "C:\\path\\to\\KaraOps_Starter" */
import {existsSync,cpSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {join,resolve,dirname,basename} from 'node:path'
import {fileURLToPath} from 'node:url'
const here=dirname(fileURLToPath(import.meta.url)),source=resolve(process.argv[2]||'')
if(!process.argv[2]||!existsSync(join(source,'src/main/index.ts'))||!existsSync(join(source,'src/renderer/src/App.tsx')))throw Error('Specify the existing KaraOps_Starter folder, e.g. node apply.mjs "C:\\repos\\daggerfall-js-source\\KaraOps_Starter"')
const target=resolve(dirname(source),basename(source)+'_Orrery_v08')
if(existsSync(target))throw Error(`Refusing to replace an existing folder: ${target}`)
cpSync(source,target,{recursive:true,filter:path=>!/[/\\](?:node_modules|release|out|dist|\.git)(?:[/\\]|$)/.test(path)})
const updates={
 'src/main/index.ts':[
  ["import {CompanionService} from './companion/service'","import {CompanionService} from './companion/service'\nimport { OrreryObserver } from './orrery/observer'"],
  ["const companion=new CompanionService()","const companion=new CompanionService()\nconst orrery=new OrreryObserver()"],
  ["app.on('before-quit',()=>{void companion.stop()})","app.on('before-quit',()=>{void companion.stop()})\napp.on('before-quit',()=>{orrery.stop()})"],
  ["function installIpc(): void {", "function installIpc(): void {\n  ipcMain.handle('orrery:start',async(event,port:unknown)=>{verifySender(event);return orrery.start(port)})\n  ipcMain.handle('orrery:stop',event=>{verifySender(event);return orrery.stop()})\n  ipcMain.handle('orrery:status',event=>{verifySender(event);return orrery.status()})"]
 ],
 'src/shared/types.ts':[
  ["  companion: import('./liveTypes').CompanionBridge","  companion: import('./liveTypes').CompanionBridge\n  orrery: import('./orreryTypes').OrreryBridge"]
 ],
 'src/preload/index.ts':[
  ["  companion:{start:origin=>ipcRenderer.invoke('companion:start',origin),stop:()=>ipcRenderer.invoke('companion:stop'),status:()=>ipcRenderer.invoke('companion:status')},",
   "  companion:{start:origin=>ipcRenderer.invoke('companion:start',origin),stop:()=>ipcRenderer.invoke('companion:stop'),status:()=>ipcRenderer.invoke('companion:status')},\n  orrery:{start:port=>ipcRenderer.invoke('orrery:start',port),stop:()=>ipcRenderer.invoke('orrery:stop'),status:()=>ipcRenderer.invoke('orrery:status')},"]
 ],
 'package.json':[["\"version\": \"0.7.0\"","\"version\": \"0.8.0\""]],
 'src/renderer/src/App.tsx':[
  ["import { Hunter } from './hunter/Hunter'","import { Hunter } from './hunter/Hunter'\nimport { Orrery } from './orrery/Orrery'"],
  ["type Page = 'dashboard' | 'dungeons' | 'dragons' | 'map' | 'settings'","type Page = 'dashboard' | 'dungeons' | 'dragons' | 'map' | 'orrery' | 'settings'"],
  ["  { page: 'map', label: 'World Atlas', icon: '◇' },","  { page: 'map', label: 'World Atlas', icon: '◇' },\n  { page: 'orrery', label: 'Orrery Solver', icon: '◷' },"],
  ["  { page: 'map', title: 'World Atlas', description: 'A shared map for candidate locations, towns, and routes.', icon: '◇', phase: 'PLANNED' }",
   "  { page: 'map', title: 'World Atlas', description: 'A shared map for candidate locations, towns, and routes.', icon: '◇', phase: 'PLANNED' },\n  { page: 'orrery', title: 'Orrery Solver', description: 'Detect Shattered Hour slot IDs through the local DevTools interface and guide clock turns.', icon: '◷', phase: 'OPTIONAL / READ ONLY' }"],
  ["const selectedModule = modules.find((m) => m.page === page && m.page !== 'dungeons')",
   "const selectedModule = modules.find((m) => m.page === page && m.page !== 'dungeons' && m.page !== 'orrery')"],
  ["        {page === 'dungeons' && <Hunter/>}","        {page === 'dungeons' && <Hunter/>}\n        {page === 'orrery' && <Orrery/>}"]
 ]
}
for(const [file,patches] of Object.entries(updates)){
 const path=join(target,file);let s=readFileSync(path,'utf8')
 for(const [oldText,newText] of patches){const index=s.indexOf(oldText);if(index<0||s.indexOf(oldText,index+oldText.length)>=0)throw Error(`Patch mismatch in ${file}: ${oldText.slice(0,65)}`);s=s.replace(oldText,newText)}
 writeFileSync(path,s)
}
const files=['src/shared/orreryTypes.ts','src/main/orrery/observer.ts','src/renderer/src/orrery/logic.ts','src/renderer/src/orrery/Orrery.tsx']
for(const f of files){const dst=join(target,f);mkdirSync(dirname(dst),{recursive:true});cpSync(join(here,'files',f),dst)}
console.log(`Created separate KaraOps source project: ${target}\nRun npm.cmd install and npm.cmd run portable inside it. No existing application, data, or DFO sources were modified.`)
