// ═══════════════════════════════════════════════
//  CONTEST.JS — Жарыс логикасы (Pyodide + Timer)
// ═══════════════════════════════════════════════

var currentStudent = null;
var currentProblem = null;

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // Auth check
  try { currentStudent = JSON.parse(sessionStorage.getItem('lms_student_session')); } catch (e) {}
  if (!currentStudent || !currentStudent.username) {
    window.location.href = 'index.html'; return;
  }

  // Check ban
  var st = getStudentData(currentStudent.username);
  if (st && st.banned) {
    document.getElementById('ban-screen').style.display = 'flex';
    var bm = document.getElementById('ban-msg');
    if (bm) bm.textContent = st.ban_reason || 'Аккаунт бандалды.';
    return;
  }

  // Update nav
  updateNav();
  // Render problem list
  renderProblemList();
  // Load first problem
  loadProblem(1);
  // Show messages
  checkMessages();
  // Preload Pyodide in background
  loadPyodideIfNeeded();
});

// ── NAV UPDATE ────────────────────────────────
function updateNav() {
  var st = getStudentData(currentStudent.username);
  document.getElementById('nav-name').textContent = (st && (st.displayName || st.fullname)) || currentStudent.username;
  document.getElementById('nav-bits').textContent  = st ? (st.bits || 0) : 0;
  document.getElementById('nav-score').textContent = st ? (st.score || 0) : 0;
  var solved = st ? (st.solved || []) : [];
  var total  = (window.PROBLEMS || []).length;
  document.getElementById('solved-count').textContent = solved.length;
  document.getElementById('total-count').textContent  = total;
  var pct = total ? Math.round(solved.length / total * 100) : 0;
  var fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';
  AntiCheat.updateNavWarning();
}

// ── PROBLEM LIST ──────────────────────────────
function renderProblemList() {
  var list = document.getElementById('problems-list');
  var filter = (document.getElementById('diff-filter') || {}).value || 'all';
  var problems = window.PROBLEMS || [];
  var st = getStudentData(currentStudent.username);
  var solved = st ? (st.solved || []) : [];

  var filtered = filter === 'all' ? problems : problems.filter(function(p){ return p.difficulty === filter; });
  list.innerHTML = '';
  filtered.forEach(function (p) {
    var isSolved = solved.includes(p.id);
    var diffCls = {easy:'badge-easy',medium:'badge-medium',hard:'badge-hard'}[p.difficulty] || 'badge-easy';
    var el = document.createElement('div');
    el.className = 'problem-item' + (isSolved ? ' solved' : '') + (currentProblem && currentProblem.id === p.id ? ' active' : '');
    el.dataset.pid = p.id;
    el.innerHTML =
      '<span class="problem-item-num">#' + p.id + '</span>' +
      '<span class="problem-item-title">' + escHtml(p.title) + '</span>' +
      '<span class="badge ' + diffCls + '" style="font-size:9px;padding:2px 7px">' + p.points + '</span>';
    el.onclick = function () { loadProblem(p.id); };
    list.appendChild(el);
  });
}

// ── LOAD PROBLEM ──────────────────────────────
function loadProblem(id) {
  var problems = window.PROBLEMS || [];
  var p = problems.find(function(x){ return x.id === id; });
  if (!p) return;

  stopTaskTimer();
  currentProblem = p;

  // Highlight sidebar
  document.querySelectorAll('.problem-item').forEach(function(el){
    el.classList.toggle('active', String(el.dataset.pid) === String(id));
  });

  // Title, badge, pts
  document.getElementById('problem-title').textContent = '#' + p.id + ' ' + p.title;
  var badge = document.getElementById('problem-badge');
  badge.textContent = { easy:'Жеңіл', medium:'Орташа', hard:'Қиын' }[p.difficulty] || p.difficulty;
  badge.className = 'badge ' + ({ easy:'badge-easy', medium:'badge-medium', hard:'badge-hard' }[p.difficulty] || '');

  var st = getStudentData(currentStudent.username);
  var solved = st ? (st.solved || []) : [];
  var subs = st && st.submissions ? st.submissions.filter(function(s){ return s.problemId === id; }) : [];
  document.getElementById('problem-pts').textContent = (solved.includes(id) ? '✅ ' : '') + p.points + ' бал';
  document.getElementById('problem-attempts-info').textContent = subs.length ? subs.length + ' рет жіберілді' : '';

  // Statement, format
  document.getElementById('problem-statement').textContent = p.statement || '';
  document.getElementById('input-format').textContent  = p.input_format  || '';
  document.getElementById('output-format').textContent = p.output_format || '';

  // Examples
  var grid = document.getElementById('examples-grid');
  grid.innerHTML = '';
  var examples = p.examples || (p.test_cases ? p.test_cases.slice(0,2) : []);
  examples.forEach(function(ex, i) {
    var inp = ex.input || ''; var out = ex.output || ex.expected_output || '';
    var block = document.createElement('div');
    block.className = 'example-block';
    block.innerHTML =
      '<div class="example-panel"><div class="example-panel-hd">📥 Кіріс ' + (i+1) + '</div><pre>' + escHtml(inp) + '</pre></div>' +
      '<div class="example-panel"><div class="example-panel-hd">📤 Шығыс ' + (i+1) + '</div><pre style="color:var(--accent)">' + escHtml(out) + '</pre></div>';
    grid.appendChild(block);
  });

  // Hints
  renderHints(p);

  // Restore saved code + answer banner
  var key = 'code_' + currentStudent.username + '_' + id;
  document.getElementById('code-area').value = localStorage.getItem(key) || '';
  document.getElementById('run-output').style.display = 'none';
  document.getElementById('answer-banner').style.display =
    (st && st.hints_used && st.hints_used[id] && st.hints_used[id].answer) ? 'flex' : 'none';
  document.getElementById('custom-input').value = examples[0] ? examples[0].input || '' : '';
  document.getElementById('expected-output').value = examples[0] ? (examples[0].output || examples[0].expected_output || '') : '';

  // Start timer
  startTaskTimer(id);

  // Autosave
  setupAutosave(id);
}

// ── HINTS ─────────────────────────────────────
var HINT_COSTS = { small: 5, big: 15, answer: 40 };
function renderHints(p) {
  var shownEl = document.getElementById('hints-shown');
  shownEl.innerHTML = '';
  var st = getStudentData(currentStudent.username);
  var used = (st && st.hints_used && st.hints_used[p.id]) || {};
  var types = [{k:'small',label:'Кішкене кеңес',icon:'🔍'},{k:'big',label:'Үлкен кеңес',icon:'💡'},{k:'answer',label:'Шешім',icon:'👁️'}];
  types.forEach(function(t) {
    var btnEl = document.getElementById( t.k==='small'?'hint-btn-1': t.k==='big'?'hint-btn-2':'hint-btn-3');
    if (used[t.k]) {
      var content = t.k==='small'?(p.hint_small||''):t.k==='big'?(p.hint_big||''):(p.solution||'');
      var box = document.createElement('div');
      box.className = 'hint-box';
      box.innerHTML = '<div class="hint-box-title">' + t.icon + ' ' + t.label + '</div>' + (t.k==='answer'? '<pre style="font-family:var(--font-mono);font-size:12px;white-space:pre-wrap">' + escHtml(content) + '</pre>' : escHtml(content));
      shownEl.appendChild(box);
      if (btnEl) { btnEl.disabled = true; btnEl.textContent = t.icon + ' Ашылды'; }
    } else {
      if (btnEl) { btnEl.disabled = false; }
    }
  });
}

function buyHint(type) {
  if (!currentProblem) return;
  var cost = HINT_COSTS[type];
  var st = getStudentData(currentStudent.username);
  if (!st) return;
  if ((st.bits || 0) < cost) {
    showToast('💎 Бит жеткіліксіз (қажет: ' + cost + ')', 'error'); return;
  }
  if (type === 'answer') {
    // Show confirm modal
    document.getElementById('confirm-title').textContent = '👁️ Жауапты ашу';
    document.getElementById('confirm-msg').textContent = 'Жауапты ашу: ' + cost + ' 💎 бит алынады. Жіберу кезінде 80% бал кетеді.';
    document.getElementById('confirm-ok').onclick = function() {
      closeModal('confirm-modal');
      performBuyHint(type, cost, st);
    };
    openModal('confirm-modal'); return;
  }
  performBuyHint(type, cost, st);
}

function performBuyHint(type, cost, st) {
  var p = currentProblem;
  st.bits = (st.bits || 0) - cost;
  st.hints_used = st.hints_used || {};
  st.hints_used[p.id] = st.hints_used[p.id] || {};
  st.hints_used[p.id][type] = true;
  saveStudentData(currentStudent.username, st);
  updateNav();
  renderHints(p);
  showToast('🔍 Кеңес ашылды! −' + cost + ' 💎', 'info');
  if (type === 'answer') {
    document.getElementById('answer-code').textContent = p.solution || '# Жауап жоқ';
    openModal('answer-modal');
  }
}

// ── TASK TIMER ────────────────────────────────
var taskTimer = null;
var taskTotalSeconds = 0;
var taskTimerEl = null;

function startTaskTimer(problemId) {
  taskTimerEl = document.getElementById('task-timer');
  if (taskTimerEl) taskTimerEl.style.display = 'flex';
  var key = 'task_timer_' + currentStudent.username + '_' + problemId;
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch(e){}

  if (saved && saved.lastActive) {
    var elapsed = Math.floor((Date.now() - saved.lastActive) / 1000);
    if (elapsed > 300) {
      // 5 minutes inactive → reset and notify
      localStorage.removeItem(key);
      taskTotalSeconds = 0;
      showToast('⏰ 5 минут өтті, жаңа сессия басталды.', 'warn');
    } else {
      taskTotalSeconds = (saved.totalSeconds || 0) + elapsed;
    }
  } else {
    taskTotalSeconds = 0;
  }

  // Save initial
  localStorage.setItem(key, JSON.stringify({ problemId: problemId, startTime: Date.now(), lastActive: Date.now(), totalSeconds: taskTotalSeconds }));

  clearInterval(taskTimer);
  taskTimer = setInterval(function() {
    taskTotalSeconds++;
    // Update localStorage every 30 sec
    if (taskTotalSeconds % 30 === 0) {
      saveTimerState(key, problemId);
    }
    updateTimerDisplay(taskTotalSeconds);
  }, 1000);
}

function stopTaskTimer() {
  clearInterval(taskTimer);
  if (taskTimerEl) taskTimerEl.style.display = 'none';
}

function saveTimerState(key, problemId) {
  localStorage.setItem(key, JSON.stringify({ problemId: problemId, startTime: Date.now(), lastActive: Date.now(), totalSeconds: taskTotalSeconds }));
}

function updateTimerDisplay(secs) {
  if (!taskTimerEl) return;
  var m = Math.floor(secs / 60).toString().padStart(2,'0');
  var s = (secs % 60).toString().padStart(2,'0');
  taskTimerEl.textContent = '⏱️ ' + m + ':' + s;
  if (secs >= 240) taskTimerEl.style.color = '#ff3b5c';
  else if (secs >= 180) taskTimerEl.style.color = '#ff8c00';
  else taskTimerEl.style.color = 'var(--accent)';
}

// ── AUTOSAVE ─────────────────────────────────
var autosaveTimer = null;
function setupAutosave(problemId) {
  clearInterval(autosaveTimer);
  autosaveTimer = setInterval(function() {
    var code = document.getElementById('code-area').value;
    if (code.trim()) {
      localStorage.setItem('code_' + currentStudent.username + '_' + problemId, code);
    }
  }, 5000);
}

// ── RUN CODE (Pyodide) ────────────────────────
async function runCode() {
  var code = document.getElementById('code-area').value.trim();
  var customInput = document.getElementById('custom-input').value;
  var outEl = document.getElementById('run-output');
  var resEl = document.getElementById('run-result');
  var runBtn = document.getElementById('run-btn');

  if (!code) { showToast('Код жазыңыз!', 'warn'); return; }

  outEl.style.display = 'block';
  resEl.innerHTML = '<span style="color:var(--text3)">⏳ Python орындалуда...</span>';
  if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳...'; }

  var inputToUse = customInput || (currentProblem && currentProblem.examples && currentProblem.examples[0] ? currentProblem.examples[0].input : '');
  var result = await runPythonCode(code, inputToUse);

  if (runBtn) { runBtn.disabled = false; runBtn.textContent = '▶ Іске қосу'; }

  if (!result.ok) {
    resEl.innerHTML =
      '<span style="color:var(--error)">❌ Қате:</span>\n' +
      '<pre style="color:#ff8080;font-size:12px;white-space:pre-wrap;margin-top:6px">' + escHtml(result.error) + '</pre>';
    return;
  }

  var expected = document.getElementById('expected-output').value.trim() ||
    (currentProblem && currentProblem.examples && currentProblem.examples[0] ?
      (currentProblem.examples[0].output || '').trim() : '');

  var actual = result.output;
  var passed = expected && actual === expected;

  var html = '';
  if (passed) {
    html = '<span style="color:var(--accent)">✅ Дұрыс! Нәтиже сәйкес келеді.</span>\n<span style="color:var(--text3)">Жіберу үшін «Жіберу» басыңыз.</span>\n';
  } else if (expected) {
    html =
      '<span style="color:var(--error)">❌ Нәтиже сәйкес емес</span>\n' +
      '<span style="color:var(--text2)">Күтілген:  </span><span style="color:var(--accent2)">' + escHtml(expected) + '</span>\n' +
      '<span style="color:var(--text2)">Шыққан:   </span><span style="color:var(--error)">'   + escHtml(actual)   + '</span>\n';
  } else {
    html = '<span style="color:var(--accent2)">📤 Шығыс:</span>\n';
  }
  html += renderOutputVisual(actual);
  resEl.innerHTML = html;
}

// ── SUBMIT CODE ───────────────────────────────
async function submitCode() {
  var code = document.getElementById('code-area').value.trim();
  if (!code || !currentProblem) { showToast('Код жазыңыз!', 'warn'); return; }

  var submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true; submitBtn.textContent = '⏳ Тексерілуде...';

  var p = currentProblem;
  var testCases = p.test_cases || (p.examples ? p.examples.map(function(e){ return {input: e.input||'', expected_output: e.output||e.expected_output||''}; }) : []);

  if (!testCases.length) {
    // No test cases — check example
    var inp = p.examples && p.examples[0] ? p.examples[0].input : '';
    var exp = p.examples && p.examples[0] ? (p.examples[0].output || p.examples[0].expected_output || '') : '';
    testCases = [{ input: inp, expected_output: exp }];
  }

  var testResult = await runTests(code, testCases);
  submitBtn.disabled = false; submitBtn.textContent = '↑ Жіберу';

  var st = getStudentData(currentStudent.username);
  if (!st) return;

  var alreadySolved = (st.solved || []).includes(p.id);
  var attemptsKey = 'attempts_' + currentStudent.username + '_' + p.id;
  var attempts = parseInt(localStorage.getItem(attemptsKey) || '0', 10) + 1;
  localStorage.setItem(attemptsKey, attempts);

  // Save submission
  st.submissions = st.submissions || [];
  var usedAnswer = !!(st.hints_used && st.hints_used[p.id] && st.hints_used[p.id].answer);
  st.submissions.push({
    problemId: p.id, problemTitle: p.title,
    score: testResult.score, passed: testResult.passed, total: testResult.total,
    attempts: attempts, hasAnswer: usedAnswer,
    at: new Date().toISOString()
  });

  if (testResult.score === 100 && !alreadySolved) {
    // FULL SCORE
    var pts = Math.round(p.points * (usedAnswer ? 0.2 : attempts === 1 ? 1 : attempts <= 3 ? 0.75 : 0.5));
    var bits = 10;
    st.solved = st.solved || [];
    st.solved.push(p.id);
    st.score = (st.score || 0) + pts;
    st.bits  = (st.bits || 0) + bits;
    saveStudentData(currentStudent.username, st);
    updateNav();
    renderProblemList();
    // Confetti
    showConfetti();
    // AC Modal
    document.getElementById('ac-pts').textContent = '+' + pts;
    document.getElementById('ac-msg').textContent = testResult.total + ' тест: ' + testResult.passed + '/' + testResult.total + ' өтті!';
    document.getElementById('ac-total').textContent = st.score;
    openModal('ac-modal');
    showToast('🎉 +' + pts + ' бал, +' + bits + ' 💎 бит!', 'success');
  } else if (testResult.score === 100 && alreadySolved) {
    saveStudentData(currentStudent.username, st);
    showToast('✅ Дұрыс! (Бұрын шешкенсіз)', 'info');
  } else {
    // Wrong answer
    var nextPts = attempts === 1 ? '75%' : attempts <= 3 ? '50%' : '25%';
    document.getElementById('wa-attempts').textContent = attempts;
    document.getElementById('wa-next-pts').textContent = nextPts;
    saveStudentData(currentStudent.username, st);
    openModal('wa-modal');
    showToast('❌ ' + testResult.passed + '/' + testResult.total + ' тест өтті (' + testResult.score + '%)', 'error');
  }
}

function nextProblem() {
  closeModal('ac-modal');
  var problems = window.PROBLEMS || [];
  var idx = problems.findIndex(function(p){ return p.id === (currentProblem && currentProblem.id); });
  if (idx >= 0 && idx + 1 < problems.length) { loadProblem(problems[idx + 1].id); }
}

// ── CONFETTI ──────────────────────────────────
function showConfetti() {
  var colors = ['#00ff88','#ffd700','#ff3b5c','#7c3aed','#00cfff'];
  for (var i = 0; i < 80; i++) {
    (function() {
      var el = document.createElement('div');
      var color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText = 'position:fixed;width:'+(Math.random()*10+5)+'px;height:'+(Math.random()*10+5)+'px;' +
        'background:'+color+';top:-10px;left:'+(Math.random()*100)+'vw;border-radius:2px;z-index:9999;' +
        'animation:confettiFall '+(Math.random()*2+1.5)+'s ease '+(Math.random()*.5)+'s forwards;pointer-events:none';
      document.body.appendChild(el);
      setTimeout(function(){if(el.parentElement)el.remove();}, 4000);
    })();
  }
}
// Confetti keyframes
var styleEl = document.createElement('style');
styleEl.textContent = '@keyframes confettiFall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}';
document.head.appendChild(styleEl);

// ── MESSAGES ─────────────────────────────────
function checkMessages() {
  var msgs = [];
  try { msgs = JSON.parse(localStorage.getItem('messages_' + currentStudent.username) || '[]'); } catch(e){}
  if (!msgs.length) return;
  var unread = msgs.filter(function(m){ return !m.read; });
  if (!unread.length) return;
  // Show notification in nav
  var nav = document.querySelector('.nav-right');
  var bell = document.createElement('div');
  bell.style.cssText = 'cursor:pointer;font-size:18px;position:relative';
  bell.title = unread.length + ' жаңа хабар';
  bell.innerHTML = '🔔<span style="position:absolute;top:-4px;right:-4px;background:var(--error);color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;display:flex;align-items:center;justify-content:center;font-weight:700">' + unread.length + '</span>';
  bell.onclick = function() { showMessages(msgs); };
  nav.insertBefore(bell, nav.firstChild);
}

function showMessages(msgs) {
  showToast('📬 ' + msgs.length + ' хабар бар — профильге өтіңіз', 'info');
  msgs.forEach(function(m){ m.read = true; });
  localStorage.setItem('messages_' + currentStudent.username, JSON.stringify(msgs));
}

// ── LOGOUT ────────────────────────────────────
function logout() {
  stopTaskTimer();
  sessionStorage.removeItem('lms_student_session');
  window.location.href = 'index.html';
}

// ── UTILS ─────────────────────────────────────
function getStudentData(u) {
  try { return JSON.parse(localStorage.getItem('student_' + u)) || null; } catch(e) { return null; }
}
function saveStudentData(u, data) {
  localStorage.setItem('student_' + u, JSON.stringify(data));
}
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function showToast(msg, type) {
  var icons = {success:'✅', error:'❌', warn:'⚠️', info:'ℹ️'};
  var c = document.getElementById('toast-container');
  if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast toast-'+(type||'info');
  t.innerHTML = '<span class="toast-icon">'+(icons[type]||'')+'</span><span>'+msg+'</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>';
  c.appendChild(t);
  setTimeout(function(){if(t.parentElement)t.remove();}, 3500);
}
