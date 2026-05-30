// --- Break the Bottle Physics Gameplay ---

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('physics-canvas');
  const ctx = canvas.getContext('2d');
  
  const hudLevel = document.getElementById('hud-level');
  const hudShots = document.getElementById('hud-shots');
  const hudBottles = document.getElementById('hud-bottles');
  
  const gameOverlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');
  const btnOverlayAction = document.getElementById('btn-overlay-action');
  
  const levelButtons = document.querySelectorAll('.level-btn');
  const btnResetLevel = document.getElementById('btn-reset-level');

  // --- Constants ---
  const GRAVITY = 0.18;
  const GROUND_Y = 360;
  const SLING_X = 100;
  const SLING_Y = 280;
  const BALL_RADIUS = 10;
  const MAX_DRAG = 75;

  // --- Game State ---
  let currentLevel = 1;
  let maxLevels = 3;
  let shotsLeft = 3;
  let isGameOver = false;

  // Slingshot state
  let ball = { x: SLING_X, y: SLING_Y, vx: 0, vy: 0, isDragged: false, isLaunched: false };
  let mouse = { x: 0, y: 0 };

  // Level elements
  let platforms = []; // Static boxes: { x, y, w, h }
  let bottles = []; // Target boxes: { x, y, w, h, vx, vy, isBroken, active, angle, rotSpeed }
  let particles = []; // Spark glass shards

  // Level Layout Configurations
  const LEVEL_CONFIGS = {
    1: {
      platforms: [
        { x: 420, y: 260, w: 120, h: 20 }
      ],
      bottles: [
        { x: 465, y: 200, w: 24, h: 60, vx: 0, vy: 0, isBroken: false, active: false, angle: 0, rotSpeed: 0 }
      ],
      shots: 3
    },
    2: {
      platforms: [
        { x: 400, y: 280, w: 60, h: 80 },
        { x: 500, y: 280, w: 60, h: 80 },
        { x: 380, y: 270, w: 200, h: 10 }
      ],
      bottles: [
        { x: 420, y: 210, w: 24, h: 60, vx: 0, vy: 0, isBroken: false, active: false, angle: 0, rotSpeed: 0 },
        { x: 510, y: 210, w: 24, h: 60, vx: 0, vy: 0, isBroken: false, active: false, angle: 0, rotSpeed: 0 }
      ],
      shots: 3
    },
    3: {
      platforms: [
        { x: 360, y: 290, w: 60, h: 70 },
        { x: 490, y: 290, w: 60, h: 70 },
        { x: 340, y: 280, w: 100, h: 10 },
        { x: 470, y: 280, w: 100, h: 10 },
        { x: 430, y: 190, w: 50, h: 10 }
      ],
      bottles: [
        { x: 378, y: 220, w: 24, h: 60, vx: 0, vy: 0, isBroken: false, active: false, angle: 0, rotSpeed: 0 },
        { x: 508, y: 220, w: 24, h: 60, vx: 0, vy: 0, isBroken: false, active: false, angle: 0, rotSpeed: 0 },
        { x: 443, y: 130, w: 24, h: 60, vx: 0, vy: 0, isBroken: false, active: false, angle: 0, rotSpeed: 0 }
      ],
      shots: 4
    }
  };

  // --- Initialize ---
  initGame();

  function initGame() {
    loadLevel(1);

    // Canvas listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      handleMouseDown(touch);
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      handleMouseMove(touch);
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
      handleMouseUp();
    });

    // Level buttons
    levelButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
        loadLevel(parseInt(btn.dataset.lvl, 10));
      });
    });

    btnResetLevel.addEventListener('click', () => {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      loadLevel(currentLevel);
    });

    btnOverlayAction.addEventListener('click', () => {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      gameOverlay.classList.add('hidden');
      if (overlayTitle.innerText.includes("CLEAR")) {
        if (currentLevel < maxLevels) {
          loadLevel(currentLevel + 1);
        } else {
          loadLevel(1); // loop back
        }
      } else {
        loadLevel(currentLevel); // restart same
      }
    });

    // Start physics animation loop
    requestAnimationFrame(gameLoop);
  }

  function loadLevel(lvlNum) {
    currentLevel = lvlNum;
    const config = LEVEL_CONFIGS[currentLevel];

    shotsLeft = config.shots;
    isGameOver = false;

    // Reset buttons active state
    levelButtons.forEach(btn => {
      if (parseInt(btn.dataset.lvl, 10) === currentLevel) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Clone templates
    platforms = config.platforms.map(p => ({ ...p }));
    bottles = config.bottles.map(b => ({ ...b }));
    particles = [];

    resetBall();

    // Increment play stat
    const bottlePlays = parseInt(localStorage.getItem('bottle-total-played') || '0', 10);
    localStorage.setItem('bottle-total-played', (bottlePlays + 1).toString());

    updateHUD();
  }

  function resetBall() {
    ball.x = SLING_X;
    ball.y = SLING_Y;
    ball.vx = 0;
    ball.vy = 0;
    ball.isDragged = false;
    ball.isLaunched = false;
  }

  function updateHUD() {
    hudLevel.innerText = `${currentLevel} / ${maxLevels}`;
    hudShots.innerText = `${shotsLeft}`;
    
    const activeCount = bottles.filter(b => !b.isBroken).length;
    hudBottles.innerText = activeCount;
  }

  // --- Physics loop ---

  function gameLoop() {
    updatePhysics();
    draw();
    requestAnimationFrame(gameLoop);
  }

  function updatePhysics() {
    // 1. Update Projectile Ball
    if (ball.isLaunched) {
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vy += GRAVITY;

      // Bounce/Stop on ground
      if (ball.y + BALL_RADIUS >= GROUND_Y) {
        ball.y = GROUND_Y - BALL_RADIUS;
        ball.vy *= -0.3; // bounce
        ball.vx *= 0.95; // friction
        
        if (Math.abs(ball.vx) < 0.2 && Math.abs(ball.vy) < 0.2) {
          ball.vx = 0;
          ball.vy = 0;
        }
      }

      // Check boundary limits to reset ball
      if (ball.x > canvas.width + 100 || ball.x < -100 || (ball.vx === 0 && ball.vy === 0 && !ball.isDragged)) {
        setTimeout(handleShotEnd, 800);
      }
    }

    // 2. Update Bottles
    bottles.forEach(b => {
      if (b.isBroken) return;

      // Check if bottle should fall (if not supported)
      if (!b.active) {
        let hasSupport = false;
        // Check platform support
        platforms.forEach(p => {
          if (b.x + b.w > p.x && b.x < p.x + p.w && Math.abs((b.y + b.h) - p.y) < 2) {
            hasSupport = true;
          }
        });
        if (!hasSupport) {
          b.active = true;
          b.rotSpeed = (Math.random() - 0.5) * 0.05;
        }
      }

      if (b.active) {
        b.x += b.vx;
        b.y += b.vy;
        b.vy += GRAVITY;
        b.angle += b.rotSpeed;

        // Apply friction
        b.vx *= 0.99;

        // Platform collision while falling
        platforms.forEach(p => {
          // simple check if bottle lands back on a platform top
          if (b.vy > 0 && b.x + b.w > p.x && b.x < p.x + p.w && b.y + b.h >= p.y && b.y < p.y + p.h) {
            b.y = p.y - b.h;
            b.vy = 0;
            b.vx *= 0.8; // friction
            b.rotSpeed = 0;
            b.angle = 0;
          }
        });

        // Ground Collision shatters the bottle!
        if (b.y + b.h >= GROUND_Y) {
          shatterBottle(b);
        }
      }

      // Ball to Bottle Collision Check
      if (ball.isLaunched && !b.isBroken) {
        if (checkCircleRectCollision(ball.x, ball.y, BALL_RADIUS, b.x, b.y, b.w, b.h)) {
          // Activate bottle physics
          b.active = true;
          
          // Transfer momentum
          b.vx = ball.vx * 0.65;
          b.vy = ball.vy * 0.65 - 1.5; // add slight upward bounce
          b.rotSpeed = (Math.random() - 0.5) * 0.2;

          // Ball bounces off
          ball.vx *= -0.25;
          ball.vy *= -0.25;

          // Shatter directly if hit hard
          const hitSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          if (hitSpeed > 2.0) {
            shatterBottle(b);
          } else {
            if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
          }
        }
      }
    });

    // 3. Update Shard Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += GRAVITY * 0.5;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function checkCircleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    // Find closest point on rectangle to circle
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));

    // Distance between closest point and circle center
    const dx = cx - closestX;
    const dy = cy - closestY;
    const distanceSquared = dx * dx + dy * dy;

    return distanceSquared < radius * radius;
  }

  function shatterBottle(b) {
    if (b.isBroken) return;
    b.isBroken = true;

    // Generate neon shards
    const centerX = b.x + b.w / 2;
    const centerY = b.y + b.h / 2;
    const count = 15;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1, // push upward
        life: 1.0,
        decay: Math.random() * 0.04 + 0.02,
        color: '#10b981' // Green neon bottles
      });
    }

    // Play shatter audio context sound (high frequency noise)
    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playTone(900, 'sawtooth', 0.25, 0.15, 0.001, 300);
      setTimeout(() => arcadeSounds.playTone(1800, 'sine', 0.12, 0.1), 30);
    }

    updateHUD();
    checkLevelWinStatus();
  }

  function handleShotEnd() {
    if (!ball.isLaunched || isGameOver) return;

    resetBall();
    shotsLeft--;
    updateHUD();

    // Check Loss
    if (shotsLeft <= 0) {
      // Give a slight delay to let active moving bottles break
      setTimeout(() => {
        const remaining = bottles.filter(b => !b.isBroken).length;
        if (remaining > 0 && !isGameOver) {
          handleLevelLose();
        }
      }, 500);
    }
  }

  function checkLevelWinStatus() {
    const remaining = bottles.filter(b => !b.isBroken).length;
    if (remaining === 0 && !isGameOver) {
      isGameOver = true;
      setTimeout(handleLevelWin, 600);
    }
  }

  function handleLevelWin() {
    overlayTitle.innerText = "LEVEL CLEAR!";
    overlayDesc.innerText = `Great shooting! Ready for the next challenge?`;
    btnOverlayAction.innerText = currentLevel < maxLevels ? "NEXT LEVEL" : "PLAY AGAIN";
    gameOverlay.classList.remove('hidden');
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playWin();
  }

  function handleLevelLose() {
    isGameOver = true;
    overlayTitle.innerText = "LEVEL FAILED";
    overlayDesc.innerText = `You ran out of shots. Try again!`;
    btnOverlayAction.innerText = "RETRY";
    gameOverlay.classList.remove('hidden');
    if (typeof arcadeSounds !== 'undefined') arcadeSounds.playFail();
  }

  // --- Input Handlers (Aiming & Dragging) ---

  function handleMouseDown(e) {
    if (isGameOver || ball.isLaunched) return;

    // Get click coords relative to canvas
    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.clientX !== undefined) {
      x = (e.clientX - rect.left) * (canvas.width / rect.width);
      y = (e.clientY - rect.top) * (canvas.height / rect.height);
    } else {
      return; // fallback
    }

    // Check if mouse is clicked near the ball anchor
    const dx = x - SLING_X;
    const dy = y - SLING_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < BALL_RADIUS + 25) {
      ball.isDragged = true;
      mouse.x = x;
      mouse.y = y;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    }
  }

  function handleMouseMove(e) {
    if (!ball.isDragged || isGameOver) return;
    if (e && typeof e.preventDefault === 'function') {
      try {
        e.preventDefault();
      } catch (err) {
        // ignore
      }
    }

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.clientX !== undefined) {
      x = (e.clientX - rect.left) * (canvas.width / rect.width);
      y = (e.clientY - rect.top) * (canvas.height / rect.height);
    } else {
      return;
    }

    // Calculate drag vector
    let dx = x - SLING_X;
    let dy = y - SLING_Y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    // Limit drag radius
    if (dist > MAX_DRAG) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * MAX_DRAG;
      dy = Math.sin(angle) * MAX_DRAG;
    }

    ball.x = SLING_X + dx;
    ball.y = SLING_Y + dy;
  }

  function handleMouseUp() {
    if (!ball.isDragged || isGameOver) return;
    ball.isDragged = false;

    // Launch!
    const dx = SLING_X - ball.x;
    const dy = SLING_Y - ball.y;
    
    // Launch velocity is proportional to stretch
    ball.vx = dx * 0.15;
    ball.vy = dy * 0.15;
    ball.isLaunched = true;

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playWhoosh(); // launch sound
    }
  }

  // --- Rendering Loop (Canvas Drawing) ---

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Sky Grid / Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 2. Draw Ground Line
    ctx.strokeStyle = 'var(--accent-purple)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'var(--accent-purple)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // 3. Draw Slingshot Bands (if dragging)
    if (ball.isDragged) {
      ctx.strokeStyle = 'rgba(248, 87, 166, 0.5)'; // Pink band
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(SLING_X - 10, SLING_Y);
      ctx.lineTo(ball.x, ball.y);
      ctx.moveTo(SLING_X + 10, SLING_Y);
      ctx.lineTo(ball.x, ball.y);
      ctx.stroke();
    }

    // Draw Slingshot Pole
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y);
    ctx.lineTo(SLING_X, GROUND_Y);
    ctx.stroke();

    // 4. Draw Trajectory Dots (if dragging)
    if (ball.isDragged) {
      drawTrajectory();
    }

    // 5. Draw Platforms
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.strokeStyle = 'var(--accent-purple)';
    ctx.lineWidth = 2;
    platforms.forEach(p => {
      ctx.save();
      ctx.shadowBlur = 5;
      ctx.shadowColor = 'var(--accent-purple)';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.restore();
    });

    // 6. Draw Bottles (Neon Green Cylinders)
    bottles.forEach(b => {
      if (b.isBroken) return;

      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#10b981'; // Green glow
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;

      // Translate and rotate for active flying bottles
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.rotate(b.angle);

      // Draw bottle shape centered
      const w = b.w;
      const h = b.h;
      
      ctx.beginPath();
      // Main body
      ctx.rect(-w/2, -h/6, w, h * 2/3);
      // Neck
      ctx.rect(-w/4, -h/2, w/2, h * 1/3);
      // Cap
      ctx.rect(-w/3, -h/2, w * 2/3, 4);

      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 7. Draw Ball Projectile (Cyan orb)
    if (!isGameOver) {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = 'var(--accent-cyan)';
      ctx.fillStyle = 'var(--accent-cyan)';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Draw Glass shards
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      // small triangle shard
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (Math.random() - 0.5) * 8, p.y + 6);
      ctx.lineTo(p.x + 6, p.y + (Math.random() - 0.5) * 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  function drawTrajectory() {
    const launchDx = SLING_X - ball.x;
    const launchDy = SLING_Y - ball.y;
    let tempVx = launchDx * 0.15;
    let tempVy = launchDy * 0.15;
    let tempX = ball.x;
    let tempY = ball.y;

    ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
    // Sim 30 steps
    for (let i = 0; i < 30; i++) {
      tempX += tempVx;
      tempY += tempVy;
      tempVy += GRAVITY;

      if (tempY >= GROUND_Y) break;

      // Draw dot
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(tempX, tempY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
});
