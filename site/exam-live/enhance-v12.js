(()=>{
const oldRenderHome=renderHome,oldRenderStats=renderStats,oldQuestion=question;
const qnorm=s=>String(s||'').replace(/\s+/g,'');
tn=t=>t==='single'?'单选':t==='multi'?'多选':t==='comprehensive'?'综合题':'判断';
function strictBank(s){return Q.filter(q=>q.strict!==false&&(!s||q.s===s))}
function openBank(s){return Q.filter(q=>q.strict===false&&(!s||q.s===s))}
function modeBank(){const m=$('practiceBank')?.value||'strict';return m==='strict'?strictBank():m==='open'?openBank():Q}
function inject(){
 document.querySelector('.version').textContent='在线刷题 · v2.0 · 2026大纲优先';
 const notice=document.querySelector('.notice');
 if(notice&&!$('bankStatus'))notice.insertAdjacentHTML('afterend',`<div class="panel bankStatus" id="bankStatus"><div class="bankgrid"><div><b id="strictN">${strictBank().length}</b><small>高置信题</small></div><div><b id="openN">${openBank().length}</b><small>开放候选</small></div><div><b id="allN">${Q.length}</b><small>总题量</small></div></div><div class="banknote" id="bankNote">法规、数字阈值和历史题默认不进入高置信模拟。</div></div><div id="resumeWrap"></div><div id="weakWrap"></div>`);
 const f=document.querySelector('.filters');
 if(f&&!$('practiceBank'))f.insertAdjacentHTML('afterbegin','<div class="field"><label>题库范围</label><select id="practiceBank"><option value="strict">2026 高置信题库</option><option value="all">全部题库</option><option value="open">开放候选题</option></select></div>');
 const stats=document.querySelector('#view-stats .section');
 if(stats&&!$('sourcePanel'))stats.insertAdjacentHTML('beforeend',`<div class="panel" id="recentPanel"><div class="sectionTitle"><h2>最近答题</h2></div><div id="recentHistory"></div></div><div class="panel" id="sourcePanel"><div class="sectionTitle"><h2>题库说明</h2></div><div class="sourcecopy">高置信题库由原创模拟题、人工种子题和通过保守筛选的稳定金融知识题组成；开放候选题用于扩大练习覆盖，涉及法规、比例、期限、金额和交易规则时应以最新规则为准。公开数据源保留来源标识。</div><div id="sourceMeta" class="sourceMeta"></div></div><div class="panel" id="backupPanel"><div class="sectionTitle"><h2>学习记录</h2></div><div class="sourcecopy">记录只保存在当前浏览器。换手机前可导出，在新设备导入。</div><div class="btnrow"><button class="secondary" id="exportData">导出记录</button><button class="secondary" id="importData">导入记录</button></div><input id="importFile" type="file" accept="application/json" hidden></div>`);
 addStyles();bindExtra();sourceMeta();
}
function addStyles(){if($('v12style'))return;const s=document.createElement('style');s.id='v12style';s.textContent=`
.bankStatus{margin-bottom:12px}.bankgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}.bankgrid b{font-size:21px;display:block}.bankgrid small,.banknote,.sourcecopy{font-size:11px;color:#667085}.banknote{margin-top:9px;text-align:center}.resume12,.weak12{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:12px 14px;margin:10px 0;box-shadow:0 2px 10px rgba(16,24,40,.05)}.resume12 b,.weak12 b{display:block;font-size:14px}.resume12 small,.weak12 small{display:block;color:#667085;font-size:11px;margin-top:3px}.mini12{min-height:36px!important;padding:0 12px!important}.openTag{background:#fffaeb!important;color:#b54708!important}.source12{font-size:11px;color:#667085;margin-top:9px;padding-top:8px;border-top:1px dashed #e4e7ec}.recent12{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:8px 0;border-bottom:1px solid #e4e7ec}.recent12:last-child{border-bottom:0}.recent12 small{color:#667085}.sourceMeta{font-size:11px;color:#667085;margin-top:8px}.examtools{display:flex;gap:6px;align-items:center}.examtools button{min-height:32px;border-radius:9px;border:1px solid #e4e7ec;background:#fff;padding:0 9px;font-size:11px}.examCount{font-size:11px;color:#667085}.examSheet{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;margin:12px 0}.examSheet button{aspect-ratio:1;border:1px solid #e4e7ec;border-radius:9px;background:#fff;font-size:11px}.examSheet button.done{background:#eff4ff;border-color:#84adff;color:#175cd3}.examSheet button.mark{box-shadow:inset 0 0 0 2px #f79009}.examResult{background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:18px}.examScore{text-align:center;padding:10px}.examScore b{font-size:42px;display:block}.pass{color:#067647}.fail{color:#b42318}.reportRow{padding:9px 0;border-bottom:1px solid #e4e7ec;font-size:12px}.reportRow:last-child{border:0}.sourcePanel,.panel#recentPanel,.panel#backupPanel{margin-top:10px}.installTip{font-size:11px;color:#667085;margin-top:7px;text-align:center}@media(max-width:520px){.examSheet{grid-template-columns:repeat(8,1fr)}}`;
 document.head.appendChild(s)}
function bindExtra(){
 if($('practiceBank')){$('practiceBank').value=state.lastBank||'strict';$('practiceBank').onchange=()=>{state.lastBank=$('practiceBank').value;save()}}
 $('dailyBtn').onclick=()=>start('daily');$('lawSepBtn').onclick=()=>start('lawsep');$('mockBtn').onclick=chooseMock;$('startCustom').onclick=()=>start('custom');$('onlyNew').onclick=()=>start('new');$('wrongStart').onclick=()=>start('wrong');$('favStart').onclick=()=>start('fav');
 if($('exportData'))$('exportData').onclick=()=>{const b=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='证券刷题记录-'+dk()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 if($('importData'))$('importData').onclick=()=>$('importFile').click();
 if($('importFile'))$('importFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);state={...blank(),...(x.state||x)};save();toast('记录已导入')}catch(_){toast('文件格式不正确')}};r.readAsText(f)};
}
base=function(){let s=$('practiceSubject').value,ch=$('practiceChapter').value;return modeBank().filter(q=>(s==='all'||q.s===s)&&(ch==='all'||q.ch===ch))};
start=function(kind='custom'){
 let arr=base(),count=Number($('practiceCount').value||20);exam=false;clearInterval(timer);state.examAnswers={};state.examMarked=[];
 if(kind==='wrong')arr=Q.filter(q=>state.wrong.includes(q.id));if(kind==='fav')arr=Q.filter(q=>state.fav.includes(q.id));if(kind==='new')arr=arr.filter(q=>!(q.id in state.answered));
 if(kind==='daily'){arr=shuffle(strictBank()).slice(0,Math.min(20,strictBank().length));label='每日练习 20 题 · 高置信题库'}
 else if(kind==='lawsep'){arr=shuffle(strictBank('law').filter(q=>String(q.valid).includes('2026-09'))).slice(0,Math.min(30,strictBank('law').length));label='2026年9月纪法重点'}
 else{arr=shuffle(arr).slice(0,Math.min(count,arr.length));label=kind==='wrong'?'错题重练':kind==='fav'?'收藏练习':kind==='new'?'未做题':(($('practiceBank')?.value==='open'?'开放题库 · ':'')+'随机练习')}
 paper=arr;idx=0;if(!paper.length){toast('当前条件下没有题目');return}view('practice');question()
};
function chooseMock(){
 const f=strictBank('finance').length,l=strictBank('law').length;$('modalTitle').textContent='选择模拟考试科目';
 $('modalBody').innerHTML=`<button class="chapterBtn" data-mock="finance"><span><b>金融市场基础知识</b><small>120题 · 120分钟 · 高置信题 ${f}</small></span><span>›</span></button><button class="chapterBtn" data-mock="law"><span><b>证券市场基本法律法规</b><small>120题 · 120分钟 · 高置信题 ${l}</small></span><span>›</span></button>`;
 $('modalBack').classList.add('show');$('modalBody').querySelectorAll('[data-mock]').forEach(b=>b.onclick=()=>{$('modalBack').classList.remove('show');mock(b.dataset.mock)})
}
mock=function(subject='finance'){
 exam=true;state.examAnswers={};state.examMarked=[];let a=strictBank(subject);if(a.length<120){toast('该科高置信题不足120，暂无法完整模拟');return}paper=shuffle(a).slice(0,120);idx=0;label=sn(subject)+' · 模拟考试';examEnds=Date.now()+120*60*1000;view('practice');question();runTimer()
};
question=function(){
 oldQuestion();if(!paper.length)return;const q=paper[idx];state.session={ids:paper.map(q=>q.id),idx,label,exam,examEnds,at:Date.now()};localStorage.setItem(KEY,JSON.stringify(state));
 const tags=document.querySelector('.tags');if(tags&&q.source)tags.insertAdjacentHTML('beforeend',`<span class="tag ${q.strict===false?'openTag':''}">${esc(q.source)}</span>`);
 const card=document.querySelector('#questionArea .qcard');if(card&&!card.querySelector('.source12'))card.insertAdjacentHTML('beforeend',`<div class="source12">${q.strict===false?'开放候选题：涉及法规、比例、期限、金额或交易规则时，以最新法规和考试大纲为准。':'高置信练习题'}${q.knowledge?' · 知识点：'+esc(q.knowledge):''}</div>`);
 if(exam)prepareExamQuestion(q)
};
function prepareExamQuestion(q){
 const saved=(state.examAnswers||{})[q.id]||[];document.querySelectorAll('input[name=ans]').forEach(i=>{i.checked=saved.includes(+i.value);i.closest('.option').classList.toggle('selected',i.checked)});
 const submitBtn=$('submitAns');submitBtn.textContent=idx===paper.length-1?'保存答案':'保存并下一题';submitBtn.onclick=saveExamAnswer;$('skipAns').textContent=(state.examMarked||[]).includes(q.id)?'取消标记':'标记此题';$('skipAns').onclick=toggleMark;
 const m=document.querySelector('.modebar');if(m&&!m.querySelector('.examtools'))m.insertAdjacentHTML('beforeend',`<div class="examtools"><span class="examCount">已答 ${Object.keys(state.examAnswers||{}).length}/120</span><button id="examSheetBtn">答题卡</button><button id="finishExamBtn">交卷</button></div>`);
 if($('examSheetBtn'))$('examSheetBtn').onclick=showExamSheet;if($('finishExamBtn'))$('finishExamBtn').onclick=()=>finishExam(false);
}
function selected(){return [...document.querySelectorAll('input[name=ans]:checked')].map(x=>+x.value).sort((a,b)=>a-b)}
function saveExamAnswer(){const q=paper[idx],p=selected();if(!p.length){toast('请先选择答案');return}state.examAnswers=state.examAnswers||{};state.examAnswers[q.id]=p;save();if(idx<paper.length-1){idx++;question()}else showExamSheet()}
function toggleMark(){const id=paper[idx].id,a=state.examMarked||[];state.examMarked=a.includes(id)?a.filter(x=>x!==id):[...a,id];save();question()}
function showExamSheet(){
 const ans=state.examAnswers||{},marks=state.examMarked||[];$('modalTitle').textContent='模拟考试答题卡';$('modalBody').innerHTML=`<div class="sourcecopy">已答 ${Object.keys(ans).length}/120 · 标记 ${marks.length} 题。考试中不会显示答案，交卷后统一评分。</div><div class="examSheet">${paper.map((q,i)=>`<button data-ei="${i}" class="${ans[q.id]?'done':''} ${marks.includes(q.id)?'mark':''}">${i+1}</button>`).join('')}</div><button class="primary" id="sheetFinish" style="width:100%">确认交卷</button>`;$('modalBack').classList.add('show');$('modalBody').querySelectorAll('[data-ei]').forEach(b=>b.onclick=()=>{idx=+b.dataset.ei;$('modalBack').classList.remove('show');question()});$('sheetFinish').onclick=()=>finishExam(false)
}
function same(a,b){return JSON.stringify([...(a||[])].sort((x,y)=>x-y))===JSON.stringify([...(b||[])].sort((x,y)=>x-y))}
function finishExam(auto){
 if(!exam)return;if(!auto&&!confirm(`还有 ${120-Object.keys(state.examAnswers||{}).length} 题未作答，确定交卷吗？`))return;clearInterval(timer);$('modalBack').classList.remove('show');const ans=state.examAnswers||{};let correct=0,chs={};
 for(const q of paper){const ok=same(ans[q.id],q.a);if(ok)correct++;state.answered[q.id]=ok;state.wrong=ok?state.wrong.filter(x=>x!==q.id):uniq([...state.wrong,q.id]);state.history.unshift({id:q.id,ok,at:Date.now(),exam:true});chs[q.ch]=chs[q.ch]||{n:0,c:0};chs[q.ch].n++;if(ok)chs[q.ch].c++}
 state.history=state.history.slice(0,500);const k=dk();state.daily[k]=state.daily[k]||{done:0,correct:0};state.daily[k].done+=paper.length;state.daily[k].correct+=correct;state.lastExam={subject:paper[0]?.s,correct,total:paper.length,at:Date.now()};state.session=null;exam=false;save();const score=Math.round(correct/paper.length*100),pass=score>=60;
 $('questionArea').innerHTML=`<div class="examResult"><div class="examScore ${pass?'pass':'fail'}"><small>${sn(paper[0]?.s)} · 模拟考试</small><b>${score}</b><span>${correct}/${paper.length} · ${pass?'达到基本要求':'未达到基本要求'}</span></div><div class="panel"><div class="sectionTitle"><h2>章节表现</h2></div>${Object.entries(chs).map(([ch,z])=>`<div class="reportRow"><b>${esc(ch)}</b><span style="float:right">${Math.round(z.c/z.n*100)}% · ${z.c}/${z.n}</span></div>`).join('')}</div><div class="btnrow"><button class="primary" id="reviewExamWrong">复习本场错题</button><button class="secondary" id="backHomeExam">返回首页</button></div></div>`;
 $('reviewExamWrong').onclick=()=>{paper=paper.filter(q=>!same(ans[q.id],q.a));idx=0;label='本场错题复习';exam=false;question()};$('backHomeExam').onclick=()=>view('home');renderHome();renderStats();renderLists()
}
runTimer=function(){clearInterval(timer);let tick=()=>{let left=Math.max(0,examEnds-Date.now()),sec=Math.floor(left/1000),m=Math.floor(sec/60),s=sec%60;if($('timer'))$('timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;if(!left){clearInterval(timer);finishExam(true)}};tick();timer=setInterval(tick,1000)};
renderHome=function(){oldRenderHome();if($('strictN'))$('strictN').textContent=strictBank().length;if($('openN'))$('openN').textContent=openBank().length;if($('allN'))$('allN').textContent=Q.length;resumeUI();weakUI()};
renderStats=function(){oldRenderStats();recentUI();sourceMeta()};
function resumeUI(){const w=$('resumeWrap'),s=state.session;if(!w)return;if(!s||!s.ids?.length||Date.now()-(s.at||0)>7*864e5){w.innerHTML='';return}const ids=s.ids.filter(id=>Q.some(q=>q.id===id));if(!ids.length){w.innerHTML='';return}w.innerHTML=`<div class="resume12"><div><b>继续上次练习</b><small>${esc(s.label||'练习')} · 第 ${Math.min((s.idx||0)+1,ids.length)}/${ids.length} 题</small></div><button class="primary mini12" id="resume12btn">继续</button></div>`;$('resume12btn').onclick=()=>{paper=ids.map(id=>Q.find(q=>q.id===id)).filter(Boolean);idx=Math.min(s.idx||0,paper.length-1);label=s.label||'继续练习';exam=!!s.exam;examEnds=s.examEnds||0;view('practice');question();if(exam&&examEnds>Date.now())runTimer()}}
function weakUI(){const w=$('weakWrap');if(!w)return;const a=uniq(Q.filter(q=>q.strict!==false).map(q=>q.ch)).map(ch=>({ch,...cs(ch)})).filter(x=>x.done>=3).sort((a,b)=>a.acc-b.acc||b.done-a.done)[0];if(!a){w.innerHTML='';return}w.innerHTML=`<div class="weak12"><div><b>今日建议：强化 ${esc(a.ch)}</b><small>已答 ${a.done} 题 · 正确率 ${a.acc}%</small></div><button class="secondary mini12" id="weak12btn">专项练</button></div>`;$('weak12btn').onclick=()=>{paper=shuffle(strictBank().filter(q=>q.ch===a.ch)).slice(0,20);idx=0;label='薄弱章节专项';exam=false;view('practice');question()}}
function recentUI(){const e=$('recentHistory');if(!e)return;let a=(state.history||[]).slice(0,10);e.innerHTML=a.length?a.map(h=>{let q=Q.find(x=>x.id===h.id);return q?`<div class="recent12"><span>${h.ok?'✓':'✕'} ${esc(q.q).slice(0,34)}${q.q.length>34?'…':''}</span><small>${new Date(h.at).toLocaleDateString()}</small></div>`:''}).join(''):'<div class="empty">暂无答题记录</div>'}
function sourceMeta(){const e=$('sourceMeta');if(!e)return;const m=window.SEC_IMPORTED_META||{};e.innerHTML=`原创/种子高置信题：${strictBank().filter(q=>q.sourceType!=='public_dataset').length} 道；公开数据导入：${m.imported??Q.filter(q=>q.sourceType==='public_dataset').length} 道${m.cflue?`（CFLUE ${m.cflue}，FIRE ${m.fire||0}）`:''}。`}
function pwa(){if(!$('manifest12')){let l=document.createElement('link');l.id='manifest12';l.rel='manifest';l.href='./manifest.webmanifest';document.head.appendChild(l)}if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{})}
inject();renderHome();renderStats();pwa();
})();
