import { SIMULATION_DEFAULTS } from './config.js';

function sampleStandardNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export class ArrivalSpawner {
  constructor(config = SIMULATION_DEFAULTS.arrivals) {
    this.config = {
      ...SIMULATION_DEFAULTS.arrivals,
      ...config
    };

    this.inGameMinuteAccumulator = 0;
  }

  reset() {
    this.inGameMinuteAccumulator = 0;
  }

  update(deltaSeconds, lambdaPerInGameMinute, spawnCallback) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
      return 0;
    }

    this.inGameMinuteAccumulator += deltaSeconds * this.config.inGameMinutesPerRealSecond;
    if (this.inGameMinuteAccumulator <= 0) {
      return 0;
    }

    const expectedArrivals = Math.max(0, lambdaPerInGameMinute) * this.inGameMinuteAccumulator;
    const sampledArrivals = this.samplePoisson(expectedArrivals);
    const maxThisTick = Math.max(0, Math.ceil(this.config.maxArrivalsPerRealSecond * deltaSeconds));
    const arrivalsThisTick = Math.min(sampledArrivals, maxThisTick);

    let spawned = 0;
    for (let index = 0; index < arrivalsThisTick; index += 1) {
      const didSpawn = spawnCallback?.();
      if (didSpawn === false) {
        break;
      }
      spawned += 1;
    }

    this.inGameMinuteAccumulator = 0;
    return spawned;
  }

  samplePoisson(lambda) {
    if (lambda <= 0) {
      return 0;
    }

    if (lambda < this.config.poissonNormalApproxThreshold) {
      const limit = Math.exp(-lambda);
      let product = 1;
      let count = 0;
      do {
        count += 1;
        product *= Math.random();
      } while (product > limit);
      return Math.max(0, count - 1);
    }

    const normal = sampleStandardNormal();
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal));
  }
}
