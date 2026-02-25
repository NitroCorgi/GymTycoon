import { drawText } from '../ui/drawText.js';

export class TitleScene {
  constructor({ ui, onStartFreeMode }) {
    this.ui = ui;
    this.onStartFreeMode = onStartFreeMode;

    this.handleFreeModeClick = this.handleFreeModeClick.bind(this);
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.locationScreen?.classList.remove('is-open');
    this.ui?.titleScreen?.classList.add('is-open');
    this.ui?.freeModeButton?.addEventListener('click', this.handleFreeModeClick);
  }

  onExit() {
    this.ui?.root?.classList.remove('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.freeModeButton?.removeEventListener('click', this.handleFreeModeClick);
  }

  handleFreeModeClick() {
    this.onStartFreeMode?.();
  }

  update() {}

  render(context, game) {
    const centerX = game.canvas.width / 2;
    const centerY = game.canvas.height / 2;

    context.fillStyle = 'rgb(6 10 18 / 58%)';
    context.fillRect(0, 0, game.canvas.width, game.canvas.height);

    drawText(context, 'Gym Tycoon', centerX, centerY - 92, {
      color: '#e2e8f0',
      size: 48,
      align: 'center',
      baseline: 'middle',
      shadow: true
    });

    drawText(context, 'Choose a mode to continue', centerX, centerY - 40, {
      color: '#93c5fd',
      size: 18,
      align: 'center',
      baseline: 'middle'
    });
  }
}
