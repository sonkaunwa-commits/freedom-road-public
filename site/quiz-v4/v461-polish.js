(()=>{
'use strict';
const VERSION='4.6.1';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const norm=s=>String(s||'').replace(/[\s，。！？、；：,.!?;:（）()“”"'《》「」]/g,'').toLowerCase();
const bank=()=>Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const genericReason=/(回到.*定义|适用条件或业务边界|正确框架|判断抓手|无条件结论|绝对化表述|与.*定义.*不一致|结合题干条件)/;
function currentQuestion(){const h=$('.questionCard h1');if(!h)return null;const t=h.textContent.trim();return bank().find(q=>String(q.q||'').trim()===t)||null}
function letters(q){return (q?.a||[]).map(i=>String.fromCharCode(65+i)).join('、')||'—'}
function correctWhy(q){return (q.a||[]).map(i=>q.oa?.[i]).filter(Boolean).join('；')||q.e||''}
function reasonFor(q,i){
 const raw=String(q?.oa?.[i]||'').trim(),text=String(q?.o?.[i]||''),right=(q?.a||[]).includes(i),l=q?.learn||{};
 if(q?.bankPolishV461&&raw)return raw;
 if(raw&&raw.length>=26&&!genericReason.test(raw))return raw;
 if(right){return `这项成立。它与本题核心规则一致：${l.definition||q.e||'按题干给出的主体、条件和业务规则判断'}${l.key?`。判断时抓住：${l.key}`:''}`}
 const abs=text.match(/(一定|必然|完全|任何|全部|绝不|无条件|唯一|只能|永远|一律)/)?.[1];
 if(abs)return `这项错在把有条件成立的规则说成“${abs}”成立。考试判断时不能只看绝对词，而要核对适用主体、条件和例外。${l.definition?`本题正确框架是：${l.definition}`:''}`;
 if(l.wrong&&norm(text).includes(norm(l.wrong).slice(0,Math.min(12,norm(l.wrong).length))))return `这项正好落入该知识点的典型误区。错因是：${l.wrong}。${l.definition?`正确理解是：${l.definition}`:''}`;
 if(l.falsekey)return `这项没有满足本题规则的边界，容易把相近概念或例外条件混在一起。需要排除的陷阱是：${l.falsekey}。${l.key?`真正的判断抓手是：${l.key}`:''}`;
 return `这项不成立。不要只记“它是错项”，要回到题干的主体、业务性质和限定条件逐一核对。${q.e?`本题依据：${q.e}`:''}`;
}
function enrichRelated(q){
 for(const row of $$('.v451Related')){
  if($('.v461RelatedAnswer',row))continue;
  const stem=$('span',row)?.textContent?.trim();if(!stem)continue;const r=bank().find(x=>String(x.q||'').trim()===stem);if(!r)continue;
  const box=document.createElement('div');box.className='v461RelatedAnswer';box.innerHTML=`<b>答案：${esc(letters(r))}</b><p>${esc(correctWhy(r))}</p>`;row.appendChild(box);
 }
}
function teachingBlock(q){const l=q?.learn||{};if(!l.definition&&!l.key&&!q.e)return '';
 const trap=l.wrong||l.falsekey||'重点看题干限定条件，不要凭熟悉词直接选答案。';
 const landing=correctWhy(q)||q.e||'';
 return `<div class="v461TeachingDetail"><p><b>先把规则讲明白：</b>${esc(l.definition||q.e||'')}</p>${l.key?`<p><b>考试怎么判断：</b>${esc(l.key)}</p>`:''}<p><b>容易错在哪里：</b>${esc(trap)}</p>${landing?`<p><b>回到这道题：</b>${esc(landing)}</p>`:''}</div>`;
}
function enrichTeaching(q){
 const blocks=$$('.v451Block');let course=blocks.find(x=>$('h3',x)?.textContent?.includes('课程对应讲解'));
 if(course){if(!$('.v461TeachingDetail',course))course.insertAdjacentHTML('beforeend',teachingBlock(q));return}
 if($('.v461MaterialTeaching'))return;const source=blocks.find(x=>$('h3',x)?.textContent?.includes('题源与可信度'));const sec=document.createElement('section');sec.className='v451Block v461MaterialTeaching';sec.innerHTML=`<h3>备考资料对应讲解</h3>${teachingBlock(q)}`;(source||$('.v451Deep'))?.before?.(sec);
}
function deepenOptions(q){const rows=$$('.v451OptionRow');if(!rows.length)return;rows.forEach((row,i)=>{const s=$(':scope>span',row);if(!s)return;const better=reasonFor(q,i);if(better&&s.textContent.trim()!==better)s.textContent=better})}
function enhanceExplanation(){const deep=$('.v451Deep'),q=currentQuestion();if(!deep||!q)return;deepenOptions(q);enrichRelated(q);enrichTeaching(q);deep.dataset.v461='1'}
function polishHome(){const resume=$('#resumeSession');if(!resume)return;const txt=resume.innerText;for(const b of $$('[data-start-sub]')){const want=b.dataset.startSub==='finance'?'金融 · 刷题':'法规 · 刷题';if(txt.includes(want)){const m=txt.match(/已到\s*(\d+)\/(\d+)/);b.textContent=m?`继续本组 · ${m[1]}/${m[2]}`:'继续本组';b.dataset.resumeCurrent='1'}else{b.textContent='继续刷这科';delete b.dataset.resumeCurrent}}}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-start-sub]');if(!b||b.dataset.resumeCurrent!=='1')return;const resume=$('#resumeSession');if(!resume)return;e.preventDefault();e.stopImmediatePropagation();resume.click()},true);
const mo=new MutationObserver(()=>queueMicrotask(()=>{polishHome();enhanceExplanation()}));mo.observe(document.body,{childList:true,subtree:true});polishHome();enhanceExplanation();
window.SEC_QUIZ_V461={version:VERSION,features:['continue-subject-resumes-current-group','humanized-option-reasons','related-question-answers','expanded-course-or-material-teaching']};
})();