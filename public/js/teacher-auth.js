// teacher-auth.js — Teacher/Admin Auth Helper
window.TeacherAuth = {
  login: async (username, password) => {
    const data = await API.auth.login(username, password);
    if (!['teacher', 'admin'].includes(data.user.role)) {
      throw new Error('Бұл аккаунт мұғалімдерге арналмаған');
    }
    localStorage.setItem('lms_token', data.token);
    localStorage.setItem('lms_user',  JSON.stringify(data.user));
    localStorage.setItem('lms_role',  data.user.role);
    return data;
  },
  logout:     () => Auth.logout(),
  getCurrent: () => Auth.getCurrentUser(),
  require: () => {
    const user = Auth.getCurrentUser();
    const token = localStorage.getItem('lms_token');
    if (!token || !user || !['teacher', 'admin'].includes(user.role)) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }
};
