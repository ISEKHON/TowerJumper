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
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  onPointerDown(event) {
    if (!event.isPrimary) return;
    this.isDragging = true;
    this.previousX = event.clientX;
    this.deltaX = 0;
    // Prevent browser handling (scrolling, selecting)
    // event.preventDefault(); 
  }

  onPointerMove(event) {
    if (!this.isDragging) return;
    if (!event.isPrimary) return;
    
    // Check if we effectively stopped dragging (no pressure/buttons for mouse)
    // For touch, buttons might be 0 but touch contact is active.
    // However, isDragging flag should handle state.
    
    const currentX = event.clientX;
    this.deltaX += currentX - this.previousX; // Accumulate delta
    this.previousX = currentX;
    // event.preventDefault();
  }

  onPointerUp() {
    this.isDragging = false;
    this.deltaX = 0;
  }

  getDeltaX() {
    // Per-frame delta; when finger/mouse stops, this becomes 0
    const d = this.deltaX;
    this.deltaX = 0;
    return d;
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }
}
