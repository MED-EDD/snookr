interface DemoBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  shadow: string;
}

const FRICTION = 0.9985;
const MIN_SPEED = 0.15;
const RESTITUTION = 0.92;

const BALL_COLORS: { color: string; shadow: string }[] = [
  { color: '#e63946', shadow: 'rgba(230, 57, 70, 0.5)' },
  { color: '#f4a261', shadow: 'rgba(244, 162, 97, 0.5)' },
  { color: '#2a9d8f', shadow: 'rgba(42, 157, 143, 0.5)' },
  { color: '#e9c46a', shadow: 'rgba(233, 196, 106, 0.5)' },
  { color: '#264653', shadow: 'rgba(38, 70, 83, 0.5)' },
  { color: '#c1121f', shadow: 'rgba(193, 18, 31, 0.5)' },
];

const CUSHION = 32;
const POCKET_RADIUS = 18;

function createBalls(tableW: number, tableH: number): DemoBall[] {
  const balls: DemoBall[] = [];
  const radius = 10;
  const cx = tableW / 2;
  const cy = tableH / 2;
  const spread = Math.min(tableW, tableH) * 0.25;

  for (let i = 0; i < BALL_COLORS.length; i++) {
    const angle = (Math.PI * 2 * i) / BALL_COLORS.length;
    const speed = 1.2 + Math.random() * 1.8;
    const moveAngle = Math.random() * Math.PI * 2;
    balls.push({
      x: cx + Math.cos(angle) * spread * (0.4 + Math.random() * 0.6),
      y: cy + Math.sin(angle) * spread * (0.4 + Math.random() * 0.6),
      vx: Math.cos(moveAngle) * speed,
      vy: Math.sin(moveAngle) * speed,
      radius,
      color: BALL_COLORS[i].color,
      shadow: BALL_COLORS[i].shadow,
    });
  }
  return balls;
}

function drawTable(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Outer frame
  ctx.fillStyle = '#3b2314';
  ctx.fillRect(0, 0, w, h);

  // Inner rail shadow
  const railInset = CUSHION - 4;
  ctx.fillStyle = '#2a1a0c';
  ctx.fillRect(railInset, railInset, w - railInset * 2, h - railInset * 2);

  // Felt
  const feltGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
  feltGrad.addColorStop(0, '#1a7a42');
  feltGrad.addColorStop(1, '#0e5c2f');
  ctx.fillStyle = feltGrad;
  ctx.fillRect(CUSHION, CUSHION, w - CUSHION * 2, h - CUSHION * 2);

  // Felt texture (subtle noise lines)
  ctx.strokeStyle = 'rgba(255,255,255,0.012)';
  ctx.lineWidth = 1;
  for (let y = CUSHION; y < h - CUSHION; y += 4) {
    ctx.beginPath();
    ctx.moveTo(CUSHION, y);
    ctx.lineTo(w - CUSHION, y);
    ctx.stroke();
  }

  // Cushion highlights
  ctx.fillStyle = '#4a2a12';
  // top
  ctx.fillRect(CUSHION + POCKET_RADIUS, CUSHION - 4, w - CUSHION * 2 - POCKET_RADIUS * 2, 4);
  // bottom
  ctx.fillRect(CUSHION + POCKET_RADIUS, h - CUSHION, w - CUSHION * 2 - POCKET_RADIUS * 2, 4);
  // left
  ctx.fillRect(CUSHION - 4, CUSHION + POCKET_RADIUS, 4, h - CUSHION * 2 - POCKET_RADIUS * 2);
  // right
  ctx.fillRect(w - CUSHION, CUSHION + POCKET_RADIUS, 4, h - CUSHION * 2 - POCKET_RADIUS * 2);

  // Pockets
  const pockets = [
    [CUSHION, CUSHION],
    [w / 2, CUSHION - 2],
    [w - CUSHION, CUSHION],
    [CUSHION, h - CUSHION],
    [w / 2, h - CUSHION + 2],
    [w - CUSHION, h - CUSHION],
  ];
  for (const [px, py] of pockets) {
    const pocketGrad = ctx.createRadialGradient(px, py, 0, px, py, POCKET_RADIUS);
    pocketGrad.addColorStop(0, '#0a0a0a');
    pocketGrad.addColorStop(0.7, '#1a1a1a');
    pocketGrad.addColorStop(1, '#2a1a0c');
    ctx.beginPath();
    ctx.arc(px, py, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = pocketGrad;
    ctx.fill();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, ball: DemoBall) {
  // Shadow
  ctx.beginPath();
  ctx.arc(ball.x + 2, ball.y + 3, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // Body gradient
  const grad = ctx.createRadialGradient(
    ball.x - ball.radius * 0.3,
    ball.y - ball.radius * 0.3,
    ball.radius * 0.1,
    ball.x,
    ball.y,
    ball.radius
  );
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.3, ball.color);
  grad.addColorStop(1, darkenColor(ball.color, 0.4));

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Specular highlight
  ctx.beginPath();
  ctx.arc(ball.x - ball.radius * 0.25, ball.y - ball.radius * 0.25, ball.radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();

  // Outer glow
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius + 2, 0, Math.PI * 2);
  ctx.strokeStyle = ball.shadow;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.floor(r * (1 - factor))},${Math.floor(g * (1 - factor))},${Math.floor(b * (1 - factor))})`;
}

function updatePhysics(balls: DemoBall[], tableW: number, tableH: number) {
  const left = CUSHION;
  const right = tableW - CUSHION;
  const top = CUSHION;
  const bottom = tableH - CUSHION;

  for (const ball of balls) {
    // Apply velocity
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Apply friction
    ball.vx *= FRICTION;
    ball.vy *= FRICTION;

    // Keep balls moving with minimum speed (demo mode — always alive)
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed < MIN_SPEED) {
      const angle = Math.random() * Math.PI * 2;
      const boost = 1.0 + Math.random() * 1.5;
      ball.vx = Math.cos(angle) * boost;
      ball.vy = Math.sin(angle) * boost;
    }

    // Edge bounce
    if (ball.x - ball.radius < left) {
      ball.x = left + ball.radius;
      ball.vx = Math.abs(ball.vx) * RESTITUTION;
    }
    if (ball.x + ball.radius > right) {
      ball.x = right - ball.radius;
      ball.vx = -Math.abs(ball.vx) * RESTITUTION;
    }
    if (ball.y - ball.radius < top) {
      ball.y = top + ball.radius;
      ball.vy = Math.abs(ball.vy) * RESTITUTION;
    }
    if (ball.y + ball.radius > bottom) {
      ball.y = bottom - ball.radius;
      ball.vy = -Math.abs(ball.vy) * RESTITUTION;
    }
  }

  // Ball-to-ball collisions
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i];
      const b = balls[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist && dist > 0) {
        // Separate
        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Elastic collision (equal mass)
        const dvx = a.vx - b.vx;
        const dvy = a.vy - b.vy;
        const dot = dvx * nx + dvy * ny;
        a.vx -= dot * nx * RESTITUTION;
        a.vy -= dot * ny * RESTITUTION;
        b.vx += dot * nx * RESTITUTION;
        b.vy += dot * ny * RESTITUTION;
      }
    }
  }
}

export function startAnimation(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const w = canvas.width;
  const h = canvas.height;
  const balls = createBalls(w, h);
  let animId = 0;
  let running = true;

  function frame() {
    if (!running) return;

    updatePhysics(balls, w, h);

    // Clear & draw
    ctx!.clearRect(0, 0, w, h);
    drawTable(ctx!, w, h);
    for (const ball of balls) {
      drawBall(ctx!, ball);
    }

    animId = requestAnimationFrame(frame);
  }

  animId = requestAnimationFrame(frame);

  return () => {
    running = false;
    cancelAnimationFrame(animId);
  };
}
