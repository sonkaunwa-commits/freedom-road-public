(()=>{
'use strict';
const RELEASE='FUND_ASSISTANT_UI_20260825_1535';
const HOLD_KEY='mom_funds_v7';
const REPORT_KEY='fund_report_v14';
const HOLIDAYS=new Set(['2026-01-01','2026-01-02','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-04-06','2026-05-01','2026-05-04','2026-05-05','2026-06-19','2026-09-25','2026-10-01','2026-10-02','2026-10-05','2026-10-06','2026-10-07']);
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
function bj(){const a=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()),o={};a.forEach(x=>o[x.type]=x.value);return{y:+o.year,m:+o.month,d:+o.day,w:o.weekday,h:+o.hour,min:+o.minute,key:`${o.year}-${o.month}-${o.day}`}}
function isTradeDay(p=bj()){return p.w!=='Sat'&&p.w!=='Sun'&&!HOLIDAYS.has(p.key)}
function phase(){const p=bj(),m=p.h*60+p.min;if(!isTradeDay(p))return'closed';if(m<570)return'pre';if(m<900)return'live';return'after'}
function holdings(){try{return JSON.parse(localStorage.getItem(HOLD_KEY)||'[]')}catch{return[]}}
function reports(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'null')}catch{return null}}
function currentCode(){return (q('#detailSubtitle')?.textContent||'').trim()}
function intraSamples(code){const p=bj();try{return JSON.parse(localStorage.getItem(`fund_intraday_v14_${p.key}_${code}`)||'[]')}catch{return[]}}
function dateCN(){const p=bj();return `${p.y}年${String(p.m).padStart(2,'0')}月${String(p.d).padStart(2,'0')}日`}

function enhanceIntraday(){
 const body=q('#detailBody');if(!body)return;
 let target=null,oldHeadline=null,empty=null;
 qa('#detailBody .detail-card').forEach(card=>{
   if(target)return;
   const h=card.querySelector('.chart-headline b');
   const e=card.querySelector('.intraday-empty');
   if(h&&/盘中估算走势/.test(h.textContent||'')){target=card;oldHeadline=card.querySelector('.chart-headline')}
   else if(e&&/盘中估算|盘中曲线/.test(e.textContent||'')){target=card;empty=e}
 });
 if(!target)return;
 const p=bj(),ph=phase(),code=currentCode(),samples=code?intraSamples(code):[],last=samples.length?samples[samples.length-1]:null;
 let label='',cls='wait';
 if(ph==='closed'){label='今日休市';cls='closed'}
 else if(ph==='pre'){label='9:30后开始';cls='wait'}
 else if(ph==='live'&&last){label=`已更新 ${last.time}`;cls='live'}
 else if(ph==='live'){label='等待盘中估算';cls='wait'}
 else if(ph==='after'&&last){label=`今日已结束 · 最后 ${last.time}`;cls='closed'}
 else {label='今日盘中已结束';cls='closed'}
 let head=target.querySelector('.intraday-v152-head');
 if(!head){head=document.createElement('div');head.className='intraday-v152-head';target.insertBefore(head,target.firstChild)}
 head.innerHTML=`<div class="intraday-v152-title"><b>今日实时参考走势（${dateCN()}）</b><span>盘中估算，仅用于判断当天位置，不是最终净值</span></div><span class="intraday-status ${cls}">${esc(label)}</span>`;
 if(oldHeadline)oldHeadline.style.display='none';
 if(!empty)empty=target.querySelector('.intraday-empty');
 if(empty){
   if(ph==='closed') empty.textContent='今天休市，没有当天盘中估算曲线。可继续查看最近正式净值和历史趋势。';
   else if(ph==='pre') empty.textContent='今天还没进入盘中估算时段。9:30以后系统会开始检查当日估算。';
   else if(ph==='live') empty.textContent='当前还没有积累到足够的当日估算点，暂时画不出曲线。系统会继续检查；正式净值和历史趋势仍可正常查看。';
   else empty.textContent='今天的盘中估算时段已经结束，但本机没有保存到足够的采样点，所以暂时画不出完整曲线。晚间正式净值仍会正常更新。';
 }
 let note=target.querySelector('.intraday-explain');
 if(!note){note=document.createElement('div');note.className='intraday-explain';target.appendChild(note)}
 note.innerHTML=`<b>数据怎么更新：</b>交易日9:30–15:00提供盘中估算参考；当前版本在页面打开和刷新时持续采样。${samples.length?`今天已保存 ${samples.length} 个采样点。`:'今天暂未保存到有效采样点。'}完整全天曲线会在服务器盘中采集层上线后自动补齐。`;
}

function enhanceDecisionCards(){
 qa('#detailBody .detail-card').forEach(card=>{
   const h=card.querySelector('h3')?.textContent||'';
   if(h.includes('什么时候可以买')){card.classList.add('v152-buy');if(!card.querySelector('.summary-label')){const x=document.createElement('div');x.className='summary-label';x.textContent='买入动作';card.insertBefore(x,card.firstChild)}}
   if(h.includes('什么时候考虑卖')){card.classList.add('v152-sell');if(!card.querySelector('.summary-label')){const x=document.createElement('div');x.className='summary-label';x.textContent='卖出 / 利润保护';card.insertBefore(x,card.firstChild)}}
   if(h.includes('未来走势怎么预估')){card.classList.add('v152-outlook');if(!card.querySelector('.summary-label')){const x=document.createElement('div');x.className='summary-label';x.textContent='未来1～4周情景';card.insertBefore(x,card.firstChild)}}
   if(h.includes('这只基金整体怎么看'))card.classList.add('v152-overview');
 });
 const action=qa('#detailBody .detail-card').find(c=>c.classList.contains('action'));
 if(action)action.classList.add('v152-action');
}

function enhanceHoldingCompleteness(){
 const code=currentCode();if(!code)return;const h=holdings().find(x=>String(x.code)===String(code));if(!h)return;
 const first=qa('#detailBody .detail-card')[0];if(!first)return;
 let box=first.querySelector('.data-completeness');
 const missing=[];if(!h.amount)missing.push('持仓金额');if(!h.cost&&h.pnl==null)missing.push('成本或当前盈亏');if(!h.date)missing.push('买入日期');
 if(!box){box=document.createElement('div');box.className='data-completeness';first.appendChild(box)}
 if(missing.length){box.className='data-completeness';box.innerHTML=`这只基金还缺：<b>${esc(missing.join('、'))}</b>。补充后，组合占比、盈利保护和买卖判断会更准确。`}
 else{box.className='data-completeness ok';box.textContent='持仓信息比较完整，可以进行成本、盈亏和组合占比分析。'}
}

function enhancePortfolioFreshness(){
 const card=q('#portfolioReportCard .portfolio-report');if(!card)return;let row=card.querySelector('.report-freshness');if(!row){row=document.createElement('div');row.className='report-freshness';card.appendChild(row)}
 const rp=reports(),p=bj(),same=rp?.date===p.key,gen=rp?.generatedAt?new Date(rp.generatedAt):null;let age=null;if(gen&&!Number.isNaN(gen.getTime()))age=Math.round((Date.now()-gen.getTime())/60000);
 const parts=[same?'今日报告':'最近一次报告'];if(age!==null)parts.push(age<60?`${age}分钟前生成`:`约${Math.round(age/60)}小时前生成`);parts.push(isTradeDay(p)?'交易日':'休市日');
 row.innerHTML=parts.map(x=>`<span>${esc(x)}</span>`).join('');
}

function clarifySchedule(){
 const s=q('#dailyReportSchedule');if(!s||s.dataset.v152)return;s.dataset.v152='1';const p=document.createElement('div');p.className='intraday-explain';p.innerHTML='<b>日报分两种：</b>交易时间看到的是“盘中快报”，正式净值披露后才是“正式持仓日报”。持仓只在本机，所以网页完全关闭时无法在服务器替你生成私人日报；下次打开会自动补更新。';s.appendChild(p)
}

function progressButtons(){
 const detail=q('#detailRefresh');if(detail&&!detail.dataset.v152){detail.dataset.v152='1';detail.addEventListener('click',()=>{const b=detail.querySelector('.refresh-copy b'),s=detail.querySelector('.refresh-copy small');if(b)b.textContent='正在更新…';if(s)s.textContent='读取最新净值 / 估算';setTimeout(()=>{if(b)b.textContent='更新数据';if(s)s.textContent='净值 / 盘中估算'},1800)})}
 const rh=q('#refreshHoldings');if(rh&&!rh.dataset.v152){rh.dataset.v152='1';rh.addEventListener('click',()=>{const old='手动更新持仓日报';setTimeout(()=>{if(!/正在/.test(rh.textContent||''))rh.textContent=old},2200)})}
}

function fixOpportunityButtons(){qa('.opportunity-link').forEach(b=>{b.innerHTML='<span>进入</span><span>机会池</span>'})}
function updateReleaseMarker(){document.body.dataset.release=RELEASE;const tag=q('.submark');if(tag&&!q('#v152Release')){const s=document.createElement('span');s.id='v152Release';s.style.cssText='display:block;margin-top:3px;font-size:11px;color:#999791';s.textContent='稳定版 15.2 · 08/25';tag.parentElement.appendChild(s)}}

function apply(){updateReleaseMarker();enhanceIntraday();enhanceDecisionCards();enhanceHoldingCompleteness();enhancePortfolioFreshness();clarifySchedule();progressButtons();fixOpportunityButtons()}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}
const obs=new MutationObserver(schedule);
document.addEventListener('DOMContentLoaded',()=>{apply();['#detailBody','#holdingList','#portfolioReportCard','#candidateList','#todayHoldings'].forEach(sel=>{const el=q(sel);if(el)obs.observe(el,{childList:true,subtree:true})})});
setTimeout(apply,700);setInterval(()=>{enhanceIntraday();enhancePortfolioFreshness()},60000);
})();
