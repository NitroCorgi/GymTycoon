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
import { ArrivalSpawner } from '../systems/simulation/ArrivalSpawner.js';
import { DemandModel } from '../systems/simulation/DemandModel.js';
import { OpeningHoursSchedule } from '../systems/simulation/OpeningHoursSchedule.js';
import { SIMULATION_DEFAULTS, WEATHER_TYPES } from '../systems/simulation/config.js';
import { TimeKeeper } from '../systems/simulation/TimeKeeper.js';
import { getTimeBarUiState } from '../systems/simulation/uiTimeHelpers.js';
import { WeatherGenerator } from '../systems/simulation/WeatherGenerator.js';

export class MainScene {
  constructor({ ui, onGameOver, onCampaignVictory }) {
    this.ui = ui;
    this.onGameOver = onGameOver;
    this.onCampaignVictory = onCampaignVictory;
    this.buyItemButtons = new Map();
    this.gameOverBankLimit = -50000;

    this.startNewGame();
    this.bindUi();
    this.refreshUi();
  }

  onEnter() {
    this.ui?.root?.classList.remove('is-title-screen');
    this.ui?.titleScreen?.classList.remove('is-open');
    this.ui?.campaignScreen?.classList.remove('is-open');
    this.ui?.campaignVictoryScreen?.classList.remove('is-open');
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
    showTutorialWelcome = false,
    setupConfig = {}
  ) {
    const selectedLocation = locationConfig ?? this.getDefaultLocationConfig();
    const selectedDifficulty = difficultyConfig ?? this.getDefaultDifficultyConfig();

    this.locationId = selectedLocation.id;
    this.difficultyId = selectedDifficulty.id;
    const configuredGymName =
      typeof setupConfig?.gymName === 'string' ? setupConfig.gymName.trim().slice(0, 24) : '';
    const configuredGymMainColor =
      typeof setupConfig?.gymMainColor === 'string' ? setupConfig.gymMainColor : '';
    const configuredStartingBank = Number.isFinite(setupConfig?.startingBank)
      ? Math.max(0, Math.floor(setupConfig.startingBank))
      : null;
    const configuredStartingMembers = Number.isFinite(setupConfig?.startingMembers)
      ? Math.max(0, Math.floor(setupConfig.startingMembers))
      : null;
    this.gymName = configuredGymName || 'My Gym';
    this.gymMainColor = /^#[0-9a-fA-F]{6}$/.test(configuredGymMainColor) ? configuredGymMainColor : '#6ea0ff';
    this.campaignConfig = setupConfig?.campaignConfig ?? null;
    this.mapRows = selectedLocation.mapRows ?? 8;
    this.mapCols = selectedLocation.mapCols ?? 8;
    this.tileAvailability = this.createTileAvailabilityGrid(
      this.mapRows,
      this.mapCols,
      selectedLocation.mapAreas
    );

    this.money = configuredStartingBank ?? selectedDifficulty.startingBank ?? 50000;
    this.subscriptionFee = 30;
    this.rentAmount = selectedLocation.monthlyRent ?? 1000;
    this.dailyEncountersBase = selectedLocation.dailyEncountersBase ?? selectedLocation.monthlyEncountersBase ?? 20;
    this.dailyEncountersGrowth =
      selectedLocation.dailyEncountersGrowth ?? selectedLocation.monthlyEncountersGrowth ?? 1;
    this.elapsedMonths = 0;

    this.lastCycleIncome = 0;
    this.lastCycleDayTicketIncome = 0;
    this.lastCycleVendingIncome = 0;
    this.lastCycleChurn = 0;
    this.lastCycleGained = 0;
    this.currentCycleGained = 0;
    this.currentCycleChurn = 0;
    this.currentCycleDayTicketIncome = 0;
    this.currentCycleVendingIncome = 0;
    this.monthSatisfactionSum = 0;
    this.monthSatisfactionCount = 0;
    this.currentMonth = SIMULATION_DEFAULTS.time.startMonth;
    this.currentYear = SIMULATION_DEFAULTS.time.startYear;
    this.currentWeekday = SIMULATION_DEFAULTS.time.startWeekday;
    this.currentDayInMonth = SIMULATION_DEFAULTS.time.startDayInMonth;
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
    this.isCampaignComplete = false;

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
    this.currentExpectedArrivalsPerInGameMinute = 0;
    this.currentWeatherState = { type: WEATHER_TYPES.CLOUDY, temperatureC: 12 };
    this.dailyArrivalPlan = null;

    this.hoveredTile = null;
    this.hoveredWallSegment = null;
    this.mapOffsetX = 0;
    this.mapOffsetY = 0;
    this.mapZoom = 1;
    this.mapZoomMin = 0.6;
    this.mapZoomMax = 2;
    this.mapZoomStep = 0.1;
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
    this.gymAdministrationVisible = false;
    this.gymAdministrationTab = 'opening-hours';
    this.activeStatisticKey = null;
    this.selectedDeviceId = null;
    this.selectedDecor = null;
    this.selectedPersonId = null;
    this.lastMapLayout = null;
    this.purchasedGymUpgrades = new Set();

    this.tutorialVisible = Boolean(showTutorialWelcome);
    this.tutorialWelcomeVisible = false;
    this.tutorialCompleteVisible = false;
    this.tutorialHasShownCompletion = false;
    this.tutorialUnlockedStageCount = 1;
    this.tutorialStageCompletions = [false, false, false];
    this.tutorialWelcomePages = [];
    this.tutorialWelcomePageIndex = 0;
    this.tutorialWelcomeTypedLength = 0;
    this.tutorialWelcomeTypingIntervalId = null;
    this.tutorialWelcomeTypingSpeedMs = 18;
    this.tutorialRenderStateKey = '';
    this.campaignGoalsRenderStateKey = '';
    this.gymUpgradesRenderStateKey = '';
    this.gymAdministrationRenderStateKey = '';
    this.gymAdministrationDragState = null;
    this.staffSalaryPerHour = 10;
    this.staffCount = 3;

    this.initializeSimulationSystems(selectedLocation);
    this.refreshCurrentWeather();
    this.syncCalendarFromTimeKeeper();
    this.initializeTutorialWelcomeState(showTutorialWelcome);
  this.resetDailyArrivalPlan();

    this.initializeStartingMembers(configuredStartingMembers ?? this.campaignConfig?.startingMembers ?? 0);

    this.buildBuyPanelButtons();
    this.recordMonthlyMetricsSnapshot(this.getCurrentMonthLabel());
    this.refreshUi();
  }

  initializeStartingMembers(startingMembers) {
    const normalizedCount = Number.isFinite(startingMembers)
      ? Math.max(0, Math.floor(startingMembers))
      : 0;

    for (let index = 0; index < normalizedCount; index += 1) {
      this.createMemberProfile({
        visitSatisfaction: this.randomIntInclusive(60, 85)
      });
    }
  }

  getDefaultTutorialWelcomePages() {
    return [
      'Welcome to Gym Tycoon Free Mode! To get started, you need a check-in, lockers, and devices. The more devices you have, the higher your popularity. The more popular you are, the more people come into the gym. If they are satisfied with your gym, they will subscribe to a membership! Click the Guide button on the bottom left to see some tasks to guide you.'
    ];
  }

  getTutorialWelcomePages(showTutorialWelcome) {
    if (!showTutorialWelcome) {
      return [];
    }

    const campaignPages = this.campaignConfig?.introDialoguePages;
    if (Array.isArray(campaignPages) && campaignPages.length > 0) {
      return campaignPages.filter((page) => typeof page === 'string' && page.trim().length > 0);
    }

    return this.getDefaultTutorialWelcomePages();
  }

  clearTutorialWelcomeTypingInterval() {
    if (this.tutorialWelcomeTypingIntervalId !== null) {
      clearInterval(this.tutorialWelcomeTypingIntervalId);
      this.tutorialWelcomeTypingIntervalId = null;
    }
  }

  getCurrentTutorialWelcomePageText() {
    if (!Array.isArray(this.tutorialWelcomePages) || this.tutorialWelcomePages.length === 0) {
      return '';
    }

    return this.tutorialWelcomePages[this.tutorialWelcomePageIndex] ?? '';
  }

  isCurrentTutorialWelcomePageFullyTyped() {
    const currentText = this.getCurrentTutorialWelcomePageText();
    return this.tutorialWelcomeTypedLength >= currentText.length;
  }

  startTutorialWelcomeTyping() {
    const currentText = this.getCurrentTutorialWelcomePageText();
    this.clearTutorialWelcomeTypingInterval();

    if (!this.tutorialWelcomeVisible || currentText.length === 0) {
      this.tutorialWelcomeTypedLength = 0;
      return;
    }

    this.tutorialWelcomeTypedLength = 0;
    this.tutorialWelcomeTypingIntervalId = setInterval(() => {
      if (!this.tutorialWelcomeVisible) {
        this.clearTutorialWelcomeTypingInterval();
        return;
      }

      this.tutorialWelcomeTypedLength = Math.min(currentText.length, this.tutorialWelcomeTypedLength + 1);
      if (this.tutorialWelcomeTypedLength >= currentText.length) {
        this.clearTutorialWelcomeTypingInterval();
      }
    }, this.tutorialWelcomeTypingSpeedMs);
  }

  initializeTutorialWelcomeState(showTutorialWelcome) {
    this.clearTutorialWelcomeTypingInterval();
    this.tutorialWelcomePages = this.getTutorialWelcomePages(showTutorialWelcome);
    this.tutorialWelcomePageIndex = 0;
    this.tutorialWelcomeTypedLength = 0;
    this.tutorialWelcomeVisible = this.tutorialWelcomePages.length > 0;

    if (this.tutorialWelcomeVisible) {
      this.startTutorialWelcomeTyping();
    }
  }

  dismissTutorialWelcomeDialog() {
    this.tutorialWelcomeVisible = false;
    this.clearTutorialWelcomeTypingInterval();
  }

  handleTutorialWelcomeNext() {
    if (!this.tutorialWelcomeVisible) {
      return;
    }

    const currentText = this.getCurrentTutorialWelcomePageText();
    if (this.tutorialWelcomeTypedLength < currentText.length) {
      this.tutorialWelcomeTypedLength = currentText.length;
      this.clearTutorialWelcomeTypingInterval();
      return;
    }

    if (this.tutorialWelcomePageIndex < this.tutorialWelcomePages.length - 1) {
      this.tutorialWelcomePageIndex += 1;
      this.startTutorialWelcomeTyping();
      return;
    }

    this.dismissTutorialWelcomeDialog();
  }

  initializeSimulationSystems(selectedLocation) {
    this.timeKeeper = new TimeKeeper({
      ...SIMULATION_DEFAULTS.time,
      startMonth: SIMULATION_DEFAULTS.time.startMonth,
      startYear: SIMULATION_DEFAULTS.time.startYear
    });

    this.openingHoursSchedule = new OpeningHoursSchedule();
    this.weatherGenerator = new WeatherGenerator({
      ...SIMULATION_DEFAULTS.weather,
      seed: selectedLocation?.weatherSeed ?? SIMULATION_DEFAULTS.weather.seed
    });
    this.demandModel = new DemandModel();
    this.arrivalSpawner = new ArrivalSpawner();

    this.timeKeeper.on(TimeKeeper.Events.DAY_START, () => {
      this.syncCalendarFromTimeKeeper();
      this.refreshCurrentWeather();
      this.resetDailyArrivalPlan();
    });

    this.timeKeeper.on(TimeKeeper.Events.MONTH_END, () => {
      this.processEconomyCycle();
    });
  }

  syncCalendarFromTimeKeeper() {
    if (!this.timeKeeper) return;
    const dateTime = this.timeKeeper.getCurrentDateTimeStruct();
    this.currentMonth = dateTime.month;
    this.currentYear = dateTime.year;
    this.currentWeekday = dateTime.weekday;
    this.currentDayInMonth = dateTime.dayInMonth;
  }

  refreshCurrentWeather() {
    if (!this.timeKeeper || !this.weatherGenerator) return;
    const dateTime = this.timeKeeper.getCurrentDateTimeStruct();
    this.currentWeatherState = this.weatherGenerator.generateWeatherForDay(
      dateTime.year,
      dateTime.month,
      dateTime.dayInMonth
    );
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
      gymAdministrationButton,
      gymAdministrationModal,
      gymAdministrationCloseButton,
      gymAdministrationBody,
      memberListButton,
      memberListModal,
      memberListCloseButton,
      sellDeviceButton,
      vendingRestockButton,
      guideButton,
      tutorialModal,
      tutorialModalCloseButton,
      tutorialWelcomeModal,
      tutorialWelcomeNextButton,
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

    gymAdministrationButton?.addEventListener('click', () => {
      this.gymAdministrationVisible = !this.gymAdministrationVisible;
      if (this.gymAdministrationVisible) {
        this.gymAdministrationTab = this.gymAdministrationTab ?? 'opening-hours';
      }
      this.updateUiMetrics();
    });

    gymAdministrationCloseButton?.addEventListener('click', () => {
      this.gymAdministrationVisible = false;
      this.updateUiMetrics();
    });

    gymAdministrationModal?.addEventListener('click', (event) => {
      if (event.target !== gymAdministrationModal) return;
      this.gymAdministrationVisible = false;
      this.updateUiMetrics();
    });

    const applyGymAdministrationHours = (weekday, mode, rawValue) => {
      const nextValue = Number.parseInt(String(rawValue), 10);
      if (!Number.isFinite(nextValue)) {
        return;
      }

      const current = this.openingHoursSchedule.getHoursForWeekday(weekday);
      let openHour = current.openHour;
      let closeHour = current.closeHour;

      if (mode === 'open') {
        openHour = Math.min(Math.max(0, nextValue), closeHour - 1);
      } else {
        closeHour = Math.max(Math.min(24, nextValue), openHour + 1);
      }

      this.openingHoursSchedule.setHoursForWeekday(weekday, openHour, closeHour);
      this.updateUiMetrics();
    };

    gymAdministrationBody?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.dataset.employeeMode === 'salary') {
        const value = Number.parseInt(target.value, 10);
        if (Number.isFinite(value)) {
          this.staffSalaryPerHour = Math.max(5, Math.min(25, value));
          this.updateUiMetrics();
        }
        return;
      }

      if (target.dataset.employeeMode === 'count') {
        const value = Number.parseInt(target.value, 10);
        if (Number.isFinite(value)) {
          this.staffCount = Math.max(1, Math.min(10, value));
          this.updateUiMetrics();
        }
        return;
      }

      if (!target.classList.contains('admin-hours-range-input')) return;

      const weekdayRaw = target.dataset.weekday;
      const mode = target.dataset.mode;
      if (weekdayRaw === undefined || (mode !== 'open' && mode !== 'close')) {
        return;
      }

      const weekday = Number.parseInt(weekdayRaw, 10);
      if (!Number.isFinite(weekday)) {
        return;
      }

      applyGymAdministrationHours(weekday, mode, target.value);
    });

    gymAdministrationBody?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;

      const nextTab = target.dataset.adminTab;
      if (nextTab !== 'opening-hours' && nextTab !== 'employees') {
        return;
      }

      this.gymAdministrationTab = nextTab;
      this.updateUiMetrics();
    });

    const applyGymAdministrationDrag = (rangeElement, weekday, mode, clientX) => {
      const rect = rangeElement.getBoundingClientRect();
      if (rect.width <= 0) return;

      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const snappedHour = Math.round(ratio * 24);
      applyGymAdministrationHours(weekday, mode, snappedHour);
    };

    gymAdministrationBody?.addEventListener('pointerdown', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const rangeElement = target.closest('.admin-hours-range');
      if (!(rangeElement instanceof HTMLElement)) return;

      const weekdayRaw = rangeElement.dataset.weekday;
      const weekday = Number.parseInt(weekdayRaw ?? '', 10);
      if (!Number.isFinite(weekday)) return;

      let mode = 'open';
      if (target instanceof HTMLInputElement && target.classList.contains('admin-hours-range-input')) {
        mode = target.dataset.mode === 'close' ? 'close' : 'open';
      } else {
        const current = this.openingHoursSchedule.getHoursForWeekday(weekday);
        const rect = rangeElement.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const targetHour = ratio * 24;
        mode = Math.abs(targetHour - current.openHour) <= Math.abs(targetHour - current.closeHour) ? 'open' : 'close';
      }

      this.gymAdministrationDragState = {
        rangeElement,
        weekday,
        mode,
        pointerId: event.pointerId
      };

      rangeElement.setPointerCapture?.(event.pointerId);
      applyGymAdministrationDrag(rangeElement, weekday, mode, event.clientX);
      event.preventDefault();
    });

    gymAdministrationBody?.addEventListener('pointermove', (event) => {
      const state = this.gymAdministrationDragState;
      if (!state) return;
      if (state.pointerId !== event.pointerId) return;

      applyGymAdministrationDrag(state.rangeElement, state.weekday, state.mode, event.clientX);
      event.preventDefault();
    });

    const stopGymAdministrationDrag = (event) => {
      const state = this.gymAdministrationDragState;
      if (!state) return;
      if (state.pointerId !== event.pointerId) return;

      state.rangeElement.releasePointerCapture?.(state.pointerId);
      this.gymAdministrationDragState = null;
    };

    gymAdministrationBody?.addEventListener('pointerup', stopGymAdministrationDrag);
    gymAdministrationBody?.addEventListener('pointercancel', stopGymAdministrationDrag);

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
      this.dismissTutorialWelcomeDialog();
      this.updateUiMetrics();
    });

    tutorialWelcomeNextButton?.addEventListener('click', () => {
      this.handleTutorialWelcomeNext();
      this.updateUiMetrics();
    });

    tutorialWelcomeModal?.addEventListener('click', (event) => {
      if (event.target !== tutorialWelcomeModal) return;
      this.dismissTutorialWelcomeDialog();
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

      const parsedValue = Number.parseInt(target.value, 10);
      if (Number.isNaN(parsedValue)) return;
      this.subscriptionFee = Math.max(0, Math.min(150, parsedValue));
      this.updateUiMetrics();
    });

    if (subscriptionInput) {
      subscriptionInput.value = String(this.subscriptionFee);
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
    if (type === 'recovery') return 'Relaxing';
    if (type === 'check-in') return 'Check-in';
    if (type === 'weightlifting') return 'Weightlifting';
    if (type === 'decor') return 'Decor';
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getTypeSortPriority(type) {
    const priorityByType = {
      cardio: 0,
      strength: 1,
      weightlifting: 2,
      functional: 3,
      recovery: 4,
      'check-in': 5,
      locker: 6,
      shower: 7,
      facility: 8,
      decor: 9
    };

    return priorityByType[type] ?? Number.MAX_SAFE_INTEGER;
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
    multiplier *= Math.max(0.5, 1 - this.staffCount * 0.02);
    return multiplier;
  }

  getCheckInDurationMultiplier() {
    const upgradeMultiplier = this.isGymUpgradePurchased('receptionStaff') ? 0.75 : 1;
    const staffMultiplier = Math.max(0.1, 1 - this.staffCount * 0.1);
    return upgradeMultiplier * staffMultiplier;
  }

  getBaseHappinessBonus() {
    let bonus = 0;
    if (this.isGymUpgradePurchased('musicSystem')) {
      bonus += 10;
    }
    if (this.isGymUpgradePurchased('receptionStaff')) {
      bonus += 5;
    }
    bonus += this.staffCount * 5;
    return bonus;
  }

  getStaffBreakChanceReduction() {
    return Math.max(0, Math.min(0.5, this.staffCount * 0.01));
  }

  getStaffCostPerHour() {
    return this.staffSalaryPerHour * this.staffCount;
  }

  getPeoplePresentInGymCount() {
    const outsideStates = new Set([
      'to-entrance-sidewalk',
      'street-passing',
      'sidewalk-passing',
      'to-street',
      'street-to-entrance',
      'leaving-door',
      'leaving-cross-street',
      'leaving-far-sidewalk',
      'remove',
      'leaving'
    ]);

    return this.people.filter((person) => person.hasCompletedCheckIn && !outsideStates.has(person.state)).length;
  }

  getStaffUtilizationLabel() {
    const peoplePresent = this.getPeoplePresentInGymCount();
    const requiredStaff = peoplePresent / 10;

    if (this.staffCount < requiredStaff) {
      return 'Understaffed';
    }

    if (this.staffCount > requiredStaff * 2) {
      return 'Overstaffed';
    }

    return 'Good';
  }

  getProjectedIncomeEstimate() {
    const projectedMembersIncome = this.members * this.subscriptionFee;
    const projectedDayTicketIncome = this.lastCycleDayTicketIncome;
    return projectedMembersIncome + projectedDayTicketIncome;
  }

  getStaffHappinessLabel() {
    const projectedIncome = this.getProjectedIncomeEstimate();
    if (this.staffSalaryPerHour < projectedIncome / 200) {
      return 'Poor';
    }

    if (this.staffSalaryPerHour > projectedIncome / 100) {
      return 'Good';
    }

    return 'Okay';
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

  isGymOpen24Hours() {
    if (!this.openingHoursSchedule?.getHoursForWeekday) {
      return false;
    }

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const { openHour = 0, closeHour = 24 } = this.openingHoursSchedule.getHoursForWeekday(weekday);
      if (openHour !== 0 || closeHour !== 24) {
        return false;
      }
    }

    return true;
  }

  isGymOpenAt(dateTime = null) {
    const resolvedDateTime = dateTime ?? this.timeKeeper?.getCurrentDateTimeStruct?.() ?? null;
    if (!resolvedDateTime || !this.openingHoursSchedule?.isOpen) {
      return true;
    }

    return this.openingHoursSchedule.isOpen(resolvedDateTime);
  }

  getPlacedItemCount(itemKey) {
    if (!itemKey) return 0;
    return this.items.reduce((count, item) => count + (item.key === itemKey ? 1 : 0), 0);
  }

  getCampaignGoalProgressState() {
    if (!this.campaignConfig?.goals) {
      return null;
    }

    const { goals } = this.campaignConfig;
    const stars = this.getTutorialPopularityStars();
    const averageSatisfactionGoal = goals.averageSatisfaction ?? goals.satisfaction;
    const open24HoursGoal = goals.open24Hours ?? goals.alwaysOpen ?? goals.open247;
    const vendingMachinesGoal = goals.vendingMachines ?? goals.vendingMachinesMin ?? goals.minVendingMachines;
    const monthlyVendingIncomeGoal =
      goals.vendingIncomeMonthly ?? goals.monthlyVendingIncome ?? goals.vendingIncomePerMonth;
    const vendingMachineCount = this.getPlacedItemCount('vendingMachine');
    const goalItems = [
      {
        key: 'bank',
        label: `Have ${this.formatEuro(goals.bank)} in bank`,
        progress: `${this.formatEuro(this.money)} / ${this.formatEuro(goals.bank)}`,
        complete: this.money >= goals.bank
      },
      {
        key: 'popularity',
        label: `Reach ${goals.popularityStars} star popularity`,
        progress: `${stars} / ${goals.popularityStars} stars`,
        complete: stars >= goals.popularityStars
      },
      {
        key: 'members',
        label: `Have ${goals.members} members`,
        progress: `${this.members} / ${goals.members}`,
        complete: this.members >= goals.members
      }
    ];

    if (open24HoursGoal) {
      const open24Hours = this.isGymOpen24Hours();
      goalItems.push({
        key: 'open24Hours',
        label: 'Have the gym open 24/7',
        progress: open24Hours ? '24/7 enabled' : 'Not set to 24/7',
        complete: open24Hours
      });
    }

    if (typeof vendingMachinesGoal === 'number') {
      goalItems.push({
        key: 'vendingMachines',
        label: `Place at least ${vendingMachinesGoal} vending machines`,
        progress: `${vendingMachineCount} / ${vendingMachinesGoal}`,
        complete: vendingMachineCount >= vendingMachinesGoal
      });
    }

    if (typeof monthlyVendingIncomeGoal === 'number') {
      goalItems.push({
        key: 'vendingIncomeMonthly',
        label: `Have at least ${this.formatEuro(monthlyVendingIncomeGoal)} income with vending machines in a month`,
        progress: `${this.formatEuro(this.currentCycleVendingIncome)} / ${this.formatEuro(monthlyVendingIncomeGoal)}`,
        complete: this.currentCycleVendingIncome >= monthlyVendingIncomeGoal
      });
    }

    if (typeof averageSatisfactionGoal === 'number') {
      const averageSatisfaction = this.getAverageSatisfaction();
      goalItems.push({
        key: 'averageSatisfaction',
        label: `Have an average satisfaction of ${averageSatisfactionGoal}`,
        progress: `${averageSatisfaction} / ${averageSatisfactionGoal}`,
        complete: averageSatisfaction >= averageSatisfactionGoal
      });
    }

    return {
      title: `${this.campaignConfig.label} Goals`,
      items: goalItems
    };
  }

  renderCampaignGoalsPanel(panelElement) {
    if (!panelElement) return;

    const goalState = this.getCampaignGoalProgressState();
    panelElement.classList.toggle('is-open', Boolean(goalState));

    if (!goalState) {
      panelElement.innerHTML = '';
      this.campaignGoalsRenderStateKey = '';
      return;
    }

    const renderKey = JSON.stringify(goalState);
    if (renderKey === this.campaignGoalsRenderStateKey) {
      return;
    }

    this.campaignGoalsRenderStateKey = renderKey;
    panelElement.innerHTML = `
      <h3>${goalState.title}</h3>
      <div class="campaign-goals-list">
        ${goalState.items
          .map(
            (item) => `
              <div class="campaign-goal-item${item.complete ? ' is-complete' : ''}">
                <p>${item.complete ? '☑' : '☐'} ${item.label}</p>
                <span>${item.progress}</span>
              </div>
            `
          )
          .join('')}
      </div>
    `;
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

    const campaignGoals = this.getCampaignGoalProgressState();
    if (campaignGoals) {
      const renderKey = JSON.stringify({ campaignGoals });
      if (renderKey === this.tutorialRenderStateKey) {
        return;
      }

      this.tutorialRenderStateKey = renderKey;
      if (this.ui?.tutorialModalTitle) {
        this.ui.tutorialModalTitle.textContent = campaignGoals.title;
      }

      checklistBody.innerHTML = '';
      const stageBlock = document.createElement('article');
      stageBlock.className = 'tutorial-checklist-stage';

      const list = document.createElement('div');
      list.className = 'tutorial-checklist-items';

      for (const item of campaignGoals.items) {
        const row = document.createElement('p');
        row.className = `tutorial-checklist-item${item.complete ? ' is-complete' : ''}`;
        row.textContent = `${item.complete ? '☑' : '☐'} ${item.label} — ${item.progress}`;
        list.appendChild(row);
      }

      stageBlock.appendChild(list);
      checklistBody.appendChild(stageBlock);
      return;
    }

    const progress = this.getTutorialProgressState();
    const currentStageIndex = progress.stages.findIndex((stage) => !stage.complete);
    const resolvedStageIndex = currentStageIndex === -1 ? Math.max(0, progress.stages.length - 1) : currentStageIndex;
    const currentStage = progress.stages[resolvedStageIndex];
    const modalTitle = currentStage ? `${currentStage.title} (Level ${resolvedStageIndex + 1})` : 'Guide Checklist';
    const renderKey = JSON.stringify({
      stage: currentStage,
      title: modalTitle
    });

    if (renderKey === this.tutorialRenderStateKey) {
      return;
    }

    this.tutorialRenderStateKey = renderKey;
    if (this.ui?.tutorialModalTitle) {
      this.ui.tutorialModalTitle.textContent = modalTitle;
    }
    checklistBody.innerHTML = '';

    if (!currentStage) {
      return;
    }

    const stageBlock = document.createElement('article');
    stageBlock.className = 'tutorial-checklist-stage';

    const list = document.createElement('div');
    list.className = 'tutorial-checklist-items';

    for (const item of currentStage.items) {
      const row = document.createElement('p');
      row.className = `tutorial-checklist-item${item.complete ? ' is-complete' : ''}`;
      row.textContent = `${item.complete ? '☑' : '☐'} ${item.label}`;
      list.appendChild(row);
    }

    stageBlock.appendChild(list);
    checklistBody.appendChild(stageBlock);
  }

  getAvailableTypesForTab() {
    const types = new Set();
    for (const item of Object.values(ITEM_CATALOG)) {
      if (this.getBuyTabForType(item.type) === this.buyTab) {
        types.add(item.type);
      }
    }

    return [...types].sort((a, b) => {
      const priorityDiff = this.getTypeSortPriority(a) - this.getTypeSortPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      return this.getTypeLabel(a).localeCompare(this.getTypeLabel(b));
    });
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

    const visibleItems = Object.entries(ITEM_CATALOG)
      .filter(([, item]) => this.getBuyTabForType(item.type) === this.buyTab)
      .filter(([, item]) => this.activeBuyTypes.has(item.type))
      .sort(([, a], [, b]) => {
        const priorityDiff = this.getTypeSortPriority(a.type) - this.getTypeSortPriority(b.type);
        if (priorityDiff !== 0) return priorityDiff;
        return a.label.localeCompare(b.label);
      });

    for (const [itemKey, item] of visibleItems) {

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
    if (this.isGameOver || this.isCampaignComplete) return;

    this.handleMapZoom(game);
    this.handleMapDrag(game);
    const mapLayout = this.getMapLayout(game.canvas.width, game.canvas.height);
    this.lastMapLayout = mapLayout;

    this.handlePlacementRotation(game);
    this.updateHoveredTile(game, mapLayout);
    this.handleDeviceSelectionClick(game);
    this.handlePlacementClick(game);
    if (this.evaluateBankState()) return;

    this.timeKeeper.update(deltaSeconds);
    this.syncCalendarFromTimeKeeper();

    const dateTime = this.timeKeeper.getCurrentDateTimeStruct();
    this.updateScheduledArrivals(deltaSeconds, dateTime, mapLayout);

    this.updateBrokenDevices(deltaSeconds);
    this.updatePeople(deltaSeconds, mapLayout);
    this.updatePopularity();
    if (this.evaluateCampaignState()) return;
    this.evaluateBankState();
    this.updateUiMetrics();
  }

  evaluateCampaignState() {
    if (this.isGameOver || this.isCampaignComplete || !this.campaignConfig?.goals) {
      return false;
    }

    const bankGoalReached = this.money >= (this.campaignConfig.goals.bank ?? Number.MAX_SAFE_INTEGER);
    const popularityGoalReached = this.getTutorialPopularityStars() >= (this.campaignConfig.goals.popularityStars ?? 0);
    const membersGoalReached = this.members >= (this.campaignConfig.goals.members ?? Number.MAX_SAFE_INTEGER);
    const averageSatisfactionGoal =
      this.campaignConfig.goals.averageSatisfaction ?? this.campaignConfig.goals.satisfaction;
    const open24HoursGoal =
      this.campaignConfig.goals.open24Hours ??
      this.campaignConfig.goals.alwaysOpen ??
      this.campaignConfig.goals.open247;
    const vendingMachinesGoal =
      this.campaignConfig.goals.vendingMachines ??
      this.campaignConfig.goals.vendingMachinesMin ??
      this.campaignConfig.goals.minVendingMachines;
    const monthlyVendingIncomeGoal =
      this.campaignConfig.goals.vendingIncomeMonthly ??
      this.campaignConfig.goals.monthlyVendingIncome ??
      this.campaignConfig.goals.vendingIncomePerMonth;
    const averageSatisfactionGoalReached =
      typeof averageSatisfactionGoal === 'number'
        ? this.getAverageSatisfaction() >= averageSatisfactionGoal
        : true;
    const open24HoursGoalReached = open24HoursGoal ? this.isGymOpen24Hours() : true;
    const vendingMachinesGoalReached =
      typeof vendingMachinesGoal === 'number'
        ? this.getPlacedItemCount('vendingMachine') >= vendingMachinesGoal
        : true;
    const monthlyVendingIncomeGoalReached =
      typeof monthlyVendingIncomeGoal === 'number'
        ? this.currentCycleVendingIncome >= monthlyVendingIncomeGoal
        : true;

    if (
      !bankGoalReached ||
      !popularityGoalReached ||
      !membersGoalReached ||
      !averageSatisfactionGoalReached ||
      !open24HoursGoalReached ||
      !vendingMachinesGoalReached ||
      !monthlyVendingIncomeGoalReached
    ) {
      return false;
    }

    this.isCampaignComplete = true;
    this.onCampaignVictory?.({
      levelId: this.campaignConfig.id,
      levelLabel: this.campaignConfig.label,
      gymName: this.gymName
    });
    return true;
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
    this.lastCycleVendingIncome = this.currentCycleVendingIncome;
    this.currentCycleDayTicketIncome = 0;
    this.currentCycleVendingIncome = 0;
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
    this.elapsedMonths += 1;
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

  createArrivalQuotaState() {
    return {
      newCustomers: 0,
      members: 0
    };
  }

  getDateKey(dateTime) {
    return `${dateTime.year}-${dateTime.month}-${dateTime.dayInMonth}`;
  }

  getDailyNewCustomerTarget() {
    return Math.max(0, Math.floor(this.dailyEncountersBase + this.dailyEncountersGrowth * this.elapsedMonths));
  }

  getDailyReturningMemberTarget() {
    return Math.max(0, Math.round(this.memberProfiles.length * 0.10));
  }

  getTotalDayMinutes() {
    return 24 * 60;
  }

  getRemainingDayMinutes(dateTime) {
    const elapsedMinutes = Math.max(0, Math.floor((dateTime.timeOfDayHours ?? 0) * 60 + (dateTime.minute ?? 0)));
    return Math.max(1, this.getTotalDayMinutes() - elapsedMinutes);
  }

  resetDailyArrivalPlan() {
    if (!this.timeKeeper) {
      this.dailyArrivalPlan = null;
      return;
    }

    const dateTime = this.timeKeeper.getCurrentDateTimeStruct();
    this.dailyArrivalPlan = {
      dayKey: this.getDateKey(dateTime),
      weekday: dateTime.weekday,
      targets: {
        newCustomers: this.getDailyNewCustomerTarget(),
        members: this.getDailyReturningMemberTarget()
      },
      spawned: this.createArrivalQuotaState(),
      credits: this.createArrivalQuotaState(),
      totalDayMinutes: this.getTotalDayMinutes()
    };
    this.currentExpectedArrivalsPerInGameMinute = 0;
    this.arrivalSpawner.reset();
  }

  getRemainingArrivalQuota(type) {
    if (!this.dailyArrivalPlan) {
      return 0;
    }

    return Math.max(0, this.dailyArrivalPlan.targets[type] - this.dailyArrivalPlan.spawned[type]);
  }

  getNextScheduledVisitorType() {
    if (!this.dailyArrivalPlan) {
      return null;
    }

    const epsilon = 1e-6;
    const availableTypes = ['newCustomers', 'members'].filter((type) => {
      return this.getRemainingArrivalQuota(type) > 0 && this.dailyArrivalPlan.credits[type] >= 1 - epsilon;
    });

    if (availableTypes.length === 0) {
      return null;
    }

    availableTypes.sort((left, right) => {
      const creditDifference = this.dailyArrivalPlan.credits[right] - this.dailyArrivalPlan.credits[left];
      if (Math.abs(creditDifference) > epsilon) {
        return creditDifference;
      }

      return this.getRemainingArrivalQuota(right) - this.getRemainingArrivalQuota(left);
    });

    return availableTypes[0];
  }

  getScheduledArrivalsPerInGameMinute(dateTime) {
    const remainingNewCustomers = this.getRemainingArrivalQuota('newCustomers');
    const remainingMembers = this.getRemainingArrivalQuota('members');
    const remainingArrivals = remainingNewCustomers + remainingMembers;
    if (remainingArrivals <= 0) {
      return 0;
    }

    const remainingDayMinutes = this.getRemainingDayMinutes(dateTime);
    return remainingArrivals / Math.max(1, remainingDayMinutes);
  }

  updateScheduledArrivals(deltaSeconds, dateTime, mapLayout) {
    if (!this.dailyArrivalPlan || this.dailyArrivalPlan.dayKey !== this.getDateKey(dateTime)) {
      this.resetDailyArrivalPlan();
    }

    if (!this.dailyArrivalPlan) {
      this.currentExpectedArrivalsPerInGameMinute = 0;
      return 0;
    }

    if (!this.isGymOpenAt(dateTime)) {
      this.currentExpectedArrivalsPerInGameMinute = 0;
      return 0;
    }

    const inGameMinutesElapsed = deltaSeconds * SIMULATION_DEFAULTS.arrivals.inGameMinutesPerRealSecond;
    const totalDayMinutes = Math.max(1, this.dailyArrivalPlan.totalDayMinutes);

    for (const type of ['newCustomers', 'members']) {
      const remainingQuota = this.getRemainingArrivalQuota(type);
      if (remainingQuota <= 0) {
        this.dailyArrivalPlan.credits[type] = 0;
        continue;
      }

      const targetForDay = this.dailyArrivalPlan.targets[type];
      this.dailyArrivalPlan.credits[type] += (targetForDay * inGameMinutesElapsed) / totalDayMinutes;
      this.dailyArrivalPlan.credits[type] = Math.min(this.dailyArrivalPlan.credits[type], remainingQuota);
    }

    this.currentExpectedArrivalsPerInGameMinute = this.getScheduledArrivalsPerInGameMinute(dateTime);

    const maxSpawnsThisTick = Math.max(
      0,
      Math.ceil((this.arrivalSpawner?.config.maxArrivalsPerRealSecond ?? 10) * deltaSeconds)
    );

    let spawned = 0;
    while (spawned < maxSpawnsThisTick) {
      const visitorType = this.getNextScheduledVisitorType();
      if (!visitorType) {
        break;
      }

      const didSpawn = this.spawnIncomingPerson(mapLayout, visitorType);
      if (didSpawn === false) {
        break;
      }

      this.dailyArrivalPlan.spawned[visitorType] += 1;
      this.dailyArrivalPlan.credits[visitorType] = Math.max(0, this.dailyArrivalPlan.credits[visitorType] - 1);
      spawned += 1;
    }

    return spawned;
  }

  chooseIncomingVisitorProfile(visitorType = 'newCustomers') {
    if (visitorType === 'members' && this.memberProfiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * this.memberProfiles.length);
      return {
        memberProfile: this.memberProfiles[randomIndex],
        isMember: true
      };
    }

    return {
      memberProfile: null,
      isMember: false
    };
  }

  getGymReputationDemandMultiplier() {
    const normalizedPopularity = Math.max(0, Math.min(1.5, this.popularity / 100));
    return 0.75 + normalizedPopularity * 0.5;
  }

  getPriceDemandMultiplier() {
    const idealPrice = 30;
    const priceDelta = this.subscriptionFee - idealPrice;
    const multiplier = 1 - priceDelta * 0.01;
    return Math.max(0.65, Math.min(1.25, multiplier));
  }

  getDemandFactorAtHour(weekday, hour) {
    return this.demandModel.getDemandFactorAtHour(weekday, hour);
  }

  GetDemandFactorAtHour(weekday, hour) {
    return this.getDemandFactorAtHour(weekday, hour);
  }

  getTimeBarUiState() {
    const dateTime = this.timeKeeper.getCurrentDateTimeStruct();
    const baseState = getTimeBarUiState(dateTime);
    const weatherType = this.currentWeatherState?.type ?? 'Cloudy';
    const weatherEmojiByType = {
      Sunny: '☀️',
      Cloudy: '☁️',
      Rainy: '🌧️',
      Snowy: '❄️'
    };

    return {
      ...baseState,
      isOpen: this.isGymOpenAt(dateTime),
      weatherLabel: weatherType,
      weatherEmoji: weatherEmojiByType[weatherType] ?? '☁️'
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

  spawnIncomingPerson(mapLayout, visitorType = 'newCustomers') {
    if (!this.isGymOpenAt()) {
      return false;
    }

    const incomingVisitor = this.chooseIncomingVisitorProfile(visitorType);
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
      hasEnteredGym: false,
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
