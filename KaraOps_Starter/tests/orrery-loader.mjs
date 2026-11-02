import ts from 'typescript'
import {readFileSync} from 'node:fs'
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64')
const compile=p=>ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
export const referenceUrl=data(compile('src/renderer/src/orrery/source.ts'))
export const reference=await import(referenceUrl)
export const logic=await import(data(compile('src/renderer/src/orrery/logic.ts').replace("'./source'",JSON.stringify(referenceUrl))))
