import { SIMULATION_DEFAULTS } from './config.js';

const EVENTS = Object.freeze({
  NEW_HOUR: 'OnNewHour',
  DAY_START: 'OnDayStart',
  DAY_END: 'OnDayEnd',
  MONTH_START: 'OnMonthStart',
  MONTH_END: 'OnMonthEnd'
});

export class TimeKeeper {
  constructor(config = SIMULATION_DEFAULTS.time) {
    this.config = {
      ...SIMULATION_DEFAULTS.time,
      ...config
    };

    this.realMillisecondsPerDay = this.config.realSecondsPerDay * 1000;
    this.inGameHoursPerDay = 24;
    this.realMillisecondsPerInGameHour = this.realMillisecondsPerDay / this.inGameHoursPerDay;

    this.totalRealMilliseconds = 0;
    this.totalInGameHours = 0;

    this.weekday = this.config.startWeekday;
    this.dayInMonth = this.config.startDayInMonth;
    this.month = this.config.startMonth;
    this.year = this.config.startYear;

    this.listeners = new Map();
    Object.values(EVENTS).forEach((eventName) => {
      this.listeners.set(eventName, []);
    });
  }

  static get Events() {
    return EVENTS;
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName) || typeof callback !== 'function') {
      return () => {};
    }

    const callbacks = this.listeners.get(eventName);
    callbacks.push(callback);

    return () => {
      const index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    };
  }

  update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return;
    }

    const previousTotalHours = this.totalInGameHours;
    this.totalRealMilliseconds += deltaSeconds * 1000;
    const nextTotalHours = Math.floor(this.totalRealMilliseconds / this.realMillisecondsPerInGameHour);

    for (let hour = previousTotalHours + 1; hour <= nextTotalHours; hour += 1) {
      this.totalInGameHours = hour;
      this.processHourTick(hour);
    }
  }

  Update(deltaSeconds) {
    this.update(deltaSeconds);
  }

  processHourTick(totalHours) {
    const dateTime = this.getCurrentDateTimeStruct();
    this.emit(EVENTS.NEW_HOUR, {
      ...dateTime,
      hour: dateTime.hour
    });

    if (totalHours % this.inGameHoursPerDay !== 0) {
      return;
    }

    const endingDateTime = this.getCurrentDateTimeStruct();
    this.emit(EVENTS.DAY_END, endingDateTime);

    const isMonthEnd = this.dayInMonth >= this.config.daysPerMonth;
    if (isMonthEnd) {
      this.emit(EVENTS.MONTH_END, endingDateTime);
    }

    this.weekday = (this.weekday + 1) % 7;
    if (isMonthEnd) {
      this.dayInMonth = 1;
      this.month += 1;

      if (this.month > this.config.monthsPerYear) {
        this.month = 1;
        this.year += 1;
      }

      this.emit(EVENTS.MONTH_START, this.getCurrentDateTimeStruct());
    } else {
      this.dayInMonth += 1;
    }

    this.emit(EVENTS.DAY_START, this.getCurrentDateTimeStruct());
  }

  getCurrentDateTimeStruct() {
    const hourOfDayTotal = this.totalInGameHours % this.inGameHoursPerDay;
    const hour = hourOfDayTotal;
    const minute = 0;

    const currentDayStartHours =
      Math.floor(this.totalInGameHours / this.inGameHoursPerDay) * this.inGameHoursPerDay;
    const currentDayElapsedRealMs =
      this.totalRealMilliseconds - currentDayStartHours * this.realMillisecondsPerInGameHour;
    const dayProgress = Math.min(1, Math.max(0, currentDayElapsedRealMs / this.realMillisecondsPerDay));

    return {
      dayProgress,
      timeOfDayHours: hour,
      hour,
      minute,
      weekday: this.weekday,
      dayInMonth: this.dayInMonth,
      month: this.month,
      year: this.year,
      totalInGameMinutes: this.totalInGameHours * 60,
      totalInGameDays: Math.floor(this.totalInGameHours / this.inGameHoursPerDay)
    };
  }

  GetCurrentDateTimeStruct() {
    return this.getCurrentDateTimeStruct();
  }

  emit(eventName, payload) {
    const callbacks = this.listeners.get(eventName);
    if (!callbacks) {
      return;
    }

    for (const callback of callbacks) {
      callback(payload);
    }
  }
}
