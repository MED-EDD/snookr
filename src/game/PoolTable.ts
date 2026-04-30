export class PoolTable {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    // English Snooker table is 11'8.5" x 5'10", approx 2:1 ratio. 
    this.width = canvasWidth * 0.85;
    this.height = this.width / 2;
    this.offsetX = (canvasWidth - this.width) / 2;
    this.offsetY = (canvasHeight - this.height) / 2;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Outer wooden rim
    const rim = 30; // Snooker tables have thicker borders
    const gradientRim = ctx.createLinearGradient(
      this.offsetX - rim, this.offsetY - rim,
      this.offsetX + this.width + rim, this.offsetY + this.height + rim
    );
    gradientRim.addColorStop(0, '#5C4033'); // Dark brown wood
    gradientRim.addColorStop(0.5, '#3e2723');
    gradientRim.addColorStop(1, '#5C4033');

    // Draw rim shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 15;

    ctx.fillStyle = gradientRim;
    ctx.fillRect(
      this.offsetX - rim, 
      this.offsetY - rim, 
      this.width + rim * 2, 
      this.height + rim * 2
    );

    // Reset shadow for inner elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw inner green snooker felt
    const baizeColor = '#105221'; // Snooker tables use a slightly deeper, richer green
    ctx.fillStyle = baizeColor;
    ctx.fillRect(this.offsetX, this.offsetY, this.width, this.height);

    // Add subtle felt texture (optional noise effect)
    this.drawFeltTexture(ctx);

    // Draw Baulk Line (29 inches from baulk cushion on 12ft table. Approx 1/5th table length)
    const baulkLineX = this.offsetX + this.width * 0.2;
    ctx.beginPath();
    ctx.moveTo(baulkLineX, this.offsetY);
    ctx.lineTo(baulkLineX, this.offsetY + this.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw "D" Zone (Semicircle facing the baulk cushion)
    const dRadius = this.height / 6; // Standard proportion
    ctx.beginPath();
    ctx.arc(baulkLineX, this.offsetY + this.height / 2, dRadius, -Math.PI / 2, Math.PI / 2, true);
    ctx.stroke();
    
    // Draw Spots
    const spotColor = 'rgba(0,0,0,0.3)';
    const spotPoints = [
      { x: baulkLineX, y: this.offsetY + this.height / 2, label: 'Brown' },
      { x: baulkLineX, y: this.offsetY + this.height / 2 - dRadius, label: 'Yellow' },
      { x: baulkLineX, y: this.offsetY + this.height / 2 + dRadius, label: 'Green' },
      { x: this.offsetX + this.width / 2, y: this.offsetY + this.height / 2, label: 'Blue' },
      { x: this.offsetX + this.width * 0.75, y: this.offsetY + this.height / 2, label: 'Pink' },
      { x: this.offsetX + this.width - this.width / 11, y: this.offsetY + this.height / 2, label: 'Black' }
    ];

    spotPoints.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = spotColor;
      ctx.fill();
      ctx.closePath();
    });

    // Draw pockets (darker for snooker realism)
    const pocketRadius = 22; // Snooker pockets are relatively smaller
    ctx.fillStyle = '#080808';

    const pocketPositions = this.getPockets();

    // Draw pocket indentations into the cushion
    pocketPositions.forEach(pos => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pocketRadius * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.closePath();
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pocketRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.closePath();
    });

    // Cushions shadows (inner border overlap)
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 10;
    ctx.strokeRect(this.offsetX, this.offsetY, this.width, this.height);
  }

  drawFeltTexture(ctx: CanvasRenderingContext2D) {
    // Subtle felt texture + top-centered soft lighting
    const gradient = ctx.createLinearGradient(
      this.offsetX, this.offsetY, this.offsetX + this.width, this.offsetY + this.height
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.03)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.12)');

    ctx.fillStyle = gradient;
    ctx.fillRect(this.offsetX, this.offsetY, this.width, this.height);

    // Add soft radial highlight to mimic overhead light
    const cx = this.offsetX + this.width / 2;
    const cy = this.offsetY + this.height * 0.35;
    const rg = ctx.createRadialGradient(cx, cy, this.width * 0.05, cx, cy, this.width * 0.9);
    rg.addColorStop(0, 'rgba(255,255,240,0.06)');
    rg.addColorStop(0.6, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(this.offsetX, this.offsetY, this.width, this.height);
  }

  // Bounce logic
  resolveBounds(x: number, y: number, radius: number): { x: number, y: number, vxMultiplier: number, vyMultiplier: number } {
    let newX = x;
    let newY = y;
    let vxMultiplier = 1;
    let vyMultiplier = 1;

    // Snooker cushions are very bouncy
    const restitution = 0.90; 

    if (x - radius < this.offsetX) {
      newX = this.offsetX + radius;
      vxMultiplier = -restitution;
    } else if (x + radius > this.offsetX + this.width) {
      newX = this.offsetX + this.width - radius;
      vxMultiplier = -restitution;
    }

    if (y - radius < this.offsetY) {
      newY = this.offsetY + radius;
      vyMultiplier = -restitution;
    } else if (y + radius > this.offsetY + this.height) {
      newY = this.offsetY + this.height - radius;
      vyMultiplier = -restitution;
    }

    return { x: newX, y: newY, vxMultiplier, vyMultiplier };
  }

  getPockets() {
    return [
      { x: this.offsetX, y: this.offsetY, r: 24 },
      { x: this.offsetX + this.width / 2, y: this.offsetY - 2, r: 24 },
      { x: this.offsetX + this.width, y: this.offsetY, r: 24 },
      { x: this.offsetX, y: this.offsetY + this.height, r: 24 },
      { x: this.offsetX + this.width / 2, y: this.offsetY + this.height + 2, r: 24 },
      { x: this.offsetX + this.width, y: this.offsetY + this.height, r: 24 }
    ];
  }
}
