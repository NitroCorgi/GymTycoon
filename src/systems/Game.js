import { clamp } from '../utils/math.js';

export class Game {
  constructor({ canvas, input, sceneManager, background = '#111827' }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: false });
    this.input = input;
    this.sceneManager = sceneManager;
    this.background = background;

    this._lastFrame = 0;
    this._running = false;

    this._resize = this._resize.bind(this);
    this._tick = this._tick.bind(this);

    window.addEventListener('resize', this._resize);
    this._resize();
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastFrame = performance.now();
    requestAnimationFrame(this._tick);
  }

  stop() {
    this._running = false;
  }

  _tick(timestamp) {
    if (!this._running || !this.context) return;

    const deltaSeconds = clamp((timestamp - this._lastFrame) / 1000, 0, 0.1);
    this._lastFrame = timestamp;

    const activeScene = this.sceneManager.getActive();
    activeScene?.update(deltaSeconds, this);

    this.context.fillStyle = this.background;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    activeScene?.render(this.context, this);

    this.input.endFrame();
    requestAnimationFrame(this._tick);
  }

  _resize() {
    const shell = this.canvas.parentElement;
    if (!shell) return;

    const width = clamp(Math.floor(shell.clientWidth), 320, 1600);
    const height = clamp(Math.floor(shell.clientHeight), 240, 900);

    this.canvas.width = width;
    this.canvas.height = height;
  }
}
