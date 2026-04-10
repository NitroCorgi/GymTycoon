import { FREE_MODE_DIFFICULTIES, FREE_MODE_LOCATIONS } from './mainSceneConfig.js';
import {
  DEFAULT_GYM_MAIN_COLOR,
  DEFAULT_GYM_NAME,
  MAX_GYM_NAME_LENGTH,
  sanitizeGymMainColor,
  sanitizeGymName
} from './gymProfile.js';
import { showOnlyScreen } from './screenState.js';

export class LocationScene {
  constructor({ ui, onStartGame }) {
    this.ui = ui;
    this.onStartGame = onStartGame;

    this.selectedLocationId = null;
    this.selectedDifficultyId = null;
    this.selectedGymName = DEFAULT_GYM_NAME;
    this.selectedGymMainColor = DEFAULT_GYM_MAIN_COLOR;

    this.handleLocationOptionChange = this.handleLocationOptionChange.bind(this);
    this.handleDifficultyOptionChange = this.handleDifficultyOptionChange.bind(this);
    this.handleGymNameInput = this.handleGymNameInput.bind(this);
    this.handleGymColorInput = this.handleGymColorInput.bind(this);
    this.handleStartGameClick = this.handleStartGameClick.bind(this);
  }

  onEnter() {
    showOnlyScreen(this.ui, 'location', { titleMode: true });

    this.selectedLocationId = null;
    this.selectedDifficultyId = null;
    this.selectedGymName = DEFAULT_GYM_NAME;
    this.selectedGymMainColor = DEFAULT_GYM_MAIN_COLOR;

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
      this.ui.locationGymNameInput.maxLength = MAX_GYM_NAME_LENGTH;
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
    this.selectedGymName = sanitizeGymName(input.value);
    input.value = this.selectedGymName;
    this.updateStartButtonState();
  }

  handleGymColorInput(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.selectedGymMainColor = sanitizeGymMainColor(input.value);
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
