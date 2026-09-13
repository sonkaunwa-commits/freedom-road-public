(()=>{
'use strict';
const curated=Array.isArray(window.SEC_CURATED_V490)?window.SEC_CURATED_V490:[];
const fire=Array.isArray(window.SEC_FIRE_V491)?window.SEC_FIRE_V491:[];
const seen=new Set();
const valid=[];
function sig(q){return String(q?.q||'').replace(/[\s，。！？、；：,.!?;:（）()“”"'《》「」]/g,'').toLowerCase()}
function add(q,kind){
 if(!q||!q.id||!q.q||!Array.isArray(q.o)||q.o.length<2||!Array.isArray(q.a)||!q.a.length)return;
 const s=sig(q);if(!s||seen.has(s))return;seen.add(s);
 valid.push({...q,strict:true,quizEligible:true,sourcePoolV491:kind});
}
curated.forEach(q=>add({...q,qualityTier:q.qualityTier||'A',curatedV490:true},'curated'));
fire.forEach(q=>add(q,'fire'));
window.SEC_QUESTIONS=valid;
const meta=window.SEC_FIRE_META_V491||{};
window.SEC_BANK_V491={
 version:'4.9.1',
 count:valid.length,
 finance:valid.filter(q=>q.s==='finance').length,
 law:valid.filter(q=>q.s==='law').length,
 curated:valid.filter(q=>q.sourcePoolV491==='curated').length,
 fire:valid.filter(q=>q.sourcePoolV491==='fire').length,
 fireMeta:meta,
 policy:'curated deep-explanation questions + Apache-2.0 FIRE securities source bank; legacy generated bank excluded'
};
})();
