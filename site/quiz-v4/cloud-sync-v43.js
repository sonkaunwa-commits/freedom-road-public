(()=>{
'use strict';
const VERSION='4.3.0';
const API='https://qygzovuihtnxfciyowty.supabase.co/functions/v1/exam-sync';
const APIKEY='sb_publishable_mTlFbbYmjOGtsXhGbIb5Hw_rIurluQP';
const TOKEN='sec_v43_cloud_token',USER='sec_v43_cloud_user',REV='sec_v43_cloud_revision',STATUS='sec_v43_cloud_status';
const SKEY='sec2026state_v1',RKEY='sec_v4_recovery',LASTKEY='sec_v4_last',MKEY='sec_v42_mastery_v1',TKEY='sec_v42_transfer_history';
const TRACKED=new Set([SKEY,RKEY,LASTKEY,MKEY,TKEY]);
let applying=false,pushTimer=null,pushing=false,lastStatus='';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
const rawToken=()=>localStorage.getItem(TOKEN)||'';
const user=()=>read(USER,null);
const revision=()=>Number(localStorage.getItem(REV)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
function setStatus(s){lastStatus=s;localStorage.setItem(STATUS,s);patchAccountCard()}
function blankState(){return {answered:{},wrong:[],fav:[],daily:{},history:[]}}
function snapshot(){return {schema:'sec-cloud-sync-v1',version:VERSION,state:read(SKEY,blankState()),recovery:read(RKEY,{}),last:read(LASTKEY,null),mastery:read(MKEY,{}),transferHistory:read(TKEY,[]),savedAt:Date.now()}}
function meaningful(p){return Object.keys(p?.state?.answered||{}).length>0||(p?.state?.wrong||[]).length>0||(p?.state?.fav||[]).length>0||Object.keys(p?.mastery||{}).length>0}
function applyPayload(p){if(!p||typeof p!=='object')return;applying=true;try{localStorage.setItem(SKEY,JSON.stringify(p.state||blankState()));localStorage.setItem(RKEY,JSON.stringify(p.recovery||{}));localStorage.setItem(LASTKEY,JSON.stringify(p.last??null));localStorage.setItem(MKEY,JSON.stringify(p.mastery||{}));localStorage.setItem(TKEY,JSON.stringify(p.transferHistory||[]))}finally{applying=false}}
function uniq(arr){return [...new Set((arr||[]).filter(Boolean))]}
function mergeState(a={},b={}){
 const history=[...(a.history||[]),...(b.history||[])].filter(x=>x&&x.id).sort((x,y)=>(y.at||0)-(x.at||0));
 const seen=new Set(),mergedHistory=[];for(const x of history){const k=`${x.id}|${x.at||0}|${x.ok}`;if(seen.has(k))continue;seen.add(k);mergedHistory.push(x);if(mergedHistory.length>=300)break}
 return {answered:{...(a.answered||{}),...(b.answered||{})},wrong:uniq([...(a.wrong||[]),...(b.wrong||[])]),fav:uniq([...(a.fav||[]),...(b.fav||[])]),daily:{...(a.daily||{}),...(b.daily||{})},history:mergedHistory};
}
function mergeMastery(a={},b={}){const out={...a};for(const [k,v] of Object.entries(b||{})){if(!out[k]||(v?.lastAt||0)>=(out[k]?.lastAt||0))out[k]=v}return out}
function mergePayload(remote={},local={}){return {schema:'sec-cloud-sync-v1',version:VERSION,state:mergeState(remote.state,local.state),recovery:{...(remote.recovery||{}),...(local.recovery||{})},last:(local.last?.at||0)>=(remote.last?.at||0)?local.last:remote.last,mastery:mergeMastery(remote.mastery,local.mastery),transferHistory:uniq([...(local.transferHistory||[]),...(remote.transferHistory||[])]).slice(0,120),savedAt:Date.now()}}
async function call(action,data={},token=rawToken()){
 const h={'content-type':'application/json','apikey':APIKEY};if(token)h.authorization=`Bearer ${token}`;
 const r=await fetch(API,{method:'POST',headers:h,body:JSON.stringify({action,...data}),cache:'no-store'});let x={};try{x=await r.json()}catch(_){}
 if(!r.ok){const e=new Error(x.error||`http_${r.status}`);e.code=x.error||'';e.status=r.status;e.data=x;throw e}return x;
}
function storeSession(x){localStorage.setItem(TOKEN,x.token);localStorage.setItem(USER,JSON.stringify(x.user));localStorage.setItem(REV,String(x.revision||0));setStatus('已同步')}
function clearSession(){localStorage.removeItem(TOKEN);localStorage.removeItem(USER);localStorage.removeItem(REV);sessionStorage.removeItem('sec_v43_boot_synced');setStatus('未登录')}
async function pull({boot=false}={}){
 if(!rawToken())return false;setStatus('同步中…');
 try{const x=await call('pull');localStorage.setItem(USER,JSON.stringify(x.user));localStorage.setItem(REV,String(x.revision||0));applyPayload(x.payload||{});setStatus('已同步');if(boot){sessionStorage.setItem('sec_v43_boot_synced',rawToken().slice(0,12));location.reload()}return true}catch(e){if(e.status===401){clearSession();showAuth('登录状态已失效，请重新登录')}else setStatus('同步暂时失败');return false}
}
async function push(){if(!rawToken()||applying||pushing)return;pushing=true;setStatus('保存中…');try{let p=snapshot();let base=revision();try{const x=await call('push',{payload:p,baseRevision:base});localStorage.setItem(REV,String(x.revision));setStatus('已同步')}catch(e){if(e.status===409&&e.data){p=mergePayload(e.data.payload||{},p);applyPayload(p);localStorage.setItem(REV,String(e.data.revision||0));const x=await call('push',{payload:p,baseRevision:Number(e.data.revision||0)});localStorage.setItem(REV,String(x.revision));setStatus('已合并同步')}else throw e}}catch(e){if(e.status===401){clearSession();showAuth('登录状态已失效，请重新登录')}else setStatus('待网络恢复')}finally{pushing=false}}
function schedulePush(){if(!rawToken()||applying)return;clearTimeout(pushTimer);pushTimer=setTimeout(push,650)}
const nativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){const r=nativeSet.call(this,k,v);if(this===localStorage&&TRACKED.has(String(k))&&!applying)schedulePush();return r};
function authShell(){let m=document.getElementById('v43Auth');if(!m){m=document.createElement('div');m.id='v43Auth';m.className='v43Auth';document.body.appendChild(m)}return m}
function errText(code){return ({invalid_username:'账号请输入2～24位中文、英文、数字、_或-',invalid_password:'密码至少8位',invalid_display_name:'昵称格式不正确',username_taken:'这个账号已经有人使用',invalid_credentials:'账号或密码不正确',temporarily_locked:'连续输错过多，请15分钟后再试',account_disabled:'账号已停用',server_error:'服务暂时异常，请稍后再试'}[code]||'操作失败，请稍后再试')}
function showAuth(message=''){
 const m=authShell();m.innerHTML=`<section class="v43LoginCard"><span class="eyebrow">SECURITIES STUDY</span><h1>登录学习账号</h1><p>每个人只进入自己的账号。不会显示另一个人的账号，也不能直接切换到别人的进度。</p>${message?`<div class="v43Notice">${esc(message)}</div>`:''}<div class="v43AuthTabs"><button class="active" data-auth-tab="login">登录</button><button data-auth-tab="register">创建账号</button></div><form data-auth-form="login"><label>账号<input name="username" autocomplete="username" maxlength="24" placeholder="输入自己的账号"></label><label>密码<input name="password" type="password" autocomplete="current-password" maxlength="72" placeholder="输入密码"></label><button class="primary" type="submit">登录</button></form><form data-auth-form="register" hidden><label>账号<input name="username" autocomplete="username" maxlength="24" placeholder="2～24位，登录时使用"></label><label>显示名称<input name="displayName" maxlength="40" placeholder="例如：Alan"></label><label>密码<input name="password" type="password" autocomplete="new-password" maxlength="72" placeholder="至少8位"></label><label class="v43Check"><input name="migrate" type="checkbox" checked> 把本机当前学习进度带入新账号</label><button class="primary" type="submit">创建并登录</button></form><div class="v43AuthError" aria-live="polite"></div><small>登录状态会安全保留在本设备。换手机或电脑时，用同一个账号密码登录即可同步。</small></section>`;m.classList.add('show');
 const tabs=[...m.querySelectorAll('[data-auth-tab]')],forms=[...m.querySelectorAll('[data-auth-form]')];tabs.forEach(b=>b.onclick=()=>{tabs.forEach(x=>x.classList.toggle('active',x===b));forms.forEach(f=>f.hidden=f.dataset.authForm!==b.dataset.authTab);m.querySelector('.v43AuthError').textContent=''});
 forms.forEach(f=>f.onsubmit=async e=>{e.preventDefault();const btn=f.querySelector('button[type=submit]'),er=m.querySelector('.v43AuthError'),fd=new FormData(f),mode=f.dataset.authForm;er.textContent='';btn.disabled=true;btn.textContent=mode==='register'?'正在创建…':'正在登录…';try{const localBefore=snapshot();const data={username:String(fd.get('username')||''),password:String(fd.get('password')||'')};if(mode==='register')data.displayName=String(fd.get('displayName')||data.username);const x=await call(mode,data,'');storeSession(x);if(mode==='register'&&fd.get('migrate')&&meaningful(localBefore)){applyPayload(localBefore);const y=await call('push',{payload:localBefore,baseRevision:Number(x.revision||0)});localStorage.setItem(REV,String(y.revision||1))}else applyPayload(x.payload||{});sessionStorage.setItem('sec_v43_boot_synced',rawToken().slice(0,12));location.reload()}catch(ex){er.textContent=errText(ex.code)}finally{btn.disabled=false;btn.textContent=mode==='register'?'创建并登录':'登录'}})
}
async function logout(){const t=rawToken();clearSession();try{if(t)await call('logout',{},t)}catch(_){}location.reload()}
function patchAccountCard(){
 const main=document.getElementById('main');if(!main)return;main.querySelectorAll('[data-profile]').forEach(x=>x.closest('.meCard')?.remove()||x.remove());
 const title=[...main.querySelectorAll('.meCard h3')].find(x=>x.textContent.includes('本机学习档案'));if(title)title.closest('.meCard')?.remove();
 if(!main.querySelector('.sheetTitle h1')?.textContent.includes('学习进度'))return;let box=main.querySelector('.v43AccountCard');if(!box){box=document.createElement('div');box.className='meCard v43AccountCard';const cards=main.querySelectorAll('.meCard');cards[0]?.insertAdjacentElement('afterend',box)}
 if(!box)return;const u=user();box.innerHTML=`<h3>学习账号</h3><div class="statLine"><span>当前账号</span><b>${esc(u?.displayName||u?.username||'—')}</b></div><div class="statLine"><span>云端同步</span><b>${esc(lastStatus||localStorage.getItem(STATUS)||'—')}</b></div><div class="v43AccountActions"><button data-v43-sync>立即同步</button><button data-v43-logout>退出当前账号</button></div><small>退出后不会出现可直接切换的账号列表。另一个人必须输入自己的账号和密码登录。</small>`;box.querySelector('[data-v43-sync]').onclick=async()=>{await pull();patchAccountCard()};box.querySelector('[data-v43-logout]').onclick=logout;
}
function boot(){
 const t=rawToken();if(!t){showAuth();return}
 const marker=sessionStorage.getItem('sec_v43_boot_synced');if(marker!==t.slice(0,12)){const m=authShell();m.innerHTML='<section class="v43LoginCard v43Syncing"><h1>正在同步学习进度</h1><p>正在载入这个账号自己的错题、收藏和答题记录…</p></section>';m.classList.add('show');pull({boot:true});return}
 setStatus(localStorage.getItem(STATUS)||'已登录');pull();
 const obs=new MutationObserver(()=>patchAccountCard());obs.observe(document.getElementById('main')||document.body,{childList:true,subtree:true});patchAccountCard();
 window.addEventListener('online',()=>{pull();push()});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')pull()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SEC_CLOUD_SYNC_V43={version:VERSION,cloudSync:true,mode:'username-password+isolated-cloud-state',syncNow:()=>pull(),logout};
})();