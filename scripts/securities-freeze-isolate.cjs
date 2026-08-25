const { spawn } = require('child_process');
const { chromium } = require('playwright');

const base = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const scripts = [
  'questions-v1.js','bank/concepts-v2.js','bank/generator-v2.js','bank-extra-v23.js',
  'bank-normalize-v24.js','bank-supplement-v24.js','questions-auto.js','app-v1.js',
  'enhance-v12.js','ux-v26.js','product-core-v350.js','sources-data-v350.js',
  'learning-content-v360.js','content-bridge-v360.js','product-v350.js','release-v360.js','profile-sync-v360.js'
];

async function child(prefix) {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage();
  const allowed = new Set(scripts.slice(0,prefix));
  await page.route('**/*', route => {
    const req = route.request();
    if (req.resourceType() === 'script') {
      const u = new URL(req.url());
      const rel = u.pathname.split('/exam-live/')[1] || '';
      if (!allowed.has(rel)) return route.abort();
    }
    return route.continue();
  });
  const t0=Date.now();
  const r=await page.goto(`${base}/exam-live/?isolate=${prefix}-${Date.now()}`,{waitUntil:'domcontentloaded',timeout:12000});
  const pong=await page.evaluate(()=>({ready:document.readyState,title:document.title,version:document.body?.dataset?.productVersion||null}));
  console.log(JSON.stringify({prefix,status:r?.status(),ms:Date.now()-t0,pong,last:prefix?scripts[prefix-1]:'none'}));
  await browser.close();
}

function runProbe(n){
  return new Promise(resolve=>{
    const p=spawn(process.execPath,[__filename,'--child',String(n)],{stdio:['ignore','pipe','pipe'],env:process.env});
    let out='',err='';
    p.stdout.on('data',d=>out+=d); p.stderr.on('data',d=>err+=d);
    const timer=setTimeout(()=>{p.kill('SIGKILL'); resolve({n,ok:false,reason:'hard-timeout',out,err});},18000);
    p.on('exit',(code,signal)=>{clearTimeout(timer);resolve({n,ok:code===0,reason:code===0?'responsive':`exit-${code||signal}`,out,err});});
  });
}

async function parent(){
  let low=0, high=scripts.length;
  const zero=await runProbe(0); console.log('PROBE',JSON.stringify(zero));
  if(!zero.ok) throw new Error('Page freezes even with all JS blocked');
  const full=await runProbe(high); console.log('PROBE',JSON.stringify(full));
  if(full.ok){console.log('NO_FREEZE_WITH_FULL_PREFIX');return;}
  while(high-low>1){
    const mid=Math.floor((low+high)/2);
    const r=await runProbe(mid); console.log('PROBE',JSON.stringify(r));
    if(r.ok) low=mid; else high=mid;
  }
  const culprit=scripts[high-1];
  console.log(`FIRST_FREEZING_PREFIX=${high}`);
  console.log(`LIKELY_CULPRIT=${culprit}`);
  process.exitCode=2;
}

if(process.argv[2]==='--child') child(Number(process.argv[3])).catch(e=>{console.error(e.stack||e);process.exit(1)});
else parent().catch(e=>{console.error(e.stack||e);process.exit(1)});
