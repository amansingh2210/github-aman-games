// --- Whack-A-Mole Gameplay Engine ---

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const holes = document.querySelectorAll('.mole-hole');
  const gridContainer = document.querySelector('.grid-container');
  
  const scoreVal = document.getElementById('current-score');
  const timerVal = document.getElementById('time-left');
  const highScoreVal = document.getElementById('high-score');
  
  const gameOverlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');
  
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');

  // --- Game Config & State ---
  let score = 0;
  let timeLeft = 30; // 30 seconds match
  let highScore = parseInt(localStorage.getItem('whack-high-score') || '0', 10);
  
  let isPlaying = false;
  let gameTimer = null;
  let moleTimer = null;
  let activeHoleIdx = -1;
  let currentMoleType = 'normal'; // normal | golden | bomb
  let moleUpTimeout = null;

  // Initialize
  highScoreVal.innerText = highScore;

  // --- Event Listeners ---
  btnStart.addEventListener('click', startGame);
  btnRestart.addEventListener('click', () => {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    endGame();
    startGame();
  });

  // Whacking action
  holes.forEach(hole => {
    const mole = hole.querySelector('.mole');
    
    // Support mouse and touch
    const whack = (e) => {
      e.preventDefault();
      handleMoleWhack(hole);
    };

    mole.addEventListener('mousedown', whack);
    mole.addEventListener('touchstart', whack);
  });

  // --- Game Loop Management ---

  function startGame() {
    if (isPlaying) return;
    
    isPlaying = true;
    score = 0;
    timeLeft = 30;
    scoreVal.innerText = score;
    timerVal.innerText = `${timeLeft}s`;
    
    gameOverlay.classList.add('hidden');
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();

    // Increment total played count
    const whackPlays = parseInt(localStorage.getItem('whack-total-played') || '0', 10);
    localStorage.setItem('whack-total-played', (whackPlays + 1).toString());

    // Timers
    gameTimer = setInterval(updateTimer, 1000);
    spawnMoleCycle();
  }

  function updateTimer() {
    timeLeft--;
    timerVal.innerText = `${timeLeft}s`;

    if (timeLeft <= 0) {
      endGame();
    }
  }

  function endGame() {
    isPlaying = false;
    clearInterval(gameTimer);
    clearTimeout(moleTimer);
    clearTimeout(moleUpTimeout);

    // Retract any active mole
    holes.forEach(h => h.querySelector('.mole').className = 'mole');

    // Display overlay
    overlayTitle.innerText = "MATCH OVER";
    overlayDesc.innerText = `You scored ${score} points!`;
    gameOverlay.classList.remove('hidden');

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playWin();
    }
  }

  // --- Spawning Logic ---

  function spawnMoleCycle() {
    if (!isPlaying) return;

    // Remove classes from all moles to retract them
    holes.forEach(h => h.querySelector('.mole').className = 'mole');

    // Pick a new random hole (ensure it's different from the last one)
    let nextHoleIdx = activeHoleIdx;
    while (nextHoleIdx === activeHoleIdx) {
      nextHoleIdx = Math.floor(Math.random() * holes.length);
    }
    activeHoleIdx = nextHoleIdx;

    const hole = holes[activeHoleIdx];
    const mole = hole.querySelector('.mole');

    // Determine type: 70% Normal, 15% Golden, 15% Bomb
    const rand = Math.random();
    if (rand < 0.70) {
      currentMoleType = 'normal';
      mole.className = 'mole up';
    } else if (rand < 0.85) {
      currentMoleType = 'golden';
      mole.className = 'mole golden up';
    } else {
      currentMoleType = 'bomb';
      mole.className = 'mole bomb up';
    }

    // Dynamic duration based on score (gets faster)
    let moleUpDuration = 1000 - Math.min(450, score * 3); // Normal mole stays up between 1000ms and 550ms
    if (currentMoleType === 'golden') {
      moleUpDuration *= 0.65; // Golden mole is 35% faster
    } else if (currentMoleType === 'bomb') {
      moleUpDuration *= 0.8; // Bomb stays up slightly less
    }

    // Set timeout to retract mole if not whacked
    moleUpTimeout = setTimeout(() => {
      mole.classList.remove('up');
      
      // Delay before next mole pops up
      let delayBeforeNext = 300 + Math.random() * 500;
      moleTimer = setTimeout(spawnMoleCycle, delayBeforeNext);
    }, moleUpDuration);
  }

  // --- Whacking Actions ---

  function handleMoleWhack(hole) {
    const mole = hole.querySelector('.mole');

    // If mole is not popped up or already whacked, ignore
    if (!mole.classList.contains('up') || mole.classList.contains('whacked')) {
      return;
    }

    // Retract mole immediately
    mole.classList.add('whacked');
    clearTimeout(moleUpTimeout);

    if (currentMoleType === 'normal') {
      score += 10;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    } else if (currentMoleType === 'golden') {
      score += 30;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playSuccess();
    } else if (currentMoleType === 'bomb') {
      score = Math.max(0, score - 20);
      
      // Shake Screen
      gridContainer.classList.add('screen-shake');
      setTimeout(() => {
        gridContainer.classList.remove('screen-shake');
      }, 300);

      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playFail();
    }

    scoreVal.innerText = score;

    // Check High Score
    if (score > highScore) {
      highScore = score;
      highScoreVal.innerText = highScore;
      localStorage.setItem('whack-high-score', highScore.toString());
    }

    // Spawn next mole immediately after a small hit reaction delay
    moleTimer = setTimeout(spawnMoleCycle, 150);
  }
});
