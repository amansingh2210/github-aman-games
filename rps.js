// --- Rock Paper Scissors Game & Adaptive AI ---

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const modeAiBtn = document.getElementById('mode-ai');
  const modePvpBtn = document.getElementById('mode-pvp');
  
  const p1Label = document.getElementById('p1-label');
  const p2Label = document.getElementById('p2-label');
  
  const scoreP1Val = document.getElementById('score-p1');
  const scoreTiesVal = document.getElementById('score-ties');
  const scoreP2Val = document.getElementById('score-p2');
  
  const p1Slot = document.getElementById('p1-slot');
  const p2Slot = document.getElementById('p2-slot');
  const p1Weapon = document.getElementById('p1-weapon');
  const p2Weapon = document.getElementById('p2-weapon');
  const p1SlotLabel = document.getElementById('p1-slot-label');
  const p2SlotLabel = document.getElementById('p2-slot-label');
  
  const roundResult = document.getElementById('round-result');
  const weaponsChoices = document.getElementById('weapons-choices');
  const btnResetScores = document.getElementById('btn-reset-scores');

  // --- Constants ---
  const WEAPONS = {
    rock: { emoji: '✊', beats: 'scissors' },
    paper: { emoji: '✋', beats: 'rock' },
    scissors: { emoji: '✌️', beats: 'paper' }
  };

  // --- Game State ---
  let isAiMode = true;
  let scoreP1 = parseInt(localStorage.getItem('rps-score-p1') || '0', 10);
  let scoreTies = parseInt(localStorage.getItem('rps-score-ties') || '0', 10);
  let scoreP2 = parseInt(localStorage.getItem('rps-score-p2') || '0', 10);

  let isFighting = false;
  let p1Choice = null;
  let p2Choice = null;

  // PvP state variables
  let p1Locked = false;
  let p2Locked = false;

  // --- Adaptive AI (Markov Chain Predictor) ---
  // We track the transition from the previous move to the current move.
  // transitionMatrix[prevMove][currentMove]
  let prevUserChoice = null;
  const transitionMatrix = {
    rock: { rock: 1, paper: 1, scissors: 1 },
    paper: { rock: 1, paper: 1, scissors: 1 },
    scissors: { rock: 1, paper: 1, scissors: 1 }
  };

  // --- Initialize ---
  initGame();

  function initGame() {
    // Load Scores
    scoreP1Val.innerText = scoreP1;
    scoreTiesVal.innerText = scoreTies;
    scoreP2Val.innerText = scoreP2;

    // Mode setup
    modeAiBtn.addEventListener('click', () => {
      if (isFighting) return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      modeAiBtn.classList.add('active');
      modePvpBtn.classList.remove('active');
      isAiMode = true;
      p2Label.innerText = "ADAPTIVE CPU";
      resetArena();
    });

    modePvpBtn.addEventListener('click', () => {
      if (isFighting) return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      modePvpBtn.classList.add('active');
      modeAiBtn.classList.remove('active');
      isAiMode = false;
      p2Label.innerText = "PLAYER 2";
      resetArena();
    });

    // Weapon clicks
    const weaponButtons = weaponsChoices.querySelectorAll('.weapon-card');
    weaponButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.weapon;
        handleWeaponSelect(choice);
      });
    });

    // Reset scores
    btnResetScores.addEventListener('click', () => {
      if (isFighting) return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      localStorage.setItem('rps-score-p1', '0');
      localStorage.setItem('rps-score-ties', '0');
      localStorage.setItem('rps-score-p2', '0');
      scoreP1 = 0;
      scoreTies = 0;
      scoreP2 = 0;
      scoreP1Val.innerText = 0;
      scoreTiesVal.innerText = 0;
      scoreP2Val.innerText = 0;
    });

    resetArena();
  }

  function resetArena() {
    isFighting = false;
    p1Choice = null;
    p2Choice = null;
    p1Locked = false;
    p2Locked = false;

    p1Weapon.innerText = '?';
    p2Weapon.innerText = '?';
    p1Weapon.className = 'weapon-icon';
    p2Weapon.className = 'weapon-icon';

    if (isAiMode) {
      p1SlotLabel.innerText = "YOUR WEAPON";
      p2SlotLabel.innerText = "CPU WEAPON";
      roundResult.innerText = "CHOOSE YOUR WEAPON";
      roundResult.className = "result-banner";
    } else {
      p1SlotLabel.innerText = "P1 SELECTING";
      p2SlotLabel.innerText = "P2 SELECTING";
      roundResult.innerText = "PLAYER 1: SELECT YOUR WEAPON";
      roundResult.className = "result-banner";
    }
  }

  function handleWeaponSelect(choice) {
    if (isFighting) return;

    if (isAiMode) {
      // VS COMPUTER MODE
      p1Choice = choice;
      runBattle();
    } else {
      // 2 PLAYERS LOCAL PVP
      if (!p1Locked) {
        p1Choice = choice;
        p1Locked = true;
        
        // Hide Choice but show locked
        p1Weapon.innerText = '🔒';
        p1Weapon.classList.add('active');
        p1SlotLabel.innerText = "P1 LOCKED";
        
        if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();

        roundResult.innerText = "PLAYER 2: SELECT YOUR WEAPON";
      } else if (!p2Locked) {
        p2Choice = choice;
        p2Locked = true;
        
        p2Weapon.innerText = '🔒';
        p2Weapon.classList.add('active');
        p2SlotLabel.innerText = "P2 LOCKED";
        
        if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
        
        runBattle();
      }
    }
  }

  // --- Battle Animation Loop ---

  function runBattle() {
    isFighting = true;

    // Determine CPU Choice if in AI mode
    if (isAiMode) {
      p2Choice = getCpuPrediction();
    }

    // Set hands to shaking fists during countdown
    p1Weapon.innerText = '✊';
    p2Weapon.innerText = '✊';
    p1Weapon.classList.add('shake-p1', 'active');
    p2Weapon.classList.add('shake-p2', 'active');

    roundResult.innerText = "READY...";

    // Play ticking countdown sounds
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playTimerBeep();
      setTimeout(() => arcadeSounds.playTimerBeep(), 250);
      setTimeout(() => arcadeSounds.playTone(600, 'sine', 0.15, 0.1), 500);
    }

    // Reveal after 700ms
    setTimeout(() => {
      revealBattleResults();
    }, 700);
  }

  function revealBattleResults() {
    // Stop shaking
    p1Weapon.classList.remove('shake-p1');
    p2Weapon.classList.remove('shake-p2');

    // Show weapons
    p1Weapon.innerText = WEAPONS[p1Choice].emoji;
    p2Weapon.innerText = WEAPONS[p2Choice].emoji;

    // Evaluate Winner
    const p1Beats = WEAPONS[p1Choice].beats;
    const p2Beats = WEAPONS[p2Choice].beats;

    let result = ''; // win | lose | draw

    if (p1Choice === p2Choice) {
      result = 'draw';
    } else if (p1Beats === p2Choice) {
      result = 'win';
    } else {
      result = 'lose';
    }

    // Update Scores & UI
    if (result === 'win') {
      scoreP1++;
      localStorage.setItem('rps-score-p1', scoreP1.toString());
      scoreP1Val.innerText = scoreP1;
      
      roundResult.innerText = isAiMode ? "YOU WIN!" : "PLAYER 1 WINS!";
      roundResult.className = "result-banner win";

      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playSuccess();
    } else if (result === 'lose') {
      scoreP2++;
      localStorage.setItem('rps-score-p2', scoreP2.toString());
      scoreP2Val.innerText = scoreP2;
      
      roundResult.innerText = isAiMode ? "COMPUTER WINS!" : "PLAYER 2 WINS!";
      roundResult.className = "result-banner lose";

      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playFail();
    } else {
      scoreTies++;
      localStorage.setItem('rps-score-ties', scoreTies.toString());
      scoreTiesVal.innerText = scoreTies;
      
      roundResult.innerText = "IT'S A DRAW!";
      roundResult.className = "result-banner draw";

      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playWhoosh();
    }

    // Increment overall plays
    const totalPlayed = parseInt(localStorage.getItem('rps-total-played') || '0', 10);
    localStorage.setItem('rps-total-played', (totalPlayed + 1).toString());

    // Train Adaptive AI (Markov Chain)
    if (isAiMode) {
      if (prevUserChoice !== null) {
        // Increment transition count: prevMove -> currentMove
        transitionMatrix[prevUserChoice][p1Choice]++;
      }
      prevUserChoice = p1Choice;
    }

    // Wait 2.5s then reset arena
    setTimeout(() => {
      resetArena();
    }, 2200);
  }

  // --- Markov Chain Predictor Logic ---

  function getCpuPrediction() {
    const options = ['rock', 'paper', 'scissors'];

    // If first turn, pick random
    if (prevUserChoice === null) {
      return options[Math.floor(Math.random() * 3)];
    }

    // Query transitions from user's last move
    const transitions = transitionMatrix[prevUserChoice];

    // Find user's most likely next choice
    let predictedUserChoice = 'rock';
    let maxCount = -1;

    options.forEach(opt => {
      if (transitions[opt] > maxCount) {
        maxCount = transitions[opt];
        predictedUserChoice = opt;
      } else if (transitions[opt] === maxCount) {
        // Break ties randomly
        if (Math.random() < 0.5) {
          predictedUserChoice = opt;
        }
      }
    });

    // CPU picks the counter to the predicted user choice
    // e.g. if user is predicted to play 'rock', CPU plays 'paper'
    if (predictedUserChoice === 'rock') return 'paper';
    if (predictedUserChoice === 'paper') return 'scissors';
    return 'rock';
  }
});
