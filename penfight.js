// --- Upgraded Pen Fight Gameplay & Physics ---

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('pen-canvas');
  const ctx = canvas.getContext('2d');
  
  const modeAiBtn = document.getElementById('mode-ai');
  const modePvpBtn = document.getElementById('mode-pvp');
  
  const p1Label = document.getElementById('p1-label');
  const p2Label = document.getElementById('p2-label');
  const scoreP1Val = document.getElementById('score-p1');
  const scoreP2Val = document.getElementById('score-p2');
  
  const statusText = document.getElementById('status-text');
  
  const gameOverlay = document.getElementById('game-overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');
  const btnOverlayAction = document.getElementById('btn-overlay-action');
  
  const btnResetScores = document.getElementById('btn-reset-scores');

  // --- Constants ---
  const FRICTION = 0.965; // sliding friction factor
  const TABLE = { x: 30, y: 30, w: 540, h: 320 }; // BIG boundaries of wood table (canvas is 600x400)
  const PEN_LENGTH = 65;
  const PEN_RADIUS = 7;
  const MAX_AIM_DIST = 100;

  // --- Game State ---
  let isAiMode = true;
  let currentPlayer = 1; // 1: Cyan Pen, 2: Pink Pen (AI/P2)
  let gameState = 'aiming'; // aiming | rolling | gameOver
  let scoreP1 = parseInt(localStorage.getItem('pen-score-p1') || '0', 10);
  let scoreP2 = parseInt(localStorage.getItem('pen-score-p2') || '0', 10);
  
  let currentLevel = 1;
  const maxLevels = 5;
  let obstacles = []; // circular pegs: { x, y, r }

  // Level configuration layouts
  const LEVEL_CONFIGS = {
    1: { obstacles: [] }, // Pure duel
    2: { 
      obstacles: [
        { x: 300, y: 190, r: 24 } // 1 large central peg
      ] 
    },
    3: { 
      obstacles: [
        { x: 300, y: 105, r: 16 }, // Vertical line of 3 pegs
        { x: 300, y: 190, r: 20 }, 
        { x: 300, y: 275, r: 16 }
      ] 
    },
    4: { 
      obstacles: [
        { x: 230, y: 190, r: 16 }, // Central diamond layout
        { x: 370, y: 190, r: 16 },
        { x: 300, y: 110, r: 16 },
        { x: 300, y: 270, r: 16 }
      ] 
    },
    5: { 
      obstacles: [
        { x: 190, y: 110, r: 14 }, // Complex maze of 7 pegs
        { x: 410, y: 110, r: 14 },
        { x: 300, y: 190, r: 24 },
        { x: 190, y: 270, r: 14 },
        { x: 410, y: 270, r: 14 },
        { x: 300, y: 80, r: 12 },
        { x: 300, y: 300, r: 12 }
      ] 
    }
  };

  // Pens
  let pen1 = { x: 160, y: 190, vx: 0, vy: 0, theta: 0, omega: 0, color: 'var(--accent-cyan)', shadowColor: 'rgba(0, 242, 254, 0.4)', isFalling: false, scale: 1 };
  let pen2 = { x: 440, y: 190, vx: 0, vy: 0, theta: Math.PI, omega: 0, color: 'var(--accent-pink)', shadowColor: 'rgba(248, 87, 166, 0.4)', isFalling: false, scale: 1 };

  // Mouse / Drag state (slingshot pull mechanics)
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragCurrent = { x: 0, y: 0 };

  // --- Initialize ---
  initGame();

  function initGame() {
    // Load Scores
    scoreP1Val.innerText = scoreP1;
    scoreP2Val.innerText = scoreP2;

    // Mode Selector
    modeAiBtn.addEventListener('click', () => {
      if (gameState === 'rolling') return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      modeAiBtn.classList.add('active');
      modePvpBtn.classList.remove('active');
      isAiMode = true;
      p2Label.innerText = "COMPUTER (PINK)";
      currentLevel = 1;
      resetMatch();
    });

    modePvpBtn.addEventListener('click', () => {
      if (gameState === 'rolling') return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      modePvpBtn.classList.add('active');
      modeAiBtn.classList.remove('active');
      isAiMode = false;
      p2Label.innerText = "PLAYER 2 (PINK)";
      currentLevel = 1;
      resetMatch();
    });

    // Reset scores
    btnResetScores.addEventListener('click', () => {
      if (gameState === 'rolling') return;
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      localStorage.setItem('pen-score-p1', '0');
      localStorage.setItem('pen-score-p2', '0');
      scoreP1 = 0;
      scoreP2 = 0;
      scoreP1Val.innerText = 0;
      scoreP2Val.innerText = 0;
    });

    btnOverlayAction.addEventListener('click', () => {
      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
      gameOverlay.classList.add('hidden');
      
      // Level progression logic
      if (overlayTitle.innerText.includes("CLEAR")) {
        if (currentLevel < maxLevels) {
          currentLevel++;
        } else {
          currentLevel = 1; // restart campaign
        }
      }
      resetMatch();
    });

    // Canvas Events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Touch Support (Direct client coordinates passed, { passive: false })
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

    resetMatch();

    // Start physics animation loop
    requestAnimationFrame(gameLoop);
  }

  function resetMatch() {
    // Reset positions (centered slightly left/right)
    pen1.x = 150;
    pen1.y = 190;
    pen1.vx = 0;
    pen1.vy = 0;
    pen1.theta = 0;
    pen1.omega = 0;
    pen1.isFalling = false;
    pen1.scale = 1;

    pen2.x = 450;
    pen2.y = 190;
    pen2.vx = 0;
    pen2.vy = 0;
    pen2.theta = Math.PI;
    pen2.omega = 0;
    pen2.isFalling = false;
    pen2.scale = 1;

    // Load obstacles for current level
    obstacles = LEVEL_CONFIGS[currentLevel].obstacles.map(o => ({ ...o }));

    currentPlayer = 1;
    gameState = 'aiming';
    isDragging = false;

    updateHUDText();

    // Increment play stat
    const penPlays = parseInt(localStorage.getItem('pen-total-played') || '0', 10);
    localStorage.setItem('pen-total-played', (penPlays + 1).toString());
  }

  function updateHUDText() {
    // Update level display
    document.getElementById('hud-level').innerText = `${currentLevel} / ${maxLevels}`;

    if (gameState === 'gameOver') return;

    if (currentPlayer === 1) {
      statusText.innerText = "YOUR TURN (PULL BACK CYAN PEN)";
      statusText.style.color = 'var(--accent-cyan)';
      statusText.style.textShadow = '0 0 10px rgba(0, 242, 254, 0.4)';
    } else {
      statusText.innerText = isAiMode ? "COMPUTER IS THINKING..." : "PLAYER 2'S TURN (PULL BACK PINK PEN)";
      statusText.style.color = 'var(--accent-pink)';
      statusText.style.textShadow = '0 0 10px rgba(248, 87, 166, 0.4)';
    }
  }

  // --- Physics loop ---

  function gameLoop() {
    updatePhysics();
    draw();
    requestAnimationFrame(gameLoop);
  }

  function updatePhysics() {
    // 1. Move Pens
    updatePenMovement(pen1);
    updatePenMovement(pen2);

    // 2. Resolve Collisions
    if (gameState === 'rolling' && !pen1.isFalling && !pen2.isFalling) {
      resolveCollisions();
      resolveObstacleCollisions();
    }

    // 3. Desk Boundaries Check
    if (gameState === 'rolling') {
      checkOutOfBounds(pen1);
      checkOutOfBounds(pen2);
    }

    // 4. Transition: Rolling -> Aiming (when both come to rest)
    if (gameState === 'rolling' && isAtRest(pen1) && isAtRest(pen2)) {
      // Check if anyone fell
      if (pen1.isFalling || pen2.isFalling) {
        handleGameOver();
      } else {
        gameState = 'aiming';
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        updateHUDText();

        // If computer turn, queue AI flick
        if (isAiMode && currentPlayer === 2) {
          setTimeout(triggerAiFlick, 800);
        }
      }
    }
  }

  function updatePenMovement(pen) {
    if (pen.isFalling) {
      // Shrink scale to look like falling
      pen.scale -= 0.04;
      pen.y += 4; // fall down
      pen.vx = 0;
      pen.vy = 0;
      pen.omega = 0;
      if (pen.scale <= 0) pen.scale = 0;
      return;
    }

    // Linear translate
    pen.x += pen.vx;
    pen.y += pen.vy;

    // Angular rotate
    pen.theta += pen.omega;

    // Apply Friction
    pen.vx *= FRICTION;
    pen.vy *= FRICTION;
    pen.omega *= FRICTION;

    // Clamp near-zero velocities
    if (Math.abs(pen.vx) < 0.1) pen.vx = 0;
    if (Math.abs(pen.vy) < 0.1) pen.vy = 0;
    if (Math.abs(pen.omega) < 0.005) pen.omega = 0;
  }

  function checkOutOfBounds(pen) {
    if (pen.isFalling) return;

    // A pen falls if its center of mass goes beyond table boundaries
    if (pen.x < TABLE.x || pen.x > TABLE.x + TABLE.w || pen.y < TABLE.y || pen.y > TABLE.y + TABLE.h) {
      pen.isFalling = true;
      if (typeof arcadeSounds !== 'undefined') {
        arcadeSounds.playTone(300, 'sawtooth', 0.5, 0.15, 0.001, 80);
      }
    }
  }

  function isAtRest(pen) {
    return pen.isFalling || (pen.vx === 0 && pen.vy === 0 && pen.omega === 0);
  }

  // --- Rigid Capsule-to-Capsule Collision Solver ---
  // Approximates each pen with 3 overlapping circles: tail, center, head
  function resolveCollisions() {
    const r = PEN_RADIUS;
    
    // Get spheres for Pen 1
    const p1Spheres = getPenSpheres(pen1);
    // Get spheres for Pen 2
    const p2Spheres = getPenSpheres(pen2);

    // Check all combinations of circles
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const s1 = p1Spheres[i];
        const s2 = p2Spheres[j];

        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < r * 2) {
          // Collision Detected!
          const nx = dx / dist; // normal vector
          const ny = dy / dist;

          // Relative velocity
          const rvx = pen2.vx - pen1.vx;
          const rvy = pen2.vy - pen1.vy;

          const velAlongNormal = rvx * nx + rvy * ny;

          // Only resolve if moving towards each other
          if (velAlongNormal < 0) {
            const restitution = 0.85;
            const mass = 1.0;
            
            // Impulse scalar
            const jImp = -(1 + restitution) * velAlongNormal / (1/mass + 1/mass);

            // Apply linear impulses
            pen1.vx -= jImp * nx;
            pen1.vy -= jImp * ny;
            pen2.vx += jImp * nx;
            pen2.vy += jImp * ny;

            // Simple rotational response based on where it was hit
            const torque1 = (i - 1) * jImp * 0.08; 
            const torque2 = (j - 1) * jImp * 0.08;

            pen1.omega -= torque1;
            pen2.omega += torque2;

            // Separate overlap to prevent getting stuck
            const overlap = r * 2 - dist;
            pen1.x -= nx * overlap * 0.5;
            pen1.y -= ny * overlap * 0.5;
            pen2.x += nx * overlap * 0.5;
            pen2.y += ny * overlap * 0.5;

            // Play impact sound
            if (typeof arcadeSounds !== 'undefined') {
              arcadeSounds.playTimerBeep();
            }
            return;
          }
        }
      }
    }
  }

  // --- Pen-to-Circular Obstacle Collision Resolver ---
  function resolveObstacleCollisions() {
    obstacles.forEach(obs => {
      checkPenObstacleCollision(pen1, obs);
      checkPenObstacleCollision(pen2, obs);
    });
  }

  function checkPenObstacleCollision(pen, obs) {
    if (pen.isFalling) return;

    const r = PEN_RADIUS;
    const spheres = getPenSpheres(pen);

    for (let i = 0; i < 3; i++) {
      const s = spheres[i];
      const dx = s.x - obs.x;
      const dy = s.y - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = r + obs.r;

      if (dist < minDist) {
        // Collision!
        const nx = dx / dist; // normal pointing from peg to pen sphere
        const ny = dy / dist;

        // Velocity along normal
        const velAlongNormal = pen.vx * nx + pen.vy * ny;

        if (velAlongNormal < 0) {
          const restitution = 0.85;
          const impulse = -(1 + restitution) * velAlongNormal;

          // Apply bouncing velocity
          pen.vx += impulse * nx;
          pen.vy += impulse * ny;

          // Add torque spin based on segment hit
          const torque = (i - 1) * impulse * 0.07;
          pen.omega += torque;

          // Separate overlap
          const overlap = minDist - dist;
          pen.x += nx * overlap;
          pen.y += ny * overlap;

          // Play bounce tick
          if (typeof arcadeSounds !== 'undefined') {
            arcadeSounds.playTimerBeep();
          }
        }
      }
    }
  }

  function getPenSpheres(pen) {
    const L_quarter = PEN_LENGTH * 0.35;
    const cos = Math.cos(pen.theta);
    const sin = Math.sin(pen.theta);

    return [
      { x: pen.x - cos * L_quarter, y: pen.y - sin * L_quarter }, // tail
      { x: pen.x, y: pen.y }, // center
      { x: pen.x + cos * L_quarter, y: pen.y + sin * L_quarter }  // head
    ];
  }

  // --- Turn Logic & AI ---

  function triggerAiFlick() {
    if (gameState !== 'aiming') return;

    // AI calculates vector to aim directly at player pen
    const dx = pen1.x - pen2.x;
    const dy = pen1.y - pen2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let aimAngle = Math.atan2(dy, dx);
    
    // Add minor random aiming error (based on current level difficulty scaling)
    const errorScale = 0.16 - (currentLevel * 0.02);
    aimAngle += (Math.random() - 0.5) * errorScale;

    // Power depends on distance
    const power = Math.min(10.5, dist * 0.016 + 2.5);

    // Apply force (Opposite of aim is not needed for AI calculation; AI directly flicks towards target)
    pen2.vx = Math.cos(aimAngle) * power;
    pen2.vy = Math.sin(aimAngle) * power;
    pen2.omega = (Math.random() - 0.5) * 0.25;

    gameState = 'rolling';
    updateHUDText();

    if (typeof arcadeSounds !== 'undefined') {
      arcadeSounds.playWhoosh();
    }
  }

  function handleGameOver() {
    gameState = 'gameOver';
    
    let winner = 1;
    if (pen1.isFalling && pen2.isFalling) {
      // both fell, active player loses
      winner = (currentPlayer === 1) ? 2 : 1;
    } else if (pen1.isFalling) {
      winner = 2;
    } else {
      winner = 1;
    }

    // Update scoreboard & overlay text
    if (winner === 1) {
      scoreP1++;
      localStorage.setItem('pen-score-p1', scoreP1.toString());
      scoreP1Val.innerText = scoreP1;
      
      overlayTitle.innerText = "LEVEL CLEAR!";
      overlayDesc.innerText = `You knocked the opponent off the desk!`;
      overlayTitle.style.color = 'var(--accent-cyan)';
      btnOverlayAction.innerText = currentLevel < maxLevels ? "NEXT LEVEL" : "PLAY AGAIN";

      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playWin();
    } else {
      scoreP2++;
      localStorage.setItem('pen-score-p2', scoreP2.toString());
      scoreP2Val.innerText = scoreP2;
      
      overlayTitle.innerText = "LEVEL FAILED";
      overlayDesc.innerText = isAiMode ? "Your pen fell off the desk!" : "Player 2 knocked you off!";
      overlayTitle.style.color = 'var(--accent-pink)';
      btnOverlayAction.innerText = "RETRY LEVEL";

      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playFail();
    }

    gameOverlay.classList.remove('hidden');
  }

  // --- Input Handlers (Flicking Slingshot pull) ---

  function handleMouseDown(e) {
    if (gameState !== 'aiming') return;
    if (isAiMode && currentPlayer === 2) return; // Computer's turn

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if (e.clientX !== undefined) {
      x = (e.clientX - rect.left) * (canvas.width / rect.width);
      y = (e.clientY - rect.top) * (canvas.height / rect.height);
    } else {
      return;
    }

    // Check if clicked near the active player's pen center (generous 57.5px radius)
    const activePen = (currentPlayer === 1) ? pen1 : pen2;
    const dx = x - activePen.x;
    const dy = y - activePen.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < PEN_LENGTH / 2 + 25) {
      isDragging = true;
      dragStart.x = activePen.x;
      dragStart.y = activePen.y;
      dragCurrent.x = x;
      dragCurrent.y = y;

      if (typeof arcadeSounds !== 'undefined') arcadeSounds.playClick();
    }
  }

  function handleMouseMove(e) {
    if (!isDragging || gameState !== 'aiming') return;
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

    dragCurrent.x = x;
    dragCurrent.y = y;
  }

  function handleMouseUp() {
    if (!isDragging || gameState !== 'aiming') return;
    isDragging = false;

    const activePen = (currentPlayer === 1) ? pen1 : pen2;
    
    // Slingshot pull: flick is in the OPPOSITE direction of the drag vector
    const pullDx = dragCurrent.x - dragStart.x;
    const pullDy = dragCurrent.y - dragStart.y;
    const dist = Math.sqrt(pullDx * pullDx + pullDy * pullDy);

    if (dist > 5) {
      // Launch vector is opposite
      const launchDx = -pullDx;
      const launchDy = -pullDy;
      const angle = Math.atan2(launchDy, launchDx);
      
      // Cap aim power
      const power = Math.min(10.5, dist * 0.12);

      activePen.vx = Math.cos(angle) * power;
      activePen.vy = Math.sin(angle) * power;
      
      // Add random angular spin on flick
      activePen.omega = (Math.random() - 0.5) * 0.28;

      // Swap phase
      gameState = 'rolling';
      updateHUDText();

      if (typeof arcadeSounds !== 'undefined') {
        arcadeSounds.playWhoosh();
      }
    }
  }

  // --- Rendering Loop (Canvas Drawing) ---

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Desk Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Main Desk Tabletop (glowing neon boundaries)
    ctx.save();
    ctx.fillStyle = 'rgba(20, 15, 38, 0.4)';
    ctx.strokeStyle = 'var(--accent-purple)';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'var(--accent-purple)';
    ctx.fillRect(TABLE.x, TABLE.y, TABLE.w, TABLE.h);
    ctx.strokeRect(TABLE.x, TABLE.y, TABLE.w, TABLE.h);
    ctx.restore();

    // Table wood-line decorations inside
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
    ctx.lineWidth = 1;
    for (let i = TABLE.x + 30; i < TABLE.x + TABLE.w; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, TABLE.y);
      ctx.lineTo(i, TABLE.y + TABLE.h);
      ctx.stroke();
    }

    // 2. Draw Obstacles (Circular Neon Pegs/Erasers)
    obstacles.forEach(obs => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'var(--accent-yellow)';
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.strokeStyle = 'var(--accent-yellow)';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Draw inner concentric details for 3D coin look
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.r * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 3. Draw Aim / Tension Indicator (if dragging)
    if (isDragging) {
      const activePen = (currentPlayer === 1) ? pen1 : pen2;
      const pullDx = dragCurrent.x - dragStart.x;
      const pullDy = dragCurrent.y - dragStart.y;
      const dist = Math.sqrt(pullDx * pullDx + pullDy * pullDy);

      if (dist > 5) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = activePen.color;

        // Draw tension line (backwards to drag cursor - Pink indicator)
        ctx.strokeStyle = 'rgba(248, 87, 166, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(activePen.x, activePen.y);
        ctx.lineTo(dragCurrent.x, dragCurrent.y);
        ctx.stroke();

        // Draw launch prediction arrow (opposite to drag cursor - Active player color)
        const launchDx = -pullDx;
        const launchDy = -pullDy;
        const launchX = activePen.x + launchDx;
        const launchY = activePen.y + launchDy;

        ctx.strokeStyle = activePen.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(activePen.x, activePen.y);
        ctx.lineTo(launchX, launchY);
        ctx.stroke();

        // Arrow head at end of launch projection
        const angle = Math.atan2(launchDy, launchDx);
        ctx.fillStyle = activePen.color;
        ctx.beginPath();
        ctx.moveTo(launchX, launchY);
        ctx.lineTo(launchX - 12 * Math.cos(angle - Math.PI/6), launchY - 12 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(launchX - 12 * Math.cos(angle + Math.PI/6), launchY - 12 * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // 4. Draw Pens
    drawPen(pen1);
    drawPen(pen2);
  }

  function drawRoundRect(ctx, x, y, w, h, r) {
    let rTopLeft = 0, rTopRight = 0, rBottomRight = 0, rBottomLeft = 0;
    if (typeof r === 'number') {
      rTopLeft = rTopRight = rBottomRight = rBottomLeft = r;
    } else if (Array.isArray(r)) {
      rTopLeft = r[0] !== undefined ? r[0] : 0;
      rTopRight = r[1] !== undefined ? r[1] : 0;
      rBottomRight = r[2] !== undefined ? r[2] : 0;
      rBottomLeft = r[3] !== undefined ? r[3] : 0;
    } else if (typeof r === 'object') {
      rTopLeft = r.tl !== undefined ? r.tl : 0;
      rTopRight = r.tr !== undefined ? r.tr : 0;
      rBottomRight = r.br !== undefined ? r.br : 0;
      rBottomLeft = r.bl !== undefined ? r.bl : 0;
    }

    ctx.beginPath();
    ctx.moveTo(x + rTopLeft, y);
    ctx.lineTo(x + w - rTopRight, y);
    ctx.arcTo(x + w, y, x + w, y + rTopRight, rTopRight);
    ctx.lineTo(x + w, y + h - rBottomRight, rBottomRight);
    ctx.arcTo(x + w, y + h, x + w - rBottomRight, y + h, rBottomRight);
    ctx.lineTo(x + rBottomLeft, y + h);
    ctx.arcTo(x, y + h, x, y + h - rBottomLeft, rBottomLeft);
    ctx.lineTo(x, y + rTopLeft);
    ctx.arcTo(x, y, x + rTopLeft, y, rTopLeft);
    ctx.closePath();
  }

  function drawPen(pen) {
    if (pen.scale <= 0) return;

    ctx.save();
    ctx.translate(pen.x, pen.y);
    ctx.rotate(pen.theta);
    ctx.scale(pen.scale, pen.scale);

    const L = PEN_LENGTH;
    const r = PEN_RADIUS;

    // Pen Body Shadow & Glow
    ctx.shadowBlur = pen.isFalling ? 0 : 15;
    ctx.shadowColor = pen.color;
    ctx.fillStyle = pen.color;

    // Draw Capsule pen body (rounded rectangle)
    ctx.beginPath();
    drawRoundRect(ctx, -L/2, -r, L, r * 2, r);
    ctx.fill();

    // Reset shadow for details
    ctx.shadowBlur = 0;

    // Draw Cap on head (contrasting darker strip)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    drawRoundRect(ctx, L/2 - 20, -r, 16, r * 2, [0, r, r, 0]);
    ctx.fill();

    // Draw clip on cap
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L/2 - 16, -r * 0.6);
    ctx.lineTo(L/2 - 4, -r * 0.6);
    ctx.stroke();

    // Draw grip lines on tail
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    for (let offset = -L/2 + 8; offset < -L/2 + 20; offset += 4) {
      ctx.beginPath();
      ctx.moveTo(offset, -r + 1);
      ctx.lineTo(offset, r - 1);
      ctx.stroke();
    }

    ctx.restore();
  }
});
