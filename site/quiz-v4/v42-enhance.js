(()=>{
'use strict';
const VERSION='4.2.0';
const MKEY='sec_v42_mastery_v1';
const TKEY='sec_v42_transfer_history';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
const bank=()=>Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS.filter(q=>q&&q.strict!==false):[];
function currentQuestion(){const h=$('.questionCard h1');if(!h)return null;const t=h.textContent.trim();return bank().find(q=>String(q.q||'').trim()===t)||null;}
function masteryKey(q){return `${q.s}|${q.knowledge||q.ch||q.id}`;}
function masteryLabel(level){return level>=4?'已掌握':level===3?'较稳定':level===2?'正在巩固':level===1?'刚开始掌握':'需要复习';}
function recordMastery(q,ok,kind='main'){
 if(!q)return null;
 const all=read(MKEY,{}),k=masteryKey(q),old=all[k]||{level:0,streak:0,wrong:0,lastAt:0,dueAt:0};
 const now=Date.now();let level=old.level||0,streak=old.streak||0,wrong=old.wrong||0;
 if(ok){streak+=1;level=Math.min(4,level+1);}else{wrong+=1;streak=0;level=Math.max(0,level-1);}
 const delays=ok?[0,4*3600e3,24*3600e3,3*86400e3,7*86400e3]:[10*60e3];
 const dueAt=now+(ok?(delays[level]||7*86400e3):delays[0]);
 all[k]={level,streak,wrong,lastAt:now,dueAt,lastKind:kind};write(MKEY,all);return all[k];
}
function tierBadge(q){
 const strip=$('.sourceStrip');if(!strip||!q?.qualityTier||$('.qualityBadge',strip))return;
 const b=document.createElement('span');b.className=`qualityBadge tier${q.qualityTier}`;b.textContent=q.qualityLabel||`${q.qualityTier}级`;b.title=q.qualityReason||'';strip.querySelector('b')?.insertAdjacentElement('afterend',b);
}
function enhanceHome(){
 const hero=$('.hero');if(!hero||hero.dataset.v42==='1')return;hero.dataset.v42='1';
 const p=$('p',hero);if(p)p.textContent='默认只刷高价值题：重点题优先，答错当场解释，再用同考点变式确认是否真的理解。';
 const meta=window.SEC_V42_QUALITY;if(meta){const x=document.createElement('div');x.className='qualitySummary';x.innerHTML=`<b>高价值学习池 ${meta.defaultPool} 题</b><span>已过滤 ${Math.max(0,meta.total-meta.defaultPool)} 道模板化覆盖题；不是题越多越好。</span><div class="qualityLegend"><i class="tierA">A 近期/高可信 ${meta.counts.A||0}</i><i class="tierB">B 核心教研 ${meta.counts.B||0}</i><i class="tierC">C 变式巩固 ${meta.counts.C||0}</i></div>`;hero.insertAdjacentElement('afterend',x);}
 $$('.subjectMeta span').forEach((x,i)=>{if(i%2===1)x.textContent='高价值学习';});
 const smart=$('[data-mode="smart"]');if(smart){const b=$('b',smart),s=$('span',smart);if(b)b.textContent='高价值复习';if(s)s.textContent='重点题 + 错题 + 变式';}
}
function pickVariant(q){
 const hist=new Set(read(TKEY,[]));const rows=bank().filter(x=>x.id!==q.id&&!hist.has(x.id)&&x.s===q.s&&x.qualityTier!=='D');
 let c=rows.filter(x=>q.knowledge&&x.knowledge===q.knowledge&&x.type!==q.type);
 if(!c.length)c=rows.filter(x=>q.knowledge&&x.knowledge===q.knowledge);
 if(!c.length)c=rows.filter(x=>x.ch===q.ch&&x.type!==q.type);
 if(!c.length)return null;
 c.sort((a,b)=>(b.qualityWeight||0)-(a.qualityWeight||0));return c[0];
}
function transferQuiz(q){
 const v=pickVariant(q);if(!v)return '';
 const hint=v.type==='multi'?'可多选':v.type==='judge'?'判断正误':'单选';
 return `<section class="transferQuiz" data-qid="${esc(v.id)}"><div class="transferHead"><div><b>马上换个问法</b><span>同考点复测 · ${esc(hint)}</span></div><span class="qualityBadge tier${esc(v.qualityTier||'C')}">${esc(v.qualityLabel||'变式题')}</span></div>${v.caseStem?`<p class="transferCase">${esc(v.caseStem)}</p>`:''}<p class="transferQ">${esc(v.q)}</p><div class="transferOptions">${(v.o||[]).map((o,i)=>`<button data-i="${i}"><i>${String.fromCharCode(65+i)}</i><span>${esc(o)}</span></button>`).join('')}</div><button class="transferSubmit" disabled>提交变式</button><div class="transferResult"></div></section>`;
}
function bindTransfer(root,q){
 const box=$('.transferQuiz',root);if(!box||box.dataset.bound==='1')return;box.dataset.bound='1';const v=bank().find(x=>x.id===box.dataset.qid);if(!v)return;const selected=new Set();const multi=v.type==='multi';const opts=$$('.transferOptions button',box),submit=$('.transferSubmit',box);
 opts.forEach((b,i)=>b.onclick=()=>{if(b.disabled)return;if(multi){selected.has(i)?selected.delete(i):selected.add(i)}else{selected.clear();selected.add(i)}opts.forEach((x,n)=>x.classList.toggle('selected',selected.has(n)));submit.disabled=!selected.size;});
 submit.onclick=()=>{const ans=[...selected].sort((a,b)=>a-b),correct=[...(v.a||[])].sort((a,b)=>a-b),ok=ans.length===correct.length&&ans.every((x,i)=>x===correct[i]);opts.forEach((b,i)=>{b.disabled=true;b.classList.remove('selected');if(correct.includes(i))b.classList.add('correct');else if(selected.has(i))b.classList.add('wrong');});submit.remove();const r=$('.transferResult',box);r.innerHTML=`<div class="transferOutcome ${ok?'good':'bad'}">${ok?'✓ 这次会了':'× 还没完全掌握'} · 正确答案 ${correct.map(i=>String.fromCharCode(65+i)).join('、')}</div><p>${esc(v.e||'')}</p>${Array.isArray(v.oa)?`<div class="transferReasons">${v.oa.map((x,i)=>`<span><b>${String.fromCharCode(65+i)}</b>${esc(x)}</span>`).join('')}</div>`:''}`;recordMastery(v,ok,'transfer');const hist=read(TKEY,[]);write(TKEY,[v.id,...hist.filter(x=>x!==v.id)].slice(0,120));};
}
function enrichFeedback(){
 const fb=$('#feedback');if(!fb||!$('.result',fb)||fb.dataset.v42==='1')return;const q=currentQuestion();if(!q)return;fb.dataset.v42='1';const ok=!!$('.result.good',fb);const m=recordMastery(q,ok,'main');const explain=$('.explain',fb);if(!explain)return;
 const master=document.createElement('div');master.className='masteryBlock';master.innerHTML=`<div><b>知识点状态：${masteryLabel(m.level)}</b><span>${ok?'答对后仍会隔一段时间换问法复测':'这次没掌握，先看解析，再马上做一道变式'}</span></div><em>${m.level}/4</em>`;explain.appendChild(master);
 const html=transferQuiz(q);if(html){const wrap=document.createElement('div');wrap.innerHTML=html;explain.appendChild(wrap.firstElementChild);bindTransfer(explain,q);}
}
function enhanceGuide(){const g=$('.sourceGuide');if(!g||g.dataset.v42==='1')return;g.dataset.v42='1';const m=window.SEC_V42_QUALITY;if(!m)return;const d=document.createElement('div');d.className='guideItem qualityGuide';d.innerHTML=`<b>默认学习池已做质量分层</b><span>A/B/C级进入日常刷题；D级模板化补强题保留在底层但不主动推送。当前默认学习池 ${m.defaultPool}/${m.total} 题。</span>`;const first=$('.guideItem',g);first?first.before(d):g.appendChild(d);}
function run(){const q=currentQuestion();if(q)tierBadge(q);enhanceHome();enrichFeedback();enhanceGuide();if(document.title.includes('v4.1'))document.title='证券从业刷题 · v4.2';}
const obs=new MutationObserver(()=>queueMicrotask(run));obs.observe($('#main')||document.body,{childList:true,subtree:true});
const bodyObs=new MutationObserver(()=>queueMicrotask(enhanceGuide));bodyObs.observe(document.body,{childList:true});
run();
window.SEC_QUIZ_V42={version:VERSION,features:['quality-tiered-pool','inline-transfer-practice','knowledge-mastery','low-value-filter']};
})();