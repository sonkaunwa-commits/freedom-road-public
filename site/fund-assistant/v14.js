(()=>{
'use strict';
const RELEASE='FUND_ASSISTANT_UI_20260824_1905';
const HOLD_KEY='mom_funds_v7';
const REPORT_KEY='fund_report_v14';
const INTRA_PREFIX='fund_intraday_v14_';
const HOLIDAYS=new Set(['2026-01-01','2026-01-02','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-04-06','2026-05-01','2026-05-04','2026-05-05','2026-06-19','2026-09-25','2026-10-01','2026-10-02','2026-10-05','2026-10-06','2026-10-07']);
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const N=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};
const P=v=>v===null||!Number.isFinite(Number(v))?'—':`${Number(v)>0?'+':''}${Number(v).toFixed(1)}%`;
const V=v=>v===null||!Number.isFinite(Number(v))?'—':Number(v).toFixed(4);
let opportunity=null,dailyCatalog=[],recommendHistory=null,currentDetail=null,detailTimer=null,holdingTimer=null,countdownTimer=null,reportBusy=false,pnlMode='unknown';

function bjParts(d=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d),o={};
  parts.forEach(x=>o[x.type]=x.value);
  return {y:+o.year,m:+o.month,d:+o.day,w:o.weekday,h:+o.hour,min:+o.minute,s:+o.second,key:`${o.year}-${o.month}-${o.day}`};
}
function bjNoon(p){return new Date(Date.UTC(p.y,p.m-1,p.d,4));}
function isTradeDate(d){const p=bjParts(d);return p.w!=='Sat'&&p.w!=='Sun'&&!HOLIDAYS.has(p.key)}
function nextTradeDate(d){let x=new Date(d);for(let i=0;i<30;i++){x=new Date(x.getTime()+86400000);if(isTradeDate(x))return x}return x}
function fmtCN(d){const p=bjParts(d);return `${p.m}月${p.d}日`}
function fmtFull(d){const p=bjParts(d);return `${p.y}年${p.m}月${p.d}日`}
function marketCtx(){
  const p=bjParts(),today=bjNoon(p),trade=isTradeDate(today),mins=p.h*60+p.min,next=nextTradeDate(today);let phase='closed',headline='',summary='',badge='',tone='closed';
  if(!trade){phase='closed';headline='今天休市，不需要做买卖决定';summary=`今天只做复盘和准备。下一交易日 ${fmtFull(next)} 开市后，再看新的盘中估算。`;badge=p.w==='Sat'?'周六休市':p.w==='Sun'?'周日休市':'休市';}
  else if(mins<570){phase='pre';tone='after';headline='还没开盘，先看计划';summary='现在能确认的是上一交易日正式净值。9:30以后盘中估算开始更新，再看今天的位置。';badge='开盘前';}
  else if(mins<840){phase='session';tone='open';headline='盘中观察，先别急着下决定';summary='盘中估算正在变化。先看位置和趋势，真正准备操作时，下午再重点复核。';badge='交易中';}
  else if(mins<900){phase='decision';tone='open';headline='现在进入今天的重点决策时间';summary='14:00以后重点看最新盘中估算、买入区和自己的持仓；15:00前操作要特别看平台确认规则。';badge='重点复核';}
  else {phase='after';tone='after';headline='今天已经收市，等正式净值确认';summary='盘中估算已经结束，但它不是最终净值。晚间正式净值披露后再做完整复盘。';badge='已收市';}
  return {p,today,trade,mins,next,phase,headline,summary,badge,tone};
}
function nextAutoText(){
  const c=marketCtx(),p=c.p;if(c.phase==='closed')return `${fmtCN(c.next)} 09:30后`;
  if(c.phase==='pre')return '09:30开盘后';
  if(c.phase==='session'||c.phase==='decision'){
    const m=Math.ceil((p.min+1)/30)*30;let h=p.h+Math.floor(m/60),min=m%60;if(h>=15)return '15:00收市';return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  }
  if(c.phase==='after'&&c.mins<1360)return '约22:40正式复盘';
  return `${fmtCN(c.next)} 07:10后`;
}
function nowHM(){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date())}
function formalDate(f){const x=f?.a?.[f.a.length-1];if(!x)return '—';const d=new Date(x.t);return Number.isNaN(d.getTime())?'—':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function isEstimateSameDay(f){return !!(f?.est?.gztime&&String(f.est.gztime).slice(0,10)===bjParts().key&&f.est?.gsz)}
function liveEstimate(f){return isEstimateSameDay(f)?Number(f.est.gsz):null}

async function loadJson(url){const r=await fetch(`${url}${url.includes('?')?'&':'?'}t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`数据读取失败 ${r.status}`);return r.json()}
async function loadBase(){
  const [a,b,c]=await Promise.allSettled([loadJson('data/opportunity.json'),loadJson('data/fund_daily.json'),loadJson('data/recommendation-history.json')]);
  opportunity=a.status==='fulfilled'?a.value:{funds:[],generated_at:null};
  dailyCatalog=b.status==='fulfilled'?(b.value.funds||[]):[];
  recommendHistory=c.status==='fulfilled'?c.value:{events:[],current:[]};
  renderToday();renderCandidates();renderRecommendHistory();
}

function getHoldings(){try{return JSON.parse(localStorage.getItem(HOLD_KEY)||'[]')}catch{return[]}}
function setHoldings(a){localStorage.setItem(HOLD_KEY,JSON.stringify(a));renderHoldings();renderTodayHoldings()}
function readReports(){try{return JSON.parse(localStorage.getItem(REPORT_KEY)||'null')}catch{return null}}
function writeReports(x){localStorage.setItem(REPORT_KEY,JSON.stringify(x))}
function findOpp(code){return opportunity?.funds?.find(x=>String(x.code)===String(code))||null}
function tone(text){if(/退出|停止|不要补|趋势弱|减仓|不买/.test(text||''))return'stop';if(/可以买|买一点|第一买入|第二买入|小补/.test(text||''))return'buy';return'wait'}

function adjustedDecision(f,s,h={}){
  const c=marketCtx(),p=personal(s,h.cost??null,h.pnl??null,h.date??null);let action=p.action,why=p.why,how=p.how;
  if(c.phase==='closed'){action='休市，不操作';why='今天不是交易日，不用拿上一个交易日净值当成今天行情。';how=`下一交易日 ${fmtCN(c.next)} 开盘后再更新盘中估算。`;}
  else if(c.phase==='pre'){action='开盘前先不操作';why='今天还没有盘中数据。';how='9:30以后再看；如果真准备买卖，下午再重点确认。';}
  else if(c.phase==='after'){action='已收市，先等正式净值';why='盘中估算已经结束，但它不是最终净值。';how='晚间正式净值更新后再复盘，下一交易日再决定。';}
  else if(c.phase==='session'&&tone(action)==='buy'){action='接近买点，下午再确认';why='盘中位置值得关注，但现在还不是最后决策窗口。';how='先观察，下午2点以后再更新一次；仍在买入区且趋势没坏，再考虑第一笔。';}
  return {...p,action,why,how,tone:tone(action),c};
}

function renderToday(){
  const c=marketCtx();q('#dateLabel').textContent=`${fmtCN(c.today)} · ${c.p.w==='Mon'?'周一':c.p.w==='Tue'?'周二':c.p.w==='Wed'?'周三':c.p.w==='Thu'?'周四':c.p.w==='Fri'?'周五':c.p.w==='Sat'?'周六':'周日'}`;
  q('#marketBadge').className=`badge ${c.tone}`;q('#marketBadge').textContent=c.badge;q('#todayHeadline').textContent=c.headline;q('#todaySummary').textContent=c.summary;
  q('#formalFreshness').textContent=opportunity?.generated_at?String(opportunity.generated_at).replace('T',' ').slice(5,16):'等待数据';q('#liveFreshness').textContent=(c.phase==='session'||c.phase==='decision')?'9:30–15:00可更新':c.phase==='after'?'今日盘中已结束':c.phase==='closed'?'休市':c.phase==='pre'?'9:30后开始':'—';q('#nextRefresh').textContent=nextAutoText();
  q('#scheduleHint').textContent='数据节奏：盘中估算交易日9:30–15:00；持仓总览约每30分钟自动检查，单只详情页约每10分钟检查；后台计划约07:10 / 14:20 / 22:40刷新，若任务或数据源延迟，以页面实际时间为准。';
  renderTodayHoldings();renderOpportunitySummary();renderLesson();
}
function renderTodayHoldings(){
  const box=q('#todayHoldings'),hs=getHoldings(),reports=readReports();if(!hs.length){box.innerHTML='<div class="empty-card"><h3>还没有录入持仓</h3><p>录入以后，首页每天只告诉你哪些需要处理。</p><button class="btn secondary" data-go="holdings" data-open-add>录入基金详情</button></div>';wireGo();return}
  if(!reports?.items?.length){box.innerHTML=`<div class="empty-card"><h3>已经保存 ${hs.length} 只基金</h3><p>先生成今天的持仓报告。</p><button id="todayReportBtn" class="btn primary">生成今日持仓报告</button></div>`;q('#todayReportBtn').onclick=()=>generateReports(true);return}
  const arr=reports.items,urgent=arr.filter(x=>x.tone==='stop'),buy=arr.filter(x=>x.tone==='buy'),wait=arr.filter(x=>x.tone==='wait');const lead=urgent[0]||buy[0]||wait[0];
  box.innerHTML=`<div class="overview-card"><div class="overview-grid"><div><b>${urgent.length}</b><span>需要重点处理</span></div><div><b>${wait.length}</b><span>继续观察/持有</span></div><div><b>${buy.length}</b><span>接近可操作</span></div></div>${lead?`<div class="overview-cta"><p><b>${esc(lead.name)}</b><br>${esc(lead.action)}</p><button class="outline-btn" data-detail="${esc(lead.code)}">看报告</button></div>`:''}</div>`;wireDetailButtons();
}
function renderOpportunitySummary(){
  const box=q('#opportunitySummary'),funds=opportunity?.funds||[],c=marketCtx();if(!funds.length){box.innerHTML='<div class="loading-card">机会池数据暂时没有读到。</div>';return}
  let near=0,wait=0,avoid=0;funds.forEach(x=>{const a=x.today_plan?.action||'';if(/第一买入|第二买入/.test(a))near++;else if(/不买|停止/.test(a))avoid++;else wait++});
  const msg=c.phase==='closed'?'今天休市，只做复盘；下一交易日再看盘中位置。':c.phase==='after'?'今天已收市；晚间正式净值确认后再更新判断。':near?`当前有 ${near} 只处在系统关注买入区，但真正操作前仍要看最新盘中估算。`:'当前没有必须追的机会，继续等更舒服的位置。';
  box.innerHTML=`<div class="overview-grid"><div><b>${funds.length}</b><span>核心候选</span></div><div><b>${near}</b><span>接近买入区</span></div><div><b>${avoid}</b><span>暂不介入</span></div></div><div class="overview-cta"><p>${esc(msg)}</p><button class="outline-btn" data-go="discover">进入机会池</button></div>`;wireGo();
}
function renderLesson(){
  const lessons=[
    ['净值和盘中估算不是一回事','正式净值通常在收市后计算并披露；盘中看到的是估算值，只用于参考当天位置。'],
    ['涨得最好，不代表今天最适合买','排行榜告诉你过去谁涨得多，买点还要看当前位置是不是已经过热。'],
    ['分批买，是为了给自己留后手','第一笔不要把计划资金全部打进去。后面如果出现更好的位置，你还有资金。'],
    ['亏损不是补仓理由','“已经跌很多”不等于“现在便宜”。先看趋势有没有稳定，再决定补不补。'],
    ['基金经理和持仓会变化','主动基金的风格可能变化，所以定期看基金经理、前十大持仓和行业配置。'],
    ['赚到钱以后要改变任务','盈利越大，目标就越应该从“赚更多”变成“保护已经赚到的钱”。'],
    ['15:00为什么重要','多数场外基金在交易日15:00前后的申请会影响按哪一个开放日净值确认，具体以基金合同和平台规则为准。']
  ];
  const p=bjParts(),idx=(Math.floor(Date.UTC(p.y,p.m-1,p.d)/86400000))%lessons.length;q('#lessonNo').textContent=`${idx+1}/${lessons.length}`;q('#lessonTitle').textContent='今日基金小知识';q('#dailyLesson').innerHTML=`<h3>${esc(lessons[idx][0])}</h3><p>${esc(lessons[idx][1])}</p>`;
}

function renderHoldings(){
  const box=q('#holdingList'),hs=getHoldings(),reports=readReports();if(!hs.length){box.innerHTML='<div class="empty-card"><h3>还没有持仓</h3><p>点上面的“录入基金详情”开始。</p></div>';q('#portfolioSummary').classList.add('hidden');return}
  const map=new Map((reports?.items||[]).map(x=>[x.code,x]));box.innerHTML=hs.map(h=>{const r=map.get(h.code);return `<div class="report-card"><div class="card-top"><div><div class="fund-title">${esc(r?.name||h.name||('基金 '+h.code))}</div><div class="fund-sub">${esc(h.code)}${h.amount?` · 约${Number(h.amount).toLocaleString()}元`:''}${h.cost?` · 成本 ${V(h.cost)}`:''}</div></div><span class="status-chip ${r?.tone||'wait'}">${esc(r?.action||'等待生成报告')}</span></div>${r?`<div class="report-main"><b>${esc(r.action)}</b><p>${esc(r.why)}</p></div><div class="metrics"><div><span>正式净值</span><b>${V(r.formalNav)}</b></div><div><span>盘中参考</span><b>${esc(r.liveText||'—')}</b></div><div><span>估算盈亏</span><b>${r.pnl==null?'—':P(r.pnl)}</b></div></div>`:'<div class="loading-card">还没有今天的报告。</div>'}<div class="card-actions"><button class="outline-btn" data-detail="${esc(h.code)}">查看详细报告</button><button class="danger-link" data-delete="${esc(h.code)}">删除</button></div></div>`}).join('');
  qa('[data-delete]').forEach(b=>b.onclick=()=>{if(confirm('确定删除这只持仓吗？'))setHoldings(getHoldings().filter(x=>x.code!==b.dataset.delete))});wireDetailButtons();renderPortfolioSummary(reports);
}
function renderPortfolioSummary(reports){const el=q('#portfolioSummary');if(!reports?.items?.length){el.classList.add('hidden');return}const a=reports.items,stop=a.filter(x=>x.tone==='stop').length,buy=a.filter(x=>x.tone==='buy').length,wait=a.length-stop-buy;el.innerHTML=`<div><b>${stop}</b><span>重点处理</span></div><div><b>${wait}</b><span>观察/持有</span></div><div><b>${buy}</b><span>接近操作</span></div>`;el.classList.remove('hidden')}

async function generateReports(scroll=false){
  if(reportBusy)return;const hs=getHoldings();if(!hs.length){openAdd();return}reportBusy=true;q('#refreshHoldings').textContent='正在逐只分析…';q('#refreshToday').textContent='正在更新…';const items=[];
  for(const h of hs){try{const f=await fund(h.code);saveIntradaySample(h.code,f);const s=stat(f),d=adjustedDecision(f,s,h),ref=liveEstimate(f)??s.last,pnl=h.cost?((ref/h.cost)-1)*100:h.pnl;items.push({code:h.code,name:f.name,formalNav:s.last,formalDate:formalDate(f),liveText:isEstimateSameDay(f)?`${P(Number(f.est.gszzl))} · ${String(f.est.gztime).slice(11,16)}`:'—',pnl,action:d.action,why:d.why,how:d.how,tone:d.tone,updated:nowHM()})}catch(e){items.push({code:h.code,name:h.name||('基金 '+h.code),action:'数据暂时取不到',why:String(e.message||e),how:'暂时不要用旧数据做新的买卖决定。',tone:'wait',updated:nowHM()})}}
  writeReports({date:bjParts().key,generatedAt:new Date().toISOString(),items});reportBusy=false;q('#refreshHoldings').textContent='生成 / 更新今日持仓报告';q('#refreshToday').textContent='更新现在的情况';renderHoldings();renderTodayHoldings();if(scroll)q('#todayHoldings')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function openAdd(){q('#addHoldingPanel').classList.remove('hidden');q('#addHoldingPanel').scrollIntoView({behavior:'smooth',block:'start'});q('#hCode').focus()}
function closeAdd(){q('#addHoldingPanel').classList.add('hidden')}
async function identifyHolding(){const code=q('#hCode').value.trim();if(!/^\d{6}$/.test(code)){q('#identifiedFund').textContent='请输入6位基金代码';return}q('#identifiedFund').textContent='正在识别…';try{const f=await fund(code);q('#identifiedFund').innerHTML=`已识别：<b>${esc(f.name)}</b>${f.mgr?' · 基金经理 '+esc(f.mgr):''}`;q('#hCode').dataset.name=f.name}catch(e){q('#identifiedFund').textContent=String(e.message||e)}}
function saveHolding(){const code=q('#hCode').value.trim();if(!/^\d{6}$/.test(code))return alert('请先填写6位基金代码');const amount=N(q('#hAmount').value),cost=N(q('#hCost').value),date=q('#hDate').value||null,abs=N(q('#hPnl').value);let pnl=null;if(pnlMode==='gain'&&abs!==null)pnl=Math.abs(abs);if(pnlMode==='loss'&&abs!==null)pnl=-Math.abs(abs);let a=getHoldings().filter(x=>x.code!==code);a.unshift({code,name:q('#hCode').dataset.name||null,amount,cost,date,pnl});setHoldings(a);['#hCode','#hAmount','#hCost','#hDate','#hPnl'].forEach(s=>q(s).value='');q('#identifiedFund').textContent='';pnlMode='unknown';qa('#pnlSeg button').forEach(b=>b.classList.toggle('active',b.dataset.pnl==='unknown'));q('#hPnl').classList.add('hidden');closeAdd();generateReports(false)}

function renderCandidates(){
  const box=q('#candidateList'),funds=opportunity?.funds||[],c=marketCtx();if(!funds.length){box.innerHTML='<div class="loading-card">机会池数据暂时没有读到。</div>';return}
  box.innerHTML=funds.map((x,i)=>{const act=c.phase==='closed'?'休市 · 下个交易日再看':c.phase==='after'?'已收市 · 等正式净值':x.today_plan?.action||x.position||'观察';const why=selectionBullets(x);return `<div class="fund-card" data-candidate="${esc(x.code)}"><div class="card-top"><div><div class="fund-title">${i+1}. ${esc(x.name)}</div><div class="fund-sub">${esc(x.code)} · ${esc(x.category||'')} · 已跟踪 ${x.tracking?.days_tracked||1} 天</div></div><span class="status-chip wait candidate-status">${esc(act)}</span></div><div class="score-row"><div class="score-number">${Number(x.score||0).toFixed(0)}<small>/100</small></div><div class="scorebar"><i style="width:${Math.max(0,Math.min(100,Number(x.score||0)))}%"></i></div></div><ul class="why-list">${why.slice(0,3).map(z=>`<li>${esc(z)}</li>`).join('')}</ul><div class="metrics"><div><span>近3月</span><b>${P(x.returns?.['3m'])}</b></div><div><span>近6月</span><b>${P(x.returns?.['6m'])}</b></div><div><span>近1年</span><b>${P(x.returns?.['1y'])}</b></div></div><div class="card-actions"><button class="outline-btn" data-detail="${esc(x.code)}">查看分析与走势</button></div></div>`}).join('');wireDetailButtons();
}
function selectionBullets(x){const out=[];if(x.returns?.['6m']!=null)out.push(`近6个月 ${P(x.returns['6m'])}，这是评分权重最高的中期维度。`);if(x.returns?.['1y']!=null)out.push(`近1年 ${P(x.returns['1y'])}，不是只看最近几天。`);if(x.history?.trend)out.push(`当前净值结构：${x.history.trend}。`);const hs=x.deep_analysis?.holdings?.top_holdings;if(hs?.length)out.push(`最新披露核心持仓包括 ${hs.slice(0,3).map(z=>z.name).join('、')}。`);return out}
async function refreshCandidateStatuses(){if(!['session','decision'].includes(marketCtx().phase))return;for(const x of opportunity?.funds||[]){const card=q(`[data-candidate="${x.code}"]`);if(!card)continue;try{const f=await fund(x.code);saveIntradaySample(x.code,f);const s=stat(f),d=adjustedDecision(f,s,{}),b=card.querySelector('.candidate-status');b.textContent=d.action;b.className=`status-chip ${d.tone} candidate-status`}catch{}await new Promise(r=>setTimeout(r,150))}}

function renderRecommendHistory(){
  const box=q('#recommendHistory'),current=recommendHistory?.current||[],events=recommendHistory?.events||[];if(!current.length&&!events.length){box.innerHTML='<div class="small-note">历史记录正在积累。</div>';return}
  const currentHtml=current.slice(0,6).map(x=>`<div class="history-item"><b>${esc(x.name)} · ${esc(x.code)}</b><span>首次跟踪：${esc(String(x.first_seen||'').replace('T',' ').slice(0,16)||'—')} · 已跟踪 ${x.days_tracked||1} 天 · 当前评分 ${x.score??'—'}</span></div>`).join('');const eventHtml=events.slice(-8).reverse().map(e=>`<div class="history-event"><b>${e.type==='added'?'加入':'移出'}：${esc(e.name||e.code)}</b><span>${esc(String(e.at||'').replace('T',' ').slice(0,16))} · ${esc(e.reason||'')}</span></div>`).join('');box.innerHTML=currentHtml+(eventHtml?`<div style="margin-top:12px"><span class="eyebrow">最近变更</span>${eventHtml}</div>`:'')
}

function intraKey(code){return `${INTRA_PREFIX}${bjParts().key}_${code}`}
function getIntraday(code){try{return JSON.parse(localStorage.getItem(intraKey(code))||'[]')}catch{return[]}}
function saveIntradaySample(code,f){if(!isEstimateSameDay(f))return;const raw=String(f.est.gztime),hm=raw.slice(11,16),v=Number(f.est.gsz),r=Number(f.est.gszzl);if(!Number.isFinite(v))return;let a=getIntraday(code).filter(x=>x.time!==hm);a.push({time:hm,v,r,at:Date.now()});a.sort((x,y)=>x.time.localeCompare(y.time));if(a.length>60)a=a.slice(-60);localStorage.setItem(intraKey(code),JSON.stringify(a))}
function intradayChart(code,f){saveIntradaySample(code,f);const a=getIntraday(code),same=isEstimateSameDay(f);if(a.length<2){return `<div class="intraday-empty">${same?`当前盘中估算：${V(Number(f.est.gsz))}（${esc(String(f.est.gztime).slice(11,16))}）。从本页面开始记录后，每次自动或手动更新都会补一个点；完整全天分时采集后续会迁到服务器持续保存。`:'今天没有可用的盘中估算曲线。正式净值仍可正常查看。'}</div>`}const vals=a.map(x=>x.v),mn=Math.min(...vals),mx=Math.max(...vals),w=390,h=150,l=14,r=10,t=12,b=23,X=i=>l+i*(w-l-r)/(a.length-1),Y=v=>t+(mx-v)/(mx-mn||1)*(h-t-b),pts=a.map((x,i)=>`${X(i)},${Y(x.v)}`).join(' ');return `<div class="chart-headline"><b>今日盘中估算走势</b><span>${esc(a[0].time)}–${esc(a[a.length-1].time)} · 本页面采样</span></div><div class="chart-box"><svg viewBox="0 0 ${w} ${h}"><line x1="${l}" y1="${Y(vals[0])}" x2="${w-r}" y2="${Y(vals[0])}" stroke="#dddcd7" stroke-dasharray="3 4"/><polyline fill="none" stroke="#a83a32" stroke-width="2.5" points="${pts}"/><circle cx="${X(a.length-1)}" cy="${Y(a[a.length-1].v)}" r="4" fill="#a83a32"/><text x="${l}" y="${h-5}" font-size="10" fill="#77756f">${esc(a[0].time)}</text><text x="${w-r}" y="${h-5}" text-anchor="end" font-size="10" fill="#77756f">${esc(a[a.length-1].time)}</text></svg></div><div class="small-note">盘中估算不是最终净值。当前版本在页面打开/刷新时采样；详情页交易时段约每10分钟补一个点。</div>`}
function historyChart(f,s,h){const a=f.a.slice(-120);if(a.length<2)return'<div class="intraday-empty">历史数据不足。</div>';const vals=a.map(x=>x.v),extra=[s.near[0],s.near[1],s.deep[0],s.deep[1],s.stop];if(h.cost)extra.push(Number(h.cost));let mn=Math.min(...vals,...extra),mx=Math.max(...vals,...extra),pad=(mx-mn||1)*.08;mn-=pad;mx+=pad;const w=390,H=210,L=15,R=10,T=12,B=22,X=i=>L+i*(w-L-R)/(a.length-1),Y=v=>T+(mx-v)/(mx-mn)*(H-T-B),pts=a.map((x,i)=>`${X(i)},${Y(x.v)}`).join(' ');const band=(z,fill,label)=>{const y1=Y(Math.max(...z)),y2=Y(Math.min(...z));return `<rect x="${L}" y="${y1}" width="${w-L-R}" height="${Math.max(3,y2-y1)}" fill="${fill}"/><text x="${L+5}" y="${Math.max(T+12,y1+12)}" font-size="10" fill="#6c6963">${label}</text>`};let marks=band(s.near,'rgba(168,58,50,.10)','第一关注区')+band(s.deep,'rgba(190,155,75,.12)','更深回调区')+`<line x1="${L}" y1="${Y(s.stop)}" x2="${w-R}" y2="${Y(s.stop)}" stroke="#64806a" stroke-dasharray="5 4"/><text x="${w-R}" y="${Y(s.stop)-4}" text-anchor="end" font-size="10" fill="#56705c">停止补仓</text>`;if(h.cost)marks+=`<line x1="${L}" y1="${Y(h.cost)}" x2="${w-R}" y2="${Y(h.cost)}" stroke="#526f9a" stroke-dasharray="3 3"/><text x="${w-R}" y="${Y(h.cost)-4}" text-anchor="end" font-size="10" fill="#526f9a">你的成本</text>`;return `<div class="chart-headline"><b>近120个交易日</b><span>${V(vals[vals.length-1])}</span></div><div class="chart-box"><svg viewBox="0 0 ${w} ${H}">${marks}<polyline fill="none" stroke="#1f1f1d" stroke-width="2.4" points="${pts}"/><circle cx="${X(a.length-1)}" cy="${Y(a[a.length-1].v)}" r="4" fill="#a83a32"/></svg></div><div class="legend"><span><i style="background:#ead0cc"></i>第一关注区</span><span><i style="background:#eee1bc"></i>更深回调区</span><span><i style="background:#64806a"></i>停止补仓</span>${h.cost?'<span><i style="background:#526f9a"></i>你的成本</span>':''}</div>`}

async function openDetail(code){
  clearInterval(detailTimer);const h=getHoldings().find(x=>x.code===code)||{},opp=findOpp(code);currentDetail={code,h,opp};q('#detailSheet').classList.remove('hidden');document.body.style.overflow='hidden';q('#detailTitle').textContent=opp?.name||h.name||('基金 '+code);q('#detailSubtitle').textContent=code;q('#detailBody').innerHTML='<div class="loading-card">正在读取最新数据…</div>';
  try{const f=await fund(code);saveIntradaySample(code,f);const s=stat(f),d=adjustedDecision(f,s,h);currentDetail={code,h,opp,f,s,d};q('#detailTitle').textContent=f.name;renderDetail(currentDetail);if(['session','decision'].includes(marketCtx().phase)){detailTimer=setInterval(async()=>{if(!currentDetail||currentDetail.code!==code)return;try{const nf=await fund(code);saveIntradaySample(code,nf);const ns=stat(nf),nd=adjustedDecision(nf,ns,h);currentDetail={code,h,opp,f:nf,s:ns,d:nd};renderDetail(currentDetail)}catch{}},10*60*1000)}}catch(e){q('#detailBody').innerHTML=`<div class="error-card">${esc(e.message||e)}<br>这次数据取不到时，不根据旧数据给新的买卖建议。</div>`}
}
function closeDetail(){clearInterval(detailTimer);detailTimer=null;q('#detailSheet').classList.add('hidden');document.body.style.overflow='';currentDetail=null}
function renderDetail(o){const {code,h,opp,f,s,d}=o,live=liveEstimate(f),ref=live??s.last,pnl=h.cost?((ref/h.cost)-1)*100:h.pnl;q('#detailBody').innerHTML=`<div class="detail-card action"><span class="eyebrow" style="color:#d8b2ad">当前结论</span><div class="detail-key">${esc(d.action)}</div><p>${esc(d.why)}</p><p><b>下一步：</b>${esc(d.how)}</p></div><div class="detail-card"><h3>今天的数据</h3><div class="detail-grid"><div><span>最新正式净值</span><b>${V(s.last)}</b><small>${esc(formalDate(f))}</small></div><div><span>盘中估算</span><b class="${live!==null?'live-dot':''}">${live!==null?V(live):'—'}</b><small>${isEstimateSameDay(f)?esc(String(f.est.gztime)):'当前无当日估算'}</small></div><div><span>你的成本</span><b>${h.cost?V(h.cost):'未填写'}</b></div><div><span>估算盈亏</span><b>${pnl==null?'—':P(pnl)}</b></div></div><p class="small-note">正式净值和盘中估算分开显示；盘中估算只用于判断位置，不是最终成交净值。</p></div><div class="detail-card">${intradayChart(code,f)}</div><div class="detail-card">${historyChart(f,s,h)}</div><div class="detail-card"><h3>如果还没买</h3><p><b>第一关注区：</b>${V(s.near[0])}～${V(s.near[1])}</p><p><b>更深回调区：</b>${V(s.deep[0])}～${V(s.deep[1])}</p><p><b>停止补仓参考：</b>${V(s.stop)} 以下先停手。</p><p>${esc(s.eta||'先等更舒服的位置。')}</p></div><div class="detail-card"><h3>如果已经买了</h3>${sellText(s,h,pnl)}</div>${profileHtml(opp,f)}<div class="detail-card"><h3>风险</h3><p><b>近一年最大回撤：</b>${P(s.maxdd250)}</p><p>${esc(riskText(s))}</p><p><b>历史持有约半年正收益频率：</b>${s.prob120==null?'—':Number(s.prob120).toFixed(0)+'%'}（仅代表过去）</p></div><div class="detail-card"><p class="small-note">研究辅助，不保证收益。买卖前仍应查看销售平台的申购/赎回状态、确认时间和实际费用。</p></div>`}
function sellText(s,h,pnl){let x='';if(h.cost)x+=`<p><b>你的成本：</b>${V(h.cost)}，当前参考约 ${pnl==null?'—':P(pnl)}。</p>`;if(pnl!=null&&pnl>=50)x+='<p><b>盈利已经很厚：</b>重点改成保护利润。再次快速上涨时，可以先减25%～30%，剩余继续跟踪。</p>';else if(pnl!=null&&pnl>=20)x+='<p><b>已经有明显盈利：</b>如果短期涨得很快，可以先卖20%～25%，不必一次卖光。</p>';else if(pnl!=null&&pnl<0)x+='<p><b>如果在亏：</b>不能因为亏了就一直补。趋势偏弱时先保护剩余资金。</p>';else x+='<p>盈利以后逐步建立利润保护，不要等从赚变亏才想卖。</p>';x+=`<p><b>趋势保护参考：</b>跌破约 ${V(s.stop)} 且中期趋势转弱，需要重新评估减仓或退出。</p>`;return x}
function profileHtml(opp,f){const p=opp?.deep_analysis,hs=p?.holdings?.top_holdings;if(!opp)return `<div class="detail-card"><h3>基金档案</h3><p><b>基金经理：</b>${esc(f.mgr||'暂未读到')}</p><p class="small-note">这只不是当前核心机会池成员，所以暂时没有服务器端完整的定期报告档案。</p></div>`;return `<div class="detail-card"><h3>基金经理和主要持仓</h3><p><b>基金经理：</b>${esc(opp.profile?.manager||f.mgr||'—')}</p>${hs?.length?`<p><b>${esc(p.holdings.quarter||'最新定期报告')}：</b></p><div class="holding-table">${hs.slice(0,10).map((x,i)=>`<div class="holding-row"><span>${i+1}. ${esc(x.name)}</span><b>${Number(x.weight||0).toFixed(2)}%</b></div>`).join('')}</div><p class="small-note">前十大持仓来自定期报告，不是实时持仓。</p>`:'<p>最新前十大持仓暂未取到。</p>'}</div>`}

function goPage(name){qa('.page').forEach(x=>x.classList.remove('active'));qa('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.page===name));q(`#page-${name}`).classList.add('active');window.scrollTo({top:0,behavior:'smooth'});if(name==='holdings')renderHoldings();if(name==='discover'){renderCandidates();renderRecommendHistory();refreshCandidateStatuses()}}
function wireGo(){qa('[data-go]').forEach(b=>b.onclick=()=>{goPage(b.dataset.go);if(b.hasAttribute('data-open-add'))setTimeout(openAdd,80)})}
function wireDetailButtons(){qa('[data-detail]').forEach(b=>b.onclick=()=>openDetail(b.dataset.detail))}
async function searchFund(){const raw=q('#searchCode').value.trim();if(!raw)return alert('请先输入基金代码或名称');if(/^\d{6}$/.test(raw)){openDetail(raw);return}const matches=dailyCatalog.filter(x=>String(x.name||'').includes(raw)).slice(0,8);if(!matches.length){q('#searchResult').innerHTML='<div class="error-card">没有按名称找到。可以换一个更短的基金名称，或者直接输入6位代码。</div>';return}q('#searchResult').innerHTML=`<div class="history-panel"><b>找到这些基金：</b>${matches.map(x=>`<button class="btn secondary name-match" data-code="${esc(x.code)}" style="margin-top:8px">${esc(x.name)} · ${esc(x.code)}</button>`).join('')}</div>`;qa('.name-match').forEach(b=>b.onclick=()=>openDetail(b.dataset.code))}
function setupVoice(){q('#voiceSearch').onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return alert('当前浏览器暂时不支持语音输入。');const r=new SR();r.lang='zh-CN';r.interimResults=false;q('#voiceSearch').textContent='正在听…';r.onresult=e=>{const t=e.results[0][0].transcript||'',m=t.match(/\d{6}/);q('#searchCode').value=m?m[0]:t;q('#voiceSearch').textContent='语音'};r.onerror=r.onend=()=>q('#voiceSearch').textContent='语音';r.start()}}
function schedule(){clearInterval(holdingTimer);clearInterval(countdownTimer);if(['session','decision'].includes(marketCtx().phase)){holdingTimer=setInterval(()=>{if(getHoldings().length)generateReports(false);renderToday()},30*60*1000)}countdownTimer=setInterval(()=>{q('#nextRefresh').textContent=nextAutoText()},60*1000)}
function setup(){
  document.body.dataset.release=RELEASE;qa('.nav-item').forEach(b=>b.onclick=()=>goPage(b.dataset.page));wireGo();q('#helpBtn').onclick=()=>{q('#helpSheet').classList.remove('hidden');document.body.style.overflow='hidden'};qa('[data-close-help]').forEach(x=>x.onclick=()=>{q('#helpSheet').classList.add('hidden');document.body.style.overflow=''});qa('[data-close-sheet]').forEach(x=>x.onclick=closeDetail);q('#detailRefresh').onclick=()=>currentDetail&&openDetail(currentDetail.code);q('#openAddHolding').onclick=openAdd;q('#closeAddHolding').onclick=closeAdd;q('#identifyHolding').onclick=identifyHolding;q('#saveHolding').onclick=saveHolding;q('#refreshHoldings').onclick=()=>generateReports(false);q('#refreshToday').onclick=async()=>{renderToday();if(getHoldings().length)await generateReports(false);if(['session','decision'].includes(marketCtx().phase))await refreshCandidateStatuses();renderToday()};qa('#pnlSeg button').forEach(b=>b.onclick=()=>{pnlMode=b.dataset.pnl;qa('#pnlSeg button').forEach(x=>x.classList.toggle('active',x===b));q('#hPnl').classList.toggle('hidden',pnlMode==='unknown')});q('#searchFundBtn').onclick=searchFund;qa('.quick-grid button').forEach(b=>b.onclick=()=>q('#searchQuestion').value=b.textContent);setupVoice();renderHoldings();renderToday();schedule();
}
setup();loadBase().then(()=>{renderHoldings();renderToday();renderCandidates();renderRecommendHistory();if(getHoldings().length&&['session','decision'].includes(marketCtx().phase))generateReports(false)});
})();
