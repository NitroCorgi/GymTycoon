import { clamp } from '../utils/math.js';

export class Player {
  constructor({ x, y, size, speed, color }) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.speed = speed;
    this.color = color;
  }

  clampToBounds(width, height) {
    this.x = clamp(this.x, this.size / 2, width - this.size / 2);
    this.y = clamp(this.y, this.size / 2, height - this.size / 2);
  }

  draw(context) {
    context.fillStyle = this.color;
    context.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
  }
}
