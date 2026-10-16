/* Trading-day guard for the fund assistant. China/SSE calendar, 2026. */
(()=>{
  const HOLIDAYS_2026=new Set([
    '2026-01-01','2026-01-02','2026-01-03','2026-01-04',
    '2026-02-14','2026-02-15','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-22','2026-02-23','2026-02-28',
    '2026-04-04','2026-04-05','2026-04-06',
    '2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05','2026-05-09',
    '2026-06-19','2026-06-20','2026-06-21',
    '2026-09-20','2026-09-25','2026-09-26','2026-09-27',
    '2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07','2026-10-10'
  ]);
  function bjParts(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(now);
    const o={};parts.forEach(p=>o[p.type]=p.value);
    return {y:+o.year,m:+o.month,d:+o.day,weekday:o.weekday,key:`${o.year}-${o.month}-${o.day}`};
  }
  function noonDate(y,m,d){return new Date(Date.UTC(y,m-1,d,4,0,0));}
  function isTradingDay(date){const p=bjParts(date),wd=p.weekday;return wd!=='Sat'&&wd!=='Sun'&&!HOLIDAYS_2026.has(p.key);}
  function nextTradingDay(date){let d=new Date(date);for(let i=0;i<20;i++){d=new Date(d.getTime()+86400000);if(isTradingDay(d))return d;}return d;}
  function prevTradingDay(date){let d=new Date(date);for(let i=0;i<20;i++){d=new Date(d.getTime()-86400000);if(isTradingDay(d))return d;}return d;}
  function addMarketTradingDays(base,n){let d=new Date(base),left=n;if(left===0&&isTradingDay(d))return d;if(left===0&&!isTradingDay(d))return nextTradingDay(d);while(left>0){d=new Date(d.getTime()+86400000);if(isTradingDay(d))left--;}return d;}
  function fmtCN(date,full=false){const p=bjParts(date);return full?`${p.y}年${p.m}月${p.d}日`:`${p.m}月${p.d}日`;}
  function reason(date){const p=bjParts(date);if(p.weekday==='Sat')return '周六';if(p.weekday==='Sun')return '周日';if(HOLIDAYS_2026.has(p.key))return '交易所休市日';return '交易日';}
  function ctx(){const p=bjParts(),today=noonDate(p.y,p.m,p.d),open=isTradingDay(today),next=open?today:nextTradingDay(today),prev=prevTradingDay(today);return {open,today,next,prev,reason:reason(today),full:fmtCN(today,true),short:fmtCN(today),nextShort:fmtCN(next),nextFull:fmtCN(next,true),prevShort:fmtCN(prev)};}
  window.FundMarket={ctx,isTradingDay,nextTradingDay,prevTradingDay,addTradingDays:addMarketTradingDays,fmtCN};

  try{window.addTradingDays=addMarketTradingDays}catch{}
  try{window.forecastWindow=function(s){if(!s.etaDays)return null;const c=ctx(),[lo,hi]=s.etaDays;return {lo,hi,start:addMarketTradingDays(c.today,lo),end:addMarketTradingDays(c.today,hi)};}}catch{}

  if(typeof window.stat==='function'){
    const rawStat=window.stat;
    window.stat=function(f){const s=rawStat(f),c=ctx();if(!c.open){s.marketClosed=true;s.marketClosedReason=c.reason;s.nextTradingDate=c.nextFull;s.originalAction=s.action;s.originalHow=s.how;s.action='休市日，不需要操作';s.tone='wait';s.why=`今天是${c.reason}，A股市场休市。页面只用最近交易日的数据做准备参考。`;s.how=`今天不做买卖。下一交易日（${c.nextShort}）开市后再更新一次；如果仍接近合适位置，再在交易日下午2:20左右决定。`;if(s.etaDays&&s.etaDays[0]===0)s.eta=`最近交易日数据已经接近参考位置，但今天休市。下一交易日（${c.nextShort}）再确认，不把休市日当成买点。`;}
      return s;};
  }
  if(typeof window.budgetPlan==='function'){
    const rawBudget=window.budgetPlan;
    window.budgetPlan=function(budget,action){const c=ctx();if(!c.open&&budget&&budget>0){const first=Math.round(budget*.25/100)*100,second=first,reserve=budget-first-second;return `今天休市，先买 0 元。下一交易日（${c.nextShort}）再判断；如果届时仍满足条件，第一笔大约 ${first.toLocaleString()} 元，第二笔再约 ${second.toLocaleString()} 元，至少留 ${reserve.toLocaleString()} 元备用。`;}
      return rawBudget(budget,action);};
  }
  if(typeof window.decisionHtml==='function'){
    const rawDecision=window.decisionHtml;
    window.decisionHtml=function(f,s,opts={}){const c=ctx();let html=rawDecision(f,s,opts);if(!c.open){html=html.replace(/今天最简单的结论/g,`休市日参考 · ${c.full}`).replace(/今日建议\s*·\s*[^<]+/g,`休市日参考 · ${c.full}`).replace(/今天怎么做：/g,'下一交易日怎么做：').replace(/今天不操作/g,'今天休市，不操作').replace(/下午2:20左右如果还在这个位置/g,`下一交易日（${c.nextShort}）下午2:20左右如果仍在这个位置`);}
      return html;};
  }

  function applyClosedUI(){const c=ctx();if(c.open)return;
    const tip=document.querySelector('#todayTip');if(tip){const html=`<b>${c.short} · ${c.reason}休市：</b>今天只做学习、复盘和准备，不做买卖判断。下一交易日是 <b>${c.nextFull}</b>。QDII等特殊基金申赎安排以销售平台公告为准。`;tip.classList.add('show');if(tip.innerHTML!==html)tip.innerHTML=html;}
    document.querySelectorAll('#pool .tag').forEach(t=>{t.dataset.normal=t.dataset.normal||t.textContent;if(t.textContent!=='休市 · 下个交易日再看')t.textContent='休市 · 下个交易日再看';t.classList.remove('buy','stop');t.classList.add('wait');});
    document.querySelectorAll('#pool .source').forEach(s=>{if(!s.dataset.closedNote){s.dataset.closedNote='1';s.innerHTML=`<b>休市说明：</b>${c.full}不做“今天买/卖”判断；以下内容用于准备下一交易日。<br>`+s.innerHTML;}});
    document.querySelectorAll('.answer .a1').forEach(el=>{const txt=`休市日参考 · ${c.full}`;if(el.textContent!==txt)el.textContent=txt;});
    document.querySelectorAll('.answer .a3 b').forEach(el=>{if(/今天怎么做|\d+月\d+日怎么做/.test(el.textContent)&&el.textContent!=='下一交易日怎么做：')el.textContent='下一交易日怎么做：';});
  }
  let pending=false;function run(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;applyClosedUI();});}
  run();new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
})();
