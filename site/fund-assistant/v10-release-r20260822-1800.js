/* Fund assistant V10 release layer: closed-market safety + clearer card/detail hierarchy. */
(()=>{
  const RELEASE='20260822-1800';
  const HOLIDAYS=new Set(['2026-01-01','2026-01-02','2026-02-16','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-23','2026-04-06','2026-05-01','2026-05-04','2026-05-05','2026-06-19','2026-09-25','2026-10-01','2026-10-02','2026-10-05','2026-10-06','2026-10-07']);
  const parts=(d=new Date())=>{const a=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).formatToParts(d),o={};a.forEach(x=>o[x.type]=x.value);return {y:+o.year,m:+o.month,d:+o.day,w:o.weekday,key:`${o.year}-${o.month}-${o.day}`}};
  const noon=p=>new Date(Date.UTC(p.y,p.m-1,p.d,4));
  const isTradingDay=d=>{const p=parts(d);return p.w!=='Sat'&&p.w!=='Sun'&&!HOLIDAYS.has(p.key)};
  const step=(d,dir)=>{let x=new Date(d);for(let i=0;i<25;i++){x=new Date(x.getTime()+dir*86400000);if(isTradingDay(x))return x}return x};
  const addTradingDays=(base,n)=>{let d=new Date(base);if(n===0)return isTradingDay(d)?d:step(d,1);let left=n;while(left>0){d=new Date(d.getTime()+86400000);if(isTradingDay(d))left--}return d};
  const fmt=(d,full=false)=>{const p=parts(d);return full?`${p.y}年${p.m}月${p.d}日`:`${p.m}月${p.d}日`};
  const reason=d=>{const p=parts(d);if(p.w==='Sat')return '周六';if(p.w==='Sun')return '周日';if(HOLIDAYS.has(p.key))return '交易所休市日';return '交易日'};
  const ctx=()=>{const p=parts(),today=noon(p),open=isTradingDay(today),next=open?today:step(today,1),prev=step(today,-1);return {open,today,next,prev,reason:reason(today),full:fmt(today,true),short:fmt(today),nextFull:fmt(next,true),nextShort:fmt(next),prevFull:fmt(prev,true),prevShort:fmt(prev)}};

  window.FundMarket={ctx,isTradingDay,nextTradingDay:d=>step(d,1),prevTradingDay:d=>step(d,-1),addTradingDays,fmtCN:fmt};
  window.addTradingDays=addTradingDays;
  window.forecastWindow=function(s){if(!s||!s.etaDays)return null;const c=ctx(),[lo,hi]=s.etaDays;return {lo,hi,start:addTradingDays(c.today,lo),end:addTradingDays(c.today,hi)}};

  if(typeof window.budgetPlan==='function'&&!window.__fundV10BudgetWrapped){
    window.__fundV10BudgetWrapped=true;
    const raw=window.budgetPlan;
    window.budgetPlan=function(budget,action){const c=ctx();if(!c.open&&budget&&Number(budget)>0){const b=Number(budget),first=Math.round(b*.25/100)*100,second=first,reserve=Math.max(0,b-first-second);return `今天休市，先买 0 元。下一交易日（${c.nextShort}）开市后再更新；如果届时仍满足条件，第一笔再考虑约 ${first.toLocaleString()} 元，第二笔约 ${second.toLocaleString()} 元，至少保留 ${reserve.toLocaleString()} 元备用。`}return raw(budget,action)};
  }

  function saveOriginal(el,html=false){if(!el)return;if(html){if(el.dataset.v10Html===undefined)el.dataset.v10Html=el.innerHTML}else if(el.dataset.v10Text===undefined)el.dataset.v10Text=el.textContent}
  function restore(el,html=false){if(!el)return;if(html&&el.dataset.v10Html!==undefined){el.innerHTML=el.dataset.v10Html;delete el.dataset.v10Html}else if(!html&&el.dataset.v10Text!==undefined){el.textContent=el.dataset.v10Text;delete el.dataset.v10Text}}
  function setText(el,text){if(!el)return;saveOriginal(el,false);if(el.textContent!==text)el.textContent=text}
  function setHtml(el,html){if(!el)return;saveOriginal(el,true);if(el.innerHTML!==html)el.innerHTML=html}

  function applyClosedCard(card,c){
    if(!card)return;
    card.classList.add('market-closed-card');
    const tag=card.querySelector('.tag');if(tag){setText(tag,'休市 · 下个交易日再看');tag.classList.remove('buy','stop');tag.classList.add('wait')}
    const ans=card.querySelector('.answer');
    if(ans){ans.classList.remove('buy','stop');ans.classList.add('wait');
      setText(ans.querySelector('.a1'),`休市日参考 · ${c.full}`);
      setText(ans.querySelector('.a2'),'今天休市，不操作');
      const a3=ans.querySelectorAll('.a3');
      if(a3[0])setText(a3[0],`今天是${c.reason}，不把最近交易日的数据误当成今天可以买。现在只做复盘和下一交易日准备。`);
      if(a3[1])setHtml(a3[1],`<b>下一交易日怎么做：</b>${c.nextFull} 开市后先更新最新净值；如果位置仍合适，再到交易日下午2:20左右决定是否分批买、继续等或减仓。`);
    }
    card.querySelectorAll('.protect').forEach(el=>{if(/按你的预算怎么分|预算/.test(el.textContent||''))setHtml(el,`<b>休市日预算提醒：</b><br>今天买入金额：<b>0元</b>。下一交易日（${c.nextShort}）重新判断以后再决定第一笔，不在休市日提前下结论。`)});
    const eta=card.querySelector('.eta');if(eta)setHtml(eta,`<b>休市日怎么看时间？</b><br>今天不算买点。下一交易日是 ${c.nextFull}；开市后再根据最新净值重新估算未来1～4周的关注窗口。`);
  }

  function restoreCard(card){
    card.classList.remove('market-closed-card');
    const els=[card.querySelector('.tag'),card.querySelector('.answer .a1'),card.querySelector('.answer .a2'),...card.querySelectorAll('.answer .a3'),...card.querySelectorAll('.protect'),card.querySelector('.eta')].filter(Boolean);
    els.forEach(el=>{restore(el,true);restore(el,false)});
  }

  function decoratePool(){
    const cards=[...document.querySelectorAll('#pool .fund')];
    cards.forEach((card,i)=>{for(let n=1;n<=6;n++)card.classList.remove(`fund-tone-${n}`);card.classList.add(`fund-tone-${i%6+1}`);const num=card.querySelector('.num');if(num)num.classList.add('v10-num')});
  }

  function decorateExpanded(c){
    const cards=[...document.querySelectorAll('.live > .fund,#result > .fund')];
    cards.forEach(card=>{
      card.classList.add('analysis-expanded');
      let banner=card.querySelector(':scope > .analysis-fresh');
      if(!banner){banner=document.createElement('div');banner.className='analysis-fresh';card.insertBefore(banner,card.firstChild)}
      banner.innerHTML=c.open?`<b>刚刚更新的分析 · ${c.full}</b><span>先看结论，再看“为什么”和下一步。</span>`:`<b>休市日参考 · ${c.full}</b><span>今天不做买卖，下面用于准备 ${c.nextShort}。</span>`;
    });
  }

  function applyButtons(c){
    const mapping=[['.btn.look',c.open?`↻ 点击更新 ${c.short} 情况`:'↻ 点击查看最近交易日情况'],['.btn.refresh',c.open?`↻ 点击更新 ${c.short} 情况`:'↻ 点击查看最近交易日情况'],['.btn.check',c.open?`📊 点击更新 ${c.short} 持有 / 卖出建议`:'📊 点击查看下一交易日持有 / 卖出准备']];
    mapping.forEach(([sel,text])=>document.querySelectorAll(sel).forEach(el=>{if(el.textContent!==text)el.textContent=text}));
    const go=document.querySelector('#go');if(go)go.textContent=c.open?`🧭 点击查看 ${c.short} 怎么做`:'🧭 点击查看最近交易日参考';
  }

  function applyTip(c){
    const tip=document.querySelector('#todayTip');if(!tip)return;
    if(!c.open){setHtml(tip,`<b>${c.short} · ${c.reason}休市</b><br>今天不买、不卖，也不把最近交易日的数据写成“今天可以买”。现在只做复盘和准备。<br><b>下一交易日：${c.nextFull}</b>，开市后再更新一次。`);tip.classList.add('show','closed-tip')}
    else {tip.classList.remove('closed-tip');restore(tip,true)}
  }

  function updateVersion(){const v=document.querySelector('.ui-version');if(v&&v.textContent!=='界面版本 08/22 18:00')v.textContent='界面版本 08/22 18:00'}

  let pending=false;
  function run(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;const c=ctx();decoratePool();decorateExpanded(c);applyButtons(c);applyTip(c);document.querySelectorAll('.fund').forEach(card=>c.open?restoreCard(card):applyClosedCard(card,c));updateVersion()})}
  run();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
})();
