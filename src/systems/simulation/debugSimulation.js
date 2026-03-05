import { ArrivalSpawner } from './ArrivalSpawner.js';
import { DemandModel } from './DemandModel.js';
import { OpeningHoursSchedule } from './OpeningHoursSchedule.js';
import { SIMULATION_DEFAULTS, WEEKDAY_NAMES } from './config.js';
import { TimeKeeper } from './TimeKeeper.js';
import { WeatherGenerator } from './WeatherGenerator.js';

const SAMPLE_HOURS = [6, 9, 12, 16, 18, 21];

export function runDebugWeekSimulation({
  year = SIMULATION_DEFAULTS.time.startYear,
  month = SIMULATION_DEFAULTS.time.startMonth,
  startWeekday = SIMULATION_DEFAULTS.time.startWeekday,
  weatherSeed = SIMULATION_DEFAULTS.weather.seed,
  gymReputationMultiplier = 1,
  priceMultiplier = 1,
  baseDemandPerMinute = SIMULATION_DEFAULTS.demand.baseDemandPerInGameMinute
} = {}) {
  const openingHours = new OpeningHoursSchedule();
  const weatherGenerator = new WeatherGenerator();
  const demandModel = new DemandModel();
  const arrivalSpawner = new ArrivalSpawner();

  const lines = [];
  lines.push('--- Debug Week Simulation ---');

  for (let dayInMonth = 1; dayInMonth <= 7; dayInMonth += 1) {
    const weekday = (startWeekday + dayInMonth - 1) % 7;
    const weather = weatherGenerator.generateWeatherForDay(year, month, dayInMonth, weatherSeed);
    const weatherMultiplier =
      SIMULATION_DEFAULTS.weather.demandMultiplierByType[weather.type] ?? 1;

    const hoursWindow = openingHours.getHoursForWeekday(weekday);
    const demandSamples = SAMPLE_HOURS.map((hour) => {
      const isOpen = hour >= hoursWindow.openHour && hour < hoursWindow.closeHour;
      const factor = demandModel.getDemandFactorAtHour(weekday, hour);
      const lambda = demandModel.computeExpectedArrivalsPerInGameMinute({
        isOpen,
        weekday,
        hour,
        month,
        weatherMultiplier,
        baseDemandPerMinute,
        gymReputationMultiplier,
        priceMultiplier
      });

      return `${hour}:00 factor=${factor.toFixed(2)} lambda=${lambda.toFixed(4)} ${isOpen ? 'OPEN' : 'CLOSED'}`;
    });

    const mockDelta = 1;
    const middayLambda = demandModel.computeExpectedArrivalsPerInGameMinute({
      isOpen: 12 >= hoursWindow.openHour && 12 < hoursWindow.closeHour,
      weekday,
      hour: 12,
      month,
      weatherMultiplier,
      baseDemandPerMinute,
      gymReputationMultiplier,
      priceMultiplier
    });
    const sampledMiddayArrivals = arrivalSpawner.update(mockDelta, middayLambda, () => true);

    lines.push(
      `Day ${dayInMonth} (${WEEKDAY_NAMES[weekday]}) | Weather=${weather.type} ${weather.temperatureC}°C | Open ${hoursWindow.openHour}:00-${hoursWindow.closeHour}:00`
    );
    lines.push(`  Samples: ${demandSamples.join(' | ')}`);
    lines.push(`  Midday Poisson sample over 1s real-time: ${sampledMiddayArrivals}`);
  }

  lines.push('--------------------------------');

  for (const line of lines) {
    console.warn(line);
  }

  return lines;
}

export function runSimulationSelfChecks() {
  const checks = [];

  const timeKeeper = new TimeKeeper();
  timeKeeper.Update(24);
  const dayAfter24Seconds = timeKeeper.GetCurrentDateTimeStruct();
  checks.push({
    name: 'Day advances every 24 seconds',
    pass: dayAfter24Seconds.dayInMonth === 2,
    value: `day=${dayAfter24Seconds.dayInMonth}`
  });

  const monthKeeper = new TimeKeeper();
  monthKeeper.Update(24 * 7);
  const afterOneMonth = monthKeeper.GetCurrentDateTimeStruct();
  checks.push({
    name: 'Month advances every 7 days',
    pass: afterOneMonth.month === 2 && afterOneMonth.dayInMonth === 1,
    value: `month=${afterOneMonth.month}, day=${afterOneMonth.dayInMonth}`
  });

  const openingHours = new OpeningHoursSchedule();
  const isOpenAtMonday7 = openingHours.IsOpen({ weekday: 0, timeOfDayHours: 7, hour: 7, minute: 0 });
  const isOpenAtSunday20 = openingHours.IsOpen({ weekday: 6, timeOfDayHours: 20, hour: 20, minute: 0 });
  checks.push({
    name: 'Opening hours open/close behavior',
    pass: isOpenAtMonday7 === true && isOpenAtSunday20 === false,
    value: `Mon07=${isOpenAtMonday7}, Sun20=${isOpenAtSunday20}`
  });

  const weatherGenerator = new WeatherGenerator();
  const weatherA = weatherGenerator.GenerateWeatherForDay(26, 1, 3, 555);
  const weatherB = weatherGenerator.GenerateWeatherForDay(26, 1, 3, 555);
  checks.push({
    name: 'Weather deterministic for same seed/day',
    pass: weatherA.type === weatherB.type && weatherA.temperatureC === weatherB.temperatureC,
    value: `${weatherA.type} ${weatherA.temperatureC}°C`
  });

  const demandModel = new DemandModel();
  const demandSamples = [6, 9, 12, 16, 18, 21].map((hour) => demandModel.GetDemandFactorAtHour(0, hour));
  const peakLooksReasonable = demandSamples[4] >= demandSamples[2] && demandSamples[0] >= demandSamples[2] * 0.8;
  checks.push({
    name: 'Demand curve shape sanity',
    pass: peakLooksReasonable,
    value: demandSamples.map((value) => value.toFixed(2)).join(', ')
  });

  for (const check of checks) {
    const state = check.pass ? 'PASS' : 'FAIL';
    console.warn(`${state} | ${check.name} | ${check.value}`);
  }

  return checks;
}
