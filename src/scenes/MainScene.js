import { peopleMethods } from './mainScene/peopleMethods.js';
import { interactionUiMethods } from './mainScene/interactionUiMethods.js';
import { layoutRenderMethods } from './mainScene/layoutRenderMethods.js';
import {
  CUSTOMER_TYPES,
  FREE_MODE_DIFFICULTIES,
  FIRST_NAMES,
  FREE_MODE_LOCATIONS,
  GYM_UPGRADES,
  ITEM_CATALOG,
  LAST_NAMES,
  REPAIR_SECONDS,
  SATISFACTION_MAX,
  SATISFACTION_MIN
} from './mainSceneConfig.js';

export class MainScene {
  constructor({ ui, onGameOver }) {
    this.ui = ui;
    this.onGameOver = onGameOver;
    this.buyItemButtons = new Map();
    this.gameOverBankLimit = -50000;

    this.startNewGame();
    this.bindUi();
    this.refreshUi();
  }

  onEnter() {
    this.ui?.root?.classList.remove('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.locationScreen?.classList.remove('is-open');
    this.ui?.gameOverScreen?.classList.remove('is-open');
  }

  getDefaultLocationConfig() {
    return FREE_MODE_LOCATIONS[0];
  }

  getDefaultDifficultyConfig() {
    return FREE_MODE_DIFFICULTIES.find((difficulty) => difficulty.id === 'medium') ?? FREE_MODE_DIFFICULTIES[0];
  }

  createTileAvailabilityGrid(rows, cols, mapAreas) {
    if (!Array.isArray(mapAreas) || mapAreas.length === 0) {
      return Array.from({ length: rows }, () => Array(cols).fill(true));
    }

    const grid = Array.from({ length: rows }, () => Array(cols).fill(false));

    for (const area of mapAreas) {
      const startRow = Math.max(0, Math.floor(area.startRow ?? 0));
      const startCol = Math.max(0, Math.floor(area.startCol ?? 0));
      const areaRows = Math.max(0, Math.floor(area.rows ?? 0));
      const areaCols = Math.max(0, Math.floor(area.cols ?? 0));

      for (let row = startRow; row < Math.min(rows, startRow + areaRows); row += 1) {
        for (let col = startCol; col < Math.min(cols, startCol + areaCols); col += 1) {
          grid[row][col] = true;
        }
      }
    }

    return grid;
  }

  getFallbackEntranceTile() {
    const preferredRow = Math.max(0, Math.floor(this.mapRows / 2));
    if (this.isTileAvailable(preferredRow, 0)) {
      return { row: preferredRow, col: 0 };
    }

    for (let row = 0; row < this.mapRows; row += 1) {
      if (this.isTileAvailable(row, 0)) {
        return { row, col: 0 };
      }
    }

    for (let row = 0; row < this.mapRows; row += 1) {
      for (let col = 0; col < this.mapCols; col += 1) {
        if (this.isTileAvailable(row, col)) {
          return { row, col };
        }
      }
    }

    return { row: 0, col: 0 };
  }

  isTileAvailable(row, col) {
    const inBounds = row >= 0 && col >= 0 && row < this.mapRows && col < this.mapCols;
    if (!inBounds) return false;
    return this.tileAvailability?.[row]?.[col] === true;
  }

  startNewGame(
    locationConfig = this.getDefaultLocationConfig(),
    difficultyConfig = this.getDefaultDifficultyConfig(),
    showTutorialWelcome = false
  ) {
    const selectedLocation = locationConfig ?? this.getDefaultLocationConfig();
    const selectedDifficulty = difficultyConfig ?? this.getDefaultDifficultyConfig();

    this.locationId = selectedLocation.id;
    this.difficultyId = selectedDifficulty.id;
    this.mapRows = selectedLocation.mapRows ?? 8;
    this.mapCols = selectedLocation.mapCols ?? 8;
    this.tileAvailability = this.createTileAvailabilityGrid(
      this.mapRows,
      this.mapCols,
      selectedLocation.mapAreas
    );

    this.money = selectedDifficulty.startingBank ?? 50000;
    this.subscriptionFee = 30;
    this.rentAmount = selectedLocation.monthlyRent ?? 1000;
    this.monthlyEncountersBase = selectedLocation.monthlyEncountersBase ?? 20;
    this.monthlyEncountersGrowth = selectedLocation.monthlyEncountersGrowth ?? 1;
    this.elapsedMonths = 0;

    this.cycleIntervalSeconds = 45;
    this.cycleTimer = 0;
    this.lastCycleIncome = 0;
    this.lastCycleDayTicketIncome = 0;
    this.lastCycleChurn = 0;
    this.lastCycleGained = 0;
    this.currentCycleGained = 0;
    this.currentCycleChurn = 0;
    this.currentCycleDayTicketIncome = 0;
    this.monthSatisfactionSum = 0;
    this.monthSatisfactionCount = 0;
    this.currentMonth = 1;
    this.currentYear = 26;
    this.monthlyStatistics = [];
    this.monthlyBankHistory = [];
    this.monthlyPopularityHistory = [];
    this.monthlyCostsHistory = [];
    this.monthlyProjectedIncomeHistory = [];
    this.monthlyMemberHistory = [];
    this.monthlyLockerTurnedDownHistory = [];
    this.monthlySatisfactionHistory = [];
    this.currentCycleLockerTurnedDown = 0;
    this.monthStartBank = this.money;
    this.isGameOver = false;

    this.buyMode = false;
    this.selectedItemKey = 'treadmill';
    this.currentPlacementRotation = 0;
    this.buyTab = 'devices';
    this.activeBuyTypes = new Set(Object.values(ITEM_CATALOG).map((item) => item.type));

    this.tiles = Array.from({ length: this.mapRows }, () => Array(this.mapCols).fill(null));
    this.floorDecorTiles = Array.from({ length: this.mapRows }, () => Array(this.mapCols).fill(null));
    this.wallpaperTopByCol = Array(this.mapCols).fill(null);
    this.wallpaperLeftByRow = Array(this.mapRows).fill(null);
    this.items = [];
    this.nextItemId = 1;

    this.popularity = 0;
    this.members = 0;
    this.memberProfiles = [];
    this.nextMemberId = 1;

    this.people = [];
    this.nextPersonId = 1;
    this.spawnTimer = 0;
    this.monthlyNonMemberEncounterTarget = 0;
    this.monthlyNonMemberEncountersSpawned = 0;
    this.monthlyMemberSpawnQueue = [];
    this.monthlyTotalSpawnTarget = 0;
    this.monthlyTotalSpawned = 0;

    this.hoveredTile = null;
    this.hoveredWallSegment = null;
    this.mapOffsetX = 0;
    this.mapOffsetY = 0;
    this.isDraggingMap = false;
    this.lastDragPointer = null;
    this.didDragInCurrentPointer = false;
    this.consumeReleaseClick = false;

    const preferredEntrance = selectedLocation.entranceTile ?? this.getFallbackEntranceTile();
    this.entranceTile = this.isTileAvailable(preferredEntrance.row, preferredEntrance.col)
      ? preferredEntrance
      : this.getFallbackEntranceTile();

    this.debugVisible = false;
    this.memberListVisible = false;
    this.gymUpgradesVisible = false;
    this.activeStatisticKey = null;
    this.selectedDeviceId = null;
    this.selectedDecor = null;
    this.selectedPersonId = null;
    this.lastMapLayout = null;
    this.purchasedGymUpgrades = new Set();

    this.tutorialVisible = false;
    this.tutorialWelcomeVisible = Boolean(showTutorialWelcome);
    this.tutorialCompleteVisible = false;
    this.tutorialHasShownCompletion = false;
    this.tutorialUnlockedStageCount = 1;
    this.tutorialStageCompletions = [false, false, false];
    this.tutorialRenderStateKey = '';
    this.gymUpgradesRenderStateKey = '';

    this.initializeMonthlySpawnPlan();

    this.buildBuyPanelButtons();
    this.recordMonthlyMetricsSnapshot(this.getCurrentMonthLabel());
    this.refreshUi();
  }

  bindUi() {
    if (!this.ui) return;

    const {
      buyModeButton,
      buyPanel,
      buyFilters,
      buyTabDevicesButton,
      buyTabFacilitiesButton,
      buyTabDecorButton,
      metricStatButtons,
      subscriptionInput,
      monthlyCostsValue,
      statsModal,
      statsModalCloseButton,
      gymUpgradesButton,
      gymUpgradesModal,
      gymUpgradesCloseButton,
      gymUpgradesBody,
      memberListButton,
      memberListModal,
      memberListCloseButton,
      sellDeviceButton,
      vendingRestockButton,
      guideButton,
      tutorialModal,
      tutorialModalCloseButton,
      tutorialWelcomeModal,
      tutorialWelcomeCloseButton,
      tutorialCompleteModal,
      tutorialCompleteCloseButton
    } = this.ui;

    buyModeButton?.addEventListener('click', () => {
      this.buyMode = !this.buyMode;
      this.refreshUi();
    });

    this.buildBuyPanelButtons();
    buyPanel?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;

      const itemKey = target.dataset.itemKey;
      if (!itemKey || !ITEM_CATALOG[itemKey]) return;

      this.selectedItemKey = itemKey;
      this.refreshUi();
    });

    buyFilters?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;

      const type = target.dataset.typeFilter;
      if (!type) return;

      if (this.activeBuyTypes.has(type)) {
        this.activeBuyTypes.delete(type);
      } else {
        this.activeBuyTypes.add(type);
      }

      this.buildBuyPanelButtons();
      this.refreshUi();
    });

    buyTabDevicesButton?.addEventListener('click', () => {
      this.buyTab = 'devices';
      this.buildBuyPanelButtons();
      this.refreshUi();
    });

    buyTabFacilitiesButton?.addEventListener('click', () => {
      this.buyTab = 'facilities';
      this.buildBuyPanelButtons();
      this.refreshUi();
    });

    buyTabDecorButton?.addEventListener('click', () => {
      this.buyTab = 'decor';
      this.buildBuyPanelButtons();
      this.refreshUi();
    });

    metricStatButtons?.forEach((button) => {
      button.addEventListener('click', () => {
        const statKey = button.dataset.statKey;
        if (!statKey) return;

        this.activeStatisticKey = this.activeStatisticKey === statKey ? null : statKey;
        this.updateUiMetrics();
      });
    });

    statsModalCloseButton?.addEventListener('click', () => {
      this.activeStatisticKey = null;
      this.updateUiMetrics();
    });

    statsModal?.addEventListener('click', (event) => {
      if (event.target !== statsModal) return;
      this.activeStatisticKey = null;
      this.updateUiMetrics();
    });

    memberListButton?.addEventListener('click', () => {
      this.memberListVisible = !this.memberListVisible;
      this.updateUiMetrics();
    });

    gymUpgradesButton?.addEventListener('click', () => {
      this.gymUpgradesVisible = !this.gymUpgradesVisible;
      this.updateUiMetrics();
    });

    gymUpgradesCloseButton?.addEventListener('click', () => {
      this.gymUpgradesVisible = false;
      this.updateUiMetrics();
    });

    gymUpgradesModal?.addEventListener('click', (event) => {
      if (event.target !== gymUpgradesModal) return;
      this.gymUpgradesVisible = false;
      this.updateUiMetrics();
    });

    gymUpgradesBody?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;

      const upgradeKey = target.dataset.upgradeKey;
      if (!upgradeKey) return;
      this.purchaseGymUpgrade(upgradeKey);
    });

    memberListCloseButton?.addEventListener('click', () => {
      this.memberListVisible = false;
      this.updateUiMetrics();
    });

    memberListModal?.addEventListener('click', (event) => {
      if (event.target !== memberListModal) return;
      this.memberListVisible = false;
      this.updateUiMetrics();
    });

    guideButton?.addEventListener('click', () => {
      this.tutorialVisible = !this.tutorialVisible;
      this.updateUiMetrics();
    });

    tutorialModalCloseButton?.addEventListener('click', () => {
      this.tutorialVisible = false;
      this.updateUiMetrics();
    });

    tutorialModal?.addEventListener('click', (event) => {
      if (event.target !== tutorialModal) return;
      this.tutorialVisible = false;
      this.updateUiMetrics();
    });

    tutorialWelcomeCloseButton?.addEventListener('click', () => {
      this.tutorialWelcomeVisible = false;
      this.updateUiMetrics();
    });

    tutorialWelcomeModal?.addEventListener('click', (event) => {
      if (event.target !== tutorialWelcomeModal) return;
      this.tutorialWelcomeVisible = false;
      this.updateUiMetrics();
    });

    tutorialCompleteCloseButton?.addEventListener('click', () => {
      this.tutorialCompleteVisible = false;
      this.updateUiMetrics();
    });

    tutorialCompleteModal?.addEventListener('click', (event) => {
      if (event.target !== tutorialCompleteModal) return;
      this.tutorialCompleteVisible = false;
      this.updateUiMetrics();
    });

    sellDeviceButton?.addEventListener('click', () => {
      this.sellSelectedDevice();
    });

    vendingRestockButton?.addEventListener('click', () => {
      this.restockSelectedVendingMachine();
    });

    subscriptionInput?.addEventListener('input', (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLInputElement)) return;

      const parsedValue = Number.parseInt(target.value.replace(/[^\d]/g, ''), 10);
      if (Number.isNaN(parsedValue)) return;
      this.subscriptionFee = Math.max(0, parsedValue);
      this.updateUiMetrics();
    });

    subscriptionInput?.addEventListener('blur', () => {
      this.updateUiMetrics();
    });

    if (subscriptionInput) {
      subscriptionInput.value = `€${this.subscriptionFee}`;
    }
    if (monthlyCostsValue) {
      monthlyCostsValue.textContent = `€${Math.floor(this.getMonthlyCosts())}`;
    }

    buyPanel?.classList.toggle('is-open', this.buyMode);
    this.updateUiMetrics();
  }

  refreshUi() {
    if (!this.ui) return;

    const {
      buyModeButton,
      buyPanel,
      buyFilters,
      buyTabDevicesButton,
      buyTabFacilitiesButton,
      buyTabDecorButton,
      buyGrid
    } = this.ui;
    const selectedKey = this.selectedItemKey;

    if (buyModeButton) {
      buyModeButton.textContent = this.buyMode ? 'Buy Devices (ON)' : 'Buy Devices';
      buyModeButton.classList.toggle('is-active', this.buyMode);
    }

    buyPanel?.classList.toggle('is-open', this.buyMode);
    buyFilters?.classList.toggle('is-open', this.buyMode);

    buyTabDevicesButton?.classList.toggle('is-active', this.buyTab === 'devices');
    buyTabFacilitiesButton?.classList.toggle('is-active', this.buyTab === 'facilities');
    buyTabDecorButton?.classList.toggle('is-active', this.buyTab === 'decor');
    buyGrid?.classList.toggle('is-open', this.buyMode);

    for (const [itemKey, button] of this.buyItemButtons.entries()) {
      button.classList.toggle('is-selected', selectedKey === itemKey);
    }

    this.updateUiMetrics();
  }

  formatEuro(value) {
    const numericValue = Math.max(0, Math.floor(Number(value) || 0));
    return `€${numericValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  }

  getBuyTabForType(type) {
    if (type === 'decor') return 'decor';
    return type === 'check-in' || type === 'locker' || type === 'shower' || type === 'facility'
      ? 'facilities'
      : 'devices';
  }

  getTypeColorClass(type) {
    if (type === 'recovery') return 'is-type-relax';
    return `is-type-${type}`;
  }

  getTypeLabel(type) {
    if (type === 'recovery') return 'Relax';
    if (type === 'check-in') return 'Check-in';
    if (type === 'weightlifting') return 'Weightlifting';
    if (type === 'decor') return 'Decor';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getGymUpgradeEntries() {
    return Object.entries(GYM_UPGRADES);
  }

  isGymUpgradePurchased(upgradeKey) {
    return this.purchasedGymUpgrades.has(upgradeKey);
  }

  getPurchasedGymUpgradeMonthlyCost() {
    return this.getGymUpgradeEntries().reduce((sum, [upgradeKey, upgrade]) => {
      if (!this.isGymUpgradePurchased(upgradeKey)) {
        return sum;
      }
      return sum + (upgrade.monthlyCost ?? 0);
    }, 0);
  }

  getWorkoutDurationMultiplier() {
    let multiplier = 1;
    if (this.isGymUpgradePurchased('ventilation')) {
      multiplier *= 0.9;
    }
    if (this.isGymUpgradePurchased('airConditioning')) {
      multiplier *= 0.75;
    }
    return multiplier;
  }

  getCheckInDurationMultiplier() {
    return this.isGymUpgradePurchased('receptionStaff') ? 0.75 : 1;
  }

  getBaseHappinessBonus() {
    let bonus = 0;
    if (this.isGymUpgradePurchased('musicSystem')) {
      bonus += 10;
    }
    if (this.isGymUpgradePurchased('receptionStaff')) {
      bonus += 5;
    }
    return bonus;
  }

  getRepairDurationSeconds() {
    const multiplier = this.isGymUpgradePurchased('dedicatedTechnician') ? 0.6 : 1;
    return Math.max(1, Math.round(REPAIR_SECONDS * multiplier));
  }

  shouldIncreaseDeviceBreakChance() {
    return !this.isGymUpgradePurchased('maintenanceSpecialist');
  }

  getGymUpgradePurchaseState(upgradeKey) {
    const upgrade = GYM_UPGRADES[upgradeKey];
    if (!upgrade) {
      return {
        exists: false,
        canPurchase: false,
        purchased: false,
        unmetRequirements: ['Unknown upgrade']
      };
    }

    const purchased = this.isGymUpgradePurchased(upgradeKey);
    const unmetRequirements = (upgrade.requires ?? []).filter((requiredUpgradeKey) => {
      return !this.isGymUpgradePurchased(requiredUpgradeKey);
    });
    const hasEnoughMoney = this.money >= upgrade.purchasePrice;
    const canPurchase = !purchased && unmetRequirements.length === 0 && hasEnoughMoney;

    return {
      exists: true,
      canPurchase,
      purchased,
      hasEnoughMoney,
      unmetRequirements
    };
  }

  purchaseGymUpgrade(upgradeKey) {
    const upgrade = GYM_UPGRADES[upgradeKey];
    if (!upgrade) {
      return false;
    }

    const purchaseState = this.getGymUpgradePurchaseState(upgradeKey);
    if (!purchaseState.canPurchase) {
      return false;
    }

    this.money -= upgrade.purchasePrice;
    this.purchasedGymUpgrades.add(upgradeKey);
    this.updateUiMetrics();
    return true;
  }

  getTutorialDefinitions() {
    const requiredDeviceTypes = [
      ...new Set(
        Object.values(ITEM_CATALOG)
          .filter((item) => this.getBuyTabForType(item.type) === 'devices')
          .map((item) => item.type)
      )
    ];

    return [
      {
        title: 'Beginner Checklist',
        items: [
          {
            label: 'Buy check-in counter',
            isComplete: () => this.items.some((item) => ITEM_CATALOG[item.key].type === 'check-in')
          },
          {
            label: 'Buy at least 8 lockers',
            isComplete: () => this.getTotalLockerCapacity() >= 8
          },
          {
            label: 'Buy at least 1 device of each type',
            isComplete: () =>
              requiredDeviceTypes.every((type) =>
                this.items.some((item) => ITEM_CATALOG[item.key].type === type)
              )
          }
        ]
      },
      {
        title: 'Growth Checklist',
        items: [
          {
            label: 'Raise your popularity to 3 stars by buying more devices',
            isComplete: () => this.getTutorialPopularityStars() >= 3
          },
          {
            label: 'Buy a shower',
            isComplete: () => this.items.some((item) => ITEM_CATALOG[item.key].type === 'shower')
          },
          {
            label: 'Have at least 5 members',
            isComplete: () => this.members >= 5
          }
        ]
      },
      {
        title: 'Final Checklist',
        items: [
          {
            label: 'Achieve 5 star popularity',
            isComplete: () => this.getTutorialPopularityStars() >= 5
          },
          {
            label: 'Have at least 100 members',
            isComplete: () => this.members >= 100
          },
          {
            label: 'Have 1.000.000 in the bank',
            isComplete: () => this.money >= 1000000
          }
        ]
      }
    ];
  }

  getTutorialPopularityStars() {
    return Math.min(5, Math.max(1, Math.floor(this.popularity / 20) + 1));
  }

  getTutorialProgressState() {
    const definitions = this.getTutorialDefinitions();
    const stages = definitions.map((stage) => {
      const items = stage.items.map((item) => ({
        label: item.label,
        complete: item.isComplete()
      }));

      return {
        title: stage.title,
        items,
        complete: items.every((item) => item.complete)
      };
    });

    return {
      stages,
      allComplete: stages.every((stage) => stage.complete)
    };
  }

  updateTutorialProgress() {
    const state = this.getTutorialProgressState();
    this.tutorialStageCompletions = state.stages.map((stage) => stage.complete);

    let unlockedStageCount = 1;
    for (let index = 0; index < state.stages.length - 1; index += 1) {
      if (state.stages[index].complete) {
        unlockedStageCount += 1;
      } else {
        break;
      }
    }

    this.tutorialUnlockedStageCount = Math.max(1, Math.min(state.stages.length, unlockedStageCount));

    if (state.allComplete && !this.tutorialHasShownCompletion) {
      this.tutorialHasShownCompletion = true;
      this.tutorialCompleteVisible = true;
      this.tutorialVisible = false;
    }

    return state;
  }

  renderTutorialChecklist(checklistBody) {
    if (!checklistBody) return;

    const progress = this.getTutorialProgressState();
    const visibleStages = progress.stages.slice(0, this.tutorialUnlockedStageCount);
    const renderKey = JSON.stringify({
      visibleStages,
      unlocked: this.tutorialUnlockedStageCount
    });

    if (renderKey === this.tutorialRenderStateKey) {
      return;
    }

    this.tutorialRenderStateKey = renderKey;
    checklistBody.innerHTML = '';

    for (const stage of visibleStages) {
      const stageBlock = document.createElement('article');
      stageBlock.className = 'tutorial-checklist-stage';

      const stageTitle = document.createElement('h3');
      stageTitle.textContent = stage.title;
      stageBlock.appendChild(stageTitle);

      const list = document.createElement('div');
      list.className = 'tutorial-checklist-items';

      for (const item of stage.items) {
        const row = document.createElement('p');
        row.className = `tutorial-checklist-item${item.complete ? ' is-complete' : ''}`;
        row.textContent = `${item.complete ? '☑' : '☐'} ${item.label}`;
        list.appendChild(row);
      }

      stageBlock.appendChild(list);
      checklistBody.appendChild(stageBlock);
    }
  }

  getAvailableTypesForTab() {
    const types = new Set();
    for (const item of Object.values(ITEM_CATALOG)) {
      if (this.getBuyTabForType(item.type) === this.buyTab) {
        types.add(item.type);
      }
    }

    return [...types];
  }

  buildBuyTypeFilters() {
    if (!this.ui?.buyFilters) return;

    this.ui.buyFilters.innerHTML = '';
    for (const type of this.getAvailableTypesForTab()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.typeFilter = type;
      button.className = `buy-filter ${this.getTypeColorClass(type)}`;
      button.classList.toggle('is-active', this.activeBuyTypes.has(type));
      button.textContent = this.getTypeLabel(type);
      this.ui.buyFilters.appendChild(button);
    }
  }

  buildBuyPanelButtons() {
    if (!this.ui?.buyGrid) return;

    this.buildBuyTypeFilters();
    this.buyItemButtons.clear();
    this.ui.buyGrid.innerHTML = '';

    for (const [itemKey, item] of Object.entries(ITEM_CATALOG)) {
      if (this.getBuyTabForType(item.type) !== this.buyTab) {
        continue;
      }
      if (!this.activeBuyTypes.has(item.type)) {
        continue;
      }

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `buy-tile ${this.getTypeColorClass(item.type)}`;
      button.dataset.itemKey = itemKey;

      const sprite = document.createElement('span');
      sprite.className = 'buy-tile-sprite';
      const spriteSource = Array.isArray(item.assetRotations) ? item.assetRotations[0] : null;
      if (spriteSource) {
        sprite.classList.add('buy-tile-sprite--asset');
        sprite.style.backgroundImage = `url(${spriteSource})`;
      }

      const name = document.createElement('span');
      name.className = 'buy-tile-name';
      name.textContent = item.label;

      const price = document.createElement('span');
      price.className = 'buy-tile-price';
      price.textContent = this.formatEuro(item.cost);

      button.appendChild(sprite);
      button.appendChild(name);
      button.appendChild(price);

      this.ui.buyGrid.append(button);
      this.buyItemButtons.set(itemKey, button);
    }
  }

  update(deltaSeconds, game) {
    if (this.isGameOver) return;

    this.handleMapDrag(game);
    const mapLayout = this.getMapLayout(game.canvas.width, game.canvas.height);
    this.lastMapLayout = mapLayout;

    this.handlePlacementRotation(game);
    this.updateHoveredTile(game, mapLayout);
    this.handleDeviceSelectionClick(game);
    this.handlePlacementClick(game);
    if (this.evaluateBankState()) return;

    this.spawnTimer += deltaSeconds;
    while (this.spawnTimer >= this.getSpawnIntervalSeconds()) {
      this.spawnIncomingPerson(mapLayout);
      this.spawnTimer -= this.getSpawnIntervalSeconds();
    }

    this.cycleTimer += deltaSeconds;
    while (this.cycleTimer >= this.cycleIntervalSeconds) {
      this.processEconomyCycle();
      this.cycleTimer -= this.cycleIntervalSeconds;
      if (this.isGameOver) return;
    }

    this.updateBrokenDevices(deltaSeconds);
    this.updatePeople(deltaSeconds, mapLayout);
    this.updatePopularity();
    this.evaluateBankState();
    this.updateUiMetrics();
  }

  evaluateBankState() {
    if (this.isGameOver) {
      return true;
    }

    if (this.money <= this.gameOverBankLimit) {
      this.isGameOver = true;
      this.onGameOver?.({ bank: this.money, limit: this.gameOverBankLimit });
      return true;
    }

    return false;
  }

  processEconomyCycle() {
    this.updatePopularity();
    this.syncMemberCount();

    for (const member of this.memberProfiles) {
      member.monthsSubscribed += 1;
    }

    this.lastCycleChurn = this.currentCycleChurn;
    this.lastCycleGained = this.currentCycleGained;
    this.currentCycleGained = 0;
    this.currentCycleChurn = 0;

    const monthLabel = this.getCurrentMonthLabel();
    const monthlyCosts = this.getMonthlyCosts();
    const subscriptionIncome = this.subscriptionFee * this.members;
    this.lastCycleIncome = subscriptionIncome;
    this.lastCycleDayTicketIncome = this.currentCycleDayTicketIncome;
    this.currentCycleDayTicketIncome = 0;
    this.money = this.money - monthlyCosts + subscriptionIncome;
    const monthlyProfit = this.money - this.monthStartBank;
    this.recordMonthlyStatistics({
      monthLabel,
      membersGained: this.lastCycleGained,
      membersLost: this.lastCycleChurn,
      profit: monthlyProfit
    });
    this.recordMonthlyMetricsSnapshot(monthLabel);
    this.monthSatisfactionSum = 0;
    this.monthSatisfactionCount = 0;
    this.currentCycleLockerTurnedDown = 0;
    this.monthStartBank = this.money;
    this.advanceMonth();
    this.evaluateBankState();
  }

  recordMonthlyMetricsSnapshot(monthLabel) {
    const projectedMembersIncome = this.members * this.subscriptionFee;
    const projectedDayTicketIncome = this.lastCycleDayTicketIncome;

    this.monthlyBankHistory.unshift({ monthLabel, value: this.money });
    this.monthlyPopularityHistory.unshift({ monthLabel, value: this.popularity });
    this.monthlyCostsHistory.unshift({ monthLabel, value: this.getMonthlyCosts() });
    this.monthlyProjectedIncomeHistory.unshift({
      monthLabel,
      membersIncome: projectedMembersIncome,
      dayTicketIncome: projectedDayTicketIncome,
      value: projectedMembersIncome + projectedDayTicketIncome
    });
    this.monthlyMemberHistory.unshift({ monthLabel, value: this.members });
    this.monthlyLockerTurnedDownHistory.unshift({ monthLabel, value: this.currentCycleLockerTurnedDown });
    this.monthlySatisfactionHistory.unshift({ monthLabel, value: this.getAverageSatisfaction() });

    const collections = [
      this.monthlyBankHistory,
      this.monthlyPopularityHistory,
      this.monthlyCostsHistory,
      this.monthlyProjectedIncomeHistory,
      this.monthlyMemberHistory,
      this.monthlyLockerTurnedDownHistory,
      this.monthlySatisfactionHistory
    ];

    for (const collection of collections) {
      if (collection.length > 6) {
        collection.length = 6;
      }
    }
  }

  getCurrentMonthLabel() {
    return `${String(this.currentMonth).padStart(2, '0')}/${String(this.currentYear).padStart(2, '0')}`;
  }

  recordMonthlyStatistics(entry) {
    this.monthlyStatistics.unshift(entry);
    if (this.monthlyStatistics.length > 6) {
      this.monthlyStatistics.length = 6;
    }
  }

  advanceMonth() {
    this.elapsedMonths += 1;
    this.currentMonth += 1;
    if (this.currentMonth > 12) {
      this.currentMonth = 1;
      this.currentYear = (this.currentYear + 1) % 100;
    }

    this.initializeMonthlySpawnPlan();
  }

  getSpawnIntervalSeconds() {
    const remainingSpawns = this.monthlyTotalSpawnTarget - this.monthlyTotalSpawned;
    if (remainingSpawns <= 0) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(0.35, this.cycleIntervalSeconds / this.monthlyTotalSpawnTarget);
  }

  getMonthlyNonMemberEncounterTarget() {
    return Math.max(
      1,
      this.monthlyEncountersBase + this.monthlyEncountersGrowth * this.elapsedMonths
    );
  }

  initializeMonthlySpawnPlan() {
    const nonMemberTarget = this.getMonthlyNonMemberEncounterTarget();
    const memberTarget = Math.floor(this.memberProfiles.length / 2);
    const shuffledMembers = [...this.memberProfiles].sort(() => Math.random() - 0.5);

    this.monthlyNonMemberEncounterTarget = nonMemberTarget;
    this.monthlyNonMemberEncountersSpawned = 0;
    this.monthlyMemberSpawnQueue = shuffledMembers.slice(0, memberTarget);
    this.monthlyTotalSpawnTarget = nonMemberTarget + this.monthlyMemberSpawnQueue.length;
    this.monthlyTotalSpawned = 0;
    this.spawnTimer = 0;
  }

  chooseIncomingVisitorProfile() {
    const remainingNonMember =
      this.monthlyNonMemberEncounterTarget - this.monthlyNonMemberEncountersSpawned;
    const remainingMembers = this.monthlyMemberSpawnQueue.length;

    if (remainingNonMember <= 0 && remainingMembers <= 0) {
      return null;
    }

    const shouldSpawnMember =
      remainingMembers > 0 &&
      (remainingNonMember <= 0 || Math.random() < remainingMembers / (remainingMembers + remainingNonMember));

    if (shouldSpawnMember) {
      return {
        memberProfile: this.monthlyMemberSpawnQueue.pop(),
        isMember: true
      };
    }

    this.monthlyNonMemberEncountersSpawned += 1;
    return {
      memberProfile: null,
      isMember: false
    };
  }

  updatePopularity() {
    this.popularity = this.items.reduce((sum, item) => {
      if (this.isItemBroken(item)) return sum;
      return sum + ITEM_CATALOG[item.key].popularity;
    }, 0);
  }

  updateBrokenDevices(deltaSeconds) {
    for (const item of this.items) {
      if (!this.isItemBroken(item)) continue;

      const wasBroken = item.repairSecondsRemaining > 0;
      item.repairSecondsRemaining = Math.max(0, item.repairSecondsRemaining - deltaSeconds);

      if (wasBroken && item.repairSecondsRemaining === 0) {
        item.breakChance = ITEM_CATALOG[item.key]?.initialBreakChance ?? item.breakChance;
        item.repairDurationSeconds = 0;
      }
    }
  }

  spawnIncomingPerson(mapLayout) {
    const incomingVisitor = this.chooseIncomingVisitorProfile();
    if (!incomingVisitor) {
      return false;
    }

    const nearSidewalkOutsideDistance = this.getNearSidewalkOutsideDistance() ?? 1;
    const { startRow, endRow } = this.getExteriorTraversalRowBounds();
    const entersFromTop = Math.random() < 0.5;
    const spawnRow = entersFromTop ? startRow : endRow;
    const passThroughRow = entersFromTop ? endRow : startRow;

    const spawnPoint = this.getExteriorTileCenter(spawnRow, nearSidewalkOutsideDistance, mapLayout);
    const entryDecisionPopularity = Math.min(100, Math.max(0, Math.floor(this.popularity)));
    const wantsToEnterGym = Math.random() < entryDecisionPopularity / 100;
    const sidewalkTargetRow = wantsToEnterGym ? this.entranceTile.row : passThroughRow;
    const sidewalkTravelPoint = this.getExteriorTileCenter(
      sidewalkTargetRow,
      nearSidewalkOutsideDistance,
      mapLayout
    );
    const visitingMember = incomingVisitor.memberProfile;
    const isMember = incomingVisitor.isMember;

    this.people.push({
      id: this.nextPersonId,
      x: spawnPoint.x,
      y: spawnPoint.y,
      speed: 60 + Math.random() * 25,
      name: visitingMember?.name ?? this.pickRandomName(),
      customerType: null,
      state: wantsToEnterGym ? 'to-entrance-sidewalk' : 'sidewalk-passing',
      targetX: sidewalkTravelPoint.x,
      targetY: sidewalkTravelPoint.y,
      entersFromTop,
      passThroughRow,
      wantsToEnterGym,
      entryDecisionPopularity,
      hasCompletedCheckIn: false,
      nearSidewalkOutsideDistance,
      targetItemId: null,
      destinationType: null,
      destinationItemKey: null,
      queuedItemId: null,
      assignedLockerItemId: null,
      queueSeconds: 0,
      trainingRemaining: 0,
      trainingPlan: [],
      trainingPlanIndex: 0,
      trainingPlanResults: [],
      trainingPlanAttemptCounts: [],
      plansShower: Math.random() < 0.3,
      lastDeviceType: null,
      visitSatisfaction: 0,
      baselineSatisfaction: 0,
      isMember,
      memberId: visitingMember?.id ?? null,
      paidDailyTicket: false,
      canSubscribe: true,
      unhappy: false,
      didConversionCheck: false,
      thoughtNoShower: false,
      thoughtLongQueue: false,
      thoughtNoLocker: false,
      thoughtBrokenDevices: false,
      thoughtPriceTooHigh: false,
      thoughtPriceGreatDeal: false,
      showLeaveSatisfaction: false,
      vendingVisitStage: null
    });

    this.nextPersonId += 1;
    this.monthlyTotalSpawned += 1;
    return true;
  }

  randomIntInclusive(min, max) {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(Math.random() * (high - low + 1)) + low;
  }

  clampSatisfaction(value) {
    return Math.min(SATISFACTION_MAX, Math.max(SATISFACTION_MIN, value));
  }

  addSatisfaction(person, amount) {
    person.visitSatisfaction = this.clampSatisfaction(person.visitSatisfaction + amount);
  }

  setSatisfaction(person, value) {
    person.visitSatisfaction = this.clampSatisfaction(value);
  }

  initializeVisitSatisfaction(person) {
    const popularityMinusPrice = this.popularity - this.subscriptionFee;

    person.thoughtPriceTooHigh = popularityMinusPrice < -10;
    person.thoughtPriceGreatDeal = popularityMinusPrice > 10;

    let baseline;
    if (popularityMinusPrice > 10) {
      baseline = this.randomIntInclusive(60, 80);
    } else if (popularityMinusPrice < -10) {
      baseline = this.randomIntInclusive(20, 40);
    } else {
      baseline = this.randomIntInclusive(40, 60);
    }

    baseline += this.getBaseHappinessBonus();

    person.baselineSatisfaction = this.clampSatisfaction(baseline);
    this.setSatisfaction(person, person.baselineSatisfaction);
  }

  registerVisitSatisfaction(person) {
    this.monthSatisfactionSum += person.visitSatisfaction;
    this.monthSatisfactionCount += 1;
  }

  getAverageSatisfaction() {
    if (this.monthSatisfactionCount === 0) return 0;
    return Math.round(this.monthSatisfactionSum / this.monthSatisfactionCount);
  }

  pickRandomName() {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${firstName} ${lastName}`;
  }

  pickRandomCustomerType() {
    return CUSTOMER_TYPES[Math.floor(Math.random() * CUSTOMER_TYPES.length)];
  }

  syncMemberCount() {
    this.members = this.memberProfiles.length;
  }

  createMemberProfile(person) {
    const customerType = person.customerType ?? this.pickRandomCustomerType();
    const profile = {
      id: this.nextMemberId,
      name: this.pickRandomName(),
      type: customerType.preferredType,
      color: customerType.color,
      monthsSubscribed: 0,
      lastVisitSatisfaction: this.clampSatisfaction(Math.round(person.visitSatisfaction))
    };

    this.nextMemberId += 1;
    this.memberProfiles.push(profile);
    this.syncMemberCount();
    return profile;
  }

  removeMemberProfile(memberId) {
    const nextProfiles = this.memberProfiles.filter((member) => member.id !== memberId);
    const removed = nextProfiles.length !== this.memberProfiles.length;
    this.memberProfiles = nextProfiles;
    this.syncMemberCount();
    return removed;
  }

  updateMemberProfileVisit(memberId, satisfaction) {
    const member = this.memberProfiles.find((entry) => entry.id === memberId);
    if (!member) return;

    member.lastVisitSatisfaction = this.clampSatisfaction(Math.round(satisfaction));
  }
}

Object.assign(MainScene.prototype, peopleMethods, interactionUiMethods, layoutRenderMethods);
