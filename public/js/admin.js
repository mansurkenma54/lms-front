// ═══════════════════════════════════════════════
//  ADMIN.JS — Әкімші панелі логикасы
//  SHA-256 hash, bits management, teacher CRUD
// ═══════════════════════════════════════════════

// SHA-256 of 'admin2024': a1b2... (computed at runtime)
var ADMIN_HASH = null;
var ADMIN_PASSWORD_DEFAULT = 'admin2024';

// ── HASH ──────────────────────────────────────
async function hashPassword(pwd) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

async function adminLogin() {
  var u   = (document.getElementById('admin-username') || {}).value || '';
  var pw  = (document.getElementById('admin-password') || {}).value || '';
  var err = document.getElementById('admin-error');
  err.style.display = 'none';

  var result = TeacherAuth.login(u.trim(), pw.trim());
  if (!result.ok) {
    // Also try hash check for admin-nurdos
    var pwHash = await hashPassword(pw.trim());
    var stored = localStorage.getItem('admin_pw_hash') || await hashPassword(ADMIN_PASSWORD_DEFAULT);
    if (!(u.trim() === 'admin-nurdos' && pwHash === stored) && !(result.teacher && result.teacher.role === 'admin')) {
      err.textContent = result.msg;
      err.style.display = 'flex';
      return;
    }
  }

  if (result.ok && result.teacher.role !== 'admin') {
    err.textContent = 'Сізде admin рұқсаты жоқ! Тек Нұрдос Admin кіре алады.';
    err.style.display = 'flex';
    return;
  }

  localStorage.setItem('admin_logged_in', '1');
  document.getElementById('admin-login-screen').style.display = 'none';
  document.getElementById('admin-main').style.display = 'block';
  refreshAll();
}

function adminLogout() {
  localStorage.removeItem('admin_logged_in');
  sessionStorage.removeItem('lms_teacher_session');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', function() {
  // Pre-compute default admin hash
  hashPassword(ADMIN_PASSWORD_DEFAULT).then(function(h){ ADMIN_HASH = h; localStorage.setItem('admin_pw_hash', h); });

  // Auto-login from teacher-dashboard
  var teacherSess = null;
  try { teacherSess = JSON.parse(sessionStorage.getItem('lms_teacher_session')); } catch(e){}
  if (teacherSess) {
    var t = TeacherAuth.getTeacher(teacherSess.username);
    if (t && t.role === 'admin') localStorage.setItem('admin_logged_in', '1');
  }

  if (localStorage.getItem('admin_logged_in')) {
    document.getElementById('admin-login-screen').style.display = 'none';
    document.getElementById('admin-main').style.display = 'block';
    refreshAll();
  }

  var pw = document.getElementById('admin-password');
  if (pw) pw.addEventListener('keydown', function(e){ if(e.key==='Enter') adminLogin(); });
  var un = document.getElementById('admin-username');
  if (un) un.addEventListener('keydown', function(e){ if(e.key==='Enter') pw && pw.focus(); });

  // Theme
  var t = localStorage.getItem('pycontest_theme') || 'dark';
  if (t === 'light') document.documentElement.setAttribute('data-theme','light');
});

// ── REFRESH ────────────────────────────────────
function refreshAll() {
  loadStats();
  loadTeachersList();
  loadStudentsCredentials();
  loadStudentsTable();
  loadPendingAdmin();
}

// ── STATS ──────────────────────────────────────
function loadStats() {
  var students = getAllStudents();
  var courses  = LMSData ? LMSData.getCourses() : [];
  var subs     = getAllSubmissions();
  var banned   = students.filter(function(s){ return s.banned; });
  var pending  = [];
  try { pending = JSON.parse(localStorage.getItem('pending_students') || '[]'); } catch(e){}

  document.getElementById('stat-students').textContent  = students.length;
  var sc = document.getElementById('stat-courses');
  if (sc) sc.textContent = courses.length;
  document.getElementById('stat-submissions').textContent = subs;
  document.getElementById('stat-banned').textContent = banned.length;
  var sp = document.getElementById('stat-pending');
  if (sp) sp.textContent = pending.length;
}

// ── PENDING (Admin view) ──────────────────────
function loadPendingAdmin() {
  var el = document.getElementById('pending-admin-body');
  if (!el) return;
  var list = [];
  try { list = JSON.parse(localStorage.getItem('pending_students') || '[]'); } catch(e){}
  el.innerHTML = '';
  list.forEach(function(username) {
    var st = getStudentData(username);
    if (!st || st.status !== 'pending') return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + escHtml(st.displayName || st.fullname || username) + '</strong></td>' +
      '<td style="font-family:var(--font-mono);font-size:12px">' + escHtml(username) + '</td>' +
      '<td style="font-size:12px;color:var(--text3)">' + formatDate(st.registered_at) + '</td>' +
      '<td><div style="display:flex;gap:6px">' +
        '<button class="btn btn-sm btn-primary" onclick="adminApprove(\'' + username + '\')">✅ Қабылдау</button>' +
        '<button class="btn btn-sm btn-danger"  onclick="adminReject(\'' + username + '\')">❌ Қабылдамау</button>' +
      '</div></td>';
    el.appendChild(tr);
  });
  if (!el.innerHTML) el.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:24px">Күту тізімі бос</td></tr>';
}

function adminApprove(u) {
  var st = getStudentData(u); if (!st) return;
  st.status = 'active'; saveStudentData(u, st);
  var p = []; try{p=JSON.parse(localStorage.getItem('pending_students')||'[]');}catch(e){}
  localStorage.setItem('pending_students', JSON.stringify(p.filter(function(x){return x!==u;})));
  showToast('✅ Қабылданды: ' + (st.displayName||u), 'success'); refreshAll();
}

function adminReject(u) {
  var st = getStudentData(u); if (!st) return;
  st.status = 'rejected'; saveStudentData(u, st);
  var p = []; try{p=JSON.parse(localStorage.getItem('pending_students')||'[]');}catch(e){}
  localStorage.setItem('pending_students', JSON.stringify(p.filter(function(x){return x!==u;})));
  showToast('❌ Қабылданбады: ' + (st.displayName||u), 'warn'); refreshAll();
}

// ── TEACHERS ──────────────────────────────────
function loadTeachersList() {
  var teachers = TeacherAuth.getTeachers();
  var list = document.getElementById('teachers-list');
  if (!list) return;
  list.innerHTML = teachers.map(function(t) {
    var roleTag = t.role === 'admin'
      ? '<span style="background:rgba(124,58,237,.2);color:#c4b5fd;font-size:10px;padding:2px 8px;border-radius:8px;margin-left:4px">ADMIN</span>'
      : '';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">' +
      '<div><span style="font-weight:600">' + escHtml(t.displayName) + '</span>' + roleTag + '&nbsp;' +
      '<span style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">' + escHtml(t.username) + '</span></div>' +
      (t.role !== 'admin' ? '<button class="btn btn-sm btn-danger" onclick="deleteTeacher(\'' + t.id + '\')">🗑️</button>' : '') +
      '</div>';
  }).join('');
}

function addTeacher() {
  var name = document.getElementById('new-teacher-name').value.trim();
  var user = document.getElementById('new-teacher-user').value.trim();
  var pass = document.getElementById('new-teacher-pass').value.trim();
  if (!name || !user || !pass) { showToast('Барлық өрісті толтырыңыз', 'warn'); return; }
  var result = TeacherAuth.addTeacher(user, pass, name);
  if (!result) { showToast('Бұл логин тіркелген!', 'error'); return; }
  showToast('✅ Мұғалім қосылды: ' + name, 'success');
  document.getElementById('new-teacher-name').value = '';
  document.getElementById('new-teacher-user').value = '';
  document.getElementById('new-teacher-pass').value = '';
  loadTeachersList(); loadStats();
}

function deleteTeacher(id) {
  if (!confirm('Мұғалімді жою?')) return;
  TeacherAuth.deleteTeacher(id);
  showToast('Мұғалім жойылды', 'info');
  loadTeachersList();
}

// ── STUDENTS ──────────────────────────────────
function loadStudentsCredentials() {
  var students = getAllStudents();
  var list = document.getElementById('students-credentials');
  if (!list) return;
  list.innerHTML = students.map(function(s) {
    return '<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;margin-bottom:5px">' +
      '<span style="flex:1.2;font-weight:500;font-size:12px">' + escHtml(s.displayName || s.fullname || s.username) + '</span>' +
      '<input type="text" value="' + escHtml(s.username) + '" class="form-input" style="flex:1;font-size:11px;padding:5px 8px" onchange="updateStudentField(\'' + s.username + '\',\'username\',this.value)"/>' +
      '<input type="password" value="' + escHtml(s.password || '') + '" class="form-input" style="flex:1;font-size:11px;padding:5px 8px" onchange="updateStudentField(\'' + s.username + '\',\'password\',this.value)"/>' +
      '<div style="display:flex;gap:4px">' +
        '<button class="btn btn-sm btn-gold" title="Бит қосу/алу" onclick="manageBits(\'' + s.username + '\')">💎</button>' +
        '<button class="btn btn-sm btn-danger" onclick="deleteStudent(\'' + s.username + '\')">🗑️</button>' +
      '</div></div>';
  }).join('') || '<p style="color:var(--text3);text-align:center;padding:20px">Студент жоқ</p>';
}

function manageBits(username) {
  var st = getStudentData(username); if (!st) return;
  var val = prompt((st.displayName || username) + ' битті (ағымдағы: ' + (st.bits||0) + '). Жаңа сан енгізіңіз:');
  if (val === null) return;
  var bits = parseInt(val, 10);
  if (isNaN(bits) || bits < 0) { showToast('Дұрыс сан енгізіңіз', 'error'); return; }
  st.bits = bits;
  saveStudentData(username, st);
  showToast('💎 ' + (st.displayName||username) + ' биті: ' + bits, 'success');
  loadStudentsCredentials();
}

function updateStudentField(username, field, value) {
  var st = getStudentData(username); if (!st) return;
  st[field] = value.trim();
  saveStudentData(username, st);
  showToast('💾 Сақталды', 'success');
}

function addStudent() {
  var name = document.getElementById('new-student-name').value.trim();
  var user = document.getElementById('new-student-user').value.trim();
  var pass = document.getElementById('new-student-pass').value.trim();
  if (!name || !user || !pass) { showToast('Барлық өрісті толтырыңыз', 'warn'); return; }
  if (getStudentData(user)) { showToast('Бұл логин тіркелген!', 'error'); return; }
  var student = { username: user, fullname: name, displayName: name, password: pass, bits: 100, score: 0, solved: [], submissions: [], hints_used: {}, status: 'active', banned: false, ban_reason: '', registered_at: new Date().toISOString(), badges: [], warnings: 0, warnings_log: [] };
  saveStudentData(user, student);
  showToast('✅ Студент қосылды: ' + name, 'success');
  document.getElementById('new-student-name').value = '';
  document.getElementById('new-student-user').value = '';
  document.getElementById('new-student-pass').value = '';
  loadStudentsCredentials(); loadStudentsTable(); loadStats();
}

function deleteStudent(username) {
  if (!confirm(username + ' студентті жою?')) return;
  localStorage.removeItem('student_' + username);
  showToast('Студент жойылды', 'info');
  loadStudentsCredentials(); loadStudentsTable(); loadStats();
}

// ── STUDENTS TABLE ────────────────────────────
function loadStudentsTable() {
  var students = getAllStudents();
  var tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  if (!students.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text3);padding:30px">Студент жоқ</td></tr>';
    return;
  }

  tbody.innerHTML = students.map(function(s) {
    var warnCount = s.warnings || 0;
    var warnStyle = warnCount===0?'color:var(--accent)':warnCount<3?'color:var(--accent2)':'color:var(--error)';
    var banned = s.banned;
    var statusCell = banned ? '<span class="ban-badge">🚫 Бан</span>' : s.status==='pending' ? '<span style="color:var(--text3)">⏳</span>' : '<span class="ok-badge">✅</span>';
    var actionCell =
      (banned
        ? '<button class="btn btn-sm btn-secondary" onclick="adminUnban(\'' + s.username + '\')">🔓 Аша</button>'
        : '<button class="btn btn-sm btn-danger" onclick="adminBanDirect(\'' + s.username + '\')">🚫</button>') +
      ' <button class="btn btn-sm btn-gold" onclick="manageBits(\'' + s.username+ '\')">💎</button>';
    return '<tr>' +
      '<td><strong>' + escHtml(s.displayName || s.fullname || s.username) + '</strong></td>' +
      '<td style="font-family:var(--font-mono);font-size:11px;color:var(--text3)">' + escHtml(s.username) + '</td>' +
      '<td style="color:var(--accent2);font-weight:700">' + (s.score||0) + '</td>' +
      '<td>💎&nbsp;' + (s.bits||0) + '</td>' +
      '<td><span style="' + warnStyle + ';font-weight:700">' + warnCount + '/3</span></td>' +
      '<td>' + statusCell + '</td>' +
      '<td>' + actionCell + '</td>' +
      '</tr>';
  }).join('');
}

function adminUnban(u) {
  var st = getStudentData(u); if (!st) return;
  st.banned = false; st.ban_reason = ''; st.warnings = 0; st.warnings_log = [];
  saveStudentData(u, st); showToast('🔓 Бан алынды', 'success'); refreshAll();
}

function adminBanDirect(u) {
  var reason = prompt('Бан себебі:') || 'Әкімші бандады';
  var st = getStudentData(u); if (!st) return;
  st.banned = true; st.ban_reason = reason;
  saveStudentData(u, st); showToast('🚫 Студент бандалды', 'warn'); refreshAll();
}

// ── RESET ─────────────────────────────────────
function resetAllData() {
  if (!confirm('Барлық прогресс, жіберулер, бандар тазаланады! Студент тізімі сақталады. Жалғастыру?')) return;
  getAllStudents().forEach(function(s) {
    s.score = 0; s.solved = []; s.submissions = []; s.hints_used = {};
    s.bits = 100; s.warnings = 0; s.warnings_log = []; s.banned = false; s.ban_reason = '';
    saveStudentData(s.username, s);
  });
  // Clear timer data
  Object.keys(localStorage).forEach(function(k) {
    if (k.startsWith('task_timer_') || k.startsWith('code_') || k.startsWith('acmp_') || k.startsWith('messages_')) {
      localStorage.removeItem(k);
    }
  });
  showToast('✅ Деректер тазаланды!', 'success');
  refreshAll();
}

function exportData() {
  var data = { students: getAllStudents(), teachers: TeacherAuth.getTeachers(), exportedAt: new Date().toISOString() };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pycontest_data_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  showToast('📊 Деректер жүктелді!', 'success');
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

function getAllSubmissions() {
  var total = 0;
  getAllStudents().forEach(function(s){ total += (s.submissions || []).length; });
  return total;
}

function getStudentData(u) { try{return JSON.parse(localStorage.getItem('student_'+u))||null;}catch(e){return null;} }
function saveStudentData(u, d) { localStorage.setItem('student_'+u, JSON.stringify(d)); }

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function formatDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return d.toLocaleDateString('kk-KZ') + ' ' + d.toLocaleTimeString('kk-KZ', {hour:'2-digit',minute:'2-digit'});
}

function showToast(msg, type) {
  var icons = {success:'✅', error:'❌', warn:'⚠️', info:'ℹ️'};
  var c = document.getElementById('toast-container'); if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast toast-'+(type||'info');
  t.innerHTML = '<span class="toast-icon">'+(icons[type]||'')+'</span><span>'+msg+'</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>';
  c.appendChild(t);
  setTimeout(function(){ if(t.parentElement) t.remove(); }, 3500);
}

function toggleTheme() {
  var t = document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';
  if (t==='light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('pycontest_theme', t);
  var btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = t==='dark'?'🌙':'☀️';
}
