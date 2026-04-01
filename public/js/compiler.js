// compiler.js — Skulpt-based Python Compiler
window.PyCompiler = {
  _running: false,

  // Run Python code using Skulpt, returns { output, error, success }
  async run(code, inputData) {
    if (this._running) return { output: '', error: 'Бағдарлама жұмыста', success: false };
    this._running = true;
    let output = '';

    try {
      Sk.configure({
        output: (text) => { output += text; },
        read: (x) => {
          if (Sk.builtinFiles?.files?.[x] === undefined)
            throw new Error(`Файл табылмады: ${x}`);
          return Sk.builtinFiles.files[x];
        },
        inputfun: () => {
          if (inputData && inputData.length > 0) {
            return Promise.resolve(inputData.shift());
          }
          return Promise.resolve('');
        },
        inputfunTakesPromise: true,
        __future__: Sk.python3,
        execLimit: 10000  // 10 second limit
      });

      await Sk.misceval.asyncToPromise(
        () => Sk.importMainWithBody('<stdin>', false, code, true)
      );
      return { output: output.trimEnd(), error: null, success: true };
    } catch (e) {
      const errMsg = e.toString()
        .replace('TypeError:', 'Тип қатесі:')
        .replace('SyntaxError:', 'Синтаксис қатесі:')
        .replace('NameError:', 'Аты табылмады:')
        .replace('IndexError:', 'Индекс қатесі:')
        .replace('ValueError:', 'Мән қатесі:')
        .replace('ZeroDivisionError:', 'Нөлге бөлу:');
      return { output: '', error: errMsg, success: false };
    } finally {
      this._running = false;
    }
  },

  // Run against test cases and return results
  async runTests(code, testCases) {
    const results = [];
    let passed = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const inputLines = (tc.input || '').split('\n').filter(l => l.trim() !== '');
      const expected = (tc.expected_output || tc.output || '').trim();

      const result = await this.run(code, [...inputLines]);

      if (result.error) {
        results.push({
          index: i + 1,
          passed: false,
          input: tc.input || '',
          expected,
          got: result.error,
          error: true
        });
      } else {
        const got = result.output.trim();
        const ok = got === expected;
        if (ok) passed++;
        results.push({
          index: i + 1,
          passed: ok,
          input: tc.input || '',
          expected,
          got,
          error: false
        });
      }
    }

    const score = testCases.length > 0 ? Math.round((passed / testCases.length) * 100) : 0;
    return { results, passed, total: testCases.length, score };
  },

  // Render results into a container element
  renderResults(container, { results, passed, total, score }) {
    const scoreClass = score === 100 ? 'score-100' : score >= 50 ? 'score-mid' : 'score-low';
    let html = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span class="score-badge ${scoreClass}">${score}%</span>
        <span style="color:var(--text2);font-size:14px">${passed}/${total} тест өтті</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">`;

    results.forEach((r, idx) => {
      const icon = r.passed ? '✅' : '❌';
      const delay = idx * 0.1;
      html += `
        <div class="test-result-row" style="animation-delay:${delay}s;
             background:${r.passed ? 'rgba(0,255,136,.05)' : 'rgba(255,60,60,.05)'};
             border:1px solid ${r.passed ? 'rgba(0,255,136,.2)' : 'rgba(255,60,60,.2)'};
             border-radius:8px;padding:10px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:600;color:${r.passed ? '#00ff88' : '#ff3c3c'}">${icon} Тест ${r.index}</span>
          </div>
          ${!r.passed ? `
            <div style="margin-top:8px;font-size:12px;color:var(--text3);font-family:'JetBrains Mono',monospace">
              <div>📥 Кіріс: <code>${r.input || '(жоқ)'}</code></div>
              <div>✅ Күтілген: <code>${r.expected}</code></div>
              <div>🔴 Алынған: <code>${r.error ? '⚠️ ' : ''}${r.got || '(бос)'}</code></div>
            </div>` : ''}
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }
};
