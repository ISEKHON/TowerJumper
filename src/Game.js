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
    this.combo = 0;
    this.comboTimer = 0;
    this.lastPlatformY = 0;
    
    this.initThree();
    this.initPhysics();
    this.initGameObjects();
    this.initManagers();
    this.initEvents();
    
    this.currentRotationVelocity = 0;
    this.lastTime = performance.now();

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
        antialias: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Performance optimization
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    // Hemisphere light for better ambient
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
    this.scene.add(hemiLight);
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
    
    // DEBUG: Press 'N' key to advance to next level/theme for testing
    window.addEventListener('keydown', (e) => {
        if (e.key === 'n' || e.key === 'N') {
            const nextLevel = this.tower.level + 1;
            this.tower.generateLevel(nextLevel);
            this.uiManager.updateLevel(nextLevel);
            this.ball.body.position.y = 5;
            this.ball.body.velocity.set(0, 0, 0);
        }
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
      
      // Always apply bounce force immediately to ensure continuous bouncing
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
          
          // Reset consecutive passes (combo is for passing through, not bouncing)
          this.ball.consecutivePasses = 0;
      }
  }

  start() {
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.lastPlatformY = 0;
    this.uiManager.updateScore(this.score);
    this.uiManager.updateLevel(1);
    this.uiManager.hideCombo();
    this.tower.generateLevel(1);
    this.ball.reset();
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
      // Rotate Tower based on input
      const deltaX = this.inputManager.getDeltaX();
      
      // Add acceleration
      this.currentRotationVelocity += deltaX * GAMEplay.rotationSpeed;
      
      // Apply damping
      this.currentRotationVelocity *= GAMEplay.rotationDamping;
      
      // Clamp
      this.currentRotationVelocity = clamp(
          this.currentRotationVelocity, 
          -GAMEplay.maxRotationSpeed, 
          GAMEplay.maxRotationSpeed
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
                  
                  // Extra visual feedback
                  const theme = this.tower.theme;
                  this.particleManager.createImpactBurst(
                      this.ball.mesh.position, 
                      theme.particle, 
                      this.ball.consecutivePasses * 5
                  );
              }
              
              this.addScore(points, true);
          }
      });
      
      // Check for level completion and progression
      const deepestPlatform = this.tower.platforms[this.tower.platforms.length - 1];
      
      if (deepestPlatform && ballY < deepestPlatform.y - 10) {
          // Level complete! Increment level and generate next
          const nextLevel = this.tower.level + 1;
          
          this.tower.generateLevel(nextLevel);
          this.uiManager.updateLevel(nextLevel);
          
          // Bonus points for completing level
          this.addScore(100 * nextLevel, true);
          
          // Reset ball position to top
          this.ball.body.position.y = 5;
          this.ball.body.velocity.set(0, 0, 0);
          this.ball.consecutivePasses = 0;
      }
  }

  updateCamera() {
      this.cameraController.update(1/60, this.ball.mesh.position.y);
  }

  animate(time) {
    requestAnimationFrame(this.animate);

    const dt = (time - this.lastTime) / 1000 || 0.016;
    this.lastTime = time;

    this.updatePhysics(dt);
    this.updateGameLogic();
    this.updateCamera();
    
    // Update trail
    this.ballTrail.update(this.ball.mesh.position);
    
    // Update particles
    this.particleManager.update(dt);

    this.renderer.render(this.scene, this.camera);
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
}

