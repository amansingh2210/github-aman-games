// --- Memory Flip Gameplay Logic ---

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const cardGrid = document.getElementById('card-grid');
  const hudMoves = document.getElementById('hud-moves');
  const hudTime = document.getElementById('hud-time');
  const hudBestTime = document.getElementById('hud-best-time');
  const hudBestMoves = document.getElementById('hud-best-moves');
  const btnRestart = document.getElementById('btn-restart');
  const btnResetBest = document.getElementById('btn-reset-best');

  // --- Game Settings & Symbols ---
  // 8 arcade/retro emojis for matching
  const symbols = ['👾', '🎮', '🕹️', '🪙', '💎', '🚀', '🏆', '⚔️'];
  let deck = [...symbols, ...symbols];

  // --- Game State Variables ---
  let flippedCards = [];
  let moves = 0;
  let timeElapsed = 0;
  let timerInterval = null;
  let timerStarted = false;
  let isProcessing = false;
  let matchedPairs = 0;

  // Question Mark SVG for card back
  const questionMarkSVG = `
    <svg viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
    </svg>`;

  // --- Initialize Game ---
  initGame();

  function initGame() {
    loadBestScores();
    setupNewGame();

    btnRestart.addEventListener('click', () => {
      playClickSound();
      setupNewGame();
    });

    btnResetBest.addEventListener('click', () => {
      playClickSound();
      localStorage.removeItem('memory-best-time');
      localStorage.removeItem('memory-best-moves');
      loadBestScores();
    });
  }

  function playClickSound() {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
  }

  function loadBestScores() {
    const bestTime = localStorage.getItem('memory-best-time');
    const bestMoves = localStorage.getItem('memory-best-moves');
    
    hudBestTime.innerText = bestTime ? `${bestTime}s` : '--';
    hudBestMoves.innerText = bestMoves ? bestMoves : '--';
  }

  function setupNewGame() {
    // Reset state variables
    flippedCards = [];
    moves = 0;
    timeElapsed = 0;
    matchedPairs = 0;
    isProcessing = false;
    timerStarted = false;
    
    clearInterval(timerInterval);
    hudMoves.innerText = '0';
    hudTime.innerText = '00:00';

    // Shuffle deck
    shuffleDeck();
    
    // Build Grid
    buildCardGrid();
  }

  // Fisher-Yates Shuffling Algorithm
  function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function buildCardGrid() {
    cardGrid.innerHTML = '';
    
    deck.forEach((symbol, index) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.setAttribute('data-symbol', symbol);
      card.setAttribute('data-index', index);
      card.setAttribute('aria-label', `Card ${index + 1}`);

      card.innerHTML = `
        <div class="card-inner">
          <div class="card-front">${symbol}</div>
          <div class="card-back">${questionMarkSVG}</div>
        </div>
      `;

      card.addEventListener('click', () => handleCardClick(card));
      cardGrid.appendChild(card);
    });
  }

  // --- Gameplay Interactions ---
  function handleCardClick(card) {
    // Avoid double clicks, clicks on already matched cards, or clicks during flip cooldown
    if (
      isProcessing || 
      card.classList.contains('flipped') || 
      card.classList.contains('matched')
    ) {
      return;
    }

    // Start timer on first card click
    if (!timerStarted) {
      startTimer();
    }

    // Play whoosh sound for flip
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playWhoosh();
    }

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      isProcessing = true;
      moves++;
      hudMoves.innerText = moves;
      
      checkMatch();
    }
  }

  function checkMatch() {
    const [card1, card2] = flippedCards;
    const symbol1 = card1.getAttribute('data-symbol');
    const symbol2 = card2.getAttribute('data-symbol');

    if (symbol1 === symbol2) {
      // It's a match!
      setTimeout(() => {
        card1.classList.add('matched');
        card2.classList.add('matched');
        
        if (typeof arcadeSounds !== 'undefined') {
          arcadeSounds.playSuccess();
        }

        matchedPairs++;
        flippedCards = [];
        isProcessing = false;

        // Check Win Condition
        if (matchedPairs === symbols.length) {
          handleGameWin();
        }
      }, 300);
    } else {
      // Mismatch
      setTimeout(() => {
        card1.classList.add('shake');
        card2.classList.add('shake');
        
        if (typeof arcadeSounds !== 'undefined') {
          arcadeSounds.playFail(); // soft buzz
        }
      }, 300);

      // Flip back after delay
      setTimeout(() => {
        card1.classList.remove('flipped', 'shake');
        card2.classList.remove('flipped', 'shake');
        
        flippedCards = [];
        isProcessing = false;
      }, 1200);
    }
  }

  function handleGameWin() {
    clearInterval(timerInterval);
    
    // Save total games played statistic
    const totalPlayed = parseInt(localStorage.getItem('memory-total-played') || '0', 10);
    localStorage.setItem('memory-total-played', (totalPlayed + 1).toString());

    // Play victory sound
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playWin();
    }

    // Check & save highscores
    const bestTime = localStorage.getItem('memory-best-time');
    const bestMoves = localStorage.getItem('memory-best-moves');

    let newBestTime = false;
    let newBestMoves = false;

    if (!bestTime || timeElapsed < parseInt(bestTime, 10)) {
      localStorage.setItem('memory-best-time', timeElapsed.toString());
      newBestTime = true;
    }

    if (!bestMoves || moves < parseInt(bestMoves, 10)) {
      localStorage.setItem('memory-best-moves', moves.toString());
      newBestMoves = true;
    }

    // Update HUD
    loadBestScores();

    // Visual celebration banner
    setTimeout(() => {
      alert(`🎉 Congratulations! You cleared the board!\n\nTime: ${timeElapsed} seconds\nMoves: ${moves}\n\n${newBestTime ? "🔥 NEW BEST TIME!" : ""}\n${newBestMoves ? "🔥 NEW BEST MOVES!" : ""}`);
    }, 500);
  }

  // --- Timer Utility ---
  function startTimer() {
    timerStarted = true;
    timeElapsed = 0;
    timerInterval = setInterval(() => {
      timeElapsed++;
      hudTime.innerText = formatTime(timeElapsed);
    }, 1000);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
});
