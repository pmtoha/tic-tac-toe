
    let board = [];
    let rows = 3, cols = 3, winCount = 3;
    let currentPlayer = 'X', gameActive = false, mode = '';
    let depthLimit = Infinity;

    const boardContainer   = document.getElementById('board');
    const statusDisplay    = document.getElementById('status');
    const confettiContainer= document.getElementById('confettiContainer');
    const rowsInput        = document.getElementById('rowsInput');
    const colsInput        = document.getElementById('colsInput');
    const container        = document.querySelector('.container');
    const overlay          = document.getElementById('overlay');
    const endMessage       = document.getElementById('endMessage');
    const playAgainBtn     = document.getElementById('playAgain');
    const restartBtn       = document.getElementById('restart');

    // Mode buttons
    document.querySelectorAll('.mode').forEach(btn => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.level;
        startGame();
      });
    });

    // Always-visible Restart
    restartBtn.addEventListener('click', () => {
      overlay.classList.remove('show');
      startGame();
    });

    // Play Again inside overlay
    playAgainBtn.addEventListener('click', () => {
      overlay.classList.remove('show');
      startGame();
    });

    // Initialize or restart
    function startGame() {
      rows = Math.max(3, Math.min(+rowsInput.value, 5));
      cols = Math.max(3, Math.min(+colsInput.value, 5));
      winCount = rows === cols
        ? (rows === 4 ? 3 : rows)
        : Math.min(rows, cols);
      depthLimit = rows * cols > 9 ? 4 : Infinity;

      board = Array(rows * cols).fill('');
      currentPlayer = 'X';
      gameActive = true;

      updateStatus();
      renderBoard();
      confettiContainer.innerHTML = '';
      container.classList.remove('game-over');
      overlay.classList.remove('show');
    }

    function renderBoard() {
      boardContainer.innerHTML = '';
      boardContainer.style.gridTemplateColumns = `repeat(${cols},1fr)`;
      board.forEach((_, i) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', onCellClick);
        cell.appendChild(document.createElement('span'));
        boardContainer.appendChild(cell);
      });
    }

    function onCellClick() {
      const idx = +this.dataset.index;
      if (!gameActive || board[idx]) return;
      makeMove(idx, currentPlayer);
      if (gameActive && mode !== 'friend') {
        setTimeout(() => {
          const ai = getComputerMove(mode);
          if (ai !== null) makeMove(ai, 'O');
        }, 300);
      }
    }

    function makeMove(idx, player) {
      board[idx] = player;
      const cell = boardContainer.querySelector(`.cell[data-index="${idx}"]`);
      cell.querySelector('span').textContent = player === 'X' ? '❌' : '⭕';
      cell.classList.add('cell-filled');

      const winLine = checkWinForPlayer(player);
      if (winLine) {
        highlightWin(winLine);
        finishGame(`${player === 'X' ? '❌' : '⭕'} wins! 🎉`);
      }
      else if (board.every(v => v)) {
        finishGame('Draw! 🤝');
      }
      else {
        currentPlayer = player === 'X' ? 'O' : 'X';
        if (mode === 'friend') {
          statusDisplay.textContent = `${currentPlayer === 'X' ? '❌' : '⭕'}'s turn`;
        }
      }
    }

    function finishGame(msg) {
      statusDisplay.textContent = msg;
      gameActive = false;
      container.classList.add('game-over');
      showConfetti();
      endMessage.textContent = msg;
      overlay.classList.add('show');
    }

    function updateStatus() {
      let text = mode === 'friend'
        ? "2 Player Mode: ❌'s Turn"
        : mode
          ? `Playing ${mode.toUpperCase()} AI: Your Move!`
          : "Choose a mode to begin";
      if (rows !== cols) text += ` (${winCount} in a row to win)`;
      statusDisplay.textContent = text;
    }

    function checkWinForPlayer(player) {
      const dirs = [{r:0,c:1},{r:1,c:0},{r:1,c:1},{r:1,c:-1}];
      for (let r=0; r<rows; r++) {
        for (let c=0; c<cols; c++) {
          const i = r*cols + c;
          if (board[i] !== player) continue;
          for (let {r:dr,c:dc} of dirs) {
            const seq = [];
            let ok = true;
            for (let k=0; k<winCount; k++) {
              const nr = r + dr*k, nc = c + dc*k;
              if (nr<0||nc<0||nr>=rows||nc>=cols||board[nr*cols+nc]!==player) {
                ok = false; break;
              }
              seq.push(nr*cols + nc);
            }
            if (ok) return seq;
          }
        }
      }
      return null;
    }

    function highlightWin(line) {
      line.forEach(i => {
        boardContainer.querySelector(`.cell[data-index="${i}"]`)
          .classList.add('win');
      });
    }

    function getAvailableMoves() {
      return board
        .map((v,i) => v === '' ? i : null)
        .filter(i => i !== null);
    }

    function getComputerMove(level) {
      const moves = getAvailableMoves();
      if (!moves.length) return null;
      if (level === 'easy') {
        return moves[Math.floor(Math.random() * moves.length)];
      }
      if (level === 'medium') {
        // Win if possible
        for (let m of moves) {
          board[m] = 'O';
          if (checkWinForPlayer('O')) { board[m] = ''; return m; }
          board[m] = '';
        }
        // Block
        for (let m of moves) {
          board[m] = 'X';
          if (checkWinForPlayer('X')) { board[m] = ''; return m; }
          board[m] = '';
        }
        return moves[Math.floor(Math.random() * moves.length)];
      }
      return minimaxMove();
    }

    function minimaxMove() {
      let best = -Infinity, choice = null;
      getAvailableMoves().forEach(i => {
        board[i] = 'O';
        const val = minimax(0, false);
        board[i] = '';
        if (val > best) { best = val; choice = i; }
      });
      return choice;
    }

    function minimax(depth, isMax) {
      const evalScore = evaluateBoard();
      if (evalScore !== null || depth >= depthLimit) {
        return evalScore ?? 0;
      }
      const moves = getAvailableMoves();
      let best = isMax ? -Infinity : Infinity;
      for (let m of moves) {
        board[m] = isMax ? 'O' : 'X';
        const val = minimax(depth + 1, !isMax);
        board[m] = '';
        best = isMax ? Math.max(best, val) : Math.min(best, val);
      }
      return best;
    }

    function evaluateBoard() {
      if (checkWinForPlayer('O')) return 10;
      if (checkWinForPlayer('X')) return -10;
      if (board.every(c => c !== '')) return 0;
      return null;
    }

    function showConfetti() {
      const colors = ['#80deea','#ffccbc','#ffe082','#d1c4e9','#c5e1a5'];
      for (let i=0; i<30; i++) {
        const dot = document.createElement('div');
        dot.className = 'confetti';
        dot.style.left = Math.random()*100 + '%';
        dot.style.top  = '-20px';
        dot.style.backgroundColor = colors[
          Math.floor(Math.random()*colors.length)
        ];
        dot.style.animationDuration = `${Math.random()*0.5 + 1.2}s`;
        dot.style.animationDelay    = `${Math.random()*0.5}s`;
        confettiContainer.appendChild(dot);
      }
      setTimeout(() => {
        confettiContainer.innerHTML = '';
      }, 2500);
    }

    // Launch initial board
    startGame();
