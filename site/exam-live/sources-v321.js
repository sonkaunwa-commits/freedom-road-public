(()=>{
const MARK='SEC_SOURCES_V321';
const DATA=[
 {id:'law-01',subject:'law',order:'01',type:'教材变动解读',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cuwOCxL00KXk',use:'先看变化，再决定复习重点'},
 {id:'law-02',subject:'law',order:'02',type:'思维导图',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cdYO9pmmKVSu',use:'建立章节框架，适合系统复习前快速扫一遍'},
 {id:'law-04',subject:'law',order:'04',type:'考前25页纸',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/clniaoASeBrr',use:'适合冲刺阶段集中复盘'},
 {id:'law-05',subject:'law',order:'05',type:'考前7页纸',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cg17xmSUehLE',use:'考前最后压缩复习'},
 {id:'law-06',subject:'law',order:'06',type:'易错易混知识点总结',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/ciL87UpkFoBd',use:'错题复盘时重点对照'},
 {id:'law-08',subject:'law',order:'08',type:'数字总结',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/ckJ31YArROqG',use:'专门记期限、比例、金额等数字考点'},
 {id:'law-09',subject:'law',order:'09',type:'必背百条',title:'2026新大纲 证券法规',url:'https://www.kdocs.cn/l/cicqH7FpeMdp',use:'适合每日少量滚动背诵'},
 {id:'finance-00',subject:'finance',order:'00',type:'新旧大纲变动对比',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cbBL9Y1pCHuU',use:'先确认2026新增、删除和调整内容'},
 {id:'finance-01',subject:'finance',order:'01',type:'教材变动解读',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cjhe7Vb0eOKg',use:'理解新版教材变化与复习重点'},
 {id:'finance-02',subject:'finance',order:'02',type:'思维导图',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/csoiWVyhUELX',use:'先建立完整知识框架'},
 {id:'finance-03',subject:'finance',order:'03',type:'口诀总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/crFJv7gyraGW',use:'把高频规则压缩成记忆钩子'},
 {id:'finance-04',subject:'finance',order:'04',type:'考前30页纸',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cndqNzWMFuwn',use:'冲刺阶段系统压缩复习'},
 {id:'finance-05',subject:'finance',order:'05',type:'考前7页纸',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cuoziItRc5Yk',use:'考前最后快速过一遍'},
 {id:'finance-06',subject:'finance',order:'06',type:'易错易混知识点总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cs7qsqcYCn6U',use:'配合错题本专门攻克混淆点'},
 {id:'finance-08',subject:'finance',order:'08',type:'数字总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/csvOhrkbJuDw',use:'集中记比例、期限和数量关系'},
 {id:'finance-09',subject:'finance',order:'09',type:'计算总结',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/ckHrBXLtCHHK',use:'计算题集中复习和公式回顾'},
 {id:'finance-10',subject:'finance',order:'10',type:'必背百条',title:'2026新大纲 证券金融',url:'https://www.kdocs.cn/l/cpMtXDwBDL6V',use:'每日滚动记忆高频考点'}
];
window.SEC_EXTERNAL_SOURCES={version:'3.2.1',count:DATA.length,law:DATA.filter(x=>x.subject==='law').length,finance:DATA.filter(x=>x.subject==='finance').length,status:'indexed-links',items:DATA};
window[MARK]=true;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function css(){if($('#sourcesV321Style'))return;const l=document.createElement('link');l.id='sourcesV321Style';l.rel='stylesheet';l.href='./sources-v321.css?v=321';document.head.appendChild(l)}
function openSource(url){window.open(url,'_blank','noopener,noreferrer')}
function library(){let b=$('#sourcesModalV321');if(!b){b=document.createElement('div');b.id='sourcesModalV321';b.className='sourcesModalBackV321';b.innerHTML=`<section class="sourcesModalV321"><header><div><span class="sourcesEyebrowV321">学习资料库</span><h2>2026 新大纲外部资料索引</h2><p>已登记 ${DATA.length} 份唯一资料。当前只做链接索引和学习路径整理，尚未宣称已读取或导入正文。</p></div><button id="sourcesCloseV321">×</button></header><div class="sourcesTabsV321"><button data-sub="all" class="active">全部 ${DATA.length}</button><button data-sub="law">法规 ${DATA.filter(x=>x.subject==='law').length}</button><button data-sub="finance">金融 ${DATA.filter(x=>x.subject==='finance').length}</button></div><div id="sourcesListV321"></div><div class="sourcesNoteV321">建议学习顺序：变动解读/大纲对比 → 思维导图 → 口诀/易错/数字/计算 → 必背 → 考前压缩资料。后续正文可读取后，再升级为知识卡、口诀卡、易错卡和关联题。</div></section>`;document.body.appendChild(b);$('#sourcesCloseV321').onclick=()=>b.classList.remove('show');b.onclick=e=>{if(e.target===b)b.classList.remove('show')};b.querySelectorAll('[data-sub]').forEach(x=>x.onclick=()=>{b.querySelectorAll('[data-sub]').forEach(y=>y.classList.toggle('active',y===x));renderList(x.dataset.sub)})}renderList('all');b.classList.add('show')}
function renderList(sub='all'){const list=$('#sourcesListV321');if(!list)return;const rows=DATA.filter(x=>sub==='all'||x.subject===sub);list.innerHTML=`<div class="sourcesGridV321">${rows.map(x=>`<article class="sourceCardV321"><div class="sourceTopV321"><span class="sourceSubjectV321 ${x.subject}">${x.subject==='law'?'法规':'金融'}</span><span class="sourceOrderV321">${x.order}</span></div><h3>${esc(x.type)}</h3><p>${esc(x.use)}</p><button data-url="${esc(x.url)}">打开原文 ↗</button></article>`).join('')}</div>`;list.querySelectorAll('[data-url]').forEach(x=>x.onclick=()=>openSource(x.dataset.url))}
function card(){const home=$('#view-home');if(!home||$('#sourcesCardV321'))return;const c=document.createElement('section');c.id='sourcesCardV321';c.className='sourcesCardV321';c.innerHTML=`<div><span>学习资料库 · v3.2.1</span><h3>17份外部资料已登记</h3><p>法规 7 份 · 金融 10 份。先按用途分类使用，正文解析完成后再转成知识卡和记忆训练。</p></div><button id="sourcesOpenV321">查看资料库</button>`;const a=$('#assistantPlanV31')||$('#assistantMobileV31')||$('#productHubV26')||home.querySelector('.notice');if(a)a.insertAdjacentElement('afterend',c);else home.insertBefore(c,home.firstChild);$('#sourcesOpenV321').onclick=library}
function deskButton(){const top=$('.deskTop .right');if(top&&!$('#sourcesDeskBtnV321')){const b=document.createElement('button');b.id='sourcesDeskBtnV321';b.textContent='学习资料';b.onclick=library;top.prepend(b)}}
function boot(){css();card();deskButton();let n=0;const t=setInterval(()=>{card();deskButton();if(++n>30)clearInterval(t)},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();