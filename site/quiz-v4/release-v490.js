(()=>{
'use strict';
const RELEASE='4.9.0';
const CORE='4.5.0';
const $=(s,r=document)=>r.querySelector(s);
let scheduled=false;
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
function patchVersion(){
 const cards=[...document.querySelectorAll('.meCard')];
 const card=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='版本');
 if(!card)return;
 const rows=[...card.querySelectorAll('.statLine')];
 const quizRow=rows.find(x=>['刷题器','产品版本'].includes(x.querySelector('span')?.textContent.trim()));
 if(quizRow){setText(quizRow.querySelector('span'),'产品版本');setText(quizRow.querySelector('b'),'v'+RELEASE);}
 let coreRow=rows.find(x=>x.querySelector('span')?.textContent.trim()==='核心框架');
 if(!coreRow){
   coreRow=document.createElement('div');coreRow.className='statLine';coreRow.innerHTML='<span>核心框架</span><b>v'+CORE+'</b>';
   const sync=rows.find(x=>x.querySelector('span')?.textContent.trim()==='同步');
   sync?card.insertBefore(coreRow,sync):card.appendChild(coreRow);
 }else setText(coreRow.querySelector('b'),'v'+CORE);
}
function patchType(){
 const card=$('.questionCard'); if(!card)return;
 const hint=$('.typeHint',card); if(!hint)return;
 const qh=card.querySelector('h1')?.textContent.trim();
 const q=(window.SEC_QUESTIONS||[]).find(x=>String(x.q||'').trim()===qh); if(!q)return;
 const isCase=!!q.caseId||q.type==='comprehensive';
 const mode=q.caseAnswerType||(q.type==='multi'||(q.a||[]).length>1?'multi':q.type==='judge'?'judge':'single');
 const desired=isCase?`综合案例｜${mode==='multi'?'多选题':mode==='judge'?'判断题':'单选题'}`:mode==='multi'?'多选题｜可选择多个答案':mode==='judge'?'判断题｜请选择正确或错误':'单选题｜请选择一个答案';
 setText(hint,desired);
}
function patchHome(){
 const dash=$('.v45Dashboard'); if(!dash||$('.v490Notice'))return;
 const x=document.createElement('div');x.className='v45Coach good v490Notice';
 const m=window.SEC_CURATED_BANK_V490||{};
 x.innerHTML=`<b>高质量题库重建模式</b><p>当前仅使用重新审校题库：金融 ${m.finance||0} 题、法规 ${m.law||0} 题。旧生成题已退出默认池；每题均要求大纲考点、逐项解析、边界与关联知识。</p>`;
 dash.appendChild(x);
}
function disableMock(){
 document.querySelectorAll('[data-tab="mock"],.v45MockEntry,[data-mode="mock"]').forEach(b=>{
   if(b.dataset.v490MockBound==='1')return;
   b.dataset.v490MockBound='1';
   b.addEventListener('click',e=>{
     e.preventDefault();e.stopImmediatePropagation();
     const t=document.getElementById('toast');
     if(t){t.textContent='模拟卷暂时关闭：新题库达到足够题量后再恢复，避免旧题凑数。';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
   },true);
 });
}
function patch(){scheduled=false;patchVersion();patchType();patchHome();disableMock();}
function schedulePatch(){if(scheduled)return;scheduled=true;requestAnimationFrame(patch);}
new MutationObserver(schedulePatch).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
patch();
window.SEC_RELEASE_V490={version:RELEASE,core:CORE,mode:'curated-bank-rebuild',hotfix:'mutation-loop-fixed'};
})();