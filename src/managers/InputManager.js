export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.isDragging = false;
    this.startX = 0;
    this.currentX = 0;
    this.totalDragDistance = 0;
    
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
    this.isDragging = true;
    this.startX = event.clientX;
    this.currentX = event.clientX;
    this.totalDragDistance = 0;
  }

  onPointerMove(event) {
    if (!this.isDragging) return;
    
    this.currentX = event.clientX;
    this.totalDragDistance = this.currentX - this.startX;
  }

  onPointerUp() {
    this.isDragging = false;
    this.totalDragDistance = 0;
  }

  getDeltaX() {
    // For desktop compatibility - calculate delta from last frame
    return 0;
  }

  getTotalDrag() {
    // Total distance dragged from start position
    return this.totalDragDistance;
  }

  getIsDragging() {
    return this.isDragging;
  }

  dispose() {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }
}
