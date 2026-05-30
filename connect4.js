// --- Connect 4 Gameplay & Minimax AI ---

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const boardEl = document.getElementById('c4-board');
  const columnsEl = document.querySelectorAll('.board-column');
  const statusText = document.getElementById('status-text');
  
  const modeAiBtn = document.getElementById('mode-ai');
  const modePvpBtn = document.getElementById('mode-pvp');
  const diffGroup = document.getElementById('difficulty-group');
  const diffButtons = document.querySelectorAll('.diff-btn');
  
  const p1Label = document.getElementById('p1-label');
  const p2Label = document.getElementById('p2-label');
  const scoreP1Val = document.getElementById('score-p1');
  const scoreTiesVal = document.getElementById('score-ties');
  const scoreP2Val = document.getElementById('score-p2');
  
  const btnRestart = document.getElementById('btn-restart');
  const btnResetScores = document.getElementById('btn-reset-scores');

  // --- Constants ---
  const ROWS = 6;
  const COLS = 7;
  const PLAYER_1 = 1; // Cyan
  const PLAYER_2 = 2; // Pink (Computer / P2)

  // --- Game State ---
  let board = Array(COLS).fill().map(() => Array(ROWS).fill(0)); // board[col][row]
  let currentPlayer = PLAYER_1;
  let isAiMode = true;
  let aiDifficulty = 'medium'; // easy | medium | hard (unbeatable)
  let isGameOver = false;
  let isAiThinking = false;

  let scoreP1 = parseInt(localStorage.getItem('c4-score-p1') || '0', 10);
  let scoreTies = parseInt(localStorage.getItem('c4-score-ties') || '0', 10);
  let scoreP2 = parseInt(localStorage.getItem('c4-score-p2') || '0', 10);

  // --- Initialize ---
  initGame();

  function initGame() {
    // Load Scores
    scoreP1Val.innerText = scoreP1;
    scoreTiesVal.innerText = scoreTies;
    scoreP2Val.innerText = scoreP2;

    // Board Column click handlers
    columnsEl.forEach(colEl => {
      colEl.addEventListener('click', () => {
        const colIndex = parseInt(colEl.dataset.col, 10);
        handleColumnSelect(colIndex);
      });
    });

    // Settings Mode change
    modeAiBtn.addEventListener('click', () => {
      if (isAiThinking) return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      modeAiBtn.classList.add('active');
      modePvpBtn.classList.remove('active');
      diffGroup.style.display = 'flex';
      isAiMode = true;
      p2Label.innerText = "COMPUTER (PINK)";
      resetMatch();
    });

    modePvpBtn.addEventListener('click', () => {
      if (isAiThinking) return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      modePvpBtn.classList.add('active');
      modeAiBtn.classList.remove('active');
      diffGroup.style.display = 'none';
      isAiMode = false;
      p2Label.innerText = "PLAYER 2 (PINK)";
      resetMatch();
    });

    // Difficulty buttons
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (isAiThinking) return;
        if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        aiDifficulty = btn.dataset.diff;
      });
    });

    // Restart & Reset
    btnRestart.addEventListener('click', () => {
      if (isAiThinking) return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      resetMatch();
    });

    btnResetScores.addEventListener('click', () => {
      if (isAiThinking) return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      localStorage.setItem('c4-score-p1', '0');
      localStorage.setItem('c4-score-ties', '0');
      localStorage.setItem('c4-score-p2', '0');
      scoreP1 = 0;
      scoreTies = 0;
      scoreP2 = 0;
      scoreP1Val.innerText = 0;
      scoreTiesVal.innerText = 0;
      scoreP2Val.innerText = 0;
    });

    resetMatch();
  }

  function resetMatch() {
    board = Array(COLS).fill().map(() => Array(ROWS).fill(0));
    currentPlayer = PLAYER_1;
    isGameOver = false;
    isAiThinking = false;
    statusText.innerText = isAiMode ? "YOUR TURN" : "PLAYER 1'S TURN";
    statusText.style.color = 'var(--accent-cyan)';
    statusText.style.textShadow = '0 0 10px rgba(0, 242, 254, 0.4)';

    // Reset visual board
    document.querySelectorAll('.board-cell').forEach(cell => {
      cell.className = 'board-cell';
    });
  }

  function handleColumnSelect(colIndex) {
    if (isGameOver || isAiThinking) return;
    if (currentPlayer === PLAYER_2 && isAiMode) return;

    makeMove(colIndex);
  }

  function makeMove(colIndex) {
    const rowIndex = getLowestEmptyRow(board, colIndex);
    
    // Column full
    if (rowIndex === -1) {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playFail();
      return;
    }

    // Play drop sound
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playTone(450 - rowIndex * 50, 'sine', 0.08, 0.1);
    }

    // Update board state
    board[colIndex][rowIndex] = currentPlayer;

    // Update UI
    const columnEl = boardEl.querySelector(`[data-col="${colIndex}"]`);
    const cellEl = columnEl.querySelector(`[data-row="${rowIndex}"]`);
    cellEl.classList.add(`player-${currentPlayer}`);

    // Check Win
    const winningCells = checkWin(board, currentPlayer);
    if (winningCells) {
      handleWin(winningCells);
      return;
    }

    // Check Tie
    if (isBoardFull(board)) {
      handleTie();
      return;
    }

    // Switch turns
    currentPlayer = (currentPlayer === PLAYER_1) ? PLAYER_2 : PLAYER_1;
    
    if (isAiMode) {
      if (currentPlayer === PLAYER_2) {
        statusText.innerText = "COMPUTER IS THINKING...";
        statusText.style.color = 'var(--accent-pink)';
        statusText.style.textShadow = '0 0 10px rgba(248, 87, 166, 0.4)';
        isAiThinking = true;
        setTimeout(triggerAiMove, 650);
      } else {
        statusText.innerText = "YOUR TURN";
        statusText.style.color = 'var(--accent-cyan)';
        statusText.style.textShadow = '0 0 10px rgba(0, 242, 254, 0.4)';
      }
    } else {
      statusText.innerText = currentPlayer === PLAYER_1 ? "PLAYER 1'S TURN" : "PLAYER 2'S TURN";
      statusText.style.color = currentPlayer === PLAYER_1 ? 'var(--accent-cyan)' : 'var(--accent-pink)';
      statusText.style.textShadow = currentPlayer === PLAYER_1 ? '0 0 10px rgba(0, 242, 254, 0.4)' : '0 0 10px rgba(248, 87, 166, 0.4)';
    }
  }

  function triggerAiMove() {
    if (isGameOver) return;
    
    let bestCol = 3;
    
    if (aiDifficulty === 'easy') {
      bestCol = getEasyMove();
    } else if (aiDifficulty === 'medium') {
      bestCol = getMinimaxMove(3); // depth 3
    } else {
      bestCol = getMinimaxMove(5); // depth 5 (Unbeatable)
    }

    isAiThinking = false;
    makeMove(bestCol);
  }

  // --- Board Utility Checks ---

  function getLowestEmptyRow(tempBoard, col) {
    for (let r = 0; r < ROWS; r++) {
      if (tempBoard[col][r] === 0) return r;
    }
    return -1;
  }

  function isBoardFull(tempBoard) {
    for (let c = 0; c < COLS; c++) {
      if (tempBoard[c][ROWS - 1] === 0) return false;
    }
    return true;
  }

  function checkWin(tempBoard, player) {
    // 1. Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        if (tempBoard[c][r] === player && tempBoard[c+1][r] === player && tempBoard[c+2][r] === player && tempBoard[c+3][r] === player) {
          return [[c, r], [c+1, r], [c+2, r], [c+3, r]];
        }
      }
    }

    // 2. Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        if (tempBoard[c][r] === player && tempBoard[c][r+1] === player && tempBoard[c][r+2] === player && tempBoard[c][r+3] === player) {
          return [[c, r], [c, r+1], [c, r+2], [c, r+3]];
        }
      }
    }

    // 3. Positive Diagonal (/)
    for (let c = 0; c < COLS - 3; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        if (tempBoard[c][r] === player && tempBoard[c+1][r+1] === player && tempBoard[c+2][r+2] === player && tempBoard[c+3][r+3] === player) {
          return [[c, r], [c+1, r+1], [c+2, r+2], [c+3, r+3]];
        }
      }
    }

    // 4. Negative Diagonal (\)
    for (let c = 0; c < COLS - 3; c++) {
      for (let r = 3; r < ROWS; r++) {
        if (tempBoard[c][r] === player && tempBoard[c+1][r-1] === player && tempBoard[c+2][r-2] === player && tempBoard[c+3][r-3] === player) {
          return [[c, r], [c+1, r-1], [c+2, r-2], [c+3, r-3]];
        }
      }
    }

    return null;
  }

  // --- End Game Handlers ---

  function handleWin(cells) {
    isGameOver = true;
    
    // Highlight cells
    cells.forEach(([c, r]) => {
      const columnEl = boardEl.querySelector(`[data-col="${c}"]`);
      const cellEl = columnEl.querySelector(`[data-row="${r}"]`);
      cellEl.classList.add('win-cell');
    });

    if (currentPlayer === PLAYER_1) {
      statusText.innerText = isAiMode ? "YOU WIN!" : "PLAYER 1 WINS!";
      statusText.style.color = 'var(--accent-cyan)';
      statusText.style.textShadow = '0 0 20px rgba(0, 242, 254, 0.6)';
      scoreP1++;
      localStorage.setItem('c4-score-p1', scoreP1.toString());
      scoreP1Val.innerText = scoreP1;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playWin();
    } else {
      statusText.innerText = isAiMode ? "COMPUTER WINS!" : "PLAYER 2 WINS!";
      statusText.style.color = 'var(--accent-pink)';
      statusText.style.textShadow = '0 0 20px rgba(248, 87, 166, 0.6)';
      scoreP2++;
      localStorage.setItem('c4-score-p2', scoreP2.toString());
      scoreP2Val.innerText = scoreP2;
      if (typeof arcadeSounds !== 'undefined') {
        if (isAiMode) arcadeSounds.playFail();
        else arcadeSounds.playWin();
      }
    }

    // Increment overall plays
    const totalPlayed = parseInt(localStorage.getItem('c4-total-played') || '0', 10);
    localStorage.setItem('c4-total-played', (totalPlayed + 1).toString());
  }

  function handleTie() {
    isGameOver = true;
    statusText.innerText = "MATCH DRAW!";
    statusText.style.color = 'var(--accent-yellow)';
    statusText.style.textShadow = '0 0 20px rgba(245, 158, 11, 0.5)';
    scoreTies++;
    localStorage.setItem('c4-score-ties', scoreTies.toString());
    scoreTiesVal.innerText = scoreTies;
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playSuccess();

    const totalPlayed = parseInt(localStorage.getItem('c4-total-played') || '0', 10);
    localStorage.setItem('c4-total-played', (totalPlayed + 1).toString());
  }

  // --- AI Algorithms ---

  // 1. Easy: Checks if it can win. Checks if player is about to win and blocks. Otherwise, random.
  function getEasyMove() {
    const validMoves = getValidColumns(board);
    
    // Check if AI can win immediately
    for (let i = 0; i < validMoves.length; i++) {
      const col = validMoves[i];
      const nextRow = getLowestEmptyRow(board, col);
      let tempBoard = copyBoard(board);
      tempBoard[col][nextRow] = PLAYER_2;
      if (checkWin(tempBoard, PLAYER_2)) {
        return col;
      }
    }

    // Check if player can win immediately and block
    for (let i = 0; i < validMoves.length; i++) {
      const col = validMoves[i];
      const nextRow = getLowestEmptyRow(board, col);
      let tempBoard = copyBoard(board);
      tempBoard[col][nextRow] = PLAYER_1;
      if (checkWin(tempBoard, PLAYER_1)) {
        return col;
      }
    }

    // Random move
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  // 2. Minimax with Alpha-Beta Pruning
  function getMinimaxMove(depth) {
    const validMoves = getValidColumns(board);
    let bestScore = -Infinity;
    let bestCol = validMoves[0];

    // Shuffle valid moves to ensure dynamic play
    const shuffledMoves = validMoves.sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledMoves.length; i++) {
      const col = shuffledMoves[i];
      const row = getLowestEmptyRow(board, col);
      let tempBoard = copyBoard(board);
      tempBoard[col][row] = PLAYER_2;

      let score = minimax(tempBoard, depth - 1, -Infinity, Infinity, false);
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }
    return bestCol;
  }

  function minimax(tempBoard, depth, alpha, beta, isMaximizing) {
    const validMoves = getValidColumns(tempBoard);
    const hasP1Won = checkWin(tempBoard, PLAYER_1);
    const hasP2Won = checkWin(tempBoard, PLAYER_2);
    const isTerminal = hasP1Won || hasP2Won || validMoves.length === 0 || depth === 0;

    if (isTerminal) {
      if (hasP2Won) return 100000 + depth; // AI win (prefer faster wins)
      if (hasP1Won) return -100000 - depth; // Player win (block faster)
      if (validMoves.length === 0) return 0; // Draw
      return scorePosition(tempBoard, PLAYER_2); // Score current leaves
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (let i = 0; i < validMoves.length; i++) {
        const col = validMoves[i];
        const row = getLowestEmptyRow(tempBoard, col);
        let nextBoard = copyBoard(tempBoard);
        nextBoard[col][row] = PLAYER_2;
        let score = minimax(nextBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (let i = 0; i < validMoves.length; i++) {
        const col = validMoves[i];
        const row = getLowestEmptyRow(tempBoard, col);
        let nextBoard = copyBoard(tempBoard);
        nextBoard[col][row] = PLAYER_1;
        let score = minimax(nextBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // --- Scoring Heuristic ---

  function scorePosition(tempBoard, player) {
    let score = 0;

    // 1. Center Column Preference (give weights to pieces in col 3)
    const centerCol = Math.floor(COLS / 2);
    let centerCount = 0;
    for (let r = 0; r < ROWS; r++) {
      if (tempBoard[centerCol][r] === player) centerCount++;
    }
    score += centerCount * 3;

    // 2. Score Horizontal Windows
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 3; c++) {
        const window = [tempBoard[c][r], tempBoard[c+1][r], tempBoard[c+2][r], tempBoard[c+3][r]];
        score += evaluateWindow(window, player);
      }
    }

    // 3. Score Vertical Windows
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        const window = [tempBoard[c][r], tempBoard[c][r+1], tempBoard[c][r+2], tempBoard[c][r+3]];
        score += evaluateWindow(window, player);
      }
    }

    // 4. Score Diagonals (/)
    for (let c = 0; c < COLS - 3; c++) {
      for (let r = 0; r < ROWS - 3; r++) {
        const window = [tempBoard[c][r], tempBoard[c+1][r+1], tempBoard[c+2][r+2], tempBoard[c+3][r+3]];
        score += evaluateWindow(window, player);
      }
    }

    // 5. Score Diagonals (\)
    for (let c = 0; c < COLS - 3; c++) {
      for (let r = 3; r < ROWS; r++) {
        const window = [tempBoard[c][r], tempBoard[c+1][r-1], tempBoard[c+2][r-2], tempBoard[c+3][r-3]];
        score += evaluateWindow(window, player);
      }
    }

    return score;
  }

  function evaluateWindow(window, player) {
    let score = 0;
    const oppPlayer = (player === PLAYER_1) ? PLAYER_2 : PLAYER_1;

    const countPlayer = window.filter(c => c === player).length;
    const countOpp = window.filter(c => c === oppPlayer).length;
    const countEmpty = window.filter(c => c === 0).length;

    if (countPlayer === 4) {
      score += 1000;
    } else if (countPlayer === 3 && countEmpty === 1) {
      score += 30;
    } else if (countPlayer === 2 && countEmpty === 2) {
      score += 8;
    }

    if (countOpp === 3 && countEmpty === 1) {
      score -= 75; // Heavily weight blocking opponent's 3-in-a-row
    } else if (countOpp === 2 && countEmpty === 2) {
      score -= 10;
    }

    return score;
  }

  // --- Helper Functions ---

  function getValidColumns(tempBoard) {
    const list = [];
    for (let c = 0; c < COLS; c++) {
      if (tempBoard[c][ROWS - 1] === 0) list.push(c);
    }
    return list;
  }

  function copyBoard(original) {
    return original.map(col => [...col]);
  }
});
