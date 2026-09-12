(()=>{
'use strict';
const VERSION='4.7.0';
const EXAM_DATE='2026-09-19';
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
function daysLeft(){const n=new Date(),d=new Date(`${EXAM_DATE}T00:00:00+08:00`);const today=new Date(n.getFullYear(),n.getMonth(),n.getDate());return Math.max(0,Math.ceil((d-today)/86400000));}
function addHome(){
  const dash=$('.v45Dashboard'); if(!dash||$('.v47TrustCard')) return;
  const m=window.SEC_V47_TRUST||{};
  const d=daysLeft();
  const el=document.createElement('section');el.className='v47TrustCard';
  el.innerHTML=`<div class="v47TrustHead"><div><b>临考可信模式已开启</b><span>v${esc(VERSION)}</span></div><em>${esc(m.kept??'—')} 题进入主练习</em></div><p>默认只保留：现行范围、可链接到证券业协会官方依据、并有完整逐项解析的题。历史题、考生回忆题、开放候选和无依据题已从主练习退出。</p><div class="v47Rule"><b>解析口径</b><span>题目不冒充官方真题；逐项解释属于基于官方大纲/法规整理的学习解析。官方链接用于核对规则依据，不代表协会发布了逐题标准解析。</span></div><div class="v47Plan"><b>${d}天临考安排</b><span>9/13–9/16：两科交替刷可信题，优先错题和新增纪法；9/17：两科各做1套120题模拟；9/18：只复盘错题、薄弱章和纪法；9/19：轻量回顾，不再扩题。</span></div>`;
  dash.appendChild(el);
}
function addQuestionTrust(){
  const fb=$('#feedback');if(!fb)return;
  const src=$('.v451Source',fb);if(!src||$('.v47Evidence',src))return;
  const q=(()=>{const card=$('.questionCard');if(!card)return null;const id=card.dataset?.id;const B=window.SEC_QUESTIONS||[];return id?B.find(x=>String(x.id)===String(id)):null})();
  const tier=q?.trustTier||'B';const reason=q?.trustReason||'已通过临考可信准入';
  const d=document.createElement('div');d.className='v47Evidence';d.innerHTML=`<b>可信等级 ${esc(tier)}</b><span>${esc(reason)}</span><small>若官方法规、协会大纲与本页解释存在冲突，以考试时已公布并施行的官方规则为准。</small>`;src.prepend(d);
}
function addTopMarker(){const t=$('#topTitle');if(t&&!t.dataset.v47){t.dataset.v47='1';t.title='临考可信模式 v4.7.0'}}
function run(){addHome();addQuestionTrust();addTopMarker();}
new MutationObserver(()=>queueMicrotask(run)).observe($('#main')||document.body,{childList:true,subtree:true});
run();
window.SEC_QUIZ_V47={version:VERSION,features:['final-week-trust-gate','official-basis-disclosure','six-day-study-plan']};
})();
