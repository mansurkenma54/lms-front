// ═══════════════════════════════════════════════
//  TEACHER.JS — Мұғалім панелі логикасы
// ═══════════════════════════════════════════════

var currentTeacher = null;

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Theme
  var t = localStorage.getItem('pycontest_theme') || 'dark';
  if (t === 'light') document.documentElement.setAttribute('data-theme','light');

  // Check session
  var sess = null;
  try { sess = JSON.parse(sessionStorage.getItem('lms_teacher_session')); } catch(e){}
  if (sess) {
    var teacher = TeacherAuth.getTeacher(sess.username);
    if (teacher) {
      currentTeacher = teacher;
      if (teacher.role === 'admin') {
        window.location.href = 'admin.html'; return;
      }
      showDashboard();
      return;
    }
  }
  // Show login form
  document.getElementById('teacher-login-screen').style.display = 'flex';
});

// ── LOGIN ─────────────────────────────────────
function doTeacherLogin() {
  var u = document.getElementById('t-username').value.trim();
  var p = document.getElementById('t-password').value.trim();
  var err = document.getElementById('teacher-error');
  var btn = document.getElementById('t-login-btn');

  err.style.display = 'none'; btn.disabled = true; btn.textContent = '⏳...';

  setTimeout(function() {
    var result = TeacherAuth.login(u, p);
    if (!result.ok) {
      err.textContent = result.msg; err.style.display = 'flex';
      btn.disabled = false; btn.textContent = '▶ Кіру'; return;
    }
    currentTeacher = result.teacher;
    if (result.teacher.role === 'admin') {
      window.location.href = 'admin.html'; return;
    }
    showDashboard();
  }, 300);
}

function showDashboard() {
  document.getElementById('teacher-login-screen').style.display = 'none';
  document.getElementById('teacher-main').style.display = 'block';
  document.getElementById('teacher-name').textContent = currentTeacher.displayName || currentTeacher.username;
  switchTab('pending');
  loadCourseCode();
}

function teacherLogout() {
  sessionStorage.removeItem('lms_teacher_session');
  window.location.reload();
}

// ── TABS ────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.teacher-tab').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.teacher-panel').forEach(function(p){ p.style.display='none'; });
  var btn = document.getElementById('tab-'+tab);
  var panel = document.getElementById('panel-'+tab);
  if (btn) btn.classList.add('active');
  if (panel) panel.style.display = 'block';

  if (tab === 'pending')  loadPendingStudents();
  if (tab === 'students') loadStudentsTable();
  if (tab === 'trophies') loadStudentsTable();
  if (tab === 'messages') updateMsgStudents();
  if (tab === 'timer')    loadTimerData();
}

// ── PENDING STUDENTS ─────────────────────────
function loadPendingStudents() {
  var list = [];
  try { list = JSON.parse(localStorage.getItem('pending_students') || '[]'); } catch(e){}
  var tbody = document.getElementById('pending-tbody');
  tbody.innerHTML = '';

  var badge = document.getElementById('pending-badge');
  if (badge) badge.textContent = list.length || '';
  badge.style.display = list.length ? 'inline-flex' : 'none';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:30px">Күткен оқушы жоқ</td></tr>';
    return;
  }
  list.forEach(function(username) {
    var st = getStudentData(username);
    if (!st || st.status !== 'pending') return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + escHtml(st.displayName || st.fullname || username) + '</strong></td>' +
      '<td style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">' + escHtml(username) + '</td>' +
      '<td style="font-size:12px;color:var(--text3)">' + formatDate(st.registered_at) + '</td>' +
      '<td><div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-primary" onclick="approveStudent(\'' + username + '\')">✅ Қабылдау</button>' +
        '<button class="btn btn-sm btn-danger"  onclick="rejectStudent(\'' + username + '\')">❌ Қабылдамау</button>' +
      '</div></td>';
    tbody.appendChild(tr);
  });
}

function approveStudent(username) {
  var st = getStudentData(username);
  if (!st) return;
  st.status = 'active';
  saveStudentData(username, st);
  // Remove from pending
  var list = [];
  try { list = JSON.parse(localStorage.getItem('pending_students') || '[]'); } catch(e){}
  localStorage.setItem('pending_students', JSON.stringify(list.filter(function(u){ return u !== username; })));
  showToast('✅ ' + (st.displayName || username) + ' қабылданды!', 'success');
  loadPendingStudents();
}

function rejectStudent(username) {
  var st = getStudentData(username);
  if (!st) return;
  st.status = 'rejected';
  saveStudentData(username, st);
  var list = [];
  try { list = JSON.parse(localStorage.getItem('pending_students') || '[]'); } catch(e){}
  localStorage.setItem('pending_students', JSON.stringify(list.filter(function(u){ return u !== username; })));
  showToast('❌ ' + (st.displayName || username) + ' қабылданбады', 'warn');
  loadPendingStudents();
}

// ── STUDENTS TABLE ────────────────────────────
function loadStudentsTable() {
  var all = getAllStudents();
  var tbody = document.getElementById('students-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!all.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:30px">Студент жоқ</td></tr>';
    return;
  }

  all.forEach(function(st) {
    var warnCount = st.warnings || 0;
    var banned    = st.banned;
    var warnStyle = warnCount === 0 ? 'color:var(--accent)' : warnCount < 3 ? 'color:var(--accent2)' : 'color:var(--error)';

    var lastLogin = st.last_login ? timeAgo(st.last_login) : '—';
    var lastSub = (st.submissions && st.submissions.length) ? timeAgo(st.submissions[st.submissions.length-1].at) : '—';

    var statusCell = banned
      ? '<span class="ban-badge">🚫 Бан</span>'
      : st.status === 'pending'
        ? '<span style="color:var(--text3)">⏳ Күтуде</span>'
        : '<span class="ok-badge">✅ Белсенді</span>';

    var actionCell = '<div style="display:flex;gap:4px;flex-wrap:wrap">';
    if (!banned) {
      actionCell += '<button class="btn btn-sm btn-gold" title="Кубок беру" onclick="openTrophyModal(\'' + st.username + '\')">🏆</button>';
      actionCell += '<button class="btn btn-sm" style="background:rgba(255,140,0,.15);border:1px solid rgba(255,140,0,.3);color:var(--warn)" onclick="warnStudent(\'' + st.username + '\')">⚠️</button>';
      actionCell += '<button class="btn btn-sm btn-danger" onclick="banStudent(\'' + st.username + '\')">🚫</button>';
    } else {
      actionCell += '<button class="btn btn-sm btn-secondary" onclick="unbanStudent(\'' + st.username + '\')">🔓 Аша</button>';
    }
    actionCell += '<button class="btn btn-sm btn-ghost" onclick="openMsgModal(\'' + st.username + '\')">💬</button>';
    actionCell += '</div>';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + escHtml(st.displayName || st.fullname || st.username) + '</strong></td>' +
      '<td style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">' + escHtml(st.username) + '</td>' +
      '<td style="font-weight:700;color:var(--accent2)">' + (st.score || 0) + '</td>' +
      '<td>' + (st.solved ? st.solved.length : 0) + '</td>' +
      '<td>💎&nbsp;' + (st.bits || 0) + '</td>' +
      '<td style="font-size:12px;color:var(--text3)">' + lastLogin + '</td>' +
      '<td style="font-size:12px;color:var(--text3)">' + lastSub + '</td>' +
      '<td><span style="' + warnStyle + ';font-weight:700;font-size:13px">' + warnCount + '/3</span></td>' +
      '<td>' + statusCell + '</td>' +
      '<td>' + actionCell + '</td>';
    tbody.appendChild(tr);
  });
}

// ── ACTIONS ───────────────────────────────────
function warnStudent(username) {
  var reason = prompt('Ескерту себебі:');
  if (reason === null) return;
  var st = getStudentData(username);
  if (!st) return;
  st.warnings = (st.warnings || 0) + 1;
  st.warnings_log = st.warnings_log || [];
  st.warnings_log.push({ time: new Date().toISOString(), reason: reason || 'Мұғалім ескертуі' });
  if (st.warnings >= 3) {
    st.banned = true;
    st.ban_reason = '3 ескертуден кейін бан. Соңғы: ' + (reason || '');
    showToast('🚫 3 ескертуден кейін автоматты бан!', 'warn');
  } else {
    showToast('⚠️ Ескерту жіберілді (' + st.warnings + '/3)', 'warn');
  }
  saveStudentData(username, st);
  loadStudentsTable();
}

function banStudent(username) {
  var reason = prompt('Бан себебі:') || 'Мұғалім бандады';
  var st = getStudentData(username);
  if (!st) return;
  st.banned = true; st.ban_reason = reason;
  saveStudentData(username, st);
  showToast('🚫 Бандалды', 'warn');
  loadStudentsTable();
}

function unbanStudent(username) {
  var st = getStudentData(username);
  if (!st) return;
  st.banned = false; st.ban_reason = '';
  st.warnings = 0; st.warnings_log = [];
  saveStudentData(username, st);
  showToast('🔓 Бан алынды', 'success');
  loadStudentsTable();
}

// ── TROPHY MODAL ──────────────────────────────
var trophyTargetUser = null;
function openTrophyModal(username) {
  trophyTargetUser = username;
  var st = getStudentData(username);
  document.getElementById('trophy-student-name').textContent = st ? (st.displayName || st.fullname || username) : username;
  document.getElementById('trophy-reason').value = '';
  document.querySelectorAll('.trophy-option').forEach(function(o){ o.classList.remove('selected'); });
  openModal('trophy-modal');
}

function selectTrophy(type) {
  document.querySelectorAll('.trophy-option').forEach(function(o){ o.classList.remove('selected'); });
  document.querySelector('[data-trophy="'+type+'"]').classList.add('selected');
}

function giveTrophy() {
  if (!trophyTargetUser) return;
  var sel = document.querySelector('.trophy-option.selected');
  if (!sel) { showToast('Кубок түрін таңдаңыз', 'warn'); return; }
  var type = sel.dataset.trophy;
  var reason = document.getElementById('trophy-reason').value.trim() || 'Мұғалім сыйлады';
  var st = getStudentData(trophyTargetUser);
  if (!st) return;
  st.badges = st.badges || [];
  st.badges.push({ type: type, reason: reason, given_by: currentTeacher.username, date: new Date().toISOString() });
  saveStudentData(trophyTargetUser, st);
  closeModal('trophy-modal');
  showToast('🏆 Кубок берілді!', 'success');
}

// ── MESSAGES ─────────────────────────────────
var msgTargetUser = null;
function openMsgModal(username) {
  msgTargetUser = username;
  var st = getStudentData(username);
  document.getElementById('msg-student-name').textContent = st ? (st.displayName || st.fullname || username) : username;
  document.getElementById('msg-text').value = '';
  openModal('msg-modal');
}

function sendMessage() {
  if (!msgTargetUser) return;
  var text = document.getElementById('msg-text').value.trim();
  if (!text) { showToast('Хабар жазыңыз', 'warn'); return; }
  var msgs = [];
  try { msgs = JSON.parse(localStorage.getItem('messages_' + msgTargetUser) || '[]'); } catch(e){}
  msgs.push({ from: currentTeacher.displayName || currentTeacher.username, text: text, at: new Date().toISOString(), read: false });
  localStorage.setItem('messages_' + msgTargetUser, JSON.stringify(msgs));
  closeModal('msg-modal');
  showToast('💬 Хабар жіберілді!', 'success');
}

function updateMsgStudents() {
  var sel = document.getElementById('msg-student-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">Студент таңдаңыз...</option>';
  getAllStudents().forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s.username;
    opt.textContent = (s.displayName || s.fullname || s.username) + ' (@' + s.username + ')';
    sel.appendChild(opt);
  });
}

// ── COURSE CODE ──────────────────────────────
function loadCourseCode() {
  var code = localStorage.getItem('contest_access_code') || 'PYTHON';
  var el = document.getElementById('current-code');
  if (el) el.textContent = code;
  var inp = document.getElementById('new-code-input');
  if (inp) inp.value = code;
}

function saveCourseCode() {
  var code = (document.getElementById('new-code-input').value.trim() || '').toUpperCase();
  if (code.length < 4) { showToast('Код кем дегенде 4 таңба', 'warn'); return; }
  localStorage.setItem('contest_access_code', code);
  loadCourseCode();
  showToast('✅ Курс коды сақталды: ' + code, 'success');
}

function generateCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  document.getElementById('new-code-input').value = code;
}

// ── TIMER DATA ────────────────────────────────
function loadTimerData() {
  var tbody = document.getElementById('timer-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  var students = getAllStudents();
  students.forEach(function(st) {
    var subs = st.submissions || [];
    subs.forEach(function(sub) {
      var timerKey = 'task_timer_' + st.username + '_' + sub.problemId;
      var td = null; try { td = JSON.parse(localStorage.getItem(timerKey)); } catch(e){}
      var secs = td ? (td.totalSeconds || 0) : 0;
      var mins = Math.floor(secs / 60);
      var hasWarn = !!(st.warnings_log && st.warnings_log.find(function(w){ return sub.at && Math.abs(new Date(w.time)-new Date(sub.at)) < 600000; }));
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escHtml(st.displayName || st.username) + '</td>' +
        '<td>#' + sub.problemId + ' ' + escHtml(sub.problemTitle || '') + '</td>' +
        '<td>' + formatDate(sub.at) + '</td>' +
        '<td style="font-family:var(--font-mono)">' + mins + ' мин ' + (secs % 60) + ' сек</td>' +
        '<td>' + (hasWarn ? '⚠️ Иә' : '—') + '</td>' +
        '<td style="color:var(--accent2);font-weight:700">' + sub.score + '%</td>';
      tbody.appendChild(tr);
    });
  });
  if (!tbody.innerHTML) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:30px">Деректер жоқ</td></tr>';
  }
}

// ── UTILS ─────────────────────────────────────
function getAllStudents() {
  var all = [];
  Object.keys(localStorage).forEach(function(k) {
    if (k.startsWith('student_')) {
      try { var s = JSON.parse(localStorage.getItem(k)); if(s && s.username) all.push(s); } catch(e){}
    }
  });
  return all.sort(function(a,b){ return (b.score||0) - (a.score||0); });
}
function getStudentData(u) { try { return JSON.parse(localStorage.getItem('student_' + u)) || null; } catch(e){return null;} }
function saveStudentData(u, d) { localStorage.setItem('student_' + u, JSON.stringify(d)); }
function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function showToast(msg, type) {
  var icons = {success:'✅',error:'❌',warn:'⚠️',info:'ℹ️'};
  var c = document.getElementById('toast-container'); if(!c)return;
  var t = document.createElement('div');
  t.className = 'toast toast-'+(type||'info');
  t.innerHTML = '<span class="toast-icon">'+(icons[type]||'')+'</span><span>'+msg+'</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>';
  c.appendChild(t); setTimeout(function(){if(t.parentElement)t.remove();},3500);
}
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
function formatDate(iso){ if(!iso)return'—'; var d=new Date(iso); return d.toLocaleDateString('kk-KZ')+' '+d.toLocaleTimeString('kk-KZ',{hour:'2-digit',minute:'2-digit'}); }
function timeAgo(iso){ if(!iso)return'—'; var d=(Date.now()-new Date(iso))/ 1000; if(d<60)return Math.round(d)+' сек бұрын'; if(d<3600)return Math.round(d/60)+' мин бұрын'; if(d<86400)return Math.round(d/3600)+' сағ бұрын'; return Math.round(d/86400)+' күн бұрын'; }
function toggleTheme(){
  var t=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';
  if(t==='light')document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('pycontest_theme',t);
  var btn=document.getElementById('theme-btn');
  if(btn)btn.textContent=t==='dark'?'🌙':'☀️';
}
