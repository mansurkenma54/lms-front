// api.js — Frontend API Client
const API_BASE = '/api';

async function request(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('lms_token');
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    },
    ...(body !== null ? { body: JSON.stringify(body) } : {})
  };
  try {
    const res = await fetch(API_BASE + '/' + endpoint, opts);
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || 'Сервер қатесі');
    return data;
  } catch (e) {
    if (e.message === 'Failed to fetch') throw new Error('Желі қатесі. Интернет байланысын тексеріңіз.');
    throw e;
  }
}

window.API = {
  auth: {
    login:          (u, p) => request('auth/login',           'POST', { username: u, password: p }),
    register:       (d)    => request('auth/register',        'POST', d),
    selfRegister:   (d)    => request('auth/self-register',   'POST', d),
    getPending:     ()     => request('auth/pending'),
    approveUser:    (id)   => request(`auth/approve/${id}`,   'POST'),
    rejectUser:     (id)   => request(`auth/reject/${id}`,    'POST'),
    logout:         ()     => request('auth/logout',          'POST'),
    me:             ()     => request('auth/me'),
    changePassword: (d)    => request('auth/change-password', 'POST', d),
    updateProfile:  (d)    => request('auth/profile',         'PUT',  d)
  },
  courses: {
    getAll:           ()          => request('courses'),
    getOne:           (id)        => request(`courses/${id}`),
    create:           (d)         => request('courses',                 'POST', d),
    update:           (id, d)     => request(`courses/${id}`,           'PUT',  d),
    remove:           (id)        => request(`courses/${id}`,           'DELETE'),
    getStudents:      (id)        => request(`courses/${id}/students`),
    enroll:           (cId, sId)  => request(`courses/${cId}/enroll`,   'POST', { studentId: sId }),
    unenroll:         (cId, sId)  => request(`courses/${cId}/enroll/${sId}`, 'DELETE'),
    getStudentCourses:(sId)       => request(`courses/student/${sId}`),
    join:             (code)      => request('courses/join',            'POST', { invite_code: code })
  },
  assignments: {
    getByCourse: (cId)    => request(`assignments?courseId=${cId}`),
    getByLesson: (lId)    => request(`assignments?lessonId=${lId}`),
    getOne:      (id)     => request(`assignments/${id}`),
    create:      (d)      => request('assignments',     'POST', d),
    update:      (id, d)  => request(`assignments/${id}`, 'PUT', d),
    remove:      (id)     => request(`assignments/${id}`, 'DELETE')
  },
  lessons: {
    getByCourse: (cId)    => request(`lessons?courseId=${cId}`),
    getOne:      (id)     => request(`lessons/${id}`),
    create:      (d)      => request('lessons', 'POST', d),
    update:      (id, d)  => request(`lessons/${id}`, 'PUT', d),
    remove:      (id)     => request(`lessons/${id}`, 'DELETE'),
    getMaterials:(id)     => request(`lessons/${id}/materials`),
    addMaterial: (id, d)  => request(`lessons/${id}/materials`, 'POST', d),
    removeMaterial:(mId)  => request(`lessons/materials/${mId}`, 'DELETE')
  },
  comments: {
    getByCourse: (cId)    => request(`comments?courseId=${cId}`),
    create:      (d)      => request('comments', 'POST', d),
    remove:      (id)     => request(`comments/${id}`, 'DELETE')
  },
  notifications: {
    getAll:      ()       => request('notifications'),
    create:      (d)      => request('notifications', 'POST', d),
    markRead:    (id)     => request(`notifications/${id}/read`, 'PUT')
  },
  submissions: {
    get:      (f)   => request('submissions?' + new URLSearchParams(f)),
    create:   (d)   => request('submissions', 'POST', d),
    getStats: (aId) => request(`submissions/stats?assignmentId=${aId}`),
    update:   (id, d) => request(`submissions/${id}`, 'PUT', d)
  },
  violations: {
    get:   (sId)         => request(`violations?studentId=${sId}`),
    log:   (d)           => request('violations',       'POST', d),
    ban:   (sId, reason) => request('violations/ban',   'POST', { studentId: sId, banReason: reason }),
    unban: (sId)         => request('violations/unban', 'POST', { studentId: sId })
  },
  messages: {
    get:      (toId) => request(`messages?toId=${toId}`),
    send:     (d)    => request('messages',      'POST', d),
    markRead: (id)   => request(`messages/${id}`, 'PUT')
  },
  bits: {
    get:          (sId)              => request(`bits?studentId=${sId}`),
    earn:         (d)                => request('bits/earn',  'POST', d),
    spend:        (d)                => request('bits/spend', 'POST', d),
    buyHint:      (d)                => request('bits/hint',  'POST', d),
    isHintBought: (sId, pId, hType) => request(`bits/hint?studentId=${sId}&problemId=${pId}&hintType=${hType}`)
  },
  leaderboard: {
    score: () => request('leaderboard/score'),
    bits:  () => request('leaderboard/bits'),
    speed: () => request('leaderboard/speed')
  },
  admin: {
    getStats:   ()      => request('admin/stats'),
    getUsers:   ()      => request('admin/users'),
    createUser: (d)     => request('admin/users',    'POST',   d),
    deleteUser: (id)    => request(`admin/users/${id}`, 'DELETE'),
    reset:      ()      => request('admin/reset',    'POST')
  },
  battles: {
    getAll:   ()        => request('battles'),
    getOne:   (id)      => request(`battles/${id}`),
    create:   (d)       => request('battles',              'POST', d),
    join:     (id)      => request(`battles/${id}/join`,   'POST'),
    accept:   (id)      => request(`battles/${id}/accept`, 'POST'),
    submit:   (id, d)   => request(`battles/${id}/submit`, 'POST', d),
    timeout:  (id)      => request(`battles/${id}/timeout`,'POST'),
    cancel:   (id)      => request(`battles/${id}`,        'DELETE')
  },
  guests: {
    getLeaderboard: ()      => request('guests/leaderboard'),
    saveScore:      (n, p)  => request('guests/score', 'POST', { guest_name: n, points: p })
  }
};
