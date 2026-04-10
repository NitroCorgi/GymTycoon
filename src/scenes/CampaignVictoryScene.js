import { DEFAULT_GYM_NAME } from './gymProfile.js';
import { showOnlyScreen } from './screenState.js';

export class CampaignVictoryScene {
  constructor({ ui, onReturnToMenu }) {
    this.ui = ui;
    this.onReturnToMenu = onReturnToMenu;
    this.levelLabel = 'Level 1';
    this.gymName = DEFAULT_GYM_NAME;

    this.handleReturnClick = this.handleReturnClick.bind(this);
  }

  setResult({ levelLabel, gymName }) {
    this.levelLabel = levelLabel || 'Level Complete';
    this.gymName = gymName || DEFAULT_GYM_NAME;
  }

  onEnter() {
    showOnlyScreen(this.ui, 'campaignVictory', { titleMode: true });

    if (this.ui?.campaignVictoryTitle) {
      this.ui.campaignVictoryTitle.textContent = `${this.levelLabel} Complete`;
    }

    if (this.ui?.campaignVictoryMessage) {
      this.ui.campaignVictoryMessage.textContent = 'Congratulations! You can now move on to the next level!';
    }

    this.ui?.campaignVictoryMenuButton?.addEventListener('click', this.handleReturnClick);
  }

  onExit() {
    this.ui?.campaignVictoryScreen?.classList.remove('is-open');
    this.ui?.campaignVictoryMenuButton?.removeEventListener('click', this.handleReturnClick);
  }

  handleReturnClick() {
    this.onReturnToMenu?.();
  }

  update() {}

  render() {}
}