(() => {
  'use strict';

  const VERSION = '4.0.0';
  const SKEY = 'sec2026state_v1';
  const RKEY = 'sec_v4_recovery';
  const LASTKEY = 'sec_v4_last';
  const PKEY = 'sec_v350_profiles';
  const AKEY = 'sec_v350_active';

  const $ = (s) => document.querySelector(s);
  const main = $('#main');
  const topTitle = $('#topTitle');
  const backBtn = $('#backBtn');
  const topAction = $('#topAction');
  const bottomNav = $('#bottomNav');

  const read = (k, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback;
    } catch (_) {
      return fallback;
    }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const bank = () => Array.isArray(window.SEC_QUESTIONS)
    ? window.SEC_QUESTIONS.filter((q) => q && q.strict !== false)
    : [];
  const concepts = () => Array.isArray(window.SEC_CONCEPTS) ? window.SEC_CONCEPTS : [];

  function blankState() {
    return { answered: {}, wrong: [], fav: [], daily: {}, history: [] };
  }
  function state() { return read(SKEY, blankState()); }
  function recovery() { return read(RKEY, {}); }
  function saveRecovery(x) { write(RKEY, x); }
  function saveState(x) {
    write(SKEY, x);
    syncProfileState(x);
  }
  function syncProfileState(x) {
    try {
      const profiles = read(PKEY, []);
      const id = localStorage.getItem(AKEY);
      if (profiles.some((p) => p.id === id)) write('sec_v350_state_' + id, x);
    } catch (_) {}
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 1500);
  }
  function shuffle(arr) {
    const b = [...arr];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  }
  function normalize(s) {
    return String(s || '').replace(/[\s，。！？、；：,.!?;:（）()“”"'《》]/g, '').toLowerCase();
  }
  function labelSubject(s) { return s === 'finance' ? '金融市场基础知识' : '证券市场基本法律法规'; }
  function shortSubject(s) { return s === 'finance' ? '金融' : '法规'; }
  function typeName(t) { return t === 'multi' ? '多选题' : t === 'judge' ? '判断题' : '单选题'; }
  function answerLetters(q) { return (q.a || []).map((i) => String.fromCharCode(65 + i)).join('、'); }

  function statsFor(sub) {
    const rows = bank().filter((q) => q.s === sub);
    const answered = state().answered || {};
    const done = rows.filter((q) => q.id in answered);
    const ok = done.filter((q) => answered[q.id] === true);
    return {
      total: rows.length,
      done: done.length,
      acc: done.length ? Math.round(ok.length / done.length * 100) : 0
    };
  }
  function overallStats() {
    const answered = state().answered || {};
    const vals = Object.values(answered);
    const done = vals.length;
    const ok = vals.filter(Boolean).length;
    return { done, acc: done ? Math.round(ok / done * 100) : 0, wrong: (state().wrong || []).length };
  }

  function conceptFor(q) {
    if (!q) return null;
    const exact = concepts().find((c) => c.s === q.s && (c.term === q.knowledge || c.term === String(q.knowledge || '').trim()));
    if (exact) return exact;

    const nq = normalize((q.q || '') + ' ' + (q.e || ''));
    let best = null;
    let bestScore = 0;
    for (const c of concepts().filter((x) => x.s === q.s)) {
      let score = 0;
      const term = normalize(c.term);
      if (term && nq.includes(term)) score += 6;
      if (c.ch && q.ch && normalize(q.ch).includes(normalize(c.ch).slice(-6))) score += 1;
      const words = [c.term, c.definition, c.key]
        .flatMap((x) => String(x || '').split(/[、，；：\s]/))
        .filter((x) => x.length >= 3);
      for (const word of words) if (nq.includes(normalize(word))) score += 1;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore >= 2 ? best : null;
  }

  let courseCards = [];
  async function loadCourses() {
    const files = [
      ['finance', '../exam-live/bilibili-finance-learning-v1.json'],
      ['law', '../exam-live/bilibili-law-learning-v1.json']
    ];
    for (const [subject, url] of files) {
      try {
        const r = await fetch(url + '?v=20260826a', { cache: 'no-store' });
        if (!r.ok) continue;
        const x = await r.json();
        for (const d of x.documents || []) {
          for (const p of d.points || []) {
            courseCards.push({
              s: subject,
              term: p.topic || '',
              explanation: p.explanation || '',
              teacherAngle: p.teacher_angle || '',
              examFocus: p.exam_focus || '',
              memoryTip: p.memory_tip || '',
              trap: p.trap || '',
              example: p.example || '',
              keywords: p.keywords || [],
              bvid: d.bvid || '',
              page: d.page || null,
              part: d.part || '',
              chapter: d.chapter_guess || ''
            });
          }
        }
      } catch (_) {}
    }
  }

  function courseFor(q, c) {
    if (!q) return null;
    const nq = normalize([q.q, q.e, q.knowledge, c?.term, c?.definition].join(' '));
    let best = null;
    let bestScore = 0;
    for (const x of courseCards.filter((v) => v.s === q.s)) {
      let score = 0;
      const t = normalize(x.term);
      if (t && nq.includes(t)) score += 8;
      for (const k of x.keywords || []) {
        const nk = normalize(k);
        if (nk && nq.includes(nk)) score += 3;
      }
      const chapterKey = normalize(x.chapter).replace(/^第\d+章/, '');
      if (chapterKey && q.ch && normalize(q.ch).includes(chapterKey)) score += 1;
      if (score > bestScore) { bestScore = score; best = x; }
    }
    return bestScore >= 3 ? best : null;
  }

  function switchProfile(id) {
    const profiles = read(PKEY, []);
    const old = localStorage.getItem(AKEY);
    if (old) write('sec_v350_state_' + old, state());
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    localStorage.setItem(AKEY, id);
    write(SKEY, read('sec_v350_state_' + id, blankState()));
    write(RKEY, {});
    toast('已切换学习档案');
    setTimeout(showMe, 120);
  }

  let view = 'home';
  let session = [];
  let index = 0;
  let selected = new Set();
  let submitted = false;
  let sessionLabel = '';
  let sessionMode = '';

  function chrome(v, title, back = false) {
    view = v;
    topTitle.textContent = title;
    backBtn.classList.toggle('hidden', !back);
    bottomNav.style.display = v === 'practice' ? 'none' : 'grid';
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === v));
    topAction.style.visibility = v === 'practice' ? 'hidden' : 'visible';
    window.scrollTo(0, 0);
  }

  function subjectCard(subject, stats, last) {
    const pct = stats.total ? Math.round(stats.done / stats.total * 100) : 0;
    const continued = last?.subject === subject && last?.questionId;
    return `
      <article class="subject">
        <div class="row">
          <div>
            <h2>${labelSubject(subject)}</h2>
            <small>${stats.done}/${stats.total} 已做 · ${stats.done ? stats.acc + '% 正确率' : '还没开始'}</small>
          </div>
          <small>${pct}%</small>
        </div>
        <div class="meter"><i style="width:${pct}%"></i></div>
        <div class="subjectMeta"><span>${stats.total - stats.done} 道未做</span><span>${continued ? '继续上次' : '智能组题'}</span></div>
        <button class="continue" data-subject="${subject}">${continued ? '继续上次' : '开始刷题'} →</button>
      </article>`;
  }

  function showHome() {
    chrome('home', '证券从业刷题');
    const S = overallStats();
    const f = statsFor('finance');
    const l = statsFor('law');
    const last = read(LASTKEY, null);
    main.innerHTML = `
      <section class="hero"><h1>打开就刷题</h1><p>会的题快速过去，错的题当场弄懂。学习内容只在需要时出现。</p></section>
      ${subjectCard('finance', f, last)}
      ${subjectCard('law', l, last)}
      <div class="sectionTitle"><h2>换一种刷法</h2><span>按你的需要</span></div>
      <div class="quickGrid">
        <button class="quick" data-mode="wrong"><b>错题重做</b><span>${S.wrong} 道待处理</span></button>
        <button class="quick" data-mode="new"><b>只做未做</b><span>快速提高覆盖率</span></button>
        <button class="quick" data-mode="chapter"><b>章节刷题</b><span>挑一个章节集中练</span></button>
        <button class="quick" data-mode="random"><b>随机练习</b><span>两科混合 20 题</span></button>
        <button class="quick" data-mode="mock"><b>模拟考试</b><span>120 题 · 连续作答</span></button>
        <button class="quick" data-mode="smart"><b>智能继续</b><span>新题为主，夹带错题</span></button>
      </div>
      <div class="sectionTitle"><h2>目前进度</h2></div>
      <div class="miniStats">
        <div><b>${S.done}</b><span>已做</span></div>
        <div><b>${S.done ? S.acc + '%' : '—'}</b><span>正确率</span></div>
        <div><b>${S.wrong}</b><span>待复习</span></div>
      </div>`;

    main.querySelectorAll('[data-subject]').forEach((b) => { b.onclick = () => startSmart(b.dataset.subject); });
    main.querySelectorAll('[data-mode]').forEach((b) => {
      b.onclick = () => {
        const m = b.dataset.mode;
        if (m === 'wrong') startWrong();
        else if (m === 'new') startNew();
        else if (m === 'chapter') showChapters();
        else if (m === 'random') startRows(shuffle(bank()).slice(0, 20), '随机练习', 'random');
        else if (m === 'mock') startRows(shuffle(bank()).slice(0, 120), '模拟考试', 'mock');
        else startSmart('all');
      };
    });
  }

  function smartRows(sub = 'all', count = 20) {
    const rows = bank().filter((q) => sub === 'all' || q.s === sub);
    const S = state();
    const wrongIds = new Set(S.wrong || []);
    const unseen = rows.filter((q) => !(q.id in (S.answered || {})));
    const wrong = rows.filter((q) => wrongIds.has(q.id));
    const seen = rows.filter((q) => q.id in (S.answered || {}) && !wrongIds.has(q.id));
    const a = shuffle(unseen).slice(0, Math.ceil(count * 0.7));
    const b = shuffle(wrong).slice(0, Math.ceil(count * 0.2));
    const c = shuffle(seen).slice(0, Math.max(0, count - a.length - b.length));
    return shuffle([...a, ...b, ...c]).slice(0, count);
  }

  function startSmart(sub = 'all') {
    const last = read(LASTKEY, null);
    let rows = smartRows(sub, 20);
    if (last?.subject === sub && last.questionId) {
      const q = bank().find((x) => x.id === last.questionId);
      if (q) {
        rows = rows.filter((x) => x.id !== q.id);
        rows.unshift(q);
      }
    }
    startRows(rows, sub === 'all' ? '智能继续' : shortSubject(sub) + ' · 智能继续', 'smart');
  }

  function startWrong() {
    const ids = state().wrong || [];
    const rows = ids.map((id) => bank().find((q) => q.id === id)).filter(Boolean);
    if (!rows.length) { toast('现在没有待复习错题'); return; }
    startRows(shuffle(rows), '错题重做', 'wrong');
  }

  function startNew() {
    const A = state().answered || {};
    const rows = shuffle(bank().filter((q) => !(q.id in A))).slice(0, 30);
    if (!rows.length) { toast('题库已经全部做过'); return; }
    startRows(rows, '未做题', 'new');
  }

  function startRows(rows, label, mode) {
    if (!rows.length) { toast('当前没有可用题目'); return; }
    session = rows;
    index = 0;
    sessionLabel = label;
    sessionMode = mode;
    selected = new Set();
    submitted = false;
    chrome('practice', label, true);
    renderQuestion();
  }

  function renderQuestion() {
    const q = session[index];
    if (!q) { finishSession(); return; }
    selected = new Set();
    submitted = false;
    write(LASTKEY, { subject: q.s, questionId: q.id, at: Date.now() });
    const S = state();
    const fav = (S.fav || []).includes(q.id);
    main.innerHTML = `
      <div class="practiceWrap">
        <div class="qHead">
          <div>
            <div class="qTags"><span class="tag">${shortSubject(q.s)}</span><span class="tag">${typeName(q.type)}</span></div>
            <div class="qProgress">${index + 1} / ${session.length} · ${esc(q.ch || '')}</div>
          </div>
          <button class="favBtn ${fav ? 'on' : ''}" id="favBtn">${fav ? '★' : '☆'}</button>
        </div>
        <article class="questionCard">
          <div class="typeHint">${q.type === 'multi' ? '可选择多个答案' : '请选择一个答案'}</div>
          <h1>${esc(q.q)}</h1>
          <div class="options">
            ${(q.o || []).map((o, i) => `<button class="option" data-i="${i}"><span class="letter">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span></button>`).join('')}
          </div>
          <div id="feedback"></div>
        </article>
      </div>
      <div class="answerBar"><button class="submit" id="answerBtn" disabled>确认答案</button></div>`;

    main.querySelectorAll('.option').forEach((b) => { b.onclick = () => choose(+b.dataset.i, q); });
    $('#answerBtn').onclick = () => submit(q);
    $('#favBtn').onclick = () => toggleFav(q);
  }

  function choose(i, q) {
    if (submitted) return;
    if (q.type === 'multi') {
      selected.has(i) ? selected.delete(i) : selected.add(i);
    } else {
      selected.clear();
      selected.add(i);
    }
    main.querySelectorAll('.option').forEach((b, n) => b.classList.toggle('selected', selected.has(n)));
    $('#answerBtn').disabled = !selected.size;
  }

  function toggleFav(q) {
    const S = state();
    const arr = new Set(S.fav || []);
    arr.has(q.id) ? arr.delete(q.id) : arr.add(q.id);
    S.fav = [...arr];
    saveState(S);
    $('#favBtn').textContent = arr.has(q.id) ? '★' : '☆';
    $('#favBtn').classList.toggle('on', arr.has(q.id));
    toast(arr.has(q.id) ? '已收藏' : '已取消收藏');
  }

  function submit(q) {
    if (submitted || !selected.size) return;
    submitted = true;
    const ans = [...selected].sort((a, b) => a - b);
    const correct = [...(q.a || [])].sort((a, b) => a - b);
    const ok = ans.length === correct.length && ans.every((x, i) => x === correct[i]);

    main.querySelectorAll('.option').forEach((b, i) => {
      b.disabled = true;
      b.classList.remove('selected');
      if (correct.includes(i)) b.classList.add('correct');
      else if (selected.has(i)) b.classList.add('wrong');
    });

    recordAnswer(q, ok);
    renderFeedback(q, ok, ans);
    const btn = $('#answerBtn');
    btn.className = 'next';
    btn.disabled = false;
    btn.textContent = index === session.length - 1 ? '完成本组' : '下一题';
    btn.onclick = () => { index += 1; renderQuestion(); };
  }

  function recordAnswer(q, ok) {
    const S = state();
    const wasWrong = (S.wrong || []).includes(q.id);
    S.answered = { ...(S.answered || {}), [q.id]: ok };
    S.history = [{ id: q.id, ok, at: Date.now() }, ...(S.history || [])].slice(0, 300);
    const wrong = new Set(S.wrong || []);
    const R = recovery();
    if (ok) {
      if (wasWrong) {
        R[q.id] = (R[q.id] || 0) + 1;
        if (R[q.id] >= 2) wrong.delete(q.id);
      }
    } else {
      wrong.add(q.id);
      R[q.id] = 0;
    }
    S.wrong = [...wrong];
    saveRecovery(R);
    saveState(S);
  }

  function renderOptionAnalysis(q, chosen, c) {
    return (q.o || []).map((text, i) => {
      const isCorrect = (q.a || []).includes(i);
      const wasChosen = chosen.includes(i);
      let reason = isCorrect
        ? '正确项：与本题考查的定义、条件或规则一致。'
        : '干扰项：与本题要求不一致，注意题干限定条件。';
      if (!isCorrect && wasChosen && c?.wrong) reason = c.wrong;
      return `<div class="statLine"><span>${String.fromCharCode(65 + i)}. ${esc(text)}</span><b>${esc(reason)}</b></div>`;
    }).join('');
  }

  function renderFeedback(q, ok, chosen) {
    const c = conceptFor(q);
    const course = courseFor(q, c);
    const concise = c?.definition || q.e || '请结合题目解析理解这一考点。';
    const chosenLetters = chosen.map((i) => String.fromCharCode(65 + i)).join('、');

    let details = `
      <div class="detailBody ${ok ? 'hidden' : ''}" id="detailBody">
        <div class="explainBox"><h3>为什么</h3><p>${esc(q.e || concise)}</p></div>
        ${!ok ? `<div class="explainBox trap"><h3>这次为什么容易错</h3><p>${esc(c?.wrong || `你选择了 ${chosenLetters}，正确答案是 ${answerLetters(q)}。先核对题干限定词，再判断选项是否偷换概念。`)}</p></div>` : ''}
        <div class="explainBox"><h3>选项拆解</h3>${renderOptionAnalysis(q, chosen, c)}</div>
        ${c?.memoryTip ? `<div class="explainBox memory"><h3>记一下</h3><p>${esc(c.memoryTip)}</p><span class="source">${esc(c.sourceDoc || c.sourceLabel || '结构化知识卡')}</span></div>` : ''}
        ${c?.falsekey ? `<div class="explainBox"><h3>容易混淆</h3><p>${esc(c.falsekey)}</p></div>` : ''}`;

    if (course) {
      const teacherText = course.teacherAngle || course.explanation || course.examFocus;
      const video = course.bvid
        ? `<a class="videoLink" target="_blank" rel="noopener" href="https://www.bilibili.com/video/${encodeURIComponent(course.bvid)}/?p=${encodeURIComponent(course.page || 1)}">看课程对应部分 →</a>`
        : '';
      details += `
        <div class="explainBox teacher">
          <h3>老师怎么讲这个知识点</h3>
          <p>${esc(teacherText)}</p>
          ${course.memoryTip ? `<p style="margin-top:8px"><b>课程记忆：</b>${esc(course.memoryTip)}</p>` : ''}
          ${video}
          <span class="source">${esc(course.part || 'B站课程精讲')}</span>
        </div>`;
    }
    details += '</div>';

    $('#feedback').innerHTML = `
      <div class="result ${ok ? 'good' : 'bad'}">${ok ? '✓ 正确' : '× 选错了 · 正确答案 ' + answerLetters(q)}</div>
      <div class="explain">
        <div class="explainBox key"><h3>这题考什么</h3><p>${esc(c?.term ? `${c.term}：${concise}` : concise)}</p></div>
        ${details}
        ${ok ? '<button class="detailToggle" id="detailToggle">看详细解析</button>' : ''}
      </div>`;

    if (ok) {
      $('#detailToggle').onclick = () => {
        $('#detailBody').classList.toggle('hidden');
        $('#detailToggle').textContent = $('#detailBody').classList.contains('hidden') ? '看详细解析' : '收起解析';
      };
    }
  }

  function finishSession() {
    write(LASTKEY, null);
    chrome('home', '本组完成');
    const recent = (state().history || []).slice(0, session.length);
    const ok = recent.filter((x) => x.ok).length;
    const acc = session.length ? Math.round(ok / session.length * 100) : 0;
    main.innerHTML = `
      <section class="hero"><h1>这一组做完了</h1><p>${esc(sessionLabel)} · ${session.length} 题</p></section>
      <div class="miniStats"><div><b>${session.length}</b><span>本组题数</span></div><div><b>${acc}%</b><span>本组正确率</span></div><div><b>${state().wrong.length}</b><span>待复习</span></div></div>
      <div style="height:18px"></div>
      <button class="primaryWide" id="again">继续刷一组</button>
      <button class="secondaryWide" id="home">回到首页</button>`;
    $('#again').onclick = () => sessionMode === 'wrong' ? startWrong() : startSmart('all');
    $('#home').onclick = showHome;
  }

  function showChapters() {
    chrome('chapter', '章节刷题', true);
    renderChapters('finance');
  }

  function renderChapters(sub) {
    const A = state().answered || {};
    const rows = bank().filter((q) => q.s === sub);
    const chapters = [...new Set(rows.map((q) => q.ch))];
    main.innerHTML = `
      <div class="sheetTitle"><h1>选一个章节</h1><p>一次只集中处理一个章节，做完再决定要不要继续。</p></div>
      <div class="filterRow"><button class="pill ${sub === 'finance' ? 'active' : ''}" data-sub="finance">金融</button><button class="pill ${sub === 'law' ? 'active' : ''}" data-sub="law">法规</button></div>
      <div style="height:12px"></div>
      <div class="chapterList">
        ${chapters.map((ch) => {
          const qs = rows.filter((q) => q.ch === ch);
          const done = qs.filter((q) => q.id in A).length;
          return `<button class="chapterBtn" data-ch="${esc(ch)}"><b>${esc(ch)}</b><span>${done}/${qs.length} 已做 · ${qs.length - done} 未做</span></button>`;
        }).join('')}
      </div>`;

    main.querySelectorAll('[data-sub]').forEach((b) => { b.onclick = () => renderChapters(b.dataset.sub); });
    main.querySelectorAll('[data-ch]').forEach((b) => {
      b.onclick = () => {
        const qs = rows.filter((q) => q.ch === b.dataset.ch);
        const unseen = qs.filter((q) => !(q.id in A));
        const picked = [...shuffle(unseen), ...shuffle(qs.filter((q) => q.id in A))].slice(0, 30);
        startRows(picked, b.dataset.ch, 'chapter');
      };
    });
  }

  function showWrong() {
    chrome('wrong', '错题');
    const S = state();
    const ids = S.wrong || [];
    const R = recovery();
    const body = ids.length
      ? `<button class="primaryWide" id="wrongAll">开始错题重练 · ${ids.length} 题</button><div class="wrongList">${ids.slice(0, 80).map((id) => {
          const q = bank().find((x) => x.id === id);
          if (!q) return '';
          return `<article class="wrongItem"><div class="meta">${shortSubject(q.s)} · 已恢复 ${R[id] || 0}/2</div><p>${esc(q.q)}</p><button data-one="${q.id}">再做一次</button></article>`;
        }).join('')}</div>`
      : '<div class="empty"><b>现在没有待复习错题</b><span>答错的题会自动来到这里。</span></div>';

    main.innerHTML = `<div class="sheetTitle"><h1>错题</h1><p>错题不是永久收藏。连续重新答对 2 次后，会自动从待复习里退出。</p></div>${body}`;
    if ($('#wrongAll')) $('#wrongAll').onclick = startWrong;
    main.querySelectorAll('[data-one]').forEach((b) => {
      b.onclick = () => {
        const q = bank().find((x) => x.id === b.dataset.one);
        if (q) startRows([q], '单题复习', 'wrong');
      };
    });
  }

  function showMe() {
    chrome('me', '我的');
    const S = overallStats();
    const f = statsFor('finance');
    const l = statsFor('law');
    const profiles = read(PKEY, []);
    const active = localStorage.getItem(AKEY);
    main.innerHTML = `
      <div class="sheetTitle"><h1>学习进度</h1><p>这里只保留对刷题有用的数据。</p></div>
      <div class="meCard"><h3>总体</h3><div class="statLine"><span>累计已做</span><b>${S.done}</b></div><div class="statLine"><span>累计正确率</span><b>${S.done ? S.acc + '%' : '—'}</b></div><div class="statLine"><span>待复习错题</span><b>${S.wrong}</b></div></div>
      <div class="meCard"><h3>两科</h3><div class="statLine"><span>金融</span><b>${f.done}/${f.total} · ${f.done ? f.acc + '%' : '—'}</b></div><div class="statLine"><span>法规</span><b>${l.done}/${l.total} · ${l.done ? l.acc + '%' : '—'}</b></div></div>
      ${profiles.length ? `<div class="meCard"><h3>本机学习档案</h3><div class="profileBtns">${profiles.map((p) => `<button data-profile="${p.id}" class="${p.id === active ? 'active' : ''}">${esc(p.name || '学习档案')}</button>`).join('')}</div></div>` : ''}
      <div class="meCard"><h3>版本</h3><div class="statLine"><span>刷题器</span><b>v${VERSION}</b></div><div class="statLine"><span>模式</span><b>手机优先 · 本机记录</b></div></div>`;
    main.querySelectorAll('[data-profile]').forEach((b) => { b.onclick = () => switchProfile(b.dataset.profile); });
  }

  bottomNav.querySelectorAll('[data-tab]').forEach((b) => {
    b.onclick = () => b.dataset.tab === 'home' ? showHome() : b.dataset.tab === 'wrong' ? showWrong() : showMe();
  });
  backBtn.onclick = showHome;
  topAction.onclick = showMe;

  window.addEventListener('error', (e) => console.error('v4 error', e.error || e.message));
  loadCourses().finally(() => {});
  showHome();
  window.SEC_QUIZ_V4 = { version: VERSION, mode: 'mobile-first-question-centric', cloudSync: false };
})();
