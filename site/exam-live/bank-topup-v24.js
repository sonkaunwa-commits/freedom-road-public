(()=>{
const B=window.SEC_QUESTIONS||[];
const reps=[];const seenK=new Set();
for(const q of B){if(q&&q.source==='原创扩展v2.3'&&q.knowledge&&!seenK.has(q.knowledge)&&q.type==='single'&&Array.isArray(q.a)&&q.a.length===1){seenK.add(q.knowledge);reps.push(q)}}
function h(s){let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return x>>>0}
function sh(a,seed){let x=h(seed),b=[...a];for(let i=b.length-1;i>0;i--){x=(x+0x6D2B79F5)>>>0;const j=x%(i+1);[b[i],b[j]]=[b[j],b[i]]}return b}
function make(id,base,qtext,correct,distractors,explain){const opts=sh([correct,...distractors],id),ans=[opts.indexOf(correct)];return{id,s:base.s,ch:base.ch,type:'single',valid:'2026有效',q:qtext,o:opts,a:ans,e:explain,knowledge:base.knowledge,difficulty:2,source:'原创巩固v2.4',sourceType:'original',strict:true,updated:'2026-08-18'}}
const add=[];
for(let i=0;i<reps.length;i++){
 const r=reps[i],correct=r.o[r.a[0]],peers=[reps[(i+7)%reps.length],reps[(i+13)%reps.length],reps[(i+19)%reps.length]],ds=peers.map(p=>p.o[p.a[0]]);
 add.push(make('SE24A'+String(i+1).padStart(3,'0'),r,`强化辨析：关于“${r.knowledge}”，下列哪项结论最符合该知识点？`,correct,ds,`本题再次检验“${r.knowledge}”。${r.e}`));
 const ec=r.e||correct,eds=peers.map(p=>p.e||p.o[p.a[0]]);
 add.push(make('SE24B'+String(i+1).padStart(3,'0'),r,`二次巩固：复习“${r.knowledge}”时，下列哪项最适合作为核心记忆点？`,ec,eds,`核心仍是“${r.knowledge}”：${ec}`));
}
const seen=new Set(B.map(q=>String(q.q||'').replace(/\s+/g,'')));let n=0;for(const q of add){const k=String(q.q||'').replace(/\s+/g,'');if(!seen.has(k)){seen.add(k);B.push(q);n++}}
window.SEC_QUESTIONS=B;window.SEC_TOPUP_META={version:'2026.08.18-v2.4',concepts:reps.length,added:n,total:B.length};
})();
