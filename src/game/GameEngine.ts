import { Ball, BallType } from './Ball';
import { PoolTable } from './PoolTable';
import { Physics } from '../physics/Physics';
import { GameRules } from '../rules/GameRules';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  table: PoolTable;
  balls: Ball[] = [];
  rules: GameRules;
  
  onReturnToMenu: () => void;
  animationFrameId: number | null = null;
  lastTime: number = 0;

  // Interaction state
  isAiming = false;
  isDraggingBall = false;
  isChargingPower = false;
  preparingShot = false;
  mouseDownPos: { x: number, y: number } | null = null;
  
  mousePos = { x: 0, y: 0 };
  aimAngle = 0;
  lockedAimAngle: number | null = null; // locked during power charge
  shotPower = 0;
  maxPower = 200;
  // Drag-based pull distances (pixels)
  maxPullDistance = 120; // px
  targetPull = 0; // target pull-back (px) based on drag
  currentPull = 0; // smoothed pull-back for rendering
  // Aim smoothing
  aimSmoothingFactor = 0.12; // lower = smoother, less sensitive
  minAimDistance = 30; // ignore mouse if closer than this to cue ball (pixels)

  // Turn transitions
  turnTransitionAlpha = 0;

  // Shooting animation state
  isShooting: boolean = false;
  shootingProgress: number = 0; // 0..1
  pendingShotVX: number = 0;
  pendingShotVY: number = 0;
  pendingShotApplied: boolean = false;
  shootingFlashProgress: number = 0;
  // Snooker ball spot positions
  spotPositions: Record<string, {x: number, y: number}> = {};
  // Snooker ball spot positions

  constructor(canvas: HTMLCanvasElement, onReturnToMenu: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.table = new PoolTable(canvas.width, canvas.height);
    this.rules = new GameRules();
    this.onReturnToMenu = onReturnToMenu;

    this.setupBalls();
    this.bindEvents();
    // Ensure canvas doesn't block pointer moves (especially on touch devices)
    try { this.canvas.style.touchAction = 'none'; } catch (e) {}
  }

  setupBalls() {
    this.balls = [];
    const r = 10; // Slightly smaller balls for snooker
    const baulkLineX = this.table.offsetX + this.table.width * 0.2;
    const dRadius = this.table.height / 6;

    // Define color spots
    this.spotPositions = {
      'brown': { x: baulkLineX, y: this.table.offsetY + this.table.height / 2 },
      'yellow': { x: baulkLineX, y: this.table.offsetY + this.table.height / 2 - dRadius },
      'green': { x: baulkLineX, y: this.table.offsetY + this.table.height / 2 + dRadius },
      'blue': { x: this.table.offsetX + this.table.width / 2, y: this.table.offsetY + this.table.height / 2 },
      'pink': { x: this.table.offsetX + this.table.width * 0.75, y: this.table.offsetY + this.table.height / 2 },
      'black': { x: this.table.offsetX + this.table.width - this.table.width / 11, y: this.table.offsetY + this.table.height / 2 }
    };

    // Spawn colors
    const colorDefinitions: {type: BallType, color: string}[] = [
      { type: 'yellow', color: '#facc15' },
      { type: 'green', color: '#22c55e' },
      { type: 'brown', color: '#78350f' },
      { type: 'blue', color: '#3b82f6' },
      { type: 'pink', color: '#f472b6' },
      { type: 'black', color: '#111827' }
    ];

    colorDefinitions.forEach(cd => {
       const pos = this.spotPositions[cd.type];
       this.balls.push(new Ball(this.balls.length, pos.x, pos.y, r, cd.type, cd.color, this.rules.getColorValue(cd.type)));
    });

    // Spawn 15 reds in a triangle just behind the pink
    const pinkSpotX = this.spotPositions['pink'].x;
    const startX = pinkSpotX + r * 2 + 2;
    const startY = this.spotPositions['pink'].y;

    const redRows = 5;
    let redCount = 0;
    for (let col = 0; col < redRows; col++) {
      for (let row = 0; row <= col; row++) {
        const x = startX + col * (r * 2 + 1) * Math.cos(Math.PI / 6);
        const y = startY + (row - col / 2) * (r * 2 + 1);
        this.balls.push(new Ball(this.balls.length, x, y, r, 'red', '#ef4444', 1));
        redCount++;
        if (redCount >= 15) break; 
      }
    }

    // Cue ball (starts placed arbitrarily in the D)
    const cueX = baulkLineX - r * 2;
    const cueY = startY;
    this.balls.push(new Ball(this.balls.length, cueX, cueY, r, 'cue', '#F3F4F6', 0));
  }

  getCueBall(): Ball {
    return this.balls.find(b => b.type === 'cue')!;
  }

  returnColorToSpot = (ball: Ball) => {
    // Determine the spot
    const spot = this.spotPositions[ball.type];
    if (spot) {
      ball.x = spot.x;
      ball.y = spot.y;
      ball.vx = 0;
      ball.vy = 0;
      ball.isPocketed = false;
    }
  };

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.unbindEvents();
  }

  loop(currentTime: number) {
    const dt = Math.min((currentTime - this.lastTime) / (1000 / 60), 3);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    this.animationFrameId = requestAnimationFrame((time) => this.loop(time));
  }

  update(dt: number) {
    // Fade turn transition
    if (this.turnTransitionAlpha > 0) {
       this.turnTransitionAlpha -= 0.02 * dt;
    }

     // Smoothly interpolate current pull toward targetPull
     const lerpFactor = Math.min(1, dt * 12);
     this.currentPull += (this.targetPull - this.currentPull) * lerpFactor;

     // Compute shotPower from currentPull (power proportional to pull distance)
     const pullRatio = Math.max(0, Math.min(1, this.currentPull / this.maxPullDistance));
     this.shotPower = pullRatio * this.maxPower;

    const wasMoving = this.balls.some(b => b.isMoving());

    this.balls.forEach(ball => ball.update(dt));

    const subSteps = 8;
    
    for (let step = 0; step < subSteps; step++) {
      for (let i = 0; i < this.balls.length; i++) {
        const b1 = this.balls[i];
        if (b1.isPocketed) continue;

        // Table bounds checking
        const { x, y, vxMultiplier, vyMultiplier } = this.table.resolveBounds(b1.x, b1.y, b1.radius);
        if (x !== b1.x || y !== b1.y) {
          b1.x = x;
          b1.y = y;
          b1.vx *= vxMultiplier;
          b1.vy *= vyMultiplier;
        }

        // Pocket checking - find specific pocket and animate fall
        const pocket = this.getPocketForBall(b1);
        if (pocket) {
          // Begin pocket animation on the ball (keeps isPocketed true for logic)
          if ((b1 as any).beginPocket) {
            (b1 as any).beginPocket({ x: pocket.x, y: pocket.y });
          } else {
            b1.isPocketed = true;
          }
          this.rules.ballsPocketedThisTurn.push(b1);
          continue;
        }

        // Ball bounds checking
        for (let j = i + 1; j < this.balls.length; j++) {
          const b2 = this.balls[j];
          if (b2.isPocketed) continue;
          
          if (Physics.checkCollision(b1, b2)) {
            Physics.resolveCollision(b1, b2);
            
            // Record first ball hit
            if (wasMoving && !this.rules.firstBallHit && (b1.type === 'cue' || b2.type === 'cue')) {
              this.rules.firstBallHit = b1.type === 'cue' ? b2 : b1;
            }
          }
        }
      }
    }

    const isMoving = this.balls.some(b => b.isMoving());

    // Turn resolution when all balls stop
    if (wasMoving && !isMoving && !this.rules.gameOver) {
      const pBefore = this.rules.currentPlayer;
      this.rules.evaluateTurn(this.getCueBall(), this.balls, this.returnColorToSpot);
      
      if (pBefore !== this.rules.currentPlayer) {
         this.turnTransitionAlpha = 1;
      }

      if (this.rules.ballInHand && !this.rules.gameOver) {
        // Place cue ball tentatively in the baulk area (snooker D)
        const cueBall = this.getCueBall();
        cueBall.x = this.table.offsetX + this.table.width * 0.1;
        cueBall.y = this.table.offsetY + this.table.height / 2;
        cueBall.isPocketed = false;
      }

    // Handle shooting animation state (cue forward strike)
    if (this.isShooting) {
       this.shootingProgress += dt * 0.08;
       // small flash if max power
       if (this.shotPower >= this.maxPower) this.shootingFlashProgress = 1;

       if (this.shootingProgress >= 1) {
         this.isShooting = false;
         this.shootingProgress = 0;
         this.shotPower = 0;
       }
    }

    if (this.shootingFlashProgress > 0) {
      this.shootingFlashProgress -= dt * 0.05;
      if (this.shootingFlashProgress < 0) this.shootingFlashProgress = 0;
    }
    }
  }

  draw() {
    this.ctx.fillStyle = '#0d1117'; // Outer background
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.table.draw(this.ctx);

    

    // Draw balls sorted by y for pseudo-depth
    [...this.balls]
       .sort((a,b) => a.y - b.y)
       .forEach(ball => ball.draw(this.ctx));

    this.drawAiming();
    this.drawPowerBar();
    this.drawHUD();
  }

  drawAiming() {
    const isMoving = this.balls.some(b => b.isMoving());
    if (isMoving || this.rules.gameOver || this.rules.ballInHand) return;

    const cueBall = this.getCueBall();
    if (cueBall.isPocketed) return;

    // --- Aim angle calculation ---
    // aimAngle = direction the ball will TRAVEL (toward the mouse)
    // Only update aim when NOT charging power (lock aim during charge)
    if (!this.isChargingPower) {
      const dx = this.mousePos.x - cueBall.x;
      const dy = this.mousePos.y - cueBall.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only update aim if mouse is far enough from ball to avoid jitter
      if (dist > this.minAimDistance) {
        const rawAngle = Math.atan2(dy, dx); // angle from ball toward mouse = shot direction

        // Smooth interpolation to reduce sensitivity
        // Use shortest-path angular interpolation
        let delta = rawAngle - this.aimAngle;
        // Normalize delta to [-PI, PI]
        while (delta > Math.PI) delta -= 2 * Math.PI;
        while (delta < -Math.PI) delta += 2 * Math.PI;
        this.aimAngle += delta * this.aimSmoothingFactor;
        // Keep aimAngle in [-PI, PI]
        while (this.aimAngle > Math.PI) this.aimAngle -= 2 * Math.PI;
        while (this.aimAngle < -Math.PI) this.aimAngle += 2 * Math.PI;
      }
    }

    // The angle to use for rendering (locked aim while charging)
    const renderAngle = this.lockedAimAngle !== null ? this.lockedAimAngle : this.aimAngle;

    // 1. Draw Guideline — points in the SHOT direction (toward mouse)
    this.ctx.beginPath();
    this.ctx.moveTo(cueBall.x, cueBall.y);
    const lineLen = 400;
    this.ctx.lineTo(
      cueBall.x + Math.cos(renderAngle) * lineLen,
      cueBall.y + Math.sin(renderAngle) * lineLen
    );
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // 2. Draw animated cue stick — sits BEHIND the ball (opposite the shot direction)
    // Rotate to aimAngle + PI so the cue extends away from the shot direction
    const cueAngle = renderAngle + Math.PI;
    this.ctx.save();
    this.ctx.translate(cueBall.x, cueBall.y);
    this.ctx.rotate(cueAngle);
    // Smooth pull-back distance based on currentPull and shooting animation
    const visiblePull = this.currentPull;
    const basePull = 10 + visiblePull; // base offset + pulled pixels
    let pullBack = basePull;
    if (this.isShooting) {
      // Ease: start pulled back, then thrust forward
      const p = Math.min(1, this.shootingProgress);
      const ease = 1 - Math.pow(1 - p, 3);
      pullBack = basePull * (1 - ease) - (ease * 30);
    }

    // Subtle breathing animation on aim
    const breathing = Math.sin(performance.now() * 0.005) * 2;
    
    const cueGradient = this.ctx.createLinearGradient(0, -3, 0, 3);
    cueGradient.addColorStop(0, '#c39d67'); // Ash wood
    cueGradient.addColorStop(0.5, '#e4c390');
    cueGradient.addColorStop(1, '#a67d43');

    this.ctx.fillStyle = cueGradient;
    // Draw wood shaft (extends in +X = away from ball in cue's local space)
    this.ctx.fillRect(cueBall.radius + pullBack + breathing, -3, 300, 6);
    // Draw ferrule (white tip connector)
    this.ctx.fillStyle = '#ddd';
    this.ctx.fillRect(cueBall.radius + pullBack + breathing - 5, -3, 5, 6);
    // Draw leather tip
    this.ctx.fillStyle = '#1e3a8a';
    this.ctx.beginPath();
    this.ctx.arc(cueBall.radius + pullBack + breathing - 6, 0, 3, Math.PI / 2, Math.PI * 1.5, true);
    this.ctx.fill();
    // Butt (black splice end)
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(cueBall.radius + pullBack + breathing + 200, -4, 150, 8);
    
    this.ctx.restore();
  }

  drawPowerBar() {
    if (!this.isChargingPower && this.shootingFlashProgress <= 0) return;

    const barWidth = 300;
    const barHeight = 15;
    const x = (this.canvas.width - barWidth) / 2;
    const y = this.canvas.height - 40;

    // Background
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(x, y, barWidth, barHeight);
    
    // Fill
    const fillRatio = this.shotPower / this.maxPower;
    
    const red = Math.floor(255 * fillRatio);
    const green = Math.floor(255 * (1 - fillRatio));
    this.ctx.fillStyle = `rgb(${red}, ${green}, 0)`;
    
    this.ctx.fillRect(x, y, barWidth * fillRatio, barHeight);

    // Max power flash
    if (fillRatio >= 1) {
       this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(performance.now() * 0.01))})`;
       this.ctx.fillRect(x, y, barWidth, barHeight);
    }
     // Shooting flash glow
     if (this.shootingFlashProgress > 0) {
       const glow = Math.min(1, this.shootingFlashProgress);
       this.ctx.fillStyle = `rgba(255, 220, 120, ${0.6 * glow})`;
       this.ctx.fillRect(x - 8, y - 8, barWidth + 16, barHeight + 16);
     }
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.strokeRect(x, y, barWidth, barHeight);
  }

  drawHUD() {
    this.ctx.save();
    
    // Player Scores
    this.ctx.font = 'bold 28px Inter, sans-serif';
    // pulsing highlight for current player
    const pulse = Math.abs(Math.sin(performance.now() * 0.004));
    const p1Color = this.rules.currentPlayer === 1 ? `rgba(${74}, ${222}, ${128}, ${0.5 + pulse * 0.5})` : `rgba(255,255,255,${0.9 - pulse * 0.3})`;
    const p2Color = this.rules.currentPlayer === 2 ? `rgba(${74}, ${222}, ${128}, ${0.5 + pulse * 0.5})` : `rgba(255,255,255,${0.9 - pulse * 0.3})`;

    this.ctx.fillStyle = p1Color;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Player 1: ${this.rules.scores[1]}`, 30, 40);
    this.ctx.fillStyle = p2Color;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Player 2: ${this.rules.scores[2]}`, this.canvas.width - 30, 40);

    // Target Color
    this.ctx.textAlign = 'center';
    this.ctx.font = '18px Inter, sans-serif';
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText(`Target: ${this.rules.targetColor.toUpperCase()}`, this.canvas.width / 2, 35);

    // Fouls
    if (this.rules.foulMessage && !this.rules.gameOver) {
      this.ctx.font = 'bold 24px Inter, sans-serif';
      this.ctx.fillStyle = '#ef4444';
      this.ctx.fillText(this.rules.foulMessage, this.canvas.width / 2, 70);
    }

    if (this.rules.ballInHand && !this.rules.gameOver) {
      this.ctx.font = 'bold 20px Inter, sans-serif';
      this.ctx.fillStyle = '#facc15';
      this.ctx.fillText('BALL IN HAND (D-Zone) - Drag Cue Ball to Place', this.canvas.width / 2, this.canvas.height - 70);
    }

    // Turn Transition Overlay
    if (this.turnTransitionAlpha > 0 && !this.rules.gameOver && !this.rules.firstBallHit) {
        this.ctx.fillStyle = `rgba(0,0,0,${this.turnTransitionAlpha * 0.7})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = `rgba(255,255,255,${this.turnTransitionAlpha})`;
        this.ctx.font = 'bold 48px Inter, sans-serif';
        this.ctx.fillText(`Player ${this.rules.currentPlayer}'s Turn`, this.canvas.width/2, this.canvas.height/2);
    }

    if (this.rules.gameOver) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#4ade80';
        this.ctx.font = 'bold 48px Inter, sans-serif';
        this.ctx.fillText(this.rules.foulMessage || '', this.canvas.width/2, this.canvas.height/2);
    }

    this.ctx.restore();
  }

  // Event handlers
  bindEvents() {
    // Support both mouse and pointer events so overlays or touch don't block input
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
  }

  unbindEvents() {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseleave', this.onMouseUp);

    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
  }

  // Pointer event wrappers call the mouse handlers to keep logic centralized
  onPointerDown = (e: PointerEvent) => {
    // Convert to MouseEvent-like object
    this.onMouseDown(e as unknown as MouseEvent);
  };

  onPointerMove = (e: PointerEvent) => {
    this.onMouseMove(e as unknown as MouseEvent);
  };

  onPointerUp = (e: PointerEvent) => {
    this.onMouseUp(e as unknown as MouseEvent);
  };

  onMouseDown = (e: MouseEvent) => {
    if (this.rules.gameOver) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cueBall = this.getCueBall();


    if (this.rules.ballInHand) {
      const dx = x - cueBall.x;
      const dy = y - cueBall.y;
      if (Math.sqrt(dx * dx + dy * dy) < cueBall.radius * 2) {
        this.isDraggingBall = true;
      }
    } else if (!this.balls.some(b => b.isMoving())) {
      // Start preparing a shot. Require a small drag to begin charging so
      // the cue doesn't auto-pull on simple clicks.
      this.preparingShot = true;
      this.mouseDownPos = { x, y };
      this.isChargingPower = false;
      this.shotPower = 0;

      // Add window-level listeners so dragging outside the canvas still tracks
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
    }
  };

  onMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos.x = e.clientX - rect.left;
    this.mousePos.y = e.clientY - rect.top;

    if (this.isDraggingBall && this.rules.ballInHand) {
      const cueBall = this.getCueBall();
      // Clamp to D-zone (semi-circle). Simplified to baulk area rectangle for ease.
      const baulkX = this.table.offsetX + this.table.width * 0.2;
      const r = cueBall.radius;
      const minX = this.table.offsetX + r;
      const maxX = baulkX; // Must be behind baulk line
      const minY = this.table.offsetY + r;
      const maxY = this.table.offsetY + this.table.height - r;
      
      cueBall.x = Math.max(minX, Math.min(maxX, this.mousePos.x));
      cueBall.y = Math.max(minY, Math.min(maxY, this.mousePos.y));
    }
    
    if (this.preparingShot) {
      const md = this.mouseDownPos;
      if (md) {
        const dx = this.mousePos.x - md.x;
        const dy = this.mousePos.y - md.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Only begin charging if user drags a bit
        if (!this.isChargingPower && dist > 6) {
          this.isChargingPower = true;
          // Lock the aim angle at the moment charging begins
          this.lockedAimAngle = this.aimAngle;
        }

        // If charging, compute pull amount along the BACKWARD direction
        // (opposite to shot direction = away from where the ball will go)
        if (this.isChargingPower) {
          // Use the locked aim angle (shot direction) for consistent pull calculation
          const shotAngle = this.lockedAimAngle !== null ? this.lockedAimAngle : this.aimAngle;
          // Shot direction unit vector (where ball will go)
          const shotNx = Math.cos(shotAngle);
          const shotNy = Math.sin(shotAngle);

          // Drag vector from initial click position
          const dragX = this.mousePos.x - md.x;
          const dragY = this.mousePos.y - md.y;

          // Project drag onto NEGATIVE shot direction
          // Dragging AWAY from shot direction (pulling cue back) = positive power
          const dragAlongBackward = Math.max(0, -(dragX * shotNx + dragY * shotNy));

          // Update target pull (clamped to maxPullDistance)
          this.targetPull = Math.min(this.maxPullDistance, dragAlongBackward);
        }
      }
    }
  };

  onMouseUp = (_e?: MouseEvent) => {
    if (this.isDraggingBall) {
      this.isDraggingBall = false;
      this.rules.ballInHand = false;
    } else if (this.isChargingPower) {
      // Finalize charging and compute final power from currentPull
      this.isChargingPower = false;
      const finalPull = this.currentPull; // use smoothed pull for consistency
      const ratio = Math.max(0, Math.min(1, finalPull / this.maxPullDistance));
      this.shotPower = ratio * this.maxPower;

      if (this.shotPower > 5) {
        // Use the locked aim angle as the shot direction (toward the mouse at aim time)
        const shotAngle = this.lockedAimAngle !== null ? this.lockedAimAngle : this.aimAngle;
        // Ball travels in the shot direction (aimAngle = toward mouse = shot direction)
        const vx = Math.cos(shotAngle) * (this.shotPower * 0.32);
        const vy = Math.sin(shotAngle) * (this.shotPower * 0.32);

        this.pendingShotVX = vx;
        this.pendingShotVY = vy;
        this.pendingShotApplied = true;
        this.isShooting = true;
        this.shootingProgress = 0;

        // Apply velocity immediately so the ball moves on release
        const cueBall = this.getCueBall();
        cueBall.vx = vx;
        cueBall.vy = vy;

        this.rules.startTurn();
      } else {
        this.shotPower = 0;
      }

      // Reset pull targets and unlock aim angle
      this.targetPull = 0;
      this.lockedAimAngle = null;
    }
    // Reset preparingShot state always on mouse up
    this.preparingShot = false;
    this.mouseDownPos = null;
    this.lockedAimAngle = null;

    // Remove window-level listeners added during drag
    try {
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('pointerup', this.onPointerUp);
    } catch (e) {}
  };

  getPocketForBall(ball: any) {
    const pockets = this.table.getPockets();
    for (const p of pockets) {
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < p.r * 1.2) return p;
    }
    return null;
  }
}
