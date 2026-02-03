export const COLORS = {
  background: 0xffffff,
  fog: 0xffffff,
  ball: 0xff0055,
  platformSafe: 0x333333,
  platformDanger: 0xff0055,
  pole: 0xcccccc
};

export const THEMES = [
  { background: 0xffffff, pole: 0xcccccc, safe: 0x333333, danger: 0xff0055, particle: 0xff0055 },
  { background: 0x222222, pole: 0x444444, safe: 0xeeeeee, danger: 0xffaa00, particle: 0xffaa00 },
  { background: 0x88ccff, pole: 0xffffff, safe: 0x0055aa, danger: 0xff3333, particle: 0xff3333 },
  { background: 0xffeebb, pole: 0xaa8855, safe: 0x553311, danger: 0xcc4444, particle: 0xcc4444 },
  { background: 0x1a1a2e, pole: 0x16213e, safe: 0x0f3460, danger: 0xe94560, particle: 0xe94560 },
  { background: 0xf0e5cf, pole: 0xc6a15b, safe: 0x8b6f47, danger: 0xd64045, particle: 0xd64045 }
];

export const PHYSICS = {
  gravity: -25,
  dt: 1 / 60,
  ballMaterial: 'ballMaterial',
  platformMaterial: 'platformMaterial'
};

export const GAMEplay = {
  rotationSpeed: 0.005,
  maxRotationSpeed: 0.15,
  rotationDamping: 0.92,
  bounceForce: 9,
  maxBounceForce: 12,
  gapSize: 0.8, // Radians
  comboTimeWindow: 1.5, // seconds
  smashThroughBonus: 50,
  comboMultiplier: 10,
  perfectLandingBonus: 25
};

export const POWERUPS = {
  shield: { duration: 5, color: 0x00ffff },
  fireball: { duration: 3, color: 0xff6600 },
  slowmo: { duration: 4, color: 0xffff00 }
};

export const VISUAL = {
  cameraShakeIntensity: 0.15,
  cameraShakeDuration: 0.2,
  trailLength: 20,
  particleBurstCount: 12
};
