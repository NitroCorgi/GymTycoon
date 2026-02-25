import { drawText } from '../ui/drawText.js';

export class GameOverScene {
  constructor({ ui, onReturnToMenu }) {
    this.ui = ui;
    this.onReturnToMenu = onReturnToMenu;

    this.finalBank = 0;
    this.handleReturnClick = this.handleReturnClick.bind(this);
  }

  setResult({ bank }) {
    this.finalBank = Math.floor(Number(bank) || 0);
  }

  formatSignedEuro(value) {
    const numericValue = Math.floor(Number(value) || 0);
    const absoluteValue = Math.abs(numericValue);
    const formatted = absoluteValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return numericValue < 0 ? `-€${formatted}` : `€${formatted}`;
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.remove('is-open');
    this.ui?.gameOverScreen?.classList.add('is-open');

    if (this.ui?.gameOverBankValue) {
      this.ui.gameOverBankValue.textContent = this.formatSignedEuro(this.finalBank);
    }

    this.ui?.gameOverMenuButton?.addEventListener('click', this.handleReturnClick);
  }

  onExit() {
    this.ui?.gameOverScreen?.classList.remove('is-open');
    this.ui?.gameOverMenuButton?.removeEventListener('click', this.handleReturnClick);
  }

  handleReturnClick() {
    this.onReturnToMenu?.();
  }

  update() {}

  render(context, game) {
    const centerX = game.canvas.width / 2;
    const centerY = game.canvas.height / 2;

    context.fillStyle = 'rgb(6 10 18 / 58%)';
    context.fillRect(0, 0, game.canvas.width, game.canvas.height);

    drawText(context, 'Game Over', centerX, centerY - 92, {
      color: '#e2e8f0',
      size: 48,
      align: 'center',
      baseline: 'middle',
      shadow: true
    });

    drawText(context, 'Your gym went bankrupt', centerX, centerY - 40, {
      color: '#93c5fd',
      size: 18,
      align: 'center',
      baseline: 'middle'
    });
  }
}
