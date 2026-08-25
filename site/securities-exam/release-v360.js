(()=>{
'use strict';
const VERSION='3.6.0';
window.SEC_RELEASE_V360={version:VERSION,architecture:'exam-prep-system-v2',releasedAt:'2026-08-25'};
const qs=s=>document.querySelector(s),qsa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function patchVersion(){
 document.body.dataset.productVersion=VERSION;
 document.title=`证券考试学习助手 2026 · v${VERSION}`;
 qsa('.v350Brand small,.v350TopActions .version').forEach(el=>{el.textContent=el.classList.contains('version')?`v${VERSION}`:`产品版本 v${VERSION}`});
 const ms=qs('.v350MobileTop small');if(ms)ms.textContent=(ms.textContent||'').replace(/v3\.5\.0/g,`v${VERSION}`);
}
function bridgeState(){return window.SEC_CONTENT_BRIDGE_V360||{added:0,sources:{}}}
function sourceSummary(){
 const c=window.SEC_SOURCE_CONTENT_V360?.count||0,b=bridgeState(),s=b.sources||{};
 return {material:c,kdocs:s.kdocs||0,finance:s.bilibiliFinance||0,law:s.bilibiliLaw||0,total:c+(s.kdocs||0)+(s.bilibiliFinance||0)+(s.bilibiliLaw||0)};
}
function injectKnowledgeSummary(){
 const v=qs('#view-knowledge');if(!v||!v.classList.contains('active'))return;
 let box=qs('#v360KnowledgeSources');if(!box){box=document.createElement('section');box.id='v360KnowledgeSources';box.className='v360SourceSummary';const head=v.querySelector('.v350PageHead');head?.insertAdjacentElement('afterend',box)}
 const s=sourceSummary();
 box.innerHTML=`<div><span>知识来源</span><b>官方框架 + 题库知识 + 资料精学 + 课程讲解</b><small>当前新增派生知识：资料 ${s.material} · KDocs ${s.kdocs} · 金融课程 ${s.finance} · 法规课程 ${s.law}</small></div><div class="v360SourceLegend"><i>资料不是学习入口</i><i>课程不是整段搬运</i><i>统一进入知识点</i></div>`;
}
function enhanceConcept(key){
 const c=(window.SEC_CONCEPTS||[]).find(x=>x.s+'|'+x.term===key),detail=qs('#v350ConceptDetail');if(!c||!detail)return;
 detail.querySelector('.v360Context')?.remove();
 if(!c.memoryTip&&!c.teacherAngle&&!c.sourceLabel&&!c.sourceDoc)return;
 const a=document.createElement('article');a.className='v360Context';
 const src=c.sourceLabel||c.sourceDoc||({kdocs:'乐橙资料',bilibili:'课程讲解'}[String(c.sourceKind||'').split('-')[0]])||'结构化知识库';
 a.innerHTML=`<div class="v360ContextHead"><span>学习补充</span><b>${esc(src)}</b></div>${c.teacherAngle?`<div><strong>老师怎么讲清这件事</strong><p>${esc(c.teacherAngle)}</p></div>`:''}${c.memoryTip?`<div><strong>记忆提示</strong><p>${esc(c.memoryTip)}</p></div>`:''}<small>本卡为学习系统重新组织后的内容；考试范围以官方大纲和统编教材为基准。</small>`;
 const rel=detail.querySelector('.v350Related');(rel||detail.lastElementChild)?.insertAdjacentElement(rel?'beforebegin':'afterend',a);
}
function openRelease(){
 let m=qs('#v350AccountModal');if(!m){m=document.createElement('div');m.id='v350AccountModal';m.className='v350ModalBack';document.body.appendChild(m)}
 const s=sourceSummary();
 m.innerHTML=`<section class="v350Modal v360ReleaseModal"><header><div><span class="eyebrow">FORMAL RELEASE</span><h2>证券考试学习助手 v${VERSION}</h2><p>2026新大纲 · 备考系统 v2 · 2026-08-25</p></div><button data-v360-close>×</button></header><div class="v360ReleaseStatus"><article><span>计划</span><b>自适应、非空</b><small>按剩余天数和可用时间生成</small></article><article><span>知识</span><b>完整学习卡</b><small>主动回忆 + 考法 + 易错 + 例子</small></article><article><span>复习</span><b>错因 + 间隔</b><small>错误归因后安排再测</small></article><article><span>内容</span><b>${s.total} 个新增派生知识</b><small>不公开复制原资料/字幕</small></article></div><div class="v350Release"><article><b>v3.6.0 本次更新</b><ul><li>接入用户上传金融资料，形成第一批24个真正可学习知识卡</li><li>金融、法规两套B站课程统一进入课程知识生产线</li><li>KDocs与B站派生内容统一并入知识地图，不再作为孤立链接</li><li>知识卡增加老师讲解角度、记忆提示和内容来源</li><li>继续保留非空今日计划、两套学习档案、错题归因与间隔复习</li></ul></article><article><b>发布边界</b><ul><li>官方大纲/教材决定考试范围</li><li>外部资料和课程只作为理解、记忆与易错补充</li><li>原始字幕和付费资料正文不进入公开仓库</li><li>跨设备账号密码仍需后端认证，当前不伪装成云账号</li></ul></article></div></section>`;
 m.classList.add('show');m.onclick=e=>{if(e.target===m||e.target.closest('[data-v360-close]'))m.classList.remove('show')};
}
function boot(){
 patchVersion();
 document.addEventListener('click',e=>{
   const v=e.target.closest?.('[data-v350-version]');if(v){e.preventDefault();e.stopImmediatePropagation();openRelease();return}
   const c=e.target.closest?.('[data-concept]');if(c)setTimeout(()=>enhanceConcept(c.dataset.concept),0);
   const n=e.target.closest?.('[data-v350-nav="knowledge"]');if(n)setTimeout(injectKnowledgeSummary,0);
 },true);
 window.addEventListener('sec-content-ready',()=>{injectKnowledgeSummary();patchVersion()});
 setTimeout(()=>{patchVersion();injectKnowledgeSummary()},0);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
