import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { COLORS } from '../constants.js';

export const TYPE = {
  NONE: 0,
  SAFE: 1,
  DANGER: 2
};

export class Platform {
  constructor(physicsManager, scene, y, pattern, theme = null, isFinish = false) {
    this.y = y;
    this.pattern = pattern; // Array of types
    this.theme = theme || { safe: 0x333333, danger: 0xff0055 }; // Use theme or fallback
    this.segments = [];
    this.segmentAngle = (Math.PI * 2) / pattern.length;
    this.radius = 5; // Tower radius
    this.holeRadius = 1; // Center pole radius (the ball falls on the outside usually in Helix Jump? No, inside a tube? Or outside a central pole?)
    // Helix Jump: Ball bounces ON platforms AROUND a central pole.
    // So Inner Radius is pole radius. Outer Radius is platform edge.
    
    // Actually, usually in Helix Jump, the ball is at a fixed radius from center, and the tower spins.
    
    // Device detection for performance optimization
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    this.physicsManager = physicsManager;
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.y = y;
    scene.add(this.group);
    
    this.bodies = [];
    this.isFinish = isFinish; // Mark as finish platform
    
    this.generateMeshesAndColliders();
    
    // Add glowing effect for finish platform
    if (this.isFinish) {
      this.addFinishGlow();
    }
  }

  generateMeshesAndColliders() {
    const thickness = 0.5;
    const innerRadius = 1.0; // Pole radius
    const outerRadius = 4.0; // Platform extent
    
    // We create a geometry for each segment type
    // Optimisation: We could merge meshes of same material.
    
    this.pattern.forEach((type, index) => {
      if (type === TYPE.NONE) return;

      const items = 1; // Just 1 segment per index entry
      const startAngle = index * this.segmentAngle;
      
      // Visual Mesh
      // Arc shape
      const shape = new THREE.Shape();
      shape.moveTo(outerRadius * Math.cos(startAngle), outerRadius * Math.sin(startAngle)); // Start outer
      // Arc outer
      shape.absarc(0, 0, outerRadius, startAngle, startAngle + this.segmentAngle, false);
      // Line to inner
      shape.lineTo(innerRadius * Math.cos(startAngle + this.segmentAngle), innerRadius * Math.sin(startAngle + this.segmentAngle));
      // Arc inner (backwards)
      shape.absarc(0, 0, innerRadius, startAngle + this.segmentAngle, startAngle, true);
      // Close
      // shape.lineTo(outerRadius * Math.cos(startAngle), outerRadius * Math.sin(startAngle));
      
      const extrudeSettings = {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: this.isMobile ? 3 : 6 // Lower detail on mobile for performance
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // Center the mesh visually on Y
      geometry.translate(0, 0, -thickness / 2); 
      // Three.js shapes are on XY plane. Physics normally needs to match.
      // We will rotate mesh -90 deg X to flat.
      geometry.rotateX(-Math.PI / 2);
      
      // Clean, intentional material design
      let color, emissive, emissiveIntensity, roughness, metalness;
      
      if (this.isFinish) {
        // Finish platform - subtle green glow
        color = 0x00dd88;
        emissive = 0x00ff99;
        emissiveIntensity = 0.4;
        roughness = 0.3;
        metalness = 0.6;
      } else if (type === TYPE.DANGER) {
        // Danger - matte with slight glow
        color = this.theme.danger;
        emissive = this.theme.danger;
        emissiveIntensity = 0.2;
        roughness = 0.5;
        metalness = 0.3;
      } else {
        // Safe - clean dark surface
        color = this.theme.safe;
        emissive = 0x000000;
        emissiveIntensity = 0;
        roughness = 0.6;
        metalness = 0.4;
      }
      
      const material = new THREE.MeshStandardMaterial({ 
        color,
        emissive,
        emissiveIntensity,
        roughness,
        metalness
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      
      mesh.userData = { type }; // Store type for collision logic
      this.group.add(mesh);

      // Physics
      // Creating Trimesh from visual geometry
      const vertices = [];
      const positionAttribute = geometry.attributes.position;
      for (let i = 0; i < positionAttribute.count; i++) {
        vertices.push(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        );
      }
      
      const indices = [];
      if (geometry.index) {
          for (let i = 0; i < geometry.index.count; i++) {
              indices.push(geometry.index.getX(i));
          }
      } else {
         // If non-indexed, assume triplets
         for (let i = 0; i < positionAttribute.count; i++) {
             indices.push(i);
         }
      }
      
      const trimeshShape = new CANNON.Trimesh(vertices, indices);
      const body = new CANNON.Body({
          mass: 0 // Static
      });
      body.addShape(trimeshShape);
      
      // Set position relative to the Group?
      // No, Cannon bodies are world space.
      // But we need to rotate the tower.
      // If we rotate the tower, we must rotate the bodies.
      // Complex.
      // Alternative: Keep physics static, rotate the ball around the center.
      // But standard approach:
      // Kinetic Bodies for platforms.
      // Or:
      // Since it's a cylinder, we can keep the world static and only rotate the VISUAL tower?
      // No, the ball needs to hit gaps.
      // If I rotate the tower (Visuals), I need to rotate the physical gaps too.
      
      // ROTATION STRATEGY:
      // We keep the ball mostly fixed on X/Z (only dropping Y), and we rotate the ENTIRE WORLD of platforms around Y axis?
      // Yes. So the bodies must be Kinematic or updated manually.
      // Or, simpler for physics engine:
      // The platform isn't one big body. It's segments.
      // If I use `body.quaternion.setFromEuler(0, rotation, 0)`, the trimesh rotates.
      // For Static bodies, moving them is expensive in some engines. In Cannon, it's okay IF we handle it right.
      // Actually, if we use Kinematic bodies, they can be moved.
      
      body.type = CANNON.Body.KINEMATIC;
      body.position.set(0, this.y, 0); // Position is just Y offset. The vertices handle the rest.
      body.material = this.physicsManager.platformMaterial;
      
      // Save reference to update rotation later
      body.userData = { parentPlatform: this, type }; 
      this.bodies.push(body);
      this.physicsManager.addBody(body);
    });
  }

  setRotation(angle) {
    // Update visual group
    this.group.rotation.y = angle;
    
    // Update physics bodies
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
    
    this.bodies.forEach(body => {
      body.quaternion.copy(quat);
    });
  }

  addFinishGlow() {
    // Pulsing glow animation for finish platform
    let intensity = 0.5;
    let direction = 1;
    
    const pulseInterval = setInterval(() => {
      intensity += direction * 0.02;
      
      if (intensity >= 1.0) {
        intensity = 1.0;
        direction = -1;
      } else if (intensity <= 0.3) {
        intensity = 0.3;
        direction = 1;
      }
      
      this.group.children.forEach(mesh => {
        if (mesh.material && mesh.material.emissive) {
          mesh.material.emissiveIntensity = intensity;
        }
      });
    }, 50);
    
    // Store interval for cleanup
    this.glowInterval = pulseInterval;
  }
}
