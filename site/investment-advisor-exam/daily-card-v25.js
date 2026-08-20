(()=>{
const BANK=()=>Array.isArray(window.TG_QUESTIONS)?window.TG_QUESTIONS:[];
const REMINDERS=[
 '投顾考试7章都要覆盖，但监管、基本理论、客户匹配、证券分析和资产配置应优先保持熟练。',
 '计算题不要只记答案，要能自己写出公式关系，例如现值终值、CAPM、久期、收益率和组合指标。',
 '适当性题最容易被“客户愿意承担风险”带偏，风险偏好和客观风险承受能力要分开判断。',
 '监管类题遇到具体比例、期限、处罚数字时，不要依赖旧题记忆，优先按最新法规汇编复核。',
 '模拟卷做完后先看错题集中在哪一章，再决定第二天刷题量，比单纯重复整卷更有效。'
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function candidates(){const seen=new Set();return BANK().filter(q=>q.strict!==false&&(q.term||q.knowledge)&&q.e).filter(q=>{const k=`${q.ch}|${q.term||q.knowledge}`;if(seen.has(k))return false;seen.add(k);return true})}
function ensureStyle(){if(document.getElementById('dailyCardV25Style'))return;const s=document.createElement('style');s.id='dailyCardV25Style';s.textContent=`.dailyCardV25{margin:10px 0;padding:13px 14px;background:#fff;border:1px solid #d0d5dd;border-radius:16px;box-shadow:0 3px 14px rgba(16,24,40,.05)}.dcHead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.dcHead b{font-size:14px}.dcSwap{border:0;background:#eef4ff;color:#175cd3;border-radius:9px;padding:6px 9px;font-size:10px}.dcTag{display:inline-block;font-size:9px;color:#175cd3;background:#eef4ff;border-radius:999px;padding:4px 7px;margin-bottom:7px}.dcTerm{font-size:14px;font-weight:700;margin-bottom:5px}.dcText{font-size:11px;color:#475467;line-height:1.6}.dcReminder{margin-top:9px;padding-top:8px;border-top:1px dashed #d0d5dd;font-size:10px;color:#667085;line-height:1.55}.dcReminder b{color:#344054}`;document.head.appendChild(s)}
function mount(){ensureStyle();const plan=document.getElementById('examPlanCard'),notice=document.querySelector('#view-home .notice');if(!plan&&!notice)return false;let box=document.getElementById('dailyKnowledgeCard');if(!box){box=document.createElement('div');box.id='dailyKnowledgeCard';box.className='dailyCardV25';(plan||notice).insertAdjacentElement('afterend',box)}const C=candidates();if(!C.length){box.innerHTML='<div class="dcText">今日知识点正在加载题库后生成。</div>';return true}const key=dayKey(),offset=Number(sessionStorage.getItem('tg_daily_card_offset')||0),idx=(hash('TG'+key)+offset)%C.length,q=C[idx],rem=REMINDERS[hash('TGR'+key)%REMINDERS.length],term=q.term||q.knowledge||'今日知识点';box.innerHTML=`<div class="dcHead"><b>今日知识点</b><button class="dcSwap" id="dcSwapTg">换一条</button></div><span class="dcTag">${esc(q.ch||'投顾专项')}</span><div class="dcTerm">${esc(term)}</div><div class="dcText">${esc(String(q.e||q.q).replace(/\s+/g,' ').slice(0,180))}</div><div class="dcReminder"><b>备考提醒：</b>${esc(rem)}</div>`;document.getElementById('dcSwapTg').onclick=()=>{sessionStorage.setItem('tg_daily_card_offset',String(offset+1));mount()};return true}
let tries=0;function boot(){if(mount())return;if(++tries<20)setTimeout(boot,150)}boot();
})();
