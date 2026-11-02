import ts from 'typescript'
import {readFileSync} from 'node:fs'
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
export const protocolUrl=data(compile('src/main/orrery/protocol.ts'))
export const {PuzzleSession,puzzleRoom}=await import(protocolUrl)
export const {OrreryObserver,approvedTarget}=await import(data(compile('src/main/orrery/observer.ts').replace("'./protocol'",JSON.stringify(protocolUrl))))
