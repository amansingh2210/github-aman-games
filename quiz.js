// --- Neon Multiplayer Quiz Logic ---

document.addEventListener('DOMContentLoaded', () => {
  // --- Questions Database ---
  const QUESTIONS = {
    gaming: [
      { q: "Which game holds the title of the best-selling video game of all time?", c: ["Minecraft", "Tetris", "GTA V", "Wii Sports"], a: 0 },
      { q: "What is the name of the main protagonist in the Legend of Zelda series?", c: ["Zelda", "Link", "Ganon", "Mario"], a: 1 },
      { q: "Which video game console is the best-selling console of all time?", c: ["PlayStation 2", "Nintendo DS", "Nintendo Switch", "PlayStation 4"], a: 0 },
      { q: "In the game 'Portal', what flavor is the promised cake?", c: ["Chocolate", "Strawberry", "Black Forest", "Vanilla"], a: 2 },
      { q: "What year was the original Pac-Man arcade game released?", c: ["1978", "1980", "1982", "1985"], a: 1 },
      { q: "Which character is known as the 'Ghost of Sparta' in a popular PlayStation franchise?", c: ["Marcus Fenix", "Master Chief", "Kratos", "Doom Slayer"], a: 2 },
      { q: "What is the name of the fictional continent where World of Warcraft is set?", c: ["Tamriel", "Azeroth", "Hyrule", "Pandaria"], a: 1 }
    ],
    tech: [
      { q: "What does 'CSS' stand for in web development?", c: ["Creative Style Sheets", "Computer Style Sheets", "Cascading Style Sheets", "Complex Style Sheets"], a: 2 },
      { q: "Who is widely considered the father of computer science?", c: ["Ada Lovelace", "Alan Turing", "Charles Babbage", "Bill Gates"], a: 1 },
      { q: "Which programming language was originally named 'Oak'?", c: ["Java", "Python", "JavaScript", "C++"], a: 0 },
      { q: "In computer science, what is the time complexity of a binary search algorithm?", c: ["O(n)", "O(1)", "O(n log n)", "O(log n)"], a: 3 },
      { q: "Which company developed the Android operating system before Google acquired it?", c: ["Samsung", "Nokia", "Android Inc.", "Motorola"], a: 2 },
      { q: "What is the main protocol used to transfer web pages over the internet?", c: ["FTP", "SMTP", "HTTP", "TCP"], a: 2 },
      { q: "Which of the following is NOT a relational database management system?", c: ["MySQL", "PostgreSQL", "MongoDB", "Oracle"], a: 2 }
    ],
    science: [
      { q: "What is the chemical symbol for the element Gold?", c: ["Gd", "Ag", "Au", "Pb"], a: 2 },
      { q: "Which planet in our solar system is known for having a prominent system of rings?", c: ["Jupiter", "Saturn", "Uranus", "Neptune"], a: 1 },
      { q: "What is the approximate speed of light in a vacuum?", c: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"], a: 0 },
      { q: "What is the primary gas that makes up the Earth's atmosphere?", c: ["Oxygen", "Carbon Dioxide", "Hydrogen", "Nitrogen"], a: 3 },
      { q: "What is the powerhouse of the cell?", c: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Apparatus"], a: 2 },
      { q: "Which scientist proposed the three laws of motion?", c: ["Albert Einstein", "Galileo Galilei", "Isaac Newton", "Marie Curie"], a: 2 },
      { q: "What is the only mammal capable of true, sustained flight?", c: ["Flying Squirrel", "Bat", "Sugar Glider", "Pigeon"], a: 1 }
    ],
    movies: [
      { q: "Which movie won the first-ever Academy Award for Best Picture in 1929?", c: ["Wings", "Metropolis", "Sunrise", "The Jazz Singer"], a: 0 },
      { q: "Who directed the sci-fi epic movie 'Interstellar'?", c: ["Steven Spielberg", "Christopher Nolan", "Denis Villeneuve", "James Cameron"], a: 1 },
      { q: "What is the highest-grossing film of all time (unadjusted for inflation)?", c: ["Titanic", "Avengers: Endgame", "Avatar", "Star Wars: The Force Awakens"], a: 2 },
      { q: "Which actor played the iconic character Wolverine in the X-Men film series?", c: ["Hugh Jackman", "Christian Bale", "Robert Downey Jr.", "Chris Evans"], a: 0 },
      { q: "What is the name of the fictional kingdom where Disney's 'Frozen' takes place?", c: ["Corona", "Arendelle", "DunBroch", "Agrabah"], a: 1 },
      { q: "How many Oscars did the movie 'Titanic' win?", c: ["9", "11", "12", "14"], a: 1 },
      { q: "Which 1994 film features the quote: 'Mama always said life was like a box of chocolates'?", c: ["Pulp Fiction", "Forrest Gump", "The Shawshank Redemption", "The Lion King"], a: 1 }
    ]
  };

  // Mixed trivia is a combination of all categories
  QUESTIONS.mixed = [...QUESTIONS.gaming, ...QUESTIONS.tech, ...QUESTIONS.science, ...QUESTIONS.movies];

  // --- UI Elements Reference ---
  const panelSetup = document.getElementById('setup-panel');
  const panelGameplay = document.getElementById('gameplay-panel');
  const panelResults = document.getElementById('results-panel');

  const playerCountButtons = document.querySelectorAll('.count-btn');
  const playerInputsContainer = document.getElementById('player-names-inputs');
  const categoryButtons = document.querySelectorAll('.cat-btn');
  const btnStartQuiz = document.getElementById('btn-start-quiz');

  const activePlayerBanner = document.getElementById('active-player-banner');
  const questionNumText = document.getElementById('current-question-num');
  const totalQuestionsText = document.getElementById('total-questions-num');
  const questionCatText = document.getElementById('question-category');
  const questionTextEl = document.getElementById('question-text');
  const choicesContainer = document.getElementById('choices-container');
  const quizScoresBoard = document.getElementById('quiz-scores-board');

  const winnerText = document.getElementById('winnerText');
  const leaderboardContainer = document.getElementById('leaderboard-container');
  const btnQuizRestart = document.getElementById('btn-quiz-restart');

  // --- Game Settings State ---
  let playersCount = 2;
  let playerList = []; // Array of { name, score, id, colorClass, rgb, hex }
  let activePlayerIndex = 0;
  let selectedCategory = 'mixed';
  let gameQuestions = [];
  let currentQuestionIndex = 0;
  let isAnswered = false;

  const playerColors = [
    { class: 'p1-active', dotClass: 'p1-dot', rgb: '0, 242, 254', hex: '#00f2fe' },
    { class: 'p2-active', dotClass: 'p2-dot', rgb: '248, 87, 166', hex: '#f857a6' },
    { class: 'p3-active', dotClass: 'p3-dot', rgb: '139, 92, 246', hex: '#8b5cf6' },
    { class: 'p4-active', dotClass: 'p4-dot', rgb: '16, 185, 129', hex: '#10b981' }
  ];

  // --- Setup Page Handlers ---

  // 1. Choose player count
  playerCountButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      playerCountButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playersCount = parseInt(btn.dataset.count, 10);
      updatePlayerInputsVisibility();
    });
  });

  function updatePlayerInputsVisibility() {
    const inputGroups = playerInputsContainer.querySelectorAll('.name-input-group');
    inputGroups.forEach(group => {
      const pNum = parseInt(group.dataset.player, 10);
      if (pNum <= playersCount) {
        group.classList.remove('hidden');
      } else {
        group.classList.add('hidden');
      }
    });
  }

  // 2. Select category
  categoryButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      categoryButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCategory = btn.dataset.cat;
    });
  });

  // 3. Start Button
  btnStartQuiz.addEventListener('click', launchQuiz);

  // --- Gameplay System ---

  function launchQuiz() {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();

    // Collect names
    playerList = [];
    const inputs = playerInputsContainer.querySelectorAll('.name-input-group input');
    for (let i = 0; i < playersCount; i++) {
      let nameVal = inputs[i].value.trim();
      if (!nameVal) nameVal = `Player ${i + 1}`;
      playerList.push({
        id: i + 1,
        name: nameVal,
        score: 0,
        colorClass: playerColors[i].class,
        dotClass: playerColors[i].dotClass,
        rgb: playerColors[i].rgb,
        hex: playerColors[i].hex
      });
    }

    // Prepare questions pool (shuffle copy)
    const pool = [...QUESTIONS[selectedCategory]];
    gameQuestions = shuffleArray(pool).slice(0, 10); // Take 10 questions max

    // Reset scores & counters
    currentQuestionIndex = 0;
    activePlayerIndex = 0;
    isAnswered = false;

    // Load HUD info
    totalQuestionsText.innerText = gameQuestions.length;
    
    // Switch Screen
    panelSetup.classList.add('hidden');
    panelGameplay.classList.remove('hidden');

    // Register plays in local storage
    const quizPlays = parseInt(localStorage.getItem('quiz-total-played') || '0', 10);
    localStorage.setItem('quiz-total-played', (quizPlays + 1).toString());

    loadQuestion();
    renderScoreboard();
  }

  function loadQuestion() {
    isAnswered = false;
    const currentQ = gameQuestions[currentQuestionIndex];
    questionNumText.innerText = currentQuestionIndex + 1;
    
    // Update Category text
    let catText = selectedCategory;
    if (selectedCategory === 'mixed') {
      // Find what category this specific question belonged to
      catText = Object.keys(QUESTIONS).find(key => 
        key !== 'mixed' && QUESTIONS[key].some(qObj => qObj.q === currentQ.q)
      ) || 'trivia';
    }
    questionCatText.innerText = catText;
    questionTextEl.innerText = currentQ.q;

    // Render Turn Banner
    const activePlayer = playerList[activePlayerIndex];
    activePlayerBanner.innerText = `${activePlayer.name.toUpperCase()}'S TURN`;
    activePlayerBanner.className = `player-turn-banner ${activePlayer.colorClass}`;

    // Render Answers Grid (Shuffled options)
    const answers = currentQ.c;
    const correctIdx = currentQ.a;
    const correctString = answers[correctIdx];
    
    // Create mapping of option strings
    const choiceObjects = answers.map((text, i) => ({ text, originalIdx: i }));
    shuffleArray(choiceObjects);

    const buttons = choicesContainer.querySelectorAll('.choice-card');
    buttons.forEach((btn, idx) => {
      const choiceObj = choiceObjects[idx];
      btn.className = 'choice-card btn-choice';
      btn.dataset.originalIdx = choiceObj.originalIdx;
      
      const textSpan = btn.querySelector('.choice-text');
      textSpan.innerText = choiceObj.text;

      // Event listener handling
      btn.onclick = () => handleChoiceSelect(btn, choiceObj.originalIdx, correctIdx);
    });

    updateActiveScoreHighlight();
  }

  function handleChoiceSelect(clickedBtn, selectedIdx, correctIdx) {
    if (isAnswered) return;
    isAnswered = true;

    const activePlayer = playerList[activePlayerIndex];
    const buttons = choicesContainer.querySelectorAll('.choice-card');

    if (selectedIdx === correctIdx) {
      // Correct!
      clickedBtn.classList.add('correct');
      activePlayer.score += 10;
      
      if (typeof arcadeSounds !== 'undefined') {
        arcadeSounds.playSuccess();
      }
    } else {
      // Incorrect!
      clickedBtn.classList.add('incorrect');
      
      // Highlight the correct one
      buttons.forEach(btn => {
        if (parseInt(btn.dataset.originalIdx, 10) === correctIdx) {
          btn.classList.add('correct');
        }
      });

      if (typeof arcadeSounds !== 'undefined') {
        arcadeSounds.playFail();
      }
    }

    // Disable all choices
    buttons.forEach(btn => {
      if (!btn.classList.contains('correct') && !btn.classList.contains('incorrect')) {
        btn.classList.add('disabled');
      }
    });

    // Update scoreboard visually
    renderScoreboard();

    // Queue next question or player turn
    setTimeout(() => {
      // Rotate active player turn
      activePlayerIndex = (activePlayerIndex + 1) % playersCount;
      
      // Check if we rotate back to Player 1, then advance question index
      if (activePlayerIndex === 0) {
        currentQuestionIndex++;
      }

      if (currentQuestionIndex < gameQuestions.length) {
        loadQuestion();
      } else {
        endQuiz();
      }
    }, 2000);
  }

  function renderScoreboard() {
    quizScoresBoard.innerHTML = '';
    playerList.forEach((player, idx) => {
      const activeClass = (idx === activePlayerIndex) ? 'active-turn' : '';
      const borderVar = `--card-color: ${player.hex}; --card-color-rgb: ${player.rgb};`;
      
      const card = document.createElement('div');
      card.className = `player-score-card glass-panel ${activeClass}`;
      card.style = borderVar;
      card.innerHTML = `
        <span class="p-score-name"><span class="player-indicator ${player.dotClass}">●</span> ${player.name}</span>
        <span class="p-score-val" id="score-val-${player.id}">${player.score}</span>
      `;
      quizScoresBoard.appendChild(card);
    });
  }

  function updateActiveScoreHighlight() {
    const cards = quizScoresBoard.querySelectorAll('.player-score-card');
    cards.forEach((card, idx) => {
      if (idx === activePlayerIndex) {
        card.classList.add('active-turn');
      } else {
        card.classList.remove('active-turn');
      }
    });
  }

  // --- End Game Screen ---

  function endQuiz() {
    panelGameplay.classList.add('hidden');
    panelResults.classList.remove('hidden');

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playWin();
    }

    // Sort players by score
    const leaderboard = [...playerList].sort((a, b) => b.score - a.score);
    
    // Find winner
    const topScore = leaderboard[0].score;
    const winners = leaderboard.filter(p => p.score === topScore);
    
    const winTextEl = document.getElementById('winner-text');
    if (winners.length === 1) {
      winTextEl.innerText = `${winners[0].name.toUpperCase()} WINS!`;
      winTextEl.style.color = winners[0].hex;
      winTextEl.style.textShadow = `0 0 20px rgba(${winners[0].rgb}, 0.5)`;
    } else {
      winTextEl.innerText = "IT'S A TIE!";
      winTextEl.style.color = 'var(--accent-yellow)';
      winTextEl.style.textShadow = `0 0 20px rgba(245, 158, 11, 0.5)`;
    }

    // Save winner score to highscore stats or just log
    localStorage.setItem('quiz-last-winner', winners.map(w => w.name).join(', '));
    localStorage.setItem('quiz-last-score', topScore.toString());

    // Render leaderboard rows
    leaderboardContainer.innerHTML = '';
    leaderboard.forEach((player, index) => {
      const row = document.createElement('div');
      row.className = `leaderboard-row rank-${index + 1}`;
      row.style = `border-color: rgba(${player.rgb}, 0.2);`;
      row.innerHTML = `
        <div>
          <span class="rank-badge">${index + 1}</span>
          <span class="leaderboard-name" style="color: ${player.hex};">${player.name}</span>
        </div>
        <span class="leaderboard-score">${player.score} PTS</span>
      `;
      leaderboardContainer.appendChild(row);
    });
  }

  // Play Again Button
  btnQuizRestart.addEventListener('click', () => {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    panelResults.classList.add('hidden');
    panelSetup.classList.remove('hidden');
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
