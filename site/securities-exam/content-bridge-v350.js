(()=>{
'use strict';
window.SEC_CONTENT_BRIDGE_V350={version:'3.5.0',status:'loading',added:0};
const norm=s=>String(s||'').trim();
function add(payload){
  if(!payload||payload.source_policy!=='derived-paraphrase-only-no-raw-body'||payload.source_count!==17)return;
  const base=Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:[];
  const seen=new Set(base.map(x=>x.s+'|'+x.term));let n=0;
  for(const d of payload.documents||[]){
    for(const p of d.key_points||[]){
      const term=norm(p.topic),definition=norm(p.explanation);if(!term||!definition)continue;
      const s=d.subject==='law'?'law':'finance',key=s+'|'+term;if(seen.has(key))continue;seen.add(key);
      base.push({s,ch:`派生资料 · ${norm(d.source_type)||'补充学习'}`,term,definition,key:norm(p.memory_tip)||`理解“${term}”的适用条件和考试表达`,wrong:norm(p.trap)||`不要脱离适用条件机械记忆“${term}”`,falsekey:norm(p.trap)||'注意相近概念、适用范围和例外条件',example:(p.keywords||[]).length?`关键词：${p.keywords.join('、')}`:'结合关联题目检查是否真正理解',valid:'2026补充资料',sourceId:d.source_id,sourceKind:'kdocs-derived'});n++;
    }
  }
  window.SEC_CONCEPTS=base;window.SEC_CONTENT_BRIDGE_V350={version:'3.5.0',status:'ready',added:n,sourceCount:payload.source_count};
  window.dispatchEvent(new CustomEvent('sec-content-ready',{detail:window.SEC_CONTENT_BRIDGE_V350}));
}
fetch('./kdocs-learning-v1.json?bridge=350',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(add).catch(()=>{window.SEC_CONTENT_BRIDGE_V350={version:'3.5.0',status:'optional-source-unavailable',added:0}});
})();