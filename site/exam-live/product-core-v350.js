(()=>{
'use strict';
const VERSION='3.6.0';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dayMs=86400000;
const dayKey=(d=new Date())=>d.toLocaleDateString('sv-SE');
function daysLeft(target='2026-09-19',now=new Date()){
  const a=new Date(target+'T00:00:00'); const b=new Date(now); b.setHours(0,0,0,0);
  return Math.max(0,Math.ceil((a-b)/dayMs));
}
function phase(days){
  if(days<=7)return {id:'sprint',name:'冲刺回忆期',goal:'少学新内容，集中回忆、错题和真实模考'};
  if(days<=14)return {id:'mock',name:'模考纠错期',goal:'用整卷暴露问题，再回到薄弱知识点'};
  if(days<=28)return {id:'strengthen',name:'强化刷题期',goal:'知识点与题目绑定，快速消灭错题和混淆点'};
  return {id:'foundation',name:'框架建立期',goal:'先建立章节结构和核心概念，再逐步提高题量'};
}
function settings(raw={}){
  return {targetDate:raw.targetDate||'2026-09-19',dailyMinutes:clamp(Number(raw.dailyMinutes)||60,30,120),studyDays:clamp(Number(raw.studyDays)||6,4,7),reminderTime:raw.reminderTime||'20:30',bufferDay:Number.isInteger(+raw.bufferDay)?+raw.bufferDay:0};
}
function buildPlan(input={}){
  const s=settings(input.settings||{}),now=input.now||new Date(),days=daysLeft(s.targetDate,now),p=phase(days);
  const dailyDone=Math.max(0,+input.dailyDone||0),wrong=Math.max(0,+input.wrongCount||0),due=Math.max(0,+input.dueCount||0),learned=Math.max(0,+input.learnedToday||0),reviewed=Math.max(0,+input.reviewedToday||0),hasSession=!!input.hasSession;
  const isBuffer=now.getDay()===s.bufferDay&&s.studyDays<7;let learnMin,practiceMin,reviewMin;
  if(isBuffer){learnMin=10;practiceMin=0;reviewMin=Math.min(20,Math.max(10,s.dailyMinutes-10));}
  else if(p.id==='foundation'){learnMin=Math.round(s.dailyMinutes*.38);reviewMin=Math.round(s.dailyMinutes*.20);practiceMin=s.dailyMinutes-learnMin-reviewMin;}
  else if(p.id==='strengthen'){learnMin=Math.round(s.dailyMinutes*.25);reviewMin=Math.round(s.dailyMinutes*.27);practiceMin=s.dailyMinutes-learnMin-reviewMin;}
  else if(p.id==='mock'){learnMin=Math.round(s.dailyMinutes*.17);reviewMin=Math.round(s.dailyMinutes*.30);practiceMin=s.dailyMinutes-learnMin-reviewMin;}
  else{learnMin=Math.round(s.dailyMinutes*.12);reviewMin=Math.round(s.dailyMinutes*.38);practiceMin=s.dailyMinutes-learnMin-reviewMin;}
  const learnGoal=isBuffer?3:clamp(Math.round(learnMin/3),4,12),practiceGoal=isBuffer?0:clamp(Math.round(practiceMin/1.15),10,p.id==='sprint'?45:40),reviewGoal=clamp(Math.max(due,Math.min(wrong,Math.round(reviewMin/1.2))),isBuffer?3:5,20),tasks=[];
  if(isBuffer){
    tasks.push({id:'review',title:'轻复习',goal:reviewGoal,unit:'个',minutes:reviewMin,done:reviewed>=reviewGoal,progress:reviewed,why:'今天是缓冲日，只处理到期内容和明显薄弱点，不继续堆新任务。'});
    tasks.push({id:'learn',title:'快速回忆',goal:learnGoal,unit:'个知识点',minutes:learnMin,done:learned>=learnGoal,progress:learned,why:'用主动回忆保持记忆，不要求长时间学习。'});
    tasks.push({id:'buffer',title:'补欠任务或休息',goal:1,unit:'项',minutes:0,done:false,progress:0,why:'如果本周任务已完成，就直接休息；未完成再补欠，不制造额外负担。'});
  }else{
    tasks.push({id:'learn',title:'知识学习',goal:learnGoal,unit:'个知识点',minutes:learnMin,done:learned>=learnGoal,progress:learned,why:p.id==='foundation'?'先理解定义、考法和易错点，刷题才不会只记答案。':'只学今天最需要的知识点，避免大面积重新看书。'});
    tasks.push({id:'practice',title:hasSession?'继续未完成练习':'刷题训练',goal:practiceGoal,unit:'题',minutes:practiceMin,done:dailyDone>=practiceGoal,progress:dailyDone,why:'用提取练习检查是否真的会，而不是看懂了就以为记住了。'});
    tasks.push({id:'review',title:'错题与到期复习',goal:reviewGoal,unit:'题/知识点',minutes:reviewMin,done:reviewed>=reviewGoal&&due===0,progress:reviewed,why:due?`有 ${due} 个内容已经到复习时间，优先处理可降低重复犯错。`:'复盘错误原因并间隔重测，把短期记忆变成长时记忆。'});
  }
  const shouldMock=!isBuffer&&(p.id==='mock'||p.id==='sprint')&&(now.getDay()===3||now.getDay()===6),completed=tasks.filter(t=>t.done).length;
  return {version:VERSION,date:dayKey(now),daysLeft:days,phase:p,isBuffer,shouldMock,settings:s,tasks,completed,total:tasks.length,percent:Math.round(completed/tasks.length*100),estimatedMinutes:tasks.filter(t=>!t.done).reduce((n,t)=>n+t.minutes,0)};
}
function nextInterval(level='again',stage=0){if(level==='again')return{stage:0,days:1};if(level==='hard')return{stage:Math.max(0,stage),days:[1,2,4,7,14][Math.min(stage,4)]};const ns=Math.min(5,stage+1);return{stage:ns,days:[1,3,7,14,30,60][ns]||60};}
window.SEC_PRODUCT_CORE_V350={VERSION,moduleVersion:'350',dayKey,daysLeft,phase,settings,buildPlan,nextInterval};
})();