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

  addPlatform(y, pattern) {
    const p = new Platform(this.physicsManager, this.scene, y, pattern, this.theme);
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
     // A solid safe platform at the bottom, visual difference maybe?
     const pattern = Array(12).fill(TYPE.SAFE);
     // Green color for finish? 
     // We'll stick to safe for now, logic handles "Win" by depth or passing all
     this.addPlatform(y, pattern);
     this.platforms[this.platforms.length -1].bottom = true;
  }

  update(dt) {
    // Update rotation of all platforms
    // Logic is centralized here
    this.platforms.forEach(p => p.setRotation(this.rotation));
  }
}
