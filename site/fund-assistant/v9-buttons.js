(()=>{
  const UI_VERSION='08/22 16:38';
  const now=new Date();
  const dateFull=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric'}).format(now);
  const dateShort=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'long',day:'numeric'}).format(now);
  const market=()=>window.FundMarket?.ctx?.()||{open:true,short:dateShort,full:dateFull,nextShort:'下一交易日'};
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
  function enhance(){
    const c=market();
    setText(document.querySelector('#auditPortfolio'),'🩺 点击检查我的基金搭配');
    setText(document.querySelector('#save'),'💾 点击保存并开始跟踪');
    setText(document.querySelector('#go'),c.open?`🧭 点击查看 ${dateShort} 怎么做`:'🧭 点击查看最近交易日参考');
    document.querySelectorAll('.btn.look').forEach(b=>setText(b,c.open?`点击更新 ${dateShort} 情况`:'点击查看最近交易日情况'));
    document.querySelectorAll('.btn.check').forEach(b=>setText(b,c.open?`点击更新 ${dateShort} 持有 / 卖出建议`:'点击查看下一交易日持有 / 卖出准备'));
    document.querySelectorAll('.btn.refresh').forEach(b=>setText(b,c.open?`点击更新 ${dateShort} 情况`:'点击查看最近交易日情况'));
    document.querySelectorAll('.btn.bought').forEach(b=>setText(b,'✍️ 已买入？点这里填写持仓'));
    document.querySelectorAll('.btn.saveb').forEach(b=>setText(b,'保存预算'));
    document.querySelectorAll('.btn.add').forEach(b=>{
      if(/已设为|已加入/.test(b.textContent)) setText(b,'✓ 已设为我的关注');
      else setText(b,'⭐ 点这里设为我的关注');
    });
    document.querySelectorAll('.btn.del').forEach(b=>setText(b,'删除这只'));
    document.querySelectorAll('.btn.delw').forEach(b=>setText(b,'移出关注'));
    document.querySelectorAll('.answer .a1').forEach(el=>{
      if(c.open){if(/今天最简单的结论|今日建议|休市日参考/.test(el.textContent)) setText(el,`今日建议 · ${dateFull}`);}
      else setText(el,`休市日参考 · ${dateFull}`);
    });
    document.querySelectorAll('.answer .a3 b').forEach(el=>{
      if(c.open){if(/今天怎么做|下一交易日怎么做|\d+月\d+日怎么做/.test(el.textContent))setText(el,`${dateShort}怎么做：`);}
      else if(/今天怎么做|下一交易日怎么做|\d+月\d+日怎么做/.test(el.textContent))setText(el,'下一交易日怎么做：');
    });
    if(c.open){document.querySelectorAll('.today-tip b').forEach(el=>{if(/今天/.test(el.textContent))setText(el,`${dateShort}提醒：`);});}
  }
  function addGuide(){
    const tabs=document.querySelector('.tabs');
    if(!tabs||document.querySelector('.tap-guide'))return;
    const d=document.createElement('div');
    d.className='tap-guide';
    d.innerHTML='<b>怎么操作：</b><span class="primary-demo">深红色大按钮</span>＝最重要、可以直接点；<span class="secondary-demo">白底红框</span>＝辅助操作；浅色提示框只是给你看，不需要点。';
    tabs.insertAdjacentElement('afterend',d);
  }
  function addVersion(){
    if(document.querySelector('.ui-version'))return;
    const state=document.querySelector('#state');
    if(!state)return;
    const v=document.createElement('div');
    v.className='ui-version';
    v.textContent=`界面版本 ${UI_VERSION}`;
    state.insertAdjacentElement('afterend',v);
  }
  function markClickable(){
    document.querySelectorAll('.fund .buttons').forEach(box=>{
      if(box.nextElementSibling?.classList?.contains('click-note'))return;
      const n=document.createElement('div');n.className='click-note';n.textContent='↑ 上面的按钮可以点击';box.insertAdjacentElement('afterend',n);
    });
  }
  let scheduled=false;
  function run(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;addVersion();addGuide();enhance();markClickable();});}
  run();
  const mo=new MutationObserver(run);mo.observe(document.body,{childList:true,subtree:true});
})();