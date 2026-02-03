import { lerp } from '../utils/math.js';
import { VISUAL } from '../constants.js';

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.basePosition = camera.position.clone();
    this.targetPosition = this.basePosition.clone();
    
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;
  }

  shake(intensity = VISUAL.cameraShakeIntensity, duration = VISUAL.cameraShakeDuration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = 0;
  }

  update(dt, ballY) {
    // Follow ball
    this.targetPosition.y = ballY + 3;
    this.camera.position.y = lerp(this.camera.position.y, this.targetPosition.y, 0.1);
    
    // Camera shake
    if (this.shakeTime < this.shakeDuration) {
      this.shakeTime += dt;
      const progress = this.shakeTime / this.shakeDuration;
      const currentIntensity = this.shakeIntensity * (1 - progress);
      
      this.camera.position.x = this.basePosition.x + (Math.random() - 0.5) * currentIntensity;
      this.camera.position.z = this.basePosition.z + (Math.random() - 0.5) * currentIntensity;
    } else {
      this.camera.position.x = lerp(this.camera.position.x, this.basePosition.x, 0.1);
      this.camera.position.z = lerp(this.camera.position.z, this.basePosition.z, 0.1);
    }
  }
}
