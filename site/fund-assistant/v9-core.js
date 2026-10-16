const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], HK='mom_funds_v7', WK='mom_fund_watch_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const N=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const x=Number(v);return Number.isFinite(x)?x:null};
const P=v=>v===null||!Number.isFinite(v)?'—':`${v>0?'+':''}${v.toFixed(1)}%`;
const V=v=>v===null||!Number.isFinite(v)?'—':Number(v).toFixed(4);
$$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));$$('.section').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active')});

function loadScript(src,t=9000){return new Promise((ok,no)=>{let s=document.createElement('script'),d=false,tm=setTimeout(()=>{if(!d){d=true;s.remove();no(new Error('数据请求超时'))}},t);s.src=src;s.onload=()=>{if(!d){d=true;clearTimeout(tm);s.remove();ok()}};s.onerror=()=>{if(!d){d=true;clearTimeout(tm);s.remove();no(new Error('公开基金数据暂时取不到'))}};document.head.appendChild(s)})}

async function fund(code){
  ['fS_name','fundName','Data_netWorthTrend','Data_currentFundManager'].forEach(k=>{try{window[k]=undefined}catch{}});
  await loadScript(`https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`);
  const name=window.fS_name||window.fundName,tr=window.Data_netWorthTrend;
  if(!name||!Array.isArray(tr)||tr.length<30)throw new Error('没有查到这个基金，请检查6位代码');
  const a=tr.map(x=>({t:x.x,v:Number(x.y)})).filter(x=>Number.isFinite(x.v));
  const mgr=Array.isArray(window.Data_currentFundManager)?window.Data_currentFundManager.map(x=>x.name).filter(Boolean).join('、'):'';
  let est=null;
  try{await new Promise(async r=>{window.jsonpgz=o=>{est=o;r()};try{await loadScript(`https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,4500)}catch{}setTimeout(r,120)})}catch{}
  return {code,name,a,mgr,est};
}

function stat(f){
  const a=f.a,n=a.length,last=a[n-1].v,at=k=>a[Math.max(0,n-1-k)].v,ma=k=>a.slice(Math.max(0,n-k)).reduce((z,x)=>z+x.v,0)/Math.min(k,n),hi=k=>Math.max(...a.slice(Math.max(0,n-k)).map(x=>x.v));
  const m20=ma(20),m60=ma(60),m120=ma(120),r20=(last/at(20)-1)*100,r60=(last/at(60)-1)*100,r120=(last/at(120)-1)*100,dd=(last/hi(60)-1)*100,ref=N(f.est?.gsz)||last,dev60=(ref/m60-1)*100;
  const daily=a.slice(-61).map((x,i,arr)=>i?Math.abs((x.v/arr[i-1].v-1)*100):null).filter(x=>x!==null),avgMove=daily.length?daily.reduce((x,y)=>x+y,0)/daily.length:null;
  const tail250=a.slice(-250),maxdd250=tail250.reduce((st,x)=>({peak:Math.max(st.peak,x.v),dd:Math.min(st.dd,(x.v/Math.max(st.peak,x.v)-1)*100)}),{peak:tail250[0]?.v||last,dd:0}).dd;
  const rets=a.slice(-61).map((x,i,arr)=>i?x.v/arr[i-1].v-1:null).filter(x=>x!==null),mean=rets.length?rets.reduce((x,y)=>x+y,0)/rets.length:0,variance=rets.length>1?rets.reduce((z,x)=>z+(x-mean)**2,0)/(rets.length-1):0,vol60=Math.sqrt(variance)*Math.sqrt(250)*100;
  const positiveProb=h=>{let wins=0,total=0;for(let i=h;i<a.length;i++){total++;if(a[i].v>a[i-h].v)wins++}return total?wins/total*100:null};
  const prob120=positiveProb(120),prob250=positiveProb(250);
  const trend=last>m20&&m20>m60&&m60>m120?'明显向上':last>m60&&r60>0?'总体向上':last>m120?'来回震荡':'偏弱';
  const near=[m20*.985,m20*1.01],deep=[m60*.975,m60*1.008],stop=m120*.98;
  const distanceToBuy=ref>near[1]?(ref/near[1]-1)*100:0;
  let eta='',etaDays=null;
  if(ref>=near[0]&&ref<=near[1]&&trend.includes('向上')){etaDays=[0,1];eta='今天已经接近可考虑的位置，下午2:20左右再确认一次。';}
  else if(trend==='偏弱'||ref<stop) eta='现在不按日期抄底。先等走势重新稳定，至少连续几天不再创新低再看。';
  else if(distanceToBuy>0&&avgMove){const d=Math.max(1,Math.ceil(distanceToBuy/Math.max(.25,avgMove))),lo=Math.max(1,Math.floor(d*.6)),hi=Math.max(lo+1,Math.ceil(d*1.6));etaDays=[lo,hi];eta=`按最近波动速度粗略看，可能还要等约 ${lo}～${hi} 个交易日才有机会靠近更舒服的位置；这只是估算，不是预测日期。`;}
  else eta='先继续观察，等它回到更舒服的位置再考虑。';
  let action='今天先不买',tone='wait',why='现在没有到特别舒服的位置。继续等，比为了怕错过而追进去更好。',how='今天不操作，下午2:20左右再看一次。';
  if(ref<stop||trend==='偏弱'){action='今天不要买，也不要补';tone='stop';why='走势已经偏弱。跌得多不代表一定便宜，先等它重新稳定。';how='今天不加钱。已经持有的重点看是否继续跌破中期保护位置。'}
  else if((r20>10&&dev60>8)||ref>near[1]*1.055){action='今天不要追';tone='wait';why='最近涨得比较快，现在买进去容易买在高处。';how='继续等回落。哪怕今天还涨，也不要因为怕错过就追。'}
  else if(ref>=deep[0]&&ref<=deep[1]&&trend.includes('向上')){action='今天可以少买一点';tone='buy';why='已经回到比较舒服的位置，而且中期走势还没有坏。';how='下午2:20左右如果还在这个位置，可以先买你准备投入这只基金金额的约20%～25%。'}
  else if(ref>=near[0]&&ref<=near[1]&&trend.includes('向上')){action='今天可以先买一点';tone='buy';why='趋势还在，价格也回到较合理的位置。';how='下午2:20左右如果还在这个位置，可以先买准备金额的约20%～25%，不要一次买满。'}
  return {last,ref,m20,m60,m120,r20,r60,r120,dd,dev60,trend,near,deep,stop,action,tone,why,how,avgMove,eta,etaDays,maxdd250,vol60,prob120,prob250};
}

function holdingDays(dateStr){if(!dateStr)return null;const d=new Date(dateStr+'T00:00:00');if(Number.isNaN(d.getTime()))return null;return Math.max(0,Math.floor((Date.now()-d.getTime())/86400000));}

function personal(s,cost,pnl,dateStr){
  const p=cost?((s.ref/cost)-1)*100:pnl;let action=s.action,tone=s.tone,why=s.why,how=s.how;const days=holdingDays(dateStr);
  let protect=null,protectText='';
  if(p!==null){
    if(p<=-18&&(s.trend==='偏弱'||s.ref<s.stop)){action='先别再补，开始准备退出';tone='stop';why='已经亏得比较多，而且走势也弱。继续补很容易越套越深。';how='今天不补。后面如果反弹但趋势仍弱，可考虑先减一部分；如果继续跌破保护位置，更要重新评估是否退出。'}
    else if(p<=-8&&s.tone==='buy'){action='可以小补，但别重仓';tone='buy';why='这次回调还没有破坏中期走势，而且到了相对舒服的位置。';how='只补原计划金额的约10%～20%，其余资金继续留着，不能为了摊成本一次补满。'}
    else if(p>=50){action='赚得很多了，开始保护利润';tone='wait';why='已经有较大盈利，重点从“还能涨多少”转为“不要把利润全部跌回去”。';how='如果近期又快速上涨，可先卖约25%～30%；剩余继续持有，趋势明显转弱时再继续减。'}
    else if(p>=25&&s.r20>10){action='可以先卖一点';tone='wait';why='已经赚了不少，而且最近涨得偏快。';how='可以先卖约20%～25%锁定一部分利润，剩下继续跟踪，不需要一次全部卖掉。'}
    else if(p>0&&s.trend==='偏弱'){action='先卖一点保护利润';tone='wait';why='已经赚钱，但走势开始变弱。';how='可以先减约20%～25%，避免已经到手的利润又全部跌回去。'}
    if(cost&&p>0){const trail=p>=50?.10:p>=25?.08:.06;protect=Math.max(cost*1.01,s.ref*(1-trail));const locked=(protect/cost-1)*100;protectText=`按当前情况，可把 ${V(protect)} 左右当作“利润保护观察线”：如果以后估算净值回落到这里附近且走势也转弱，建议至少先卖一部分。这样按现在估算大约还能保住 ${Math.max(0,locked).toFixed(0)}% 左右的账面盈利。这个线不能保证绝对不亏，因为最终净值会变化。`;}
  }
  if(days!==null&&days<7)how+=' 另外，你买入还不到7天，卖出前先在销售平台查看短期赎回费。';
  return {p,action,tone,why,how,days,protect,protectText};
}

function budgetPlan(budget,action){if(!budget||budget<=0)return '';let first=Math.round(budget*.25/100)*100,second=first,reserve=budget-first-second;if(['不要','不买','不追','等','停'].some(k=>action.includes(k)))return `如果你最多准备投入 ${Number(budget).toLocaleString()} 元：今天先买 0 元，钱先留着；真正到合适位置时，第一笔大约 ${first.toLocaleString()} 元，第二笔再约 ${second.toLocaleString()} 元，至少留 ${reserve.toLocaleString()} 元备用。`;return `如果你最多准备投入 ${Number(budget).toLocaleString()} 元：今天先用大约 ${first.toLocaleString()} 元试第一笔；后面位置更合适再用约 ${second.toLocaleString()} 元，至少保留 ${reserve.toLocaleString()} 元，不一次买满。`;}
function riskText(s){const dd=Math.abs(s.maxdd250||0),vol=s.vol60||0;if(dd>=35||vol>=35)return '波动很大：可能涨得快，也可能短时间跌很多，只适合分批。';if(dd>=22||vol>=25)return '波动偏大：有明显回撤的可能，不能一次重仓。';return '波动中等：仍然会有回撤，但相对没有高弹性主题基金那么剧烈。';}
function probText(v,label){return v===null?'历史数据不足':`历史回测中，任意时点买入后持有约${label}出现正收益的比例约 ${v.toFixed(0)}%。只说明过去，不代表未来。`;}

function addTradingDays(base,n){const d=new Date(base);let left=n;while(left>0){d.setDate(d.getDate()+1);const w=d.getDay();if(w!==0&&w!==6)left--;}return d;}
function fmtMD(d){return `${d.getMonth()+1}月${d.getDate()}日`;}
function forecastWindow(s){if(!s.etaDays)return null;const now=new Date(),[lo,hi]=s.etaDays;return {lo,hi,start:addTradingDays(now,lo),end:addTradingDays(now,hi)};}
function timeHorizonLabel(days){if(days<=5)return '未来约1周';if(days<=10)return '未来约1～2周';if(days<=20)return '未来约2～4周';return '未来约1～2个月';}
