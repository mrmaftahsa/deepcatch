export const species = [
{id:'sardine',name:'Sardine',depth:0,value:12,color:0x9bd5df,size:12},
{id:'goldie',name:'Goldie',depth:0,value:18,color:0xffc65a,size:15},
{id:'clown',name:'Clownfish',depth:10,value:24,color:0xff854a,size:16},
{id:'tang',name:'Blue Tang',depth:20,value:32,color:0x648df8,size:18},
{id:'angel',name:'Pink Angel',depth:35,value:45,color:0xf598c9,size:20},
{id:'mackerel',name:'Mackerel',depth:50,value:60,color:0x53d1ab,size:19},
{id:'zebra',name:'Zebra Fish',depth:75,value:85,color:0xe6e8ef,size:21},
{id:'ray',name:'Reef Ray',depth:100,value:120,color:0x9b8bdf,size:25},
{id:'sword',name:'Swordfish',depth:130,value:180,color:0x72bde8,size:26},
{id:'pearl',name:'Pearl Fish',depth:160,value:300,color:0xffe8ae,size:22}
] as const;
export type Species=typeof species[number];
export type Gear='line'|'hook'|'reel';
export type Save={version:1;coins:number;dives:number;line:number;hook:number;reel:number;book:Record<string,number>};
export const fresh=():Save=>({version:1,coins:0,dives:0,line:0,hook:0,reel:0,book:{}});
export const maxDepth=(s:Save)=>60+s.line*30;
export const capacity=(s:Save)=>3+s.hook;
export const cost=(s:Save,k:Gear)=>Math.round(65*Math.pow(1.55,s[k]));
export const limit:Record<Gear,number>={line:6,hook:7,reel:5};
export function buy(s:Save,k:Gear){const c=cost(s,k);if(s[k]>=limit[k]||s.coins<c)return false;s.coins-=c;s[k]++;return true}
export type Catch={fish:Species;gold:boolean;value:number};
export function settle(s:Save,haul:Catch[]){const total=haul.reduce((a,b)=>a+b.value,0);s.coins+=total;s.dives++;for(const c of haul)s.book[c.fish.id]=(s.book[c.fish.id]||0)+1;return total}
export function reward(f:Species,gold:boolean,combo:number){return Math.round(f.value*(gold?3:1)*(1+Math.min(5,Math.max(0,combo-1))*.1))}
export function load():Save{const s=fresh();try{const raw=JSON.parse(localStorage.getItem('deepcatch-v3')||'null');if(raw?.version===1){for(const k of ['coins','dives','line','hook','reel'] as const){if(Number.isSafeInteger(raw[k])&&raw[k]>=0)s[k]=k==='coins'||k==='dives'?raw[k]:Math.min(limit[k],raw[k])}for(const f of species){const n=raw.book?.[f.id];if(Number.isSafeInteger(n)&&n>0)s.book[f.id]=n}}}catch{}return s}
export function persist(s:Save){try{localStorage.setItem('deepcatch-v3',JSON.stringify(s))}catch{}}
