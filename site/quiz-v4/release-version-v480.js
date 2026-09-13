(()=>{
'use strict';
const RELEASE='4.8.0';
const CORE='4.5.0';
function patch(){
  const cards=[...document.querySelectorAll('.meCard')];
  const card=cards.find(x=>x.querySelector('h3')?.textContent.trim()==='版本');
  if(!card)return;
  const rows=[...card.querySelectorAll('.statLine')];
  const quizRow=rows.find(x=>x.querySelector('span')?.textContent.trim()==='刷题器');
  if(quizRow){
    const label=quizRow.querySelector('span');
    const value=quizRow.querySelector('b');
    if(label)label.textContent='产品版本';
    if(value)value.textContent='v'+RELEASE;
  }
  if(!rows.some(x=>x.querySelector('span')?.textContent.trim()==='核心框架')){
    const syncRow=rows.find(x=>x.querySelector('span')?.textContent.trim()==='同步');
    const row=document.createElement('div');
    row.className='statLine';
    row.innerHTML='<span>核心框架</span><b>v'+CORE+'</b>';
    if(syncRow) card.insertBefore(row,syncRow); else card.appendChild(row);
  }
}
new MutationObserver(()=>queueMicrotask(patch)).observe(document.getElementById('main')||document.body,{childList:true,subtree:true});
patch();
window.SEC_RELEASE_V480={version:RELEASE,core:CORE};
})();
