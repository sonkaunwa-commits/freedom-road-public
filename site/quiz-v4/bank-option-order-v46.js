(()=>{
'use strict';
const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const hash=s=>{let h=2166136261;for(const c of String(s||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
function order(q){
 if(!q?.authenticityV46||q.type==='judge'||!Array.isArray(q.o)||q.o.length<3)return;
 const rows=q.o.map((text,i)=>({text,why:Array.isArray(q.oa)?q.oa[i]:'',orig:i}));
 let x=hash(`v46-option-order|${q.id}`);
 const rnd=()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
 for(let i=rows.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[rows[i],rows[j]]=[rows[j],rows[i]]}
 const right=new Set(q.a||[]);q.o=rows.map(r=>r.text);q.oa=rows.map(r=>r.why);q.a=rows.map((r,i)=>right.has(r.orig)?i:-1).filter(i=>i>=0).sort((a,b)=>a-b);q.optionOrderV46=true;
}
for(const q of B)order(q);
const singles=B.filter(q=>q?.authenticityV46&&q.type==='single'&&q.optionOrderV46),dist=[0,0,0,0];for(const q of singles)if(q.a?.length===1&&q.a[0]<4)dist[q.a[0]]++;
window.SEC_QUESTIONS=B;window.SEC_V46_OPTION_ORDER={version:'4.6.0',ordered:B.filter(q=>q?.optionOrderV46).length,singleDistribution:dist};
})();