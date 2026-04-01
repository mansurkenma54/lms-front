// bits.js — Bits System Frontend
window.BitsSystem = {
  _balance: null,

  async getBalance(studentId) {
    try {
      const user = Auth.getCurrentUser();
      const id = studentId || (user ? user.id : null);
      if (!id) return 0;
      const data = await API.bits.get(id);
      this._balance = data.balance;
      return data.balance;
    } catch { return 0; }
  },

  async earn(amount, reason, studentId) {
    try {
      const user = Auth.getCurrentUser();
      const id = studentId || (user ? user.id : null);
      if (!id) return null;
      const data = await API.bits.earn({ studentId: id, amount, reason: reason || 'Тапсырма орындалды' });
      this._balance = data.new_balance;
      this._updateBadge(data.new_balance);
      return data.new_balance;
    } catch (e) {
      console.error('Earn bits error:', e);
      return null;
    }
  },

  async spend(amount, reason, studentId) {
    try {
      const user = Auth.getCurrentUser();
      const id = studentId || (user ? user.id : null);
      if (!id) return null;
      const data = await API.bits.spend({ studentId: id, amount, reason: reason || 'Шығын' });
      this._balance = data.new_balance;
      this._updateBadge(data.new_balance);
      return data.new_balance;
    } catch (e) {
      console.error('Spend bits error:', e);
      throw e;
    }
  },

  async buyHint(problemId, hintType, studentId) {
    try {
      const user = Auth.getCurrentUser();
      const id = studentId || (user ? user.id : null);
      if (!id) throw new Error('Кіру қажет');
      const data = await API.bits.buyHint({ studentId: id, problemId, hintType });
      if (data.new_balance !== undefined) {
        this._balance = data.new_balance;
        this._updateBadge(data.new_balance);
      }
      return data;
    } catch (e) {
      console.error('Buy hint error:', e);
      throw e;
    }
  },

  async isHintBought(problemId, hintType, studentId) {
    try {
      const user = Auth.getCurrentUser();
      const id = studentId || (user ? user.id : null);
      if (!id) return false;
      const data = await API.bits.isHintBought(id, problemId, hintType);
      return data.bought || data.already_bought || false;
    } catch { return false; }
  },

  _updateBadge(balance) {
    const badges = document.querySelectorAll('.bits-balance-display, .bits-badge-val');
    badges.forEach(b => { b.textContent = balance; });
  },

  async initBadge() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const balance = await this.getBalance(user.id);
    this._updateBadge(balance);
  }
};
