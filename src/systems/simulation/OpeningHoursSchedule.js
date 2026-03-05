import { SIMULATION_DEFAULTS } from './config.js';

const SEARCH_MAX_DAYS = 40;

export class OpeningHoursSchedule {
  constructor(scheduleConfig = SIMULATION_DEFAULTS.openingHours.defaultByWeekday) {
    this.scheduleByWeekday = { ...SIMULATION_DEFAULTS.openingHours.defaultByWeekday, ...scheduleConfig };
  }

  getHoursForWeekday(weekday) {
    const normalizedWeekday = ((weekday % 7) + 7) % 7;
    const configured = this.scheduleByWeekday[normalizedWeekday];
    if (!configured) {
      return { openHour: 0, closeHour: 24 };
    }

    return {
      openHour: Math.max(0, Math.min(24, configured.openHour ?? 0)),
      closeHour: Math.max(0, Math.min(24, configured.closeHour ?? 24))
    };
  }

  setHoursForWeekday(weekday, openHour, closeHour) {
    const normalizedWeekday = ((weekday % 7) + 7) % 7;
    const clampedOpen = Math.max(0, Math.min(23, Math.floor(openHour ?? 0)));
    const clampedClose = Math.max(clampedOpen + 1, Math.min(24, Math.floor(closeHour ?? 24)));

    this.scheduleByWeekday[normalizedWeekday] = {
      openHour: clampedOpen,
      closeHour: clampedClose
    };
  }

  SetHoursForWeekday(weekday, openHour, closeHour) {
    this.setHoursForWeekday(weekday, openHour, closeHour);
  }

  getScheduleSnapshot() {
    const snapshot = {};
    for (let weekday = 0; weekday < 7; weekday += 1) {
      snapshot[weekday] = this.getHoursForWeekday(weekday);
    }

    return snapshot;
  }

  isOpen(dateTime) {
    const { openHour, closeHour } = this.getHoursForWeekday(dateTime.weekday);
    const currentHours = dateTime.timeOfDayHours ?? dateTime.hour + (dateTime.minute ?? 0) / 60;
    return currentHours >= openHour && currentHours < closeHour;
  }

  IsOpen(dateTime) {
    return this.isOpen(dateTime);
  }

  nextOpenTime(fromTime) {
    for (let dayOffset = 0; dayOffset <= SEARCH_MAX_DAYS; dayOffset += 1) {
      const weekday = (fromTime.weekday + dayOffset) % 7;
      const { openHour, closeHour } = this.getHoursForWeekday(weekday);
      if (closeHour <= openHour) {
        continue;
      }

      const currentHour = fromTime.timeOfDayHours ?? fromTime.hour + (fromTime.minute ?? 0) / 60;
      if (dayOffset === 0 && currentHour < openHour) {
        return { dayOffset, weekday, hour: openHour, minute: 0 };
      }

      if (dayOffset > 0) {
        return { dayOffset, weekday, hour: openHour, minute: 0 };
      }
    }

    return null;
  }

  NextOpenTime(fromTime) {
    return this.nextOpenTime(fromTime);
  }

  nextCloseTime(fromTime) {
    const currentHour = fromTime.timeOfDayHours ?? fromTime.hour + (fromTime.minute ?? 0) / 60;
    const todayHours = this.getHoursForWeekday(fromTime.weekday);

    if (currentHour < todayHours.closeHour && currentHour >= todayHours.openHour) {
      return { dayOffset: 0, weekday: fromTime.weekday, hour: todayHours.closeHour, minute: 0 };
    }

    const nextOpen = this.nextOpenTime(fromTime);
    if (!nextOpen) {
      return null;
    }

    const hours = this.getHoursForWeekday(nextOpen.weekday);
    return {
      dayOffset: nextOpen.dayOffset,
      weekday: nextOpen.weekday,
      hour: hours.closeHour,
      minute: 0
    };
  }

  NextCloseTime(fromTime) {
    return this.nextCloseTime(fromTime);
  }
}
