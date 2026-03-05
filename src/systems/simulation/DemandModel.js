import { clamp } from '../../utils/math.js';
import { SIMULATION_DEFAULTS, clamp01 } from './config.js';

function gaussian(x, center, width) {
  const safeWidth = Math.max(0.001, width);
  const z = (x - center) / safeWidth;
  return Math.exp(-0.5 * z * z);
}

export class DemandModel {
  constructor(config = SIMULATION_DEFAULTS.demand) {
    this.config = {
      ...SIMULATION_DEFAULTS.demand,
      ...config,
      weekdayGlobalMultiplier: {
        ...SIMULATION_DEFAULTS.demand.weekdayGlobalMultiplier,
        ...(config.weekdayGlobalMultiplier ?? {})
      },
      weekdayCurves: {
        ...SIMULATION_DEFAULTS.demand.weekdayCurves,
        ...(config.weekdayCurves ?? {})
      }
    };
  }

  getSeasonMultiplier(month) {
    if (month === 1) {
      return this.config.newYearBoostJan;
    }

    if (month === 2) {
      return this.config.newYearBoostFeb;
    }

    return this.config.defaultSeasonMultiplier;
  }

  getCurveProfileForWeekday(weekday) {
    if (weekday === 5) return this.config.weekdayCurves.saturday;
    if (weekday === 6) return this.config.weekdayCurves.sunday;
    if (weekday === 4) return this.config.weekdayCurves.friday;
    return this.config.weekdayCurves.workday;
  }

  getDemandFactorAtHour(weekday, hour) {
    const clampedHour = clamp(hour, 0, 23.999);
    const profile = this.getCurveProfileForWeekday(weekday);
    let value = 0.22;

    for (const peak of profile) {
      value += gaussian(clampedHour, peak.center, peak.width) * peak.amplitude;
    }

    const weekdayMultiplier = this.config.weekdayGlobalMultiplier[weekday] ?? 1;
    return clamp01(value * weekdayMultiplier);
  }

  GetDemandFactorAtHour(weekday, hour) {
    return this.getDemandFactorAtHour(weekday, hour);
  }

  computeExpectedArrivalsPerInGameMinute({
    isOpen,
    weekday,
    hour,
    month,
    weatherMultiplier,
    baseDemandPerMinute,
    gymReputationMultiplier,
    priceMultiplier
  }) {
    if (!isOpen) {
      return 0;
    }

    const peakFactor = this.getDemandFactorAtHour(weekday, hour);
    const seasonMultiplier = this.getSeasonMultiplier(month);

    const raw =
      baseDemandPerMinute *
      seasonMultiplier *
      weatherMultiplier *
      peakFactor *
      gymReputationMultiplier *
      priceMultiplier;

    return clamp(raw, this.config.minLambdaPerInGameMinute, this.config.maxLambdaPerInGameMinute);
  }
}
