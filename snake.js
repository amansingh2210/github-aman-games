// --- Neon Snake Gameplay & Physics ---

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  
  const currentScoreVal = document.getElementById('current-score');
  const speedVal = document.getElementById('snake-speed');
  const highScoreVal = document.getElementById('high-score');
  
  const gameOverlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');
  
  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnToggleGrid = document.getElementById('btn-toggle-grid');

  // --- Virtual Controls ---
  const ctrlUp = document.getElementById('ctrl-up');
  const ctrlDown = document.getElementById('ctrl-down');
  const ctrlLeft = document.getElementById('ctrl-left');
  const ctrlRight = document.getElementById('ctrl-right');

  // --- Game Settings & Constants ---
  const GRID_SIZE = 20; // 20x20 grid cells
  const TILE_COUNT = canvas.width / GRID_SIZE; // 20 tiles
  
  const BASE_TICK_RATE = 130; // ms per update
  const MIN_TICK_RATE = 60; // fastest speed cap

  // --- Game States ---
  let snake = [];
  let direction = 'right';
  let nextDirection = 'right';
  let food = { x: 0, y: 0 };
  let score = 0;
  let highScore = parseInt(localStorage.getItem('snake-high-score') || '0', 10);
  let tickRate = BASE_TICK_RATE;
  let gameInterval = null;
  let isGameOver = false;
  let isPlaying = false;
  let showGrid = true;
  let particles = [];

  // Initialize
  highScoreVal.innerText = highScore;

  // --- Game Controls Binding ---
  document.addEventListener('keydown', handleKeyDown);
  btnStart.addEventListener('click', startGame);
  btnRestart.addEventListener('click', () => {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    resetGame();
    startGame();
  });
  btnToggleGrid.addEventListener('click', () => {
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    showGrid = !showGrid;
    draw(); // Redraw immediately
  });

  // Touch controls listeners
  const registerTouch = (el, dir) => {
    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      setDirection(dir);
    });
    el.addEventListener('mousedown', () => {
      setDirection(dir);
    });
  };
  registerTouch(ctrlUp, 'up');
  registerTouch(ctrlDown, 'down');
  registerTouch(ctrlLeft, 'left');
  registerTouch(ctrlRight, 'right');

  // Draw initial scene
  resetGame();
  draw();

  // --- Core Loop Functions ---

  function resetGame() {
    snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    tickRate = BASE_TICK_RATE;
    isGameOver = false;
    particles = [];
    currentScoreVal.innerText = score;
    speedVal.innerText = '1.0x';
    spawnFood();
  }

  function startGame() {
    if (isPlaying) return;
    
    isPlaying = true;
    gameOverlay.classList.add('hidden');
    
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playClick();
    }
    
    // Increment global plays
    const snakePlays = parseInt(localStorage.getItem('snake-total-played') || '0', 10);
    localStorage.setItem('snake-total-played', (snakePlays + 1).toString());

    runGameTick();
  }

  function runGameTick() {
    if (gameInterval) clearTimeout(gameInterval);
    
    update();
    draw();
    
    if (!isGameOver) {
      gameInterval = setTimeout(runGameTick, tickRate);
    } else {
      handleGameOver();
    }
  }

  // --- Physics/State Updates ---

  function update() {
    // 1. Move the snake head
    direction = nextDirection;
    const head = { ...snake[0] };

    switch (direction) {
      case 'up': head.y--; break;
      case 'down': head.y++; break;
      case 'left': head.x--; break;
      case 'right': head.x++; break;
    }

    // 2. Check collision with wall
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
      isGameOver = true;
      return;
    }

    // 3. Check collision with self
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) {
        isGameOver = true;
        return;
      }
    }

    // Insert new head at front
    snake.unshift(head);

    // 4. Check if snake eats the food
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      currentScoreVal.innerText = score;
      
      // Update high score
      if (score > highScore) {
        highScore = score;
        highScoreVal.innerText = highScore;
        localStorage.setItem('snake-high-score', highScore.toString());
      }

      // Speed progression
      const currentSpeedFactor = 1 + (score / 100);
      speedVal.innerText = currentSpeedFactor.toFixed(1) + 'x';
      tickRate = Math.max(MIN_TICK_RATE, BASE_TICK_RATE - (score / 10) * 2.5);

      // Play success audio
      if (typeof arcadeSounds !== 'undefined') {
        arcadeSounds.playSuccess();
      }

      // Spark explosion
      createExplosion(food.x * GRID_SIZE + GRID_SIZE / 2, food.y * GRID_SIZE + GRID_SIZE / 2, '#f857a6');

      spawnFood();
    } else {
      // Remove tail segment if food is not eaten
      snake.pop();
    }

    // Update particles
    updateParticles();
  }

  function spawnFood() {
    let valid = false;
    while (!valid) {
      food.x = Math.floor(Math.random() * TILE_COUNT);
      food.y = Math.floor(Math.random() * TILE_COUNT);
      
      // Make sure food doesn't land on snake
      valid = true;
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === food.x && snake[i].y === food.y) {
          valid = false;
          break;
        }
      }
    }
  }

  function handleGameOver() {
    isPlaying = false;
    isGameOver = true;
    overlayTitle.innerText = "GAME OVER";
    overlayDesc.innerText = `Final Score: ${score}`;
    gameOverlay.classList.remove('hidden');
    
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playFail();
    }
  }

  // --- Input handlers ---

  function handleKeyDown(e) {
    if (!isPlaying) {
      if (e.key === ' ' || e.key === 'Enter') {
        startGame();
      }
      return;
    }
    
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        setDirection('up');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        setDirection('down');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        setDirection('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        setDirection('right');
        break;
    }
  }

  function setDirection(newDir) {
    if (!isPlaying) return;
    
    // Prevent 180 degree turns
    if (newDir === 'up' && direction !== 'down') nextDirection = 'up';
    if (newDir === 'down' && direction !== 'up') nextDirection = 'down';
    if (newDir === 'left' && direction !== 'right') nextDirection = 'left';
    if (newDir === 'right' && direction !== 'left') nextDirection = 'right';
    
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playClick();
    }
  }

  // --- Rendering Functions (Canvas) ---

  function draw() {
    // 1. Clear Screen
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Grid Lines (if enabled)
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= TILE_COUNT; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
      }
    }

    // 3. Draw Food (pulsing neon pink ball)
    const foodRadius = GRID_SIZE / 2 - 2;
    const foodX = food.x * GRID_SIZE + GRID_SIZE / 2;
    const foodY = food.y * GRID_SIZE + GRID_SIZE / 2;
    const pulseFactor = 1 + Math.sin(Date.now() * 0.01) * 0.15;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f857a6';
    ctx.fillStyle = '#f857a6';
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius * pulseFactor, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Draw Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const x = segment.x * GRID_SIZE;
      const y = segment.y * GRID_SIZE;
      
      ctx.save();
      if (isHead) {
        // Head is Neon Cyan
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f2fe';
        ctx.fillStyle = '#00f2fe';
        ctx.beginPath();
        // Rounded corners for head
        ctx.roundRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2, 6);
        ctx.fill();

        // Little eyes
        ctx.fillStyle = '#0a0514';
        if (direction === 'up' || direction === 'down') {
          ctx.fillRect(x + 5, y + (direction === 'up' ? 5 : 12), 3, 3);
          ctx.fillRect(x + 12, y + (direction === 'up' ? 5 : 12), 3, 3);
        } else {
          ctx.fillRect(x + (direction === 'left' ? 5 : 12), y + 5, 3, 3);
          ctx.fillRect(x + (direction === 'left' ? 5 : 12), y + 12, 3, 3);
        }
      } else {
        // Tail segments are purple/magenta gradients
        const ratio = index / snake.length;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#8b5cf6';
        
        // Linear interpolation color
        ctx.fillStyle = `rgba(139, 92, 246, ${1 - ratio * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4, 4);
        ctx.fill();
      }
      ctx.restore();
    });

    // 5. Draw Particles
    drawParticles();
  }

  // --- Particles Sparks Engine ---
  function createExplosion(x, y, color) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.05 + 0.03,
        color: color,
        size: Math.random() * 3 + 1
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98; // friction
      p.vy *= 0.98;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
});
