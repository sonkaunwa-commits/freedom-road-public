const { chromium, webkit, devices } = require('playwright');

const BASE = process.env.SECURITIES_BASE || 'https://sonkaunwa-commits.github.io/freedom-road-public';
const ENTRY = `${BASE}/ks/?smoke=${Date.now()}`;
const stamp = Date.now().toString(36);
const primary = { username: `smk${stamp}`, password: `Smoke-${stamp}-A9!`, displayName: 'Smoke Primary' };
const secondary = { username: `iso${stamp}`, password: `Smoke-${stamp}-B8!`, displayName: 'Smoke Isolated' };
let primaryCreated = false;
const assert = async (condition, message) => { if (!condition) throw new Error(message); };

async function waitRuntime(page) {
  await page.waitForFunction(() => window.SEC_QUIZ_V4?.version === '4.0.0' && window.SEC_QUIZ_V41?.version === '4.1.0' && window.SEC_QUIZ_V42?.version === '4.2.0' && window.SEC_QUIZ_V43?.version === '4.3.0' && window.SEC_CLOUD_SYNC_V43?.cloudSync === true, null, { timeout: 25000 });
}
async function authenticate(page, creds, create=false) {
  await page.waitForSelector('.v43LoginCard', { timeout: 15000 });
  if (create) {
    await page.locator('[data-auth-tab="register"]').click();
    const f = page.locator('[data-auth-form="register"]');
    await f.locator('[name="username"]').fill(creds.username);
    await f.locator('[name="displayName"]').fill(creds.displayName);
    await f.locator('[name="password"]').fill(creds.password);
    const migrate = f.locator('[name="migrate"]'); if (await migrate.isChecked()) await migrate.uncheck();
    await f.locator('button[type="submit"]').click();
  } else {
    const f = page.locator('[data-auth-form="login"]');
    await f.locator('[name="username"]').fill(creds.username);
    await f.locator('[name="password"]').fill(creds.password);
    await f.locator('button[type="submit"]').click();
  }
  await page.waitForFunction(() => !document.querySelector('.v43Auth.show'), null, { timeout: 25000 });
  await page.waitForSelector('.subject .continue', { timeout: 25000 });
}
async function openAndAuth(page, creds, create=false, suffix='') {
  const r = await page.goto(ENTRY + `&case=${suffix}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await assert(r && r.ok(), `${suffix}: /ks/ entry not 2xx`);
  await waitRuntime(page);
  await assert(page.url().includes('/quiz-v4/'), `${suffix}: /ks/ did not resolve to v4`);
  await authenticate(page, creds, create);
}

async function exercise(browserType, name, contextOptions) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [], badResponses = [];
  page.on('pageerror', e => errors.push(`pageerror:${e.message}`));
  page.on('console', m => { if (m.type()==='error' && !m.text().includes('Failed to load resource')) errors.push(`console:${m.text()}`); });
  page.on('response', r => { if (r.status()>=400 && !r.url().endsWith('/favicon.ico')) badResponses.push(`${r.status()}:${r.url()}`); });
  const create = !primaryCreated; await openAndAuth(page, primary, create, name); if (create) primaryCreated = true;
  await page.waitForSelector('.qualitySummary');
  const bank = await page.evaluate(() => { const rows=window.SEC_QUESTIONS||[], active=rows.filter(q=>q&&q.strict!==false), q=window.SEC_V42_QUALITY||{}, b=window.SEC_V43_BANK||{}; return {total:rows.length,active:active.length,added:b.added||0,types:[...new Set(active.map(x=>x.type))],sourced:rows.filter(x=>x.source&&x.sourceTruth).length,tiered:rows.filter(x=>x.qualityTier).length,activeD:active.filter(x=>x.qualityTier==='D').length,defaultPool:q.defaultPool||0,counts:q.counts||{}}; });
  await assert(bank.active >= 1200, `${name}: expanded pool too small ${bank.active}`);
  await assert(bank.added >= 400, `${name}: v4.3 added too few questions ${bank.added}`);
  await assert(bank.total > bank.active && bank.defaultPool===bank.active && bank.activeD===0, `${name}: tier quarantine mismatch`);
  await assert(bank.sourced===bank.total && bank.tiered===bank.total, `${name}: provenance/tiering incomplete`);
  for (const t of ['single','multi','judge','comprehensive']) await assert(bank.types.includes(t), `${name}: missing ${t}`);
  const shellWidth=await page.locator('.shell').evaluate(el=>el.getBoundingClientRect().width); await assert(shellWidth<=522, `${name}: shell ${shellWidth}`);
  await page.locator('[data-subject="finance"]').click(); await page.waitForSelector('.questionCard .option');
  const wrongIndex=await page.evaluate(()=>{const t=document.querySelector('.questionCard h1')?.textContent||'',q=(window.SEC_QUESTIONS||[]).find(x=>x.q===t);for(let i=0;i<(q?.o||[]).length;i++)if(!(q.a||[]).includes(i))return i;return 0});
  await page.locator('.questionCard .option').nth(wrongIndex).click(); await page.locator('#answerBtn').click();
  await page.waitForSelector('.result.bad'); await page.waitForSelector('.masteryBlock'); await page.waitForSelector('.transferQuiz');
  await page.locator('#answerBtn').click(); await page.waitForSelector('.questionCard .option'); await page.locator('.favBtn').click();
  await page.waitForTimeout(1400);
  await page.locator('#backBtn').click(); await page.locator('[data-tab="me"]').click(); await page.waitForSelector('.v43AccountCard');
  await assert((await page.locator('[data-profile]').count())===0, `${name}: legacy direct profile switch still visible`);
  await assert((await page.locator('.v43AccountCard').innerText()).includes(primary.displayName), `${name}: wrong account identity`);
  await page.reload({waitUntil:'domcontentloaded'}); await waitRuntime(page); await page.waitForSelector('.subject .continue');
  await assert((await page.locator('.v43LoginCard').count())===0, `${name}: remembered device session failed`);
  if (badResponses.length) throw new Error(`${name}: response errors ${badResponses.join(' | ')}`);
  if (errors.length) throw new Error(`${name}: runtime errors ${errors.join(' | ')}`);
  console.log(`${name} PASS highValue=${bank.active}/${bank.total} added=${bank.added} tiers=A${bank.counts.A||0},B${bank.counts.B||0},C${bank.counts.C||0},D${bank.counts.D||0} shell=${shellWidth}`);
  await browser.close();
}

async function crossDeviceIsolation() {
  const browser=await chromium.launch({headless:true});
  const c1=await browser.newContext({viewport:{width:390,height:844}}), p1=await c1.newPage();
  await openAndAuth(p1, primary, false, 'sync-source');
  await p1.evaluate(()=>{const s=JSON.parse(localStorage.getItem('sec2026state_v1')||'{}');s.fav=[...(new Set([...(s.fav||[]),'SYNC-PROBE-V43']))];localStorage.setItem('sec2026state_v1',JSON.stringify(s))});
  await p1.waitForTimeout(1800);
  const c2=await browser.newContext({viewport:{width:1280,height:900}}), p2=await c2.newPage();
  await openAndAuth(p2, primary, false, 'sync-target');
  await p2.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('sec2026state_v1')||'{}');return (s.fav||[]).includes('SYNC-PROBE-V43')},null,{timeout:15000});
  const c3=await browser.newContext({viewport:{width:390,height:844}}), p3=await c3.newPage();
  await openAndAuth(p3, secondary, true, 'isolated-account');
  const leaked=await p3.evaluate(()=>{const s=JSON.parse(localStorage.getItem('sec2026state_v1')||'{}');return (s.fav||[]).includes('SYNC-PROBE-V43')});
  await assert(!leaked,'account B received account A learning state');
  await p3.locator('[data-tab="me"]').click(); await p3.waitForSelector('.v43AccountCard');
  await assert((await p3.locator('[data-profile]').count())===0,'account B can see direct profile switch');
  console.log('cloud account PASS same-account cross-device sync + separate-account isolation + no direct profile switch');
  await browser.close();
}

async function releaseEntryChecks(){const browser=await chromium.launch({headless:true}),p=await browser.newPage({viewport:{width:390,height:844}});await p.goto(`${BASE}/?release-check=${Date.now()}`,{waitUntil:'domcontentloaded'});const href=await p.locator('a.card').filter({hasText:'证券从业 2026'}).getAttribute('href');await assert(href&&href.startsWith('ks/'),'root card route wrong');await p.goto(`${BASE}/securities-exam/?legacy=${Date.now()}`,{waitUntil:'domcontentloaded'});await p.waitForURL(/\/quiz-v4\//);await waitRuntime(p);console.log('release entry PASS root-card=/ks/ legacy=/securities-exam/->/quiz-v4/');await browser.close()}

(async()=>{await exercise(chromium,'chromium-desktop-mobile-shell',{viewport:{width:1280,height:900}});await exercise(chromium,'chromium-mobile',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});await exercise(webkit,'webkit-iphone',{...devices['iPhone 13']});await crossDeviceIsolation();await releaseEntryChecks();console.log('V4.3 release smoke PASS: expanded high-value pool + isolated accounts + cross-device cloud sync + desktop/mobile/iPhone');})().catch(e=>{console.error(e.stack||e);process.exit(1)});
