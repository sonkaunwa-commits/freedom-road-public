/* Fund assistant trading-day guard, immutable release 2026-08-22 17:06 CST */
(()=>{
  const HOLIDAYS=new Set(['2026-01-01','2026-01-02','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-04-06','2026-05-01','2026-05-04','2026-05-05','2026-06-19','2026-09-25','2026-10-01','2026-10-02','2026-10-05','2026-10-06','2026-10-07']);
  const parts=(d=new Date())=>{const a=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(d),o={};a.forEach(x=>o[x.type]=x.value);return {y:+o.year,m:+o.month,d:+o.day,w:o.weekday,key:`${o.year}-${o.month}-${o.day}`}};
  const noon=p=>new Date(Date.UTC(p.y,p.m-1,p.d,4));
  const isOpen=d=>{const p=parts(d);return p.w!=='Sat'&&p.w!=='Sun'&&!HOLIDAYS.has(p.key)};
  const fmt=(d,full=false)=>{const p=parts(d);return full?`${p.y}年${p.m}月${p.d}日`:`${p.m}月${p.d}日`};
  const next=d=>{let x=new Date(d);for(let i=0;i<20;i++){x=new Date(x.getTime()+86400000);if(isOpen(x))return x}return x};
  const prev=d=>{let x=new Date(d);for(let i=0;i<20;i++){x=new Date(x.getTime()-86400000);if(isOpen(x))return x}return x};
  const add=(d,n)=>{let x=new Date(d),left=n;if(left===0&&!isOpen(x))return next(x);while(left>0){x=new Date(x.getTime()+86400000);if(isOpen(x))left--}return x};
  const ctx=()=>{const p=parts(),today=noon(p),open=isOpen(today),n=open?today:next(today);return {open,today,next:n,prev:prev(today),short:fmt(today),full:fmt(today,true),nextShort:fmt(n),nextFull:fmt(n,true),reason:p.w==='Sat'?'周六':p.w==='Sun'?'周日':HOLIDAYS.has(p.key)?'交易所休市日':'交易日'}};
  window.FundMarket={ctx,isTradingDay:isOpen,nextTradingDay:next,prevTradingDay:prev,addTradingDays:add,fmtCN:fmt};
  try{window.addTradingDays=add}catch{}
  try{window.forecastWindow=s=>{if(!s.etaDays)return null;const c=ctx(),[lo,hi]=s.etaDays;return {lo,hi,start:add(c.today,lo),end:add(c.today,hi)}}}catch{}
  if(typeof window.stat==='function'){
    const raw=window.stat;
    window.stat=f=>{const s=raw(f),c=ctx();if(!c.open){s.marketClosed=true;s.action='休市日，不需要操作';s.tone='wait';s.why=`${c.full}是${c.reason}，今天不做基金买卖判断。页面只用最近交易日数据做准备。`;s.how=`今天不买、不卖。下一交易日（${c.nextShort}）开市后再更新；如果仍接近合适位置，再在交易日下午2:20左右决定。`;if(s.etaDays&&s.etaDays[0]===0)s.eta=`最近交易日已接近参考位置，但今天休市。下一交易日（${c.nextShort}）再确认。`;}return s};
  }
  if(typeof window.budgetPlan==='function'){
    const raw=window.budgetPlan;
    window.budgetPlan=(budget,action)=>{const c=ctx();if(!c.open&&budget>0){const first=Math.round(budget*.25/100)*100,second=first,reserve=budget-first-second;return `今天休市，先买0元。下一交易日（${c.nextShort}）再判断；如果条件仍满足，第一笔约${first.toLocaleString()}元，第二笔再约${second.toLocaleString()}元，至少留${reserve.toLocaleString()}元备用。`}return raw(budget,action)};
  }
  if(typeof window.decisionHtml==='function'){
    const raw=window.decisionHtml;
    window.decisionHtml=(f,s,opts={})=>{const c=ctx();let html=raw(f,s,opts);if(!c.open){html=html.replace(/今天最简单的结论/g,`休市日参考 · ${c.full}`).replace(/今日建议\s*·\s*[^<]+/g,`休市日参考 · ${c.full}`).replace(/今天怎么做：/g,'下一交易日怎么做：').replace(/今天可以先买一点/g,'休市日，不需要操作').replace(/今天可以少买一点/g,'休市日，不需要操作');}return html};
  }
  function paint(){const c=ctx();if(c.open)return;const tip=document.querySelector('#todayTip');if(tip){tip.classList.add('show');tip.innerHTML=`<b>${c.short} · ${c.reason}休市：</b>今天只做学习、复盘和准备，不做买卖判断。下一交易日是 <b>${c.nextFull}</b>。`;}document.querySelectorAll('#pool .tag').forEach(t=>{t.textContent='休市 · 下个交易日再看';t.classList.remove('buy','stop');t.classList.add('wait')});document.querySelectorAll('.answer .a1').forEach(el=>el.textContent=`休市日参考 · ${c.full}`);document.querySelectorAll('.answer .a3 b').forEach(el=>{if(/今天怎么做|\d+月\d+日怎么做/.test(el.textContent))el.textContent='下一交易日怎么做：'});}
  let q=false;const run=()=>{if(q)return;q=true;requestAnimationFrame(()=>{q=false;paint()})};run();new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
})();
