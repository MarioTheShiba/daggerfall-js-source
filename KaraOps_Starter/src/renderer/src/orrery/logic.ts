// Shared Abyss / Elite Breach adapter around DFO's pinned pure puzzle functions.
import {orreryOf, orreryTurn, orrerySolve, sdHour, sdHourShown, egSeed, egCircleOfHall, egSlotOfHall, egCirclePlan, egOrreryTurns, egFrayOf} from './source'
export const STONES = ['Daggerfall', 'Sentinel', 'Wayrest', 'Orsinium', 'the Underking', 'the Blades'] as const
export interface OrreryStep {name:string; direction:'RIGHT'|'LEFT';count:number;stone:number}
export interface OrreryPuzzle {slot:number;initial:number[];target:number[];gear:number[][];order:number[];current:number[];steps:OrreryStep[];turns:number;fray:number;circle?:number;hall?:number;seed?:number}
export const hourShown=(x:number):number=>sdHourShown(x)
const hours=(value:number[])=>{if(value.length!==6||value.some(x=>!Number.isInteger(x)||x<0||x>11))throw Error('Enter six hours, 1–12.');return value.slice()}
export const shownToHours=(v:number[])=>{if(v.length!==6||v.some(x=>!Number.isInteger(x)||x<1||x>12))throw Error('Enter six hours, 1–12.');return v.map(x=>x%12)}
export function gearingOrder(gear:number[][]):number[]{
 if(gear.length!==6||gear.some((row,i)=>row.length!==6||row.some(x=>!Number.isInteger(x)||Math.abs(x)>11)||row[i]!==1))throw Error('Gearing needs six rows of integer deltas; each handle must move its own clock +1.')
 const order:number[]=[]
 while(order.length<6){const i=gear.findIndex((row,i)=>!order.includes(i)&&row.every((v,j)=>j===i||sdHour(v)===0||order.includes(j)));if(i<0)throw Error('Calibration does not match DFO’s triangular gearing. Check the six measurements; this is not proof of an impossible puzzle.');order.push(i)}
 return order
}
export function routeFor(gear:number[][],current:number[],target:number[]):{steps:OrreryStep[];turns:number;order:number[]}{
 const order=gearingOrder(gear),start=hours(current),truth=hours(target)
 const residues:number[]=orrerySolve({order,gear,truth},start)
 const signed=residues.map(t=>t<=6?t:t-12)
 const steps=order.slice().reverse().filter(i=>signed[i]!==0).map(i=>({name:STONES[i],stone:i,direction:signed[i]>0?'RIGHT' as const:'LEFT' as const,count:Math.abs(signed[i])}))
 let end=start
 for(const step of steps)for(let n=0;n<step.count;n++)end=turnHours(gear,end,step.stone,step.direction==='RIGHT'?1:-1)
 if(end.some((v,i)=>v!==truth[i]))throw Error('Internal solution replay failed.')
 // Unit-triangular determinant 1 gives unique handle residues mod 12. Choosing each shortest signed residue is globally minimal.
 return {steps,turns:steps.reduce((s,x)=>s+x.count,0),order}
}
export function turnHours(gear:number[][],current:number[],stone:number,direction:number):number[]{
 hours(current);if(!Number.isInteger(stone)||stone<0||stone>5||![1,-1].includes(direction))throw Error('Invalid handle turn')
 return orreryTurn({gear},current,stone,direction)
}
function adapt(slot:number,o:any,current?:number[]):OrreryPuzzle {
 const actual=hours(current??o.start),gear=o.gear.map((r:number[])=>r.slice())
 return {slot,initial:o.start.map(hourShown),target:o.truth.map(hourShown),gear,current:actual,fray:o.fray,...routeFor(gear,actual,o.truth)}
}
export function puzzleOf(slot:number,current?:number[]):OrreryPuzzle{
 if(!Number.isSafeInteger(slot)||slot<1)throw Error('Enter a positive safe-integer Abyss slot ID.')
 return adapt(slot,orreryOf(slot),current)
}
export function breachHall(seed:number,hall:number):{circle:number;slot:number;kind:string;twist:string|null}{
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Breach seed must be an unsigned 32-bit integer (0–4294967295).')
 if(!Number.isInteger(hall)||hall<1||hall>10000)throw Error('Hall must be an integer from 1 to 10000 (bounded plan reconstruction).')
 const circle=egCircleOfHall(hall),slot=egSlotOfHall(hall),plan=egCirclePlan(seed,circle)[slot-1]
 return {circle,slot,kind:plan.kind,twist:plan.twist}
}
export function elitePuzzleOf(seed:number,hall:number,fraying:0|1|2=0,current?:number[]):OrreryPuzzle{
 if(![0,1,2].includes(fraying))throw Error('Invalid Fraying rank')
 const spec=breachHall(seed,hall)
 if(spec.kind!=='athenaeum')throw Error(`Hall ${hall}, Circle ${spec.circle} is ${spec.kind} under the pinned DFO law, not an Athenaeum. Check seed/hall or use manual calibration for a different source version.`)
 const s=(egSeed(seed,0x0a7e+hall)%2147483646)+1
 const o=(orreryOf as (s:number,opts:unknown)=>any)(s,{...egOrreryTurns(spec.circle),...(fraying?{fray:egFrayOf(spec.circle,fraying)}:{})})
 return {...adapt(s,o,current),seed,hall,circle:spec.circle}
}
export function calibratedPuzzle(current:number[],target:number[],gear:number[][],fray:number):OrreryPuzzle {
 if(!Number.isInteger(fray)||fray<1||fray>48)throw Error('Fray limit must be 1–48.')
 return {slot:0,initial:hours(current).map(hourShown),current:hours(current),target:hours(target).map(hourShown),gear:gear.map(r=>r.slice()),fray,...routeFor(gear,current,target)}
}
export function measuredGear(before:number[],after:number[],stone:number):number[]{
 hours(before);hours(after);if(!Number.isInteger(stone)||stone<0||stone>5)throw Error('Invalid measurement clock')
 const row=before.map((h,i)=>{const d=sdHour(after[i]-h);return d<=6?d:d-12})
 if(row[stone]!==1)throw Error('A forward measurement must move its own clock exactly +1. Wait for the hand to settle; exclude other players’ turns or a fray reset.')
 return row
}
export function withinFray(turns:number,used:number,limit:number):boolean{
 if(!Number.isInteger(used)||used<0||used>limit||(used===limit&&turns!==0))throw Error('Used fray must be below the snap limit; after a snap enter 0 and re-read all clocks.')
 return turns+used<=limit // Concord is checked BEFORE snapping, so solving exactly at the limit succeeds.
}
export function slotFromText(input:string):number|null {
 const s=input.trim(),m=s.match(/^(?:\d+|sd:([1-9]\d*)(?:\.[A-Za-z0-9_-]+)?|(?:.*\/)?room\/sd:([1-9]\d*)(?:\.[A-Za-z0-9_-]+)?(?:[?#].*)?)$/i)
 if(!m)return null;const n=Number(m[1]??m[2]??s);return Number.isSafeInteger(n)&&n>0?n:null
}
