import { Ball } from '../game/Ball';

export class Physics {
  // Check collision between two balls
  static checkCollision(b1: Ball, b2: Ball): boolean {
    if (b1.isPocketed || b2.isPocketed) return false;
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (b1.radius + b2.radius);
  }

  // Resolve collision between two balls perfectly elastically
  static resolveCollision(b1: Ball, b2: Ball) {
    if (b1.isPocketed || b2.isPocketed) return;

    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return; // Prevent division by zero

    // Normal vector
    const nx = dx / distance;
    const ny = dy / distance;

    // Minimum translation distance to push balls apart after intersecting
    const p = (b1.radius + b2.radius) - distance;
    
    // Separate balls out of overlap to prevent sticking
    // We assume equal mass so we move both by half the overlap
    b1.x -= nx * (p / 2);
    b1.y -= ny * (p / 2);
    b2.x += nx * (p / 2);
    b2.y += ny * (p / 2);

    // Relative velocity
    const dvx = b2.vx - b1.vx;
    const dvy = b2.vy - b1.vy;

    // Velocity along the normal
    const velAlongNormal = dvx * nx + dvy * ny;

    // Do not resolve if velocities are separating
    if (velAlongNormal > 0) return;

    // Restitution (bounciness): slightly less than 1 for realistic energy loss
    const restitution = 0.92;

    // Impulse scalar (j) -> assuming both masses are equal (m=1)
    const j = -(1 + restitution) * velAlongNormal;
    // Impulse divided by total mass (1 + 1 = 2)
    const jPerMass = j / 2;

    // Apply impulse to velocities
    const impulseX = jPerMass * nx;
    const impulseY = jPerMass * ny;

    b1.vx -= impulseX;
    b1.vy -= impulseY;
    b2.vx += impulseX;
    b2.vy += impulseY;

    // Small damping to prevent perpetual jitter after collisions
    b1.vx *= 0.998;
    b1.vy *= 0.998;
    b2.vx *= 0.998;
    b2.vy *= 0.998;
  }

  // Check if ball is in pocket
  static checkPocketing(ball: Ball, pockets: {x: number, y: number, r: number}[]): boolean {
    if (ball.isPocketed) return false;

    for (const pocket of pockets) {
      const dx = ball.x - pocket.x;
      const dy = ball.y - pocket.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If the ball's center is well within the pocket's radius
      if (distance < pocket.r * 1.2) {
        return true;
      }
    }
    return false;
  }
}
