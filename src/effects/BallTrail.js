import * as THREE from 'three';
import { VISUAL } from '../constants.js';

export class BallTrail {
  constructor(scene, color = 0xff0055) {
    this.scene = scene;
    this.positions = [];
    
    // Device detection for performance
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Reduce trail length on mobile for better performance
    this.maxLength = this.isMobile ? Math.floor(VISUAL.trailLength * 0.5) : VISUAL.trailLength;
    
    // Create line geometry
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxLength * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: this.isMobile ? 0.4 : 0.6, // Lighter on mobile
      linewidth: 2
    });
    
    this.line = new THREE.Line(geometry, material);
    this.line.frustumCulled = false;
    scene.add(this.line);
  }

  update(ballPosition) {
    // Add new position
    this.positions.push(ballPosition.clone());
    
    // Trim to max length
    if (this.positions.length > this.maxLength) {
      this.positions.shift();
    }
    
    // Update geometry
    const positionAttribute = this.line.geometry.getAttribute('position');
    for (let i = 0; i < this.maxLength; i++) {
      if (i < this.positions.length) {
        const pos = this.positions[i];
        positionAttribute.setXYZ(i, pos.x, pos.y, pos.z);
      } else {
        // Fill rest with last position to avoid stretching
        const lastPos = this.positions[this.positions.length - 1] || new THREE.Vector3();
        positionAttribute.setXYZ(i, lastPos.x, lastPos.y, lastPos.z);
      }
    }
    positionAttribute.needsUpdate = true;
  }

  setColor(color) {
    this.line.material.color.setHex(color);
  }

  clear() {
    this.positions = [];
  }
}
