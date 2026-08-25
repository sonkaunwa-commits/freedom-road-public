(()=>{
const MARK='SEC_UI_PRO_R1';
if(window[MARK])return;window[MARK]=true;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function boot(){
 document.body.classList.add('uiProR1');
 const top=$('.brandrow');
 if(top&&!$('#uiProBadgeR1')){
   const b=document.createElement('span');b.id='uiProBadgeR1';b.textContent='学习中心';b.style.cssText='display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:999px;background:#eef2ff;color:#3157d5;font-size:10px;font-weight:800;margin-left:7px;vertical-align:2px';
   const brand=$('.brand');if(brand)brand.appendChild(b);
 }
 const tabs=$$('.tabs .tab');
 tabs.forEach(x=>{x.setAttribute('aria-label',x.textContent.trim());x.setAttribute('type','button')});
 $$('button').forEach(x=>{if(!x.getAttribute('type'))x.setAttribute('type','button')});
 const search=$('#searchInput');if(search)search.setAttribute('aria-label','搜题关键词');
 const selects=$$('select');selects.forEach(x=>x.setAttribute('aria-label',x.closest('.field')?.querySelector('label')?.textContent||'选择项'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
let n=0;const t=setInterval(()=>{boot();if(++n>24)clearInterval(t)},500);
})();
