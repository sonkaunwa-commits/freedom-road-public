(()=>{
window.SEC_IMPORTED_META=window.SEC_IMPORTED_META||{fire:0,cflue:0,imported:0,strict_imported:0,fallback:true};
const norm=s=>String(s||'').replace(/\s+/g,'').replace(/[，。！？、；：,.!?;:（）()“”"']/g,'');
function merge(rows){const bank=window.SEC_QUESTIONS||[],seen=new Set(bank.map(q=>norm(q.q)));let added=0;for(const raw of rows||[]){if(!raw||!raw.q||!Array.isArray(raw.o)||!Array.isArray(raw.a))continue;const k=norm(raw.q);if(!k||seen.has(k))continue;seen.add(k);bank.push({...raw,source:'FIRE-Bench',sourceType:'public_dataset',strict:false,valid:raw.valid||'开放题源·待校验'});added++}window.SEC_QUESTIONS=bank;window.SEC_IMPORTED_META={...(window.SEC_IMPORTED_META||{}),fire:added,imported:added,fallback:true};try{if(typeof renderHome==='function')renderHome();if(typeof renderStats==='function')renderStats()}catch(e){}}
fetch('./fire-spq.json',{cache:'no-store'}).then(r=>r.ok?r.json():[]).then(merge).catch(()=>{});
})();
