export class CampaignVictoryScene {
  constructor({ ui, onReturnToMenu }) {
    this.ui = ui;
    this.onReturnToMenu = onReturnToMenu;
    this.levelLabel = 'Level 1';
    this.gymName = 'My Gym';

    this.handleReturnClick = this.handleReturnClick.bind(this);
  }

  setResult({ levelLabel, gymName }) {
    this.levelLabel = levelLabel || 'Level Complete';
    this.gymName = gymName || 'My Gym';
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.campaignScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.remove('is-open');
    this.ui?.gameOverScreen?.classList.remove('is-open');
    this.ui?.campaignVictoryScreen?.classList.add('is-open');

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