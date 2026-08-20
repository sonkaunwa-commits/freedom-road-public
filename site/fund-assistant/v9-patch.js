/* V9 overrides: richer fund profile, annotated NAV chart, clearer forecast windows */
function profileHtml(profile, compact=false){
  if(!profile)return `<div class="profile-missing">基金档案将在下一次自动数据更新后补充；今天的净值和走势判断仍可正常使用。</div>`;
  const h=profile.holdings||[], inds=profile.industries||[], top=h.slice(0,compact?5:10);
  const basic=[profile.fund_type&&`类型：${profile.fund_type}`,profile.manager&&`经理：${profile.manager}`,profile.company&&`管理人：${profile.company}`,profile.asset_scale&&`规模：${profile.asset_scale}`,profile['成立日期']&&`成立：${profile['成立日期']}`].filter(Boolean);
  return `<div class="profile"><div class="profile-title">这只基金到底在买什么？</div><div class="profile-basic">${basic.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    ${top.length?`<div class="hold-title">最新披露前${top.length}大持仓 <small>${esc(profile.holdings_period||'')}</small></div><div class="holding-list">${top.map((x,i)=>`<div><b>${i+1}. ${esc(x.name)}</b><span>${x.weight!=null?Number(x.weight).toFixed(2)+'%':'—'}</span></div>`).join('')}</div>${profile.top10_concentration!=null?`<div class="concentration">前十大合计约 <b>${Number(profile.top10_concentration).toFixed(1)}%</b>。${profile.top10_concentration>=60?' 持仓比较集中，涨跌会更有弹性，也更容易大幅波动。':profile.top10_concentration>=40?' 集中度中等偏高，需要注意核心股票一起回调的风险。':' 相对分散一些，但仍要看行业是否集中。'}</div>`:''}`:''}
    ${inds.length?`<div class="industry-line"><b>主要行业：</b>${inds.slice(0,4).map(x=>`${esc(x.name)} ${Number(x.weight||0).toFixed(1)}%`).join(' · ')}</div>`:''}
    ${profile.benchmark?`<div class="profile-note"><b>业绩比较基准：</b>${esc(profile.benchmark)}</div>`:''}
    <div class="source">持仓来自基金定期报告，通常按季度披露，并不是今天的实时持仓；页面会标注披露期。</div></div>`;
}

function selectionWhyHtml(x){
  const rs=x.returns||{},p=x.profile||{},h=p.holdings||[];
  const bits=[];
  if(N(rs['6m'])!==null)bits.push(`<li><b>中期表现：</b>近6个月 ${P(N(rs['6m']))}；这是综合评分权重最高的一项，用来判断它是不是只有短期突然走红。</li>`);
  if(N(rs['1y'])!==null)bits.push(`<li><b>长期持续性：</b>近1年 ${P(N(rs['1y']))}；用来判断过去一年的竞争力是否还能延续到更长观察周期。</li>`);
  if(N(rs['1m'])!==null)bits.push(`<li><b>最近位置：</b>近1个月 ${P(N(rs['1m']))}；涨太快会被扣分，跌太急也不会因为“便宜”自动加分。</li>`);
  if(h.length){const names=h.slice(0,3).map(z=>z.name).join('、');bits.push(`<li><b>主要押注：</b>最新披露的核心持仓包括 ${esc(names)}${p.top10_concentration!=null?`，前十大约占 ${Number(p.top10_concentration).toFixed(1)}%`:''}。这能帮助判断它真正赚的是哪一类行情。</li>`)}
  if(p.manager)bits.push(`<li><b>基金经理：</b>${esc(p.manager)}。基金经理和持仓会继续跟踪；如果发生明显换人或风格变化，需要重新评估。</li>`);
  bits.push(`<li><b>今天能不能买仍要另算：</b>“选进来”只代表未来6～12个月值得继续研究，不代表今天就是买点。</li>`);
  return bits.join('');
}

function outlookText(s){
  let near='',mid='';
  if(s.trend==='明显向上'){near='未来1～4周趋势仍偏强，但越接近短期高位越不适合追；优先等回调。';mid='未来1～3个月只要60日和120日结构没有明显转弱，仍可保持中期关注。';}
  else if(s.trend==='总体向上'){near='未来1～4周以“回调后能否稳住”为重点，适合等而不是追。';mid='未来1～3个月仍有延续机会，但需要每天用净值结构确认，不能把过去涨幅直接外推。';}
  else if(s.trend==='来回震荡'){near='未来1～4周更可能反复震荡，买入需要更耐心，宁可少买。';mid='未来1～3个月先看能否重新站稳中期趋势，再考虑提高仓位。';}
  else {near='未来1～4周先以止跌修复为主，不预判某一天就是底部。';mid='未来1～3个月只有趋势重新修复后，才重新进入积极买入判断。';}
  return {near,mid};
}

function annotatedChart(a,s,p,opts={}){
  const d=a.slice(-120),hist=d.map(x=>x.v),baseMin=Math.min(...hist),baseMax=Math.max(...hist),extras=[s.near[0],s.near[1],s.deep[0],s.deep[1],s.stop];
  if(opts.cost&&opts.cost>baseMin*.7&&opts.cost<baseMax*1.45)extras.push(opts.cost);
  if(p?.protect&&p.protect>baseMin*.7&&p.protect<baseMax*1.45)extras.push(p.protect);
  if(opts.cost){const lo=opts.cost*1.20,hi=opts.cost*1.35;if(lo<baseMax*1.5&&hi>baseMin*.7)extras.push(lo,hi);}
  let mn=Math.min(baseMin,...extras),mx=Math.max(baseMax,...extras);const padY=(mx-mn||1)*.08;mn-=padY;mx+=padY;
  const w=380,h=190,L=38,R=10,T=13,B=28,X=i=>L+i*(w-L-R)/Math.max(1,d.length-1),Y=v=>T+(mx-v)/(mx-mn)*(h-T-B),pts=d.map((x,i)=>`${X(i)},${Y(x.v)}`).join(' ');
  const band=(z,cls,label)=>{const y1=Y(Math.max(...z)),y2=Y(Math.min(...z));return `<rect x="${L}" y="${y1}" width="${w-L-R}" height="${Math.max(2,y2-y1)}" class="${cls}"/><text x="${L+4}" y="${Math.max(T+10,y1+11)}" class="chart-label">${label}</text>`};
  let marks=band(s.near,'buy-band','第一关注区')+band(s.deep,'deep-band','更舒服区');
  marks+=`<line x1="${L}" y1="${Y(s.stop)}" x2="${w-R}" y2="${Y(s.stop)}" class="stop-line"/><text x="${w-R-4}" y="${Y(s.stop)-4}" text-anchor="end" class="chart-label stop-text">停手参考</text>`;
  let note='';
  if(opts.cost&&opts.cost>mn&&opts.cost<mx){marks+=`<line x1="${L}" y1="${Y(opts.cost)}" x2="${w-R}" y2="${Y(opts.cost)}" class="cost-line"/><text x="${w-R-4}" y="${Y(opts.cost)-4}" text-anchor="end" class="chart-label cost-text">你的成本</text>`;}
  if(opts.cost){const z=[opts.cost*1.20,opts.cost*1.35];if(z[0]<mx&&z[1]>mn){const y1=Y(Math.min(mx,z[1])),y2=Y(Math.max(mn,z[0]));marks+=`<rect x="${L}" y="${Math.min(y1,y2)}" width="${w-L-R}" height="${Math.abs(y2-y1)}" class="sell-band"/><text x="${L+4}" y="${Math.min(y1,y2)+12}" class="chart-label sell-text">止盈观察区（非目标价）</text>`;}}
  if(p?.protect&&p.protect>mn&&p.protect<mx){marks+=`<line x1="${L}" y1="${Y(p.protect)}" x2="${w-R}" y2="${Y(p.protect)}" class="protect-line"/><text x="${w-R-4}" y="${Y(p.protect)-4}" text-anchor="end" class="chart-label">利润保护</text>`;}
  if(opts.date){const bt=new Date(opts.date+'T00:00:00').getTime(),idx=d.reduce((best,x,i)=>Math.abs(x.t-bt)<Math.abs(d[best].t-bt)?i:best,0);if(bt>=d[0].t&&bt<=d[d.length-1].t){const xx=X(idx);marks+=`<line x1="${xx}" y1="${T}" x2="${xx}" y2="${h-B}" class="buydate-line"/><circle cx="${xx}" cy="${Y(d[idx].v)}" r="4" class="buydot"/><text x="${Math.min(w-55,xx+4)}" y="${T+12}" class="chart-label buydate-text">你买入</text>`;}else note='你的买入日期早于这张近120个交易日图，图内不显示买入竖线。';}
  const lastX=X(d.length-1),lastY=Y(d[d.length-1].v);marks+=`<circle cx="${lastX}" cy="${lastY}" r="4.5" class="nowdot"/><text x="${lastX-4}" y="${lastY-7}" text-anchor="end" class="chart-label now-text">现在</text>`;
  const startDate=new Date(d[0].t),endDate=new Date(d[d.length-1].t);
  const fw=forecastWindow(s),forecast=fw?`<div class="forecast-strip"><b>预计重点关注窗口：</b>${fmtMD(fw.start)}～${fmtMD(fw.end)}（约${fw.lo}～${fw.hi}个交易日）。这是按最近波动速度估算，节假日和突发行情会让时间提前或延后。</div>`:'';
  return `<div class="chart"><div class="charthead"><span>近120个交易日净值图（带操作参考）</span><span>${baseMin.toFixed(3)}–${baseMax.toFixed(3)}</span></div><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${marks}<polyline fill="none" stroke="#b7352d" stroke-width="2.4" points="${pts}"/><text x="${L}" y="${h-7}" class="axis-text">${startDate.getMonth()+1}/${startDate.getDate()}</text><text x="${w-R}" y="${h-7}" text-anchor="end" class="axis-text">${endDate.getMonth()+1}/${endDate.getDate()}</text></svg>${note?`<div class="chart-note">${note}</div>`:''}${forecast}</div>`;
}

function decisionHtml(f,s,opts={}){
  const profile=opts.profile||window.__fundProfileMap?.[f.code]||null,p=personal(s,opts.cost??null,opts.pnl??null,opts.date??null),currentValue=(opts.amount&&p.p!==null)?opts.amount*(1+p.p/100):null,sellMoney=currentValue?`按当前估算持仓约 ${Math.round(currentValue).toLocaleString()} 元；如果触发第一次减仓，卖20%～30%大约是 ${Math.round(currentValue*.2).toLocaleString()}～${Math.round(currentValue*.3).toLocaleString()} 元。`:'',next1=`${V(s.near[0])}～${V(s.near[1])}`,next2=`${V(s.deep[0])}～${V(s.deep[1])}`,bp=budgetPlan(opts.budget??null,p.action),scoreBlock=opts.score!=null?`<div class="score-row"><div class="score-number">${Number(opts.score).toFixed(0)}<small>/100 综合评分</small></div><div class="scorebar"><span style="width:${Math.max(0,Math.min(100,Number(opts.score)))}%"></span></div></div>`:'',fw=forecastWindow(s),out=outlookText(s);
  const forecastBox=`<div class="forecast-card"><div class="forecast-title">未来时间预判 <span>估算 · 仅供参考</span></div>${fw?`<div class="forecast-main"><b>${timeHorizonLabel(fw.hi)}重点关注：</b>${fmtMD(fw.start)}～${fmtMD(fw.end)}，如果净值接近 ${next1} 且趋势没坏，再重点看买入机会。</div>`:`<div class="forecast-main"><b>暂不预测具体买入日：</b>${esc(s.eta)}</div>`}<div class="forecast-grid"><div><b>近期（1～4周）</b><span>${esc(out.near)}</span></div><div><b>中期（1～3个月）</b><span>${esc(out.mid)}</span></div></div></div>`;
  return `<div class="fund"><div class="top"><div><div class="name">${esc(f.name)}</div><div class="code">${f.code}${f.mgr?' · 基金经理 '+esc(f.mgr):''}</div></div><span class="tag ${p.tone}">${esc(p.action)}</span></div>${scoreBlock}<div class="answer ${p.tone}"><div class="a1">今天最简单的结论</div><div class="a2">${esc(p.action)}</div><div class="a3">${esc(p.why)}</div><div class="a3"><b>今天怎么做：</b>${esc(p.how)}</div></div>${forecastBox}${bp?`<div class="protect"><b>按你的预算怎么分：</b><br>${esc(bp)}</div>`:''}<div class="metrics"><div class="m"><div class="k">最新正式净值</div><div class="v">${V(s.last)}</div></div><div class="m"><div class="k">近60日涨跌</div><div class="v">${P(s.r60)}</div></div><div class="m"><div class="k">离近期高点</div><div class="v">${P(s.dd)}</div></div><div class="m"><div class="k">现在走势</div><div class="v">${s.trend}</div></div></div>${profileHtml(profile,false)}<div class="plan"><h3>如果还没买：怎么等、怎么买？</h3><div class="line"><span class="big">第一步先等到大约 ${next1}</span>。如果那时走势还稳，下午2:20左右再确认一次，第一笔只买计划金额的20%～25%。</div><div class="line">如果之后又回到 <b>${next2}</b>，但走势仍没有明显变坏，再买20%～25%。</div><div class="line">如果跌到 <b>${V(s.stop)}</b> 以下：<b>先停手，不再补仓</b>。这时要先判断是不是趋势真的坏了。</div></div><div class="plan"><h3>如果已经买了：什么时候卖？</h3>${opts.cost?`<div class="line">你的成本约 <b>${V(opts.cost)}</b>${p.p!==null?`，按当前参考大约 ${P(p.p)}`:''}。</div><div class="line"><b>止盈观察区：</b>成本上方约20%～35%（大约 ${V(opts.cost*1.20)}～${V(opts.cost*1.35)}）开始重点保护利润。<b>这不是目标价</b>，不是一到就必须卖。</div>`:''}<div class="line"><b>有利润先保护：</b>如果已经赚钱、短期又突然涨得很快，可以先卖20%～30%，把一部分利润落袋。</div><div class="line"><b>赚到25%～50%以上：</b>不要再无计划加仓，重点改成保护利润；不需要一次卖光。</div><div class="line"><b>走势明显变弱：</b>如果跌破约 ${V(s.stop)} 且中期趋势也转弱，不要因为舍不得卖一直拖，要重新评估减仓或退出。</div></div>${p.protectText?`<div class="protect"><b>你的利润保护提醒：</b><br>${esc(p.protectText)}${sellMoney?'<br><br>'+esc(sellMoney):''}</div>`:''}<details class="why" open><summary>我是怎么分析这只基金的？</summary><ul><li><b>基金本身：</b>基金经理、基金规模、主要持仓和行业暴露。</li><li><b>趋势：</b>看近20、60、120个交易日净值结构，不只看今天涨跌。</li><li><b>位置：</b>看现在离近期高点有多远，尽量避免刚大涨完追进去。</li><li><b>风险：</b>看近一年最大回撤和近期波动，判断它可能“跌多狠”。</li><li><b>时间：</b>根据离参考买入区的距离和最近日常波动，估算未来几到几十个交易日的关注窗口。</li><li><b>你的实际情况：</b>如果填了成本、预算、盈亏和买入日期，会一起考虑。</li></ul></details><details class="why"><summary>再详细一点：过去的风险怎么样？</summary><div class="line"><b>过去约一年最大回撤：</b>${P(s.maxdd250)}</div><div class="line"><b>近期波动：</b>${esc(riskText(s))}</div><div class="line"><b>历史持有约半年：</b>${esc(probText(s.prob120,'半年'))}</div><div class="line"><b>历史持有约一年：</b>${esc(probText(s.prob250,'一年'))}</div></details>${annotatedChart(f.a,s,p,opts)}<div class="source">图中的买入区、止盈观察区、利润保护线和时间窗口都是规则化参考，不是未来净值预测或收益保证。基金持仓按定期报告披露，不是实时变化。</div></div>`;
}

async function loadPool(){
  const box=$('#pool');
  try{const d=await fetch(`data/opportunity.json?v=${Date.now()}`).then(r=>{if(!r.ok)throw new Error('推荐池数据未加载');return r.json()});window.__fundProfileMap={};(d.funds||[]).forEach(x=>{if(x.profile)window.__fundProfileMap[x.code]=x.profile});$('#state').textContent=`基金数据更新：${(d.generated_at||'').replace('T',' ').slice(0,16)} · ${d.funds?.length||0}只核心候选`;box.innerHTML='';
    for(const [i,x] of (d.funds||[]).entries()){const rs=x.returns||{},el=document.createElement('div');el.className='fund';el.innerHTML=`<div class="top"><div class="fund-head"><div class="num">${i+1}</div><div><div class="name">${esc(x.name)}</div><div class="code">${x.code} · ${esc(x.category||'')} · 已跟踪${x.tracking?.days_tracked||1}天</div></div></div><span class="tag wait">${esc(x.simple_status||x.position||'持续观察')}</span></div><div class="score-row"><div class="score-number">${Number(x.score||0).toFixed(0)}<small>/100 综合评分</small></div><div class="scorebar"><span style="width:${Math.max(0,Math.min(100,Number(x.score||0)))}%"></span></div></div><div class="metrics"><div class="m"><div class="k">近1月</div><div class="v">${P(N(rs['1m']))}</div></div><div class="m"><div class="k">近3月</div><div class="v">${P(N(rs['3m']))}</div></div><div class="m"><div class="k">近6月</div><div class="v">${P(N(rs['6m']))}</div></div><div class="m"><div class="k">近1年</div><div class="v">${P(N(rs['1y']))}</div></div></div><details class="why" open><summary>为什么把它选进来？</summary><ul>${selectionWhyHtml(x)}</ul></details>${profileHtml(x.profile,true)}<div class="risk"><b>主要风险：</b>${esc(x.risk||'高弹性基金波动较大。')}</div><div class="buttons"><button class="btn look">更新今天情况</button><button class="btn secondary add">⭐ 设为我的关注</button></div><div class="source">系统推荐的6只都会自动跟踪；“我的关注”只是把你最感兴趣的几只单独置顶。点“更新今天情况”会重新读取最新公开净值走势，再算今天的买/等/卖建议。</div><div class="live"></div>`;box.appendChild(el);el.querySelector('.look').onclick=async()=>{const live=el.querySelector('.live');live.innerHTML='<div class="loader">正在更新今天的净值、走势和时间预判…</div>';try{const f=await fund(x.code),st=stat(f);live.innerHTML=decisionHtml(f,st,{score:x.score,profile:x.profile})}catch(e){live.innerHTML=`<div class="risk">今天的数据暂时没取到：${esc(e.message)}</div>`}};el.querySelector('.add').onclick=()=>{let all=getW(),old=all.find(y=>y.code===x.code),a=all.filter(y=>y.code!==x.code);a.unshift({code:x.code,name:x.name,budget:old?.budget??null});setW(a);el.querySelector('.add').textContent='⭐ 已设为我的关注';};}
  }catch(e){$('#state').textContent='推荐池暂未读取';box.innerHTML='<div class="empty">推荐基金暂时没有加载出来。可以先到“查一只基金”输入代码查询。</div>'}
}

loadPool();
