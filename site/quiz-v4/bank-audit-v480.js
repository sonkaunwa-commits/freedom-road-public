(()=>{
'use strict';
const VERSION='4.8.0';
const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/[\s，。！？、；：,.!?;:（）()“”"'《》「」]/g,'').toLowerCase();
const badStem=/(常考知识点|考试抓手|最应记住|第一步应识别|换个问法|有助于正确理解|做题时|答题时|复习[「“"]|下面哪一项最能帮助|本题主要考查)/i;
const filler=/(无需考虑任何具体条件|不受任何市场规则约束|所有产品.*完全相同|只要涉及.*就可以忽略|任何情形下都|无条件适用|唯一判断依据)/i;
const seenExact=new Map(),seenConceptType=new Map();
let exactDup=0,templateDup=0,bad=0,kept=0;
function mode(q){if(q.type==='comprehensive')return 'comprehensive';if(q.type==='multi'||(q.a||[]).length>1)return 'multi';if(q.type==='judge')return 'judge';return 'single'}
function quarantine(q,reason){q.strict=false;q.quizEligible=false;q.auditV480='quarantined';q.auditReasonV480=reason;}
for(const q of B){
 if(!q||!q.id||q.strict===false)continue;
 const sig=norm(q.q)+'|'+(q.o||[]).map(norm).sort().join('|');
 if(seenExact.has(sig)){quarantine(q,'duplicate-stem-options');exactDup++;continue}else seenExact.set(sig,q.id);
 const text=[q.q,...(q.o||[])].map(clean).join(' ');
 if(badStem.test(clean(q.q))||filler.test(text)){quarantine(q,'meta-or-generic-filler');bad++;continue;}
 const generated=q.authenticityV46===true||/^SE23|^HV43-/.test(String(q.id));
 if(generated){
   const key=[q.s,clean(q.knowledge||q.ch),mode(q)].join('|');
   if(seenConceptType.has(key)){quarantine(q,'mechanical-concept-type-duplicate');templateDup++;continue}
   seenConceptType.set(key,q.id);
 }
 q.auditV480='passed';kept++;
}
window.SEC_QUESTIONS=B;
window.SEC_V480_AUDIT={version:VERSION,total:B.length,kept,exactDup,templateDup,bad,policy:'dedupe exact + one generated item per concept/type + quarantine meta/generic filler'};
})();
