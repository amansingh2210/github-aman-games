// --- Mr. White Social Party Game Logic ---

document.addEventListener('DOMContentLoaded', () => {
  // --- Word Pairs Database ---
  const WORD_PAIRS = [
    { civ: "apple", und: "pear", decoys: ["banana", "orange", "grape"] },
    { civ: "football", und: "rugby", decoys: ["cricket", "basketball", "tennis"] },
    { civ: "laptop", und: "tablet", decoys: ["monitor", "keyboard", "desktop"] },
    { civ: "cat", und: "dog", decoys: ["lion", "wolf", "rabbit"] },
    { civ: "sun", und: "moon", decoys: ["star", "planet", "galaxy"] },
    { civ: "guitar", und: "violin", decoys: ["piano", "drums", "flute"] },
    { civ: "coffee", und: "tea", decoys: ["milk", "juice", "soda"] },
    { civ: "running", und: "jogging", decoys: ["swimming", "jumping", "walking"] }
  ];

  // --- UI Screens ---
  const screenSetup = document.getElementById('setup-screen');
  const screenReveal = document.getElementById('reveal-screen');
  const screenBoard = document.getElementById('game-board');
  const screenGuess = document.getElementById('guess-screen');
  const screenSummary = document.getElementById('summary-screen');

  // Setup inputs
  const playerNameInput = document.getElementById('player-name-input');
  const btnAddPlayer = document.getElementById('btn-add-player');
  const chipsContainer = document.getElementById('chips-container');
  const btnStartAssign = document.getElementById('btn-start-assign');

  // Reveal screen components
  const revealPromptUser = document.getElementById('reveal-prompt-user');
  const roleCardFlipper = document.getElementById('role-card-flipper');
  const cardRoleTitle = document.getElementById('card-role-title');
  const cardRoleWord = document.getElementById('card-role-word');
  const cardRoleDesc = document.getElementById('card-role-desc');
  const btnCardAction = document.getElementById('btn-card-action');

  // Board screen components
  const phaseTitle = document.getElementById('phase-title');
  const phaseDesc = document.getElementById('phase-desc');
  const survivorsContainer = document.getElementById('survivors-container');
  const boardActionsGroup = document.getElementById('board-actions-group');
  const btnGoToVote = document.getElementById('btn-go-to-vote');

  // Guess screen components
  const guessChoicesGrid = document.getElementById('guess-choices-grid');

  // Summary screen components
  const summaryWinnerTitle = document.getElementById('summary-winner-title');
  const summaryDetailsBox = document.getElementById('summary-details-box');
  const btnMrWhiteRestart = document.getElementById('btn-mrwhite-restart');

  // --- Game State Variables ---
  let playersList = []; // Strings of names
  let assignedPlayers = []; // Objects: { name, role: 'civilian'|'undercover'|'mrwhite', word, isAlive: true }
  let activeAssignIndex = 0;
  let isCardRevealed = false;
  
  let currentWordPair = null;
  let currentPhase = 'describe'; // describe | vote
  let descIndex = 0; // index of active player during describe phase

  // --- Setup Screen Event Handlers ---

  playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addPlayer();
    }
  });

  btnAddPlayer.addEventListener('click', addPlayer);

  function addPlayer() {
    const name = playerNameInput.value.trim();
    if (!name) return;

    if (playersList.length >= 10) {
      alert("Maximum 10 players allowed!");
      return;
    }

    if (playersList.includes(name)) {
      alert("Name must be unique!");
      return;
    }

    playersList.push(name);
    playerNameInput.value = '';
    playerNameInput.focus();

    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    renderChips();
    validateStartButton();
  }

  function renderChips() {
    chipsContainer.innerHTML = '';
    playersList.forEach((player, idx) => {
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.innerHTML = `
        <span>${player}</span>
        <span class="btn-remove-chip" data-idx="${idx}">&times;</span>
      `;
      chipsContainer.appendChild(chip);

      chip.querySelector('.btn-remove-chip').addEventListener('click', (e) => {
        const removeIdx = parseInt(e.target.dataset.idx, 10);
        playersList.splice(removeIdx, 1);
        if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
        renderChips();
        validateStartButton();
      });
    });
  }

  function validateStartButton() {
    btnStartAssign.disabled = (playersList.length < 3);
  }

  btnStartAssign.addEventListener('click', () => {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    setupRolesAndWords();
    startRoleAssignmentPhase();
  });

  // --- Role Assignment Mechanics ---

  function setupRolesAndWords() {
    // 1. Pick a random word pair
    currentWordPair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];

    // 2. Determine roles breakdown
    // 3 Players: 2 Civilians, 1 Mr. White (0 Undercover)
    // 4 Players: 2 Civilians, 1 Undercover, 1 Mr. White
    // 5 Players: 3 Civilians, 1 Undercover, 1 Mr. White
    // 6+ Players: rest Civilians, 1 Undercover, 1 Mr. White
    let roles = [];
    const count = playersList.length;

    roles.push('mrwhite'); // 1 Mr. White
    if (count >= 4) {
      roles.push('undercover'); // 1 Undercover
    }
    
    const threatsCount = roles.length;
    for (let i = 0; i < count - threatsCount; i++) {
      roles.push('civilian');
    }

    // Shuffle roles
    roles = shuffleArray(roles);

    // 3. Assign to players
    assignedPlayers = playersList.map((name, idx) => {
      const role = roles[idx];
      let word = '';
      if (role === 'civilian') word = currentWordPair.civ;
      else if (role === 'undercover') word = currentWordPair.und;
      else word = '???';

      return {
        name,
        role,
        word,
        isAlive: true
      };
    });

    activeAssignIndex = 0;
  }

  function startRoleAssignmentPhase() {
    screenSetup.classList.add('hidden');
    screenReveal.classList.remove('hidden');
    isCardRevealed = false;
    roleCardFlipper.classList.remove('flipped');
    
    // Register play in local storage
    const whitePlays = parseInt(localStorage.getItem('white-total-played') || '0', 10);
    localStorage.setItem('white-total-played', (whitePlays + 1).toString());

    loadRevealCard();
  }

  function loadRevealCard() {
    const player = assignedPlayers[activeAssignIndex];
    revealPromptUser.innerText = `${player.name.toUpperCase()}, TAKE THE DEVICE`;
    
    // Setup back of card contents
    if (player.role === 'civilian') {
      cardRoleTitle.innerText = "CIVILIAN";
      cardRoleTitle.className = "role-badge p1-active"; // Cyan themed
      cardRoleWord.innerText = player.word.toUpperCase();
      cardRoleDesc.innerText = "Describe this word in exactly ONE word/phrase. Keep it similar to others so Mr. White doesn't figure it out.";
    } else if (player.role === 'undercover') {
      cardRoleTitle.innerText = "UNDERCOVER";
      cardRoleTitle.className = "role-badge p2-active"; // Pink themed
      cardRoleWord.innerText = player.word.toUpperCase();
      cardRoleDesc.innerText = "You have a slightly different word than Civilians. Try to describe your word and blend in!";
    } else {
      cardRoleTitle.innerText = "MR. WHITE";
      cardRoleTitle.className = "role-badge p3-active"; // Yellow themed
      cardRoleWord.innerText = "???";
      cardRoleDesc.innerText = "You have NO word. Listen to other players' descriptions, bluff, and try to guess the secret word!";
    }

    isCardRevealed = false;
    roleCardFlipper.classList.remove('flipped');
    btnCardAction.innerText = "REVEAL WORD";
  }

  // Handle Card Reveal / Confirm click
  btnCardAction.addEventListener('click', () => {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();

    if (!isCardRevealed) {
      // Flip card to back
      roleCardFlipper.classList.add('flipped');
      isCardRevealed = true;
      btnCardAction.innerText = "I UNDERSTAND, HIDE";
    } else {
      // Advance to next player or start game
      activeAssignIndex++;
      if (activeAssignIndex < assignedPlayers.length) {
        loadRevealCard();
      } else {
        startGameBoardPhase();
      }
    }
  });

  // Tap on card itself flips it
  roleCardFlipper.addEventListener('click', () => {
    if (!isCardRevealed) {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      roleCardFlipper.classList.add('flipped');
      isCardRevealed = true;
      btnCardAction.innerText = "I UNDERSTAND, HIDE";
    }
  });

  // --- Game Board / Describe & Vote Phases ---

  function startGameBoardPhase() {
    screenReveal.classList.add('hidden');
    screenBoard.classList.remove('hidden');
    
    currentPhase = 'describe';
    descIndex = 0;
    
    // Find first alive player
    while (descIndex < assignedPlayers.length && !assignedPlayers[descIndex].isAlive) {
      descIndex++;
    }

    renderGameBoard();
  }

  function renderGameBoard() {
    if (currentPhase === 'describe') {
      phaseTitle.innerText = "DESCRIBE PHASE";
      phaseDesc.innerText = "Describe your secret word in exactly 1 word or phrase. Tap 'NEXT' after describing.";

      renderSurvivorsList();

      // Render Next Player button in action group
      const activePlayer = assignedPlayers[descIndex];
      boardActionsGroup.innerHTML = `
        <button class="btn-primary" id="btn-next-desc" style="width: 100%;">
          NEXT DESCRIBER (${activePlayer.name.toUpperCase()})
        </button>
      `;

      document.getElementById('btn-next-desc').addEventListener('click', () => {
        if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
        
        // Find next alive describer
        descIndex++;
        while (descIndex < assignedPlayers.length && !assignedPlayers[descIndex].isAlive) {
          descIndex++;
        }

        if (descIndex < assignedPlayers.length) {
          renderGameBoard();
        } else {
          // Go to voting phase
          currentPhase = 'vote';
          renderGameBoard();
        }
      });

    } else {
      // VOTE PHASE
      phaseTitle.innerText = "VOTING PHASE";
      phaseDesc.innerText = "Discuss the clues. Tap on the player you think is suspicious to vote them out!";

      renderSurvivorsList();

      // Clear action buttons (voting happens by tapping a row)
      boardActionsGroup.innerHTML = `
        <button class="btn-secondary" id="btn-back-to-describe" style="width: 100%;">
          REDO CLUES ROUND
        </button>
      `;

      document.getElementById('btn-back-to-describe').addEventListener('click', () => {
        if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
        currentPhase = 'describe';
        descIndex = 0;
        while (descIndex < assignedPlayers.length && !assignedPlayers[descIndex].isAlive) {
          descIndex++;
        }
        renderGameBoard();
      });
    }
  }

  function renderSurvivorsList() {
    survivorsContainer.innerHTML = '';
    
    assignedPlayers.forEach((player, idx) => {
      const row = document.createElement('div');
      
      let classes = 'survivor-row';
      let statusMarkup = '';

      if (!player.isAlive) {
        classes += ' dead';
        statusMarkup = `<span class="survivor-status voted-out">ELIMINATED (${player.role.toUpperCase()})</span>`;
      } else {
        if (currentPhase === 'describe' && idx === descIndex) {
          classes += ' active-turn';
          statusMarkup = `<span class="survivor-status alive">DESCRIBING...</span>`;
        } else {
          statusMarkup = `<span class="survivor-status alive">ALIVE</span>`;
        }

        if (currentPhase === 'vote') {
          classes += ' votable';
        }
      }

      row.className = classes;
      row.innerHTML = `
        <span class="survivor-name">${player.name}</span>
        ${statusMarkup}
      `;

      survivorsContainer.appendChild(row);

      // Handle voting click
      if (currentPhase === 'vote' && player.isAlive) {
        row.addEventListener('click', () => {
          handleVoteElimination(player);
        });
      }
    });
  }

  function handleVoteElimination(player) {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playFail();

    player.isAlive = false;
    alert(`${player.name.toUpperCase()} was voted out!\nTheir role was: ${player.role.toUpperCase()}`);

    // Check if Mr. White was voted out
    if (player.role === 'mrwhite') {
      startMrWhiteGuessingPhase();
    } else {
      checkGameWinStatus();
    }
  }

  // --- Win / Loss Evaluator ---

  function checkGameWinStatus() {
    const alivePlayers = assignedPlayers.filter(p => p.isAlive);
    const aliveThreats = alivePlayers.filter(p => p.role === 'mrwhite' || p.role === 'undercover');
    const aliveCivilians = alivePlayers.filter(p => p.role === 'civilian');

    // Civilians win if all threats (Mr. White + Undercover) are dead
    if (aliveThreats.length === 0) {
      endGameSummary('civilians');
      return;
    }

    // Threats win if surviving civilians is <= surviving threats
    if (aliveCivilians.length <= aliveThreats.length) {
      // Undercover wins if they are alive, otherwise Mr. White wins
      const undercoverAlive = alivePlayers.some(p => p.role === 'undercover');
      if (undercoverAlive) {
        endGameSummary('undercover');
      } else {
        endGameSummary('mrwhite');
      }
      return;
    }

    // If game continues, go back to description round
    currentPhase = 'describe';
    descIndex = 0;
    while (descIndex < assignedPlayers.length && !assignedPlayers[descIndex].isAlive) {
      descIndex++;
    }
    renderGameBoard();
  }

  // --- Mr. White Guessing Phase ---

  function startMrWhiteGuessingPhase() {
    screenBoard.classList.add('hidden');
    screenGuess.classList.remove('hidden');

    // Create 4 choices: civilian word, undercover word, and 2 random decoys
    const options = [
      currentWordPair.civ,
      currentWordPair.und,
      currentWordPair.decoys[0],
      currentWordPair.decoys[1]
    ];

    // Shuffle options
    const shuffledOptions = shuffleArray([...options]);

    guessChoicesGrid.innerHTML = '';
    shuffledOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'guess-choice-btn';
      btn.innerText = opt;
      guessChoicesGrid.appendChild(btn);

      btn.addEventListener('click', () => {
        handleMrWhiteGuess(opt);
      });
    });
  }

  function handleMrWhiteGuess(selectedWord) {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();

    if (selectedWord.toLowerCase() === currentWordPair.civ.toLowerCase()) {
      // Mr. White guessed the word correctly!
      alert(`CORRECT!\nMr. White guessed the Civilians' word: "${currentWordPair.civ.toUpperCase()}"!`);
      endGameSummary('mrwhite');
    } else {
      alert(`INCORRECT!\nMr. White guessed: "${selectedWord.toUpperCase()}".\nThe actual Civilian word was: "${currentWordPair.civ.toUpperCase()}"!`);
      // check if undercover is still alive to see who wins
      const undercoverAlive = assignedPlayers.some(p => p.role === 'undercover' && p.isAlive);
      if (undercoverAlive) {
        endGameSummary('undercover');
      } else {
        endGameSummary('civilians');
      }
    }
  }

  // --- End Summary Screen ---

  function endGameSummary(winnerGroup) {
    screenBoard.classList.add('hidden');
    screenGuess.classList.add('hidden');
    screenReveal.classList.add('hidden');
    screenSummary.classList.remove('hidden');

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playWin();
    }

    if (winnerGroup === 'civilians') {
      summaryWinnerTitle.innerText = "CIVILIANS WIN!";
      summaryWinnerTitle.className = "win-civ";
    } else if (winnerGroup === 'undercover') {
      summaryWinnerTitle.innerText = "UNDERCOVER AGENT WINS!";
      summaryWinnerTitle.className = "win-und";
    } else {
      summaryWinnerTitle.innerText = "MR. WHITE WINS!";
      summaryWinnerTitle.className = "win-whi";
    }

    // Build role assignments detail table
    summaryDetailsBox.innerHTML = '';
    assignedPlayers.forEach(player => {
      const row = document.createElement('div');
      row.className = 'summary-row';
      
      let roleClass = '';
      if (player.role === 'civilian') roleClass = 'civilian';
      else if (player.role === 'undercover') roleClass = 'undercover';
      else roleClass = 'mrwhite';

      row.innerHTML = `
        <span style="font-weight:600;">${player.name}</span>
        <div>
          <span class="summary-role ${roleClass}">${player.role.toUpperCase()}</span>
          <span style="color:var(--text-muted); margin-left: 10px;">(${player.word.toUpperCase()})</span>
        </div>
      `;
      summaryDetailsBox.appendChild(row);
    });
  }

  // Play Again Button
  btnMrWhiteRestart.addEventListener('click', () => {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    screenSummary.classList.add('hidden');
    screenSetup.classList.remove('hidden');
    playersList = [];
    renderChips();
    validateStartButton();
  });

  // --- Helper Utilities ---

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
});
