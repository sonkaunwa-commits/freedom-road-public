(()=>{
const MARK='SEC_UX_FIX_V27';
function state(){try{return JSON.parse(localStorage.getItem('sec2026state_v1')||'{}')}catch(_){return {}}}
function fixFocus(){const b=document.querySelector('#learnFocusV26 b');if(b)b.textContent='本月重点';const btn=document.getElementById('learnFocusV26');if(btn&&!btn.dataset.monthFix){btn.dataset.monthFix='1';btn.addEventListener('click',()=>setTimeout(()=>{const h=document.querySelector('#view-learn .learnTop b');if(h)h.textContent=`${new Date().getMonth()+1}月重点`},0))}}
function fixResume(){const A=window.SEC_UX_V26;if(!A?.hasSession?.())return;const s=state(),sess=s.session||{};const box=document.getElementById('resumeCardV26');if(!box)return;const done=sess.exam?Object.keys(s.examAnswers||{}).length:(sess.doneIds||[]).length,total=(sess.ids||[]).length,left=Math.max(0,total-done);const small=box.querySelector('small');if(small)small.textContent=`${sess.label||'练习'} · 已完成 ${done}/${total} · 还剩 ${left} 题`}
function fixMocks(){if(document.documentElement.dataset.secMockFix)return;document.documentElement.dataset.secMockFix='1';document.addEventListener('click',e=>{const b=e.target.closest?.('#mockSetsV26 [data-set]');if(!b)return;const A=window.SEC_UX_V26;if(A?.hasSession?.()){e.preventDefault();e.stopImmediatePropagation();A.resume();const t=document.getElementById('toast');if(t){t.textContent='已继续上次未完成练习';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1400)}}},true)}
function addCss(sel,href,key){if(document.querySelector(sel))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='1';document.head.appendChild(l)}
function addScript(sel,src,key){if(document.querySelector(sel))return;const s=document.createElement('script');s.src=src;s.dataset[key]='1';document.head.appendChild(s)}
function loadAssistant(){
 addCss('link[data-sec-assistant-v31]','./assistant-v31.css?v=340','secAssistantV31');
 addScript('script[data-sec-assistant-v31]','./assistant-v31.js?v=340','secAssistantV31');
 addCss('link[data-sec-sources-v321]','./sources-v321.css?v=340','secSourcesV321');
 addScript('script[data-sec-sources-v321]','./sources-v321.js?v=340','secSourcesV321');
 addCss('link[data-sec-release-v32]','./release-v32.css?v=340','secReleaseV32');
 addScript('script[data-sec-release-v32]','./release-v32.js?v=340','secReleaseV32');
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=340',{updateViaCache:'none'}).catch(()=>{});
 setTimeout(()=>{const v=document.querySelector('.version');if(v)v.textContent='v3.4.0 · 2026新大纲 · 学习工作台';window.SEC_UI_R2?.refresh?.()},350)
}
function boot(){if(!window.SEC_UX_V26){setTimeout(boot,80);return}fixMocks();fixFocus();fixResume();loadAssistant();setInterval(()=>{fixFocus();fixResume();window.SEC_UI_R2?.refresh?.()},800);window[MARK]={pass:true,productVersion:'3.4.0',monthlyFocus:true,examProgress:true,protectMockSession:true,assistantV31:true,sourcesV321:true,releaseV32:true,uiR2:true}}
boot();
})();