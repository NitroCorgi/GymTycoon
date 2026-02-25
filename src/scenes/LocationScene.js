import { drawText } from '../ui/drawText.js';
import { FREE_MODE_LOCATIONS } from './mainSceneConfig.js';

export class LocationScene {
  constructor({ ui, onSelectLocation }) {
    this.ui = ui;
    this.onSelectLocation = onSelectLocation;

    this.handleLocationClick = this.handleLocationClick.bind(this);
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.add('is-open');

    for (const button of this.ui?.locationButtons ?? []) {
      button.addEventListener('click', this.handleLocationClick);
    }
  }

  onExit() {
    this.ui?.locationScreen?.classList.remove('is-open');

    for (const button of this.ui?.locationButtons ?? []) {
      button.removeEventListener('click', this.handleLocationClick);
    }
  }

  handleLocationClick(event) {
    const button = event.currentTarget;
    if (!(button instanceof HTMLButtonElement)) return;

    const { locationId } = button.dataset;
    if (!locationId) return;

    this.onSelectLocation?.(locationId);
  }

  update() {}

  render(context, game) {
    const centerX = game.canvas.width / 2;
    const centerY = game.canvas.height / 2;

    context.fillStyle = 'rgb(6 10 18 / 58%)';
    context.fillRect(0, 0, game.canvas.width, game.canvas.height);

    drawText(context, 'Choose Gym Location', centerX, centerY - 150, {
      color: '#e2e8f0',
      size: 38,
      align: 'center',
      baseline: 'middle',
      shadow: true
    });

    drawText(context, `${FREE_MODE_LOCATIONS.length} options available`, centerX, centerY - 112, {
      color: '#93c5fd',
      size: 16,
      align: 'center',
      baseline: 'middle'
    });
  }
}
