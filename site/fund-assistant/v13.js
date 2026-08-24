(()=>{
'use strict';
const RELEASE='FUND_ASSISTANT_UI_20260824_1820';
const HOLD_KEY='mom_funds_v7';
const REPORT_KEY='mom_fund_report_v13';
const HOLIDAYS=new Set(['2026-01-01','2026-01-02','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-04-06','2026-05-01','2026-05-04','2026-05-05','2026-06-19','2026-09-25','2026-10-01','2026-10-02','2026-10-05','2026-10-06','2026-10-07']);
const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const safe=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};
const pct=v=>v===null||!Number.isFinite(Number(v))?'—':`${Number(v)>0?'+':''}${Number(v).toFixed(1)}%`;
const nav=v=>v===null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(4);
let opportunityData=null,dailyCatalog=null,currentDetail=null,reportBusy=false,autoTimer=null;

function bjParts(d=new Date()){
  const a=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d),o={};
  a.forEach(x=>o[x.type]=x.value);
  return {y:+o.year,m:+o.month,d:+o.day,w:o.weekday,h:+o.hour,min:+o.minute,key:`${o.year}-${o.month}-${o.day}`};
}
function noon(p){return new Date(Date.UTC(p.y,p.m-1,p.d,4));}
function isTradingDay(d=new Date()){const p=bjParts(d);return p.w!=='Sat'&&p.w!=='Sun'&&!HOLIDAYS.has(p.key)}
function stepTrading(d,dir){let x=new Date(d);for(let i=0;i<35;i++){x=new Date(x.getTime()+dir*86400000);if(isTradingDay(x))return x}return x}
function fmtDate(d,full=false){const p=bjParts(d);return full?`${p.y}年${p.m}月${p.d}日`:`${p.m}月${p.d}日`}
function marketContext(){
  const p=bjParts(),today=noon(p),trade=isTradingDay(today),minutes=p.h*60+p.min,next=trade?stepTrading(today,1):stepTrading(today,1),prev=stepTrading(today,-1);
  let phase='closed',title='',desc='',badge='',cls='closed';
  if(!trade){phase='closed';title='今天休市，不需要做买卖决定';desc=`今天只做复盘和准备。下一交易日是 ${fmtDate(next,true)}，开市后再看盘中估算。`;badge=`${fmtDate(today)} · ${p.w==='Sat'?'周六':p.w==='Sun'?'周日':'休市日'}`;}
  else if(minutes<570){phase='pre';cls='after';title='还没开盘，先看计划，不急着操作';desc='正式净值还是上一个交易日的数据。等9:30以后再看盘中估算，下午再决定。';badge='开盘前';}
  else if(minutes<850){phase='session';cls='open';title='盘中观察：先看估算，不把它当最终净值';desc='盘中估算可以帮助判断位置，但主动基金可能有偏差。真正需要操作时，建议下午2点以后再重点确认。';badge='交易中 · 观察阶段';}
  else if(minutes<900){phase='decision';cls='open';title='现在是重点决策窗口';desc='接近15:00。先看最新盘中估算、当前位置和你的持仓，再决定买、等、卖一点还是不动。';badge='14:10–15:00 · 重点复核';}
  else {phase='after';cls='after';title='今天已经收市，先等正式净值确认';desc='盘中估算已经结束。今晚正式净值出来后再做正式复盘；现在不要把估算值当成最终成交净值。';badge='已收市 · 等正式净值';}
  return {p,today,trade,minutes,phase,title,desc,badge,cls,next,prev,nextShort:fmtDate(next),nextFull:fmtDate(next,true),todayShort:fmtDate(today),todayFull:fmtDate(today,true)};
}
function isLiveEstimate(f,c=marketContext()){
  if(!f?.est?.gsz||!f.est?.gztime)return false;
  const date=String(f.est.gztime).slice(0,10);return date===c.p.key&&(c.phase==='session'||c.phase==='decision');
}
function estimateLabel(f,c){return isLiveEstimate(f,c)?`盘中估算 ${nav(Number(f.est.gsz))}（${String(f.est.gztime).slice(11,16)}）`:(c.phase==='after'&&f?.est?.gsz?`今日盘中估算已结束 ${nav(Number(f.est.gsz))}`:'当前无可靠盘中估算')}
function formalDate(f){const x=f?.a?.[f.a.length-1];if(!x)return '—';const d=new Date(x.t);return Number.isNaN(d.getTime())?'—':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

async function loadJson(url){const r=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`数据读取失败 ${r.status}`);return r.json()}
async function loadBase(){
  try{opportunityData=await loadJson('data/opportunity.json');}catch(e){opportunityData={funds:[],generated_at:null,warnings:[String(e.message||e)]};}
  try{const x=await loadJson('data/fund_daily.json');dailyCatalog=x.funds||[];}catch{dailyCatalog=[];}
  renderMarket();renderHomeOpportunities();renderCandidates();renderRecommendHistory();
}

function getHoldings(){try{return JSON.parse(localStorage.getItem(HOLD_KEY)||'[]')}catch{return[]}}
function saveHoldings(a){localStorage.setItem(HOLD_KEY,JSON.stringify(a));renderHoldingList();renderHomePortfolio();}
function findOpp(code){return opportunityData?.funds?.find(x=>String(x.code)===String(code))||null}
function toneFromAction(text){if(/退出|停止|不要补|趋势弱|减仓/.test(text||''))return 'stop';if(/可以买|买一点|第一买入|第二买入|小补/.test(text||''))return 'buy';return 'wait'}
function contextDecision(f,s,h={}){
  const c=marketContext(),p=personal(s,h.cost??null,h.pnl??null,h.date??null);let action=p.action,why=p.why,how=p.how,tone=p.tone;
  if(c.phase==='closed'){action='今天休市，不操作';tone='wait';why='今天不是交易日，不把上一个交易日的净值当成今天实时行情。';how=`下一交易日 ${c.nextShort} 开市后先更新盘中估算；下午再决定要不要动。`;}
  else if(c.phase==='pre'){action='开盘前先不操作';tone='wait';why='现在只有上一个交易日正式净值，还没有今天盘中信息。';how='9:30以后再更新一次；真正准备买卖时，下午再重点确认。';}
  else if(c.phase==='after'){action='今天已收市，先等正式净值';tone='wait';why='今天已经不能按今天净值临时做决定，盘中估算也不是最终净值。';how='今晚正式净值更新后再复盘；下一交易日再根据新位置决定。';}
  else if(c.phase==='session'&&tone==='buy'){action='接近买点，下午再确认';tone='wait';why='当前盘中位置已经值得关注，但现在还不是最后决策窗口。';how='先不一次买满。下午2点以后重新更新，如果仍在买入区且趋势没坏，再考虑第一笔。';}
  return {...p,action,why,how,tone,c};
}

function renderMarket(){
  const c=marketContext(),card=q('#marketCard');card.classList.remove('closed','after');if(c.cls!=='open')card.classList.add(c.cls);
  q('#marketBadge').className=`status-pill ${c.cls}`;q('#marketBadge').textContent=c.badge;q('#marketTitle').textContent=c.title;q('#marketDesc').textContent=c.desc;
  const gen=opportunityData?.generated_at;q('#systemTime').textContent=gen?String(gen).replace('T',' ').slice(0,16):'暂未读到';
  q('#estimateState').textContent=(c.phase==='session'||c.phase==='decision')?'可用：盘中估算层':c.phase==='after'?'盘中结束，等正式净值':c.phase==='closed'?'休市，无需盘中估算':'开盘后再更新';
}

function renderHomePortfolio(){
  const box=q('#homePortfolio'),a=getHoldings();
  if(!a.length){box.innerHTML=`<div class="empty-state"><div class="big-icon">📌</div><h3>还没有录入妈妈的基金</h3><p>最少只填6位基金代码就能开始。填成本和买入时间以后，卖出建议会更准确。</p><button class="primary-btn" data-go="holdings" data-open-add>先录入我的基金</button></div>`;wireGo();return;}
  const cache=readReportCache();
  if(!cache?.items?.length){box.innerHTML=`<div class="empty-state"><div class="big-icon">📋</div><h3>已经保存 ${a.length} 只基金</h3><p>点一下生成今天的小报告：哪些继续拿、哪些别再补、哪些要保护利润。</p><button class="primary-btn" id="homeGenerateReport">生成今天持仓报告</button></div>`;q('#homeGenerateReport').onclick=()=>generateHoldingReports(true);return;}
  const top=cache.items.slice(0,3);box.innerHTML=top.map(r=>homeReportHtml(r)).join('')+(cache.items.length>3?`<button class="secondary-btn full" data-go="holdings">查看全部 ${cache.items.length} 只持仓</button>`:'');wireGo();
}
function homeReportHtml(r){return `<div class="report-card ${r.tone}"><div class="fund-top"><div><div class="fund-name">${safe(r.name||('基金 '+r.code))}</div><div class="fund-code">${safe(r.code)} · 报告 ${safe(r.updated||'')}</div></div><span class="action-badge ${r.tone}">${safe(r.action)}</span></div><div class="report-highlight"><b>${safe(r.action)}</b><p>${safe(r.why)}</p></div><button class="detail-btn full" data-detail="${safe(r.code)}">看详细报告</button></div>`}

function renderHomeOpportunities(){
  const box=q('#homeOpportunities'),funds=(opportunityData?.funds||[]).slice().sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,2),c=marketContext();
  if(!funds.length){box.innerHTML='<div class="loading-card">推荐数据暂时没有读到，稍后再看。</div>';return;}
  box.innerHTML=funds.map((x,i)=>{const p=x.today_plan||{},act=(c.phase==='closed'?'休市，下个交易日再看':c.phase==='after'?'已收市，等正式净值':p.action||'继续观察');return `<div class="opportunity-card tone-${i+1}"><div class="fund-top"><div><div class="fund-name">${safe(x.name)}</div><div class="fund-code">${safe(x.code)} · ${safe(x.category||'')}</div></div><span class="action-badge wait">${safe(act)}</span></div><div class="score-line"><div class="score-num">${Number(x.score||0).toFixed(0)}<small>/100</small></div><div class="scorebar"><i style="width:${Math.min(100,Math.max(0,Number(x.score||0)))}%"></i></div></div><p class="muted">近6月 ${pct(x.returns?.['6m'])} · 近1年 ${pct(x.returns?.['1y'])}</p><button class="detail-btn full" data-detail="${safe(x.code)}">为什么选它？现在能不能买？</button></div>`}).join('');wireDetails();
}

function renderHoldingList(){
  const box=q('#holdingList'),a=getHoldings(),cache=readReportCache();
  if(!a.length){box.innerHTML='<div class="empty-state"><div class="big-icon">📝</div><h3>这里还没有基金</h3><p>点上面的“录入一只我已经买的基金”。最少只填代码。</p></div>';q('#portfolioSummary').classList.add('hidden');return;}
  const map=new Map((cache?.items||[]).map(x=>[x.code,x]));
  box.innerHTML=a.map((h,i)=>{const r=map.get(h.code);return `<div class="report-card ${r?.tone||'wait'}" data-holding="${safe(h.code)}"><div class="fund-top"><div><div class="fund-name">${safe(r?.name||h.name||('基金 '+h.code))}</div><div class="fund-code">${safe(h.code)}${h.amount?` · 约${Number(h.amount).toLocaleString()}元`:''}${h.cost?` · 成本 ${nav(h.cost)}`:''}</div></div><span class="action-badge ${r?.tone||'wait'}">${safe(r?.action||'等待生成报告')}</span></div>${r?`<div class="report-highlight"><b>${safe(r.action)}</b><p>${safe(r.why)}</p></div><div class="mini-data"><div><span>正式净值</span><b>${nav(r.formalNav)}</b></div><div><span>盘中参考</span><b>${safe(r.estimateTextShort||'—')}</b></div><div><span>你的盈亏</span><b>${r.pnl==null?'—':pct(r.pnl)}</b></div></div>`:`<div class="loading-card">还没有今天的分析。点上面“一键生成 / 更新今天持仓报告”。</div>`}<div class="report-actions"><button class="detail-btn" data-detail="${safe(h.code)}">查看详细报告</button><button class="danger-link" data-delete="${safe(h.code)}">删除</button></div></div>`}).join('');
  qa('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('确定从“我的基金”删除这只吗？'))saveHoldings(getHoldings().filter(x=>x.code!==b.dataset.delete))});wireDetails();renderPortfolioSummary(cache);
}
function renderPortfolioSummary(cache){const el=q('#portfolioSummary');if(!cache?.items?.length){el.classList.add('hidden');return}const items=cache.items,stop=items.filter(x=>x.tone==='stop').length,buy=items.filter(x=>x.tone==='buy').length,wait=items.length-stop-buy;el.innerHTML=`<div><b>${stop}</b><span>需要重点处理</span></div><div><b>${wait}</b><span>继续观察/持有</span></div><div><b>${buy}</b><span>接近可操作</span></div>`;el.classList.remove('hidden')}

function readReportCache(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'null')}catch{return null}}
function writeReportCache(x){localStorage.setItem(REPORT_KEY,JSON.stringify(x))}
async function generateHoldingReports(scroll=false){
  if(reportBusy)return;const a=getHoldings();if(!a.length){openAdd();return}reportBusy=true;q('#refreshHoldings').textContent='正在逐只分析，请稍等…';q('#refreshHome').textContent='正在更新持仓和推荐…';
  const items=[];
  for(const h of a){
    try{const f=await fund(h.code),s=stat(f),d=contextDecision(f,s,h),c=d.c,ref=isLiveEstimate(f,c)?Number(f.est.gsz):s.last,pnl=h.cost?((ref/h.cost)-1)*100:h.pnl;
      items.push({code:h.code,name:f.name,formalNav:s.last,formalDate:formalDate(f),estimateText:estimateLabel(f,c),estimateTextShort:isLiveEstimate(f,c)?`${pct(Number(f.est.gszzl))}`:'—',estimateNav:isLiveEstimate(f,c)?Number(f.est.gsz):null,pnl,action:d.action,why:d.why,how:d.how,tone:toneFromAction(d.action),updated:new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())});
    }catch(e){items.push({code:h.code,name:h.name||('基金 '+h.code),action:'数据暂时取不到',why:String(e.message||e),how:'稍后再更新，不依据旧数据做新的买卖决定。',tone:'wait',updated:'刚刚'})}
  }
  writeReportCache({date:bjParts().key,generatedAt:new Date().toISOString(),items});reportBusy=false;q('#refreshHoldings').textContent='一键生成 / 更新今天持仓报告';q('#refreshHome').textContent='更新现在的情况';renderHoldingList();renderHomePortfolio();if(scroll)q('#homePortfolio')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function openAdd(){q('#addHoldingPanel').classList.remove('hidden');q('#addHoldingPanel').scrollIntoView({behavior:'smooth',block:'start'});q('#hCode').focus()}
function closeAdd(){q('#addHoldingPanel').classList.add('hidden')}
let pnlMode='unknown';
async function identifyHolding(){const code=q('#hCode').value.trim();if(!/^\d{6}$/.test(code)){q('#identifiedFund').textContent='请先输入6位基金代码';return}q('#identifiedFund').textContent='正在识别…';try{const f=await fund(code);q('#identifiedFund').innerHTML=`已识别：<b>${safe(f.name)}</b> · 基金经理 ${safe(f.mgr||'公开数据暂未读到')}`;q('#hCode').dataset.name=f.name}catch(e){q('#identifiedFund').textContent=String(e.message||e)}}
function saveHoldingForm(){const code=q('#hCode').value.trim();if(!/^\d{6}$/.test(code))return alert('请先填写6位基金代码');const amount=num(q('#hAmount').value),cost=num(q('#hCost').value),date=q('#hDate').value||null,abs=num(q('#hPnl').value);let pnl=null;if(pnlMode==='gain'&&abs!==null)pnl=Math.abs(abs);if(pnlMode==='loss'&&abs!==null)pnl=-Math.abs(abs);const name=q('#hCode').dataset.name||null;let a=getHoldings().filter(x=>x.code!==code);a.unshift({code,name,amount,cost,date,pnl});saveHoldings(a);['#hCode','#hAmount','#hCost','#hDate','#hPnl'].forEach(s=>q(s).value='');q('#hCode').dataset.name='';q('#identifiedFund').textContent='';pnlMode='unknown';qa('#pnlSeg button').forEach(b=>b.classList.toggle('active',b.dataset.pnl==='unknown'));q('#hPnl').classList.add('hidden');closeAdd();generateHoldingReports(false)}

function renderCandidates(){
  const box=q('#candidateList'),funds=opportunityData?.funds||[],c=marketContext();if(!funds.length){box.innerHTML='<div class="loading-card">正在等待推荐池数据。</div>';return}
  box.innerHTML=funds.map((x,i)=>{const plan=x.today_plan||{},action=c.phase==='closed'?'休市 · 下个交易日再看':c.phase==='after'?'已收市 · 等正式净值':plan.action||x.position||'观察';const why=selectionBullets(x).slice(0,3);return `<div class="opportunity-card tone-${i%6+1}"><div class="fund-top"><div><div class="fund-name">${i+1}. ${safe(x.name)}</div><div class="fund-code">${safe(x.code)} · ${safe(x.category||'')} · 已跟踪 ${x.tracking?.days_tracked||1} 天</div></div><span class="action-badge wait">${safe(action)}</span></div><div class="score-line"><div class="score-num">${Number(x.score||0).toFixed(0)}<small>/100</small></div><div class="scorebar"><i style="width:${Math.min(100,Math.max(0,Number(x.score||0)))}%"></i></div></div><ul class="why-list">${why.map(z=>`<li>${safe(z)}</li>`).join('')}</ul><div class="mini-data"><div><span>近3月</span><b>${pct(x.returns?.['3m'])}</b></div><div><span>近6月</span><b>${pct(x.returns?.['6m'])}</b></div><div><span>近1年</span><b>${pct(x.returns?.['1y'])}</b></div></div><div class="report-actions"><button class="detail-btn" data-detail="${safe(x.code)}">打开详细研究报告</button><button class="secondary-btn" data-add-watch="${safe(x.code)}">关注</button></div></div>`}).join('');wireDetails();qa('[data-add-watch]').forEach(b=>b.onclick=()=>alert('系统推荐的6只本来就会持续跟踪；“关注”功能会在下一版进一步做成置顶，不代表已经买入。'));
}
function selectionBullets(x){const out=[];if(x.returns?.['6m']!=null)out.push(`中期竞争力：近6个月 ${pct(x.returns['6m'])}，这是综合评分权重最高的一项。`);if(x.returns?.['1y']!=null)out.push(`长期验证：近1年 ${pct(x.returns['1y'])}，不是只看最近几天。`);if(x.history?.trend)out.push(`当前结构：${x.history.trend}；买点还要结合20/60/120日净值位置。`);const h=x.deep_analysis?.holdings;if(h?.top_holdings?.length)out.push(`最新披露核心持仓包括 ${h.top_holdings.slice(0,3).map(z=>z.name).join('、')}。`);return out}
function renderRecommendHistory(){const box=q('#recommendHistory'),funds=opportunityData?.funds||[];if(!funds.length){box.innerHTML='<div class="muted">暂无记录。</div>';return}box.innerHTML=funds.map(x=>{const hs=x.tracking?.score_history||[],max=Math.max(100,...hs.map(z=>Number(z.score)||0));return `<div class="history-item"><b>${safe(x.name)} · ${safe(x.code)}</b><span>开始跟踪：${safe((x.tracking?.first_seen||'').replace('T',' ').slice(0,16)||'—')} · 已刷新 ${x.tracking?.refresh_count||0} 次</span><div class="score-history">${hs.map(z=>`<i title="${safe(String(z.score))}" style="height:${Math.max(8,(Number(z.score)||0)/max*36)}px"></i>`).join('')}</div></div>`}).join('')}

async function openDetail(code){
  const h=getHoldings().find(x=>x.code===code)||{},opp=findOpp(code);currentDetail={code,h,opp};q('#detailSheet').classList.remove('hidden');document.body.style.overflow='hidden';q('#detailTitle').textContent=opp?.name||h.name||('基金 '+code);q('#detailSubtitle').textContent=code;q('#detailBody').innerHTML='<div class="loading-card">正在读取最新正式净值、盘中估算和历史走势…</div>';
  try{const f=await fund(code),s=stat(f),d=contextDecision(f,s,h);currentDetail={code,h,opp,f,s,d};q('#detailTitle').textContent=f.name;renderDetail(currentDetail)}catch(e){q('#detailBody').innerHTML=`<div class="error-card">${safe(e.message||e)}<br>这次数据取不到时，不根据旧数据给新的买卖建议。</div>`}
}
function closeDetail(){q('#detailSheet').classList.add('hidden');document.body.style.overflow='';currentDetail=null}
function renderDetail(o){
  const {code,h,opp,f,s,d}=o,c=d.c,live=isLiveEstimate(f,c),ref=live?Number(f.est.gsz):s.last,pnl=h.cost?((ref/h.cost)-1)*100:h.pnl,profile=opp?.deep_analysis||null;
  q('#detailBody').innerHTML=`
    <div class="detail-section action"><span class="section-kicker">先看结论</span><div class="detail-key">${safe(d.action)}</div><p>${safe(d.why)}</p><p><b>下一步：</b>${safe(d.how)}</p></div>
    <div class="detail-section"><h3>现在用的是什么数据？</h3><div class="detail-grid"><div><span>最新正式净值</span><b>${nav(s.last)}</b><small>${safe(formalDate(f))}</small></div><div><span>盘中估算</span><b class="${live?'live-estimate':''}">${live?nav(Number(f.est.gsz)):'—'}</b><small>${safe(live?String(f.est.gztime):estimateLabel(f,c))}</small></div><div><span>你的成本</span><b>${h.cost?nav(h.cost):'未填写'}</b></div><div><span>当前估算盈亏</span><b>${pnl==null?'—':pct(pnl)}</b></div></div><p class="privacy-note">正式净值和盘中估算分开显示。盘中估算只用于参考位置，不是最终成交净值。</p></div>
    <div class="detail-section"><h3>图上看：现在在哪、哪里等、哪里停</h3>${chartHtml(f,s,h,d)}</div>
    <div class="detail-section time"><h3>未来1～4周怎么准备？</h3>${timePlanHtml(s,d)}</div>
    <div class="detail-section"><h3>如果还没买：怎么买？</h3><p><b>第一关注区：</b>${nav(s.near[0])}～${nav(s.near[1])}</p><p><b>更舒服的回调区：</b>${nav(s.deep[0])}～${nav(s.deep[1])}</p><p><b>停止补仓参考：</b>跌到 ${nav(s.stop)} 以下，先停，不因为“更便宜”继续补。</p><p>真正接近买点时，第一笔通常只考虑计划金额约20%～25%，不要一次买满。</p></div>
    <div class="detail-section"><h3>如果已经买了：什么时候卖？</h3>${sellPlanHtml(s,d,h,pnl)}</div>
    ${profileHtml13(profile,f,opp)}
    <div class="detail-section risk"><h3>风险要看什么？</h3><p><b>近一年最大回撤：</b>${pct(s.maxdd250)}</p><p><b>近期波动：</b>${safe(riskText(s))}</p><p><b>历史持有约半年正收益频率：</b>${s.prob120==null?'—':Number(s.prob120).toFixed(0)+'%'}（只代表过去）</p><p><b>历史持有约一年正收益频率：</b>${s.prob250==null?'—':Number(s.prob250).toFixed(0)+'%'}（只代表过去）</p></div>
    ${opp?recommendTraceHtml(opp):''}
    <div class="detail-section"><p class="privacy-note">研究辅助，不保证收益。买卖前仍需查看销售平台的申购/赎回状态、15:00确认规则和实际费用。</p></div>`;
}
function chartHtml(f,s,h,d){
  const a=f.a.slice(-120);if(a.length<2)return '<p>历史数据不足。</p>';const vals=a.map(x=>x.v),extras=[s.near[0],s.near[1],s.deep[0],s.deep[1],s.stop];if(h.cost)extras.push(Number(h.cost));let mn=Math.min(...vals,...extras),mx=Math.max(...vals,...extras),pad=(mx-mn||1)*.08;mn-=pad;mx+=pad;const w=390,H=210,L=18,R=12,T=14,B=24,X=i=>L+i*(w-L-R)/(a.length-1),Y=v=>T+(mx-v)/(mx-mn)*(H-T-B);const pts=a.map((x,i)=>`${X(i)},${Y(x.v)}`).join(' ');
  const band=(z,fill,label)=>{const y1=Y(Math.max(...z)),y2=Y(Math.min(...z));return `<rect x="${L}" y="${y1}" width="${w-L-R}" height="${Math.max(3,y2-y1)}" fill="${fill}"/><text x="${L+5}" y="${Math.max(T+12,y1+13)}" font-size="10" fill="#684e48">${label}</text>`};let marks=band(s.near,'rgba(183,53,45,.10)','第一关注区')+band(s.deep,'rgba(201,154,46,.13)','更舒服区');marks+=`<line x1="${L}" y1="${Y(s.stop)}" x2="${w-R}" y2="${Y(s.stop)}" stroke="#5f8366" stroke-dasharray="5 4"/><text x="${w-R}" y="${Y(s.stop)-4}" text-anchor="end" font-size="10" fill="#4b6b51">停止补仓</text>`;if(h.cost){marks+=`<line x1="${L}" y1="${Y(h.cost)}" x2="${w-R}" y2="${Y(h.cost)}" stroke="#526f9a" stroke-dasharray="3 3"/><text x="${w-R}" y="${Y(h.cost)-4}" text-anchor="end" font-size="10" fill="#526f9a">你的成本</text>`;}
  if(h.date){const bt=new Date(h.date+'T00:00:00').getTime(),idx=a.reduce((best,x,i)=>Math.abs(x.t-bt)<Math.abs(a[best].t-bt)?i:best,0);if(bt>=a[0].t&&bt<=a[a.length-1].t){marks+=`<line x1="${X(idx)}" y1="${T}" x2="${X(idx)}" y2="${H-B}" stroke="#7165aa" stroke-dasharray="2 3"/><text x="${Math.min(w-48,X(idx)+4)}" y="${T+12}" font-size="10" fill="#7165aa">你买入</text>`}}
  return `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${H}">${marks}<polyline fill="none" stroke="#b7352d" stroke-width="2.6" points="${pts}"/><circle cx="${X(a.length-1)}" cy="${Y(a[a.length-1].v)}" r="4" fill="#b7352d"/></svg></div><div class="chart-legend"><span><i class="legend-dot" style="background:#f2d8d4"></i>关注买入区</span><span><i class="legend-dot" style="background:#f2e5b8"></i>更深回调区</span><span><i class="legend-dot" style="background:#5f8366"></i>停止补仓</span>${h.cost?'<span><i class="legend-dot" style="background:#526f9a"></i>你的成本</span>':''}</div>`
}
function timePlanHtml(s,d){if(d.c.phase==='closed')return `<p>今天休市，不预测今天的买点。下一交易日 ${d.c.nextShort} 开市后再根据盘中估算重新算。</p>`;if(s.etaDays){const [lo,hi]=s.etaDays;return `<p><b>粗略时间：</b>未来约 ${lo}～${hi} 个交易日重点看。</p><p>这个时间只是按当前位置距离买入区和最近波动速度估算，不是预测某一天一定到价。</p>`}return `<p>${safe(s.eta||'暂时不预测具体日期，先等走势确认。')}</p>`}
function sellPlanHtml(s,d,h,pnl){let html='';if(h.cost)html+=`<p><b>你的成本：</b>${nav(h.cost)}；按当前参考约 ${pnl==null?'—':pct(pnl)}。</p>`;if(pnl!=null&&pnl>=50)html+='<p><b>利润已经很厚：</b>重点从“继续赚”转成“不要把利润吐回去”。若再次快速上涨，可先减25%～30%，剩下继续跟踪。</p>';else if(pnl!=null&&pnl>=20)html+='<p><b>已经有明显利润：</b>如果短期又涨得很快，可以先卖20%～25%，不必一次卖光。</p>';else if(pnl!=null&&pnl<0)html+='<p><b>如果在亏：</b>不能因为亏了就一直补。只有趋势仍稳且进入合理区才考虑小补；趋势偏弱时先保护剩余资金。</p>';else html+='<p>盈利后要逐渐建立利润保护，而不是一直等到从赚变亏才考虑卖。</p>';html+=`<p><b>趋势保护参考：</b>如果跌破约 ${nav(s.stop)} 且中期趋势也转弱，需要重新评估减仓或退出。</p>`;return html}
function profileHtml13(p,f,opp){if(!p){return `<div class="detail-section profile"><h3>这只基金到底买了什么？</h3><p><b>基金经理：</b>${safe(f.mgr||'公开数据暂未读到')}</p><p>这只不是当前6只核心候选，所以服务器暂时没有完整的定期报告持仓档案。当天趋势和持仓报告仍然可以正常分析。</p></div>`}const h=p.holdings,inds=p.industries;return `<div class="detail-section profile"><h3>这只基金到底买了什么？</h3><p><b>基金经理：</b>${safe(opp?.deep_analysis?.overview?.manager||f.mgr||'—')}</p>${h?.top_holdings?.length?`<p><b>最新披露：</b>${safe(h.quarter||'定期报告')}</p><div class="holding-table">${h.top_holdings.slice(0,10).map((x,i)=>`<div class="holding-row"><span>${i+1}. ${safe(x.name)}</span><b>${Number(x.weight||0).toFixed(2)}%</b></div>`).join('')}</div><p>前十大合计约 <b>${Number(h.top10_concentration||0).toFixed(1)}%</b>。</p>`:'<p>前十大持仓暂未取到。</p>'}${inds?.items?.length?`<p><b>主要行业：</b>${inds.items.slice(0,4).map(x=>`${safe(x.name)} ${Number(x.weight||0).toFixed(1)}%`).join(' · ')}</p>`:''}<p class="privacy-note">持仓来自基金定期报告，通常按季度披露，不是今天实时持仓。</p></div>`}
function recommendTraceHtml(x){const hs=x.tracking?.score_history||[];return `<div class="detail-section"><h3>系统为什么一直跟踪它？</h3><p>首次进入跟踪：${safe((x.tracking?.first_seen||'').replace('T',' ').slice(0,16)||'—')}；目前已跟踪 ${x.tracking?.days_tracked||1} 天。</p><p><b>替换规则：</b>评分明显恶化、中期趋势转负、暂停申购，或者更好的候选持续胜出时才换，不因为一天涨跌就换。</p><div class="score-history">${hs.map(z=>`<i style="height:${Math.max(8,(Number(z.score)||0)/100*36)}px" title="${safe(z.score)}"></i>`).join('')}</div></div>`}

function wireDetails(){qa('[data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail))}
function goPage(name){qa('.screen').forEach(x=>x.classList.remove('active'));qa('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page===name));q(`#page-${name}`).classList.add('active');window.scrollTo({top:0,behavior:'smooth'});if(name==='holdings')renderHoldingList();if(name==='discover'){renderCandidates();renderRecommendHistory();if(['session','decision'].includes(marketContext().phase))refreshCandidateLive()}}
function wireGo(){qa('[data-go]').forEach(b=>b.onclick=()=>{goPage(b.dataset.go);if(b.hasAttribute('data-open-add'))setTimeout(openAdd,100)})}
async function refreshCandidateLive(){const funds=(opportunityData?.funds||[]);for(const x of funds){try{const f=await fund(x.code),s=stat(f),d=contextDecision(f,s,{});const card=[...qa('.opportunity-card')].find(el=>el.textContent.includes(x.code));if(card){const badge=card.querySelector('.action-badge');if(badge)badge.textContent=d.action}}catch{}await new Promise(r=>setTimeout(r,180))}}

async function searchFund(){let raw=q('#searchCode').value.trim();if(!raw)return alert('请先输入基金代码或名称');if(!/^\d{6}$/.test(raw)){const matches=(dailyCatalog||[]).filter(x=>String(x.name||'').includes(raw)).slice(0,6);if(!matches.length){q('#searchResult').innerHTML='<div class="error-card">没有按名称找到，请试试6位基金代码。</div>';return}q('#searchResult').innerHTML=`<div class="card" style="padding:16px"><b>你是不是想查这些？</b>${matches.map(x=>`<button class="secondary-btn full name-match" data-code="${safe(x.code)}" style="margin-top:8px">${safe(x.name)} · ${safe(x.code)}</button>`).join('')}</div>`;qa('.name-match').forEach(b=>b.onclick=()=>{q('#searchCode').value=b.dataset.code;openDetail(b.dataset.code)});return}openDetail(raw)}
function setupVoice(){q('#voiceSearch').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return alert('这个浏览器暂时不支持语音输入，可以直接输入基金代码或名称。');const r=new SR();r.lang='zh-CN';r.interimResults=false;q('#voiceSearch').textContent='🎙️ 正在听…';r.onresult=e=>{const t=e.results[0][0].transcript||'',m=t.match(/\d{6}/);if(m)q('#searchCode').value=m[0];q('#searchQuestion').value=t.replace(m?.[0]||'','').trim();q('#voiceSearch').textContent='🎙️ 语音'};r.onerror=r.onend=()=>{q('#voiceSearch').textContent='🎙️ 语音'};r.start()}}

function scheduleAuto(){if(autoTimer)clearInterval(autoTimer);const c=marketContext();if(['session','decision'].includes(c.phase)){autoTimer=setInterval(()=>{renderMarket();if(getHoldings().length)generateHoldingReports(false);},30*60*1000)}}
function setup(){
  document.body.dataset.release=RELEASE;qa('.nav-btn').forEach(b=>b.onclick=()=>goPage(b.dataset.page));wireGo();q('#helpBtn').onclick=()=>{q('#helpSheet').classList.remove('hidden');document.body.style.overflow='hidden'};qa('[data-close-help]').forEach(x=>x.onclick=()=>{q('#helpSheet').classList.add('hidden');document.body.style.overflow='' });qa('[data-close-sheet]').forEach(x=>x.onclick=closeDetail);q('#detailRefresh').onclick=()=>currentDetail&&openDetail(currentDetail.code);q('#openAddHolding').onclick=openAdd;q('#closeAddHolding').onclick=closeAdd;q('#identifyHolding').onclick=identifyHolding;q('#saveHolding').onclick=saveHoldingForm;q('#refreshHoldings').onclick=()=>generateHoldingReports(false);q('#refreshHome').onclick=async()=>{renderMarket();await generateHoldingReports(false);renderHomeOpportunities()};qa('#pnlSeg button').forEach(b=>b.onclick=()=>{pnlMode=b.dataset.pnl;qa('#pnlSeg button').forEach(x=>x.classList.toggle('active',x===b));q('#hPnl').classList.toggle('hidden',pnlMode==='unknown')});q('#searchFundBtn').onclick=searchFund;qa('.quick-grid button').forEach(b=>b.onclick=()=>q('#searchQuestion').value=b.textContent);setupVoice();renderHoldingList();renderHomePortfolio();renderMarket();scheduleAuto();
}
setup();loadBase().then(()=>{renderHoldingList();renderHomePortfolio();if(getHoldings().length&&['session','decision'].includes(marketContext().phase))generateHoldingReports(false);});
})();
