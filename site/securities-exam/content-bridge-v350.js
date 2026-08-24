(()=>{
'use strict';
window.SEC_CONTENT_BRIDGE_V350={version:'3.5.0',status:'loading',added:0,sources:{kdocs:0,bilibili:0}};
const norm=s=>String(s||'').trim();
const base=()=>Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:(window.SEC_CONCEPTS=[]);
function seen(){return new Set(base().map(x=>x.s+'|'+x.term))}
function pushConcept(x,S){const key=x.s+'|'+x.term;if(S.has(key))return false;S.add(key);base().push(x);return true}
function publish(kind,n){const prev=window.SEC_CONTENT_BRIDGE_V350||{};const sources={...(prev.sources||{}),[kind]:n};window.SEC_CONTENT_BRIDGE_V350={version:'3.5.0',status:'ready',added:Object.values(sources).reduce((a,b)=>a+(+b||0),0),sources};window.dispatchEvent(new CustomEvent('sec-content-ready',{detail:window.SEC_CONTENT_BRIDGE_V350}))}
function addKdocs(payload){
 if(!payload||payload.source_policy!=='derived-paraphrase-only-no-raw-body'||payload.source_count!==17)return publish('kdocs',0);
 const S=seen();let n=0;
 for(const d of payload.documents||[])for(const p of d.key_points||[]){const term=norm(p.topic),definition=norm(p.explanation);if(!term||!definition)continue;const s=d.subject==='law'?'law':'finance';if(pushConcept({s,ch:`派生资料 · ${norm(d.source_type)||'补充学习'}`,term,definition,key:norm(p.memory_tip)||`理解“${term}”的适用条件和考试表达`,wrong:norm(p.trap)||`不要脱离适用条件机械记忆“${term}”`,falsekey:norm(p.trap)||'注意相近概念、适用范围和例外条件',example:(p.keywords||[]).length?`关键词：${p.keywords.join('、')}`:'结合关联题目检查是否真正理解',valid:'2026补充资料',sourceId:d.source_id,sourceKind:'kdocs-derived'},S))n++}
 publish('kdocs',n)
}
function addBilibili(payload){
 if(!payload||payload.source_policy!=='derived-paraphrase-only-no-raw-transcript'||payload.subject!=='finance')return publish('bilibili',0);
 const S=seen();let n=0;
 for(const d of payload.documents||[])for(const p of d.points||[]){const term=norm(p.topic),definition=norm(p.explanation);if(!term||!definition)continue;const teacher=norm(p.teacher_angle),focus=norm(p.exam_focus),trap=norm(p.trap),tip=norm(p.memory_tip);if(pushConcept({s:'finance',ch:`课程讲解 · ${norm(d.chapter_guess)||norm(d.part)||'金融基础'}`,term,definition,key:focus||teacher||`考试重点：理解“${term}”的适用场景`,wrong:trap||`不要只记结论，要确认“${term}”的条件和范围`,falsekey:trap||'注意老师强调的相近概念和条件差异',example:norm(p.example)||((p.keywords||[]).length?`关键词：${p.keywords.join('、')}`:'结合关联题目立即验证理解'),valid:'2026课程补充',sourceId:d.part_key,sourceKind:'bilibili-derived',teacherAngle:teacher,memoryTip:tip},S))n++}
 publish('bilibili',n)
}
Promise.allSettled([
 fetch('./kdocs-learning-v1.json?bridge=350',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(addKdocs),
 fetch('./bilibili-learning-v1.json?bridge=350',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(addBilibili)
]).then(()=>{if((window.SEC_CONTENT_BRIDGE_V350?.added||0)===0)window.SEC_CONTENT_BRIDGE_V350={version:'3.5.0',status:'optional-sources-unavailable',added:0,sources:{kdocs:0,bilibili:0}}});
})();