import { WEEKDAY_NAMES } from './config.js';

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function formatTimeOfDay(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function getTimeBarUiState(dateTime) {
  const monthValue = String(dateTime.month).padStart(2, '0');
  const yearValue = String(dateTime.year).padStart(2, '0');
  return {
    dayProgressNormalized: Math.max(0, Math.min(1, dateTime.dayProgress ?? 0)),
    weekdayLabel: WEEKDAY_NAMES[dateTime.weekday] ?? 'Mon',
    dayInMonthLabel: `Day ${dateTime.dayInMonth}/7`,
    monthLabel: monthValue,
    yearLabel: yearValue,
    timeLabel: formatTimeOfDay(dateTime.hour, dateTime.minute),
    summaryLabel: `Day ${dateTime.dayInMonth}/7 • ${WEEKDAY_NAMES[dateTime.weekday] ?? 'Mon'}, ${monthValue} / ${yearValue}`
  };
}
