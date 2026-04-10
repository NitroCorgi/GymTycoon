import { CAMPAIGN_LEVELS } from './mainSceneConfig.js';
import {
  DEFAULT_GYM_MAIN_COLOR,
  DEFAULT_GYM_NAME,
  MAX_GYM_NAME_LENGTH,
  sanitizeGymMainColor,
  sanitizeGymName
} from './gymProfile.js';
import { showOnlyScreen } from './screenState.js';

export class CampaignScene {
  constructor({ ui, onReturnToMenu, onStartLevel }) {
    this.ui = ui;
    this.onReturnToMenu = onReturnToMenu;
    this.onStartLevel = onStartLevel;

    this.selectedGymName = DEFAULT_GYM_NAME;
    this.selectedGymMainColor = DEFAULT_GYM_MAIN_COLOR;
    this.selectedLevelId = 'level-1';

    this.handleGymNameInput = this.handleGymNameInput.bind(this);
    this.handleGymColorInput = this.handleGymColorInput.bind(this);
    this.handleLevelChange = this.handleLevelChange.bind(this);
    this.handleStartClick = this.handleStartClick.bind(this);
    this.handleBackClick = this.handleBackClick.bind(this);
  }

  getSelectedLevelConfig() {
    return CAMPAIGN_LEVELS.find((level) => level.id === this.selectedLevelId) ?? CAMPAIGN_LEVELS[0] ?? null;
  }

  onEnter() {
    showOnlyScreen(this.ui, 'campaign', { titleMode: true });

    if (this.ui?.campaignGymNameInput instanceof HTMLInputElement) {
      this.ui.campaignGymNameInput.value = this.selectedGymName;
      this.ui.campaignGymNameInput.maxLength = MAX_GYM_NAME_LENGTH;
      this.ui.campaignGymNameInput.addEventListener('input', this.handleGymNameInput);
    }

    if (this.ui?.campaignGymColorInput instanceof HTMLInputElement) {
      this.ui.campaignGymColorInput.value = this.selectedGymMainColor;
      this.ui.campaignGymColorInput.addEventListener('input', this.handleGymColorInput);
    }

    for (const input of this.ui?.campaignLevelInputs ?? []) {
      input.checked = input.value === this.selectedLevelId;
      const option = input.closest('.campaign-level-option');
      const level = CAMPAIGN_LEVELS.find((entry) => entry.id === input.value);
      option?.classList.toggle('is-coming-soon', !level?.isAvailable);
      input.addEventListener('change', this.handleLevelChange);
    }

    this.renderLevelDetails();
    this.updateStartButtonState();
    this.ui?.campaignStartButton?.addEventListener('click', this.handleStartClick);
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

    this.ui?.campaignStartButton?.removeEventListener('click', this.handleStartClick);
    this.ui?.campaignBackButton?.removeEventListener('click', this.handleBackClick);
  }

  renderLevelDetails() {
    const level = this.getSelectedLevelConfig();
    const detailsRoot = this.ui?.campaignLevelDetails;
    if (!(detailsRoot instanceof HTMLElement) || !level) return;

    const goals = level.goals;
    const averageSatisfactionGoal = goals?.averageSatisfaction ?? goals?.satisfaction;
    const open24HoursGoal = goals?.open24Hours ?? goals?.alwaysOpen ?? goals?.open247;
    const vendingMachinesGoal =
      goals?.vendingMachines ?? goals?.vendingMachinesMin ?? goals?.minVendingMachines;
    const monthlyVendingIncomeGoal =
      goals?.vendingIncomeMonthly ?? goals?.monthlyVendingIncome ?? goals?.vendingIncomePerMonth;
    const goalItems = goals
      ? [
          `Have €${goals.bank.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} in bank`,
          `Reach ${goals.popularityStars} star popularity`,
          `Have ${goals.members} members`,
          ...(open24HoursGoal ? ['Have the gym open 24/7'] : []),
          ...(typeof vendingMachinesGoal === 'number'
            ? [`Place at least ${vendingMachinesGoal} vending machines`]
            : []),
          ...(typeof monthlyVendingIncomeGoal === 'number'
            ? [
                `Have at least €${monthlyVendingIncomeGoal
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, '.')} income with vending machines in a month`
              ]
            : []),
          ...(typeof averageSatisfactionGoal === 'number'
            ? [`Have an average satisfaction of ${averageSatisfactionGoal}`]
            : [])
        ]
      : [];

    const goalMarkup = goals
      ? `
        <ul class="campaign-level-goals-list">
          ${goalItems.map((goalItem) => `<li>${goalItem}</li>`).join('')}
        </ul>
      `
      : '<p class="campaign-level-coming-soon">This level will be added later.</p>';

    detailsRoot.innerHTML = `
      <article class="campaign-level-details-card">
        <p class="campaign-level-details-kicker">${level.label}</p>
        <h4>${level.locationLabel ?? level.label}</h4>
        <p class="campaign-level-details-text">${level.description ?? ''}</p>
        ${level.isAvailable ? `
          <div class="campaign-level-stats">
            <span>Starting bank: €${level.startingBank.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</span>
            <span>Starting members: ${level.startingMembers ?? 0}</span>
          </div>
          <p class="campaign-level-details-text">Same map and customer encounters as Free Mode's ${level.locationLabel ?? level.label}.</p>
          <h5>Goals</h5>
          ${goalMarkup}
        ` : `
          <p class="campaign-level-coming-soon">${level.description ?? 'This level will be added later.'}</p>
        `}
      </article>
    `;
  }

  updateStartButtonState() {
    const selectedLevel = this.getSelectedLevelConfig();
    const canStart = Boolean(selectedLevel?.isAvailable);

    if (this.ui?.campaignStartButton) {
      this.ui.campaignStartButton.disabled = !canStart;
      this.ui.campaignStartButton.classList.toggle('is-active', canStart);
    }
  }

  handleGymNameInput(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.selectedGymName = sanitizeGymName(input.value);
    input.value = this.selectedGymName;
  }

  handleGymColorInput(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.selectedGymMainColor = sanitizeGymMainColor(input.value);
    input.value = this.selectedGymMainColor;
  }

  handleLevelChange(event) {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || !input.checked) return;
    this.selectedLevelId = input.value;
    this.renderLevelDetails();
    this.updateStartButtonState();
  }

  handleStartClick() {
    const selectedLevel = this.getSelectedLevelConfig();
    if (!selectedLevel?.isAvailable) return;

    this.onStartLevel?.({
      levelId: selectedLevel.id,
      gymName: this.selectedGymName,
      gymMainColor: this.selectedGymMainColor
    });
  }

  handleBackClick() {
    this.onReturnToMenu?.();
  }

  update() {}

  render() {}
}