import { Ball } from '../game/Ball';

export type Player = 1 | 2;
export type BallType = 'red' | 'yellow' | 'green' | 'brown' | 'blue' | 'pink' | 'black' | 'cue';

export class GameRules {
  currentPlayer: Player = 1;
  scores: Record<Player, number> = { 1: 0, 2: 0 };
  
  targetColor: 'red' | 'color' | BallType = 'red'; // What the player must hit next
  
  firstBallHit: Ball | null = null;
  ballsPocketedThisTurn: Ball[] = [];
  
  foulMessage: string | null = null;
  winner: Player | null = null;
  gameOver: boolean = false;
  
  ballInHand: boolean = true; // Start with ball in hand on baulk line
  
  getColorValue(type: string): number {
    const values: Record<string, number> = {
      'red': 1, 'yellow': 2, 'green': 3, 'brown': 4,
      'blue': 5, 'pink': 6, 'black': 7
    };
    return values[type] || 0;
  }

  startTurn() {
    this.firstBallHit = null;
    this.ballsPocketedThisTurn = [];
    this.foulMessage = null;
    this.ballInHand = false;
  }

  evaluateTurn(cueBall: Ball, allBalls: Ball[], returnColorToSpot: (ball: Ball) => void) {
    if (this.gameOver) return;

    let foul = false;
    let foulPoints = 4; // Minimum foul penalty in snooker is 4
    let switchTurn = true;
    this.foulMessage = null;

    const cuePocketed = this.ballsPocketedThisTurn.some(b => b.type === 'cue');
    const redsLeft = allBalls.filter(b => b.type === 'red' && !b.isPocketed).length;
    
    
    if (redsLeft === 0 && this.targetColor === 'red') {
       // Transition to colors
       const colorsLeft = allBalls.filter(b => b.type !== 'red' && b.type !== 'cue' && !b.isPocketed);
       if (colorsLeft.length > 0) {
           // Find lowest value color left
           const nextColor = colorsLeft.sort((a,b) => this.getColorValue(a.type) - this.getColorValue(b.type))[0];
           this.targetColor = nextColor.type as BallType;
       }
    }

    // --- Foul Checks ---
    if (cuePocketed) {
      foul = true;
      this.foulMessage = "Foul - Cue ball pocketed!";
      this.resetCueBall(cueBall);
    } 
    else if (!this.firstBallHit) {
      foul = true;
      this.foulMessage = "Foul - Failed to hit any ball!";
    }
    else {
      // Check wrong ball hit first
      let validHit = false;
      const hitType = this.firstBallHit.type;
      
      if (this.targetColor === 'red') {
        validHit = hitType === 'red';
      } else if (this.targetColor === 'color') {
        validHit = hitType !== 'red' && hitType !== 'cue';
      } else {
        validHit = hitType === this.targetColor;
      }

      if (!validHit) {
        foul = true;
        this.foulMessage = `Foul - Hit wrong ball. Target was ${this.targetColor}!`;
        // Find highest value involved in the foul
        const highestValue = Math.max(
            this.getColorValue(this.targetColor), 
            this.getColorValue(hitType)
        );
        foulPoints = Math.max(4, highestValue);
      }
    }

    // --- Scoring & Pocketing ---
    let pointsScored = 0;
    
    if (!foul) {
        for (const pocketed of this.ballsPocketedThisTurn) {
            if (pocketed.type === 'cue') continue;

            let validPocket = false;
            if (this.targetColor === 'red' && pocketed.type === 'red') {
               validPocket = true;
            } else if (this.targetColor === 'color' && pocketed.type !== 'red') {
               validPocket = true;
            } else if (this.targetColor === pocketed.type) {
               validPocket = true;
            }

            if (!validPocket) {
               foul = true;
               this.foulMessage = `Foul - Pocketed wrong ball (${pocketed.type})!`;
               foulPoints = Math.max(foulPoints, this.getColorValue(pocketed.type));
               
               if (pocketed.type !== 'red') {
                   // Return illegally pocketed colors to spot
                   returnColorToSpot(pocketed);
               }
            } else {
               pointsScored += this.getColorValue(pocketed.type);
               
               // If a color was legally pocketed while reds remain, it goes back on its spot
               if (this.targetColor === 'color' && pocketed.type !== 'red') {
                   returnColorToSpot(pocketed);
               }
            }
        }
    } else {
        // If foul, all pocketed colors return to spot
        for (const pocketed of this.ballsPocketedThisTurn) {
            if (pocketed.type !== 'red' && pocketed.type !== 'cue') {
                returnColorToSpot(pocketed);
            }
        }
    }

    // --- Resolve Turn ---
    if (foul) {
      const opponent = this.currentPlayer === 1 ? 2 : 1;
      this.scores[opponent] += foulPoints;
      switchTurn = true;
      // If a color was the target, target resets to red (if reds remain)
      if (redsLeft > 0) this.targetColor = 'red';
      this.ballInHand = cuePocketed; // In snooker, ball in hand is only in the "D" after scratching
    } else if (pointsScored > 0) {
      this.scores[this.currentPlayer] += pointsScored;
      switchTurn = false;
      
      // Update target
      if (redsLeft > 0) {
          if (this.targetColor === 'red') this.targetColor = 'color';
          else this.targetColor = 'red';
      } else {
          // Progress through colors sequence
          const colorsLeft = allBalls.filter(b => b.type !== 'red' && b.type !== 'cue' && !b.isPocketed);
          if (colorsLeft.length > 0) {
             const nextColor = colorsLeft.sort((a,b) => this.getColorValue(a.type) - this.getColorValue(b.type))[0];
             this.targetColor = nextColor.type as BallType;
          } else {
             this.gameOver = true;
             this.winner = this.scores[1] > this.scores[2] ? 1 : 2;
             this.foulMessage = `Game Over. Player ${this.winner} wins!`;
          }
      }
    } else {
      switchTurn = true;
      // If a color was the target, target resets to red (if reds remain)
      if (redsLeft > 0) this.targetColor = 'red';
    }

    if (switchTurn && !this.gameOver) {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    }
  }

  private resetCueBall(cueBall: Ball) {
    cueBall.isPocketed = false;
    cueBall.vx = 0;
    cueBall.vy = 0;
    // Ball returns to "D"
    cueBall.x = -1000; 
    cueBall.y = -1000;
  }
}
