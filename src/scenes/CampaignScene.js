const DEFAULT_GYM_NAME = 'My Gym';
const DEFAULT_GYM_COLOR = '#6ea0ff';

export class CampaignScene {
  constructor({ ui, onReturnToMenu }) {
    this.ui = ui;
    this.onReturnToMenu = onReturnToMenu;

    this.selectedGymName = DEFAULT_GYM_NAME;
    this.selectedGymMainColor = DEFAULT_GYM_COLOR;
    this.selectedLevelId = 'level-1';

    this.handleGymNameInput = this.handleGymNameInput.bind(this);
    this.handleGymColorInput = this.handleGymColorInput.bind(this);
    this.handleLevelChange = this.handleLevelChange.bind(this);
    this.handleBackClick = this.handleBackClick.bind(this);
  }

  sanitizeGymName(value) {
    if (typeof value !== 'string') return DEFAULT_GYM_NAME;
    const trimmed = value.trim().slice(0, 24);
    return trimmed || DEFAULT_GYM_NAME;
  }

  sanitizeGymMainColor(value) {
    if (typeof value !== 'string') return DEFAULT_GYM_COLOR;
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_GYM_COLOR;
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.remove('is-open');
    this.ui?.gameOverScreen?.classList.remove('is-open');
    this.ui?.campaignScreen?.classList.add('is-open');

    if (this.ui?.campaignGymNameInput instanceof HTMLInputElement) {
      this.ui.campaignGymNameInput.value = this.selectedGymName;
      this.ui.campaignGymNameInput.maxLength = 24;
      this.ui.campaignGymNameInput.addEventListener('input', this.handleGymNameInput);
    }

    if (this.ui?.campaignGymColorInput instanceof HTMLInputElement) {
      this.ui.campaignGymColorInput.value = this.selectedGymMainColor;
      this.ui.campaignGymColorInput.addEventListener('input', this.handleGymColorInput);
    }

    for (const input of this.ui?.campaignLevelInputs ?? []) {
      input.checked = input.value === this.selectedLevelId;
      input.addEventListener('change', this.handleLevelChange);
    }

    this.ui?.campaignBackButton?.addEventListener('click', this.handleBackClick);
  }

  onExit() {
    this.ui?.campaignScreen?.classList.remove('is-open');

    if (this.ui?.campaignGymNameInput instanceof HTMLInputElement) {
      this.ui.campaignGymNameInput.removeEventListener('input', this.handleGymNameInput);
    }

    if (this.ui?.campaignGymColorInput instanceof HTMLInputElement) {
      this.ui.campaignGymColorInput.removeEventListener('input', this.handleGymColorInput);
    }

    for (const input of this.ui?.campaignLevelInputs ?? []) {
      input.removeEventListener('change', this.handleLevelChange);
    }

    this.ui?.campaignBackButton?.removeEventListener('click', this.handleBackClick);
  }

  handleGymNameInput(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.selectedGymName = this.sanitizeGymName(input.value);
    input.value = this.selectedGymName;
  }

  handleGymColorInput(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.selectedGymMainColor = this.sanitizeGymMainColor(input.value);
    input.value = this.selectedGymMainColor;
  }

  handleLevelChange(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || !input.checked) return;
    this.selectedLevelId = input.value;
  }

  handleBackClick() {
    this.onReturnToMenu?.();
  }

  update() {}

  render() {}
}