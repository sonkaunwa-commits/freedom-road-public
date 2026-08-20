(()=>{
const C=window.SEC_CONCEPTS||[],BASE=window.SEC_QUESTIONS||[];
const UPDATED='2026-08-18',VERSION='2026.08.18-v2.2';
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
function seeded(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffled(arr,seed){const a=arr.map((v,i)=>({v,i})),r=seeded(hash(seed));for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pack(id,c,type,q,opts,correctIdx,e,difficulty=1){const clean=[];const map=[];opts.forEach((v,i)=>{if(!clean.includes(v)){clean.push(v);map.push(i)}});const sh=shuffled(clean,id),ans=[];sh.forEach((x,ni)=>{if(correctIdx.includes(map[x.i]))ans.push(ni)});return{id,s:c.s,ch:c.ch,type,valid:c.valid,q,o:sh.map(x=>x.v),a:ans.sort((a,b)=>a-b),e,knowledge:c.term,difficulty,source:'原创模拟·按现行大纲',sourceType:'original',updated:UPDATED,quality:'active',strict:true,focus:c.valid==='2026-09纪法'?'2026-09':''}}
const qs=[];
C.forEach((c,ix)=>{const peers=C.filter(x=>x.s===c.s&&x!==c),off=hash(c.term)%peers.length,p1=peers[off],p2=peers[(off+5)%peers.length],p3=peers[(off+11)%peers.length],pre=(c.s==='finance'?'GF':'GL')+String(ix+1).padStart(3,'0');
qs.push(pack(pre+'-01',c,'single',`关于「${c.term}」，下列表述正确的是？`,[c.definition,c.wrong,p1.wrong,p2.wrong],[0],c.key,1));
qs.push(pack(pre+'-02',c,'single',`下列概念中，与“${c.definition}”最匹配的是？`,[c.term,p1.term,p2.term,p3.term],[0],`该描述对应「${c.term}」。${c.key}`,1));
qs.push(pack(pre+'-03',c,'judge',c.definition,['正确','错误'],[0],`${c.definition} ${c.key}`,1));
qs.push(pack(pre+'-04',c,'judge',c.wrong,['正确','错误'],[1],`该说法错误。正确理解是：${c.definition} ${c.key}`,1));
qs.push(pack(pre+'-05',c,'comprehensive',`某业务情形如下：${c.example} 该情形最能体现下列哪一知识点？`,[c.term,p1.term,p2.term,p3.term],[0],`核心知识点是「${c.term}」。${c.key}`,2));
qs.push(pack(pre+'-06',c,'single',`关于「${c.term}」，下列说法不正确的是？`,[c.definition,c.key,c.wrong,p1.definition],[2],`错误项在于：${c.wrong} 正确理解：${c.definition}`,2));
qs.push(pack(pre+'-07',c,'multi',`关于「${c.term}」，下列说法正确的有？`,[c.definition,c.key,c.wrong,c.falsekey],[0,1],`${c.definition} ${c.key} 其余选项混淆或夸大了该知识点。`,2));
qs.push(pack(pre+'-08',c,'single','下列概念与含义的对应关系中，正确的是？',[`${c.term}：${c.definition}`,`${p1.term}：${p2.definition}`,`${p2.term}：${p3.definition}`,`${p3.term}：${p1.definition}`],[0],`正确对应为「${c.term}：${c.definition}」。`,2));
});
const seen=new Set(),merged=[];for(const q of [...BASE,...qs]){const k=String(q.q||'').replace(/\s+/g,'').replace(/[，。！？、；：,.!?;:（）()“”"']/g,'');if(!seen.has(k)&&q.o.length>=2&&q.a.length){seen.add(k);merged.push(q)}}window.SEC_QUESTIONS=merged;
window.SEC_BANK_META={version:VERSION,updated:UPDATED,generated:qs.length,finance:qs.filter(q=>q.s==='finance').length,law:qs.filter(q=>q.s==='law').length,discipline:qs.filter(q=>q.valid==='2026-09纪法').length,note:'原创模拟题依据当前考试大纲方向组织，不宣称为官方真题。'};
})();
