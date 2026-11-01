export const STONES = ['Daggerfall', 'Sentinel', 'Wayrest', 'Orsinium', 'the Underking', 'the Blades'] as const
export interface OrreryStep { name:string; direction:'RIGHT'|'LEFT'; count:number; stone:number }
export interface OrreryPuzzle { slot:number; initial:number[]; target:number[]; steps:OrreryStep[]; turns:number; gear:number[][] }
const mod=(x:number)=>((x%12)+12)%12
export const hourShown=(x:number)=>mod(x)||12
const seedOf=(s:number,salt:number)=>{
 let h=(Math.imul(s>>>0,0x9e3779b1)^salt)>>>0
 h=Math.imul(h^(h>>>16),0x85ebca6b)
 h=Math.imul(h^(h>>>13),0xc2b2ae35)
 return (h^(h>>>16))>>>0
}
const rng=(seed:number)=>{let a=seed>>>0;return ()=>{a=(a+0x6d2b79f5)>>>0;let t=Math.imul(a^(a>>>15),a|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
const shuffle=(r:()=>number,items:number[])=>{const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function solve(order:number[],gear:number[][],start:number[],truth:number[]):number[]{
 const turns=Array(6).fill(0)
 for(let p=5;p>=0;p--){const j=order[p];let have=start[j];for(let q=p+1;q<6;q++)have+=turns[order[q]]*gear[order[q]][j];turns[j]=mod(truth[j]-have)}
 return turns
}
export function puzzleOf(slot:number,current?:number[]):OrreryPuzzle{
 if(!Number.isSafeInteger(slot)||slot<1)throw new Error('Invalid Shattered Hour slot ID')
 const r=rng(seedOf(slot,0x0e4ae7)),ix=[0,1,2,3,4,5],order=shuffle(r,ix)
 const gear:number[][]=ix.map(i=>ix.map(j=>i===j?1:0))
 for(let p=1;p<6;p++){const partners=shuffle(r,order.slice(0,p)).slice(0,p===1?1:1+Math.floor(r()*2));for(const j of partners)gear[order[p]][j]=[-2,-1,1,2][Math.floor(r()*4)]}
 const chain=shuffle(r,ix),truth=Array(6).fill(0),clues:{kind:string;a:number;b?:number;h?:number;k?:number}[]=[]
 for(let q=0;q<6;q++){
  const a=chain[q]
  if(q<2){truth[a]=Math.floor(r()*12);clues.push({kind:'plain',a,h:truth[a]});continue}
  const b=chain[Math.floor(r()*q)],roll=r()
  if(roll<0.2){truth[a]=mod(truth[b]+6);clues.push({kind:'opposite',a,b})}
  else if(roll<0.5){truth[a]=mod(-truth[b]);clues.push(r()<0.5?{kind:'mirror',a,b}:{kind:'mirror',a:b,b:a})}
  else{const k=Math.floor(r()*11)-5;truth[a]=mod(truth[b]+k);clues.push({kind:'offset',a,b,k})}
 }
 let start:number[], turns:number[],n=0
 do {start=ix.map(()=>Math.floor(r()*12));turns=solve(order,gear,start,truth);if(++n>100000)throw new Error('Could not generate puzzle')} while(turns.reduce((sum,t)=>sum+Math.min(t,12-t),0)<12 || turns.reduce((sum,t)=>sum+Math.min(t,12-t),0)>24)
 shuffle(r,ix) // maintain complete source RNG semantics: final riddle shuffle (not used in solution)
 const actual=current??start
 if(actual.length!==6||actual.some(x=>!Number.isInteger(x)||x<0||x>11))throw new Error('Invalid current hours')
 const way=solve(order,gear,actual,truth)
 const signed=way.map(t=>t<=6?t:t-12)
 const steps=order.slice().reverse().filter(i=>signed[i]!==0).map(i=>({name:STONES[i],stone:i,direction:signed[i]>0?'RIGHT' as const:'LEFT' as const,count:Math.abs(signed[i])}))
 const end=ix.map(j=>mod(actual[j]+signed.reduce((sum,t,i)=>sum+t*gear[i][j],0)))
 if(end.some((v,i)=>v!==truth[i]))throw new Error('Puzzle verification failed')
 return {slot,initial:start.map(hourShown),target:truth.map(hourShown),steps,turns:steps.reduce((s,x)=>s+x.count,0),gear}
}
export function slotFromText(input:string):number|null {
 const s=input.trim(); const m=s.match(/^(?:\d+|sd:([1-9]\d*)(?:\.[A-Za-z0-9_-]+)?|(?:.*\/)?room\/sd:([1-9]\d*)(?:\.[A-Za-z0-9_-]+)?(?:[?#].*)?)$/i)
 if(!m)return null;const n=Number(m[1]??m[2]??s);return Number.isSafeInteger(n)&&n>0?n:null
}
