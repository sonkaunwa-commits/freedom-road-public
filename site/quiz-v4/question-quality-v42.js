(()=>{
'use strict';
const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const tierMeta={
 A:{label:'A级·近期/高可信',weight:100,note:'最新考生回忆主题、官方公告/样例直接对应或高质量人工整理题。'},
 B:{label:'B级·核心教研',weight:80,note:'用户备考资料改编、重点知识点人工整理与高质量仿真题。'},
 C:{label:'C级·变式巩固',weight:55,note:'用于换问法、易错点、多选/案例变式训练。'},
 D:{label:'D级·覆盖补充',weight:15,note:'模板化或自动补强题，只保留作覆盖备用，不进入默认学习池。'}
};
function tierFor(q){
 const id=String(q.id||'');
 const st=String(q.sourceType||'');
 const quality=String(q.quality||'');
 const source=String(q.source||'');
 if(st==='recall_adapted'||st==='official_adapted')return 'A';
 if(quality.includes('latest-recall')||/2026年6月考生回忆/.test(source))return 'A';
 if(st==='study_material_adapted')return 'B';
 if(st==='official_style'||quality.includes('curated-v4.1'))return 'B';
 if(/^V41-/.test(id))return 'B';
 if(/^SUP24-/.test(id))return 'D';
 if(/^(GF|GL)\d+-0[1238]$/.test(id))return 'D';
 if(/^(GF|GL)\d+-0[4567]$/.test(id))return 'C';
 if(Array.isArray(q.oa)&&q.oa.length===(q.o||[]).length&&q.oa.filter(Boolean).length>=Math.min(3,(q.o||[]).length))return 'B';
 if(st==='original')return 'C';
 return 'C';
}
for(const q of B){
 if(!q||!q.id)continue;
 const tier=tierFor(q);
 q.qualityTier=tier;
 q.qualityLabel=tierMeta[tier].label;
 q.qualityWeight=tierMeta[tier].weight;
 q.quizEligible=tier!=='D';
 q.qualityReason=tierMeta[tier].note;
 if(tier==='D'){
   if(q.strict!==false)q._v42OriginalStrict=q.strict;
   q.strict=false;
 }
}
const counts={A:0,B:0,C:0,D:0};for(const q of B)if(q?.qualityTier)counts[q.qualityTier]++;
window.SEC_QUESTIONS=B;
window.SEC_V42_QUALITY={version:'4.2.0',counts,tiers:tierMeta,defaultPool:B.filter(q=>q?.quizEligible!==false).length,total:B.length};
})();