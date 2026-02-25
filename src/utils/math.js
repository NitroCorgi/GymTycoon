export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeVector(x, y) {
  const magnitude = Math.hypot(x, y);
  if (magnitude === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: x / magnitude,
    y: y / magnitude
  };
}
