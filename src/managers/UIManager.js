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
    this.pauseScreen = document.getElementById('pause-screen');
    this.settingsScreen = document.getElementById('settings-screen');
    this.pauseBtn = document.getElementById('pause-btn');
    this.fpsCounter = document.getElementById('fps-counter');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalLevelEl = document.getElementById('final-level');
    this.notificationEl = document.getElementById('notification');
    this.streakEl = document.getElementById('streak-container');
    this.levelCompleteEl = document.getElementById('level-complete');
    
    // Load settings
    this.settings = this.loadSettings();
    this.applySettings();
    
    // Load high score
    this.highScore = parseInt(localStorage.getItem('towerJumpHighScore') || '0');
    this.updateHighScore(this.highScore);
    
    // Track streak
    this.currentStreak = 0;
    this.maxStreak = 0;
    
    // FPS tracking
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();
    
    this.setupEventListeners();
  }
  
  loadSettings() {
    const defaultSettings = {
      rotationSensitivity: 10,
      maxRotationSpeed: 15,
      showFPS: false
    };
    
    const saved = localStorage.getItem('towerJumpSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  }
  
  saveSettings() {
    localStorage.setItem('towerJumpSettings', JSON.stringify(this.settings));
  }
  
  applySettings() {
    // Update sliders
    const sensitivitySlider = document.getElementById('rotation-sensitivity');
    const maxSpeedSlider = document.getElementById('max-rotation-speed');
    const fpsToggle = document.getElementById('show-fps');
    
    if (sensitivitySlider) {
      sensitivitySlider.value = this.settings.rotationSensitivity;
      document.getElementById('sensitivity-value').textContent = this.settings.rotationSensitivity;
    }
    
    if (maxSpeedSlider) {
      maxSpeedSlider.value = this.settings.maxRotationSpeed;
      document.getElementById('max-speed-value').textContent = this.settings.maxRotationSpeed;
    }
    
    if (fpsToggle) {
      fpsToggle.checked = this.settings.showFPS;
      this.fpsCounter.classList.toggle('hidden', !this.settings.showFPS);
    }
    
    // Apply to game
    if (this.game.isMobile) {
      this.game.rotationSpeed = (this.settings.rotationSensitivity / 10) * 0.08;
      this.game.maxRotationSpeed = (this.settings.maxRotationSpeed / 15) * 0.5;
    } else {
      this.game.rotationSpeed = (this.settings.rotationSensitivity / 10) * 0.003;
      this.game.maxRotationSpeed = (this.settings.maxRotationSpeed / 15) * 0.12;
    }
  }
  
  setupEventListeners() {
    // Start screen
    document.getElementById('start-btn').addEventListener('click', () => {
      this.game.start();
      this.hideAllScreens();
      this.pauseBtn.classList.remove('hidden');
    });
    
    document.getElementById('start-settings-btn').addEventListener('click', () => {
      this.showSettings(true);
    });
    
    // Game over screen
    document.getElementById('restart-btn').addEventListener('click', () => {
      this.game.restart();
      this.hideAllScreens();
      this.pauseBtn.classList.remove('hidden');
    });
    
    document.getElementById('game-over-menu-btn').addEventListener('click', () => {
      this.hideAllScreens();
      this.showStartScreen();
    });
    
    // Pause menu
    document.getElementById('pause-btn').addEventListener('click', () => {
      this.togglePause();
    });
    
    document.getElementById('resume-btn').addEventListener('click', () => {
      this.togglePause();
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showSettings(false);
    });
    
    document.getElementById('quit-btn').addEventListener('click', () => {
      this.game.gameOver();
      this.hideAllScreens();
      this.showStartScreen();
    });
    
    // Settings menu
    document.getElementById('settings-back-btn').addEventListener('click', () => {
      this.hideSettings();
    });
    
    const sensitivitySlider = document.getElementById('rotation-sensitivity');
    sensitivitySlider.addEventListener('input', (e) => {
      const value = e.target.value;
      document.getElementById('sensitivity-value').textContent = value;
      this.settings.rotationSensitivity = parseInt(value);
      this.saveSettings();
      this.applySettings();
    });
    
    const maxSpeedSlider = document.getElementById('max-rotation-speed');
    maxSpeedSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      document.getElementById('max-speed-value').textContent = value;
      this.settings.maxRotationSpeed = parseInt(value);
      this.saveSettings();
      this.applySettings();
    });
    
    const fpsToggle = document.getElementById('show-fps');
    fpsToggle.addEventListener('change', (e) => {
      this.settings.showFPS = e.target.checked;
      this.saveSettings();
      this.fpsCounter.classList.toggle('hidden', !this.settings.showFPS);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.game.isRunning) {
        this.togglePause();
      }
    });
  }
  
  togglePause() {
    if (!this.game.isRunning && this.pauseScreen.classList.contains('hidden')) {
      return; // Don't allow pause if game not running
    }
    
    this.game.isPaused = !this.game.isPaused;
    
    if (this.game.isPaused) {
      document.getElementById('pause-score').textContent = this.game.score;
      document.getElementById('pause-level').textContent = this.game.tower.level;
      this.pauseScreen.classList.remove('hidden');
      this.pauseBtn.textContent = '▶';
    } else {
      this.pauseScreen.classList.add('hidden');
      this.pauseBtn.textContent = '⏸';
    }
  }
  
  showSettings(fromStart) {
    this.settingsFromStart = fromStart;
    if (fromStart) {
      this.startScreen.classList.add('hidden');
    } else {
      this.pauseScreen.classList.add('hidden');
    }
    this.settingsScreen.classList.remove('hidden');
  }
  
  hideSettings() {
    this.settingsScreen.classList.add('hidden');
    if (this.settingsFromStart) {
      this.startScreen.classList.remove('hidden');
    } else {
      this.pauseScreen.classList.remove('hidden');
    }
  }
  
  updateFPS(fps) {
    this.fpsCounter.textContent = `${Math.round(fps)} FPS`;
    
    // Color code based on performance
    if (fps >= 55) {
      this.fpsCounter.style.color = '#00ff88';
    } else if (fps >= 30) {
      this.fpsCounter.style.color = '#ffaa00';
    } else {
      this.fpsCounter.style.color = '#ff3860';
    }
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
    
    this.pauseBtn.classList.add('hidden');
    this.gameOverScreen.classList.remove('hidden');
  }

  showStartScreen() {
    this.startScreen.classList.remove('hidden');
    this.pauseBtn.classList.add('hidden');
  }

  hideAllScreens() {
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.settingsScreen.classList.add('hidden');
  }
}
