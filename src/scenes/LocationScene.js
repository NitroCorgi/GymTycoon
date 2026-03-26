import { FREE_MODE_DIFFICULTIES, FREE_MODE_LOCATIONS } from './mainSceneConfig.js';

export class LocationScene {
  constructor({ ui, onStartGame }) {
    this.ui = ui;
    this.onStartGame = onStartGame;

    this.selectedLocationId = null;
    this.selectedDifficultyId = null;
    this.selectedGymName = 'My Gym';
    this.selectedGymMainColor = '#6ea0ff';

    this.handleLocationOptionChange = this.handleLocationOptionChange.bind(this);
    this.handleDifficultyOptionChange = this.handleDifficultyOptionChange.bind(this);
    this.handleGymNameInput = this.handleGymNameInput.bind(this);
    this.handleGymColorInput = this.handleGymColorInput.bind(this);
    this.handleStartGameClick = this.handleStartGameClick.bind(this);
  }

  sanitizeGymName(value) {
    if (typeof value !== 'string') return 'My Gym';
    const trimmed = value.trim().slice(0, 24);
    return trimmed || 'My Gym';
  }

  sanitizeGymMainColor(value) {
    if (typeof value !== 'string') return '#6ea0ff';
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#6ea0ff';
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.campaignScreen?.classList.remove('is-open');
    this.ui?.campaignVictoryScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.add('is-open');

    this.selectedLocationId = null;
    this.selectedDifficultyId = null;
    this.selectedGymName = 'My Gym';
    this.selectedGymMainColor = '#6ea0ff';

    for (const input of this.ui?.locationOptionInputs ?? []) {
      input.checked = false;
      input.addEventListener('change', this.handleLocationOptionChange);
    }

    for (const input of this.ui?.difficultyOptionInputs ?? []) {
      input.checked = false;
      input.addEventListener('change', this.handleDifficultyOptionChange);
    }

    if (this.ui?.locationGymNameInput instanceof HTMLInputElement) {
      this.ui.locationGymNameInput.value = this.selectedGymName;
      this.ui.locationGymNameInput.maxLength = 24;
      this.ui.locationGymNameInput.addEventListener('input', this.handleGymNameInput);
    }

    if (this.ui?.locationGymColorInput instanceof HTMLInputElement) {
      this.ui.locationGymColorInput.value = this.selectedGymMainColor;
      this.ui.locationGymColorInput.addEventListener('input', this.handleGymColorInput);
    }

    this.ui?.locationStartButton?.addEventListener('click', this.handleStartGameClick);
    this.updateSelectionClasses(this.ui?.locationOptionInputs ?? []);
    this.updateSelectionClasses(this.ui?.difficultyOptionInputs ?? []);
    this.updateStartButtonState();
  }

  onExit() {
    this.ui?.locationScreen?.classList.remove('is-open');

    for (const input of this.ui?.locationOptionInputs ?? []) {
      input.removeEventListener('change', this.handleLocationOptionChange);
    }

    for (const input of this.ui?.difficultyOptionInputs ?? []) {
      input.removeEventListener('change', this.handleDifficultyOptionChange);
    }

    if (this.ui?.locationGymNameInput instanceof HTMLInputElement) {
      this.ui.locationGymNameInput.removeEventListener('input', this.handleGymNameInput);
    }

    if (this.ui?.locationGymColorInput instanceof HTMLInputElement) {
      this.ui.locationGymColorInput.removeEventListener('input', this.handleGymColorInput);
    }

    this.ui?.locationStartButton?.removeEventListener('click', this.handleStartGameClick);
  }

  updateSelectionClasses(inputs) {
    for (const input of inputs) {
      const optionCard = input.closest('.location-option');
      optionCard?.classList.toggle('is-selected', input.checked);
    }
  }

  updateStartButtonState() {
    const hasLocationSelection = Boolean(this.selectedLocationId);
    const hasDifficultySelection = Boolean(this.selectedDifficultyId);
    const hasGymName = Boolean(this.selectedGymName?.trim());
    const canStart = hasLocationSelection && hasDifficultySelection && hasGymName;

    if (this.ui?.locationStartButton) {
      this.ui.locationStartButton.disabled = !canStart;
      this.ui.locationStartButton.classList.toggle('is-active', canStart);
    }
  }

  handleLocationOptionChange(event) {
    const changedInput = event.currentTarget;
    if (!(changedInput instanceof HTMLInputElement)) return;

    for (const input of this.ui?.locationOptionInputs ?? []) {
      if (input !== changedInput) {
        input.checked = false;
      }
    }

    this.selectedLocationId = changedInput.checked ? changedInput.value : null;
    this.updateSelectionClasses(this.ui?.locationOptionInputs ?? []);
    this.updateStartButtonState();
  }

  handleDifficultyOptionChange(event) {
    const changedInput = event.currentTarget;
    if (!(changedInput instanceof HTMLInputElement)) return;

    for (const input of this.ui?.difficultyOptionInputs ?? []) {
      if (input !== changedInput) {
        input.checked = false;
      }
    }

    this.selectedDifficultyId = changedInput.checked ? changedInput.value : null;
    this.updateSelectionClasses(this.ui?.difficultyOptionInputs ?? []);
    this.updateStartButtonState();
  }

  handleGymNameInput(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.selectedGymName = this.sanitizeGymName(input.value);
    input.value = this.selectedGymName;
    this.updateStartButtonState();
  }

  handleGymColorInput(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.selectedGymMainColor = this.sanitizeGymMainColor(input.value);
    input.value = this.selectedGymMainColor;
  }

  handleStartGameClick() {
    if (!this.selectedLocationId || !this.selectedDifficultyId) return;

    this.onStartGame?.({
      locationId: this.selectedLocationId,
      difficultyId: this.selectedDifficultyId,
      gymName: this.selectedGymName,
      gymMainColor: this.selectedGymMainColor
    });
  }

  getLocationSubtitle() {
    const locationCount = FREE_MODE_LOCATIONS.length;
    const difficultyCount = FREE_MODE_DIFFICULTIES.length;
    return `${locationCount} locations • ${difficultyCount} difficulties`;
  }


  update() {}

  render() {}
}
