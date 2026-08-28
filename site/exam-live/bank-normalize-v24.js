(()=>{
'use strict';
const MAP={
 '第二章 中国金融体系与多层次资本市场':'第二章 中国的金融体系与多层次资本市场',
 '第七章 金融衍生工具':'第七章 金融衍生品',
 '第四章 典型违法违规行为及法律责任':'第四章 证券市场典型违法违规行为及法律责任',
 '第五章 行业文化、职业道德与从业人员行业规范':'第五章 行业文化、职业道德与从业人员行为规范'
};
const Q=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[],C=Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:[];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).replace(/[\s，。！？、；：,.!?;:（）()“”"'《》「」]/g,'').toLowerCase();
for(const q of Q)if(MAP[q.ch])q.ch=MAP[q.ch];
function conceptFor(q){const k=clean(q.knowledge);if(k){const c=C.find(x=>x.s===q.s&&clean(x.term)===k);if(c)return c}const m=clean(q.q).match(/^关于[「“]?(.+?)[」”]?，下列表述正确的是[？?]?$/);return m?C.find(x=>x.s===q.s&&clean(x.term)===clean(m[1])):null}
function owner(text,subject){const n=norm(text);for(const c of C.filter(x=>x.s===subject)){for(const f of ['definition','key','wrong','falsekey'])if(c[f]&&norm(c[f])===n)return{c,f}}return null}
function explain(text,c,isRight){const own=owner(text,c.s);if(own){if(own.c.term===c.term){if(own.f==='definition')return `正确。该项就是“${c.term}”的基本定义：${c.definition}`;if(own.f==='key')return `该项属于“${c.term}”的关键判断点：${c.key}`;if(own.f==='wrong')return `错误。该项正是“${c.term}”的典型错误说法：${c.wrong}；正确理解为：${c.definition}`;return `错误。该项属于“${c.term}”的常见混淆：${c.falsekey}`;}return `错误。该表述对应的是“${own.c.term}”，不是本题“${c.term}”。“${own.c.term}”应理解为：${own.c.definition}`}
 if(isRight)return `正确。${c.definition}；做题时抓住：${c.key||'定义与适用条件'}`;
 if(/[任何|全部|完全|一定|必然|绝不|无条件|只能|唯一|永远]/.test(text))return `错误。该项把“${c.term}”的适用条件绝对化了。正确框架：${c.definition}`;
 return `错误。该项不符合“${c.term}”的定义或适用边界。正确框架：${c.definition}；判断线索：${c.key||'结合具体规则判断'}`
}
function normalizeCoreTemplate(q,c){const stem=clean(q.q);if(!/^关于[「“]?.+?[」”]?，下列表述正确的是[？?]?$/.test(stem)||q.type!=='single')return;
 const right=Number.isInteger(q.a?.[0])&&q.a[0]>=0&&q.a[0]<4?q.a[0]:1;
 const traps=[clean(c.wrong),clean(c.falsekey),`${c.term}在所有产品、渠道和业务场景中都适用完全相同的规则，无需结合具体条款判断。`, `判断“${c.term}”时可以忽略题干中的主体、渠道、期限和例外条件，直接套用固定结论。`].filter(Boolean);
 const uniq=[];for(const x of traps)if(norm(x)!==norm(c.definition)&&!uniq.some(y=>norm(y)===norm(x)))uniq.push(x);
 while(uniq.length<3)uniq.push(`关于“${c.term}”的具体适用无需区分任何业务条件。`+uniq.length);
 const opts=new Array(4),wrong=[0,1,2,3].filter(i=>i!==right);opts[right]=clean(c.definition);wrong.forEach((i,k)=>opts[i]=uniq[k]);q.o=opts;q.a=[right];q.e=`${clean(c.definition)}${c.key?`；${clean(c.key)}`:''}`;q.oa=opts.map((x,i)=>explain(x,c,i===right));q.learn={term:c.term,definition:c.definition,key:c.key,wrong:c.wrong,falsekey:c.falsekey,example:c.example};q.learningNormalized='v4.5.2';
}
for(const q of Q){const c=conceptFor(q);if(!c)continue;normalizeCoreTemplate(q,c);if(!q.learn)q.learn={term:c.term,definition:c.definition,key:c.key,wrong:c.wrong,falsekey:c.falsekey,example:c.example};if(!Array.isArray(q.oa)||q.oa.length!==(q.o||[]).length)q.oa=(q.o||[]).map((x,i)=>explain(x,c,(q.a||[]).includes(i)))}
window.SEC_CHAPTER_NORMALIZED=true;window.SEC_LEARNING_QUALITY_NORMALIZED='4.5.2';
})();
