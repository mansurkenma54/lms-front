// settings.js — Theme, Font Size, Font Family persistence
window.Settings = (function() {
  var DEFAULTS = { theme: 'dark', fontSize: 'medium', font: 'jetbrains' };

  var FONT_URLS = {
    jetbrains: '',  // already loaded
    inter:     'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
    roboto:    'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;600;700&display=swap'
  };

  var FONT_FAMILIES = {
    jetbrains: "'JetBrains Mono', monospace",
    inter:     "'Inter', 'Segoe UI', sans-serif",
    roboto:    "'Roboto Mono', monospace"
  };

  var FONT_SIZES = { small: '13px', medium: '15px', large: '17px' };

  function get(key) {
    return localStorage.getItem('pygame_' + key) || DEFAULTS[key];
  }
  function set(key, val) {
    localStorage.setItem('pygame_' + key, val);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    set('theme', theme);
    var cb = document.getElementById('theme-toggle-switch');
    if (cb) {
      cb.checked = (theme === 'light');
    }
  }

  function applyFontSize(size) {
    document.documentElement.setAttribute('data-font-size', size);
    set('fontSize', size);
  }

  function applyFont(fontKey) {
    set('font', fontKey);
    // Load font if needed
    if (fontKey !== 'jetbrains' && FONT_URLS[fontKey]) {
      var existing = document.querySelector('[data-font-link="' + fontKey + '"]');
      if (!existing) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONT_URLS[fontKey];
        link.setAttribute('data-font-link', fontKey);
        document.head.appendChild(link);
      }
    }
    document.documentElement.style.setProperty('--font-family', FONT_FAMILIES[fontKey] || FONT_FAMILIES.jetbrains);
    var sel = document.getElementById('font-select');
    if (sel) sel.value = fontKey;
  }

  function toggleTheme() {
    applyTheme(get('theme') === 'dark' ? 'light' : 'dark');
  }

  function init() {
    applyTheme(get('theme'));
    applyFontSize(get('fontSize'));
    applyFont(get('font'));

    // bind controls if they exist
    var themeCb = document.getElementById('theme-toggle-switch');
    if (themeCb) themeCb.onchange = toggleTheme;

    // legacy fallback
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.onclick = toggleTheme;

    var fontSel = document.getElementById('font-select');
    if (fontSel) {
      fontSel.value = get('font');
      fontSel.onchange = function() { applyFont(this.value); };
    }

    var fsUp = document.getElementById('font-size-up');
    if (fsUp) fsUp.onclick = function() {
      var cur = get('fontSize');
      if (cur === 'small') applyFontSize('medium');
      else if (cur === 'medium') applyFontSize('large');
    };

    var fsDown = document.getElementById('font-size-down');
    if (fsDown) fsDown.onclick = function() {
      var cur = get('fontSize');
      if (cur === 'large') applyFontSize('medium');
      else if (cur === 'medium') applyFontSize('small');
    };
  }

  return { init, applyTheme, applyFontSize, applyFont, toggleTheme, get, set };
})();
