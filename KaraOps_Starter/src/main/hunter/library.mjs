import {mkdirSync,readdirSync,readFileSync,writeFileSync,renameSync,statSync} from 'node:fs'
import {join} from 'node:path'
import {digest} from './compatibility.mjs'
export function library(dir){
 mkdirSync(dir,{recursive:true})
 return readdirSync(dir).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).map(n=>{try{const d=readDataset(dir,n.slice(0,-5));return{id:d.id,capturedAt:d.capturedAt,request:d.request,coverage:d.coverage,candidates:d.candidates.length,scope:d.scope,sourceFingerprint:d.provenance.sourceFingerprint}}catch{return null}}).filter(Boolean)
}
export function readDataset(dir,id){
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw new Error('Invalid capture ID')
 const path=join(dir,`${id}.json`);if(statSync(path).size>24000000)throw new Error('Capture exceeds size limit')
 const e=JSON.parse(readFileSync(path,'utf8'))
 if(e.schema!==1||e.value?.schema!==1||e.value.id!==id||digest(JSON.stringify(e.value))!==e.checksum||!Array.isArray(e.value.candidates)||e.value.candidates.length>8000)throw new Error('Invalid or corrupt capture; rescan required')
 return e.value
}
export function saveDataset(dir,value){
 mkdirSync(dir,{recursive:true});const path=join(dir,`${value.id}.json`),body=JSON.stringify(value)
 try{const previous=readDataset(dir,value.id);if(previous.coverage?.completeWithinQuery&&!value.coverage?.completeWithinQuery)throw new Error('COMPLETE_CAPTURE_PRESERVED: partial rerun cannot replace completed exploration')}catch(error){if(error.message.startsWith('COMPLETE_CAPTURE_PRESERVED'))throw error}
 if(Buffer.byteLength(body)>23000000)throw new Error('Capture exceeds bounded library entry budget; reduce search radius')
 const entries=readdirSync(dir).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));if(!entries.includes(`${value.id}.json`)&&entries.length>=24)throw new Error('Capture library full (24 queries). Archive captures before adding a new region; existing exploration is preserved.')
 writeFileSync(`${path}.tmp`,JSON.stringify({schema:1,checksum:digest(body),value}));renameSync(`${path}.tmp`,path)
 return value.id
}
