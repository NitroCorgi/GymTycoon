import { SIMULATION_DEFAULTS, WEATHER_TYPES } from './config.js';

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6D2B79F5;
    let value = Math.imul(t ^ (t >>> 15), 1 | t);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDateSeed(year, month, dayInMonth, seed) {
  let hash = 2166136261;
  const values = [year, month, dayInMonth, seed];
  for (const value of values) {
    hash ^= Number(value) >>> 0;
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export class WeatherGenerator {
  constructor(config = SIMULATION_DEFAULTS.weather) {
    this.config = { ...SIMULATION_DEFAULTS.weather, ...config };
  }

  generateWeatherForDay(year, month, dayInMonth, seed = this.config.seed) {
    const monthProfile = this.config.monthProfiles[month] ?? this.config.monthProfiles[1];
    const rng = mulberry32(hashDateSeed(year, month, dayInMonth, seed));

    const roll = rng();
    const bins = [
      { type: WEATHER_TYPES.SUNNY, chance: monthProfile.sunny ?? 0 },
      { type: WEATHER_TYPES.CLOUDY, chance: monthProfile.cloudy ?? 0 },
      { type: WEATHER_TYPES.RAINY, chance: monthProfile.rainy ?? 0 },
      { type: WEATHER_TYPES.SNOWY, chance: monthProfile.snowy ?? 0 }
    ];

    let cursor = 0;
    let selectedType = WEATHER_TYPES.CLOUDY;
    for (const bin of bins) {
      cursor += bin.chance;
      if (roll <= cursor) {
        selectedType = bin.type;
        break;
      }
    }

    const tempMin = monthProfile.tempMin ?? 8;
    const tempMax = monthProfile.tempMax ?? 16;
    const temperatureC = Math.round(tempMin + (tempMax - tempMin) * rng());

    return {
      type: selectedType,
      temperatureC
    };
  }

  GenerateWeatherForDay(year, month, dayInMonth, seed = this.config.seed) {
    return this.generateWeatherForDay(year, month, dayInMonth, seed);
  }
}
