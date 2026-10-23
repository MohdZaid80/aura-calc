/**
 * AURA CALC - PRODUCTION CALCULATOR ENGINE
 * Features: Safe Custom Math Parser (Shunting-Yard + RPN), Memory state,
 * Persistent LocalStorage History, Toast Notifications, and Keyboard Mapping.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const expressionDisplay = document.getElementById('expression-display');
  const resultDisplay = document.getElementById('result-display');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const copyBtn = document.getElementById('copy-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const memoryIndicator = document.getElementById('memory-indicator');
  const memoryValueSpan = document.getElementById('memory-value');
  const toggleHistoryBtn = document.getElementById('toggle-history-btn');
  const historyPanel = document.getElementById('history-panel');
  const toastContainer = document.getElementById('toast-container');

  // --- Calculator State ---
  let currentExpression = '';
  let lastResult = null;
  let isEvaluated = false;
  let memoryValue = 0;
  let history = JSON.parse(localStorage.getItem('aura_calc_history') || '[]');

  // --- Initialize App ---
  initTheme();
  renderHistory();
  updateMemoryDisplay();

  // --- Event Listeners ---
  document.querySelector('.keypad').addEventListener('click', handleKeypadClick);
  document.addEventListener('keydown', handleKeyboardInput);
  copyBtn.addEventListener('click', copyResultToClipboard);
  themeToggleBtn.addEventListener('click', toggleTheme);
  clearHistoryBtn.addEventListener('click', clearAllHistory);
  toggleHistoryBtn.addEventListener('click', () => historyPanel.classList.toggle('active'));

  // ==========================================================================
  // SAFE MATHEMATICAL PARSER (Shunting-Yard & RPN Evaluator)
  // ==========================================================================

  /**
   * Tokenizes user math string into recognized mathematical symbols.
   */
  function tokenize(expr) {
    const tokens = [];
    let i = 0;

    // Standardize symbols
    const cleanExpr = expr
      .replace(/×/g, '*')
      .replace(/−/g, '-')
      .replace(/÷/g, '/')
      .replace(/√/g, 'sqrt');

    while (i < cleanExpr.length) {
      const char = cleanExpr[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers & Decimals
      if (/[0-9.]/.test(char)) {
        let numStr = '';
        while (i < cleanExpr.length && /[0-9.]/.test(cleanExpr[i])) {
          numStr += cleanExpr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      // Special Sqrt keyword
      if (cleanExpr.substring(i, i + 4) === 'sqrt') {
        tokens.push({ type: 'FUNCTION', value: 'sqrt' });
        i += 4;
        continue;
      }

      // Operators
      if (['+', '-', '*', '/', '%'].includes(char)) {
        // Detect Unary Minus (e.g., at start or after an operator/bracket)
        if (char === '-') {
          const prevToken = tokens[tokens.length - 1];
          if (!prevToken || prevToken.type === 'OPERATOR' || (prevToken.type === 'PAREN' && prevToken.value === '(')) {
            tokens.push({ type: 'UNARY', value: 'neg' });
            i++;
            continue;
          }
        }
        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'PAREN', value: char });
        i++;
        continue;
      }

      throw new Error('Invalid input');
    }

    return tokens;
  }

  /**
   * Converts token array into Reverse Polish Notation (RPN) using Shunting-Yard
   */
  function shuntingYard(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    const precedence = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
      '%': 2,
      'neg': 3,
      'sqrt': 4
    };

    const associativity = {
      '+': 'Left',
      '-': 'Left',
      '*': 'Left',
      '/': 'Left',
      '%': 'Left',
      'neg': 'Right',
      'sqrt': 'Right'
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Handle implicit multiplication: e.g. 5(2) -> 5 * (2) or 2sqrt(16) -> 2 * sqrt(16)
      if (i > 0) {
        const prev = tokens[i - 1];
        if (
          (prev.type === 'NUMBER' && (token.type === 'FUNCTION' || (token.type === 'PAREN' && token.value === '('))) ||
          (prev.type === 'PAREN' && prev.value === ')' && (token.type === 'NUMBER' || token.type === 'FUNCTION'))
        ) {
          operatorStack.push({ type: 'OPERATOR', value: '*' });
        }
      }

      if (token.type === 'NUMBER') {
        outputQueue.push(token);
      } else if (token.type === 'FUNCTION') {
        operatorStack.push(token);
      } else if (token.type === 'OPERATOR' || token.type === 'UNARY') {
        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (
            top.type !== 'PAREN' &&
            ((associativity[token.value] === 'Left' && precedence[token.value] <= precedence[top.value]) ||
             (associativity[token.value] === 'Right' && precedence[token.value] < precedence[top.value]))
          ) {
            outputQueue.push(operatorStack.pop());
          } else {
            break;
          }
        }
        operatorStack.push(token);
      } else if (token.type === 'PAREN' && token.value === '(') {
        operatorStack.push(token);
      } else if (token.type === 'PAREN' && token.value === ')') {
        let hasLeftParen = false;
        while (operatorStack.length > 0) {
          const top = operatorStack.pop();
          if (top.type === 'PAREN' && top.value === '(') {
            hasLeftParen = true;
            break;
          } else {
            outputQueue.push(top);
          }
        }
        if (!hasLeftParen) throw new Error('Unbalanced brackets');
      }
    }

    while (operatorStack.length > 0) {
      const top = operatorStack.pop();
      if (top.type === 'PAREN') throw new Error('Unbalanced brackets');
      outputQueue.push(top);
    }

    return outputQueue;
  }

  /**
   * Evaluates Postfix (RPN) stack and returns final numeric outcome.
   */
  function evaluateRPN(rpnQueue) {
    const stack = [];

    for (const token of rpnQueue) {
      if (token.type === 'NUMBER') {
        stack.push(token.value);
      } else if (token.type === 'UNARY') {
        if (stack.length < 1) throw new Error('Invalid calculation');
        const val = stack.pop();
        stack.push(-val);
      } else if (token.type === 'FUNCTION' && token.value === 'sqrt') {
        if (stack.length < 1) throw new Error('Invalid calculation');
        const val = stack.pop();
        if (val < 0) throw new Error('Invalid square root');
        stack.push(Math.sqrt(val));
      } else if (token.type === 'OPERATOR') {
        if (stack.length < 2) throw new Error('Invalid calculation');
        const b = stack.pop();
        const a = stack.pop();

        switch (token.value) {
          case '+': stack.push(a + b); break;
          case '-': stack.push(a - b); break;
          case '*': stack.push(a * b); break;
          case '/':
            if (b === 0) throw new Error('Cannot divide by zero');
            stack.push(a / b);
            break;
          case '%':
            // Percentage: a % b treated as (a * b / 100) or standard mod depending on context.
            // In smart calculator UX, 100 + 20% = 120.
            stack.push((a * b) / 100);
            break;
        }
      }
    }

    if (stack.length !== 1) throw new Error('Invalid calculation');
    return stack[0];
  }

  /**
   * Master Safe Evaluation Pipeline
   */
  function calculateExpression(exprStr) {
    if (!exprStr.trim()) return 0;
    try {
      const tokens = tokenize(exprStr);
      if (tokens.length === 0) return 0;
      const rpn = shuntingYard(tokens);
      const result = evaluateRPN(rpn);

      if (!isFinite(result)) throw new Error('Invalid calculation');
      
      // Handle floating point precision errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
      return Math.round(result * 1e12) / 1e12;
    } catch (err) {
      throw err;
    }
  }

  // ==========================================================================
  // KEYPAD & EVENT HANDLERS
  // ==========================================================================

  function handleKeypadClick(e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    // Visual button press ripple/scale animation effect
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 120);

    const action = btn.dataset.action;
    const val = btn.dataset.val;

    if (val !== undefined && !action) {
      appendCharacter(val);
    } else if (action === 'operator') {
      appendOperator(val);
    } else {
      handleAction(action);
    }

    updateDisplay();
  }

  function handleAction(action) {
    switch (action) {
      case 'clear':
        clearAll();
        break;
      case 'backspace':
        handleBackspace();
        break;
      case 'calculate':
        executeCalculation();
        break;
      case 'square':
        applyUnaryTransform(val => `(${val})²`, val => Math.pow(val, 2));
        break;
      case 'sqrt':
        appendFunction('√(');
        break;
      case 'reciprocal':
        applyUnaryTransform(val => `1/(${val})`, val => 1 / val);
        break;
      case 'toggle-sign':
        toggleSign();
        break;
      case 'percent':
        appendCharacter('%');
        break;
      case 'bracket-left':
        appendCharacter('(');
        break;
      case 'bracket-right':
        appendCharacter(')');
        break;
      case 'mc':
        memoryValue = 0;
        updateMemoryDisplay();
        showToast('Memory Cleared');
        break;
      case 'mr':
        appendCharacter(memoryValue.toString());
        break;
      case 'm-plus':
        performMemoryOp((res) => memoryValue += res);
        break;
      case 'm-minus':
        performMemoryOp((res) => memoryValue -= res);
        break;
    }
  }

  // ==========================================================================
  // CALCULATOR LOGIC & DISPLAY STATE
  // ==========================================================================

  function appendCharacter(char) {
    if (isEvaluated) {
      // If result was just evaluated and user types a digit, reset calculation
      if (/[0-9.]/.test(char)) {
        currentExpression = '';
      }
      isEvaluated = false;
    }

    // Prevent double decimals in single number
    if (char === '.') {
      const parts = currentExpression.split(/[\+\−\×\÷\(\)]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('.')) return;
    }

    currentExpression += char;
  }

  function appendOperator(op) {
    if (isEvaluated) {
      isEvaluated = false;
    }

    if (currentExpression === '' && lastResult !== null) {
      currentExpression = lastResult.toString();
    }

    // Replace trailing operator if exists
    if (/[\+\−\×\÷]\s*$/.test(currentExpression)) {
      currentExpression = currentExpression.replace(/[\+\−\×\÷]\s*$/, op);
    } else {
      currentExpression += op;
    }
  }

  function appendFunction(fnStr) {
    if (isEvaluated) isEvaluated = false;
    currentExpression += fnStr;
  }

  function handleBackspace() {
    if (isEvaluated) {
      clearAll();
      return;
    }
    currentExpression = currentExpression.slice(0, -1);
  }

  function clearAll() {
    currentExpression = '';
    lastResult = null;
    isEvaluated = false;
    resultDisplay.classList.remove('error');
    updateDisplay();
  }

  function toggleSign() {
    if (!currentExpression) return;
    if (currentExpression.startsWith('-')) {
      currentExpression = currentExpression.substring(1);
    } else {
      currentExpression = '-' + currentExpression;
    }
  }

  function applyUnaryTransform(exprFormatter, mathFn) {
    try {
      let targetVal;
      if (isEvaluated && lastResult !== null) {
        targetVal = lastResult;
      } else {
        targetVal = calculateExpression(currentExpression || '0');
      }

      if (targetVal === 'Cannot divide by zero') return;

      const res = mathFn(targetVal);
      if (!isFinite(res) || isNaN(res)) throw new Error('Invalid calculation');

      const formattedRes = Math.round(res * 1e12) / 1e12;
      saveToHistory(exprFormatter(targetVal), formattedRes);
      
      currentExpression = formattedRes.toString();
      lastResult = formattedRes;
      isEvaluated = true;
    } catch (err) {
      showError(err.message);
    }
  }

  function executeCalculation() {
    if (!currentExpression.trim()) return;

    try {
      const rawResult = calculateExpression(currentExpression);
      
      saveToHistory(currentExpression, rawResult);
      lastResult = rawResult;
      currentExpression = rawResult.toString();
      isEvaluated = true;
      resultDisplay.classList.remove('error');
    } catch (err) {
      showError(err.message);
    }
    updateDisplay();
  }

  function performMemoryOp(operation) {
    try {
      let valToUse = lastResult;
      if (!isEvaluated && currentExpression) {
        valToUse = calculateExpression(currentExpression);
      }
      if (valToUse === null || isNaN(valToUse)) return;

      operation(valToUse);
      updateMemoryDisplay();
      showToast('Memory Updated');
    } catch (err) {
      showError('Invalid calculation');
    }
  }

  function updateMemoryDisplay() {
    if (memoryValue !== 0) {
      memoryIndicator.classList.remove('hidden');
      memoryValueSpan.textContent = formatNumber(memoryValue);
    } else {
      memoryIndicator.classList.add('hidden');
    }
  }

  function showError(msg) {
    resultDisplay.classList.add('error');
    resultDisplay.textContent = msg;
    currentExpression = '';
    isEvaluated = false;
  }

  function updateDisplay() {
    if (resultDisplay.classList.contains('error')) return;

    expressionDisplay.textContent = currentExpression || '';

    // Dynamic Live Result Preview
    if (currentExpression && !isEvaluated) {
      try {
        const liveVal = calculateExpression(currentExpression);
        resultDisplay.textContent = formatNumber(liveVal);
      } catch {
        resultDisplay.textContent = formatNumber(currentExpression);
      }
    } else if (isEvaluated && lastResult !== null) {
      resultDisplay.textContent = formatNumber(lastResult);
    } else {
      resultDisplay.textContent = '0';
    }
  }

  function formatNumber(val) {
    if (typeof val === 'string') return val;
    if (isNaN(val)) return '0';
    
    // Format large numbers with locale commas or scientific notation
    if (Math.abs(val) >= 1e12 || (Math.abs(val) < 1e-6 && val !== 0)) {
      return val.toExponential(6);
    }
    
    return val.toLocaleString('en-US', { maximumFractionDigits: 10 });
  }

  // ==========================================================================
  // HISTORY MANAGEMENT
  // ==========================================================================

  function saveToHistory(expr, res) {
    const item = {
      id: Date.now(),
      expression: expr,
      result: res
    };

    history.unshift(item);
    if (history.length > 50) history.pop(); // Limit max history
    localStorage.setItem('aura_calc_history', JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <p>No history yet</p>
          <span>Calculations will be saved automatically</span>
        </div>`;
      return;
    }

    historyList.innerHTML = history.map(item => `
      <div class="history-item" data-expr="${item.expression}" data-res="${item.result}">
        <button class="delete-item-btn" data-id="${item.id}" title="Delete entry" aria-label="Delete entry">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="history-expr">${item.expression} =</div>
        <div class="history-res">${formatNumber(item.result)}</div>
      </div>
    `).join('');

    // History item recall listener
    historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.delete-item-btn')) return;
        currentExpression = el.dataset.res;
        lastResult = parseFloat(el.dataset.res);
        isEvaluated = true;
        resultDisplay.classList.remove('error');
        updateDisplay();
        showToast('Result loaded from history');
        if (window.innerWidth <= 820) historyPanel.classList.remove('active');
      });
    });

    // Individual item deletion listener
    historyList.querySelectorAll('.delete-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id);
        history = history.filter(h => h.id !== id);
        localStorage.setItem('aura_calc_history', JSON.stringify(history));
        renderHistory();
      });
    });
  }

  function clearAllHistory() {
    if (history.length === 0) return;
    history = [];
    localStorage.removeItem('aura_calc_history');
    renderHistory();
    showToast('History cleared');
  }

  // ==========================================================================
  // KEYBOARD ACCESSIBILITY
  // ==========================================================================

  function handleKeyboardInput(e) {
    if (e.key >= '0' && e.key <= '9') {
      appendCharacter(e.key);
    } else if (e.key === '.') {
      appendCharacter('.');
    } else if (e.key === '+') {
      appendOperator('+');
    } else if (e.key === '-') {
      appendOperator('−');
    } else if (e.key === '*') {
      appendOperator('×');
    } else if (e.key === '/') {
      e.preventDefault();
      appendOperator('÷');
    } else if (e.key === '%') {
      appendCharacter('%');
    } else if (e.key === '(' || e.key === ')') {
      appendCharacter(e.key);
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      executeCalculation();
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Escape') {
      clearAll();
    }
    updateDisplay();
  }

  // ==========================================================================
  // UTILITIES & THEME TOGGLE
  // ==========================================================================

  function copyResultToClipboard() {
    const textToCopy = resultDisplay.textContent;
    if (!textToCopy || textToCopy === '0') return;

    navigator.clipboard.writeText(textToCopy.replace(/,/g, '')).then(() => {
      showToast('Result copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy text');
    });
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('aura_calc_theme', newTheme);
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('aura_calc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6f4e37" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2200);
  }
});