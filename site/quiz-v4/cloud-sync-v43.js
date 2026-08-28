(()=>{
'use strict';
const VERSION='4.3.1';
const API='https://qygzovuihtnxfciyowty.supabase.co/functions/v1/exam-sync';
const APIKEY='sb_publishable_mTlFbbYmjOGtsXhGbIb5Hw_rIurluQP';
const TOKEN='sec_v43_cloud_token',USER='sec_v43_cloud_user',REV='sec_v43_cloud_revision',STATUS='sec_v43_cloud_status';
const ACTIVE='sec_v431_active_pin',MIGRATE='sec_v431_pin_migration_done',PIN_PREFIX='sec_v431_pin_';
const SKEY='sec2026state_v1',RKEY='sec_v4_recovery',LASTKEY='sec_v4_last',MKEY='sec_v42_mastery_v1',TKEY='sec_v42_transfer_history';
const TRACKED=new Set([SKEY,RKEY,LASTKEY,MKEY,TKEY]);
const VALID_PINS=new Set(['0917','4294']);
const nativeSet=Storage.prototype.setItem;
let applying=false,pushTimer=null,pushing=false,lastStatus='';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
const rawToken=()=>localStorage.getItem(TOKEN)||'';
const user=()=>read(USER,null);
const revision=()=>Number(localStorage.getItem(REV)||0);
const activePin=()=>{const p=localStorage.getItem(ACTIVE)||'';return VALID_PINS.has(p)?p:''};
const pinKey=(pin,k)=>`${PIN_PREFIX}${pin}_${k}`;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
function blankState(){return {answered:{},wrong:[],fav:[],daily:{},history:[]}}
function defaultRaw(k){if(k===SKEY)return JSON.stringify(blankState());if(k===LASTKEY)return 'null';if(k===TKEY)return '[]';return '{}'}
function snapshot(){return {schema:'sec-cloud-sync-v1',version:VERSION,state:read(SKEY,blankState()),recovery:read(RKEY,{}),last:read(LASTKEY,null),mastery:read(MKEY,{}),transferHistory:read(TKEY,[]),savedAt:Date.now()}}
function meaningful(p){return Object.keys(p?.state?.answered||{}).length>0||(p?.state?.wrong||[]).length>0||(p?.state?.fav||[]).length>0||Object.keys(p?.mastery||{}).length>0}
function core(p={}){return JSON.stringify({state:p.state||blankState(),recovery:p.recovery||{},last:p.last??null,mastery:p.mastery||{},transferHistory:p.transferHistory||[]})}
function setStatus(s){lastStatus=s;nativeSet.call(localStorage,STATUS,s);patchAccountCard()}
function setLocalIdentity(pin){nativeSet.call(localStorage,USER,JSON.stringify({username:`study_${pin}`,displayName:`编号 ${pin}`,localOnly:true}))}
function savePin(pin){if(!VALID_PINS.has(pin))return;for(const k of TRACKED){nativeSet.call(localStorage,pinKey(pin,k),localStorage.getItem(k)??defaultRaw(k))}}
function hasPinData(pin){return [...TRACKED].some(k=>localStorage.getItem(pinKey(pin,k))!==null)}
function loadPin(pin){applying=true;try{for(const k of TRACKED){nativeSet.call(localStorage,k,localStorage.getItem(pinKey(pin,k))??defaultRaw(k))}}finally{applying=false}}
function clearTracked(){applying=true;try{for(const k of TRACKED)nativeSet.call(localStorage,k,defaultRaw(k))}finally{applying=false}}
function applyPayload(p){if(!p||typeof p!=='object')return;applying=true;try{nativeSet.call(localStorage,SKEY,JSON.stringify(p.state||blankState()));nativeSet.call(localStorage,RKEY,JSON.stringify(p.recovery||{}));nativeSet.call(localStorage,LASTKEY,JSON.stringify(p.last??null));nativeSet.call(localStorage,MKEY,JSON.stringify(p.mastery||{}));nativeSet.call(localStorage,TKEY,JSON.stringify(p.transferHistory||[]))}finally{applying=false}}
function uniq(arr){return [...new Set((arr||[]).filter(Boolean))]}
function mergeState(a={},b={}){const history=[...(a.history||[]),...(b.history||[])].filter(x=>x&&x.id).sort((x,y)=>(y.at||0)-(x.at||0));const seen=new Set(),mergedHistory=[];for(const x of history){const k=`${x.id}|${x.at||0}|${x.ok}`;if(seen.has(k))continue;seen.add(k);mergedHistory.push(x);if(mergedHistory.length>=300)break}return {answered:{...(a.answered||{}),...(b.answered||{})},wrong:uniq([...(a.wrong||[]),...(b.wrong||[])]),fav:uniq([...(a.fav||[]),...(b.fav||[])]),daily:{...(a.daily||{}),...(b.daily||{})},history:mergedHistory}}
function mergeMastery(a={},b={}){const out={...a};for(const [k,v] of Object.entries(b||{})){if(!out[k]||(v?.lastAt||0)>=(out[k]?.lastAt||0))out[k]=v}return out}
function mergePayload(remote={},local={}){return {schema:'sec-cloud-sync-v1',version:VERSION,state:mergeState(remote.state,local.state),recovery:{...(remote.recovery||{}),...(local.recovery||{})},last:(local.last?.at||0)>=(remote.last?.at||0)?local.last:remote.last,mastery:mergeMastery(remote.mastery,local.mastery),transferHistory:uniq([...(local.transferHistory||[]),...(remote.transferHistory||[])]).slice(0,120),savedAt:Date.now()}}
async function call(action,data={},token=rawToken(),timeoutMs=7000){
 const h={'content-type':'application/json','apikey':APIKEY};if(token)h.authorization=`Bearer ${token}`;
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{const r=await fetch(API,{method:'POST',headers:h,body:JSON.stringify({action,...data}),cache:'no-store',signal:ctl.signal});let x={};try{x=await r.json()}catch(_){}if(!r.ok){const e=new Error(x.error||`http_${r.status}`);e.code=x.error||'';e.status=r.status;e.data=x;throw e}return x}catch(e){if(e?.name==='AbortError'){const t=new Error('timeout');t.code='timeout';throw t}throw e}finally{clearTimeout(timer)}
}
function storeSession(x){nativeSet.call(localStorage,TOKEN,x.token);nativeSet.call(localStorage,USER,JSON.stringify(x.user));nativeSet.call(localStorage,REV,String(x.revision||0))}
function clearSession(){localStorage.removeItem(TOKEN);localStorage.removeItem(USER);localStorage.removeItem(REV)}
function activatePin(pin){
 const old=activePin();if(old)savePin(old);
 if(hasPinData(pin)){loadPin(pin)}else{const legacy=snapshot();if(!localStorage.getItem(MIGRATE)&&meaningful(legacy)){savePin(pin);nativeSet.call(localStorage,MIGRATE,'1')}else{clearTracked();savePin(pin);if(!localStorage.getItem(MIGRATE))nativeSet.call(localStorage,MIGRATE,'1')}}
 nativeSet.call(localStorage,ACTIVE,pin);clearSession();setLocalIdentity(pin);setStatus('本机已保存')
}
async function push(){
 const pin=activePin();if(!pin||!rawToken()||applying||pushing)return false;pushing=true;setStatus('保存中…');
 try{let p=snapshot(),base=revision();try{const x=await call('push',{payload:p,baseRevision:base});nativeSet.call(localStorage,REV,String(x.revision));savePin(pin);setStatus('已同步');return true}catch(e){if(e.status===409&&e.data){p=mergePayload(e.data.payload||{},p);applyPayload(p);savePin(pin);nativeSet.call(localStorage,REV,String(e.data.revision||0));const x=await call('push',{payload:p,baseRevision:Number(e.data.revision||0)});nativeSet.call(localStorage,REV,String(x.revision));savePin(pin);setStatus('已合并同步');return true}throw e}}
 catch(e){if(e.status===401){clearSession();setLocalIdentity(pin)}setStatus('本机已保存');return false}finally{pushing=false}
}
async function pull(){
 const pin=activePin();if(!pin)return false;if(!rawToken())return connectCloud(pin);setStatus('同步中…');
 try{const x=await call('pull');if(activePin()!==pin)return false;nativeSet.call(localStorage,USER,JSON.stringify(x.user));nativeSet.call(localStorage,REV,String(x.revision||0));const local=snapshot(),remote=x.payload||{},merged=mergePayload(remote,local),needsPush=core(remote)!==core(merged);applyPayload(merged);savePin(pin);setStatus('已同步');if(needsPush)schedulePush();return true}
 catch(e){if(e.status===401){clearSession();setLocalIdentity(pin)}setStatus('本机已保存');return false}
}
async function connectCloud(pin=activePin()){
 if(!pin||activePin()!==pin)return false;
 try{
  const expected=`study_${pin}`,u=user();let x;
  if(rawToken()&&u?.username===expected){x=await call('pull')}else{clearSession();setLocalIdentity(pin);x=await call('pin_login',{pin},'',7000)}
  if(activePin()!==pin)return false;storeSession(x);const local=snapshot(),remote=x.payload||{},merged=mergePayload(remote,local),needsPush=core(remote)!==core(merged);applyPayload(merged);savePin(pin);setStatus('已同步');if(needsPush)await push();return true
 }catch(e){if(activePin()===pin){clearSession();setLocalIdentity(pin);setStatus('本机已保存')}return false}
}
function schedulePush(){const pin=activePin();if(!pin||!rawToken()||applying)return;clearTimeout(pushTimer);pushTimer=setTimeout(push,650)}
Storage.prototype.setItem=function(k,v){const r=nativeSet.call(this,k,v);if(this===localStorage&&TRACKED.has(String(k))&&!applying){const pin=activePin();if(pin)nativeSet.call(localStorage,pinKey(pin,String(k)),String(v));schedulePush()}return r};
function authShell(){let m=document.getElementById('v43Auth');if(!m){m=document.createElement('div');m.id='v43Auth';m.className='v43Auth';document.body.appendChild(m)}return m}
function showAuth(message=''){
 const m=authShell();m.innerHTML=`<section class="v43LoginCard"><span class="eyebrow">SECURITIES STUDY</span><h1>输入学习编号</h1><p>输入自己的四位学习编号即可进入。</p>${message?`<div class="v43Notice">${esc(message)}</div>`:''}<form data-pin-form><label>学习编号<input name="pin" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]{4}" placeholder="请输入 4 位编号"></label><button class="primary" type="submit">进入学习</button></form><div class="v43AuthError" aria-live="polite"></div></section>`;m.classList.add('show');
 const f=m.querySelector('[data-pin-form]'),input=f.querySelector('[name="pin"]');input.focus();input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(0,4)});
 f.onsubmit=e=>{e.preventDefault();const er=m.querySelector('.v43AuthError'),pin=String(new FormData(f).get('pin')||'').replace(/\D/g,'').slice(0,4);er.textContent='';if(pin.length!==4){er.textContent='请输入 4 位学习编号';return}if(!VALID_PINS.has(pin)){er.textContent='编号不正确';return}activatePin(pin);m.classList.remove('show');location.reload()}
}
function logout(){const pin=activePin(),t=rawToken();if(pin)savePin(pin);localStorage.removeItem(ACTIVE);clearSession();clearTracked();setStatus('未登录');if(t)call('logout',{},t,2500).catch(()=>{});location.reload()}
function patchAccountCard(){
 const main=document.getElementById('main');if(!main)return;main.querySelectorAll('[data-profile]').forEach(x=>{const card=x.closest('.meCard');card?card.remove():x.remove()});const title=[...main.querySelectorAll('.meCard h3')].find(x=>x.textContent.includes('本机学习档案'));if(title)title.closest('.meCard')?.remove();if(!main.querySelector('.sheetTitle h1')?.textContent.includes('学习进度'))return;
 let box=main.querySelector('.v43AccountCard');if(!box){box=document.createElement('div');box.className='meCard v43AccountCard';const cards=main.querySelectorAll('.meCard');cards[0]?.insertAdjacentElement('afterend',box)}if(!box)return;
 const pin=activePin(),status=lastStatus||localStorage.getItem(STATUS)||'本机已保存',sig=`${pin}|${status}`;if(box.dataset.sig===sig)return;box.dataset.sig=sig;box.innerHTML=`<h3>学习账号</h3><div class="statLine"><span>当前编号</span><b>${esc(pin||'—')}</b></div><div class="statLine"><span>学习记录</span><b>${esc(status)}</b></div><div class="v43AccountActions"><button data-v43-sync>立即同步</button><button data-v43-logout>退出当前编号</button></div><small>不同编号的学习记录彼此独立。</small>`;box.querySelector('[data-v43-sync]').onclick=()=>connectCloud(pin);box.querySelector('[data-v43-logout]').onclick=logout
}
function boot(){
 const pin=activePin();if(!pin){showAuth();return}
 const u=user();if(rawToken()&&u?.username!==`study_${pin}`)clearSession();if(!user())setLocalIdentity(pin);const s=localStorage.getItem(STATUS);setStatus(['已同步','同步中…','保存中…','已合并同步','本机已保存'].includes(s)?s:'本机已保存');
 const obs=new MutationObserver(()=>queueMicrotask(patchAccountCard));obs.observe(document.getElementById('main')||document.body,{childList:true,subtree:true});patchAccountCard();connectCloud(pin);
 window.addEventListener('online',()=>connectCloud(activePin()));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')connectCloud(activePin())})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SEC_CLOUD_SYNC_V43={version:VERSION,cloudSync:true,mode:'two-pin-isolated-cloud-state',syncNow:()=>connectCloud(activePin()),logout};
})();