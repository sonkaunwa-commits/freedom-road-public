(()=>{
'use strict';
const SCHEMA='sec-study-transfer-v1';
const SKEY='sec2026state_v1',PKEY='sec_v350_profiles',AKEY='sec_v350_active',SETKEY='sec_v350_settings';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const active=()=>{const ps=read(PKEY,[]),id=localStorage.getItem(AKEY);return ps.find(x=>x.id===id)||ps[0]||null};
const stateKey=id=>'sec_v350_state_'+id,masteryKey=id=>'sec_v350_mastery_'+id,dailyKey=id=>'sec_v350_daily_'+id,reasonKey=id=>'sec_v350_reasons_'+id;
function toast(msg){const t=document.getElementById('toast');if(!t)return; t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function payload(){
 const p=active();if(!p)throw new Error('no_profile');
 const current=read(SKEY,{});write(stateKey(p.id),current);
 return {schema:SCHEMA,version:'3.6.0',exportedAt:new Date().toISOString(),profile:{name:p.name||'学习档案'},state:current,mastery:read(masteryKey(p.id),{}),daily:read(dailyKey(p.id),{}),reasons:read(reasonKey(p.id),{}),settings:read(SETKEY,{})};
}
function exportFile(){
 try{
  const x=payload(),safe=(x.profile.name||'学习档案').replace(/[\\/:*?"<>|]/g,'-').slice(0,24),blob=new Blob([JSON.stringify(x,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download=`证券学习记录-${safe}-${new Date().toLocaleDateString('sv-SE')}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('学习记录已导出');
 }catch(_){toast('导出失败，请稍后再试')}
}
function validate(x){return x&&x.schema===SCHEMA&&x.state&&typeof x.state==='object'&&x.mastery&&typeof x.mastery==='object'}
function importData(x){
 if(!validate(x)){toast('这不是有效的学习记录文件');return}
 const p=active();if(!p){toast('当前没有学习档案');return}
 if(!confirm(`将把文件中的学习记录导入“${p.name||'当前档案'}”，并覆盖这个档案在本设备上的现有进度。\n\n另一个学习档案不会受影响。\n\n确定继续吗？`))return;
 write(SKEY,x.state||{});write(stateKey(p.id),x.state||{});write(masteryKey(p.id),x.mastery||{});write(dailyKey(p.id),x.daily||{});write(reasonKey(p.id),x.reasons||{});if(x.settings&&typeof x.settings==='object')write(SETKEY,x.settings);
 toast('导入完成，正在刷新');setTimeout(()=>location.reload(),500);
}
function chooseImport(){
 const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.style.display='none';document.body.appendChild(i);i.onchange=async()=>{try{const f=i.files?.[0];if(!f)return;importData(JSON.parse(await f.text()))}catch(_){toast('文件读取失败')}finally{i.remove()}};i.click();
}
function addBadge(){
 const top=document.querySelector('.v350TopActions');if(top&&!top.querySelector('.v360DeviceBadge')){const s=document.createElement('span');s.className='v360DeviceBadge';s.textContent='本机档案 · 未云同步';top.prepend(s)}
 const mobile=document.querySelector('.v350MobileTop [data-v350-account]');if(mobile)mobile.title='当前为本机学习档案，尚未开启云同步';
}
function patchAccount(){
 const truth=document.querySelector('#v350AccountModal .v350AccountTruth');if(!truth||truth.dataset.syncPatched==='1')return;truth.dataset.syncPatched='1';
 const h=truth.querySelector('h3');if(h)h.textContent='设备与同步';
 const ps=truth.querySelectorAll(':scope>p');if(ps[0])ps[0].innerHTML='<b>现在的两套学习档案已经完全分开。</b> 每个人在同一台设备上切换自己的档案，答题、错题、知识掌握和学习统计互不混用。';if(ps[1])ps[1].textContent='目前仍是本机存储，所以手机和电脑不会自动识别为同一个学习者。真正自动跨设备同步需要先建立云端身份；以后可以做到首次绑定后长期记住设备，不必每次登录。';
 const box=document.createElement('div');box.className='v360SyncPanel';box.innerHTML=`<h4>当前同步状态</h4><p>不登录也可以先用“导出 / 导入”把同一个人的学习记录在手机和电脑之间手动迁移；自动实时同步尚未开启。</p><div class="v360SyncRows"><div class="v360SyncRow"><span>两个人独立使用</span><b>已支持</b></div><div class="v360SyncRow"><span>本机自动记住当前学习者</span><b>已支持</b></div><div class="v360SyncRow"><span>手机 ↔ 电脑自动同步</span><b>待云端账号</b></div></div><div class="v360SyncActions"><button class="primary" data-v360-export>导出当前学习记录</button><button data-v360-import>导入到当前档案</button></div><small class="v360SyncNote">导入只覆盖当前选中的学习档案，不会影响另一个人。学习记录文件只包含考试学习进度，不包含账号密码。</small>`;truth.appendChild(box);
 box.querySelector('[data-v360-export]').onclick=exportFile;box.querySelector('[data-v360-import]').onclick=chooseImport;
}
function boot(){
 addBadge();setTimeout(addBadge,100);
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-v350-account]'))setTimeout(patchAccount,0)},false);
 const m=document.getElementById('v350AccountModal');if(m)new MutationObserver(()=>{patchAccount();addBadge()}).observe(m,{childList:true,subtree:true});
 const bodyObs=new MutationObserver(()=>addBadge());bodyObs.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SEC_PROFILE_SYNC_V360={schema:SCHEMA,mode:'two-local-profiles+manual-transfer',cloudSync:false};
})();
