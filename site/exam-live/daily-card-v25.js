(()=>{
const BANK=()=>Array.isArray(window.SEC_QUESTIONS)?window.SEC_QUESTIONS:[];
const REMINDERS=[
 '先完成首轮覆盖，再集中处理错题；不要只追求当天刷题数量。',
 '法规、比例、期限和交易规则类内容要优先以最新考试大纲和现行规则为准。',
 '模拟考试按单科120题训练，金融市场基础知识和证券市场基本法律法规要分别达到稳定水平。',
 '遇到判断题和“不正确的是”题目，先圈定题干方向，再看选项，能明显减少低级失分。',
 '当天错题最好当天看一次解析，隔几天再做第二次，记忆效果通常比连续重刷更好。'
];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function candidates(){const seen=new Set();return BANK().filter(q=>q.strict!==false&&q.knowledge&&q.e).filter(q=>{const k=`${q.s}|${q.knowledge}`;if(seen.has(k))return false;seen.add(k);return true})}
function ensureStyle(){if(document.getElementById('dailyCardV25Style'))return;const s=document.createElement('style');s.id='dailyCardV25Style';s.textContent=`.dailyCardV25{margin:10px 0;padding:13px 14px;background:#fff;border:1px solid #d0d5dd;border-radius:16px;box-shadow:0 3px 14px rgba(16,24,40,.05)}.dcHead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.dcHead b{font-size:14px}.dcSwap{border:0;background:#eff8ff;color:#175cd3;border-radius:9px;padding:6px 9px;font-size:10px}.dcTag{display:inline-block;font-size:9px;color:#175cd3;background:#eef4ff;border-radius:999px;padding:4px 7px;margin-bottom:7px}.dcTerm{font-size:14px;font-weight:700;margin-bottom:5px}.dcText{font-size:11px;color:#475467;line-height:1.6}.dcReminder{margin-top:9px;padding-top:8px;border-top:1px dashed #d0d5dd;font-size:10px;color:#667085;line-height:1.55}.dcReminder b{color:#344054}`;document.head.appendChild(s)}
function mount(){ensureStyle();const plan=document.getElementById('examPlanCard'),notice=document.querySelector('#view-home .notice');if(!plan&&!notice)return false;let box=document.getElementById('dailyKnowledgeCard');if(!box){box=document.createElement('div');box.id='dailyKnowledgeCard';box.className='dailyCardV25';(plan||notice).insertAdjacentElement('afterend',box)}const C=candidates();if(!C.length){box.innerHTML='<div class="dcText">今日知识点正在加载题库后生成。</div>';return true}const key=dayKey(),offset=Number(sessionStorage.getItem('sec_daily_card_offset')||0),idx=(hash('SEC'+key)+offset)%C.length,q=C[idx],rem=REMINDERS[hash('SECR'+key)%REMINDERS.length];box.innerHTML=`<div class="dcHead"><b>今日知识点</b><button class="dcSwap" id="dcSwapSec">换一条</button></div><span class="dcTag">${q.s==='finance'?'金融市场基础知识':'证券市场基本法律法规'} · ${esc(q.ch)}</span><div class="dcTerm">${esc(q.knowledge)}</div><div class="dcText">${esc(String(q.e||q.q).replace(/\s+/g,' ').slice(0,180))}</div><div class="dcReminder"><b>备考提醒：</b>${esc(rem)}</div>`;document.getElementById('dcSwapSec').onclick=()=>{sessionStorage.setItem('sec_daily_card_offset',String(offset+1));mount()};return true}
let tries=0;function boot(){if(mount())return;if(++tries<20)setTimeout(boot,150)}boot();
})();
