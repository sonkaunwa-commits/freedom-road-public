(()=>{
  const VERSION='08/22 18:12';
  const RELEASE='FUND_ASSISTANT_UI_20260822_1812';
  function apply(){
    document.body.dataset.release=RELEASE;
    let v=document.querySelector('.ui-version');
    if(v){v.textContent=`界面版本 ${VERSION}`;v.dataset.release=RELEASE;return;}
    const state=document.querySelector('#state');
    if(state){v=document.createElement('div');v.className='ui-version';v.dataset.release=RELEASE;v.textContent=`界面版本 ${VERSION}`;state.insertAdjacentElement('afterend',v);}
  }
  apply();
  new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
})();
