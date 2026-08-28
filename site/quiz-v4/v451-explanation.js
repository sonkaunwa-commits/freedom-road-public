(()=>{
'use strict';
const VERSION='4.5.2';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const norm=s=>String(s||'').replace(/[\s，。！？、；：,.!?;:（）()“”"'《》「」]/g,'').toLowerCase();
const bank=()=>Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const concepts=()=>Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:[];
const typeLabel=t=>t==='multi'?'多选题':t==='judge'?'判断题':t==='comprehensive'?'综合案例题':'单选题';
let courseCards=[],busy=false;
function currentQuestion(){const h=$('.questionCard h1');if(!h)return null;const text=h.textContent.trim();return bank().find(q=>String(q.q||'').trim()===text)||null}
function conceptFor(q){if(!q)return null;const exact=concepts().find(c=>c.s===q.s&&norm(c.term)===norm(q.knowledge));if(exact)return exact;const hay=norm([q.q,q.e,q.knowledge].join(' '));let best=null,score=0;for(const c of concepts().filter(x=>x.s===q.s)){let s=0;if(c.term&&hay.includes(norm(c.term)))s+=7;for(const w of [c.definition,c.key].join(' ').split(/[、，；：\s]/).filter(x=>x.length>=3))if(hay.includes(norm(w)))s++;if(s>score){score=s;best=c}}return score>=2?best:null}
function learningFor(q,c){return q?.learn||c||null}
async function loadCourses(){for(const [s,url] of [['finance','../exam-live/bilibili-finance-learning-v1.json'],['law','../exam-live/bilibili-law-learning-v1.json']]){try{const r=await fetch(url+'?v=20260828b',{cache:'no-store'});if(!r.ok)continue;const j=await r.json();for(const d of j.documents||[])for(const p of d.points||[])courseCards.push({s,part:d.part||'',chapter:d.chapter_guess||'',bvid:d.bvid||'',page:d.page||1,topic:p.topic||'',explanation:p.explanation||'',teacherAngle:p.teacher_angle||'',examFocus:p.exam_focus||'',memoryTip:p.memory_tip||'',trap:p.trap||'',keywords:p.keywords||[]})}catch(_){}}}
function courseFor(q,c){const hay=norm([q.q,q.e,q.knowledge,c?.term,c?.definition].join(' '));let best=null,score=0;for(const x of courseCards.filter(v=>v.s===q.s)){let s=0;if(x.topic&&hay.includes(norm(x.topic)))s+=8;for(const k of x.keywords||[])if(k&&hay.includes(norm(k)))s+=3;const ck=norm(x.chapter).replace(/^第\d+章/,'');if(ck&&q.ch&&norm(q.ch).includes(ck))s++;if(s>score){score=s;best=x}}return score>=3?best:null}
function selectedIndexes(){return $$('.questionCard .option').map((x,i)=>x.classList.contains('selected')?i:-1).filter(i=>i>=0)}
function correct(q,sel){const a=[...(q.a||[])].sort((x,y)=>x-y),b=[...sel].sort((x,y)=>x-y);return a.length===b.length&&a.every((x,i)=>x===b[i])}
function letters(xs){return xs.map(i=>String.fromCharCode(65+i)).join('、')||'未作答'}
function ownerFor(text,subject){const n=norm(text);for(const x of concepts().filter(v=>v.s===subject)){for(const [field,label] of [['definition','定义'],['key','关键判断点'],['wrong','错误说法'],['falsekey','常见陷阱']]){if(x[field]&&norm(x[field])===n)return{x,field,label}}}return null}
function specificReason(q,c,i,chosen){
 if(Array.isArray(q.oa)&&q.oa[i])return q.oa[i];
 const text=String(q.o?.[i]||''),isRight=(q.a||[]).includes(i),learn=learningFor(q,c),own=ownerFor(text,q.s);
 if(own){
  if(own.x.term===q.knowledge||own.x.term===learn?.term){
   if(own.field==='definition')return `正确框架：这就是“${own.x.term}”的基本定义——${own.x.definition}。`;
   if(own.field==='key')return `这是“${own.x.term}”的关键判断线索：${own.x.key}。`;
   if(own.field==='wrong')return `错误。该项把“${own.x.term}”的规则说反了：${own.x.wrong}；正确理解应为：${own.x.definition}。`;
   if(own.field==='falsekey')return `错误。该项属于“${own.x.term}”的典型陷阱：${own.x.falsekey}。`;
  }
  return `该表述其实对应“${own.x.term}”的${own.label}，不是本题“${q.knowledge||learn?.term||'核心考点'}”的判断依据。“${own.x.term}”应理解为：${own.x.definition}。`;
 }
 if(isRight){const base=[learn?.definition,learn?.key,q.e].filter(Boolean);return `正确。${[...new Set(base)].join('；')}。`}
 if(/[一定|必然|完全|任何|全部|绝不|无条件|唯一|仅仅|只能|永远]/.test(text))return `错误。该项出现了绝对化表达，把有条件成立的规则扩大为无条件结论。回到本题正确框架：${learn?.definition||q.e||'按题干限定条件判断'}。`;
 if(chosen&&learn?.wrong)return `你误选了这一项。它没有满足题干限定，且容易落入本考点的典型错误理解：“${learn.wrong}”。正确框架：${learn.definition||q.e||''}`;
 return `错误。该项与“${q.knowledge||learn?.term||'本题考点'}”的定义、适用条件或边界不一致。${learn?.definition?`正确框架：${learn.definition}。`:''}${learn?.key?`判断线索：${learn.key}。`:''}`;
}
function diagnosis(q,c,sel){const right=new Set(q.a||[]),wrongSel=sel.filter(i=>!right.has(i)),missed=[...(q.a||[])].filter(i=>!sel.includes(i));const parts=[];if(!sel.length)parts.push('这题没有作答。先圈出题干主体、范围、条件和“正确/错误/不正确”等方向词，再逐项核对。');if(wrongSel.length)parts.push(`误选 ${letters(wrongSel)}：${wrongSel.map(i=>specificReason(q,c,i,true)).join(' ')}`);if(missed.length)parts.push(`漏选 ${letters(missed)}：${missed.map(i=>specificReason(q,c,i,false)).join(' ')}`);if(!parts.length)parts.push('本题作答正确。不要只记答案字母，继续确认每个错误项错在定义、边界还是把其他概念混进来了。');return parts.join(' ')}
function optionAnalysis(q,c,sel){return (q.o||[]).map((t,i)=>{const right=(q.a||[]).includes(i),chosen=sel.includes(i),tag=right?'正确项':chosen?'你的误选':'错误项',cls=right?'right':chosen?'picked':'wrong';return `<div class="v451OptionRow ${cls}"><div class="v451OptionHead"><b>${String.fromCharCode(65+i)}. ${esc(t)}</b><em>${tag}</em></div><span>${esc(specificReason(q,c,i,chosen))}</span></div>`}).join('')}
function relatedQuestions(q){
 const same=bank().filter(x=>x.id!==q.id&&x.s===q.s&&q.knowledge&&x.knowledge===q.knowledge);
 const near=bank().filter(x=>x.id!==q.id&&x.s===q.s&&x.ch===q.ch&&(!q.knowledge||x.knowledge!==q.knowledge));
 const rows=[...same.map(x=>({x,rel:'同知识点'})),...near.map(x=>({x,rel:'同章迁移'}))].slice(0,4);
 if(!rows.length)return '';
 return `<section class="v451Block"><h3>关联考题 · 换个问法再确认</h3><p class="v451Lead">这些题不是让你背答案，而是检查同一知识点换一种问法后还能不能判断。</p>${rows.map(({x,rel})=>`<div class="v451Related"><b>${esc(rel)} · ${esc(typeLabel(x.type))} · ${esc(x.knowledge||x.ch||'')}</b><span>${esc(x.q)}</span></div>`).join('')}</section>`
}
function knowledgeBlock(q,c){const l=learningFor(q,c);if(!l&&!q.relatedPoints?.length)return '';const definition=l?.definition||'',key=l?.key||'',wrong=l?.wrong||'',falsekey=l?.falsekey||'',example=l?.example||'',points=[...(q.relatedPoints||[])];return `<section class="v451Block v451Knowledge"><h3>本题知识卡</h3>${definition?`<div class="v451KnowledgeLine"><b>定义</b><p>${esc(definition)}</p></div>`:''}${key?`<div class="v451KnowledgeLine"><b>考试抓手</b><p>${esc(key)}</p></div>`:''}${wrong?`<div class="v451KnowledgeLine"><b>典型错误</b><p>${esc(wrong)}</p></div>`:''}${falsekey?`<div class="v451KnowledgeLine"><b>容易混淆</b><p>${esc(falsekey)}</p></div>`:''}${example?`<div class="v451KnowledgeLine"><b>情境理解</b><p>${esc(example)}</p></div>`:''}${points.length?`<div class="v451KnowledgeLine"><b>关联点</b><p>${esc(points.join('；'))}</p></div>`:''}</section>`}
function coreBlock(q,c){const l=learningFor(q,c),definition=l?.definition||'',key=l?.key||'',e=q.e||'';const text=[definition,key,e].filter(Boolean);const uniq=[...new Set(text)];return `<section class="v451Block v451Core"><h3>本题核心</h3><p>${esc(uniq.join('；')||'回到题干限定条件，逐项核对定义、适用条件和例外。')}</p></section>`}
function courseBlock(q,c){const x=courseFor(q,c);if(!x)return '';return `<section class="v451Block"><h3>课程对应讲解</h3><p>${esc(x.explanation||x.teacherAngle||'')}</p>${x.examFocus?`<p><b>考试重点：</b>${esc(x.examFocus)}</p>`:''}${x.trap?`<p><b>易错提醒：</b>${esc(x.trap)}</p>`:''}${x.memoryTip?`<p><b>记忆：</b>${esc(x.memoryTip)}</p>`:''}${x.bvid?`<a target="_blank" rel="noopener" href="https://www.bilibili.com/video/${encodeURIComponent(x.bvid)}/?p=${encodeURIComponent(x.page||1)}">打开对应课程 →</a>`:''}</section>`}
function sourceBlock(q){return `<section class="v451Block v451Source"><h3>题源与可信度</h3><p><b>${esc(q.sourceTruth||'非官方真题')}</b><br>${esc(q.source||'原创模拟·按现行大纲')}。依据：${esc(q.sourceBasis||'现行考试大纲/结构化知识卡')}。</p>${q.sourceUrl?`<a target="_blank" rel="noopener" href="${esc(q.sourceUrl)}">查看依据 →</a>`:''}</section>`}
function markOptions(q,sel,submitted){if(!submitted)return;$$('.questionCard .option').forEach((b,i)=>{b.classList.remove('v451Correct','v451Wrong');if((q.a||[]).includes(i))b.classList.add('v451Correct');else if(sel.includes(i))b.classList.add('v451Wrong')})}
function enhance(){if(busy)return;busy=true;try{const fb=$('#feedback'),q=currentQuestion(),opts=$$('.questionCard .option');if(!fb||!q||!opts.length)return;const submitted=opts.every(x=>x.disabled);if(!submitted)return;const sel=selectedIndexes(),ok=correct(q,sel);markOptions(q,sel,submitted);if($('.v451Deep',fb))return;const c=conceptFor(q);const old=$('.v45Explain',fb);if(old)old.remove();const wrap=document.createElement('div');wrap.className='v451Deep';wrap.innerHTML=`<section class="v451Summary ${ok?'good':'bad'}"><b>${ok?'✓ 作答正确':'× 这题需要弄懂'}</b><span>你的答案：${esc(letters(sel))} · 正确答案：${esc(letters(q.a||[]))}</span></section>${coreBlock(q,c)}<section class="v451Block v451OptionBlock"><h3>逐项拆解</h3><p class="v451Lead">不是重复选项，而是说明每一项为什么成立、为什么不成立，以及它混淆了什么。</p><div class="v451Options">${optionAnalysis(q,c,sel)}</div></section><section class="v451Block ${ok?'':'v451WrongBlock'}"><h3>${ok?'这题真正要掌握什么':'你这次错在哪'}</h3><p>${esc(diagnosis(q,c,sel))}</p></section>${knowledgeBlock(q,c)}${relatedQuestions(q)}${courseBlock(q,c)}${sourceBlock(q)}`;fb.appendChild(wrap)}finally{busy=false}}
const observer=new MutationObserver(()=>queueMicrotask(enhance));observer.observe($('#main')||document.body,{childList:true,subtree:true});loadCourses().finally(()=>{const d=$('.v451Deep');if(d)d.remove();enhance()});enhance();
window.SEC_QUIZ_V451={version:VERSION,features:['learning-first-deep-explanation','option-specific-rationale','wrong-answer-diagnosis','knowledge-card','related-transfer-questions','course-links','source-provenance','mock-review-explanation']};
})();
