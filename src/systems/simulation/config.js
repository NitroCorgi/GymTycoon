import { clamp } from '../../utils/math.js';

export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WEATHER_TYPES = Object.freeze({
  SUNNY: 'Sunny',
  CLOUDY: 'Cloudy',
  RAINY: 'Rainy',
  SNOWY: 'Snowy'
});

export const SIMULATION_DEFAULTS = Object.freeze({
  // Core calendar speed: 24 real-time seconds per in-game day, 7 days per month.
  time: {
    realSecondsPerDay: 24,
    daysPerMonth: 7,
    monthsPerYear: 12,
    startWeekday: 0,
    startDayInMonth: 1,
    startMonth: 1,
    startYear: 26
  },

  openingHours: {
    defaultByWeekday: {
      0: { openHour: 6, closeHour: 23 },
      1: { openHour: 6, closeHour: 23 },
      2: { openHour: 6, closeHour: 23 },
      3: { openHour: 6, closeHour: 23 },
      4: { openHour: 6, closeHour: 23 },
      5: { openHour: 8, closeHour: 20 },
      6: { openHour: 8, closeHour: 18 }
    }
  },

  weather: {
    // Deterministic weather seed. Change for a different but stable daily sequence.
    seed: 1337,
    monthProfiles: {
      1: { sunny: 0.15, cloudy: 0.35, rainy: 0.2, snowy: 0.3, tempMin: -5, tempMax: 4 },
      2: { sunny: 0.2, cloudy: 0.35, rainy: 0.25, snowy: 0.2, tempMin: -2, tempMax: 7 },
      3: { sunny: 0.3, cloudy: 0.4, rainy: 0.25, snowy: 0.05, tempMin: 2, tempMax: 12 },
      4: { sunny: 0.36, cloudy: 0.34, rainy: 0.28, snowy: 0.02, tempMin: 6, tempMax: 17 },
      5: { sunny: 0.45, cloudy: 0.3, rainy: 0.23, snowy: 0.02, tempMin: 11, tempMax: 23 },
      6: { sunny: 0.55, cloudy: 0.24, rainy: 0.2, snowy: 0.01, tempMin: 15, tempMax: 28 },
      7: { sunny: 0.62, cloudy: 0.2, rainy: 0.17, snowy: 0.01, tempMin: 17, tempMax: 31 },
      8: { sunny: 0.58, cloudy: 0.22, rainy: 0.19, snowy: 0.01, tempMin: 17, tempMax: 30 },
      9: { sunny: 0.42, cloudy: 0.3, rainy: 0.25, snowy: 0.03, tempMin: 13, tempMax: 24 },
      10: { sunny: 0.32, cloudy: 0.36, rainy: 0.27, snowy: 0.05, tempMin: 8, tempMax: 18 },
      11: { sunny: 0.23, cloudy: 0.38, rainy: 0.25, snowy: 0.14, tempMin: 2, tempMax: 11 },
      12: { sunny: 0.14, cloudy: 0.36, rainy: 0.2, snowy: 0.3, tempMin: -4, tempMax: 6 }
    },
    demandMultiplierByType: {
      [WEATHER_TYPES.SUNNY]: 0.88,
      [WEATHER_TYPES.CLOUDY]: 1.02,
      [WEATHER_TYPES.RAINY]: 1.14,
      [WEATHER_TYPES.SNOWY]: 1.2
    }
  },

  demand: {
    // Lambda bounds for expected arrivals per in-game minute.
    minLambdaPerInGameMinute: 0,
    maxLambdaPerInGameMinute: 0.08,
    // Baseline traffic before season/weather/weekday/reputation/price multipliers.
    baseDemandPerInGameMinute: 0.002,

    // New-year resolution effect tuning.
    newYearBoostJan: 1.3,
    newYearBoostFeb: 1.15,
    defaultSeasonMultiplier: 1,

    weekdayGlobalMultiplier: {
      0: 1.08,
      1: 1.06,
      2: 1,
      3: 1,
      4: 0.94,
      5: 1.02,
      6: 0.9
    },

    weekdayCurves: {
      // Gaussian peaks/lulls for hourly demand shape.
      // Each entry: center hour, width, and amplitude (+peak, -lull).
      workday: [
        { center: 7.5, width: 1.8, amplitude: 0.55 },
        { center: 18, width: 2.2, amplitude: 0.9 },
        { center: 21.2, width: 1.7, amplitude: 0.42 },
        { center: 12.5, width: 3.2, amplitude: -0.24 }
      ],
      friday: [
        { center: 7.5, width: 1.8, amplitude: 0.52 },
        { center: 17.4, width: 2.1, amplitude: 0.64 },
        { center: 20.8, width: 1.5, amplitude: 0.3 },
        { center: 12.4, width: 3.1, amplitude: -0.22 }
      ],
      saturday: [
        { center: 11.3, width: 2.4, amplitude: 0.72 },
        { center: 16.8, width: 2.1, amplitude: 0.62 },
        { center: 14, width: 1.8, amplitude: -0.16 }
      ],
      sunday: [
        { center: 10.4, width: 2.2, amplitude: 0.52 },
        { center: 16.3, width: 2.1, amplitude: 0.54 },
        { center: 13, width: 2.2, amplitude: -0.16 }
      ]
    }
  },

  arrivals: {
    // 1 real second = 60 in-game minutes with current time scale.
    inGameMinutesPerRealSecond: 60,
    // Hard cap to prevent burst spikes on low frame rates.
    maxArrivalsPerRealSecond: 10,
    poissonNormalApproxThreshold: 30
  }
});

export function clamp01(value) {
  return clamp(value, 0, 1);
}
