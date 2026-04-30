export type BallType = 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black' | 'cue';

export class Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: BallType;
  color: string;
  isPocketed: boolean;
  value: number;

  // For rotation animation
  rotationX: number = 0;
  rotationY: number = 0;
  rotationZ: number = 0;
  // Pocketing animation
  isPocketing: boolean = false;
  pocketTarget: { x: number, y: number } | null = null;
  pocketProgress: number = 0; // 0..1
  opacity: number = 1;

  constructor(id: number, x: number, y: number, radius: number, type: BallType, color: string, value: number = 0) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.type = type;
    this.color = color;
    this.isPocketed = false;
    this.value = value;
    
    // Random initial rotation
    this.rotationX = Math.random() * Math.PI * 2;
    this.rotationY = Math.random() * Math.PI * 2;
  }

  update(dt: number) {
    // Handle pocketing animation even after logically pocketed
    if (this.isPocketing && this.pocketTarget) {
      // Advance progress
      this.pocketProgress += dt * 0.06; // slower smooth fall
      if (this.pocketProgress >= 1) {
        this.pocketProgress = 1;
        this.isPocketing = false;
        this.opacity = 0;
        // keep isPocketed true for game logic
        this.vx = 0;
        this.vy = 0;
      } else {
        // Move towards pocket center and sink
        const t = this.easeInQuad(this.pocketProgress);
        this.x = this.x + (this.pocketTarget.x - this.x) * t;
        this.y = this.y + (this.pocketTarget.y - this.y) * t + this.pocketProgress * 2; // drop slightly
        this.opacity = 1 - this.pocketProgress;
      }
      return;
    }

    if (this.isPocketed) return;
    
    // Apply velocity
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Apply Snooker friction (smoother deceleration)
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 0) {
      let friction = 0.985; // Less friction for longer rolls
      if (speed < 0.5) {
         friction = 0.96; // Stopping friction
      }
      this.vx *= friction;
      this.vy *= friction;
    }

    // Stop completely if very slow
    if (Math.abs(this.vx) < 0.05) this.vx = 0;
    if (Math.abs(this.vy) < 0.05) this.vy = 0;

    // Update rotation for rolling animation based on velocity
    if (this.isMoving()) {
      const rollAmount = speed * dt / this.radius;
      const moveAngle = Math.atan2(this.vy, this.vx);
      
      this.rotationX += Math.cos(moveAngle) * rollAmount;
      this.rotationY += Math.sin(moveAngle) * rollAmount;
    }
  }

  beginPocket(target: { x: number, y: number }) {
    this.isPocketed = true; // logical pocket
    this.isPocketing = true;
    this.pocketTarget = { x: target.x, y: target.y };
    this.pocketProgress = 0;
    this.opacity = 1;
  }

  private easeInQuad(t: number) {
    return t * t;
  }

  isMoving(): boolean {
    return !this.isPocketed && (this.vx !== 0 || this.vy !== 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isPocketed && !this.isPocketing) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = Math.max(0, this.opacity);

    // Draw shadow
    ctx.beginPath();
    ctx.arc(2, 4, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    ctx.closePath();

    // Base circle
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();

    // Rolling indicator - a subtle spot on the ball
    if (this.type !== 'cue') {
        const spotX = Math.sin(this.rotationX) * this.radius * 0.7;
        const spotY = Math.cos(this.rotationY) * this.radius * 0.7;
        
        ctx.beginPath();
        let spotRadius = 3;
        // Make spot smaller as it goes to the edge for 3d effect
        const distFromCenter = Math.sqrt(spotX*spotX + spotY*spotY);
        if (distFromCenter < this.radius) {
            ctx.arc(spotX, spotY, spotRadius * (1 - distFromCenter/this.radius*0.5), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }
        ctx.closePath();
    } else {
        // Cue ball distinct spots
        for(let i=0; i<4; i++) {
           const a = this.rotationX + (Math.PI/2) * i;
           const sx = Math.sin(a) * this.radius * 0.6;
           const sy = Math.cos(this.rotationY + (Math.PI/2) * i) * this.radius * 0.6;
           
           if(Math.sqrt(sx*sx + sy*sy) < this.radius * 0.9) {
               ctx.beginPath();
               ctx.arc(sx, sy, 2, 0, Math.PI*2);
               ctx.fillStyle = 'rgba(200, 20, 20, 0.8)';
               ctx.fill();
               ctx.closePath();
           }
        }
    }

    // Specular highlight - stationary relative to light source (top-left)
    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
      0, 0, this.radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)'); // Dark bottom right
    
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
