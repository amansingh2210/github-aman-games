// --- Reaction Speed Gameplay & Stats Logic ---

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const tapArea = document.getElementById('tap-area');
  const tapTitle = document.getElementById('tap-title');
  const tapDesc = document.getElementById('tap-desc');
  const tapIcon = document.getElementById('tap-icon');
  
  const hudBestReaction = document.getElementById('hud-best-reaction');
  const hudAvgReaction = document.getElementById('hud-avg-reaction');
  const hudAttempts = document.getElementById('hud-attempts');
  
  const logList = document.getElementById('log-list');
  const btnResetStats = document.getElementById('btn-reset-stats');

  // --- SVG Paths for States ---
  const iconPaths = {
    idle: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
    waiting: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>',
    ready: '<path d="M7 2v11h3v9l7-12h-4l4-8z"/>',
    result: '<path d="M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6l1.85-1.23A10 10 0 0 0 3.35 15a2 2 0 0 0 1.72 1h13.86a2 2 0 0 0 1.72-1 10 10 0 0 0-.27-6.43zM12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4zm0 6a2 2 0 1 1 2-2 2 2 0 0 1-2 2z"/>',
    early: '<path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z"/>'
  };

  // --- State Variables ---
  let currentState = 'idle'; // idle | waiting | ready | result | early
  let startTime = 0;
  let waitTimeout = null;
  let attemptsCount = 0;
  let attemptsResults = []; // stores recent 5 results
  
  // High scores tracking
  let bestScore = localStorage.getItem('reaction-best-score');
  
  // --- Initialize ---
  initGame();

  function initGame() {
    loadStats();
    
    // Tap Event (supports both mouse clicks and touch events)
    tapArea.addEventListener('mousedown', handleTapStart);
    tapArea.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Prevents delay and click triggering twice
      handleTapStart();
    });

    btnResetStats.addEventListener('click', () => {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      localStorage.removeItem('reaction-best-score');
      localStorage.removeItem('reaction-avg-score');
      localStorage.removeItem('reaction-log');
      attemptsResults = [];
      attemptsCount = 0;
      bestScore = null;
      loadStats();
      renderLogs();
    });
  }

  function loadStats() {
    bestScore = localStorage.getItem('reaction-best-score');
    const savedAvg = localStorage.getItem('reaction-avg-score');
    const savedLog = localStorage.getItem('reaction-log');

    hudBestReaction.innerText = bestScore ? `${bestScore} ms` : '--';
    hudAvgReaction.innerText = savedAvg ? `${savedAvg} ms` : '--';
    
    if (savedLog) {
      attemptsResults = JSON.parse(savedLog);
      attemptsCount = attemptsResults.filter(r => r.type === 'success').length % 5;
      if (attemptsCount === 0 && attemptsResults.length > 0) {
        // If they finished a set, display attempt text as "Complete"
        hudAttempts.innerText = "5 / 5";
      } else {
        hudAttempts.innerText = `${attemptsCount} / 5`;
      }
    } else {
      attemptsResults = [];
      attemptsCount = 0;
      hudAttempts.innerText = "0 / 5";
    }
  }

  function handleTapStart() {
    if (currentState === 'idle') {
      startWaiting();
    } else if (currentState === 'waiting') {
      triggerEarlyClick();
    } else if (currentState === 'ready') {
      triggerSuccessClick();
    } else if (currentState === 'result' || currentState === 'early') {
      resetToIdle();
    }
  }

  // --- State Transitions ---

  // 1. Idle -> Waiting
  function startWaiting() {
    currentState = 'waiting';
    tapArea.className = 'tap-area state-waiting';
    tapTitle.innerText = 'Wait for Green...';
    tapDesc.innerText = 'Do not tap yet. Keep your focus on the panel.';
    setPath(iconPaths.waiting);
    
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playClick();
    }

    // Set random delay between 1.5s and 5.0s
    const randomDelay = Math.random() * 3500 + 1500;
    waitTimeout = setTimeout(triggerReadyState, randomDelay);
  }

  // 2. Waiting -> Ready
  function triggerReadyState() {
    currentState = 'ready';
    tapArea.className = 'tap-area state-ready';
    tapTitle.innerText = 'TAP NOW!';
    tapDesc.innerText = 'TAP AS FAST AS YOU CAN!';
    setPath(iconPaths.ready);
    
    // Play timer beep immediately to alert user
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playTimerBeep();
    }

    startTime = performance.now();
  }

  // 3. Waiting -> Early Fail (Clicked too early)
  function triggerEarlyClick() {
    clearTimeout(waitTimeout);
    currentState = 'early';
    tapArea.className = 'tap-area state-early';
    tapTitle.innerText = 'Too Early!';
    tapDesc.innerText = 'You clicked before the panel turned green. Tap to try again.';
    setPath(iconPaths.early);

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playFail();
    }

    logAttempt('fail', null);
  }

  // 4. Ready -> Result (Success reaction)
  function triggerSuccessClick() {
    const endTime = performance.now();
    const reactionTime = Math.round(endTime - startTime);
    
    currentState = 'result';
    tapArea.className = 'tap-area state-result';
    tapTitle.innerText = `${reactionTime} ms`;
    tapDesc.innerText = 'Tap/Click anywhere in this panel to try again.';
    setPath(iconPaths.result);

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playSuccess();
    }

    // Update best score
    if (!bestScore || reactionTime < parseInt(bestScore, 10)) {
      bestScore = reactionTime;
      localStorage.setItem('reaction-best-score', bestScore.toString());
      hudBestReaction.innerText = `${bestScore} ms`;
    }

    logAttempt('success', reactionTime);
  }

  // 5. Result/Early -> Idle
  function resetToIdle() {
    currentState = 'idle';
    tapArea.className = 'tap-area state-idle';
    tapTitle.innerText = 'Click to Start';
    tapDesc.innerText = 'Tap or click anywhere in this panel to begin the test.';
    setPath(iconPaths.idle);

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playClick();
    }
  }

  // --- Logging and Statistics ---
  function logAttempt(type, score) {
    // If a new 5-set starts, clear results array
    if (attemptsCount === 0) {
      attemptsResults = [];
    }

    if (type === 'success') {
      attemptsCount++;
      attemptsResults.push({ id: attemptsResults.length + 1, type, score });
      hudAttempts.innerText = `${attemptsCount} / 5`;
    } else {
      attemptsResults.push({ id: attemptsResults.length + 1, type, score: 'Early Click' });
    }

    // Increment overall games played count in dashboard
    const totalPlayed = parseInt(localStorage.getItem('reaction-total-played') || '0', 10);
    localStorage.setItem('reaction-total-played', (totalPlayed + 1).toString());

    // Save recent log to localStorage
    localStorage.setItem('reaction-log', JSON.stringify(attemptsResults));
    
    // Check if 5 successful clicks are complete
    if (attemptsCount === 5) {
      calculateSetAverage();
    }

    renderLogs();
  }

  function calculateSetAverage() {
    const successScores = attemptsResults
      .filter(r => r.type === 'success')
      .map(r => r.score);
      
    if (successScores.length > 0) {
      const sum = successScores.reduce((acc, val) => acc + val, 0);
      const avg = Math.round(sum / successScores.length);
      
      localStorage.setItem('reaction-avg-score', avg.toString());
      hudAvgReaction.innerText = `${avg} ms`;
      
      // Reset attempts back to 0 for next set
      attemptsCount = 0;
      
      if (typeof arcadeSounds !== 'undefined') {
        arcadeSounds.playWin(); // play nice arpeggio on completing the set
      }
    }
  }

  function renderLogs() {
    logList.innerHTML = '';
    
    if (attemptsResults.length === 0) {
      logList.innerHTML = '<div class="empty-log">No attempts yet. Complete 5 turns to calculate an official average!</div>';
      return;
    }

    // Render in reverse chronological order
    const reversed = [...attemptsResults].reverse();
    reversed.forEach(attempt => {
      const logItem = document.createElement('div');
      logItem.className = 'log-item';
      
      const isSuccess = attempt.type === 'success';
      const scoreStr = isSuccess ? `${attempt.score} ms` : attempt.score;
      
      logItem.innerHTML = `
        <span class="log-num">Attempt #${attempt.id}</span>
        <span class="log-val ${isSuccess ? 'success' : 'fail'}">${scoreStr}</span>
      `;
      logList.appendChild(logItem);
    });
  }

  // Helper to change SVG icon path
  function setPath(pathMarkup) {
    tapIcon.innerHTML = pathMarkup;
  }

  // Render log on start
  renderLogs();
});
