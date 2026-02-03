import * as THREE from 'three';
import { COLORS, VISUAL } from '../constants.js';
import { randomRange } from '../utils/math.js';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.activeParticles = [];
    this.splatters = []; // Track splatters for cleanup
    
    // Create particle pool for bursts
    this.particlePool = [];
    this.createParticlePool(80); // Increased for burst effects
  }

  createParticlePool(count) {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(0.12, 8, 8);
      const material = new THREE.MeshStandardMaterial({ 
        color: 0xffffff, 
        transparent: true,
        opacity: 1,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
        roughness: 0.4,
        metalness: 0.6
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.visible = false;
      particle.castShadow = false;
      this.scene.add(particle);
      this.particlePool.push({
        mesh: particle,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0
      });
    }
  }

  createLiquidSplatter(position, platformGroup, color = 0xff0055) {
    // Create organic liquid-like splatter using multiple circles
    const splatterGroup = new THREE.Group();
    
    // Main splatter blob
    const mainSize = randomRange(0.3, 0.6);
    const segments = 32;
    const geometry = new THREE.CircleGeometry(mainSize, segments);
    
    // Deform the circle to make it organic
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      if (i > 0) { // Skip center vertex
        const x = positions.getX(i);
        const y = positions.getY(i);
        const angle = Math.atan2(y, x);
        const distortion = 1 + Math.sin(angle * randomRange(3, 6)) * randomRange(0.1, 0.3);
        positions.setX(i, x * distortion);
        positions.setY(i, y * distortion);
      }
    }
    positions.needsUpdate = true;
    
    const material = new THREE.MeshBasicMaterial({ 
      color: color, 
      transparent: true, 
      opacity: randomRange(0.6, 0.8),
      side: THREE.DoubleSide
    });
    const mainSplat = new THREE.Mesh(geometry, material);
    mainSplat.rotation.z = Math.random() * Math.PI * 2;
    splatterGroup.add(mainSplat);
    
    // Add smaller droplets around main splatter
    const dropletCount = Math.floor(randomRange(3, 7));
    for (let i = 0; i < dropletCount; i++) {
      const dropletSize = randomRange(0.08, 0.15);
      const dropletGeo = new THREE.CircleGeometry(dropletSize, 16);
      const dropletMat = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: randomRange(0.5, 0.7),
        side: THREE.DoubleSide
      });
      const droplet = new THREE.Mesh(dropletGeo, dropletMat);
      
      // Position around main splatter
      const angle = (i / dropletCount) * Math.PI * 2 + randomRange(-0.3, 0.3);
      const distance = mainSize + randomRange(0.1, 0.3);
      droplet.position.x = Math.cos(angle) * distance;
      droplet.position.y = Math.sin(angle) * distance;
      droplet.position.z = 0.001; // Slightly above to prevent z-fighting
      
      splatterGroup.add(droplet);
    }
    
    // Position the splatter group
    // Convert world position to local platform coordinates
    const localPos = platformGroup.worldToLocal(position.clone());
    splatterGroup.position.copy(localPos);
    
    // Rotate to lay flat on platform (platform is already rotated in world)
    splatterGroup.rotation.x = -Math.PI / 2;
    
    // Barely lift above surface to prevent z-fighting but stay attached
    splatterGroup.position.y += 0.005;
    
    platformGroup.add(splatterGroup);
    this.splatters.push(splatterGroup);
    
    // Limit splatter count for performance
    if (this.splatters.length > 30) {
      const oldSplatter = this.splatters.shift();
      if (oldSplatter.parent) {
        oldSplatter.parent.remove(oldSplatter);
      }
    }
  }

  createImpactBurst(position, color = 0xff0055, count = VISUAL.particleBurstCount) {
    // Simple particle burst
    let emitted = 0;
    for (let i = 0; i < this.particlePool.length && emitted < count; i++) {
      const p = this.particlePool[i];
      if (!p.mesh.visible) {
        p.mesh.position.copy(position);
        p.mesh.material.color.setHex(color);
        p.mesh.material.emissive.setHex(color);
        p.mesh.material.opacity = 1;
        p.mesh.visible = true;
        
        // Random velocity in a cone
        const angle = Math.random() * Math.PI * 2;
        const speed = randomRange(3, 8);
        p.velocity.set(
          Math.cos(angle) * speed,
          randomRange(3, 6),
          Math.sin(angle) * speed
        );
        
        p.life = 0;
        p.maxLife = randomRange(0.3, 0.6);
        
        this.activeParticles.push(p);
        emitted++;
      }
    }
  }

  createBallBurst(position, color = 0xff0055) {
    // Explosive burst when ball dies - more particles, higher speed
    let emitted = 0;
    const count = 30; // More particles for explosion
    for (let i = 0; i < this.particlePool.length && emitted < count; i++) {
      const p = this.particlePool[i];
      if (!p.mesh.visible) {
        p.mesh.position.copy(position);
        p.mesh.material.color.setHex(color);
        p.mesh.material.emissive.setHex(color);
        p.mesh.material.opacity = 1;
        p.mesh.visible = true;
        p.mesh.scale.setScalar(randomRange(1, 1.5));
        
        // Spherical explosion
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = randomRange(8, 15);
        p.velocity.set(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed,
          Math.cos(phi) * speed
        );
        
        p.life = 0;
        p.maxLife = randomRange(0.5, 1.0);
        
        this.activeParticles.push(p);
        emitted++;
      }
    }
  }

  update(dt) {
    // Update all active particles
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
        this.activeParticles.splice(i, 1);
        continue;
      }
      
      // Update position
      p.velocity.y -= 20 * dt; // Gravity
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      
      // Fade out
      const fadeProgress = p.life / p.maxLife;
      p.mesh.material.opacity = 1 - fadeProgress;
      p.mesh.material.emissiveIntensity = 0.5 * (1 - fadeProgress);
      p.mesh.scale.setScalar(1 - fadeProgress * 0.5);
    }
  }
}
