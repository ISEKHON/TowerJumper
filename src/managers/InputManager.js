export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.isDragging = false;
    this.previousX = 0;
    this.deltaX = 0;
    
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    
    this.init();
  }

  init() {
    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  onPointerDown(event) {
    this.isDragging = true;
    this.previousX = event.clientX;
    this.deltaX = 0;
  }

  onPointerMove(event) {
    if (!this.isDragging) return;
    
    const currentX = event.clientX;
    this.deltaX = currentX - this.previousX;
    this.previousX = currentX;
  }

  onPointerUp() {
    this.isDragging = false;
    this.deltaX = 0;
  }

  getDeltaX() {
    const d = this.deltaX;
    this.deltaX = 0; // Consumption based, reset after reading
    return d;
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}
