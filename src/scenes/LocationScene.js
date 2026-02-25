import { drawText } from '../ui/drawText.js';
import { FREE_MODE_LOCATIONS } from './mainSceneConfig.js';

export class LocationScene {
  constructor({ ui, onStartGame }) {
    this.ui = ui;
    this.onStartGame = onStartGame;

    this.selectedLocationId = null;
    this.selectedDifficultyId = null;

    this.handleLocationOptionChange = this.handleLocationOptionChange.bind(this);
    this.handleDifficultyOptionChange = this.handleDifficultyOptionChange.bind(this);
    this.handleStartGameClick = this.handleStartGameClick.bind(this);
  }

  onEnter() {
    this.ui?.root?.classList.add('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.add('is-open');

    this.selectedLocationId = null;
    this.selectedDifficultyId = null;

    for (const input of this.ui?.locationOptionInputs ?? []) {
      input.checked = false;
      input.addEventListener('change', this.handleLocationOptionChange);
    }

    for (const input of this.ui?.difficultyOptionInputs ?? []) {
      input.checked = false;
      input.addEventListener('change', this.handleDifficultyOptionChange);
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
    const canStart = hasLocationSelection && hasDifficultySelection;

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

  handleStartGameClick() {
    if (!this.selectedLocationId || !this.selectedDifficultyId) return;

    this.onStartGame?.({
      locationId: this.selectedLocationId,
      difficultyId: this.selectedDifficultyId
    });
  }

  getLocationSubtitle() {
    const locationCount = FREE_MODE_LOCATIONS.length;
    return `${locationCount} locations • 3 difficulties`;
  }


  update() {}

  render(context, game) {
    const centerX = game.canvas.width / 2;
    const centerY = game.canvas.height / 2;

    context.fillStyle = 'rgb(6 10 18 / 58%)';
    context.fillRect(0, 0, game.canvas.width, game.canvas.height);

    drawText(context, 'Choose Gym Setup', centerX, centerY - 150, {
      color: '#e2e8f0',
      size: 38,
      align: 'center',
      baseline: 'middle',
      shadow: true
    });

    drawText(context, this.getLocationSubtitle(), centerX, centerY - 112, {
      color: '#93c5fd',
      size: 16,
      align: 'center',
      baseline: 'middle'
    });
  }
}
