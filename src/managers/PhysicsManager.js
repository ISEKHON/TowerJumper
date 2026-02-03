import * as CANNON from 'cannon-es';
import { PHYSICS } from '../constants.js';

export class PhysicsManager {
  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, PHYSICS.gravity, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    // this.world.solver.iterations = 10;

    this.ballMaterial = new CANNON.Material('ball');
    this.platformMaterial = new CANNON.Material('platform');

    const contactMaterial = new CANNON.ContactMaterial(
      this.ballMaterial,
      this.platformMaterial,
      { friction: 0.0, restitution: 0.2 } // Lower restitution so manual bounce control takes over
    );

    this.world.addContactMaterial(contactMaterial);
    
    // Fixed time step
    this.fixedTimeStep = PHYSICS.dt;
  }

  setGravity(y) {
    this.world.gravity.set(0, y, 0);
  }

  update(dt) {
    this.world.step(this.fixedTimeStep, dt, 3);
  }

  addBody(body) {
    this.world.addBody(body);
  }

  removeBody(body) {
    this.world.removeBody(body);
  }
}
