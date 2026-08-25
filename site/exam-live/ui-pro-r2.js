(()=>{
'use strict';
const VERSION='3.4.0', MARK='SEC_UI_PRO_R2', MASTER_KEY='sec_r2_mastery_v1';
if(window[MARK]) return;
window[MARK]=true;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=()=>{try{return JSON.parse(localStorage.getItem('sec2026state_v1')||'{}')||{}}catch(_){return{}}};
const bank=()=>Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const mastery=()=>{try{return JSON.parse(localStorage.getItem(MASTER_KEY)||'{}')||{}}catch(_){return{}}};
const saveMastery=x=>localStorage.setItem(MASTER_KEY,JSON.stringify(x));
const pct=(a,b)=>b?Math.round(a/b*100):0;
const dateKey=d=>d.toLocaleDateString('sv-SE');
const targetDate=()=>localStorage.getItem('sec_exam_target_date_v3')||'2026-09-19';
const daysLeft=()=>{const t=new Date(targetDate()+'T00:00:00'),n=new Date();n.setHours(0,0,0,0);return Math.max(0,Math.ceil((t-n)/86400000))};
const recentAcc=()=>{const h=(state().history||[]).slice(0,20);return h.length?pct(h.filter(x=>x.ok).length,h.length):null};
const weakChapter=()=>{const S=state(),B=bank(),m={};for(const id of S.wrong||[]){const q=B.find(x=>x.id===id);if(q?.ch)m[q.ch]=(m[q.ch]||0)+1}const r=Object.entries(m).sort((a,b)=>b[1]-a[1])[0];return r?{name:r[0],count:r[1]}:null};
const subjectProgress=sub=>{const S=state(),ids=bank().filter(q=>q.strict!==false&&q.s===sub).map(q=>q.id),done=ids.filter(id=>id in (S.answered||{})).length;return{done,total:ids.length,pct:pct(done,ids.length)}};
const activeView=()=>$('.view.active')?.id?.replace('view-','')||'home';
function click(id){const e=$(id);if(e){e.click();return true}return false}
function oldTab(view){const b=$(`nav.tabs .tab[data-view="${view}"]`);if(b){b.click();return true}return false}
function go(kind){
 if(kind==='home'||kind==='practice'||kind==='review'||kind==='stats'){oldTab(kind);return}
 if(kind==='learn'){if(click('#learnTodayV26'))return;oldTab('home');setTimeout(()=>click('#learnTodayV26'),120);return}
 if(kind==='mock'){oldTab('home');setTimeout(()=>{click('#mockHubV26')||click('#mockBtn');$('#mockSetsV26')?.scrollIntoView({behavior:'smooth',block:'center'})},120);return}
 if(kind==='sources'){click('#sourcesOpenV321')||click('#sourcesDeskBtnV321');return}
 if(kind==='today'){if(window.SEC_UX_V26?.hasSession?.()&&window.SEC_UX_V26?.resume){window.SEC_UX_V26.resume();return}click('#dailyBtn');return}
 if(kind==='wrong'){oldTab('review');setTimeout(()=>click('#wrongStart'),120);return}
 if(kind==='search'){oldTab('home');setTimeout(()=>$('#searchInput')?.scrollIntoView({behavior:'smooth',block:'center'}),120);return}
}
function weekData(){const S=state(),a=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=dateKey(d),v=S.daily?.[k]||{};a.push({label:['日','一','二','三','四','五','六'][d.getDay()],done:+v.done||0,today:i===0})}return a}
function taskSummary(){const S=state(),today=S.daily?.[dateKey(new Date())]||{},done=+today.done||0,wrong=(S.wrong||[]).length,mastered=Object.values(mastery()).filter(Boolean).length;return{done,wrong,mastered,hasSession:!!S.session?.ids?.length}}
function brand(){
 document.body.classList.add('uiProR2');document.body.dataset.productVersion=VERSION;
 const b=$('.brand');if(b)b.textContent='证券考试学习助手';
 const v=$('.version');if(v){v.textContent=`v${VERSION} · 2026新大纲 · 学习工作台`;v.title='点击查看版本说明'}
 let badge=$('#r2HeaderVersion');
 if(!badge&&$('.brandrow')){badge=document.createElement('button');badge.id='r2HeaderVersion';badge.className='r2VersionChip';badge.textContent=`v${VERSION}`;badge.onclick=()=>$('.version')?.click();$('.brandrow').appendChild(badge)}
}
function weekBars(){const max=Math.max(20,...weekData().map(x=>x.done));return `<div class="r2WeekBars">${weekData().map(x=>`<div class="r2WeekDay ${x.today?'today':''}"><span class="bar"><i style="height:${Math.max(5,Math.min(100,Math.round(x.done/max*100)))}%"></i></span><b>${x.label}</b><small>${x.done||'·'}</small></div>`).join('')}</div>`}
function subjectCard(sub,title){const p=subjectProgress(sub);return `<button class="r2Subject" data-r2="practice"><div><span>${esc(title)}</span><b>${p.pct}%</b></div><div class="r2Track"><i style="width:${p.pct}%"></i></div><small>${p.done}/${p.total||0} 已答</small></button>`}
function mobileHome(){
 if(innerWidth>=1100)return;const home=$('#view-home');if(!home)return;let box=$('#r2MobileHome');if(!box){box=document.createElement('div');box.id='r2MobileHome';home.prepend(box)}
 const S=state(),sum=taskSummary(),acc=recentAcc(),weak=weakChapter(),session=!!S.session?.ids?.length;
 box.innerHTML=`
 <section class="r2HeroMobile"><div class="r2HeroTop"><span class="r2Eyebrow">TODAY · v${VERSION}</span><span class="r2Days">距考试 ${daysLeft()} 天</span></div><h1>${session?'继续上次学习':'今天怎么学'}</h1><p>${session?'上次进度已保留，先把正在做的内容完成。':'不用自己安排顺序：先完成计划，再决定是否加练。'}</p><div class="r2HeroActions"><button class="primary" data-r2="today">${session?'继续学习':'开始今日计划'}</button><button data-r2="learn">学知识点</button></div><div class="r2MetricRow"><div><b>${sum.done}</b><span>今日已做</span></div><div><b>${acc==null?'—':acc+'%'}</b><span>近20题</span></div><div><b>${sum.wrong}</b><span>待复习</span></div></div></section>
 <section class="r2Panel r2PlanHost"><div class="r2SectionHead"><div><span class="r2Eyebrow">TODAY PLAN</span><h2>今天只盯三件事</h2></div><small>完成即达标</small></div><div id="r2MobileAssistantHost"></div></section>
 <section class="r2Panel"><div class="r2SectionHead"><div><span class="r2Eyebrow">WEEKLY RHYTHM</span><h2>本周学习节奏</h2></div><small>不要只看一天</small></div>${weekBars()}</section>
 <section class="r2Panel"><div class="r2SectionHead"><div><span class="r2Eyebrow">STUDY MODES</span><h2>按目的进入</h2></div></div><div class="r2ModeGrid"><button data-r2="learn"><span>01</span><b>知识学习</b><small>先理解，再做题</small></button><button data-r2="practice"><span>02</span><b>刷题训练</b><small>章节 / 随机 / 未做</small></button><button data-r2="review"><span>03</span><b>错题复习</b><small>把不会的真正解决</small></button><button data-r2="mock"><span>04</span><b>模拟考试</b><small>按真实节奏检验</small></button></div></section>
 <section class="r2Panel"><div class="r2SectionHead"><div><span class="r2Eyebrow">PROGRESS</span><h2>两科进度</h2></div><button class="text" data-r2="stats">看报告</button></div><div class="r2Subjects">${subjectCard('finance','金融市场基础知识')}${subjectCard('law','证券市场基本法律法规')}</div></section>
 <section class="r2FocusCard"><div><span class="r2Eyebrow">NEXT FOCUS</span><h3>${weak?esc(weak.name):'还没有明显薄弱点'}</h3><p>${weak?`这里累计 ${weak.count} 道错题，下一轮优先复习。`:'继续做题后，系统会根据错题自动识别薄弱章节。'}</p></div><button data-r2="review">去复习</button></section>
 <section class="r2Utility"><button data-r2="sources"><b>学习资料库</b><small>17份外部资料 · 按用途分类</small></button><button data-r2="search"><b>搜题</b><small>按关键词快速定位</small></button></section>`;
 box.querySelectorAll('[data-r2]').forEach(b=>b.onclick=()=>go(b.dataset.r2));
 const a=$('#assistantMobileV31');if(a){const host=$('#r2MobileAssistantHost');if(host&&a.parentNode!==host)host.appendChild(a)}
}
function deskNav(){
 if(innerWidth<1100)return;const nav=$('.deskNav');if(!nav||nav.dataset.r2)return;nav.dataset.r2='1';
 nav.innerHTML=`<button data-r2="home"><span>今日计划</span></button><button data-r2="learn"><span>知识学习</span></button><button data-r2="practice"><span>刷题训练</span></button><button data-r2="review"><span>错题复习</span></button><button data-r2="mock"><span>模拟考试</span></button><button data-r2="stats"><span>学习报告</span></button><button data-r2="sources"><span>学习资料</span></button>`;
 nav.querySelectorAll('[data-r2]').forEach(b=>b.onclick=()=>go(b.dataset.r2));
 const brand=$('.deskBrand');if(brand)brand.innerHTML=`<b>证券考试学习助手</b><small>2026 新大纲 · v${VERSION}</small>`;
 const foot=$('.deskFoot');if(foot)foot.innerHTML=`学习工作台<br><b>v${VERSION}</b> · 手机 / 电脑双端<br><span>学习 → 练习 → 复习 → 检验</span>`;
}
function desktopHome(){
 if(innerWidth<1100)return;const h=$('#view-home');if(!h||!$('.deskContent'))return;let box=$('#r2DeskDashboard');if(!box){box=document.createElement('div');box.id='r2DeskDashboard';h.prepend(box)}
 const S=state(),sum=taskSummary(),acc=recentAcc(),weak=weakChapter(),session=!!S.session?.ids?.length,fin=subjectProgress('finance'),law=subjectProgress('law');
 box.innerHTML=`
 <section class="r2DeskHero"><div><span class="r2Eyebrow">SECURITIES STUDY WORKSPACE · v${VERSION}</span><h1>${session?'从上次停下的地方继续':'今天的学习路径已经排好'}</h1><p>${session?'不要重新开新任务，先把已有进度完成。':'先完成今日计划，再根据薄弱点补练。目标不是刷更多题，而是稳定通过考试。'}</p><div class="r2DeskActions"><button class="primary" data-r2="today">${session?'继续上次学习':'开始今日计划'}</button><button data-r2="learn">进入知识学习</button></div></div><aside><strong>${daysLeft()}<small>天</small></strong><span>距离考试</span><div><b>${targetDate()}</b><small>目标日期</small></div></aside></section>
 <section class="r2DeskStats"><article><span>今日已做</span><b>${sum.done}</b><small>目标 20 题</small></article><article><span>最近20题</span><b>${acc==null?'—':acc+'%'}</b><small>准确率趋势</small></article><article><span>当前错题</span><b>${sum.wrong}</b><small>需要复习</small></article><article><span>知识掌握</span><b>${sum.mastered}</b><small>已标记掌握</small></article></section>
 <section class="r2DeskGrid"><div class="r2DeskMain"><section class="r2Panel"><div class="r2SectionHead"><div><span class="r2Eyebrow">TODAY PLAN</span><h2>完成这三件事就够了</h2></div><small>按进度自动调整</small></div><div id="r2DeskAssistantHost"></div></section><section class="r2Panel"><div class="r2SectionHead"><div><span class="r2Eyebrow">SUBJECT PROGRESS</span><h2>两科推进</h2></div><button class="text" data-r2="stats">查看完整报告</button></div><div class="r2DeskSubjects"><article><div><span>金融市场基础知识</span><b>${fin.pct}%</b></div><div class="r2Track"><i style="width:${fin.pct}%"></i></div><small>${fin.done}/${fin.total||0} 已答</small></article><article><div><span>证券市场基本法律法规</span><b>${law.pct}%</b></div><div class="r2Track"><i style="width:${law.pct}%"></i></div><small>${law.done}/${law.total||0} 已答</small></article></div></section></div><aside class="r2DeskRail"><section class="r2Panel"><div class="r2SectionHead"><div><span class="r2Eyebrow">WEEKLY RHYTHM</span><h2>本周节奏</h2></div></div>${weekBars()}</section><section class="r2Panel r2Weak"><span class="r2Eyebrow">NEXT FOCUS</span><h3>${weak?esc(weak.name):'尚未形成薄弱点'}</h3><p>${weak?`累计 ${weak.count} 道错题，建议下一轮先处理这里。`:'继续学习后，系统会根据错题和正确率给出优先级。'}</p><button data-r2="review">进入错题复习</button></section><section class="r2Panel"><div class="r2SectionHead"><div><span class="r2Eyebrow">QUICK MODES</span><h2>快速进入</h2></div></div><div class="r2QuickList"><button data-r2="learn"><b>知识学习</b><span>理解框架和核心概念</span></button><button data-r2="practice"><b>刷题训练</b><span>章节 / 随机 / 未做</span></button><button data-r2="mock"><b>模拟考试</b><span>120题完整检验</span></button><button data-r2="sources"><b>学习资料</b><span>思维导图 / 易错 / 口诀</span></button></div></section></aside></section>`;
 box.querySelectorAll('[data-r2]').forEach(b=>b.onclick=()=>go(b.dataset.r2));
 const a=$('#assistantPlanV31');if(a){const host=$('#r2DeskAssistantHost');if(host&&a.parentNode!==host)host.appendChild(a)}
}
function mobileNav(){
 if(innerWidth>=1100)return;let n=$('#r2Tabs');if(!n){n=document.createElement('nav');n.id='r2Tabs';n.className='r2Tabs';n.innerHTML=`<button data-r2="home"><span>⌂</span><b>今天</b></button><button data-r2="learn"><span>◇</span><b>学习</b></button><button data-r2="practice"><span>✎</span><b>刷题</b></button><button data-r2="review"><span>↺</span><b>复习</b></button><button data-r2="stats"><span>▥</span><b>进度</b></button>`;document.body.appendChild(n);n.querySelectorAll('[data-r2]').forEach(b=>b.onclick=()=>go(b.dataset.r2))}
 syncNav();
}
function syncNav(){const v=activeView();$('#r2Tabs')?.querySelectorAll('[data-r2]').forEach(b=>b.classList.toggle('active',b.dataset.r2===v||(v==='learn'&&b.dataset.r2==='learn')));$('.deskNav')?.querySelectorAll('[data-r2]').forEach(b=>b.classList.toggle('active',b.dataset.r2===v||(v==='learn'&&b.dataset.r2==='learn')));const titles={home:['今日计划','先完成计划，再决定是否加练'],learn:['知识学习','先理解，再刷题'],practice:['刷题训练','专注当前一题，及时理解解析'],review:['错题复习','把错误原因真正解决'],stats:['学习报告','看趋势，不只看累计题量']};const t=titles[v]||titles.home;const b=$('#deskTitleV29'),s=$('#deskSubV29');if(b)b.textContent=t[0];if(s)s.textContent=t[1]}
function topVersion(){
 if(innerWidth<1100)return;const right=$('.deskTop .right');if(!right)return;let v=$('#r2DeskVersion');if(!v){v=document.createElement('button');v.id='r2DeskVersion';v.className='r2DeskVersion';v.innerHTML=`<span>当前版本</span><b>v${VERSION}</b>`;v.onclick=()=>$('.version')?.click();right.prepend(v)}
}
function pageHeadings(){
 const cfg={practice:['刷题训练','选择一种训练方式，然后专注完成当前任务。'],review:['错题复习','错题不是存档，必须重新理解并再次做对。'],stats:['学习报告','看学习节奏、正确率和薄弱点的变化。']};for(const [v,[t,p]] of Object.entries(cfg)){const el=$('#view-'+v);if(!el||el.querySelector('.r2PageHeading'))continue;const h=document.createElement('header');h.className='r2PageHeading';h.innerHTML=`<span class="r2Eyebrow">${v.toUpperCase()} · v${VERSION}</span><h1>${t}</h1><p>${p}</p>`;el.prepend(h)}
 const practice=$('#view-practice');if(practice&&!$('#r2PracticeModes')){const m=document.createElement('div');m.id='r2PracticeModes';m.className='r2PracticeModes';m.innerHTML=`<button data-r2="today"><b>今日练习</b><small>按计划继续</small></button><button data-action="new"><b>只做未做</b><small>扩展新题</small></button><button data-r2="review"><b>错题重练</b><small>优先补弱项</small></button><button data-r2="mock"><b>模拟考试</b><small>完整120题</small></button>`;const first=practice.querySelector('.section');first?.insertAdjacentElement('beforebegin',m);m.querySelectorAll('[data-r2]').forEach(b=>b.onclick=()=>go(b.dataset.r2));m.querySelector('[data-action="new"]')?.addEventListener('click',()=>click('#onlyNew'))}
 reviewTabs();statsInsight();
}
function reviewTabs(){const v=$('#view-review');if(!v)return;const secs=[...v.querySelectorAll(':scope > .section')];if(secs.length<2)return;secs[0].classList.add('r2WrongSection');secs[1].classList.add('r2FavSection');if($('#r2ReviewSwitch'))return;const s=document.createElement('div');s.id='r2ReviewSwitch';s.className='r2ReviewSwitch';s.innerHTML=`<button class="active" data-show="wrong">错题 <b>${(state().wrong||[]).length}</b></button><button data-show="fav">收藏 <b>${(state().fav||[]).length}</b></button>`;v.querySelector('.r2PageHeading')?.insertAdjacentElement('afterend',s);s.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>{s.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));v.dataset.reviewTab=b.dataset.show});v.dataset.reviewTab='wrong'}
function statsInsight(){const v=$('#view-stats');if(!v||$('#r2StatsInsight'))return;const S=state(),h=(S.history||[]).slice(0,50),acc=h.length?pct(h.filter(x=>x.ok).length,h.length):null,active=weekData().filter(x=>x.done>0).length,m=Object.values(mastery()).filter(Boolean).length,w=weakChapter();const x=document.createElement('section');x.id='r2StatsInsight';x.className='r2StatsInsight';x.innerHTML=`<article><span>近50题正确率</span><b>${acc==null?'—':acc+'%'}</b><small>比累计数据更能反映当前状态</small></article><article><span>本周活跃</span><b>${active}/7</b><small>保持节奏比单日爆量更重要</small></article><article><span>已掌握知识</span><b>${m}</b><small>在知识学习中主动标记</small></article><article><span>当前重点</span><b>${esc(w?.name||'暂无')}</b><small>${w?`错题 ${w.count} 道`:'继续学习后自动识别'}</small></article>`;v.querySelector('.r2PageHeading')?.insertAdjacentElement('afterend',x)}
function decorateLearn(){const v=$('#view-learn');if(!v)return;if(!v.querySelector('.r2LearnIntro')){const h=document.createElement('section');h.className='r2LearnIntro';h.innerHTML=`<div><span class="r2Eyebrow">KNOWLEDGE · v${VERSION}</span><h1>先把知识弄懂，再去刷题</h1><p>每个知识点主动判断“掌握 / 再复习”。学习进度会留在本机档案中。</p></div><div class="r2LearnProgress"><b id="r2MasterCount">0</b><span>已掌握</span></div>`;v.prepend(h)}
 v.querySelectorAll('.learnCard').forEach((c,i)=>{if(c.dataset.r2)return;c.dataset.r2='1';const title=c.querySelector('h3')?.textContent||('知识点'+i),key=title.trim();const actions=document.createElement('div');actions.className='r2LearnActions';actions.innerHTML=`<button data-master="1">✓ 掌握了</button><button data-master="0">↺ 再复习</button>`;c.appendChild(actions);const apply=()=>{const val=mastery()[key];c.classList.toggle('mastered',val===true);actions.querySelectorAll('button').forEach(b=>b.classList.toggle('active',String(val?1:0)===b.dataset.master))};actions.querySelectorAll('[data-master]').forEach(b=>b.onclick=()=>{const x=mastery();x[key]=b.dataset.master==='1';saveMastery(x);apply();updateMasterCount();statsInsightRefresh()});apply()});updateMasterCount()}
function updateMasterCount(){const b=$('#r2MasterCount');if(b)b.textContent=Object.values(mastery()).filter(Boolean).length}
function statsInsightRefresh(){const x=$('#r2StatsInsight');if(x){x.remove();statsInsight()}}
function polishDynamic(){
 brand();mobileNav();deskNav();topVersion();mobileHome();desktopHome();pageHeadings();decorateLearn();syncNav();
 const legacyMobile=$('#assistantMobileUserV31');if(legacyMobile)legacyMobile.classList.add('r2LegacyAccount');
 const health=$('#releaseHealth');if(health)health.classList.add('r2Health');
}
function observe(){const mo=new MutationObserver(()=>{clearTimeout(observe.t);observe.t=setTimeout(polishDynamic,60)});mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']})}
function boot(){polishDynamic();observe();let n=0;const t=setInterval(()=>{polishDynamic();if(++n>40)clearInterval(t)},350)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.SEC_UI_R2={version:VERSION,go,refresh:polishDynamic};
})();