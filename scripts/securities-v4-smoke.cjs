const { chromium, webkit, devices } = require('playwright');

const BASE = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const ENTRY = `${BASE}/ks/?smoke=${Date.now()}`;
const PRIMARY_PIN = '0917';
const SECONDARY_PIN = '4294';
const assert = async (condition, message) => { if (!condition) throw new Error(message); };

async function waitRuntime(page) {
  await page.waitForFunction(() => window.SEC_QUIZ_V4?.version === '4.0.0' && window.SEC_QUIZ_V41?.version === '4.1.0' && window.SEC_QUIZ_V42?.version === '4.2.0' && window.SEC_QUIZ_V43?.version === '4.3.1' && window.SEC_QUIZ_V44?.version === '4.4.0' && window.SEC_CLOUD_SYNC_V43?.mode === 'two-pin-isolated-cloud-state', null, { timeout: 25000 });
}
async function authenticate(page, pin) {
  const gate = page.locator('.v43LoginCard');
  if (await gate.count()) {
    const authText = await gate.innerText();
    await assert(!authText.includes(PRIMARY_PIN) && !authText.includes(SECONDARY_PIN), 'login UI reveals valid study codes');
    const form = page.locator('[data-pin-form]');
    await form.locator('[name="pin"]').fill(pin);
    await form.locator('button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('.v43Auth.show'), null, { timeout: 25000 });
  }
  await page.waitForSelector('.v44Hero', { timeout: 25000 });
}
async function openAndAuth(page, pin, suffix='') {
  const r = await page.goto(ENTRY + `&case=${suffix}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await assert(r && r.ok(), `${suffix}: /ks/ entry not 2xx`);
  await waitRuntime(page);
  await assert(page.url().includes('/quiz-v4/'), `${suffix}: /ks/ did not resolve to v4`);
  await authenticate(page, pin);
}
async function accountMeta(page) {
  return page.evaluate(() => { const u=JSON.parse(localStorage.getItem('sec_v43_cloud_user')||'null'); return {id:u?.id||'',username:u?.username||'',token:localStorage.getItem('sec_v43_cloud_token')||''}; });
}
async function waitCloudAccount(page, expectedUsername) {
  await page.waitForFunction(expected => { try { const u=JSON.parse(localStorage.getItem('sec_v43_cloud_user')||'null'); return u?.username===expected && !!u?.id && !!localStorage.getItem('sec_v43_cloud_token'); } catch(_) { return false; } }, expectedUsername, { timeout: 18000 });
  return accountMeta(page);
}
async function waitSynced(page){await page.waitForFunction(()=>['已同步','已合并同步'].includes(localStorage.getItem('sec_v43_cloud_status')),null,{timeout:18000});}

async function exercise(browserType, name, contextOptions) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors=[],badResponses=[];
  page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(`console:${m.text()}`)});
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))badResponses.push(`${r.status()}:${r.url()}`)});
  await openAndAuth(page,PRIMARY_PIN,name);
  await page.waitForSelector('.v44Pool');
  const bank=await page.evaluate(()=>{const rows=window.SEC_QUESTIONS||[],active=rows.filter(q=>q&&q.strict!==false),q=window.SEC_V42_QUALITY||{},b=window.SEC_V43_BANK||{};return{total:rows.length,active:active.length,added:b.added||0,types:[...new Set(active.map(x=>x.type))],activeD:active.filter(x=>x.qualityTier==='D').length,defaultPool:q.defaultPool||0,caseMissing:active.filter(x=>x.type==='comprehensive'&&String(x.caseStem||'').trim().length<12).length}});
  await assert(bank.active>=1200,`${name}: expanded pool too small ${bank.active}`);
  await assert(bank.total>bank.active&&bank.defaultPool===bank.active&&bank.activeD===0,`${name}: tier quarantine mismatch`);
  await assert(bank.caseMissing===0,`${name}: comprehensive questions without usable case ${bank.caseMissing}`);
  for(const t of ['single','multi','judge','comprehensive']) await assert(bank.types.includes(t),`${name}: missing ${t}`);
  const shellWidth=await page.locator('.shell').evaluate(el=>el.getBoundingClientRect().width);await assert(shellWidth<=522,`${name}: shell ${shellWidth}`);
  await assert((await page.locator('.v44TypeCard').count())===3,`${name}: ordered type roadmap missing`);
  await assert((await page.locator('.v44MockEntry').count())===1,`${name}: mock entrance missing`);

  await page.locator('[data-v44-sub="finance"]').click();
  await page.waitForSelector('.v44SessionTop');
  await assert((await page.locator('.v44SessionMeta b').innerText()).includes('单选'),`${name}: recommended practice does not start with single choice`);
  await page.locator('#paletteBtn').click();await page.waitForSelector('.v44NumberGrid');
  await assert((await page.locator('.v44NumberGrid button').count())>=20,`${name}: question palette too small`);
  await page.locator('.v44NumberGrid button').nth(7).click();
  await assert((await page.locator('.v44PaletteBtn b').innerText())==='8',`${name}: jump-to-question failed`);
  await page.locator('#prevQ').click();await assert((await page.locator('.v44PaletteBtn b').innerText())==='7',`${name}: previous-question failed`);
  await page.locator('#skipQ').click();await assert(Number(await page.locator('.v44PaletteBtn b').innerText())>=8,`${name}: skip failed`);

  await page.locator('#backBtn').click();await page.waitForSelector('.v44Palette');await page.locator('#closePalette').click();
  await page.evaluate(()=>{document.querySelector('[data-tab="home"]')?.click()});await page.waitForSelector('.v44Hero');
  await page.locator('[data-v44-type="comprehensive"]').click();await page.waitForSelector('.v44Case');
  const caseText=(await page.locator('.v44Case').innerText()).trim();await assert(caseText.length>=14,`${name}: comprehensive case not visible`);

  await page.evaluate(()=>{document.querySelector('[data-tab="mock"]')?.click()});await page.waitForSelector('.v44MockList');
  await assert((await page.locator('.v44Paper').count())===5,`${name}: expected five mock papers per subject`);
  await page.locator('.v44Paper').first().click();await page.waitForSelector('.v44SessionTop');
  await assert((await page.locator('.v44PaletteBtn').innerText()).includes('/ 120'),`${name}: mock paper is not 120 questions`);
  await assert((await page.locator('#feedback .result').count())===0,`${name}: mock leaked answer before submission`);

  await page.evaluate(()=>{document.querySelector('[data-tab="me"]')?.click()});await page.waitForSelector('.sheetTitle');
  const meText=await page.locator('#main').innerText();await assert(meText.includes('自动同步')&&meText.includes('无需手动点'),`${name}: My page does not explain automatic sync`);
  await assert(!meText.includes('立即同步'),`${name}: manual sync action still exposed`);
  await assert((await page.locator('[data-profile]').count())===0,`${name}: legacy direct profile switch visible`);
  const meta=await accountMeta(page);await assert(meta.username==='study_0917',`${name}: wrong PIN account ${meta.username}`);

  await page.reload({waitUntil:'domcontentloaded'});await waitRuntime(page);await page.waitForSelector('.v44Hero');
  await assert((await page.locator('.v43LoginCard').count())===0,`${name}: remembered device session failed`);
  if(badResponses.length)throw new Error(`${name}: response errors ${badResponses.join(' | ')}`);
  if(errors.length)throw new Error(`${name}: runtime errors ${errors.join(' | ')}`);
  console.log(`${name} PASS v4.4 highValue=${bank.active}/${bank.total} mock=5x120 caseRequired=true palette=true shell=${shellWidth}`);
  await browser.close();
}

async function accountIsolationAndSync(){
  const browser=await chromium.launch({headless:true});
  const c1=await browser.newContext({viewport:{width:390,height:844}}),p1=await c1.newPage();await openAndAuth(p1,PRIMARY_PIN,'sync-primary-a');const a1=await waitCloudAccount(p1,'study_0917');
  const c2=await browser.newContext({viewport:{width:1280,height:900}}),p2=await c2.newPage();await openAndAuth(p2,PRIMARY_PIN,'sync-primary-b');const a2=await waitCloudAccount(p2,'study_0917');await assert(a1.id===a2.id,'same PIN did not resolve to same cloud account');
  const marker=`smoke-${Date.now()}-${Math.random()}`;
  await p1.evaluate(m=>{const k='sec2026state_v1',s=JSON.parse(localStorage.getItem(k)||'{"answered":{},"wrong":[],"fav":[],"daily":{},"history":[]}');s.daily=s.daily||{};s.daily.__v44_smoke=m;localStorage.setItem(k,JSON.stringify(s));},marker);await waitSynced(p1);
  await p2.reload({waitUntil:'domcontentloaded'});await waitRuntime(p2);await p2.waitForSelector('.v44Hero');
  await p2.waitForFunction(m=>{try{return JSON.parse(localStorage.getItem('sec2026state_v1')||'{}').daily?.__v44_smoke===m}catch(_){return false}},marker,{timeout:18000});
  const c3=await browser.newContext({viewport:{width:390,height:844}}),p3=await c3.newPage();await openAndAuth(p3,SECONDARY_PIN,'sync-secondary');const b=await waitCloudAccount(p3,'study_4294');await assert(b.id&&b.id!==a1.id,'two study codes resolved to same cloud account');
  const leaked=await p3.evaluate(m=>{try{return JSON.parse(localStorage.getItem('sec2026state_v1')||'{}').daily?.__v44_smoke===m}catch(_){return false}},marker);await assert(!leaked,'secondary account received primary sync marker');
  console.log('cloud account PASS automatic same-account cross-device sync + separate-code isolation');await browser.close();
}

async function releaseEntryChecks(){const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:390,height:844}});await p.goto(`${BASE}/?release-check=${Date.now()}`,{waitUntil:'domcontentloaded'});const href=await p.locator('a.card').filter({hasText:'证券从业 2026'}).getAttribute('href');await assert(href&&href.startsWith('ks/'),'root card route wrong');await p.goto(`${BASE}/securities-exam/?legacy=${Date.now()}`,{waitUntil:'domcontentloaded'});await p.waitForURL(/\/quiz-v4\//);await waitRuntime(p);await p.waitForSelector('[data-pin-form]');console.log('release entry PASS root-card=/ks/ legacy=/securities-exam/->/quiz-v4/');await browser.close()}

(async()=>{await exercise(chromium,'chromium-desktop',{viewport:{width:1280,height:900}});await exercise(chromium,'chromium-mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});await exercise(webkit,'webkit-iphone',{...devices['iPhone 13']});await accountIsolationAndSync();await releaseEntryChecks();console.log('V4.4 release smoke PASS: coherent ordered practice + case-required comprehensive + palette review + skip + fixed mocks + automatic cloud sync');})().catch(e=>{console.error(e.stack||e);process.exit(1)});
