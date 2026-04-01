// LEADERBOARD.JS — Рейтинг логикасы

var refreshTimer = null;

function initLeaderboard() {
  renderLeaderboard();
  // Автоматты жаңарту: 10 секунд сайын
  refreshTimer = setInterval(renderLeaderboard, 10000);
  updateRefreshTimer();
}

function updateRefreshTimer() {
  var count = 10;
  var timerEl = document.getElementById('refresh-timer');
  clearInterval(window._countInterval);
  window._countInterval = setInterval(function() {
    count--;
    if (timerEl) timerEl.textContent = count;
    if (count <= 0) {
      count = 10;
    }
  }, 1000);
}

function getAllStudents() {
  var students = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('student_')) {
      try {
        var data = JSON.parse(localStorage.getItem(key));
        if (data && data.name) {
          students.push(data);
        }
      } catch(e) {}
    }
  }
  return students.sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return (b.solved ? b.solved.length : 0) - (a.solved ? a.solved.length : 0);
  });
}

function renderLeaderboard() {
  var students = getAllStudents();
  var current = sessionStorage.getItem('current_student');

  // Podium
  var podiumHtml = '';
  var podiumData = [students[1], students[0], students[2]];
  var positions = ['2', '1', '3'];
  var orders = [1, 2, 3];
  var medals = ['🥈', '🥇', '🥉'];
  var heights = ['140px', '180px', '110px'];

  for (var pi = 0; pi < 3; pi++) {
    var s = podiumData[pi];
    var pos = positions[pi];
    var medal = medals[pi];
    var height = heights[pi];
    if (s) {
      podiumHtml += '<div class="podium-item podium-' + pos + '">';
      podiumHtml += '<div class="podium-card" style="padding-top:' + height + '">';
      podiumHtml += '<div class="podium-rank">' + medal + '</div>';
      podiumHtml += '<div class="podium-name">' + escHtml(s.name) + '</div>';
      podiumHtml += '<div class="podium-score">⭐ ' + s.score + ' бал</div>';
      podiumHtml += '<div class="podium-solved">' + (s.solved ? s.solved.length : 0) + ' есеп</div>';
      podiumHtml += '</div></div>';
    } else {
      podiumHtml += '<div class="podium-item podium-' + pos + '"><div class="podium-card" style="padding-top:' + height + '"><div class="podium-rank" style="opacity:0.2">' + medal + '</div><div class="podium-name" style="color:var(--text3)">—</div></div></div>';
    }
  }

  var podiumEl = document.getElementById('podium');
  if (podiumEl) podiumEl.innerHTML = podiumHtml;

  // Table
  var tableBody = document.getElementById('leaderboard-body');
  if (!tableBody) return;

  if (students.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:40px">Студенттер жоқ</td></tr>';
    return;
  }

  var html = '';
  students.forEach(function(s, idx) {
    var rank = idx + 1;
    var isMine = s.name === current;
    var rankIcon = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : rank + '.'));
    html += '<tr class="' + (isMine ? 'my-row' : '') + '">';
    html += '<td><span style="font-family:JetBrains Mono,monospace;font-weight:700">' + rankIcon + '</span></td>';
    html += '<td><strong>' + escHtml(s.name) + '</strong>' + (isMine ? ' <span style="color:var(--accent);font-size:10px;margin-left:4px">(Сіз)</span>' : '') + '</td>';
    html += '<td style="font-family:JetBrains Mono,monospace;color:var(--accent2)">' + (s.solved ? s.solved.length : 0) + '</td>';
    html += '<td style="font-family:JetBrains Mono,monospace;color:var(--warn);font-weight:700">' + s.score + '</td>';
    html += '<td style="font-family:JetBrains Mono,monospace;color:var(--accent)">' + s.bits + ' 💎</td>';
    html += '</tr>';
  });
  tableBody.innerHTML = html;

  document.getElementById('student-count').textContent = students.length;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

document.addEventListener('DOMContentLoaded', initLeaderboard);
