
    (() => {
      'use strict';


      const AI_P = 'O', HUMAN_P = 'X';
      const WIN_SCORE = 10000;
      const WEIGHTS = { 1: 2, 2: 12, 3: 120 };
      const pick = (arr) => arr[(Math.random() * arr.length) | 0];

      const buildLines = (n) => {
        const L = [];
        for (let r = 0; r < n; r++) L.push(Array.from({length: n}, (_, c) => r * n + c));
        for (let c = 0; c < n; c++) L.push(Array.from({length: n}, (_, r) => r * n + c));
        L.push(Array.from({length: n}, (_, i) => i * n + i));
        L.push(Array.from({length: n}, (_, i) => i * n + (n - 1 - i)));
        return L;
      };
      const LINES = { 3: buildLines(3), 4: buildLines(4) };

      const ORDER = {};
      for (const n of [3, 4]) {
        const m = (n - 1) / 2;
        ORDER[n] = [...Array(n * n).keys()].sort((a, b) =>
          (Math.abs(Math.floor(a / n) - m) + Math.abs(a % n - m)) -
          (Math.abs(Math.floor(b / n) - m) + Math.abs(b % n - m)) || a - b);
      }


      function winnerOf(b, n) {
        for (const line of LINES[n]) {
          const v = b[line[0]];
          if (v && line.every((i) => b[i] === v)) return v;
        }
        return null;
      }


      function evalBoard(b, n) {
        let s = 0;
        for (const line of LINES[n]) {
          let ai = 0, hu = 0;
          for (const i of line) {
            if (b[i] === AI_P) ai++;
            else if (b[i] === HUMAN_P) hu++;
          }
          if (ai && hu) continue;                        /* dead line */
          if (ai) s += WEIGHTS[ai] || 300;
          else if (hu) s -= Math.floor((WEIGHTS[hu] || 300) * 1.2);
        }
        return s;
      }


      function search(b, n, depth, alpha, beta, maximizing, limit) {
        const w = winnerOf(b, n);
        if (w === AI_P)    return WIN_SCORE - depth;
        if (w === HUMAN_P) return depth - WIN_SCORE;
        const empty = [];
        for (const i of ORDER[n]) if (!b[i]) empty.push(i);
        if (!empty.length) return 0;
        if (depth >= limit) return evalBoard(b, n);

        let best = maximizing ? -WIN_SCORE * 2 : WIN_SCORE * 2;
        for (const mv of empty) {
          b[mv] = maximizing ? AI_P : HUMAN_P;
          const val = search(b, n, depth + 1, alpha, beta, !maximizing, limit);
          b[mv] = '';
          if (maximizing) {
            if (val > best) best = val;
            if (val > alpha) alpha = val;
          } else {
            if (val < best) best = val;
            if (val < beta) beta = val;
          }
          if (beta <= alpha) break;
        }
        return best;
      }

      function winningSquare(b, n, p) {
        for (let m = 0; m < n * n; m++) {
          if (b[m]) continue;
          b[m] = p;
          const won = winnerOf(b, n) === p;
          b[m] = '';
          if (won) return m;
        }
        return null;
      }

      function best3(b) {
        let best = -WIN_SCORE * 2, picks = [];
        for (const m of ORDER[3]) {
          if (b[m]) continue;
          b[m] = AI_P;
          const val = search(b, 3, 1, -WIN_SCORE * 2, WIN_SCORE * 2, false, 9);
          b[m] = '';
          if (val > best) { best = val; picks = [m]; }
          else if (val === best) picks.push(m);
        }
        return pick(picks);
      }

      function best4(b) {
        let m = winningSquare(b, 4, AI_P);
        if (m !== null) return m;
        m = winningSquare(b, 4, HUMAN_P);
        if (m !== null) return m;

        const empties = b.filter((v) => !v).length;
        const limit = empties > 10 ? 4 : 7;            /* deeper in endgame */
        let best = -WIN_SCORE * 2, picks = [];
        for (const mv of ORDER[4]) {
          if (b[mv]) continue;
          b[mv] = AI_P;
          const val = search(b, 4, 1, -WIN_SCORE * 2, WIN_SCORE * 2, false, limit);
          b[mv] = '';
          if (val > best) { best = val; picks = [mv]; }
          else if (val === best) picks.push(mv);
        }
        return pick(picks);
      }

      function greedy(b, n) {
        const scored = [];
        for (let m = 0; m < n * n; m++) {
          if (b[m]) continue;
          b[m] = AI_P;
          scored.push([evalBoard(b, n), m]);
          b[m] = '';
        }
        scored.sort((a, z) => (z[0] - a[0]) || (Math.random() - .5));
        const cutoff = scored[0][0] - 3;
        return pick(scored.filter((s) => s[0] >= cutoff).map((s) => s[1]));
      }

      function chooseMove(boardIn, difficulty, n) {
        const b = boardIn.slice();
        const avail = [];
        for (let i = 0; i < b.length; i++) if (!b[i]) avail.push(i);
        if (!avail.length) return null;

        if (difficulty === 'easy') {
          if (Math.random() < 0.6) return pick(avail);
          const m = winningSquare(b, n, AI_P);
          if (m !== null) return m;
          const mb = winningSquare(b, n, HUMAN_P);
          if (mb !== null) return mb;
          return pick(avail);
        }

        if (difficulty === 'medium') {
          let m = winningSquare(b, n, AI_P);
          if (m !== null) return m;
          m = winningSquare(b, n, HUMAN_P);
          if (m !== null) return m;
          if (n === 3) {
            if (!b[4]) return 4;
            const corners = [0, 2, 6, 8].filter((i) => !b[i]);
            return corners.length ? pick(corners) : pick(avail);
          }
          return greedy(b, 4);
        }

        return n === 3 ? best3(b) : best4(b);          /* impossible */
      }

      (function selfTest() {
        console.assert(chooseMove(['X','X','','O','','','','',''], 'impossible', 3) === 2, 'test1');
        console.assert(chooseMove(['O','O','','X','X','','','',''], 'impossible', 3) === 2, 'test2');
        console.assert(chooseMove(['X','X','X','','O','','','','','','','','','','',''],
                                  'impossible', 4) === 3, 'test3');
      })();


      const $ = (id) => document.getElementById(id);
      const boardEl = $('board'), winLineEl = $('winLine'), dot = $('dot');
      const statusText = $('statusText'), confettiEl = $('confetti');
      const overlay = $('overlay'), endMessage = $('endMessage');
      const scoreX = $('scoreX'), scoreO = $('scoreO'), scoreD = $('scoreD');
      const xLabel = $('xLabel'), oLabel = $('oLabel'), scoreboard = $('scoreboard');

      const X_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
          <line class="st sx"   x1="24" y1="24" x2="76" y2="76" pathLength="1"/>
          <line class="st sx s2" x1="76" y1="24" x2="24" y2="76" pathLength="1"/></svg>`;
      const O_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true">
          <circle class="st so oc" cx="50" cy="50" r="28" pathLength="1"/></svg>`;

      let size = 3, board = [], currentPlayer = 'X';
      let mode = '', gameActive = false, busy = false;
      let scores = { X: 0, O: 0, D: 0 };

      const store = {
        get(k, fb) { try { const v = localStorage.getItem('ttt.' + k);
                           return v === null ? fb : JSON.parse(v); } catch { return fb; } },
        set(k, v)  { try { localStorage.setItem('ttt.' + k, JSON.stringify(v)); } catch {} },
      };

      let audioCtx = null, soundOn = store.get('sound', true);
      function beep(f, d = .12, t = 'sine', g = .14, delay = 0) {
        if (!soundOn) return;
        try {
          audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
          const at = audioCtx.currentTime + delay;
          const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
          o.type = t; o.frequency.value = f;
          gn.gain.setValueAtTime(g, at);
          gn.gain.exponentialRampToValueAtTime(.001, at + d);
          o.connect(gn).connect(audioCtx.destination);
          o.start(at); o.stop(at + d);
        } catch {}
      }
      const sfx = {
        X: () => beep(660, .09, 'triangle'),
        O: () => beep(440, .09, 'sine'),
        win:  () => [523, 659, 784].forEach((f, i) => beep(f, .16, 'triangle', .16, i * .12)),
        lose: () => { beep(330, .16, 'sawtooth', .09); beep(220, .3, 'sawtooth', .09, .16); },
        draw: () => { beep(440, .12); beep(440, .12, 'sine', .14, .18); },
      };
      $('soundToggle').addEventListener('click', () => {
        soundOn = !soundOn;
        $('soundToggle').textContent = soundOn ? '🔊' : '🔇';
        store.set('sound', soundOn);
      });

      let dark = store.get('dark', matchMedia('(prefers-color-scheme: dark)').matches);
      function applyTheme() {
        document.body.classList.toggle('dark', dark);
        $('themeToggle').textContent = dark ? '☀️' : '🌙';
        $('metaTheme').content = dark ? '#0c1b22' : '#e0f7fa';
      }
      $('themeToggle').addEventListener('click', () => {
        dark = !dark; applyTheme(); store.set('dark', dark);
      });

      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const centerOf = (i) => ({
        x: ((i % size) + .5) * 100 / size,
        y: (Math.floor(i / size) + .5) * 100 / size,
      });

      function startGame() {
        busy = false;
        board = Array(size * size).fill('');
        currentPlayer = 'X';
        gameActive = !!mode;

        boardEl.style.setProperty('--n', size);
        winLineEl.classList.toggle('n4', size === 4);
        winLineEl.classList.toggle('n3', size === 3);

        renderBoard();
        winLineEl.innerHTML = '';
        overlay.classList.remove('show');
        updateScores();
        setTurnUI();
      }

      function renderBoard() {
        boardEl.innerHTML = '';
        for (let i = 0; i < size * size; i++) {
          const c = document.createElement('button');
          c.type = 'button';
          c.className = 'cell';
          c.dataset.index = i;
          c.setAttribute('aria-label', `Cell ${Math.floor(i / size) + 1},${(i % size) + 1}`);
          c.addEventListener('click', onCellClick);
          boardEl.appendChild(c);
        }
      }

      function onCellClick() {
        if (busy || !gameActive) return;
        const idx = +this.dataset.index;
        if (board[idx]) return;
        makeMove(idx, currentPlayer);
        if (gameActive && mode !== 'friend') aiTurn();
      }

      async function aiTurn() {
        busy = true;
        setTurnUI('🤖 CPU is thinking');
        await sleep(260 + Math.random() * 360);        /* thinking delay for feel */
        const move = getAiMove();
        busy = false;
        if (!gameActive || move == null || board[move]) return;
        makeMove(move, 'O');
      }

      /* was: fetch('/api/move') — now runs the built-in AI engine */
      function getAiMove() {
        try {
          return chooseMove(board.slice(), mode, size);
        } catch (err) {
          console.warn(err);
          return fallbackMove();
        }
      }

      function fallbackMove() {
        const free = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);
        if (!free.length) return null;
        for (const p of ['O', 'X'])
          for (const m of free) {
            board[m] = p;
            const won = !!checkWin(p);
            board[m] = '';
            if (won) return m;
          }
        return free[(Math.random() * free.length) | 0];
      }

      function makeMove(idx, player) {
        board[idx] = player;
        const cell = boardEl.querySelector(`.cell[data-index="${idx}"]`);
        cell.innerHTML = player === 'X' ? X_SVG : O_SVG;
        cell.classList.add('filled');
        player === 'X' ? sfx.X() : sfx.O();

        const line = checkWin(player);
        if (line) return endGame(player, line);
        if (board.every(Boolean)) return endGame(null, null);

        currentPlayer = player === 'X' ? 'O' : 'X';
        setTurnUI();
      }

      function checkWin(player) {
        for (const line of LINES[size])
          if (line.every((i) => board[i] === player)) return line;
        return null;
      }

      function drawWinLine(line) {
        const a = centerOf(line[0]), b = centerOf(line[line.length - 1]);
        winLineEl.innerHTML =
          `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" pathLength="1"/>`;
      }

      function endGame(winner, line) {
        gameActive = false; busy = false;

        if (line) {
          line.forEach((i) =>
            boardEl.querySelector(`.cell[data-index="${i}"]`).classList.add('win'));
          drawWinLine(line);
        }

        const solo = mode !== 'friend';
        let msg, kind;
        if (!winner)           { msg = '🤝 It\'s a Draw!';  kind = 'draw'; }
        else if (winner === 'X'){ msg = solo ? '🎉 You Win!' : '🎉 Player 1 Wins!'; kind = 'win'; }
        else                   { msg = solo ? '🤖 CPU Wins!' : '🎉 Player 2 Wins!'; kind = solo ? 'lose' : 'win'; }

        scores[winner || 'D']++;
        store.set('scores', scores);
        updateScores();

        kind === 'draw' ? sfx.draw() : kind === 'lose' ? sfx.lose() : sfx.win();

        statusText.textContent = msg;
        dot.style.display = 'none';
        if (winner) showConfetti();

        endMessage.textContent = msg;
        setTimeout(() => { if (!gameActive) overlay.classList.add('show'); },
                   winner ? 1100 : 600);
      }

      function setTurnUI(text) {
        dot.style.display = '';
        dot.classList.toggle('x', currentPlayer === 'X');
        boardEl.dataset.turn = currentPlayer;
        if (text) { statusText.textContent = text + '…'; return; }
        statusText.textContent = mode === 'friend'
          ? (currentPlayer === 'X' ? '✕ Player 1\'s turn' : '◯ Player 2\'s turn')
          : (currentPlayer === 'X' ? '✕ Your move' : '◯ CPU\'s turn');
      }

      function updateScores() {
        scoreX.textContent = scores.X;
        scoreO.textContent = scores.O;
        scoreD.textContent = scores.D;
        xLabel.textContent = mode === 'friend' ? 'P1 ✕' : 'You ✕';
        oLabel.textContent = mode === 'friend' ? 'P2 ◯' : 'CPU ◯';
      }

      scoreboard.addEventListener('dblclick', () => {
        scores = { X: 0, O: 0, D: 0 };
        store.set('scores', scores);
        updateScores();
        statusText.textContent = '🧹 Scores reset';
      });

      function showConfetti() {
        const colors = ['#06b6d4', '#f43f5e', '#fbbf24', '#a78bfa', '#4ade80'];
        for (let i = 0; i < 50; i++) {
          const d = document.createElement('div');
          d.className = 'confetti';
          d.style.left = Math.random() * 100 + '%';
          d.style.top = '-12px';
          d.style.background = colors[(Math.random() * colors.length) | 0];
          d.style.animationDuration = (Math.random() * .8 + 1.4) + 's';
          d.style.animationDelay = (Math.random() * .5) + 's';
          if (Math.random() < .5) d.style.borderRadius = '50%';
          confettiEl.appendChild(d);
        }
        setTimeout(() => { confettiEl.innerHTML = ''; }, 3000);
      }

      /* ------------------------- size + modes --------------------------- */
      document.querySelectorAll('.seg-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          size = +btn.dataset.size;
          store.set('size', size);
          startGame();
        });
      });

      document.querySelectorAll('.mode').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.mode').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          mode = btn.dataset.level;
          startGame();
        });
      });

      $('restart').addEventListener('click', startGame);
      $('playAgain').addEventListener('click', startGame);
      $('closeOverlay').addEventListener('click', () => overlay.classList.remove('show'));

      /* ------------------------------ boot ------------------------------ */
      applyTheme();
      $('soundToggle').textContent = soundOn ? '🔊' : '🔇';
      scores = store.get('scores', scores);
      size = store.get('size', 3) === 4 ? 4 : 3;
      document.querySelectorAll('.seg-btn')
        .forEach((b) => b.classList.toggle('active', +b.dataset.size === size));

      const def = document.querySelector('.mode[data-level="medium"]');
      def.classList.add('active');
      mode = def.dataset.level;
      startGame();
    })();
