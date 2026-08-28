(()=>{
'use strict';
const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const C=Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:[];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/[\s，。！？、；：,.!?;:（）()“”"'《》「」]/g,'').toLowerCase();
const unique=arr=>[...new Set(arr.map(clean).filter(Boolean))];
const conceptMap=new Map(C.map(c=>[`${c.s}|${clean(c.term)}`,{...c}]));

function deriveExtraConcepts(){
 const groups=new Map();
 for(const q of B.filter(x=>/^SE23\d+/.test(String(x.id||'')))){
   const k=`${q.s}|${clean(q.knowledge)}`; if(!groups.has(k))groups.set(k,[]); groups.get(k).push(q);
 }
 for(const [k,rows] of groups){
   if(conceptMap.has(k))continue;
   const term=clean(rows[0]?.knowledge),s=rows[0]?.s,ch=rows[0]?.ch;
   const q02=rows.find(x=>/02$/.test(x.id)),q03=rows.find(x=>/03$/.test(x.id)),q04=rows.find(x=>/04$/.test(x.id)),q06=rows.find(x=>/06$/.test(x.id)),q09=rows.find(x=>/09$/.test(x.id));
   const definition=clean(q02?.q)||clean(q06?.o?.[q06?.a?.[0]])||'';
   const wrong=clean(q03?.q)||'';
   const key=clean(q09?.o?.[q09?.a?.[0]])||clean(q06?.o?.[q06?.a?.[1]])||clean(q02?.e)||'';
   const m=clean(q04?.q).match(/^情形[:：]\s*(.+?)\s*该情形/); const example=m?clean(m[1]):'';
   conceptMap.set(k,{s,ch,term,definition,key,wrong,falsekey:`把“${term}”的适用条件、业务边界或例外规定理解为无条件结论`,example});
 }
}
deriveExtraConcepts();
function conceptFor(q){return conceptMap.get(`${q.s}|${clean(q.knowledge)}`)||null}
function owner(text,subject){const n=norm(text);for(const c of conceptMap.values()){if(c.s!==subject)continue;for(const f of ['definition','key','wrong','falsekey'])if(c[f]&&norm(c[f])===n)return{c,f}}return null}
function why(text,c,isRight){
 const own=owner(text,c.s);
 if(own){
   if(own.c.term===c.term){
     if(own.f==='definition')return `正确。该项准确表述了“${c.term}”的基本含义：${c.definition}`;
     if(own.f==='key')return `正确。该项抓住了“${c.term}”的关键判断条件：${c.key}`;
     if(own.f==='wrong')return `错误。该项正是“${c.term}”的典型错误理解：${c.wrong}。正确框架应为：${c.definition}`;
     return `错误。该项把“${c.term}”的适用边界说错或说绝对了：${c.falsekey}`;
   }
   return `错误。该表述属于“${own.c.term}”的知识点，不是本题“${c.term}”的判断依据。“${own.c.term}”应理解为：${own.c.definition}`;
 }
 if(isRight)return `正确。结合题干条件，应回到“${c.term}”的定义和关键规则判断：${c.definition}${c.key?`；${c.key}`:''}`;
 if(/[任何|全部|完全|一定|必然|绝不|无条件|只能|唯一|永远|一律]/.test(text))return `错误。该项使用绝对化表述，忽略了“${c.term}”的适用条件或例外。正确框架：${c.definition}`;
 return `错误。该项与“${c.term}”的定义、适用条件或业务边界不一致。正确框架：${c.definition}${c.key?`；判断抓手：${c.key}`:''}`;
}
function setQuestion(q,c,{type='single',stem,opts,correct,caseStem=''}){
 q.type=type;q.q=clean(stem);q.o=opts.map(clean);q.a=[...correct].sort((a,b)=>a-b);q.caseStem=clean(caseStem||'');
 q.e=`${clean(c.definition)}${c.key?`；${clean(c.key)}`:''}`;
 q.oa=q.o.map((x,i)=>why(x,c,q.a.includes(i)));
 q.learn={term:c.term,definition:c.definition,key:c.key,wrong:c.wrong,falsekey:c.falsekey,example:c.example};
 q.sourceType='study_material_adapted';q.sourceTruth='原创练习·非官方真题';q.source='2026结构化备考资料·按协会官方题型样例重构';
 q.sourceBasis='依据2026现行大纲方向、结构化知识卡和已提供复习资料组织；题干按协会单选/多选/判断/综合题样例的考试语言重写。';
 q.quality='curated-v4.6';q.strict=true;q.authenticityV46=true;
}
function wrongPool(c){
 return unique([c.wrong,c.falsekey,`“${c.term}”在所有产品、渠道和业务场景中均适用完全相同的规则，无需结合具体条件判断。`,`只要涉及“${c.term}”，就可以忽略题干中的主体、期限、交易方式和例外规定。`]).filter(x=>norm(x)!==norm(c.definition)&&norm(x)!==norm(c.key));
}
function longCase(c){
 const base=clean(c.example)||`某市场主体在业务中涉及“${c.term}”相关安排`;
 if(c.s==='law')return `某证券经营机构在开展相关业务过程中出现如下情况：${base}。公司内部需要根据现行法律法规、自律规则和业务规范判断该事项的合规要求、责任边界及风险控制措施。请根据上述材料回答问题。`;
 return `某投资者在分析相关金融产品或市场业务时遇到如下情况：${base}。其进一步比较该业务的交易安排、权利义务和风险特征，并希望据此判断“${c.term}”的适用规则。请根据上述材料回答问题。`;
}
function rewriteSE23(q,c){
 const suffix=String(q.id).slice(-2),wp=wrongPool(c),def=clean(c.definition),key=clean(c.key)||def,wrong=wp[0]||`关于“${c.term}”的错误表述`,falsekey=wp[1]||wp[0];
 if(suffix==='01')setQuestion(q,c,{stem:`关于“${c.term}”，下列表述正确的是？`,opts:[def,wrong,falsekey,wp[2]||`“${c.term}”不受任何市场规则约束。`],correct:[0]});
 else if(suffix==='02')setQuestion(q,c,{type:'judge',stem:def,opts:['正确','错误'],correct:[0]});
 else if(suffix==='03')setQuestion(q,c,{type:'judge',stem:wrong,opts:['正确','错误'],correct:[1]});
 else if(suffix==='04')setQuestion(q,c,{type:'comprehensive',caseStem:longCase(c),stem:`根据材料，关于“${c.term}”的判断，正确的是？`,opts:[key,wrong,falsekey,wp[2]||`材料中的事实与“${c.term}”无关。`],correct:[0]});
 else if(suffix==='05')setQuestion(q,c,{stem:`下列关于“${c.term}”的说法，最准确的是？`,opts:[def,wrong,falsekey,wp[2]||`“${c.term}”仅由单一因素决定。`],correct:[0]});
 else if(suffix==='06')setQuestion(q,c,{type:'multi',stem:`关于“${c.term}”，下列说法正确的有？`,opts:[def,key,wrong,falsekey],correct:[0,1]});
 else if(suffix==='07')setQuestion(q,c,{stem:`关于“${c.term}”，下列说法错误的是？`,opts:[def,key,wrong,`“${c.term}”的具体适用仍应结合相关业务规则和题干条件判断。`],correct:[2]});
 else if(suffix==='08'){
   const peers=[...conceptMap.values()].filter(x=>x.s===c.s&&x.term!==c.term&&x.definition).slice(0,3);
   const opts=[`${c.term}：${def}`,...peers.map((p,i)=>`${p.term}：${(peers[(i+1)%peers.length]||c).definition}`)];
   while(opts.length<4)opts.push(`${c.term}：${wrongPool(c)[opts.length-1]||wrong}`);
   setQuestion(q,c,{stem:'下列概念与含义的对应关系中，正确的是？',opts:opts.slice(0,4),correct:[0]});
 }
 else if(suffix==='09')setQuestion(q,c,{type:'comprehensive',caseStem:longCase(c),stem:'根据材料，下列处理或判断最恰当的是？',opts:[key,wrong,falsekey,wp[2]||`无需考虑任何具体条件即可作出结论。`],correct:[0]});
 else if(suffix==='10')setQuestion(q,c,{type:'multi',stem:`根据“${c.term}”的有关规则，下列说法正确的有？`,opts:[def,key,wrong,falsekey],correct:[0,1]});
}
function rewriteHV(q,c){
 const suffix=String(q.id).slice(-2),wp=wrongPool(c),def=clean(c.definition),key=clean(c.key)||def,wrong=wp[0]||c.wrong,falsekey=wp[1]||c.falsekey;
 if(suffix==='01')setQuestion(q,c,{type:'comprehensive',caseStem:longCase(c),stem:`根据材料，关于“${c.term}”的判断，正确的是？`,opts:[key,wrong,falsekey,wp[2]],correct:[0]});
 else if(suffix==='02')setQuestion(q,c,{type:'multi',stem:`关于“${c.term}”，下列说法正确的有？`,opts:[def,key,wrong,falsekey],correct:[0,1]});
 else if(suffix==='03')setQuestion(q,c,{stem:`关于“${c.term}”，下列说法错误的是？`,opts:[def,key,wrong,`“${c.term}”的适用应结合具体业务条件判断。`],correct:[2]});
 else if(suffix==='04')setQuestion(q,c,{type:'judge',stem:falsekey,opts:['正确','错误'],correct:[1]});
 else if(suffix==='05')setQuestion(q,c,{stem:`下列关于“${c.term}”的表述，最准确的是？`,opts:[`${def}${key?`，并且${key}`:''}`,wrong,falsekey,wp[2]],correct:[0]});
 else if(suffix==='06')setQuestion(q,c,{type:'comprehensive',caseStem:longCase(c),stem:'根据材料，下列推论最合理的是？',opts:[key,wrong,falsekey,wp[2]],correct:[0]});
 else if(suffix==='07')setQuestion(q,c,{type:'multi',stem:`关于“${c.term}”，下列说法不正确的有？`,opts:[wrong,falsekey,def,key],correct:[0,1]});
 else if(suffix==='08')setQuestion(q,c,{stem:`判断“${c.term}”时，下列哪一项属于关键依据？`,opts:[key,wrong,falsekey,wp[2]],correct:[0]});
 else if(suffix==='09')setQuestion(q,c,{type:'judge',stem:`只要出现“${c.term}”相关情形，就可以直接认定：“${wrong}”`,opts:['正确','错误'],correct:[1]});
 else if(suffix==='10')setQuestion(q,c,{stem:`关于“${c.term}”的适用边界，下列说法正确的是？`,opts:[key,falsekey,wrong,wp[2]],correct:[0]});
 else if(suffix==='11')setQuestion(q,c,{type:'comprehensive',caseStem:longCase(c),stem:'根据材料，下列处理原则正确的是？',opts:[def,wrong,falsekey,wp[2]],correct:[0]});
}
for(const q of B){const c=conceptFor(q);if(!c)continue;if(/^SE23\d+/.test(String(q.id||'')))rewriteSE23(q,c);else if(/^HV43-/.test(String(q.id||'')))rewriteHV(q,c);}
const metaRx=/(考生|复习“|复习「|做题时|答题时|最应记住|有助于正确理解|第一步应识别|换个问法|优先抓住哪一)/;
for(const q of B){if(metaRx.test(clean(q.q))){q.quizEligible=false;q.strict=false;q.quality='quarantined-meta-stem-v4.6';q.authenticityIssue='meta-learning-stem';}}
window.SEC_QUESTIONS=B;
window.SEC_V46_BANK={version:'4.6.0',rewritten:B.filter(q=>q.authenticityV46).length,quarantinedMeta:B.filter(q=>q.authenticityIssue==='meta-learning-stem').length,policy:'exam-language-only+per-option-rationale+long-case-material'};
})();