export class UIManager {
  constructor(game) {
    this.game = game;
    this.scoreEl = document.getElementById('score-container');
    this.highScoreEl = document.getElementById('high-score');
    this.levelEl = document.getElementById('level-container');
    this.comboEl = document.getElementById('combo-container');
    this.progressBar = document.getElementById('progress-bar');
    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalLevelEl = document.getElementById('final-level');
    
    // Load high score
    this.highScore = parseInt(localStorage.getItem('towerJumpHighScore') || '0');
    this.updateHighScore(this.highScore);
    
    document.getElementById('start-btn').addEventListener('click', () => {
       this.game.start();
       this.hideAllScreens();
    });
    
    document.getElementById('restart-btn').addEventListener('click', () => {
       this.game.restart();
       this.hideAllScreens();
    });
  }

  updateScore(score, animate = false) {
    this.scoreEl.innerText = score;
    
    if (animate) {
      this.scoreEl.classList.remove('score-pulse');
      void this.scoreEl.offsetWidth; // Force reflow
      this.scoreEl.classList.add('score-pulse');
    }
    
    // Check and update high score
    if (score > this.highScore) {
      this.highScore = score;
      this.updateHighScore(score);
      localStorage.setItem('towerJumpHighScore', score.toString());
    }
  }

  updateHighScore(score) {
    this.highScoreEl.innerText = `Best: ${score}`;
  }

  updateLevel(level) {
    this.levelEl.innerText = `Level ${level}`;
  }

  showCombo(combo, multiplier) {
    if (combo > 1) {
      this.comboEl.innerText = `${combo}x COMBO! +${multiplier}`;
      this.comboEl.classList.add('active');
    } else {
      this.comboEl.classList.remove('active');
    }
  }

  hideCombo() {
    this.comboEl.classList.remove('active');
  }

  updateProgress(percentage, color = null) {
    // Clamp between 0 and 100
    const clampedPercent = Math.max(0, Math.min(100, percentage));
    this.progressBar.style.width = `${clampedPercent}%`;
    
    // Update color if provided
    if (color) {
      const hexColor = `#${color.toString(16).padStart(6, '0')}`;
      this.progressBar.style.background = `linear-gradient(90deg, ${hexColor}, ${hexColor}aa)`;
      this.progressBar.style.boxShadow = `0 0 10px ${hexColor}99`;
    }
  }

  showGameOver(score, level) {
    this.finalScoreEl.innerText = `Score: ${score}`;
    this.finalLevelEl.innerText = `Level: ${level}`;
    this.gameOverScreen.classList.remove('hidden');
  }

  showStartScreen() {
    this.startScreen.classList.remove('hidden');
  }

  hideAllScreens() {
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
  }
}
