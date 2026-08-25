(()=>{
'use strict';
const SCHEMA='sec-study-transfer-v1';
const SKEY='sec2026state_v1',PKEY='sec_v350_profiles',AKEY='sec_v350_active',SETKEY='sec_v350_settings';
const AUTHKEY='sec_v360_local_auth',REMKEY='sec_v360_remember_profile',SESSIONKEY='sec_v360_session_profile';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profiles=()=>read(PKEY,[]);
const active=()=>{const ps=profiles(),id=localStorage.getItem(AKEY);return ps.find(x=>x.id===id)||ps[0]||null};
const stateKey=id=>'sec_v350_state_'+id,masteryKey=id=>'sec_v350_mastery_'+id,dailyKey=id=>'sec_v350_daily_'+id,reasonKey=id=>'sec_v350_reasons_'+id;
const authMap=()=>read(AUTHKEY,{});
function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
async function hashPin(id,pin){
 const data=new TextEncoder().encode(`sec-v360|${id}|${pin}`),buf=await crypto.subtle.digest('SHA-256',data);
 return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function hasPin(id){return !!authMap()[id]?.hash}
function remembered(id){return localStorage.getItem(REMKEY)===id||sessionStorage.getItem(SESSIONKEY)===id}
function grant(id,remember=true){sessionStorage.setItem(SESSIONKEY,id);if(remember)localStorage.setItem(REMKEY,id);else if(localStorage.getItem(REMKEY)===id)localStorage.removeItem(REMKEY)}
function revoke(id){if(sessionStorage.getItem(SESSIONKEY)===id)sessionStorage.removeItem(SESSIONKEY);if(localStorage.getItem(REMKEY)===id)localStorage.removeItem(REMKEY)}
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
 const p=active(),top=document.querySelector('.v350TopActions');if(top){let s=top.querySelector('.v360DeviceBadge');if(!s){s=document.createElement('span');s.className='v360DeviceBadge';top.prepend(s)}s.textContent=p&&hasPin(p.id)?'已记住 · PIN保护':'本机档案 · 未云同步'}
 const mobile=document.querySelector('.v350MobileTop [data-v350-account]');if(mobile)mobile.title=p&&hasPin(p.id)?'当前学习账号已启用PIN':'当前为本机学习档案，尚未开启云同步';
}
async function setPinFromPanel(box){
 const p=active(),input=box.querySelector('[data-v360-pin]'),remember=box.querySelector('[data-v360-remember]')?.checked!==false,pin=String(input?.value||'').trim();
 if(!p)return;if(!/^\d{4,6}$/.test(pin)){toast('PIN请输入4～6位数字');input?.focus();return}
 const map=authMap();map[p.id]={hash:await hashPin(p.id,pin),updatedAt:new Date().toISOString()};write(AUTHKEY,map);grant(p.id,remember);input.value='';toast('PIN已设置，本设备已记住');patchAccount(true);addBadge();
}
function clearPin(){
 const p=active();if(!p||!hasPin(p.id))return;if(!confirm(`清除“${p.name||'当前学习账号'}”在本设备上的PIN？学习记录不会删除。`))return;
 const map=authMap();delete map[p.id];write(AUTHKEY,map);revoke(p.id);toast('本机PIN已清除');patchAccount(true);addBadge();
}
function pinPanelHtml(p){const enabled=p&&hasPin(p.id);return `<div class="v360PinPanel"><div class="v360PinHead"><div><h4>简单登录</h4><p>${enabled?'当前账号已设置PIN。切换到这个账号时可要求验证。':'给当前学习账号设置4～6位数字PIN，避免两个人误进对方档案。'}</p></div><span class="${enabled?'on':'off'}">${enabled?'PIN已开启':'未设置PIN'}</span></div><div class="v360PinForm"><input data-v360-pin type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" placeholder="输入4～6位数字PIN"><label><input data-v360-remember type="checkbox" checked> 记住本设备</label><button class="primary" data-v360-setpin>${enabled?'修改PIN':'设置PIN'}</button>${enabled?'<button data-v360-clearpin>清除PIN</button>':''}</div><small>PIN只用于当前设备防误切换，不会明文保存，也不会写入学习记录导出文件。真正跨手机/电脑同步仍需后续云端账号。</small></div>`}
function patchAccount(force=false){
 const truth=document.querySelector('#v350AccountModal .v350AccountTruth');if(!truth)return;if(truth.dataset.syncPatched==='1'&&!force)return;truth.dataset.syncPatched='1';
 const h=truth.querySelector('h3');if(h)h.textContent='设备与同步';
 const ps=truth.querySelectorAll(':scope>p');if(ps[0])ps[0].innerHTML='<b>现在的两套学习档案已经完全分开。</b> 每个人在同一台设备上切换自己的档案，答题、错题、知识掌握和学习统计互不混用。';if(ps[1])ps[1].textContent='当前可以给每个学习账号设置简单PIN并记住设备；手机和电脑自动同步仍需要云端身份服务。';
 truth.querySelectorAll('.v360PinPanel,.v360SyncPanel').forEach(x=>x.remove());
 const p=active(),pin=document.createElement('div');pin.innerHTML=pinPanelHtml(p);truth.appendChild(pin.firstElementChild);
 const box=document.createElement('div');box.className='v360SyncPanel';box.innerHTML=`<h4>当前同步状态</h4><p>不登录也可以先用“导出 / 导入”把同一个人的学习记录在手机和电脑之间手动迁移；自动实时同步尚未开启。</p><div class="v360SyncRows"><div class="v360SyncRow"><span>两个人独立使用</span><b>已支持</b></div><div class="v360SyncRow"><span>账号PIN + 本设备记住</span><b>${p&&hasPin(p.id)?'已开启':'可设置'}</b></div><div class="v360SyncRow"><span>手机 ↔ 电脑自动同步</span><b>待云端账号</b></div></div><div class="v360SyncActions"><button class="primary" data-v360-export>导出当前学习记录</button><button data-v360-import>导入到当前档案</button></div><small class="v360SyncNote">导入只覆盖当前选中的学习档案，不会影响另一个人。学习记录文件不包含PIN。</small>`;truth.appendChild(box);
 truth.querySelector('[data-v360-setpin]')?.addEventListener('click',()=>setPinFromPanel(truth));truth.querySelector('[data-v360-clearpin]')?.addEventListener('click',clearPin);box.querySelector('[data-v360-export]').onclick=exportFile;box.querySelector('[data-v360-import]').onclick=chooseImport;
}
function lockOverlay(){let m=document.getElementById('v360PinLock');if(!m){m=document.createElement('div');m.id='v360PinLock';m.className='v360PinLock';document.body.appendChild(m)}return m}
function profileButtons(currentId){return profiles().filter(x=>x.id!==currentId).map(x=>`<button type="button" data-v360-other="${esc(x.id)}">换成 ${esc(x.name||'另一个学习账号')}</button>`).join('')}
function showLock(){
 const p=active();if(!p||!hasPin(p.id)||remembered(p.id))return;
 const m=lockOverlay();m.innerHTML=`<section class="v360LoginCard"><span class="eyebrow">LEARNER LOGIN</span><h2>${esc(p.name||'学习账号')}</h2><p>请输入这个学习账号的PIN。验证后本设备可以默认记住，不需要每次输入。</p><input data-v360-loginpin type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="current-password" placeholder="4～6位数字PIN"><label><input data-v360-loginremember type="checkbox" checked> 记住本设备</label><button class="primary" data-v360-login>进入学习</button><div class="v360LoginError" aria-live="polite"></div><div class="v360OtherProfiles">${profileButtons(p.id)}</div><small>这是本机轻量PIN，不是云端账号密码。跨设备自动同步还未开启。</small></section>`;m.classList.add('show');
 const input=m.querySelector('[data-v360-loginpin]');setTimeout(()=>input?.focus(),40);
 const submit=async()=>{const pin=String(input?.value||'').trim(),err=m.querySelector('.v360LoginError');if(!/^\d{4,6}$/.test(pin)){err.textContent='请输入4～6位数字PIN';return}const ok=(await hashPin(p.id,pin))===authMap()[p.id]?.hash;if(!ok){err.textContent='PIN不正确，请重试';input.value='';input.focus();return}grant(p.id,m.querySelector('[data-v360-loginremember]')?.checked!==false);m.classList.remove('show');addBadge();toast(`已进入 ${p.name||'学习账号'}`)};
 m.querySelector('[data-v360-login]').onclick=submit;input.onkeydown=e=>{if(e.key==='Enter')submit()};m.querySelectorAll('[data-v360-other]').forEach(b=>b.onclick=()=>{localStorage.setItem(AKEY,b.dataset.v360Other);sessionStorage.removeItem(SESSIONKEY);location.reload()});
}
function boot(){
 addBadge();setTimeout(()=>{addBadge();showLock()},100);
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-v350-account]'))setTimeout(()=>patchAccount(),0)},false);
 const m=document.getElementById('v350AccountModal');if(m)new MutationObserver(()=>{patchAccount();addBadge()}).observe(m,{childList:true,subtree:true});
 const bodyObs=new MutationObserver(()=>addBadge());bodyObs.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SEC_PROFILE_SYNC_V360={schema:SCHEMA,mode:'two-local-profiles+pin+remembered-device+manual-transfer',cloudSync:false,pinStorage:'sha256-local-only'};
})();
