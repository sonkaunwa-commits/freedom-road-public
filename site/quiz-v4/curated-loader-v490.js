(()=>{
'use strict';
const bank=Array.isArray(window.SEC_CURATED_V490)?window.SEC_CURATED_V490:[];
const ids=new Set();
const valid=[];
for(const q of bank){
 if(!q||!q.id||ids.has(q.id))continue;
 if(!q.q||!Array.isArray(q.o)||q.o.length<2||!Array.isArray(q.a)||!q.a.length)continue;
 if(!q.knowledge||!q.e||!Array.isArray(q.oa)||q.oa.length!==q.o.length)continue;
 if(!q.learn?.definition||!q.learn?.key||!q.learn?.wrong||!q.learn?.falsekey)continue;
 ids.add(q.id);valid.push({...q,strict:true,quizEligible:true,qualityTier:'A',curatedV490:true});
}
window.SEC_QUESTIONS=valid;
window.SEC_CURATED_BANK_V490={version:'4.9.0',count:valid.length,finance:valid.filter(q=>q.s==='finance').length,law:valid.filter(q=>q.s==='law').length,policy:'curated-only-no-legacy-generator'};
})();