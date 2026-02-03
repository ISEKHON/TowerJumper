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
    this.notificationEl = document.getElementById('notification');
    this.streakEl = document.getElementById('streak-container');
    this.levelCompleteEl = document.getElementById('level-complete');
    
    // Load high score
    this.highScore = parseInt(localStorage.getItem('towerJumpHighScore') || '0');
    this.updateHighScore(this.highScore);
    
    // Track streak
    this.currentStreak = 0;
    this.maxStreak = 0;
    
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
    
    // Pulse animation on level change
    this.levelEl.classList.remove('level-pulse');
    void this.levelEl.offsetWidth;
    this.levelEl.classList.add('level-pulse');
  }

  showNotification(message, color = '#ffaa00', duration = 2000) {
    if (!this.notificationEl) return;
    
    this.notificationEl.innerText = message;
    this.notificationEl.style.color = color;
    this.notificationEl.style.textShadow = `0 0 15px ${color}aa`;
    this.notificationEl.classList.add('active');
    
    setTimeout(() => {
      this.notificationEl.classList.remove('active');
    }, duration);
  }

  updateStreak(streak) {
    this.currentStreak = streak;
    if (streak > this.maxStreak) {
      this.maxStreak = streak;
    }
    
    if (streak >= 3) {
      this.streakEl.innerText = `🔥 ${streak} Streak!`;
      this.streakEl.classList.add('active');
    } else {
      this.streakEl.classList.remove('active');
    }
  }

  resetStreak() {
    this.currentStreak = 0;
    this.streakEl.classList.remove('active');
  }

  showLevelComplete(level, score) {
    if (!this.levelCompleteEl) return;
    
    const levelText = this.levelCompleteEl.querySelector('.level-number');
    const scoreText = this.levelCompleteEl.querySelector('.level-score');
    
    if (levelText) levelText.innerText = `Level ${level - 1} Complete!`;
    if (scoreText) scoreText.innerText = `+${score} Points`;
    
    this.levelCompleteEl.classList.add('active');
    
    setTimeout(() => {
      this.levelCompleteEl.classList.remove('active');
    }, 2000);
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
    
    // Update high score display
    const highScoreDisplay = document.getElementById('final-high-score');
    if (highScoreDisplay) {
      highScoreDisplay.innerText = `Best: ${this.highScore}`;
    }
    
    // Show max streak
    const streakDisplay = document.getElementById('final-streak');
    if (streakDisplay && this.maxStreak > 0) {
      streakDisplay.innerText = `Max Streak: ${this.maxStreak}`;
      streakDisplay.style.display = 'block';
    }
    
    // New high score celebration
    if (score === this.highScore && score > 0) {
      this.showNotification('🏆 NEW HIGH SCORE!', '#ffdd00', 3000);
    }
    
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
