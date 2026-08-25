(()=>{
const B=window.SEC_QUESTIONS||[];
const reps=[];const seenK=new Set();
for(const q of B){if(q.strict===false||!q.knowledge||seenK.has(q.s+'|'+q.knowledge))continue;seenK.add(q.s+'|'+q.knowledge);reps.push(q)}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function shuf(arr,seed){const a=[...arr];let x=hash(seed);for(let i=a.length-1;i>0;i--){x=(x+0x6D2B79F5)>>>0;const j=x%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
const added=[];
for(let i=0;i<reps.length;i++){
 const r=reps[i],peers=reps.filter(x=>x.s===r.s&&x.knowledge!==r.knowledge);if(peers.length<3)continue;
 const p=shuf(peers,'SUP'+r.id).slice(0,3);
 const opts=[r.knowledge,...p.map(x=>x.knowledge)],shuffled=shuf(opts,'SUPQ'+r.id),a=[shuffled.indexOf(r.knowledge)];
 added.push({id:'SUP24-'+String(i+1).padStart(3,'0'),s:r.s,ch:r.ch,type:'single',valid:r.valid||'2026有效',q:`关于“${r.knowledge}”，下列哪一知识点名称与该题库解析最匹配：${String(r.e||r.q).slice(0,72)}…？`,o:shuffled,a,e:`该解析对应知识点“${r.knowledge}”。`,knowledge:r.knowledge,difficulty:2,source:'原创补强v2.4',sourceType:'original',strict:true,updated:'2026-08-18'});
}
const seenQ=new Set(B.map(q=>String(q.q||'').replace(/\s+/g,''))),seenId=new Set(B.map(q=>q.id));let n=0;
for(const q of added){const k=String(q.q||'').replace(/\s+/g,'');if(!seenQ.has(k)&&!seenId.has(q.id)){seenQ.add(k);seenId.add(q.id);B.push(q);n++}}
window.SEC_QUESTIONS=B;window.SEC_SUPPLEMENT_META={version:'2.4',knowledge:reps.length,added:n,total:B.length};
})();
