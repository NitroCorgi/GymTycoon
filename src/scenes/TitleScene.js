import { showOnlyScreen } from './screenState.js';

export class TitleScene {
  constructor({ ui, onStartFreeMode, onStartCampaign }) {
    this.ui = ui;
    this.onStartFreeMode = onStartFreeMode;
    this.onStartCampaign = onStartCampaign;

    this.handleCampaignClick = this.handleCampaignClick.bind(this);
    this.handleFreeModeClick = this.handleFreeModeClick.bind(this);
    this.handleTutorialOpenClick = this.handleTutorialOpenClick.bind(this);
    this.handleTutorialCloseClick = this.handleTutorialCloseClick.bind(this);
    this.handleTutorialModalClick = this.handleTutorialModalClick.bind(this);
  }

  onEnter() {
    showOnlyScreen(this.ui, 'title', { titleMode: true });
    this.ui?.campaignButton?.addEventListener('click', this.handleCampaignClick);
    this.ui?.freeModeButton?.addEventListener('click', this.handleFreeModeClick);
    this.ui?.titleTutorialButton?.addEventListener('click', this.handleTutorialOpenClick);
    this.ui?.titleTutorialCloseButton?.addEventListener('click', this.handleTutorialCloseClick);
    this.ui?.titleTutorialModal?.addEventListener('click', this.handleTutorialModalClick);
  }

  onExit() {
    this.ui?.root?.classList.remove('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.campaignButton?.removeEventListener('click', this.handleCampaignClick);
    this.ui?.freeModeButton?.removeEventListener('click', this.handleFreeModeClick);
    this.ui?.titleTutorialButton?.removeEventListener('click', this.handleTutorialOpenClick);
    this.ui?.titleTutorialCloseButton?.removeEventListener('click', this.handleTutorialCloseClick);
    this.ui?.titleTutorialModal?.removeEventListener('click', this.handleTutorialModalClick);
    this.closeTutorialModal();
  }

  handleCampaignClick() {
    this.onStartCampaign?.();
  }

  handleFreeModeClick() {
    this.onStartFreeMode?.();
  }

  handleTutorialOpenClick() {
    this.openTutorialModal();
  }

  handleTutorialCloseClick() {
    this.closeTutorialModal();
  }

  handleTutorialModalClick(event) {
    if (event.target === this.ui?.titleTutorialModal) {
      this.closeTutorialModal();
    }
  }

  openTutorialModal() {
    this.ui?.titleTutorialModal?.classList.add('is-open');
    this.ui?.titleTutorialModal?.setAttribute('aria-hidden', 'false');
  }

  closeTutorialModal() {
    this.ui?.titleTutorialModal?.classList.remove('is-open');
    this.ui?.titleTutorialModal?.setAttribute('aria-hidden', 'true');
  }

  update() {}

  render() {}
}
