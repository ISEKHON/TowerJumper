export const COLORS = {
  background: 0x0a0a0f,
  fog: 0x0a0a0f,
  ball: 0xff0055,
  platformSafe: 0x333333,
  platformDanger: 0xff0055,
  pole: 0x666666
};

export const THEMES = [
  { background: 0x0a0a0f, pole: 0x666666, safe: 0x2a2a2f, danger: 0xff3860, particle: 0xff3860 },
  { background: 0x1a1520, pole: 0x3a2535, safe: 0x2a2028, danger: 0xff6b9d, particle: 0xff6b9d },
  { background: 0x0d1821, pole: 0x344966, safe: 0x1e2d3d, danger: 0xff5e78, particle: 0xff5e78 },
  { background: 0x1c1810, pole: 0x4a3f2a, safe: 0x2e2518, danger: 0xff7043, particle: 0xff7043 },
  { background: 0x0f0f1e, pole: 0x252544, safe: 0x1a1a2e, danger: 0xff4081, particle: 0xff4081 },
  { background: 0x1a1410, pole: 0x3d3128, safe: 0x2a2018, danger: 0xff5252, particle: 0xff5252 }
];

export const PHYSICS = {
  gravity: -40, // Gravity speed - configurable here
  dt: 1 / 60,
  ballMaterial: 'ballMaterial',
  platformMaterial: 'platformMaterial'
};

export const GAMEplay = {
  rotationSpeed: 0.005,
  maxRotationSpeed: 0.15,
  rotationDamping: 0.92,
  bounceForce: 3.5, // Bounce height - configurable here
  maxBounceForce: 40, // Allow much higher bouncing
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
