(()=>{
'use strict';
const RELEASE='FUND_ASSISTANT_UI_20260827_2104';
const RESEARCH_URL='data/opportunity.json';
const INTRADAY_URL='data/intraday/latest.json';
let research=null;
let intraday=null;
let loading=null;
let applying=false;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>Number.isFinite(Number(v))?Number(v):null;
const fmt=(v,d=2)=>num(v)==null?'—':Number(v).toFixed(d);
const pct=v=>num(v)==null?'—':`${Number(v)>=0?'+':''}${Number(v).toFixed(1)}%`;

function bj(){
 const ps=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const o={};ps.forEach(x=>o[x.type]=x.value);
 return {key:`${o.year}-${o.month}-${o.day}`,w:o.weekday,h:+o.hour,min:+o.minute};
}
function phase(){const p=bj(),m=p.h*60+p.min;if(p.w==='Sat'||p.w==='Sun')return'closed';if(m<570)return'pre';if(m<=690)return'morning';if(m<780)return'lunch';if(m<=900)return'afternoon';return'after'}
function afterClose(){return phase()==='after'||phase()==='closed'}
function cnTime(s){if(!s)return'—';try{return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(s))}catch{return String(s)}}
function ageHours(s){const t=Date.parse(s||'');return Number.isFinite(t)?(Date.now()-t)/36e5:null}
function researchFreshLabel(){
 if(!research?.generated_at)return '研究数据更新时间未知';
 const age=ageHours(research.generated_at),at=cnTime(research.generated_at);
 if(age!=null&&age>24)return `研究数据截至 ${at} · 已超过24小时，等待下一次更新`;
 return `研究数据更新 ${at}`;
}
function detailCode(){return (q('#detailSubtitle')?.textContent||'').trim().match(/\d{6}/)?.[0]||''}
function fundFor(code){return research?.funds?.find(x=>String(x.code)===String(code))||null}

async function loadAll(force=false){
 if(loading&&!force)return loading;
 loading=Promise.all([
   fetch(`${RESEARCH_URL}?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null),
   fetch(`${INTRADAY_URL}?v=${Date.now()}`,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([r,i])=>{if(r)research=r;intraday=i;return [research,intraday]}).finally(()=>{loading=null});
 return loading;
}

function zone(f,n){const z=f?.history?.[`buy_zone_${n}`]||f?.buy_plan?.[`zone_${n}`];return Array.isArray(z)&&z.length>=2?[num(z[0]),num(z[1])]:[null,null]}
function stopLine(f){return num(f?.history?.stop_add_below??f?.buy_plan?.stop_add_below)}
function nav(f){return num(f?.history?.last_nav??f?.latest_nav)}
function classify(f){
 const n=nav(f),z1=zone(f,1),z2=zone(f,2),action=String(f?.today_plan?.action||f?.position||'');
 const inside=(z)=>n!=null&&z[0]!=null&&z[1]!=null&&n>=Math.min(...z)&&n<=Math.max(...z);
 if(inside(z1)||inside(z2)||/第一买入区|第二买入区|买入观察区/.test(action)) return {kind:'buy',label:'买入观察区'};
 const top=z1[1],dist=n!=null&&top!=null?(n-top)/top:null;
 if((dist!=null&&dist>0&&dist<=.035)||/接近|分批点|等买点|等待回调/.test(action))return {kind:'near',label:'接近买入区'};
 return {kind:'track',label:'机会池跟踪'};
}
function statusPhrase(f){
 const c=classify(f),stale=ageHours(research?.generated_at)>24;
 if(c.kind==='buy') return stale?`按最近研究数据：${c.label} · 下一交易日先复核`:(afterClose()?`收盘后仍在${c.label} · 下一交易日继续跟踪`:c.label);
 if(c.kind==='near') return stale?`按最近研究数据：${c.label} · 等待更新`:(afterClose()?`收盘后保持${c.label} · 下一交易日继续观察`:c.label);
 return c.label;
}

function annotateCandidates(){
 if(!research?.funds?.length)return;
 qa('#candidateList [data-candidate]').forEach((card,i)=>{
   const f=research.funds[i];if(!f)return;
   const c=classify(f);card.classList.remove('v154-buy','v154-near','v154-track');card.classList.add(`v154-${c.kind}`);
   let badge=q('.v154-pool-badge',card);if(!badge){badge=document.createElement('div');badge.className='v154-pool-badge';card.prepend(badge)}
   const bh=`<b>${esc(c.label)}</b><span>${esc(statusPhrase(f))}</span>`;if(badge.innerHTML!==bh)badge.innerHTML=bh;
 });
 const sum=q('#opportunitySummary');if(sum){
   const buys=research.funds.filter(x=>classify(x).kind==='buy').length,near=research.funds.filter(x=>classify(x).kind==='near').length;
   let box=q('.v154-opportunity-radar',sum);if(!box){box=document.createElement('div');box.className='v154-opportunity-radar';sum.appendChild(box)}
   const oh=`<div><b>${buys}</b><span>买入观察区</span></div><div><b>${near}</b><span>接近买入区</span></div><p>${esc(researchFreshLabel())}</p>`;if(box.innerHTML!==oh)box.innerHTML=oh;
 }
 const intro=q('#page-discover .page-intro');if(intro){
   let s=q('.v154-research-fresh',intro);if(!s){s=document.createElement('div');s.className='v154-research-fresh';intro.appendChild(s)}
   s.textContent=researchFreshLabel();
 }
}

function replaceTrackingBars(){
 if(!research?.funds?.length)return;
 qa('#trackingStats .tracking-stat-card').forEach((card,i)=>{
   const f=research.funds[i];if(!f)return;
   q('.tracking-spark',card)?.remove();
   const hist=f?.tracking?.score_history||[],first=num(hist[0]?.score),last=num(hist[hist.length-1]?.score??f?.score),d=first!=null&&last!=null?last-first:null;
   let x=q('.v154-score-delta',card);if(!x){x=document.createElement('div');x.className='v154-score-delta';card.appendChild(x)}
   const delta=d==null?'记录不足':Math.abs(d)<.05?'较入池基本持平':`较入池 ${d>0?'↑':'↓'} ${Math.abs(d).toFixed(1)}分`;
   const dh=`<b>${esc(delta)}</b><span>${esc(classify(f).label)} · ${esc(f.today_plan?.action||f.position||'持续跟踪')}</span>`;if(x.innerHTML!==dh)x.innerHTML=dh;
 });
}

function removeDuplicates(body){
 const seen=new Map();
 qa('.detail-card,.forecast-card,.deep-analysis-card,.action-guide-card',body).forEach(card=>{
   const h=q('h3,h2,b',card);const title=(h?.textContent||'').trim().replace(/[？?：:]/g,'');if(!title)return;
   if(/未来走势怎么预估/.test(title)){card.remove();return}
   if(/评分预估/.test(title)){if(seen.has('评分预估'))card.remove();else seen.set('评分预估',card);return}
   if(seen.has(title)&&/评分|预估/.test(title))card.remove();else seen.set(title,card);
 });
}

function focusCard(f){
 const h=f?.history||{},n=nav(f),z1=zone(f,1),z2=zone(f,2),stop=stopLine(f),r=f?.returns||{};
 const trend=h.trend||'趋势待确认',dev=num(h.deviation60),over=!!h.overheat;
 const line=(z)=>z[0]!=null&&z[1]!=null?`${fmt(z[0],4)}–${fmt(z[1],4)}`:'待更新';
 let pos='当前位置待更新';
 if(n!=null&&z1[0]!=null&&z1[1]!=null){
   if(n>=z1[0]&&n<=z1[1])pos='最近正式净值位于第一买入观察区';
   else if(z2[0]!=null&&z2[1]!=null&&n>=z2[0]&&n<=z2[1])pos='最近正式净值位于第二买入观察区';
   else if(n>z1[1])pos=`最近正式净值高于第一观察区约 ${((n/z1[1]-1)*100).toFixed(1)}%`;
   else if(n<z2[0])pos='最近正式净值已低于第二观察区，先检查趋势是否失效';
 }
 const state=classify(f);
 return `<section class="v154-focus-card ${state.kind}">
   <div class="v154-card-kicker">未来1～4周 · 看条件，不猜涨跌</div>
   <div class="v154-focus-head"><div><h3>接下来重点看这几个位置</h3><p>${esc(pos)}；当前研究状态：${esc(statusPhrase(f))}。</p></div><span>${esc(state.label)}</span></div>
   <div class="v154-level-grid">
     <div class="primary"><span>第一观察区</span><b>${line(z1)}</b><small>趋势仍正常时，才考虑第一笔约20%–25%</small></div>
     <div><span>第二观察区</span><b>${line(z2)}</b><small>回撤更深但未失效，再考虑第二笔</small></div>
     <div class="risk"><span>停止加仓线</span><b>${stop==null?'待更新':fmt(stop,4)}</b><small>跌破后不是“越跌越补”，而是先重新评估</small></div>
   </div>
   <div class="v154-scenarios">
     <div><b>如果回到第一观察区</b><span>先确认60日趋势没有转弱，再分批，不一次买满。</span></div>
     <div><b>如果继续上涨</b><span>${over?'当前已有过热信号，优先避免追高。':`60日均线偏离 ${dev==null?'—':`${dev.toFixed(1)}%`}；未回到计划区前不因怕错过而追。`}</span></div>
     <div><b>如果跌破停止线</b><span>停止补仓，检查120日趋势、基金经理/持仓逻辑和市场环境是否发生变化。</span></div>
   </div>
   <div class="v154-metrics"><span>近1月 <b>${pct(r['1m'])}</b></span><span>近3月 <b>${pct(r['3m'])}</b></span><span>近6月 <b>${pct(r['6m'])}</b></span><span>近1年 <b>${pct(r['1y'])}</b></span><span>趋势 <b>${esc(trend)}</b></span></div>
   <p class="v154-fresh-note">${esc(researchFreshLabel())}。以上是条件式观察方案，不是收益预测，也不代表到价就必须买。</p>
 </section>`;
}

function profileCard(f){
 const d=f?.deep_analysis||{},o=d.overview||f?.profile||{},risk=d.risk||{},pp=d.profit_probability||{},hold=d.holdings||{},inds=d.industries||{},fees=d.redemption_fee||[];
 const hs=(hold.top_holdings||f?.profile?.holdings||[]).slice(0,5),is=(inds.items||f?.profile?.industries||[]).filter(x=>num(x.weight)>0).slice(0,4);
 const top10=num(hold.top10_concentration??f?.profile?.top10_concentration);
 const type=o.fund_type||f.category||'—',manager=o.manager||'—',company=o.company||'—',scale=o.asset_scale||o.share_scale||'—',founded=o['成立日期']||o.founded_date||'—',bench=o.benchmark||'—';
 let driver='主要跟随自身持仓行业景气、核心重仓股盈利与估值变化。';
 if(/QDII/i.test(type)||/QDII/i.test(f.name||''))driver='这是跨境基金，除了重仓公司本身，还会受海外市场、汇率、估值和时差影响；盘中估算误差通常也可能比普通A股基金更大。';
 else if(/股票/.test(type))driver='这是高权益仓位基金，核心驱动是重仓行业景气、公司盈利和市场风险偏好，净值波动通常会明显高于债券/固收类基金。';
 const feeText=fees.slice(0,2).map(x=>`${x['适用期限']||''} ${x['赎回费率']||''}`).filter(Boolean).join('；')||'具体以基金合同及销售平台为准';
 return `<section class="v154-profile-card">
   <details open><summary><div><span>基金画像</span><h3>这只基金到底是什么？</h3></div><i>展开 / 收起</i></summary>
   <div class="v154-profile-grid">
     <div><span>类型</span><b>${esc(type)}</b></div><div><span>基金经理</span><b>${esc(manager)}</b></div><div><span>基金公司</span><b>${esc(company)}</b></div><div><span>规模/份额</span><b>${esc(scale)}</b></div><div><span>成立时间</span><b>${esc(founded)}</b></div><div><span>综合机会分</span><b>${fmt(f.score,1)}</b></div>
   </div>
   <div class="v154-interpret"><b>怎么理解它</b><p>${esc(driver)}</p></div>
   <div class="v154-subsection"><b>业绩比较基准</b><p>${esc(bench)}</p></div>
   ${hs.length?`<div class="v154-subsection"><b>最新定期报告主要重仓</b><div class="v154-holdings">${hs.map(x=>`<span>${esc(x.name)} <i>${num(x.weight)==null?'':`${fmt(x.weight,1)}%`}</i></span>`).join('')}</div>${top10!=null?`<p>前十大持仓集中度约 <strong>${fmt(top10,1)}%</strong>。集中度越高，核心重仓股对净值影响越明显。</p>`:''}</div>`:''}
   ${is.length?`<div class="v154-subsection"><b>主要行业暴露</b><div class="v154-industries">${is.map(x=>`<span>${esc(x.name)} <i>${fmt(x.weight,1)}%</i></span>`).join('')}</div></div>`:''}
   <div class="v154-risk-grid">
      <div><span>近1年年化波动</span><b>${num(risk.annual_volatility)==null?'—':`${fmt(risk.annual_volatility,1)}%`}</b></div>
      <div><span>近1年最大回撤</span><b>${num(risk.max_drawdown)==null?'—':`${fmt(risk.max_drawdown,1)}%`}</b></div>
      <div><span>历史6个月正收益频率</span><b>${num(pp?.['6m']?.probability)==null?'—':`${fmt(pp['6m'].probability,0)}%`}</b></div>
      <div><span>历史1年正收益频率</span><b>${num(pp?.['1y']?.probability)==null?'—':`${fmt(pp['1y'].probability,0)}%`}</b></div>
   </div>
   <p class="v154-risk-note">历史正收益频率只是过往滚动样本统计，不是未来胜率。最大回撤和波动越高，越需要分批与仓位控制。</p>
   <div class="v154-subsection"><b>费用与持有注意</b><p>管理费 ${esc(o.management_fee||'—')}；托管费 ${esc(o.custody_fee||'—')}。赎回费示例：${esc(feeText)}。</p></div>
   <div class="v154-subsection strategy"><b>更实用的跟踪方法</b><p>短期看20日均线和第一观察区，中期看60日趋势是否保持，风险底线看120日结构/停止加仓线；基金经理、前十大重仓和行业暴露发生明显变化时，再重新判断这只基金是否还值得留在机会池。</p></div>
   </details>
 </section>`;
}

function intradayTruth(code){
 const today=bj().key,row=intraday?.trade_date===today?intraday?.funds?.find(x=>String(x.code)===code):null;
 if(row?.points?.length)return `服务器今天已记录 ${row.points.length} 个盘中采样点；页面优先使用服务器记录。`;
 if(intraday?.trade_date&&intraday.trade_date!==today)return `服务器最近盘中记录是 ${intraday.trade_date}，不是今天，页面不会把旧数据冒充今日实时。`;
 return '服务器全天盘中采集当前未形成今天的有效数据；页面里的盘中曲线仍只记录本机打开期间拿到的采样。';
}
function enhanceDetail(){
 const body=q('#detailBody'),code=detailCode();if(!body||!code)return;
 const f=fundFor(code),key=`${code}|${research?.generated_at||''}|${intraday?.trade_date||''}|${intraday?.funds?.find(x=>String(x.code)===code)?.points?.length||0}`;
 if(body.dataset.v154Key===key&&q(f?'.v154-signal-banner':'.v154-focus-card',body))return;
 body.dataset.v154Key=key;
 removeDuplicates(body);
 qa('.v154-focus-card,.v154-profile-card,.v154-signal-banner,.v154-intraday-truth',body).forEach(x=>x.remove());
 if(f){
   const banner=document.createElement('div'),c=classify(f);banner.className=`v154-signal-banner ${c.kind}`;banner.innerHTML=`<div><span>机会池状态</span><b>${esc(statusPhrase(f))}</b></div><p>${esc(researchFreshLabel())}。收盘后仍保留标记，方便下一交易日继续复核。</p>`;body.prepend(banner);
   qa('.deep-analysis-card',body).forEach(x=>x.remove());
   const action=qa('.action-guide-card',body).slice(-1)[0];const wrap=document.createElement('div');wrap.innerHTML=focusCard(f);(action||body.lastElementChild)?.after(wrap.firstElementChild);
   const pwrap=document.createElement('div');pwrap.innerHTML=profileCard(f);body.appendChild(pwrap.firstElementChild);
 } else {
   qa('.forecast-card',body).forEach(x=>x.remove());
   const note=document.createElement('section');note.className='v154-focus-card track';note.innerHTML='<div class="v154-card-kicker">未来走势</div><h3>这只基金暂未进入机会池</h3><p>没有经过当前机会池的完整技术位置计算时，不再用一套相同模板硬写“未来1～4周”。先看正式净值、历史趋势与风险；等数据完整后再给具体观察区。</p>';body.appendChild(note);
 }
 const truth=document.createElement('div');truth.className='v154-intraday-truth';truth.innerHTML=`<b>盘中数据说明</b><span>${esc(intradayTruth(code))}</span>`;
 const intradayCard=qa('.detail-card',body).find(x=>/实时参考走势|盘中估算走势/.test(x.textContent||''));if(intradayCard)intradayCard.appendChild(truth);else body.appendChild(truth);
}

function compactHeader(){
 const refresh=q('#detailRefresh'),close=q('#detailClose');
 if(refresh){refresh.className='v154-icon-btn refresh';if(refresh.innerHTML!=='<span aria-hidden="true">↻</span>')refresh.innerHTML='<span aria-hidden="true">↻</span>';refresh.setAttribute('title','更新数据');}
 if(close){close.className='v154-icon-btn close';if(close.innerHTML!=='<span aria-hidden="true">×</span>')close.innerHTML='<span aria-hidden="true">×</span>';close.setAttribute('title','关闭');}
}
function releaseMarker(){document.body.dataset.release=RELEASE;document.documentElement.dataset.fundUi='15.4'}

async function apply(force=false){
 if(applying)return;applying=true;
 try{await loadAll(force);releaseMarker();compactHeader();annotateCandidates();replaceTrackingBars();enhanceDetail()}finally{applying=false}
}
let t=null;function schedule(){clearTimeout(t);t=setTimeout(()=>apply(false),80)}
document.addEventListener('DOMContentLoaded',()=>{
 apply(false);
 const obs=new MutationObserver(schedule);['detailBody','candidateList','trackingStats','opportunitySummary'].forEach(id=>{const el=document.getElementById(id);if(el)obs.observe(el,{childList:true,subtree:true})});
 q('#detailRefresh')?.addEventListener('click',()=>setTimeout(()=>apply(true),700));
 q('#refreshToday')?.addEventListener('click',()=>setTimeout(()=>apply(true),700));
});
setTimeout(()=>apply(false),900);
})();
