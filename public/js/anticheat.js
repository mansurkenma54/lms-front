// anticheat.js — Anti-Cheat System
window.AnticheatSystem = {
  _active: false,
  _studentId: null,
  _assignmentId: null,
  _warningCount: 0,
  _maxWarnings: 3,
  _handlers: {},
  _lastWarnTime: 0,

  async init(studentId, assignmentId) {
    this._studentId = studentId;
    this._assignmentId = assignmentId;
    this._active = true;
    this._warningCount = 0;
    this._attachListeners();
    this._renderStatusBar();
  },

  stop() {
    this._active = false;
    this._detachListeners();
    const bar = document.getElementById('ac-status-bar');
    if (bar) bar.remove();
  },

  _renderStatusBar() {
    let bar = document.getElementById('ac-status-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'ac-status-bar';
      bar.className = 'ac-status-bar';
      document.body.prepend(bar);
    }
    this._updateStatusBar();
  },

  _updateStatusBar() {
    const bar = document.getElementById('ac-status-bar');
    if (!bar) return;
    const dots = Array.from({ length: this._maxWarnings }, (_, i) =>
      `<span class="ac-dot ${i < this._warningCount ? 'filled' : ''}"></span>`
    ).join('');
    bar.innerHTML = `🛡️ АнтиКопи белсенді &nbsp;|&nbsp; Ескертулер: ${dots}`;
  },

  _attachListeners() {
    // Blur / Window loss of focus
    this._handlers.blur = () => {
      if (!this._active) return;
      this._warn('Басқа терезеге немесе бағдарламаға ауысуға болмайды', 'window_blur');
    };
    window.addEventListener('blur', this._handlers.blur);

    // Tab/window visibility change
    this._handlers.visibility = () => {
      if (!this._active) return;
      if (document.hidden) {
        this._warn('Басқа қойындыға (вкладка) ауысуға тыйым салынған', 'tab_switch');
      }
    };
    document.addEventListener('visibilitychange', this._handlers.visibility);

    // Block Paste entirely
    this._handlers.paste = (e) => {
      if (!this._active) return;
      e.preventDefault();
      this._warn('Код қоюға (Paste) тыйым салынған', 'paste_blocked');
    };
    document.addEventListener('paste', this._handlers.paste);

    // Block Copy entirely
    this._handlers.copy = (e) => {
      if (!this._active) return;
      e.preventDefault();
      this._warn('Көшіруге (Copy) тыйым салынған', 'copy_blocked');
    };
    document.addEventListener('copy', this._handlers.copy);

    // Block Cut entirely
    this._handlers.cut = (e) => {
      if (!this._active) return;
      e.preventDefault();
    };
    document.addEventListener('cut', this._handlers.cut);

    // Right-click
    this._handlers.contextmenu = (e) => {
      if (this._active) {
        e.preventDefault();
        this._warn('Тышқанның оң батырмасы бұғатталған', 'right_click');
      }
    };
    document.addEventListener('contextmenu', this._handlers.contextmenu);

    // F12 / DevTools / Ctrl+V
    this._handlers.keydown = (e) => {
      if (!this._active) return;
      
      // Бұғаттау: Ctrl+V, Cmd+V, Ctrl+C, Cmd+C, Ctrl+X, Cmd+X
      const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && ['v', 'V', 'c', 'C', 'x', 'X', 'u', 'U'].includes(e.key)) {
        e.preventDefault();
        this._warn('Пернетақта арқылы көшіруге/қоюға тыйым салынған', 'keyboard_shortcut_blocked');
        return;
      }
      
      if (e.key === 'F12' ||
          (cmdOrCtrl && e.shiftKey && ['I','i','J','j','C','c'].includes(e.key))) {
        e.preventDefault();
        this._warn('Кодты тексеру құралдарын (DevTools) ашуға болмайды', 'devtools_open');
      }
    };
    document.addEventListener('keydown', this._handlers.keydown);
  },

  _detachListeners() {
    if (this._handlers.blur)       window.removeEventListener('blur',              this._handlers.blur);
    if (this._handlers.visibility) document.removeEventListener('visibilitychange', this._handlers.visibility);
    if (this._handlers.paste)      document.removeEventListener('paste',           this._handlers.paste);
    if (this._handlers.copy)       document.removeEventListener('copy',            this._handlers.copy);
    if (this._handlers.cut)        document.removeEventListener('cut',             this._handlers.cut);
    if (this._handlers.contextmenu)document.removeEventListener('contextmenu',     this._handlers.contextmenu);
    if (this._handlers.keydown)    document.removeEventListener('keydown',         this._handlers.keydown);
  },

  async _warn(message, type) {
    if (Date.now() - this._lastWarnTime < 2000) return; // Prevention for double events (blur then hide)
    this._lastWarnTime = Date.now();

    this._warningCount++;
    this._updateStatusBar();
    this._showWarningOverlay(message);

    // Log to server
    if (this._studentId) {
      try {
        const result = await API.violations.log({
          student_id:     this._studentId,
          assignment_id:  this._assignmentId || null,
          violation_type: `${type}: ${message}`
        });
        
        // Ensure manual stop if warning is 3 or more, or if server said banned
        if (result.auto_banned || this._warningCount >= this._maxWarnings) {
          this.stop();
          Auth.showBannedScreen('Автоматты бан: 3 ескерту алдыңыз (Ереже бұзу)');
        }
      } catch (e) {
        console.error('Violation log error:', e);
      }
    }

    if (this._warningCount >= this._maxWarnings) {
      this.stop();
      Auth.showBannedScreen('Автоматты бан: 3 ескерту алдыңыз (Ереже бұзу)');
    }
  },

  _showWarningOverlay(message) {
    // Remove existing
    const existing = document.getElementById('ac-warning-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ac-warning-overlay';
    overlay.className = 'ac-warning-overlay';
    overlay.innerHTML = `
      <div class="ac-warning-box">
        <div class="ac-warning-icon">⚠️</div>
        <div class="ac-warning-title">ЕСКЕРТУ!</div>
        <p style="color:#ccc;margin:8px 0 16px;font-size:14px">${message}</p>
        <div style="margin:12px 0">
          ${Array.from({ length: this._maxWarnings }, (_, i) =>
            `<span class="ac-dot ${i < this._warningCount ? 'filled' : ''}"></span>`
          ).join('')}
        </div>
        <p style="color:#aaa;font-size:13px;margin-bottom:20px">
          ${this._warningCount}/${this._maxWarnings} ескерту
          ${this._warningCount >= this._maxWarnings ? ' — БАНДАЛДЫҢЫЗ' : ''}
        </p>
        <button onclick="document.getElementById('ac-warning-overlay').remove()"
          style="padding:10px 24px;background:transparent;border:1px solid #ffc800;
                 color:#ffc800;border-radius:8px;cursor:pointer;font-family:inherit">
          Түсіндім
        </button>
      </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 5000);
  }
};
