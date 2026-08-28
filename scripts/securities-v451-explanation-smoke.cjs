const { chromium, webkit, devices } = require('playwright');
const BASE=process.env.SECURITIES_BASE||'https://sonkaunwa-commits.github.io/freedom-road-public';
const ENTRY=`${BASE}/ks/?v451-smoke=${Date.now()}`;
const PIN='0917';
const assert=(x,m)=>{if(!x)throw new Error(m)};
async function open(page,name){
 const r=await page.goto(ENTRY+`&case=${name}`,{waitUntil:'domcontentloaded',timeout:45000});assert(r&&r.ok(),`${name}: entry failed`);
 await page.waitForFunction(()=>window.SEC_QUIZ_V45?.version==='4.5.0'&&window.SEC_QUIZ_V451?.version==='4.5.1',null,{timeout:25000});
 if(await page.locator('.v43LoginCard').count()){await page.locator('[data-pin-form] [name="pin"]').fill(PIN);await page.locator('[data-pin-form] button[type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('.v43Auth.show'),null,{timeout:25000});}
 await page.waitForSelector('.v45Dashboard',{timeout:25000});
}
async function practice(page,name){
 await page.locator('[data-start-sub="finance"]').click();await page.waitForSelector('.questionCard');
 const wrong=await page.evaluate(()=>{const text=document.querySelector('.questionCard h1')?.textContent.trim();const q=(window.SEC_QUESTIONS||[]).find(x=>String(x.q||'').trim()===text);return q?(q.o||[]).map((_,i)=>i).find(i=>!(q.a||[]).includes(i))??0:0});
 await page.locator('.questionCard .option').nth(wrong).click();await page.locator('#mainAction').click();
 await page.waitForSelector('.v451Deep',{timeout:12000});const t=await page.locator('.v451Deep').innerText();
 for(const s of ['为什么','逐项拆解','题源与可信度'])assert(t.includes(s),`${name}: missing ${s}`);
 assert(await page.locator('.questionCard .option.v451Correct').count()>=1,`${name}: correct option not highlighted`);
 assert(await page.locator('.questionCard .option.v451Wrong').count()>=1,`${name}: wrong option not highlighted`);
}
async function mockReview(page,name){
 await page.locator('#backBtn').click();await page.waitForSelector('.v45Dashboard');
 await page.locator('[data-tab="mock"]').click();await page.waitForSelector('.v45PaperList');await page.locator('[data-paper]').first().click();await page.waitForSelector('.questionCard');
 await page.locator('#paletteBtn').click();await page.waitForSelector('#submitMockFromPalette');await page.locator('#submitMockFromPalette').click();await page.waitForSelector('#confirmSubmit');await page.locator('#confirmSubmit').click();await page.waitForSelector('#mockReview');await page.locator('#mockReview').click();
 await page.waitForSelector('.v451Deep',{timeout:12000});const t=await page.locator('.v451Deep').innerText();assert(t.includes('你的答案：未作答')&&t.includes('正确答案'),`${name}: mock review explanation missing`);
}
async function run(type,name,opts){const b=await type.launch({headless:true}),c=await b.newContext(opts),p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await open(p,name);await practice(p,name);await mockReview(p,name);assert(!errors.length,`${name}: ${errors.join(' | ')}`);console.log(`${name} PASS deep practice + mock review explanations`);await b.close();}
(async()=>{await run(chromium,'chromium-desktop',{viewport:{width:1280,height:900}});await run(chromium,'chromium-mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});await run(webkit,'webkit-iphone',{...devices['iPhone 13']});console.log('V4.5.1 explanation smoke PASS');})().catch(e=>{console.error(e.stack||e);process.exit(1)});