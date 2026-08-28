(()=>{
'use strict';
const B=Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const C=Array.isArray(window.SEC_CONCEPTS)?window.SEC_CONCEPTS:[];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const stemMechanical=/(考生|复习时|做题时|答题时|考试常把|最应记住|有助于正确理解|第一步应识别|换个问法|优先抓住哪一)/;
const optionMechanical=/(考试常把|无需结合具体条件判断|忽略题干中的主体|所有产品、渠道和业务场景中均适用完全相同的规则|不受任何市场规则约束|仅由单一因素决定|无需考虑任何具体条件即可|适用条件、业务边界或例外规定理解为无条件结论)/;
function bankTopic(q){const t=[q.knowledge,q.q,...(q.o||[])].join('');return /商业银行/.test(t)&&/负债/.test(t)&&/资产/.test(t)&&/表外/.test(t)}
function apply(q,{type='single',stem,opts,ans,why}){
 q.type=type;q.q=stem;q.o=opts;q.a=ans;q.oa=why;q.e='判断商业银行业务类别时，要站在银行自身资产负债表角度：吸收资金形成偿还义务属于负债业务；运用资金形成对外债权通常属于资产业务；担保、承诺等未直接确认为表内资产负债但可能形成风险暴露的事项属于典型表外业务。';
 q.learn={term:'商业银行负债、资产与表外业务',definition:'商业银行负债业务主要体现资金来源及银行对资金提供方的偿还义务；资产业务主要体现银行资金运用并形成对外债权或其他资产；表外业务通常不在发生时直接形成表内资产负债，但可能形成或有责任和风险暴露。',key:'存款、同业拆入等看作资金来源；贷款、票据贴现等看作资金运用；担保、贷款承诺等重点判断其是否属于或有责任/表外风险。',wrong:'不能只看“钱流进还是流出”机械分类，更不能把担保承诺直接等同于已经确认的表内贷款。',falsekey:'表外不等于没有风险，负债也不等于亏损，资产也不等于一定盈利。',example:'银行吸收客户存款形成对客户的偿还义务；向企业发放贷款形成对借款人的债权；为客户提供担保可能形成或有责任。'};
 q.sourceType='study_material_adapted';q.sourceTruth='原创练习·非官方真题';q.source='2026备考知识卡·商业银行业务分类专项';q.sourceBasis='按商业银行资产负债业务基本分类和表外业务常见考法整理，重点训练存款、贷款、票据贴现、担保和承诺的分类判断。';q.quality='curated-v4.6.1';q.strict=true;q.quizEligible=true;q.authenticityIssue='';q.authenticityV46=true;q.bankPolishV461=true;
}
function rewriteBanking(q,n){
 const sets=[
 {stem:'下列关于商业银行主要业务分类的说法，正确的是？',opts:['吸收客户存款后，银行取得一项对客户的债权，因此属于资产业务。','银行向企业发放贷款后形成对借款人的债权，因此通常属于资产业务。','银行提供担保承诺时，必须立即把承诺金额全部确认为表内贷款。','同业拆入是银行运用资金形成的资产业务。'],ans:[1],why:['错误。吸收存款后，银行负有按约向存款人偿还本息的义务，从银行角度通常形成负债，而不是对客户的债权。','正确。贷款发放后，银行取得向借款人收回本金和利息的权利，属于资金运用，通常列入资产业务。','错误。担保、承诺的核心是可能形成未来履约责任，典型情况下属于表外业务或或有责任，不能在承诺作出时一律直接当作表内贷款。','错误。同业拆入是银行从其他金融机构融入资金，属于资金来源，通常体现为负债业务。']},
 {stem:'下列业务中，通常属于商业银行负债业务的是？',opts:['吸收单位和个人存款','向企业发放流动资金贷款','办理票据贴现并取得票据债权','为客户提供尚未实际履约的担保承诺'],ans:[0],why:['正确。存款是银行的重要资金来源，银行同时承担向存款人偿还本息的义务，因此通常属于负债业务。','错误。贷款是银行运用资金并形成对借款人的债权，通常属于资产业务。','错误。票据贴现后，银行取得相应票据债权并占用自身资金，通常属于资产业务。','错误。未实际履约的担保承诺通常按表外业务理解，重点在可能形成未来责任，而不是当前吸收资金。']},
 {type:'multi',stem:'下列业务中，通常属于商业银行资产业务的有？',opts:['发放贷款','办理票据贴现并取得票据债权','吸收客户存款','同业拆入资金'],ans:[0,1],why:['正确。贷款使银行形成对借款人的债权，是典型的资产业务。','正确。贴现时银行支付资金并取得票据权利，本质上形成一项资产。','错误。吸收存款形成银行对存款人的偿还义务，属于负债业务。','错误。同业拆入属于银行融入资金，是负债来源而不是资产运用。']},
 {type:'multi',stem:'关于商业银行表外业务，下列说法正确的有？',opts:['担保、贷款承诺等可能形成未来履约责任，是常见表外业务。','表外业务虽然未必在发生时直接形成表内资产负债，但仍可能带来信用、流动性等风险。','只要属于表外业务，就不会给银行造成任何损失。','担保承诺一经作出，承诺金额都必须立即确认为表内贷款资产。'],ans:[0,1],why:['正确。担保和贷款承诺的共同特征，是银行先作出承诺，未来在特定条件满足时可能承担履约责任。','正确。表外只是会计列示和业务形态上的概念，并不意味着没有风险；一旦条件触发，可能转化为实际资金占用或损失。','错误。“表外”不等于“无风险”。担保对象违约、承诺被提用等都可能使银行承担实际责任。','错误。承诺作出时是否进入表内要看确认条件，不能把全部担保承诺直接等同于已经发放的贷款。']},
 {type:'judge',stem:'商业银行吸收客户存款后形成对存款人的偿还义务，因此从银行自身角度通常属于负债业务。',opts:['正确','错误'],ans:[0],why:['正确。判断负债业务要看银行是否承担向资金提供方偿还的义务；存款正是银行最典型的负债来源之一。','错误选项。把存款理解为银行资产，容易混淆“客户的资产”和“银行的负债”两个观察角度。']},
 {type:'judge',stem:'商业银行发放贷款属于负债业务，因为贷款资金从银行账户流出。',opts:['正确','错误'],ans:[1],why:['错误。业务分类不能只看现金流方向；贷款发放后银行形成对借款人的债权，所以通常属于资产业务。','正确。关键不是“钱流出去”，而是银行取得了未来收回本金和利息的权利，因此形成资产。']},
 {stem:'某银行吸收1000万元企业存款，同时向另一企业发放600万元贷款，并为客户提供一项尚未履约的付款担保。下列分类正确的是？',opts:['存款属于资产业务，贷款属于负债业务，担保属于表内资产业务。','存款属于负债业务，贷款属于资产业务，担保通常属于表外业务。','存款和贷款都属于负债业务，担保不形成任何风险。','存款、贷款和担保在业务分类上完全相同。'],ans:[1],why:['错误。三类业务的经济实质不同：存款是资金来源，贷款是资金运用，担保可能形成未来责任。','正确。站在银行角度，存款形成偿还义务，贷款形成债权，尚未履约的担保通常作为表外业务管理。','错误。贷款通常形成资产；而担保即使暂未履约，也可能产生未来信用和资金风险。','错误。业务分类是常见辨析点，不能因为都涉及资金或客户就归为同一类。']}
 ];apply(q,sets[n%sets.length]);
}
function peerFor(q,used){
 const rows=C.filter(c=>c&&c.s===q.s&&clean(c.term)!==clean(q.knowledge)&&clean(c.definition)&&!optionMechanical.test(clean(c.definition)));
 rows.sort((a,b)=>Number(clean(b.ch)===clean(q.ch))-Number(clean(a.ch)===clean(q.ch)));
 return rows.find(c=>!used.has(clean(c.definition)))||null;
}
let bankN=0;for(const q of B)if(bankTopic(q))rewriteBanking(q,bankN++);
let quarantined=0,optionsRewritten=0;
for(const q of B){
 if(!q?.authenticityV46||q.bankPolishV461)continue;
 if(stemMechanical.test(clean(q.q))){q.strict=false;q.quizEligible=false;q.authenticityIssue='meta-learning-stem-v461';q.quality='quarantined-v4.6.1';quarantined++;continue;}
 const used=new Set((q.o||[]).map(clean));let reject=false;
 for(let i=0;i<(q.o||[]).length;i++){
  const text=clean(q.o[i]);if(!optionMechanical.test(text))continue;
  if((q.a||[]).includes(i)){reject=true;break;}
  const peer=peerFor(q,used);if(!peer){reject=true;break;}
  used.delete(text);q.o[i]=clean(peer.definition);used.add(clean(q.o[i]));
  q.oa=q.oa||[];q.oa[i]=`错误。该项描述的是“${clean(peer.term)}”的规则：${clean(peer.definition)}。它与本题考查的“${clean(q.knowledge||q.ch||'核心概念')}”不是同一概念或适用规则，不能混为一谈。`;
  q.optionPolishedV461=true;optionsRewritten++;
 }
 if(reject){q.strict=false;q.quizEligible=false;q.authenticityIssue='mechanical-generated-wording-v461';q.quality='quarantined-v4.6.1';quarantined++;}
}
window.SEC_QUESTIONS=B;window.SEC_V461_BANK_POLISH={version:'4.6.1',bankingRewritten:bankN,optionsRewritten,mechanicalQuarantined:quarantined,policy:'targeted-authenticity-polish-preserve-bank-breadth'};
})();