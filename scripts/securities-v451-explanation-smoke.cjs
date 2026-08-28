const { chromium, webkit, devices } = require('playwright');
const BASE=process.env.SECURITIES_BASE||'https://sonkaunwa-commits.github.io/freedom-road-public';
const ENTRY=`${BASE}/ks/?v460-smoke=${Date.now()}`;
const PIN='0917';
const assert=(x,m)=>{if(!x)throw new Error(m)};
async function open(page,name){
 const r=await page.goto(ENTRY+`&case=${name}`,{waitUntil:'domcontentloaded',timeout:45000});assert(r&&r.ok(),`${name}: entry failed`);
 await page.waitForFunction(()=>window.SEC_QUIZ_V45?.version==='4.5.0'&&window.SEC_QUIZ_V451?.version==='4.6.0'&&window.SEC_V46_BANK?.version==='4.6.0'&&window.SEC_V42_QUALITY?.authenticityGate===true,null,{timeout:30000});
 if(await page.locator('.v43LoginCard').count()){await page.locator('[data-pin-form] [name="pin"]').fill(PIN);await page.locator('[data-pin-form] button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('.v43Auth.show'),null,{timeout:25000});}
 await page.waitForSelector('.v45Dashboard',{timeout:25000});
}
async function bankQuality(page,name){
 const x=await page.evaluate(()=>{
  const bank=window.SEC_QUESTIONS||[],active=bank.filter(q=>q?.quizEligible!==false&&q?.strict!==false),meta=/(考生|复习“|复习「|做题时|答题时|最应记住|有助于正确理解|第一步应识别|换个问法|优先抓住哪一)/;
  const curated=active.filter(q=>/^SE23\d+/.test(String(q.id||''))||/^HV43-/.test(String(q.id||'')));
  const cases=curated.filter(q=>q.type==='comprehensive');
  const lof=active.filter(q=>q.knowledge==='LOF');
  return {active:active.length,curated:curated.length,cases:cases.length,lof:lof.length,metaCount:active.filter(q=>meta.test(String(q.q||''))).length,badRationale:curated.filter(q=>!Array.isArray(q.oa)||q.oa.length!==(q.o||[]).length||q.oa.some(v=>String(v||'').trim().length<12)).length,badLearning:curated.filter(q=>!q.learn?.definition&&!q.learn?.key).length,shortCases:cases.filter(q=>String(q.caseStem||'').trim().length<65).length,badLof:lof.filter(q=>!Array.isArray(q.oa)||q.oa.length!==q.o.length||meta.test(String(q.q||''))||q.o.some(v=>/期限.*收益率.*完全相同|政策利率.*只影响央行/.test(v))).length};
 });
 assert(x.active>=1000,`${name}: active bank too small ${x.active}`);assert(x.curated>=500,`${name}: curated pool too small ${x.curated}`);assert(x.cases>=80,`${name}: comprehensive cases too few ${x.cases}`);assert(x.lof>=4,`${name}: LOF coverage too small ${x.lof}`);assert(x.metaCount===0,`${name}: meta-learning stems leaked ${x.metaCount}`);assert(x.badRationale===0,`${name}: incomplete per-option rationale ${x.badRationale}`);assert(x.badLearning===0,`${name}: learning cards missing ${x.badLearning}`);assert(x.shortCases===0,`${name}: short cases remain ${x.shortCases}`);assert(x.badLof===0,`${name}: LOF quality gate failed ${x.badLof}`);
 console.log(`${name} BANK active=${x.active} curated=${x.curated} cases=${x.cases} lof=${x.lof}`);
}
async function practiceExplanation(page,name){
 await page.locator('[data-start-sub="finance"]').click();await page.waitForSelector('.questionCard');
 const meta=await page.evaluate(()=>{const text=document.querySelector('.questionCard h1')?.textContent.trim();const q=(window.SEC_QUESTIONS||[]).find(x=>String(x.q||'').trim()===text);return q?{count:(q.o||[]).length,wrong:(q.o||[]).map((_,i)=>i).find(i=>!(q.a||[]).includes(i))??0,stem:q.q}:null});
 assert(meta,`${name}: question metadata missing`);assert(!/(考生|复习“|复习「|最应记住|有助于正确理解)/.test(meta.stem),`${name}: meta-learning question reached practice`);
 await page.locator('.questionCard .option').nth(meta.wrong).click();await page.locator('#mainAction').click();await page.waitForSelector('.v451Deep',{timeout:12000});const t=await page.locator('.v451Deep').innerText();
 for(const s of ['本题核心','逐项拆解','本题知识卡','关联考题','题源与可信度'])assert(t.includes(s),`${name}: missing ${s}`);
 assert(await page.locator('.v451OptionRow').count()===meta.count,`${name}: every option must have rationale`);const reasons=await page.locator('.v451OptionRow>span').allInnerTexts();assert(reasons.every(x=>x.trim().length>=18),`${name}: shallow rationale`);assert(!/美食|探店|空镜头|ND滤镜|CPL滤镜|摄影|相机/.test(t),`${name}: unrelated course content leaked into explanation`);assert(await page.locator('.questionCard .option.v451Correct').count()>=1,`${name}: correct option not highlighted`);assert(await page.locator('.questionCard .option.v451Wrong').count()>=1,`${name}: wrong option not highlighted`);
}
async function caseQuality(page,name){const data=await page.evaluate(()=>{const q=(window.SEC_QUESTIONS||[]).find(x=>x.type==='comprehensive'&&x.quizEligible!==false&&x.strict!==false&&String(x.caseStem||'').length>=65);return q?{caseStem:q.caseStem,oa:q.oa,o:q.o}:null});assert(data,`${name}: long comprehensive case missing`);assert(data.caseStem.length>=65,`${name}: case material too short`);assert(Array.isArray(data.oa)&&data.oa.length===data.o.length,`${name}: case option rationales missing`);}
async function mockReview(page,name){await page.locator('#backBtn').click();await page.waitForSelector('.v45Dashboard');await page.locator('[data-tab="mock"]').click();await page.waitForSelector('.v45PaperList');await page.locator('[data-paper]').first().click();await page.waitForSelector('.questionCard');await page.locator('#paletteBtn').click();await page.waitForSelector('#submitMockFromPalette');await page.locator('#submitMockFromPalette').click();await page.waitForSelector('#confirmSubmit');await page.locator('#confirmSubmit').click();await page.waitForSelector('#mockReview');await page.locator('#mockReview').click();await page.waitForSelector('.v451Deep',{timeout:12000});const t=await page.locator('.v451Deep').innerText();assert(t.includes('你的答案：未作答')&&t.includes('正确答案')&&t.includes('逐项拆解')&&t.includes('本题知识卡'),`${name}: mock review explanation incomplete`);}
async function run(type,name,opts){const b=await type.launch({headless:true}),c=await b.newContext(opts),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await open(p,name);await bankQuality(p,name);await caseQuality(p,name);await practiceExplanation(p,name);await mockReview(p,name);assert(!errors.length,`${name}: ${errors.join(' | ')}`);console.log(`${name} PASS v4.6 authentic bank + deep explanation + mock review`);await b.close();}
(async()=>{await run(chromium,'chromium-desktop',{viewport:{width:1280,height:900}});await run(chromium,'chromium-mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});await run(webkit,'webkit-iphone',{...devices['iPhone 13']});console.log('V4.6.0 bank-quality browser smoke PASS');})().catch(e=>{console.error(e.stack||e);process.exit(1)});