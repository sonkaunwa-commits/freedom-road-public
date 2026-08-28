(()=>{
const C=window.SEC_CONCEPTS||[],BASE=window.SEC_QUESTIONS||[];
const UPDATED='2026-08-28',VERSION='2026.08.28-v2.3';
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
function seeded(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffled(arr,seed){const a=arr.map((v,i)=>({v,i})),r=seeded(hash(seed));for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const core=c=>({term:c.term,definition:c.definition,key:c.key,wrong:c.wrong,falsekey:c.falsekey,example:c.example});
function pack(id,c,type,q,opts,correctIdx,e,difficulty=1,analysis=[]){
 const uniq=[];opts.forEach((v,i)=>{const t=clean(v);if(t&&!uniq.some(x=>x.t===t))uniq.push({t,orig:i,why:clean(analysis[i])})});
 const sh=shuffled(uniq,id),ans=[];sh.forEach((x,ni)=>{if(correctIdx.includes(x.v.orig))ans.push(ni)});
 return{id,s:c.s,ch:c.ch,type,valid:c.valid,q,o:sh.map(x=>x.v.t),a:ans.sort((a,b)=>a-b),e,oa:sh.map(x=>x.v.why),knowledge:c.term,learn:core(c),difficulty,source:'原创模拟·按现行大纲',sourceType:'original',sourceTruth:'原创模拟·非官方真题',sourceBasis:'依据结构化知识卡与现行大纲方向组织，用于学习和迁移，不宣称为官方真题',updated:UPDATED,quality:'active',strict:true,focus:c.valid==='2026-09纪法'?'2026-09':''}
}
const qs=[];
C.forEach((c,ix)=>{
 const peers=C.filter(x=>x.s===c.s&&x!==c),off=hash(c.term)%peers.length,p1=peers[off],p2=peers[(off+5)%peers.length],p3=peers[(off+11)%peers.length],pre=(c.s==='finance'?'GF':'GL')+String(ix+1).padStart(3,'0');
 const boundary=`${c.term}的具体适用仍应结合产品条款、业务规则或适用场景判断`;
 qs.push(pack(pre+'-01',c,'single',`关于「${c.term}」，下列表述正确的是？`,[c.definition,c.wrong,c.falsekey,`${c.term}在任何产品、任何渠道、任何条件下都适用完全相同的规则`],[0],`${c.definition}。${c.key}`,1,[
  `正确。${c.definition}。这就是“${c.term}”的基本定义；做题时再抓住：${c.key}`,
  `错误。该项与“${c.term}”的核心规则相反。错误表述是：${c.wrong}；正确理解应为：${c.definition}`,
  `错误。该项把“${c.term}”的边界说错或说绝对了：${c.falsekey}。应回到实际定义和适用条件判断。`,
  `错误。证券产品和业务规则存在具体适用条件，不能从一个概念推出“所有产品、所有渠道、所有条件完全相同”。本考点应掌握：${c.key}`
 ]));
 qs.push(pack(pre+'-02',c,'single',`下列概念中，与“${c.definition}”最匹配的是？`,[c.term,p1.term,p2.term,p3.term],[0],`该描述对应「${c.term}」。${c.key}`,1,[
  `正确。题干给出的定义就是“${c.term}”：${c.definition}`,
  `错误。“${p1.term}”的核心含义是：${p1.definition}，与题干定义不一致。`,
  `错误。“${p2.term}”的核心含义是：${p2.definition}，与题干定义不一致。`,
  `错误。“${p3.term}”的核心含义是：${p3.definition}，与题干定义不一致。`
 ]));
 qs.push(pack(pre+'-03',c,'judge',c.definition,['正确','错误'],[0],`${c.definition} ${c.key}`,1,[
  `应判断为正确。题干陈述与“${c.term}”的定义一致：${c.definition}；补充考点：${c.key}`,
  `不应判断为错误。题干正是“${c.term}”的规范性定义，错误选“错误”通常是把概念边界记反。`
 ]));
 qs.push(pack(pre+'-04',c,'judge',c.wrong,['正确','错误'],[1],`该说法错误。正确理解是：${c.definition} ${c.key}`,1,[
  `不应判断为正确。题干本身就是“${c.term}”的典型错误表述：${c.wrong}`,
  `应判断为错误。正确框架是：${c.definition}；做题时抓住：${c.key}`
 ]));
 qs.push(pack(pre+'-05',c,'comprehensive',`某业务情形如下：${c.example} 该情形最能体现下列哪一知识点？`,[c.term,p1.term,p2.term,p3.term],[0],`核心知识点是「${c.term}」。${c.key}`,2,[
  `正确。材料中的关键事实与“${c.term}”直接对应：${c.definition}。材料识别线索是：${c.key}`,
  `错误。“${p1.term}”主要讲：${p1.definition}，材料的核心事实并未落在这一规则上。`,
  `错误。“${p2.term}”主要讲：${p2.definition}，与材料的主要判断线索不一致。`,
  `错误。“${p3.term}”主要讲：${p3.definition}，不是本材料要求识别的核心知识点。`
 ]));
 qs.push(pack(pre+'-06',c,'single',`关于「${c.term}」，下列说法不正确的是？`,[c.definition,c.key,c.wrong,boundary],[2],`错误项在于：${c.wrong}。正确理解：${c.definition}`,2,[
  `该项正确，因此不是本题所问的“不正确项”。它准确描述了“${c.term}”：${c.definition}`,
  `该项正确，因此不能选。它给出了“${c.term}”的高频判断线索：${c.key}`,
  `该项不正确，正是本题答案。错误点：${c.wrong}；应改为：${c.definition}`,
  `该项正确。考试中不能把概念机械套用到所有产品和场景，仍需结合具体规则；这也是避免绝对化陷阱的关键。`
 ]));
 qs.push(pack(pre+'-07',c,'multi',`关于「${c.term}」，下列说法正确的有？`,[c.definition,c.key,c.wrong,c.falsekey],[0,1],`${c.definition} ${c.key} 其余选项混淆或夸大了该知识点。`,2,[
  `正确。该项是“${c.term}”的基本定义：${c.definition}`,
  `正确。该项是判断“${c.term}”时应抓住的关键点：${c.key}`,
  `错误。该项把核心规则说反了：${c.wrong}；正确理解为：${c.definition}`,
  `错误。该项属于常见的绝对化/偷换概念陷阱：${c.falsekey}`
 ]));
 qs.push(pack(pre+'-08',c,'single','下列概念与含义的对应关系中，正确的是？',[`${c.term}：${c.definition}`,`${p1.term}：${p2.definition}`,`${p2.term}：${p3.definition}`,`${p3.term}：${p1.definition}`],[0],`正确对应为「${c.term}：${c.definition}」。`,2,[
  `正确。“${c.term}”与其定义匹配：${c.definition}`,
  `错误。“${p1.term}”被配上了“${p2.term}”的含义。${p1.term}真正的定义是：${p1.definition}`,
  `错误。“${p2.term}”被配上了“${p3.term}”的含义。${p2.term}真正的定义是：${p2.definition}`,
  `错误。“${p3.term}”被配上了“${p1.term}”的含义。${p3.term}真正的定义是：${p3.definition}`
 ]));
});
const seen=new Set(),merged=[];for(const q of [...BASE,...qs]){const k=String(q.q||'').replace(/\s+/g,'').replace(/[，。！？、；：,.!?;:（）()“”"']/g,'');if(!seen.has(k)&&q.o.length>=2&&q.a.length){seen.add(k);merged.push(q)}}window.SEC_QUESTIONS=merged;
window.SEC_BANK_META={version:VERSION,updated:UPDATED,generated:qs.length,finance:qs.filter(q=>q.s==='finance').length,law:qs.filter(q=>q.s==='law').length,discipline:qs.filter(q=>q.valid==='2026-09纪法').length,note:'原创模拟题依据当前考试大纲方向组织；v2.3为每个生成选项保留独立解析，并减少与本题无关的干扰项。'};
})();
