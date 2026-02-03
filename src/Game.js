import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PhysicsManager } from './managers/PhysicsManager.js';
import { InputManager } from './managers/InputManager.js';
import { UIManager } from './managers/UIManager.js';
import { Ball } from './objects/Ball.js';
import { Tower } from './objects/Tower.js';
import { ParticleManager } from './effects/ParticleSystem.js';
import { BallTrail } from './effects/BallTrail.js';
import { CameraController } from './utils/CameraController.js';
import { TYPE } from './objects/Platform.js';
import { PHYSICS, GAMEplay, COLORS } from './constants.js';
import { lerp, clamp } from './utils/math.js';

export class Game {
  constructor() {
    this.container = document.body;
    this.score = 0;
    this.highScore = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.lastPlatformY = 0;
    this.isCompletingLevel = false; // Prevent multiple level completions
    
    // Detect device capabilities for performance optimization
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.isLowEnd = this.isMobile || navigator.hardwareConcurrency <= 4;
    
    // Device-specific rotation sensitivity (will be overridden by settings)
    this.rotationSpeed = this.isMobile ? 0.012 : 0.003;
    this.maxRotationSpeed = this.isMobile ? 0.25 : 0.12;
    
    this.initThree();
    this.initPhysics();
    this.initGameObjects();
    this.initManagers();
    this.initEvents();
    
    this.currentRotationVelocity = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.physicsAccumulator = 0;
    this.fixedTimeStep = 1 / 120; // 120 FPS physics for smoothness
    
    // FPS tracking
    this.fpsFrames = 0;
    this.fpsLastTime = performance.now();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.fog, 20, 50);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, -2, 0);
    
    this.renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('game-canvas'), 
        antialias: !this.isMobile, // Disable AA on mobile for performance
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // Adaptive pixel ratio for performance
    const pixelRatio = this.isMobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(pixelRatio);
    
    // Optimize shadow quality based on device
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.isLowEnd ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;
    
    // Additional renderer optimizations
    this.renderer.sortObjects = false; // Disable sorting for performance

    // Clean, atmospheric lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    this.scene.add(ambientLight);

    // Main light with adaptive shadow quality
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(8, 15, 5);
    dirLight.castShadow = true;
    // Lower shadow resolution on mobile/low-end devices
    const shadowMapSize = this.isLowEnd ? 1024 : 2048;
    dirLight.shadow.mapSize.width = shadowMapSize;
    dirLight.shadow.mapSize.height = shadowMapSize;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    // Subtle fill light
    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);
  }

  initPhysics() {
    this.physicsManager = new PhysicsManager();
  }

  initGameObjects() {
    // Ball
    this.ball = new Ball(this.physicsManager, this.scene, { x: 0, y: 3, z: 0 });
    
    // Tower (this will set the initial theme)
    this.tower = new Tower(this, this.scene, this.physicsManager);
    
    // Ball trail - use theme color if tower has been initialized
    const initialColor = this.tower.theme ? this.tower.theme.particle : COLORS.ball;
    this.ballTrail = new BallTrail(this.scene, initialColor);
    
    // Apply initial theme to ball
    if (this.tower.theme) {
      this.ball.setColor(this.tower.theme.danger);
    }
  }

  initManagers() {
    this.inputManager = new InputManager(this.renderer.domElement);
    this.uiManager = new UIManager(this);
    this.particleManager = new ParticleManager(this.scene);
    this.cameraController = new CameraController(this.camera);
  }

  initEvents() {
    window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Collision handling
    this.ball.body.addEventListener('collide', (e) => {
        if (!this.isRunning) return;
        
        const contactNormal = new CANNON.Vec3();
        e.contact.ni.negate(contactNormal); // Direction from ball to body
        
        // More lenient collision detection - accept any upward-ish normal
        if (contactNormal.y > 0.2 || this.ball.body.velocity.y < 0) {
             this.handleCollision(e.body);
        }
    });
  }

  handleCollision(body) {
      const type = body.userData.type;
      
      if (!type) return; // Skip if no type defined
      
      // CHECK FOR FINISH PLATFORM FIRST!
      if (body.userData.parentPlatform && body.userData.parentPlatform.isFinish) {
          const theme = this.tower.theme;
          
          // Epic finish platform destruction
          this.particleManager.createImpactBurst(
              this.ball.mesh.position, 
              0x00ff66, // Green explosion
              80
          );
          
          // Destroy finish platform with special effect
          this.destroyFinishPlatform(body.userData.parentPlatform, theme);
          
          // Massive camera shake
          this.cameraController.shake(0.5, 0.4);
          
          // Stop ball
          this.ball.body.velocity.set(0, 0, 0);
          
          // Trigger level completion after short delay
          setTimeout(() => {
              this.completeLevel();
          }, 800);
          
          return; // Don't do normal collision handling
      }
      
      // SMASH-THROUGH POWER: If passed through 3+ platforms, destroy next platform!
      if (this.ball.consecutivePasses >= 3) {
          const theme = this.tower.theme;
          
          // Destroy the platform regardless of type
          if (body.userData.parentPlatform) {
              // Massive explosion
              this.particleManager.createImpactBurst(
                  this.ball.mesh.position, 
                  theme.particle, 
                  50
              );
              
              // Platform destruction effect
              this.destroyPlatform(body.userData.parentPlatform, theme);
              
              // Huge camera shake
              this.cameraController.shake(0.4, 0.3);
              
              // Bonus points for destroying platform
              this.addScore(50 * this.ball.consecutivePasses, true);
              
              // Show smash notification
              this.uiManager.showNotification(`💥 SMASH! ${this.ball.consecutivePasses}x`, '#ff6600', 1500);
              
              // RESET combo after using the smash power!
              this.ball.consecutivePasses = 0;
              this.combo = 0;
              this.uiManager.hideCombo();
              
              // Keep ball falling - NO BOUNCE
              // Just dampen the velocity slightly for effect
              this.ball.body.velocity.y *= 0.8;
              
              return; // Don't do normal collision handling
          }
      }
      
      // Normal collision handling
      const bounceVelocity = GAMEplay.bounceForce;
      
      if (type === TYPE.DANGER) {
          // Check if ball has shield or fireball
          if (this.ball.hasShield) {
              // Shield absorbs hit
              this.ball.deactivatePowerups();
              this.ball.body.velocity.y = Math.min(bounceVelocity, GAMEplay.maxBounceForce);
              this.cameraController.shake(0.1, 0.15);
              this.addScore(10, false);
              return;
          } else if (this.ball.isFireball) {
              // Fireball destroys platform
              this.ball.body.velocity.y = Math.min(bounceVelocity, GAMEplay.maxBounceForce);
              this.addScore(20, true);
              // Visual feedback
              const theme = this.tower.theme;
              this.particleManager.createImpactBurst(this.ball.mesh.position, theme.danger, 20);
              this.cameraController.shake(0.2, 0.2);
              return;
          }
          
          // Ball burst effect on death
          const theme = this.tower.theme;
          this.particleManager.createBallBurst(this.ball.mesh.position, theme.danger || COLORS.ball);
          this.cameraController.shake(0.3, 0.3);
          
          // Hide ball briefly before game over
          this.ball.mesh.visible = false;
          this.ball.body.velocity.set(0, 0, 0);
          
          // Delay game over for visual effect
          setTimeout(() => {
              this.gameOver();
          }, 500);
          
          return; // Don't continue processing
      } else {
          // Safe platform - ALWAYS bounce with guaranteed upward velocity
          // Force velocity to ensure bounce even if physics simulation had dampened it
          const newVelocity = Math.max(bounceVelocity, this.ball.body.velocity.y + bounceVelocity);
          // Clamp to maximum to prevent excessive bouncing
          this.ball.body.velocity.y = Math.min(newVelocity, GAMEplay.maxBounceForce);
          
          // Create liquid splatter effect
          if (body.userData.parentPlatform) {
              const theme = this.tower.theme;
              this.particleManager.createLiquidSplatter(
                  this.ball.mesh.position, 
                  body.userData.parentPlatform.group,
                  theme.particle
              );
          }
          
          // Particle burst on impact
          const theme2 = this.tower.theme;
          this.particleManager.createImpactBurst(this.ball.mesh.position, theme2.particle, 15);
          
          // Camera shake based on speed
          const speed = Math.abs(this.ball.body.velocity.y);
          if (speed > 5) {
              this.cameraController.shake(0.1, 0.15);
          }
          
          // Smash-through landing impact!
          if (this.ball.consecutivePasses > 1) {
              // Big impact burst based on smash count
              const burstSize = Math.min(this.ball.consecutivePasses * 8, 40);
              this.particleManager.createImpactBurst(
                  this.ball.mesh.position, 
                  theme2.particle, 
                  burstSize
              );
              
              // Extra camera shake for big smashes
              this.cameraController.shake(0.3 * Math.min(this.ball.consecutivePasses / 3, 1), 0.25);
              
              // Squash ball on impact
              this.ball.squashOnImpact(this.ball.consecutivePasses);
          }
          
          // Reset consecutive passes (combo is for passing through, not bouncing)
          this.ball.consecutivePasses = 0;
          this.uiManager.resetStreak();
      }
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.lastPlatformY = 0;
    this.isCompletingLevel = false;
    this.uiManager.updateScore(this.score);
    this.uiManager.updateLevel(1);
    this.uiManager.hideCombo();
    this.uiManager.resetStreak();
    this.tower.generateLevel(1);
    this.ball.reset();
    this.ball.mesh.visible = true; // Ensure ball is visible
    this.ballTrail.clear();
    
    // Reset Tower rotation
    this.currentRotationVelocity = 0;
    this.tower.rotation = 0;
    this.tower.update(0);
    
    this.isRunning = true;
    this.lastTime = performance.now();
  }

  restart() {
      this.start();
  }

  gameOver() {
      this.isRunning = false;
      this.uiManager.showGameOver(this.score, this.tower.level);
  }

  addScore(points, animate = true) {
      this.score += points;
      this.uiManager.updateScore(this.score, animate);
  }

  updatePhysics(dt) {
      // Only update physics when game is running and not paused
      if (!this.isRunning || this.isPaused) return;
      
      // Rotate Tower based on input
      const deltaX = this.inputManager.getDeltaX();
      
      // Add acceleration with device-specific sensitivity
      this.currentRotationVelocity += deltaX * this.rotationSpeed;
      
      // Apply damping - much less on mobile for continuous rotation while holding
      const damping = this.isMobile ? 0.98 : GAMEplay.rotationDamping;
      this.currentRotationVelocity *= damping;
      
      // Clamp with device-specific max speed
      this.currentRotationVelocity = clamp(
          this.currentRotationVelocity, 
          -this.maxRotationSpeed, 
          this.maxRotationSpeed
      );
      
      this.tower.rotation += this.currentRotationVelocity;
      this.tower.update(dt);
      
      this.physicsManager.update(dt);
      this.ball.update();
      
      // Failsafe: If ball is moving too slowly vertically and is above a platform, give it a push
      if (this.isRunning && Math.abs(this.ball.body.velocity.y) < 2) {
          // Check if there's a platform nearby
          const ballY = this.ball.body.position.y;
          const nearPlatform = this.tower.platforms.some(p => Math.abs(p.y - ballY) < 1);
          if (nearPlatform && this.ball.body.velocity.y < 1) {
              this.ball.body.velocity.y = Math.min(GAMEplay.bounceForce, GAMEplay.maxBounceForce);
          }
      }
  }
  
  updateGameLogic() {
      if (!this.isRunning) return;
      
      // Update progress bar
      const ballY = this.ball.mesh.position.y;
      if (this.tower.platforms.length > 0) {
          const firstPlatform = this.tower.platforms[0];
          const lastPlatform = this.tower.platforms[this.tower.platforms.length - 1];
          const totalDistance = firstPlatform.y - lastPlatform.y;
          const currentDistance = firstPlatform.y - ballY;
          const progress = (currentDistance / totalDistance) * 100;
          
          // Update progress bar with theme color
          const theme = this.tower.theme;
          this.uiManager.updateProgress(progress, theme.danger);
      }
      
      // Update combo timer
      if (this.comboTimer > 0) {
          this.comboTimer -= 1/60;
          if (this.comboTimer <= 0) {
              this.combo = 0;
              this.uiManager.hideCombo();
          }
      }
      
      
      // Track if ball is falling through multiple platforms (c)
      let passedThrough = false;
      
      // Iterate platforms to check passing
      this.tower.platforms.forEach(p => {
          if (!p.passed && ballY < p.y - 0.5) {
              p.passed = true;
              passedThrough = true;
              
              // Increment consecutive passes
              this.ball.consecutivePasses++;
              
              const theme = this.tower.theme;
              
              // Small burst effect when passing through gaps
              const burstPos = new THREE.Vector3(0, p.y, 0);
              this.particleManager.createImpactBurst(
                  burstPos, 
                  theme.particle, 
                  10 + (this.ball.consecutivePasses * 2)
              );
              
              // Show combo counter growing
              if (this.ball.consecutivePasses >= 3) {
                  this.uiManager.showCombo(
                      this.ball.consecutivePasses, 
                      this.ball.consecutivePasses * 10
                  );
                  this.uiManager.updateStreak(this.ball.consecutivePasses);
              }
              
              // Base points
              let points = 10;
              
              // Combo system
              this.combo++;
              this.comboTimer = GAMEplay.comboTimeWindow;
              
              if (this.combo > 1) {
                  const comboBonus = this.combo * GAMEplay.comboMultiplier;
                  points += comboBonus;
                  this.uiManager.showCombo(this.combo, comboBonus);
              }
              
              // Smash-through bonus (falling through multiple platforms without bouncing)
              if (this.ball.consecutivePasses > 1) {
                  const smashBonus = this.ball.consecutivePasses * GAMEplay.smashThroughBonus;
                  points += smashBonus;
              }
              
              this.addScore(points, true);
          }
      });
      
      // Level completion is now handled by finish platform collision
      // Old automatic completion removed to prevent double-triggering
  }

  updateCamera() {
      this.cameraController.update(1/60, this.ball.mesh.position.y);
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    const dt = Math.min((time - this.lastTime) / 1000, 0.1); // Cap dt to prevent spiral of death
    this.lastTime = time;

    // Fixed timestep physics for consistent simulation
    this.physicsAccumulator += dt;
    
    // Run physics at fixed 120 FPS for smoothness
    while (this.physicsAccumulator >= this.fixedTimeStep) {
      this.updatePhysics(this.fixedTimeStep);
      this.physicsAccumulator -= this.fixedTimeStep;
    }
    
    // Update game logic and visuals at render framerate (skip if paused)
    if (!this.isPaused) {
      this.updateGameLogic();
      this.updateCamera();
      
      // Update trail
      this.ballTrail.update(this.ball.mesh.position);
      
      // Update particles
      this.particleManager.update(dt);
    }

    this.renderer.render(this.scene, this.camera);
    
    // FPS tracking
    this.fpsFrames++;
    if (time - this.fpsLastTime >= 1000) {
      const fps = this.fpsFrames / ((time - this.fpsLastTime) / 1000);
      this.uiManager.updateFPS(fps);
      this.fpsFrames = 0;
      this.fpsLastTime = time;
    }
  }

  updateTheme(theme) {
     this.scene.background.setHex(theme.background);
     
     // If fog is present
     if(this.scene.fog) this.scene.fog.color.setHex(theme.background);
     
     // Update ball trail color
     if(this.ballTrail) {
         this.ballTrail.setColor(theme.particle);
     }
     
     // Update ball color to match theme
     if(this.ball) {
         this.ball.setColor(theme.danger);
     }
  }
  flashPlatform(platform, theme) {
      // Flash and fade out platform when destroyed during smash-through
      const originalColors = [];
      
      platform.group.children.forEach((mesh, idx) => {
          if (mesh.material) {
              // Store original color
              originalColors[idx] = mesh.material.color.getHex();
              
              // Flash white
              mesh.material.color.setHex(0xffffff);
              mesh.material.emissive.setHex(0xffffff);
              mesh.material.emissiveIntensity = 1.0;
          }
      });
      
      // Animate back and fade out
      let elapsed = 0;
      const duration = 0.3;
      
      const fadeInterval = setInterval(() => {
          elapsed += 0.016;
          const progress = elapsed / duration;
          
          if (progress >= 1) {
              clearInterval(fadeInterval);
              // Make platform invisible but keep physics
              platform.group.children.forEach(mesh => {
                  if (mesh.material) {
                      mesh.material.opacity = 0.2;
                      mesh.material.transparent = true;
                  }
              });
              return;
          }
          
          platform.group.children.forEach((mesh, idx) => {
              if (mesh.material) {
                  // Fade from white back to original color
                  mesh.material.color.lerp(
                      new THREE.Color(originalColors[idx] || theme.safe), 
                      progress
                  );
                  mesh.material.emissive.lerp(
                      new THREE.Color(theme.particle), 
                      progress
                  );
                  mesh.material.emissiveIntensity = 1.0 * (1 - progress);
                  mesh.material.opacity = 1 - (progress * 0.8);
                  mesh.material.transparent = true;
              }
          });
      }, 16);
  }

  destroyFinishPlatform(platform, theme) {
      // Epic destruction for finish platform with green effects
      platform.bodies.forEach(b => this.physicsManager.removeBody(b));
      platform.bodies = [];
      
      const platformPos = new THREE.Vector3(0, platform.y, 0);
      
      // Multiple green explosions
      for (let i = 0; i < 5; i++) {
          setTimeout(() => {
              this.particleManager.createImpactBurst(
                  platformPos, 
                  0x00ff66, 
                  50 - i * 5
              );
          }, i * 100);
      }
      
      // Animate pieces with green glow
      platform.group.children.forEach((mesh) => {
          if (!mesh.material) return;
          
          mesh.material = mesh.material.clone();
          mesh.material.transparent = true;
          
          // Bright green flash
          mesh.material.color.setHex(0x00ff66);
          mesh.material.emissive.setHex(0x00ff66);
          mesh.material.emissiveIntensity = 4.0;
          
          const originalPos = mesh.position.clone();
          const angle = Math.random() * Math.PI * 2;
          const force = 5 + Math.random() * 4;
          const direction = new THREE.Vector3(
              Math.cos(angle) * force,
              Math.random() * 5, // Upward explosion
              Math.sin(angle) * force
          );
          
          const spinX = (Math.random() - 0.5) * 0.4;
          const spinY = (Math.random() - 0.5) * 0.4;
          const spinZ = (Math.random() - 0.5) * 0.4;
          
          const startTime = performance.now();
          const duration = 1000; // Longer for finish
          
          const animatePiece = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              if (progress >= 1) {
                  mesh.visible = false;
                  return;
              }
              
              const easeOut = 1 - Math.pow(1 - progress, 3);
              
              mesh.position.x = originalPos.x + direction.x * easeOut;
              mesh.position.y = originalPos.y + direction.y * easeOut - progress * progress * 3; // Gravity
              mesh.position.z = originalPos.z + direction.z * easeOut;
              
              mesh.rotation.x += spinX;
              mesh.rotation.y += spinY;
              mesh.rotation.z += spinZ;
              
              // Green glow fade
              mesh.material.opacity = 1 - progress;
              mesh.material.emissiveIntensity = 4.0 * (1 - progress);
              
              const scale = 1 + progress * 0.5; // Expand
              mesh.scale.set(scale, scale, scale);
              
              requestAnimationFrame(animatePiece);
          };
          
          requestAnimationFrame(animatePiece);
      });
  }

  completeLevel() {
      // Prevent multiple calls
      if (this.isCompletingLevel) return;
      this.isCompletingLevel = true;
      
      // Level completion logic
      const currentLevel = this.tower.level;
      const nextLevel = currentLevel + 1;
      const bonusScore = 100 * nextLevel;
      
      // Show level complete animation
      this.uiManager.showLevelComplete(nextLevel, bonusScore);
      
      // Generate next level
      this.tower.generateLevel(nextLevel);
      this.uiManager.updateLevel(nextLevel);
      
      // Bonus points
      this.addScore(bonusScore, true);
      
      // Reset ball
      this.ball.body.position.y = 5;
      this.ball.body.velocity.set(0, 0, 0);
      this.ball.consecutivePasses = 0;
      this.combo = 0;
      this.uiManager.resetStreak();
      
      // Reset flag after a delay
      setTimeout(() => {
          this.isCompletingLevel = false;
      }, 1000);
  }

  destroyPlatform(platform, theme) {
      // Remove physics bodies IMMEDIATELY so ball falls through
      platform.bodies.forEach(b => this.physicsManager.removeBody(b));
      platform.bodies = [];
      
      const platformPos = new THREE.Vector3(0, platform.y, 0);
      
      // Massive initial burst
      this.particleManager.createImpactBurst(platformPos, theme.particle, 60);
      
      // Secondary bursts with delay for eye-candy
      setTimeout(() => {
          this.particleManager.createImpactBurst(platformPos, 0xffffff, 40);
      }, 80);
      setTimeout(() => {
          this.particleManager.createImpactBurst(platformPos, theme.danger || theme.particle, 30);
      }, 160);
      
      // Animate each piece with smooth requestAnimationFrame
      platform.group.children.forEach((mesh) => {
          if (!mesh.material) return;
          
          // Clone material to avoid sharing issues
          mesh.material = mesh.material.clone();
          mesh.material.transparent = true;
          
          // Instant white flash
          const originalColor = mesh.material.color.clone();
          mesh.material.color.setHex(0xffffff);
          mesh.material.emissive.setHex(0xffffff);
          mesh.material.emissiveIntensity = 3.0;
          
          // Store original transform
          const originalPos = mesh.position.clone();
          const originalRot = mesh.rotation.clone();
          
          // Random explosion direction
          const angle = Math.random() * Math.PI * 2;
          const force = 4 + Math.random() * 3;
          const direction = new THREE.Vector3(
              Math.cos(angle) * force,
              -2 - Math.random() * 3, // Downward
              Math.sin(angle) * force
          );
          
          // Random spin speeds
          const spinX = (Math.random() - 0.5) * 0.3;
          const spinY = (Math.random() - 0.5) * 0.3;
          const spinZ = (Math.random() - 0.5) * 0.3;
          
          const startTime = performance.now();
          const duration = 600; // Longer, smoother animation
          
          const animatePiece = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              if (progress >= 1) {
                  mesh.visible = false;
                  return;
              }
              
              // Easing function for smooth motion
              const easeOut = 1 - Math.pow(1 - progress, 3);
              
              // Explosive movement with gravity
              mesh.position.x = originalPos.x + direction.x * easeOut;
              mesh.position.y = originalPos.y + direction.y * easeOut;
              mesh.position.z = originalPos.z + direction.z * easeOut;
              
              // Spinning
              mesh.rotation.x = originalRot.x + spinX * progress * 20;
              mesh.rotation.y = originalRot.y + spinY * progress * 20;
              mesh.rotation.z = originalRot.z + spinZ * progress * 20;
              
              // Smooth fade: white flash -> original color -> fade out
              if (progress < 0.2) {
                  // Flash phase
                  const flashProgress = progress / 0.2;
                  mesh.material.color.lerpColors(
                      new THREE.Color(0xffffff),
                      originalColor,
                      flashProgress
                  );
                  mesh.material.emissiveIntensity = 3.0 * (1 - flashProgress);
              } else {
                  // Fade phase
                  const fadeProgress = (progress - 0.2) / 0.8;
                  mesh.material.opacity = 1 - fadeProgress;
                  mesh.material.emissiveIntensity = 0;
              }
              
              // Scale down slightly for impact
              const scale = 1 - progress * 0.3;
              mesh.scale.set(scale, scale, scale);
              
              requestAnimationFrame(animatePiece);
          };
          
          requestAnimationFrame(animatePiece);
      });
  }}

