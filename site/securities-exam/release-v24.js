(()=>{
const MIN=800;
function loadFix(){
 if(!document.querySelector('script[data-sec-ux-fix]')){const s=document.createElement('script');s.src='./ux-fix-v27.js?v=27';s.dataset.secUxFix='1';document.head.appendChild(s)}
 if(!document.querySelector('script[data-sec-buddy-v30]')){const b=document.createElement('script');b.src='./buddy-v30.js?v=30';b.dataset.secBuddyV30='1';document.head.appendChild(b)}
 window.EXAM_DESKTOP_V29_CONFIG={marker:'SEC_DESKTOP_V29',site:'sec',stateKey:'sec2026state_v1',bank:'SEC_QUESTIONS',dateKey:'sec_exam_target_date_v3',title:'证券从业 2026',subtitle:'学习与模拟考试',eyebrow:'证券从业资格备考工作台',mobileTop:'.topbar',mobileNav:'nav.tabs',questionSel:'.question',daily:'#dailyBtn',review:'review',submit:'#submitAns',next:'#nextQ',prev:'#prevQ',mark:'#skipAns',finish:'#finishExamBtn',timer:'#timer',watch:'#submitAns,#skipAns,#prevQ,#nextQ,#examSheetBtn,#finishExamBtn',mockMeta:'120题 / 120分钟',progressMeta:'两科进度',nav:[['home','学习首页'],['practice','刷题练习'],['review','错题收藏'],['stats','学习统计']],subjects:[['finance','金融市场基础知识'],['law','证券市场基本法律法规']],mocks:[['finance','金融市场基础知识','120分钟'],['law','证券市场基本法律法规','120分钟']]};
 if(!document.querySelector('link[data-exam-desktop-v29-fix]')){const l=document.createElement('link');l.rel='stylesheet';l.href='../exam-desktop-v29-fix.css?v=29';l.dataset.examDesktopV29Fix='1';document.head.appendChild(l)}
 if(!document.querySelector('script[data-exam-desktop-v29]')){const d=document.createElement('script');d.src='../exam-desktop-v29.js?v=29';d.dataset.examDesktopV29='1';document.head.appendChild(d)}
 if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=30',{updateViaCache:'none'}).catch(()=>{})
}
function health(){
 const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[],strict=B.filter(q=>q.strict!==false),open=B.length-strict.length;
 const finance=strict.filter(q=>q.s==='finance').length,law=strict.filter(q=>q.s==='law').length;
 const ids=new Set(),dups=[];let invalid=0;
 for(const q of B){if(ids.has(q.id))dups.push(q.id);ids.add(q.id);if(!q.id||!q.q||!Array.isArray(q.o)||q.o.length<2||!Array.isArray(q.a)||!q.a.length||q.a.some(i=>!Number.isInteger(i)||i<0||i>=q.o.length))invalid++}
 const plan=!!document.getElementById('examPlanCard'),pass=strict.length>=MIN&&finance>=120&&law>=120&&!dups.length&&!invalid&&plan;
 window.SEC_RELEASE_HEALTH={version:'3.0',pass,total:B.length,strict:strict.length,open,finance,law,invalid,duplicateIds:dups.length,plan,buddy:true};
 const v=document.querySelector('.version');if(v)v.textContent='在线刷题 · v3.0 · 阿兰×小小王学习搭子 · 手机/电脑双端';
 let box=document.getElementById('releaseHealth');const notice=document.querySelector('#view-home .notice');
 if(!box&&notice){box=document.createElement('div');box.id='releaseHealth';box.style.cssText='margin:10px 0;padding:10px 12px;border-radius:12px;font-size:11px;line-height:1.5';notice.insertAdjacentElement('afterend',box)}
 if(box){box.style.background=pass?'#ecfdf3':'#fef3f2';box.style.border='1px solid '+(pass?'#6ce9a6':'#fda29b');box.style.color=pass?'#05603a':'#912018';box.textContent=pass?`版本自检通过：高置信 ${strict.length} 题（金融 ${finance} / 法规 ${law}），总计 ${B.length} 题。手机端已启用阿兰×小小王学习搭子。`:`版本自检未通过：高置信 ${strict.length} 题，金融 ${finance}，法规 ${law}，异常题 ${invalid}，重复ID ${dups.length}。本版本已暂停刷题入口。`}
 ['dailyBtn','randomBtn','lawSepBtn','mockBtn','startCustom','onlyNew','wrongStart','favStart'].forEach(id=>{const e=document.getElementById(id);if(e&&!pass)e.disabled=true});
 loadFix();return pass;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(health,0));else setTimeout(health,0);
})();