export class Input {
  constructor() {
    this.keysDown = new Set();
    this.keysPressed = new Set();
    this.pointerPosition = null;
    this.pointerPressed = false;
    this.pointerReleased = false;
    this.pointerDown = false;
    this.wheelDeltaY = 0;

    window.addEventListener('keydown', (event) => {
      if (!this.keysDown.has(event.code)) {
        this.keysPressed.add(event.code);
      }
      this.keysDown.add(event.code);
    });

    window.addEventListener('keyup', (event) => {
      this.keysDown.delete(event.code);
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.keysPressed.clear();
      this.pointerPressed = false;
      this.pointerReleased = false;
      this.pointerDown = false;
    });

    window.addEventListener('pointermove', (event) => {
      this.pointerPosition = {
        x: event.clientX,
        y: event.clientY
      };
    });

    window.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;

      this.pointerPosition = {
        x: event.clientX,
        y: event.clientY
      };
      this.pointerPressed = true;
      this.pointerDown = true;
    });

    window.addEventListener('pointerup', (event) => {
      if (event.button !== 0) return;

      this.pointerPosition = {
        x: event.clientX,
        y: event.clientY
      };
      this.pointerReleased = true;
      this.pointerDown = false;
    });

    window.addEventListener(
      'wheel',
      (event) => {
        this.pointerPosition = {
          x: event.clientX,
          y: event.clientY
        };
        this.wheelDeltaY += event.deltaY;

        if (event.target instanceof HTMLCanvasElement) {
          event.preventDefault();
        }
      },
      { passive: false }
    );
  }

  isDown(code) {
    return this.keysDown.has(code);
  }

  wasPressed(code) {
    return this.keysPressed.has(code);
  }

  getPointerPosition() {
    return this.pointerPosition;
  }

  wasPointerPressed() {
    return this.pointerPressed;
  }

  wasPointerReleased() {
    return this.pointerReleased;
  }

  isPointerDown() {
    return this.pointerDown;
  }

  getWheelDeltaY() {
    return this.wheelDeltaY;
  }

  endFrame() {
    this.keysPressed.clear();
    this.pointerPressed = false;
    this.pointerReleased = false;
    this.wheelDeltaY = 0;
  }
}
