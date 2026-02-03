import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { COLORS } from '../constants.js';

export class Ball {
  constructor(physicsManager, scene, position = { x: 0, y: 0, z: 0 }) {
    this.initialPosition = position;
    this.radius = 0.4;
    this.consecutivePasses = 0; // For smash-through combo
    this.squashAmount = 0; // For impact animation
    this.squashRecovery = 0; // Recovery speed
    
    // Device detection for performance
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Mesh with adaptive detail
    const segments = this.isMobile ? 16 : 32; // Lower poly on mobile
    const geometry = new THREE.SphereGeometry(this.radius, segments, segments);
    const material = new THREE.MeshStandardMaterial({ 
      color: COLORS.ball,
      emissive: COLORS.ball,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.7,
      envMapIntensity: 1.0
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = !this.isMobile; // Disable shadow on mobile for performance
    this.mesh.receiveShadow = false;
    this.mesh.position.set(position.x, position.y, position.z + 2.5); // Center on platform
    scene.add(this.mesh);

    // Add point light to ball for glow effect
    this.light = new THREE.PointLight(COLORS.ball, 1.5, 8);
    this.light.castShadow = false; // Don't cast shadow from point light for performance
    this.mesh.add(this.light);


    // Physics Body
    const shape = new CANNON.Sphere(this.radius);
    this.body = new CANNON.Body({
      mass: 1, // Dynamic
      shape: shape,
      material: physicsManager.ballMaterial,
      position: new CANNON.Vec3(position.x, position.y, position.z + 2.5)
    });
    
    // Constrain motion to Y axis only (prevents drifting)
    this.body.linearFactor.set(0, 1, 0);

    // No Damping to ensure consistent bouncing height
    this.body.linearDamping = 0.0;
    this.body.angularDamping = 0.1;

    physicsManager.addBody(this.body);
    
    // State
    this.isDead = false;
    this.hasShield = false;
    this.isFireball = false;
  }

  update() {
    // Sync Mesh with Body
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);
    
    // Pulse glow based on speed
    const speed = Math.abs(this.body.velocity.y);
    this.light.intensity = 1.0 + (speed / 15);
    
    // Subtle rotation for visual interest
    this.mesh.rotation.x += 0.01;
    this.mesh.rotation.z += 0.01;
    
    // Squash animation recovery
    if (this.squashAmount > 0) {
      this.squashAmount -= this.squashRecovery;
      if (this.squashAmount < 0) this.squashAmount = 0;
      
      // Apply squash: compress Y, expand X and Z
      const squash = 1 - this.squashAmount * 0.3;
      const stretch = 1 + this.squashAmount * 0.15;
      this.mesh.scale.set(stretch, squash, stretch);
    } else {
      // Ensure scale is normalized
      this.mesh.scale.set(1, 1, 1);
    }
  }

  setColor(color) {
    this.mesh.material.color.setHex(color);
    this.mesh.material.emissive.setHex(color);
    this.light.color.setHex(color);
  }

  activateShield() {
    this.hasShield = true;
    this.setColor(0x00ffff);
  }

  activateFireball() {
    this.isFireball = true;
    this.setColor(0xff6600);
  }

  deactivatePowerups() {
    this.hasShield = false;
    this.isFireball = false;
    this.setColor(COLORS.ball);
  }

  squashOnImpact(intensity = 1) {
    // Squash the ball on impact based on intensity
    this.squashAmount = Math.min(intensity * 0.2, 1.0);
    this.squashRecovery = 0.08; // Recovery speed per frame
  }

  reset() {
    this.body.position.set(this.initialPosition.x, this.initialPosition.y, this.initialPosition.z + 2.5);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.isDead = false;
    this.consecutivePasses = 0;
    this.squashAmount = 0;
    this.mesh.visible = true;
    this.mesh.scale.set(1, 1, 1);
    this.deactivatePowerups();
  }
}
