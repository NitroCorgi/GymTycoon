export class TitleScene {
  constructor({ ui, onStartFreeMode, onStartCampaign }) {
    this.ui = ui;
    this.onStartFreeMode = onStartFreeMode;
    this.onStartCampaign = onStartCampaign;

    this.handleCampaignClick = this.handleCampaignClick.bind(this);
    this.handleFreeModeClick = this.handleFreeModeClick.bind(this);
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.campaignScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.remove('is-open');
    this.ui?.titleScreen?.classList.add('is-open');
    this.ui?.campaignButton?.addEventListener('click', this.handleCampaignClick);
    this.ui?.freeModeButton?.addEventListener('click', this.handleFreeModeClick);
  }

  onExit() {
    this.ui?.root?.classList.remove('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.campaignButton?.removeEventListener('click', this.handleCampaignClick);
    this.ui?.freeModeButton?.removeEventListener('click', this.handleFreeModeClick);
  }

  handleCampaignClick() {
    this.onStartCampaign?.();
  }

  handleFreeModeClick() {
    this.onStartFreeMode?.();
  }

  update() {}

  render() {}
}
