// --- Tic Tac Toe Gameplay and AI engine ---

document.addEventListener('DOMContentLoaded', () => {
  // --- Game Elements ---
  const boardEl = document.getElementById('board');
  const cells = document.querySelectorAll('.board-cell');
  const statusText = document.getElementById('status-text');
  const btnRestart = document.getElementById('btn-restart');
  const btnResetScores = document.getElementById('btn-reset-scores');
  
  // Game Mode & Difficulty Controls
  const btnModeAI = document.getElementById('mode-ai');
  const btnModePvP = document.getElementById('mode-pvp');
  const difficultyGroup = document.getElementById('difficulty-group');
  const diffButtons = document.querySelectorAll('.diff-btn');
  
  // Scoreboard Labels and Values
  const p1Label = document.getElementById('p1-label');
  const p2Label = document.getElementById('p2-label');
  const scoreXEl = document.getElementById('score-x');
  const scoreOEl = document.getElementById('score-o');
  const scoreTiesEl = document.getElementById('score-ties');

  // --- Game State Variables ---
  let boardState = Array(9).fill(null);
  let currentPlayer = 'X'; // Player X starts
  let gameActive = true;
  let isVsAI = true;
  let aiDifficulty = 'medium';
  
  // Scoreboard tracking
  let winsX = parseInt(localStorage.getItem('ttt-wins-x') || '0', 10);
  let winsO = parseInt(localStorage.getItem('ttt-wins-o') || '0', 10);
  let draws = parseInt(localStorage.getItem('ttt-draws') || '0', 10);

  // SVG Marker strings
  const xSVG = `
    <svg viewBox="0 0 100 100">
      <path class="draw-path x-path" d="M20,20 L80,80" stroke-width="8" stroke-dasharray="100" stroke-dashoffset="100"></path>
      <path class="draw-path x-path" d="M80,20 L20,80" stroke-width="8" stroke-dasharray="100" stroke-dashoffset="100" style="animation-delay: 0.12s"></path>
    </svg>`;
  const oSVG = `
    <svg viewBox="0 0 100 100">
      <circle class="draw-path o-path" cx="50" cy="50" r="30" stroke-width="8" stroke-dasharray="200" stroke-dashoffset="200"></circle>
    </svg>`;

  const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  // --- Initialize Game ---
  initGame();

  function initGame() {
    updateScoreboardUI();
    resetBoard();
    
    // Setup mode buttons
    btnModeAI.addEventListener('click', () => setGameMode(true));
    btnModePvP.addEventListener('click', () => setGameMode(false));
    
    // Setup difficulty buttons
    diffButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        diffButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        aiDifficulty = e.target.getAttribute('data-diff');
        playClickSound();
        resetBoard();
      });
    });

    // Board cell clicks
    cells.forEach(cell => {
      cell.addEventListener('click', handleCellClick);
    });

    // Reset button actions
    btnRestart.addEventListener('click', () => {
      playClickSound();
      resetBoard();
    });
    
    btnResetScores.addEventListener('click', () => {
      playClickSound();
      winsX = 0;
      winsO = 0;
      draws = 0;
      localStorage.setItem('ttt-wins-x', '0');
      localStorage.setItem('ttt-wins-o', '0');
      localStorage.setItem('ttt-draws', '0');
      updateScoreboardUI();
    });
  }

  function playClickSound() {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
  }

  function setGameMode(vsAI) {
    if (isVsAI === vsAI) return;
    playClickSound();
    isVsAI = vsAI;
    
    if (isVsAI) {
      btnModeAI.classList.add('active');
      btnModePvP.classList.remove('active');
      difficultyGroup.style.display = 'flex';
      p1Label.innerText = "PLAYER X";
      p2Label.innerText = "COMPUTER (O)";
    } else {
      btnModeAI.classList.remove('active');
      btnModePvP.classList.add('active');
      difficultyGroup.style.display = 'none';
      p1Label.innerText = "PLAYER X";
      p2Label.innerText = "PLAYER O";
    }
    
    resetBoard();
  }

  function updateScoreboardUI() {
    scoreXEl.innerText = winsX;
    scoreOEl.innerText = winsO;
    scoreTiesEl.innerText = draws;
  }

  function resetBoard() {
    boardState.fill(null);
    currentPlayer = 'X';
    gameActive = true;
    
    cells.forEach(cell => {
      cell.innerHTML = '';
      cell.className = 'board-cell';
      cell.removeAttribute('disabled');
    });

    boardEl.className = 'game-board player-x-turn';
    
    statusText.innerText = "PLAYER X'S TURN";
    statusText.className = "status-banner x-turn";
  }

  // --- Turn Management ---
  function handleCellClick(e) {
    const cell = e.target.closest('.board-cell');
    const index = parseInt(cell.getAttribute('data-index'), 10);
    
    // Ignore click if cell already occupied or game inactive or computer is thinking
    if (boardState[index] || !gameActive || (isVsAI && currentPlayer === 'O')) {
      return;
    }

    makeMove(index, 'X');
    
    if (gameActive && isVsAI) {
      // Trigger AI move with a slight delay for realism
      setTimeout(makeAIMove, 600);
    }
  }

  function makeMove(index, player) {
    boardState[index] = player;
    const cell = cells[index];
    cell.innerHTML = player === 'X' ? xSVG : oSVG;
    cell.setAttribute('disabled', 'true');
    cell.classList.add(player === 'X' ? 'x-cell' : 'o-cell');
    
    // Play placement sound
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playClick();
    }

    if (checkWin(boardState, player)) {
      handleGameOver(player);
    } else if (boardState.every(cell => cell !== null)) {
      handleGameOver('tie');
    } else {
      // Toggle active player
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      
      // Update Board Hover indicators & status banner
      if (currentPlayer === 'X') {
        boardEl.className = 'game-board player-x-turn';
        statusText.innerText = isVsAI ? "YOUR TURN (X)" : "PLAYER X'S TURN";
        statusText.className = "status-banner x-turn";
      } else {
        boardEl.className = 'game-board player-o-turn';
        statusText.innerText = isVsAI ? "COMPUTER IS THINKING..." : "PLAYER O'S TURN";
        statusText.className = "status-banner o-turn";
      }
    }
  }

  // Check if a player has won
  function checkWin(board, player) {
    return winConditions.some(condition => {
      return condition.every(index => board[index] === player);
    });
  }

  // Get winning combinations index
  function getWinLine(board, player) {
    return winConditions.find(condition => {
      return condition.every(index => board[index] === player);
    }) || null;
  }

  function handleGameOver(winner) {
    gameActive = false;
    cells.forEach(cell => cell.setAttribute('disabled', 'true'));
    
    if (winner === 'tie') {
      statusText.innerText = "MATCH TIED!";
      statusText.className = "status-banner";
      draws++;
      localStorage.setItem('ttt-draws', draws.toString());
      if (typeof arcadeSounds !== 'undefined') {
        arcadeSounds.playWhoosh(); // soft neutral sound
      }
    } else {
      const winningLine = getWinLine(boardState, winner);
      if (winningLine) {
        winningLine.forEach(index => {
          cells[index].classList.add('winner');
        });
      }

      if (winner === 'X') {
        statusText.innerText = isVsAI ? "YOU WIN!" : "PLAYER X WINS!";
        statusText.className = "status-banner x-turn";
        winsX++;
        localStorage.setItem('ttt-wins-x', winsX.toString());
        
        if (typeof arcadeSounds !== 'undefined') {
          // Beat AI gets premium victory fanfare, PVP wins get normal success sound
          if (isVsAI) arcadeSounds.playWin();
          else arcadeSounds.playSuccess();
        }
      } else {
        statusText.innerText = isVsAI ? "COMPUTER WINS!" : "PLAYER O WINS!";
        statusText.className = "status-banner o-turn";
        winsO++;
        localStorage.setItem('ttt-wins-o', winsO.toString());
        
        if (typeof arcadeSounds !== 'undefined') {
          if (isVsAI) arcadeSounds.playFail(); // sad chord
          else arcadeSounds.playSuccess();
        }
      }
    }
    
    updateScoreboardUI();
  }

  // --- AI Implementation ---
  function makeAIMove() {
    if (!gameActive) return;
    
    let move;
    if (aiDifficulty === 'easy') {
      move = getRandomMove();
    } else if (aiDifficulty === 'medium') {
      // Medium difficulty: 55% chance smart strategic move, 45% random
      if (Math.random() < 0.55) {
        move = getStrategicMove();
      } else {
        move = getRandomMove();
      }
    } else {
      // Unbeatable Hard: uses minimax
      move = getBestMinimaxMove();
    }
    
    if (move !== undefined && move !== null) {
      makeMove(move, 'O');
    }
  }

  function getRandomMove() {
    const availableMoves = boardState
      .map((val, idx) => val === null ? idx : null)
      .filter(val => val !== null);
      
    if (availableMoves.length === 0) return null;
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  function getStrategicMove() {
    // 1. Can AI win in one move?
    for (let i = 0; i < 9; i++) {
      if (boardState[i] === null) {
        let tempBoard = [...boardState];
        tempBoard[i] = 'O';
        if (checkWin(tempBoard, 'O')) return i;
      }
    }

    // 2. Can player win in one move? (AI blocks)
    for (let i = 0; i < 9; i++) {
      if (boardState[i] === null) {
        let tempBoard = [...boardState];
        tempBoard[i] = 'X';
        if (checkWin(tempBoard, 'X')) return i;
      }
    }

    // 3. Take center if open
    if (boardState[4] === null) return 4;

    // 4. Take corners if open
    const corners = [0, 2, 6, 8];
    const openCorners = corners.filter(c => boardState[c] === null);
    if (openCorners.length > 0) {
      return openCorners[Math.floor(Math.random() * openCorners.length)];
    }

    // 5. Fallback to random
    return getRandomMove();
  }

  function getBestMinimaxMove() {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
      if (boardState[i] === null) {
        boardState[i] = 'O'; // Try move
        let score = minimax(boardState, 0, false);
        boardState[i] = null; // Undo move
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }
    return bestMove;
  }

  function minimax(tempBoard, depth, isMaximizing) {
    // Evaluate current board
    if (checkWin(tempBoard, 'O')) return 10 - depth;
    if (checkWin(tempBoard, 'X')) return depth - 10;
    if (tempBoard.every(cell => cell !== null)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'O';
          let score = minimax(tempBoard, depth + 1, false);
          tempBoard[i] = null;
          bestScore = Math.max(bestScore, score);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = 'X';
          let score = minimax(tempBoard, depth + 1, true);
          tempBoard[i] = null;
          bestScore = Math.min(bestScore, score);
        }
      }
      return bestScore;
    }
  }
});
