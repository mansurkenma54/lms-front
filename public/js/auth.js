// auth.js — Frontend Auth Helpers
window.Auth = {
  login: async (username, password) => {
    const data = await API.auth.login(username, password).catch(e => {
      // Re-check if server returned 403 with PENDING
      if (e.message && (e.message.includes('бекітілмеген') || e.message === 'PENDING')) {
        const err = new Error('PENDING');
        err.pending = true;
        throw err;
      }
      throw e;
    });
    localStorage.setItem('lms_token', data.token);
    localStorage.setItem('lms_user',  JSON.stringify(data.user));
    localStorage.setItem('lms_role',  data.user.role);
    return data;
  },

  logout: async () => {
    try { await API.auth.logout(); } catch {}
    localStorage.removeItem('lms_token');
    localStorage.removeItem('lms_user');
    localStorage.removeItem('lms_role');
    window.location.href = 'index.html';
  },

  getCurrentUser: () => {
    try { return JSON.parse(localStorage.getItem('lms_user')); } catch { return null; }
  },

  getToken: () => localStorage.getItem('lms_token'),

  isLoggedIn: () => !!localStorage.getItem('lms_token'),

  requireAuth: (role) => {
    const token = localStorage.getItem('lms_token');
    const user  = Auth.getCurrentUser();
    if (!token || !user) {
      window.location.href = 'index.html';
      return null;
    }
    // Admin can access every page
    if (role && user.role !== role && user.role !== 'admin') {
      window.location.href = 'index.html';
      return null;
    }
    if (user.banned) {
      Auth.showBannedScreen(user.ban_reason);
      return null;
    }
    return user;
  },

  showBannedScreen: (reason) => {
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;background:#0a0005;display:flex;align-items:center;
                  justify-content:center;z-index:99999;font-family:'JetBrains Mono',monospace">
        <div style="text-align:center;color:#ff3c3c;padding:40px">
          <div style="font-size:80px;margin-bottom:16px">🚫</div>
          <h1 style="font-size:32px;margin:0 0 16px">АККАУНТ БАНДАЛДЫ</h1>
          <p style="color:#aaa;max-width:420px;line-height:1.6">
            ${reason || 'Мұғалімге хабарласыңыз'}
          </p>
          <button onclick="Auth.logout()"
            style="margin-top:24px;padding:12px 28px;background:transparent;
                   border:1px solid #ff3c3c;color:#ff3c3c;border-radius:8px;
                   cursor:pointer;font-family:inherit;font-size:14px">
            Шығу
          </button>
        </div>
      </div>`;
  },

  requireStudent: () => Auth.requireAuth('student'),
  requireTeacher: () => Auth.requireAuth('teacher'),
  requireAdmin:   () => Auth.requireAuth('admin'),

  // Redirect based on role after login
  redirectByRole: (role) => {
    if (role === 'admin')   window.location.href = 'admin.html';
    else if (role === 'teacher') window.location.href = 'teacher-dashboard.html';
    else window.location.href = 'student-dashboard.html';
  }
};
