export const DEFAULT_GYM_NAME = 'My Gym';
export const DEFAULT_GYM_MAIN_COLOR = '#6ea0ff';
export const MAX_GYM_NAME_LENGTH = 24;

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function sanitizeGymName(value) {
  if (typeof value !== 'string') return DEFAULT_GYM_NAME;
  const trimmed = value.trim().slice(0, MAX_GYM_NAME_LENGTH);
  return trimmed || DEFAULT_GYM_NAME;
}

export function sanitizeGymMainColor(value) {
  if (typeof value !== 'string') return DEFAULT_GYM_MAIN_COLOR;
  return HEX_COLOR_REGEX.test(value) ? value : DEFAULT_GYM_MAIN_COLOR;
}

export function normalizeGymProfile(setupConfig = {}) {
  return {
    gymName: sanitizeGymName(setupConfig.gymName),
    gymMainColor: sanitizeGymMainColor(setupConfig.gymMainColor)
  };
}
