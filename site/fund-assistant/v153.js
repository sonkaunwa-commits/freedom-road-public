(()=>{
'use strict';
const RELEASE='FUND_ASSISTANT_UI_CANDIDATE_20260825_1715';
const DATA_URL='data/intraday/latest.json';
const HOLIDAYS=new Set(['2026-01-01','2026-01-02','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-04-06','2026-05-01','2026-05-04','2026-05-05','2026-06-19','2026-09-25','2026-10-01','2026-10-02','2026-10-05','2026-10-06','2026-10-07']);
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let serverDoc=null,serverState='idle',serverPromise=null,detailSeq=0;

function bj(){const a=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),o={};a.forEach(x=>o[x.type]=x.value);return{y:+o.year,m:+o.month,d:+o.day,w:o.weekday,h:+o.hour,min:+o.minute,key:`${o.year}-${o.month}-${o.day}`}}
function tradeDay(p=bj()){return p.w!=='Sat'&&p.w!=='Sun'&&!HOLIDAYS.has(p.key)}
function phase(){const p=bj(),m=p.h*60+p.min;if(!tradeDay(p))return'closed';if(m<570)return'pre';if(m<=690)return'morning';if(m<780)return'lunch';if(m<=900)return'afternoon';return'after'}
function code(){return(q('#detailSubtitle')?.textContent||'').trim()}
function dateCN(key=bj().key){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key||''));return m?`${m[1]}年${m[2]}月${m[3]}日`:String(key||'')}
function fmtNav(v){const n=Number(v);return Number.isFinite(n)?n.toFixed(4):'—'}
function freshCN(v){return v==='fresh'?'数据正常':v==='partial'?'部分基金数据':v==='unavailable'?'数据不可用':'状态待确认'}
function sourceCN(v){return v==='eastmoney_fundgz_public'?'公开基金盘中估算源':(v?'公开数据源':'来源待确认')}
function currentLocalSamples(c){const p=bj();try{return JSON.parse(localStorage.getItem(`fund_intraday_v14_${p.key}_${c}`)||'[]')}catch{return[]}}

async function loadServer(force=false){
 if(serverPromise&&!force)return serverPromise;
 serverState='loading';
 serverPromise=fetch(`${DATA_URL}?t=${Date.now()}`,{cache:'no-store'})
   .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()})
   .then(x=>{serverDoc=x;serverState='ready';return x})
   .catch(()=>{serverDoc=null;serverState='unavailable';return null})
   .finally(()=>{serverPromise=null});
 return serverPromise;
}
function rowFor(c){return serverDoc?.funds?.find(x=>String(x.code)===String(c))||null}
function todayServerRow(c){const p=bj();if(serverDoc?.trade_date!==p.key)return null;const row=rowFor(c);if(!row)return null;const pts=(row.points||[]).filter(x=>x?.sample_time&&Number.isFinite(Number(x.estimate_nav)));return pts.length?{...row,points:pts}:null}
function oldServerDate(){const d=serverDoc?.trade_date,p=bj();return d&&d!==p.key?d:null}

function enhanceLunchState(){
 if(phase()!=='lunch')return;
 const badge=q('#marketBadge');if(badge){badge.textContent='午间休市';badge.className='badge after'}
 if(q('#todayHeadline'))q('#todayHeadline').textContent='午间休市，13:00开盘后再看';
 if(q('#todaySummary'))q('#todaySummary').textContent='上午交易已经结束。盘中估算通常停在上午最后一个有效值，13:00以后再继续更新；午休期间不要把静止的旧值理解成行情仍在变化。';
 if(q('#liveFreshness'))q('#liveFreshness').textContent='午间暂停 · 13:00后继续';
 if(q('#nextRefresh'))q('#nextRefresh').textContent='13:00开盘后';
 const body=q('#detailBody');if(!body)return;
 const first=body.querySelector('.detail-card.action');
 if(first&&!first.querySelector('.lunch-note-v153')){
   const n=document.createElement('div');n.className='lunch-note-v153';n.textContent='午间休市：上午盘已结束，13:00开盘后再复核盘中位置。';first.appendChild(n)
 }
}

function findCard(){
 let card=qa('#detailBody .detail-card').find(x=>x.querySelector('.intraday-v152-head'));
 if(card)return card;
 return qa('#detailBody .detail-card').find(x=>/盘中估算走势|实时参考走势/.test(x.textContent||''))||null;
}
function chart(points){
 if(points.length<2){const p=points[0];return `<div class="server-one-point"><b>服务器已记录 1 个点</b><span>${esc(p.sample_time)} · 估算净值 ${fmtNav(p.estimate_nav)}</span><small>继续采集后才会形成曲线。</small></div>`}
 const vals=points.map(x=>Number(x.estimate_nav)),mn=Math.min(...vals),mx=Math.max(...vals),w=390,h=150,l=14,r=10,t=12,b=23;
 const X=i=>l+i*(w-l-r)/(points.length-1),Y=v=>t+(mx-v)/(mx-mn||1)*(h-t-b),pts=points.map((x,i)=>`${X(i)},${Y(Number(x.estimate_nav))}`).join(' ');
 return `<div class="server-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="服务器盘中估算曲线"><line x1="${l}" y1="${Y(vals[0])}" x2="${w-r}" y2="${Y(vals[0])}" stroke="#dddcd7" stroke-dasharray="3 4"/><polyline fill="none" stroke="#a83a32" stroke-width="2.5" points="${pts}"/><circle cx="${X(points.length-1)}" cy="${Y(vals[vals.length-1])}" r="4" fill="#a83a32"/><text x="${l}" y="${h-5}" font-size="10" fill="#77756f">${esc(points[0].sample_time)}</text><text x="${w-r}" y="${h-5}" text-anchor="end" font-size="10" fill="#77756f">${esc(points[points.length-1].sample_time)}</text></svg></div>`
}
function statusText(row){
 const ph=phase(),last=row?.points?.[row.points.length-1]?.sample_time;
 if(ph==='closed')return'今日休市';
 if(ph==='pre')return'9:30后开始';
 if(ph==='lunch')return last?`午间休市 · 最近 ${last}`:'午间休市';
 if(ph==='morning'||ph==='afternoon')return last?`服务器已更新 ${last}`:'等待服务器采样';
 if(ph==='after')return last?`今日已结束 · 最后 ${last}`:'今日盘中已结束';
 return'等待数据';
}
function statusClass(){const ph=phase();return ph==='morning'||ph==='afternoon'?'live':ph==='pre'?'wait':'closed'}
function coverageText(row){
 const c=row?.coverage||{},n=(row?.points||[]).length;
 if(c.reasonably_full_day)return`较完整服务器盘中记录 · ${n} 个点`;
 if(n)return`部分服务器盘中采样 · ${n} 个点`;
 return'暂无服务器采样';
}
function hideBrowserChart(card,hide){
 [...card.children].forEach(el=>{
   if(el.classList.contains('intraday-v152-head')||el.classList.contains('server-intraday-v153')||el.classList.contains('intraday-explain'))return;
   if(el.dataset.serverHiddenOriginal===undefined)el.dataset.serverHiddenOriginal=el.style.display||'';
   el.style.display=hide?'none':el.dataset.serverHiddenOriginal;
 });
 const note=card.querySelector('.intraday-explain');if(note)note.style.display=hide?'none':'';
}
function renderServer(card,row){
 card.querySelector('.server-fallback-v153')?.remove();
 hideBrowserChart(card,true);
 let box=card.querySelector('.server-intraday-v153');if(!box){box=document.createElement('div');box.className='server-intraday-v153';card.appendChild(box)}
 const pts=row.points||[],first=pts[0],last=pts[pts.length-1],fresh=serverDoc?.freshness||'unknown';
 box.innerHTML=`<div class="server-head"><div><b>今日实时参考走势（${dateCN()}）</b><span>服务器盘中采样 · ${esc(coverageText(row))}</span></div><span class="intraday-status ${statusClass()}">${esc(statusText(row))}</span></div>${chart(pts)}<div class="server-meta"><span>区间 ${esc(first?.sample_time||'—')}–${esc(last?.sample_time||'—')}</span><span>来源 ${esc(sourceCN(row.source||serverDoc?.source))}</span><span>状态 ${esc(freshCN(fresh))}</span></div><div class="server-note"><b>盘中估算，不是最终净值。</b>服务器按计划持续采样，但公开数据源和定时任务可能延迟或缺点，所以页面会明确标成“部分”或“较完整”，不会把缺点曲线说成完整全天行情。</div>`;
 const old=card.querySelector('.intraday-v152-head');if(old)old.style.display='none';
}
function renderFallback(card,c){
 hideBrowserChart(card,false);
 const old=card.querySelector('.intraday-v152-head');if(old)old.style.display='';
 card.querySelector('.server-intraday-v153')?.remove();
 let n=card.querySelector('.server-fallback-v153');if(!n){n=document.createElement('div');n.className='server-fallback-v153';card.appendChild(n)}
 const prior=oldServerDate(),local=currentLocalSamples(c),ph=phase();
 let html='';
 if(prior)html=`服务器最近一次盘中记录是 <b>${esc(prior)}</b>，不是今天，所以不会拿它冒充今日实时数据。${local.length?` 当前图仍使用本机今天已记录的 ${local.length} 个采样点。`:''}`;
 else if(serverState==='unavailable')html='服务器盘中历史暂时不可用；当前继续使用本页面打开后产生的本机采样，不影响正式净值和历史趋势查看。';
 else if(ph==='morning'||ph==='afternoon'||ph==='lunch')html='今天服务器暂未形成这只基金的有效盘中记录；当前继续使用本页面采样，等服务器真实数据到达后再切换。';
 else html='当前没有需要展示的服务器当日盘中历史。';
 if(n.innerHTML!==html)n.innerHTML=html;
}

async function enhanceServerCurve(force=false){
 const c=code(),card=findCard();if(!c||!card)return;
 const seq=++detailSeq;if(force||serverState==='idle')await loadServer(force);if(seq!==detailSeq||c!==code())return;
 const row=todayServerRow(c);if(row)renderServer(card,row);else renderFallback(card,c);
}
function releaseMarker(){document.body.dataset.release=RELEASE;let s=q('#v153Candidate');if(!s){s=document.createElement('span');s.id='v153Candidate';s.className='candidate-marker';s.textContent='15.3 候选 · 服务器盘中曲线待实盘验收';q('.app-head>div')?.appendChild(s)}}
function apply(){releaseMarker();enhanceLunchState();enhanceServerCurve(false)}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}
const obs=new MutationObserver(schedule);
document.addEventListener('DOMContentLoaded',()=>{apply();const b=q('#detailBody');if(b)obs.observe(b,{childList:true,subtree:false});q('#detailRefresh')?.addEventListener('click',()=>setTimeout(()=>enhanceServerCurve(true),900))});
setTimeout(apply,900);setInterval(()=>{enhanceLunchState();enhanceServerCurve(true)},10*60*1000);
})();
