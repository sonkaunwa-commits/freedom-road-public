(()=>{
'use strict';
const VERSION='3.6.0';
const state={version:VERSION,status:'loading',added:0,sources:{kdocs:0,bilibiliFinance:0,bilibiliLaw:0}};
window.SEC_CONTENT_BRIDGE_V360=state;
const norm=s=>String(s||'').trim();
const base=()=>Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:(window.SEC_CONCEPTS=[]);
const seen=()=>new Set(base().map(x=>x.s+'|'+x.term));
function addCard(c,set){const key=c.s+'|'+c.term;if(!c.term||!c.definition||set.has(key))return false;set.add(key);base().push(c);state.added++;return true}
function addKdocs(x){if(!x||x.source_policy!=='derived-paraphrase-only-no-raw-body')return 0;const set=seen();let n=0;for(const d of x.documents||[])for(const p of d.key_points||[]){const term=norm(p.topic),definition=norm(p.explanation);if(addCard({s:d.subject==='law'?'law':'finance',ch:`补充资料 · ${norm(d.source_type)||'精学'}`,term,definition,key:norm(p.memory_tip)||`掌握“${term}”的适用条件和考试表达`,wrong:norm(p.trap)||`不要脱离条件机械记忆“${term}”`,falsekey:norm(p.trap)||'注意相近概念、适用范围和例外条件',example:(p.keywords||[]).length?`关键词：${p.keywords.join('、')}`:'结合关联题验证是否真正掌握',memoryTip:norm(p.memory_tip),sourceKind:'kdocs-derived',sourceId:d.source_id,sourceLabel:'乐橙资料 · AI重组'},set)){n++}}state.sources.kdocs=n;return n}
function addBili(x,kind){if(!x||x.source_policy!=='derived-paraphrase-only-no-raw-transcript')return 0;const set=seen();let n=0;for(const d of x.documents||[])for(const p of d.points||[]){const term=norm(p.topic),definition=norm(p.explanation),s=x.subject==='law'?'law':'finance';if(addCard({s,ch:norm(d.chapter_guess)||`课程精讲 · P${d.page||''}`,term,definition,key:norm(p.exam_focus)||norm(p.teacher_angle)||`理解“${term}”的考试方式`,wrong:norm(p.trap)||`注意“${term}”的适用条件与常见误区`,falsekey:norm(p.trap)||'注意相近概念和例外条件',example:norm(p.example)||norm(p.memory_tip)||'结合关联题立即验证',memoryTip:norm(p.memory_tip),teacherAngle:norm(p.teacher_angle),sourceKind:'bilibili-derived',sourceId:d.part_key,sourceLabel:`课程精讲 · P${d.page||''}${d.part?' · '+norm(d.part):''}`},set)){n++}}state.sources[kind]=n;return n}
async function load(url,fn){try{const r=await fetch(url+'?bridge=360',{cache:'no-store'});if(!r.ok)return;fn(await r.json())}catch(_){}}
Promise.all([
 load('./kdocs-learning-v1.json',addKdocs),
 load('./bilibili-finance-learning-v1.json',x=>addBili(x,'bilibiliFinance')),
 load('./bilibili-law-learning-v1.json',x=>addBili(x,'bilibiliLaw'))
]).finally(()=>{state.status='ready';window.dispatchEvent(new CustomEvent('sec-content-ready',{detail:{...state}}))});
})();
