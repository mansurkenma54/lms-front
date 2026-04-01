// ═══════════════════════════════════════════════
//  data.js — LMS Деректер қоймасы (localStorage)
// ═══════════════════════════════════════════════
(function (window) {
  'use strict';

  // ─── DEFAULTS ───────────────────────────────
  var DEFAULT_STUDENTS = [
    { id: 's1', username: 'student1', password: '12345', role: 'student', displayName: 'Айгерім' },
    { id: 's2', username: 'student2', password: '12345', role: 'student', displayName: 'Берік' },
    { id: 's3', username: 'student3', password: '12345', role: 'student', displayName: 'Дана' },
    { id: 's4', username: 'student4', password: '12345', role: 'student', displayName: 'Ерлан' },
    { id: 's5', username: 'student5', password: '12345', role: 'student', displayName: 'Жанар' }
  ];

  // ─── BOOTSTRAP ──────────────────────────────
  function bootstrap() {
    if (!localStorage.getItem('lms_students')) {
      localStorage.setItem('lms_students', JSON.stringify(DEFAULT_STUDENTS));
    }
    if (!localStorage.getItem('lms_courses')) {
      localStorage.setItem('lms_courses', JSON.stringify([]));
    }
    if (!localStorage.getItem('lms_assignments')) {
      localStorage.setItem('lms_assignments', JSON.stringify([]));
    }
    if (!localStorage.getItem('lms_submissions')) {
      localStorage.setItem('lms_submissions', JSON.stringify([]));
    }
    if (!localStorage.getItem('lms_violations')) {
      localStorage.setItem('lms_violations', JSON.stringify([]));
    }
    if (!localStorage.getItem('lms_warnings')) {
      localStorage.setItem('lms_warnings', JSON.stringify({}));
    }
    if (!localStorage.getItem('lms_bans')) {
      localStorage.setItem('lms_bans', JSON.stringify({}));
    }
    if (!localStorage.getItem('lms_bits')) {
      localStorage.setItem('lms_bits', JSON.stringify({}));
    }
    if (!localStorage.getItem('lms_hints')) {
      localStorage.setItem('lms_hints', JSON.stringify({}));
    }
    if (!localStorage.getItem('lms_streak')) {
      localStorage.setItem('lms_streak', JSON.stringify({}));
    }
  }

  // ─── HELPERS ────────────────────────────────
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch (e) { return []; }
  }

  function loadObj(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch (e) { return {}; }
  }

  function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  // ─── STUDENTS ───────────────────────────────
  function getStudents() { return load('lms_students'); }

  function saveStudents(list) { save('lms_students', list); }

  function getStudent(username) {
    return getStudents().find(function (s) { return s.username === username; }) || null;
  }

  function getStudentById(id) {
    return getStudents().find(function (s) { return s.id === id; }) || null;
  }

  function addStudent(username, password, displayName) {
    var students = getStudents();
    if (students.find(function (s) { return s.username === username; })) return null;
    var s = { id: genId(), username: username, password: password, role: 'student', displayName: displayName || username };
    students.push(s);
    saveStudents(students);
    return s;
  }

  function updateStudent(id, updates) {
    var students = getStudents();
    for (var i = 0; i < students.length; i++) {
      if (students[i].id === id) {
        Object.assign(students[i], updates);
        break;
      }
    }
    saveStudents(students);
  }

  function deleteStudent(id) {
    var students = getStudents().filter(function (s) { return s.id !== id; });
    saveStudents(students);
    var courses = getCourses();
    courses.forEach(function (c) {
      c.enrolledStudents = (c.enrolledStudents || []).filter(function (sid) { return sid !== id; });
    });
    save('lms_courses', courses);
  }

  // ─── COURSES ────────────────────────────────
  function getCourses() { return load('lms_courses'); }

  function getCoursesByTeacher(teacherId) {
    return getCourses().filter(function (c) { return c.teacherId === teacherId; });
  }

  function getCourse(id) {
    return getCourses().find(function (c) { return c.id === id; }) || null;
  }

  function saveCourse(course) {
    var courses = getCourses();
    var idx = courses.findIndex(function (c) { return c.id === course.id; });
    if (idx >= 0) {
      courses[idx] = course;
    } else {
      if (!course.id) course.id = genId();
      if (!course.createdAt) course.createdAt = new Date().toISOString();
      if (!course.enrolledStudents) course.enrolledStudents = [];
      courses.push(course);
    }
    save('lms_courses', courses);
    return course;
  }

  function deleteCourse(id) {
    save('lms_courses', getCourses().filter(function (c) { return c.id !== id; }));
    save('lms_assignments', getAssignments().filter(function (a) { return a.courseId !== id; }));
  }

  function enrollStudent(courseId, studentId) {
    var courses = getCourses();
    var c = courses.find(function (x) { return x.id === courseId; });
    if (!c) return false;
    if (!c.enrolledStudents) c.enrolledStudents = [];
    if (c.enrolledStudents.indexOf(studentId) === -1) {
      c.enrolledStudents.push(studentId);
    }
    save('lms_courses', courses);
    return true;
  }

  function unenrollStudent(courseId, studentId) {
    var courses = getCourses();
    var c = courses.find(function (x) { return x.id === courseId; });
    if (!c) return false;
    c.enrolledStudents = (c.enrolledStudents || []).filter(function (id) { return id !== studentId; });
    save('lms_courses', courses);
    return true;
  }

  function getStudentCourses(studentId) {
    return getCourses().filter(function (c) {
      return (c.enrolledStudents || []).indexOf(studentId) !== -1;
    });
  }

  // ─── ASSIGNMENTS ─────────────────────────────
  function getAssignments(courseId) {
    var all = load('lms_assignments');
    if (courseId) return all.filter(function (a) { return a.courseId === courseId; });
    return all;
  }

  function getAssignment(id) {
    return load('lms_assignments').find(function (a) { return a.id === id; }) || null;
  }

  function saveAssignment(assignment) {
    var all = load('lms_assignments');
    var idx = all.findIndex(function (a) { return a.id === assignment.id; });
    if (idx >= 0) {
      all[idx] = assignment;
    } else {
      if (!assignment.id) assignment.id = genId();
      if (!assignment.createdAt) assignment.createdAt = new Date().toISOString();
      all.push(assignment);
    }
    save('lms_assignments', all);
    return assignment;
  }

  function deleteAssignment(id) {
    save('lms_assignments', load('lms_assignments').filter(function (a) { return a.id !== id; }));
    save('lms_submissions', load('lms_submissions').filter(function (s) { return s.assignmentId !== id; }));
  }

  // ─── SUBMISSIONS ─────────────────────────────
  function getSubmissions(filter) {
    var all = load('lms_submissions');
    if (!filter) return all;
    return all.filter(function (s) {
      if (filter.studentId && s.studentId !== filter.studentId) return false;
      if (filter.assignmentId && s.assignmentId !== filter.assignmentId) return false;
      if (filter.courseId && s.courseId !== filter.courseId) return false;
      return true;
    });
  }

  function saveSubmission(sub) {
    var all = load('lms_submissions');
    if (!sub.id) sub.id = genId();
    if (!sub.submittedAt) sub.submittedAt = new Date().toISOString();
    all.push(sub);
    save('lms_submissions', all);
    return sub;
  }

  // ─── VIOLATIONS ──────────────────────────────
  function getViolations(studentId) {
    var all = load('lms_violations');
    if (studentId) return all.filter(function (v) { return v.studentId === studentId; });
    return all;
  }

  function logViolation(studentId, assignmentId, type) {
    var all = load('lms_violations');
    var existing = all.find(function (v) {
      return v.studentId === studentId && v.assignmentId === assignmentId && v.type === type;
    });
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.timestamps.push(new Date().toISOString());
    } else {
      all.push({
        id: genId(),
        studentId: studentId,
        assignmentId: assignmentId,
        type: type,
        count: 1,
        timestamps: [new Date().toISOString()]
      });
    }
    save('lms_violations', all);
  }

  // ─── WARNINGS / BANS ─────────────────────────
  function getWarnings(studentId) {
    var obj = loadObj('lms_warnings');
    return obj[studentId] || { count: 0, reasons: [] };
  }

  function addWarning(studentId, reason) {
    var obj = loadObj('lms_warnings');
    if (!obj[studentId]) obj[studentId] = { count: 0, reasons: [] };
    obj[studentId].count++;
    obj[studentId].reasons.push({ reason: reason, time: new Date().toISOString() });
    save('lms_warnings', obj);
    return obj[studentId].count;
  }

  function resetWarnings(studentId) {
    var obj = loadObj('lms_warnings');
    obj[studentId] = { count: 0, reasons: [] };
    save('lms_warnings', obj);
  }

  function getBanInfo(studentId) {
    var obj = loadObj('lms_bans');
    return obj[studentId] || null;
  }

  function banStudent(studentId, reason) {
    var obj = loadObj('lms_bans');
    obj[studentId] = {
      banned: true,
      reason: reason || 'Ережені бұзды',
      bannedAt: new Date().toISOString()
    };
    save('lms_bans', obj);
  }

  function unbanStudent(studentId) {
    var obj = loadObj('lms_bans');
    delete obj[studentId];
    save('lms_bans', obj);
    resetWarnings(studentId);
  }

  function isStudentBanned(studentId) {
    var ban = getBanInfo(studentId);
    return ban && ban.banned === true;
  }

  // ─── BITS ─────────────────────────────────────────
  var BITS_KEY = 'lms_bits';
  var HINTS_KEY = 'lms_hints';
  var STREAK_KEY = 'lms_streak';
  var STARTING_BITS = 100;

  function getBitsBalance(studentId) {
    var obj; try { obj = JSON.parse(localStorage.getItem(BITS_KEY)) || {}; } catch(e) { obj = {}; }
    if (!obj[studentId]) return STARTING_BITS;
    return typeof obj[studentId].balance === 'number' ? obj[studentId].balance : STARTING_BITS;
  }

  function addBits(studentId, amount, reason) {
    var obj; try { obj = JSON.parse(localStorage.getItem(BITS_KEY)) || {}; } catch(e) { obj = {}; }
    if (!obj[studentId]) obj[studentId] = { balance: STARTING_BITS, history: [] };
    var cur = typeof obj[studentId].balance === 'number' ? obj[studentId].balance : STARTING_BITS;
    obj[studentId].balance = cur + amount;
    if (!obj[studentId].history) obj[studentId].history = [];
    obj[studentId].history.push({ amount: amount, reason: reason || '', time: new Date().toISOString(), balance: obj[studentId].balance });
    localStorage.setItem(BITS_KEY, JSON.stringify(obj));
    return obj[studentId].balance;
  }

  function spendBits(studentId, amount, reason) {
    var obj; try { obj = JSON.parse(localStorage.getItem(BITS_KEY)) || {}; } catch(e) { obj = {}; }
    if (!obj[studentId]) obj[studentId] = { balance: STARTING_BITS, history: [] };
    var bal = typeof obj[studentId].balance === 'number' ? obj[studentId].balance : STARTING_BITS;
    if (bal < amount) return false;
    obj[studentId].balance = bal - amount;
    if (!obj[studentId].history) obj[studentId].history = [];
    obj[studentId].history.push({ amount: -amount, reason: reason || '', time: new Date().toISOString(), balance: obj[studentId].balance });
    localStorage.setItem(BITS_KEY, JSON.stringify(obj));
    return true;
  }

  function getBitsHistory(studentId) {
    var obj; try { obj = JSON.parse(localStorage.getItem(BITS_KEY)) || {}; } catch(e) { obj = {}; }
    return (obj[studentId] && obj[studentId].history) ? obj[studentId].history : [];
  }

  // ─── HINT TRACKING ────────────────────────────────
  function isHintBought(studentId, contextId, hintType) {
    var obj; try { obj = JSON.parse(localStorage.getItem(HINTS_KEY)) || {}; } catch(e) { obj = {}; }
    return !!obj[studentId + '_' + contextId + '_' + hintType];
  }

  function markHintBought(studentId, contextId, hintType) {
    var obj; try { obj = JSON.parse(localStorage.getItem(HINTS_KEY)) || {}; } catch(e) { obj = {}; }
    obj[studentId + '_' + contextId + '_' + hintType] = { boughtAt: new Date().toISOString() };
    localStorage.setItem(HINTS_KEY, JSON.stringify(obj));
  }

  // ─── STREAK TRACKING ──────────────────────────────
  function checkAndUpdateStreak(studentId) {
    var obj; try { obj = JSON.parse(localStorage.getItem(STREAK_KEY)) || {}; } catch(e) { obj = {}; }
    var today = new Date().toISOString().slice(0, 10);
    if (!obj[studentId]) obj[studentId] = { lastDate: null, streak: 0 };
    var info = obj[studentId];
    if (info.lastDate === today) { localStorage.setItem(STREAK_KEY, JSON.stringify(obj)); return { earned: 0, streak: info.streak }; }
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    info.streak = (info.lastDate === yesterday) ? (info.streak || 0) + 1 : 1;
    info.lastDate = today;
    obj[studentId] = info;
    localStorage.setItem(STREAK_KEY, JSON.stringify(obj));
    addBits(studentId, 5, 'Күнделікті кіру +5 бит');
    return { earned: 5, streak: info.streak };
  }

  // ─── PASTE TRACKING ──────────────────────────
  function getPasteCount(studentId, assignmentId) {
    var key = 'lms_paste_' + studentId + '_' + assignmentId;
    return parseInt(localStorage.getItem(key) || '0', 10);
  }

  function incrementPasteCount(studentId, assignmentId) {
    var key = 'lms_paste_' + studentId + '_' + assignmentId;
    var count = getPasteCount(studentId, assignmentId) + 1;
    localStorage.setItem(key, String(count));
    return count;
  }

  function resetPasteCount(studentId, assignmentId) {
    var key = 'lms_paste_' + studentId + '_' + assignmentId;
    localStorage.removeItem(key);
  }

  // ─── PUBLIC API ──────────────────────────────
  bootstrap();

  // ─── ASSIGN 3 NEW PROBLEMS TO A LIVE COURSE ──
  (function() {
    var cList = load('lms_courses');
    if (!cList.find(function(c) { return c.id === 'c_special_acmp'; })) {
      cList.push({
        id: 'c_special_acmp',
        teacherId: 'admin',
        title: 'ACMP Жаңа есептер курсы',
        description: 'Лестница (514) және басқа жаңа 3 есеп',
        code: 'ACMP3',
        createdAt: new Date().toISOString(),
        enrolledStudents: load('lms_students').map(function(s) { return s.id; })
      });
      save('lms_courses', cList);
    }
    var aList = load('lms_assignments');
    if (!aList.find(function(a) { return a.id === 'a_special_acmp'; })) {
      aList.push({
        id: 'a_special_acmp', courseId: 'c_special_acmp',
        title: '3 жаңа есеп (Дедлайн жоқ, Уақыт шектеуі 1 сағат)',
        description: 'Осы үш есептің әрқайсысын 1 сағат ішінде шығару керек.',
        problems: [514, 21, 25],
        deadline: '', timeLimit: 60, createdAt: new Date().toISOString()
      });
      save('lms_assignments', aList);
    }
  })();

  window.LMSData = {
    genId: genId,
    // Students
    getStudents: getStudents,
    getStudent: getStudent,
    getStudentById: getStudentById,
    addStudent: addStudent,
    updateStudent: updateStudent,
    deleteStudent: deleteStudent,
    // Courses
    getCourses: getCourses,
    getCourse: getCourse,
    getCoursesByTeacher: getCoursesByTeacher,
    saveCourse: saveCourse,
    deleteCourse: deleteCourse,
    enrollStudent: enrollStudent,
    unenrollStudent: unenrollStudent,
    getStudentCourses: getStudentCourses,
    // Assignments
    getAssignments: getAssignments,
    getAssignment: getAssignment,
    saveAssignment: saveAssignment,
    deleteAssignment: deleteAssignment,
    // Submissions
    getSubmissions: getSubmissions,
    saveSubmission: saveSubmission,
    // Violations
    getViolations: getViolations,
    logViolation: logViolation,
    // Warnings / Bans
    getWarnings: getWarnings,
    addWarning: addWarning,
    resetWarnings: resetWarnings,
    getBanInfo: getBanInfo,
    banStudent: banStudent,
    unbanStudent: unbanStudent,
    isStudentBanned: isStudentBanned,
    // Paste
    getPasteCount: getPasteCount,
    incrementPasteCount: incrementPasteCount,
    resetPasteCount: resetPasteCount,
    // Bits
    getBitsBalance: getBitsBalance,
    addBits: addBits,
    spendBits: spendBits,
    getBitsHistory: getBitsHistory,
    // Hints
    isHintBought: isHintBought,
    markHintBought: markHintBought,
    // Streak
    checkAndUpdateStreak: checkAndUpdateStreak
  };

})(window);
