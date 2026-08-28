(()=>{
'use strict';
const C=Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:[];
const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const UPDATED='2026-08-28';
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
function seeded(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function shuffleRows(rows,seed){const a=rows.map((v,i)=>({v,i})),r=seeded(hash(seed));for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function cleanText(s){return String(s||'').replace(/\s+/g,' ').trim()}
function norm(s){return cleanText(s).replace(/[\s，。！？、；：,.!?;:（）()“”"'《》「」]/g,'').toLowerCase()}
function ownerFor(text,subject){const n=norm(text);for(const x of C.filter(v=>v.s===subject)){for(const [field,label] of [['definition','定义'],['key','关键点'],['wrong','错误说法'],['falsekey','常见陷阱']]){if(x[field]&&norm(x[field])===n)return{x,field,label}}}return null}
function whyFor(text,c,isRight,e){
 const own=ownerFor(text,c.s);
 if(own){if(own.x.term===c.term){if(own.field==='definition')return `正确框架：这是“${c.term}”的基本定义——${c.definition}`;if(own.field==='key')return `关键判断点：${c.key}`;if(own.field==='wrong')return `错误。该项正是“${c.term}”的典型错误理解：${c.wrong}；正确理解为：${c.definition}`;if(own.field==='falsekey')return `错误。该项属于“${c.term}”的常见陷阱：${c.falsekey}。`}
  return `该项对应的是“${own.x.term}”的${own.label}，不是本题“${c.term}”的核心判断。${own.x.term}应理解为：${own.x.definition}`;
 }
 if(isRight)return `正确。${e} 做题时要回到“${c.term}”的定义和关键条件：${c.definition}；${c.key}`;
 if(/[一定|必然|完全|任何|全部|绝不|无条件|唯一|仅仅]/.test(text))return `错误。该项把结论绝对化了。证券业务规则通常有适用条件，不能用“任何/全部/完全”等词把“${c.term}”扩大为无条件结论。`;
 return `错误。该项不符合“${c.term}”的定义或边界。正确框架：${c.definition}；判断线索：${c.key}`;
}
function pack(id,c,type,q,opts,correct,e,difficulty=2,caseStem=''){
 const uniq=[];opts.forEach((x,i)=>{const t=cleanText(x);if(t&&!uniq.some(v=>v.t===t))uniq.push({t,orig:i})});
 if(uniq.length<2)return null;
 const sh=shuffleRows(uniq,id),answers=[];sh.forEach((x,ni)=>{if(correct.includes(x.v.orig))answers.push(ni)});
 if(!answers.length)return null;
 const oa=sh.map(x=>whyFor(x.v.t,c,correct.includes(x.v.orig),cleanText(e)));
 return {id,s:c.s,ch:c.ch,type,valid:c.valid,q:cleanText(q),o:sh.map(x=>x.v.t),a:answers.sort((a,b)=>a-b),e:cleanText(e),oa,learn:{term:c.term,definition:c.definition,key:c.key,wrong:c.wrong,falsekey:c.falsekey,example:c.example},knowledge:c.term,difficulty,caseStem:cleanText(caseStem),source:'高价值变式·按2026现行大纲与知识卡复核',sourceType:'curated_generated',sourceTruth:'原创变式·非官方真题',sourceBasis:'基于当前结构化考点的情境、辨析、反向与多选变式；用于巩固同一知识点而非宣称高频原题',updated:UPDATED,quality:'highvalue-v4.3',strict:true};
}
const qs=[];
C.forEach((c,ix)=>{
 const peers=C.filter(x=>x.s===c.s&&x!==c); if(!peers.length)return;
 const off=hash(c.term)%peers.length,p1=peers[off],p2=peers[(off+7)%peers.length],p3=peers[(off+13)%peers.length];
 const pre='HV43-'+(c.s==='finance'?'F':'L')+String(ix+1).padStart(3,'0');
 const add=x=>{if(x)qs.push(x)};
 add(pack(pre+'-01',c,'comprehensive','结合下列业务情境，最符合本考点的判断是？',[c.key,c.wrong,c.falsekey,p1.wrong],[0],`核心在于：${c.definition} ${c.key}`,2,c.example));
 add(pack(pre+'-02',c,'multi',`关于「${c.term}」，下列理解正确的有？`,[c.definition,c.key,c.wrong,c.falsekey],[0,1],`${c.definition} ${c.key} 其余表述属于偷换概念、绝对化或反向理解。`,2));
 add(pack(pre+'-03',c,'single',`复习「${c.term}」时，下列哪一项最容易构成错误理解？`,[c.definition,c.key,c.wrong,p2.definition],[2],`错误点是：${c.wrong} 正确理解为：${c.definition}`,2));
 add(pack(pre+'-04',c,'judge',`有人据此认为：“${c.falsekey}”`,['正确','错误'],[1],`该说法错误。${c.definition} ${c.key}`,2,c.example));
 add(pack(pre+'-05',c,'single',`下列对「${c.term}」的表述，哪一项最准确？`,[`${c.definition}，并且${c.key}`,c.wrong,c.falsekey,p1.definition],[0],`${c.term}的准确理解是：${c.definition} ${c.key}`,2));
 add(pack(pre+'-06',c,'comprehensive','根据材料，下列推论最合理的是？',[c.key,c.wrong,c.falsekey,p3.key||p3.definition],[0],`材料指向「${c.term}」。${c.definition} ${c.key}`,3,c.example));
 add(pack(pre+'-07',c,'multi',`围绕「${c.term}」进行风险辨析，下列哪些说法需要排除？`,[c.wrong,c.falsekey,c.definition,c.key],[0,1],`需要排除的是错误项与夸大项。正确框架：${c.definition} ${c.key}`,3));
 add(pack(pre+'-08',c,'single',`如果题目把「${c.term}」与其他概念混在一起，优先抓住哪一判断线索？`,[c.key,p1.key||p1.definition,p2.key||p2.definition,c.wrong],[0],`识别本考点的关键线索是：${c.key}`,2));
 add(pack(pre+'-09',c,'judge',`在相关情境中，只要出现“${c.term}”，就可以直接推出：“${c.wrong}”`,['正确','错误'],[1],`不能这样推出。${c.wrong} 正确框架：${c.definition}`,3));
 add(pack(pre+'-10',c,'single',`关于「${c.term}」的边界，下列哪一项没有把结论说得过头？`,[c.key,c.falsekey,c.wrong,`${p2.term}与${c.term}在任何条件下完全相同`],[0],`应保留条件和边界：${c.key}`,3));
 add(pack(pre+'-11',c,'comprehensive','考生在分析该案例时，第一步应识别的核心知识点是？',[c.term,p1.term,p2.term,p3.term],[0],`案例核心对应「${c.term}」。${c.definition}`,2,c.example));
});
const seen=new Set(B.map(q=>norm(q?.q)));const added=[];
for(const q of qs){const k=norm(q?.q);if(!k||seen.has(k))continue;seen.add(k);added.push(q);B.push(q)}
window.SEC_QUESTIONS=B;
window.SEC_V43_BANK={version:'4.3.1',generated:qs.length,added:added.length,total:B.length,finance:added.filter(q=>q.s==='finance').length,law:added.filter(q=>q.s==='law').length,note:'新增高价值变式用于覆盖情境、多选、辨析、边界与案例迁移；每个选项携带独立解析；不宣称为官方真题或全部高频原题。'};
})();
