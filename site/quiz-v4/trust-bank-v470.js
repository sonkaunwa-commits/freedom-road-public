(()=>{
'use strict';
const VERSION='4.7.0';
const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const official=/^https:\/\/(?:www\.|ks\.)?sac\.net\.cn\//i;
const historical=/历史|需校验|201[0-9]|202[0-4]年真题|旧题|过期/i;
const recall=/回忆|recall/i;
const openCandidate=/FIRE|CFLUE|开放候选|open[-_ ]?candidate/i;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function detailed(q){
  const opts=Array.isArray(q.o)?q.o:[];
  const oa=Array.isArray(q.oa)?q.oa:[];
  return clean(q.e).length>=18 && opts.length>=2 && oa.length===opts.length && oa.every(x=>clean(x).length>=10);
}
function classify(q){
  const text=[q.valid,q.sourceTruth,q.source,q.sourceBasis,q.quality].map(clean).join(' | ');
  const hasOfficial=official.test(clean(q.sourceUrl));
  const isHistorical=historical.test(text);
  const isRecall=recall.test(text)||q.sourceType==='recall_adapted';
  const isOpen=openCandidate.test(text);
  const hasDetail=detailed(q);
  const explicitOfficial=q.sourceType==='official'||/官方公开样例/.test(clean(q.sourceTruth));
  if(explicitOfficial && hasDetail && !isHistorical) return {tier:'A',eligible:true,reason:'官方公开题/样例，且具备完整解析'};
  if(hasOfficial && hasDetail && !isHistorical && !isRecall && !isOpen && q.strict!==false && q.quizEligible!==false)
    return {tier:'B',eligible:true,reason:'现行协会官方依据 + 完整逐项解析；题目本身为练习题，不冒充官方真题'};
  return {tier:'C',eligible:false,reason:isHistorical?'历史或待校验题':isRecall?'考生回忆/第三方回忆题':isOpen?'开放候选题':!hasOfficial?'缺少协会官方依据链接':!hasDetail?'缺少完整逐项解析':'未通过临考可信准入'};
}
let kept=0,removed=0;
for(const q of B){
  if(!q||!q.id) continue;
  const t=classify(q);
  q.trustTier=t.tier;
  q.trustReason=t.reason;
  q.trustPolicyVersion=VERSION;
  if(t.eligible){kept++;}
  else {removed++;q.strict=false;q.quizEligible=false;}
}
window.SEC_QUESTIONS=B;
window.SEC_V47_TRUST={version:VERSION,mode:'final-week-source-grounded',total:B.length,kept,removed,policy:'official-basis+detailed-rationale; historical/recall/open/unsourced excluded by default'};
})();
