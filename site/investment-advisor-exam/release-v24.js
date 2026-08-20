(()=>{
const MIN=800;
function loadFix(){
 if(!document.querySelector('script[data-tg-ux-fix]')){const s=document.createElement('script');s.src='./ux-fix-v27.js?v=27';s.dataset.tgUxFix='1';document.head.appendChild(s)}
 window.EXAM_DESKTOP_V29_CONFIG={marker:'TG_DESKTOP_V29',site:'tg',stateKey:'tg_exam_state_v1',bank:'TG_QUESTIONS',dateKey:'tg_exam_target_date_v3',title:'投资顾问 2026',subtitle:'专项学习与模拟考试',eyebrow:'证券投资顾问专项备考工作台',mobileTop:'.topline',mobileNav:'.tabbar',questionSel:'.qcard h2',daily:'#dailyBtn',review:'wrong',submit:'#submitBtn',next:'#nextBtn',prev:'#prevBtn',mark:'#markBtn',finish:'#finishBtn',timer:'#timer',watch:'#submitBtn,#markBtn,#prevBtn,#nextBtn,#sheetBtn,#finishBtn',mockMeta:'120题 / 180分钟',progressMeta:'7章进度',nav:[['home','学习首页'],['practice','刷题练习'],['wrong','错题收藏'],['search','题目搜索'],['stats','学习统计']],subjects:null,mocks:[['tg','证券投资顾问业务','180分钟']]};
 if(!document.querySelector('link[data-exam-desktop-v29-fix]')){const l=document.createElement('link');l.rel='stylesheet';l.href='../exam-desktop-v29-fix.css?v=29';l.dataset.examDesktopV29Fix='1';document.head.appendChild(l)}
 if(!document.querySelector('script[data-exam-desktop-v29]')){const d=document.createElement('script');d.src='../exam-desktop-v29.js?v=29';d.dataset.examDesktopV29='1';document.head.appendChild(d)}
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=29',{updateViaCache:'none'}).catch(()=>{})
}
function health(){
 const B=Array.isArray(window.TG_QUESTIONS)?window.TG_QUESTIONS:[],chapters=new Set(B.map(q=>q.ch).filter(Boolean));
 const ids=new Set(),dups=[];let invalid=0;
 for(const q of B){if(ids.has(q.id))dups.push(q.id);ids.add(q.id);if(!q.id||!q.q||!Array.isArray(q.o)||q.o.length<2||!Array.isArray(q.a)||!q.a.length||q.a.some(i=>!Number.isInteger(i)||i<0||i>=q.o.length))invalid++}
 const plan=!!document.getElementById('examPlanCard'),pass=B.length>=MIN&&chapters.size>=7&&!dups.length&&!invalid&&plan;
 window.TG_RELEASE_HEALTH={version:'2.9',pass,total:B.length,chapters:chapters.size,invalid,duplicateIds:dups.length,plan};
 const badge=document.querySelector('.versionBadge');if(badge)badge.textContent='v2.9 · 手机/电脑双端 · 800+题 · 已验收';
 let box=document.getElementById('releaseHealth');const notice=document.querySelector('#view-home .notice');
 if(!box&&notice){box=document.createElement('div');box.id='releaseHealth';box.style.cssText='margin:10px 0;padding:10px 12px;border-radius:12px;font-size:11px;line-height:1.5';notice.insertAdjacentElement('afterend',box)}
 if(box){box.style.background=pass?'#ecfdf3':'#fef3f2';box.style.border='1px solid '+(pass?'#6ce9a6':'#fda29b');box.style.color=pass?'#05603a':'#912018';box.textContent=pass?`版本自检通过：题库 ${B.length} 题，覆盖 ${chapters.size} 章，独立考前计划已加载。`:`版本自检未通过：题库 ${B.length} 题，章节 ${chapters.size}，异常题 ${invalid}，重复ID ${dups.length}。本版本已暂停刷题入口。`}
 ['dailyBtn','randomBtn','mockBtn','startBtn','newBtn','wrongBtn','favBtn'].forEach(id=>{const e=document.getElementById(id);if(e&&!pass)e.disabled=true});
 loadFix();return pass;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(health,0));else setTimeout(health,0);
})();