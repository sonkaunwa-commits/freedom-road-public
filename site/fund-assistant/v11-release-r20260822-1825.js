/* Fund assistant V11 unified release layer: one source of truth for closed-market safety, buttons, version and visual decoration. */
(()=>{
  const VERSION='08/22 18:25';
  const RELEASE='FUND_ASSISTANT_UI_20260822_1825';
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
  document.body.dataset.release=RELEASE;

  if(typeof window.budgetPlan==='function'&&!window.__fundV11BudgetWrapped){
    window.__fundV11BudgetWrapped=true;
    const raw=window.budgetPlan;
    window.budgetPlan=function(budget,action){const c=ctx();if(!c.open&&budget&&Number(budget)>0){const b=Number(budget),first=Math.round(b*.25/100)*100,second=first,reserve=Math.max(0,b-first-second);return `今天休市，先买 0 元。下一交易日（${c.nextShort}）开市后再更新；如果届时仍满足条件，第一笔再考虑约 ${first.toLocaleString()} 元，第二笔约 ${second.toLocaleString()} 元，至少保留 ${reserve.toLocaleString()} 元备用。`}return raw(budget,action)};
  }

  function saveOriginal(el,html=false){if(!el)return;if(html){if(el.dataset.v11Html===undefined)el.dataset.v11Html=el.innerHTML}else if(el.dataset.v11Text===undefined)el.dataset.v11Text=el.textContent}
  function restore(el,html=false){if(!el)return;if(html&&el.dataset.v11Html!==undefined){el.innerHTML=el.dataset.v11Html;delete el.dataset.v11Html}else if(!html&&el.dataset.v11Text!==undefined){el.textContent=el.dataset.v11Text;delete el.dataset.v11Text}}
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
    const map=[
      ['#auditPortfolio','🩺 点击检查我的基金搭配'],['#save','💾 点击保存并开始跟踪'],
      ['.btn.look',c.open?`↻ 点击更新 ${c.short} 情况`:'↻ 点击查看最近交易日情况'],
      ['.btn.refresh',c.open?`↻ 点击更新 ${c.short} 情况`:'↻ 点击查看最近交易日情况'],
      ['.btn.check',c.open?`📊 点击更新 ${c.short} 持有 / 卖出建议`:'📊 点击查看下一交易日持有 / 卖出准备'],
      ['.btn.bought','✍️ 已买入？点这里填写持仓'],['.btn.saveb','保存预算'],['.btn.del','删除这只'],['.btn.delw','移出关注']
    ];
    map.forEach(([sel,text])=>document.querySelectorAll(sel).forEach(el=>{if(el.textContent!==text)el.textContent=text}));
    document.querySelectorAll('.btn.add').forEach(b=>{const t=/已设为|已加入/.test(b.textContent)?'✓ 已设为我的关注':'⭐ 点这里设为我的关注';if(b.textContent!==t)b.textContent=t});
    const go=document.querySelector('#go');if(go)go.textContent=c.open?`🧭 点击查看 ${c.short} 怎么做`:'🧭 点击查看最近交易日参考';
    document.querySelectorAll('.answer .a1').forEach(el=>{const t=c.open?`今日建议 · ${c.full}`:`休市日参考 · ${c.full}`;if(el.textContent!==t)el.textContent=t});
    document.querySelectorAll('.answer .a3 b').forEach(el=>{if(/今天怎么做|下一交易日怎么做|\d+月\d+日怎么做/.test(el.textContent)){const t=c.open?`${c.short}怎么做：`:'下一交易日怎么做：';if(el.textContent!==t)el.textContent=t}});
  }

  function addGuide(){const tabs=document.querySelector('.tabs');if(!tabs||document.querySelector('.tap-guide'))return;const d=document.createElement('div');d.className='tap-guide';d.innerHTML='<b>怎么操作：</b><span class="primary-demo">深红色大按钮</span>＝最重要、可以直接点；<span class="secondary-demo">白底红框</span>＝辅助操作；浅色提示框只是给你看，不需要点。';tabs.insertAdjacentElement('afterend',d)}
  function markClickable(){document.querySelectorAll('.fund .buttons').forEach(box=>{if(box.nextElementSibling?.classList?.contains('click-note'))return;const n=document.createElement('div');n.className='click-note';n.textContent='↑ 上面的按钮可以点击';box.insertAdjacentElement('afterend',n)})}

  function applyTip(c){
    const tip=document.querySelector('#todayTip');if(!tip)return;
    if(!c.open){setHtml(tip,`<b>${c.short} · ${c.reason}休市</b><br>今天不买、不卖，也不把最近交易日的数据写成“今天可以买”。现在只做复盘和准备。<br><b>下一交易日：${c.nextFull}</b>，开市后再更新一次。`);tip.classList.add('show','closed-tip')}
    else {tip.classList.remove('closed-tip');restore(tip,true)}
  }

  function updateVersion(){
    let v=document.querySelector('.ui-version');
    if(!v){const state=document.querySelector('#state');if(state){v=document.createElement('div');v.className='ui-version';state.insertAdjacentElement('afterend',v)}}
    if(v){v.dataset.release=RELEASE;if(v.textContent!==`界面版本 ${VERSION}`)v.textContent=`界面版本 ${VERSION}`}
    document.body.dataset.release=RELEASE;
  }

  let pending=false;
  function run(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;const c=ctx();decoratePool();decorateExpanded(c);applyButtons(c);applyTip(c);addGuide();markClickable();document.querySelectorAll('.fund').forEach(card=>c.open?restoreCard(card):applyClosedCard(card,c));updateVersion()})}
  run();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
})();
