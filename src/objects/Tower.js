import * as THREE from 'three';
import { Platform, TYPE } from './Platform.js';
import { COLORS, THEMES } from '../constants.js';
import { randomRange } from '../utils/math.js';

export class Tower {
  constructor(game, scene, physicsManager) {
    this.game = game;
    this.scene = scene;
    this.physicsManager = physicsManager;
    
    this.platforms = [];
    this.rotation = 0;
    
    // Central Pole
    const poleGeo = new THREE.CylinderGeometry(1, 1, 1000, 32);
    // Material will be updated in generateLevel, but we init here
    this.poleMat = new THREE.MeshLambertMaterial({ color: COLORS.pole });
    this.pole = new THREE.Mesh(poleGeo, this.poleMat);
    this.pole.position.y = -400; // Center it somewhat deep
    scene.add(this.pole);

    this.level = 1;
    this.generateLevel(this.level);
  }

  generateLevel(level) {
    this.level = level; // Ensure correct level tracking
    const themeIndex = (level - 1) % THEMES.length;
    this.theme = THEMES[themeIndex];
    
    // Update Pole Color
    this.poleMat.color.setHex(this.theme.pole);
    
    // Update Scene Background (via game ref)
    if (this.game) {
        this.game.updateTheme(this.theme);
    }

    // Clear existing
    this.platforms.forEach(p => {
      this.scene.remove(p.group);
      p.bodies.forEach(b => this.physicsManager.removeBody(b));
    });
    this.platforms = [];

    const startY = 0;
    const distanceBetween = 5;
    const platformCount = 20 + (level * 5);

    // Initial Platform (Purely Safe, but with gaps to jump down)
    // Ball spawns at Z positive (approx angle PI/2). We put gaps away from there.
    const initialPattern = Array(12).fill(TYPE.SAFE);
    // Create a gap opposite to the spawn point
    initialPattern[9] = TYPE.NONE; 
    initialPattern[10] = TYPE.NONE;
    
    this.addPlatform(startY, initialPattern);

    for (let i = 1; i < platformCount; i++) {
       this.addRandomPlatform(startY - (i * distanceBetween), level);
    }
    
    // Final "Finish" Platform
    const finishY = startY - (platformCount * distanceBetween);
    this.addFinishPlatform(finishY);
    
    // Update pole length/pos to cover the level
    this.pole.position.y = (- (platformCount * distanceBetween) / 2);
    this.pole.scale.y = 1; // Reset
    // Actually geometry is fixed 1000. It covers most things.
  }

  addPlatform(y, pattern, isFinish = false) {
    const p = new Platform(this.physicsManager, this.scene, y, pattern, this.theme, isFinish);
    p.setRotation(this.rotation);
    this.platforms.push(p);
  }

  addRandomPlatform(y, difficulty) {
    // 12 segments
    const segments = 12;
    const pattern = Array(segments).fill(TYPE.SAFE);
    
    // Add gap
    let gapSize = Math.floor(randomRange(1, 3)); // 1 or 2 slots
    let gapIndex = Math.floor(randomRange(0, segments));
    
    for(let j=0; j<gapSize; j++) {
        pattern[(gapIndex + j) % segments] = TYPE.NONE;
    }

    // Add danger zones based on difficulty
    let dangerCount = Math.min(Math.floor(difficulty / 2) + 1, 5);
    for(let k=0; k<dangerCount; k++) {
        let hazardIndex = Math.floor(randomRange(0, segments));
        // Don't overwrite gap
        if (pattern[hazardIndex] !== TYPE.NONE) {
            pattern[hazardIndex] = TYPE.DANGER;
        }
    }

    this.addPlatform(y, pattern);
  }
  
  addFinishPlatform(y) {
     // A solid safe platform at the bottom with green glow
     const pattern = Array(12).fill(TYPE.SAFE);
     const p = new Platform(this.physicsManager, this.scene, y, pattern, this.theme, true);
     p.setRotation(this.rotation);
     p.bottom = true;
     this.platforms.push(p);
  }

  update(dt) {
    // Update rotation of all platforms
    // Logic is centralized here
    this.platforms.forEach(p => p.setRotation(this.rotation));
  }

  generateDemoTower() {
    // Special demo tower for testing smash-through mechanics
    // Creates platforms with aligned gaps for easy consecutive passes
    console.log('🎮 Demo Tower Generated - Gaps aligned for smash-through testing!');
    
    const themeIndex = (this.level - 1) % THEMES.length;
    this.theme = THEMES[themeIndex];
    
    // Update visuals
    this.poleMat.color.setHex(this.theme.pole);
    if (this.game) {
        this.game.updateTheme(this.theme);
    }

    // Clear existing
    this.platforms.forEach(p => {
      this.scene.remove(p.group);
      p.bodies.forEach(b => this.physicsManager.removeBody(b));
    });
    this.platforms = [];

    const startY = 0;
    const distanceBetween = 5;
    const platformCount = 25;

    // First platform - safe start with a gap
    const initialPattern = Array(12).fill(TYPE.SAFE);
    initialPattern[9] = TYPE.NONE; 
    initialPattern[10] = TYPE.NONE;
    this.addPlatform(startY, initialPattern);

    // Create groups of platforms with aligned gaps
    // This makes it easy to fall through 3-5 platforms consecutively
    let currentY = startY - distanceBetween;
    
    // Pattern: 3-4 platforms with aligned gaps, then 2 safe platforms to land
    for (let group = 0; group < 5; group++) {
      const gapAngle = Math.floor(randomRange(0, 12));
      
      // 4 platforms with aligned gap (smash-through section)
      for (let i = 0; i < 4; i++) {
        const pattern = Array(12).fill(TYPE.SAFE);
        // Create aligned gap
        pattern[gapAngle] = TYPE.NONE;
        pattern[(gapAngle + 1) % 12] = TYPE.NONE;
        
        // Add some danger zones away from the gap
        const dangerCount = 2;
        for (let d = 0; d < dangerCount; d++) {
          let hazardIndex = (gapAngle + 4 + Math.floor(randomRange(0, 6))) % 12;
          if (pattern[hazardIndex] === TYPE.SAFE) {
            pattern[hazardIndex] = TYPE.DANGER;
          }
        }
        
        this.addPlatform(currentY, pattern);
        currentY -= distanceBetween;
      }
      
      // 1-2 landing platforms (solid or small gap)
      for (let i = 0; i < 2; i++) {
        const pattern = Array(12).fill(TYPE.SAFE);
        // Small random gap
        const landingGap = Math.floor(randomRange(0, 12));
        pattern[landingGap] = TYPE.NONE;
        
        this.addPlatform(currentY, pattern);
        currentY -= distanceBetween;
      }
    }
    
    // Final platform
    const finishPattern = Array(12).fill(TYPE.SAFE);
    this.addPlatform(currentY, finishPattern);
    
    // Update pole
    this.pole.position.y = currentY / 2;
  }
}
