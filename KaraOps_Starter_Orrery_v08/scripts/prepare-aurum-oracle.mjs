// Private test fixture: a read-only export, never a checkout or edit of the DFO tree.
import {execFileSync} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve,dirname,join} from 'node:path'
import {AURUM_REVISION} from '../src/main/hunter/aurum.mjs'
const target=resolve('release/verification/aurum-oracle'),archive=resolve('release/verification/aurum-oracle.zip')
mkdirSync(target,{recursive:true})
execFileSync('git',['-C','..','archive','--format=zip','--output='+archive,AURUM_REVISION,'src','package.json','LICENSE'],{windowsHide:true})
execFileSync('tar',['-xf',archive,'-C',target],{windowsHide:true})
const paths=execFileSync('git',['-C','..','ls-tree','-r','--name-only',AURUM_REVISION,'vendor'],{encoding:'utf8',windowsHide:true}).trim().split('\n').filter(p=>p.endsWith('.json'))
for(const p of paths){const file=join(target,p);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,execFileSync('git',['-C','..','show',AURUM_REVISION+':'+p],{maxBuffer:20000000,windowsHide:true}))}
console.log('Untouched fetched-module oracle prepared in',target)
