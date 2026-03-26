const FONT_FAMILY = 'Nunito, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

export function drawText(context, text, x, y, options = {}) {
  const color = typeof options === 'string' ? options : (options.color ?? '#ffffff');
  const size = options.size ?? 16;
  const weight = options.weight ?? 400;
  const align = options.align ?? 'left';
  const baseline = options.baseline ?? 'alphabetic';

  context.save();
  context.fillStyle = color;
  context.font = `${weight} ${size}px ${FONT_FAMILY}`;
  context.textAlign = align;
  context.textBaseline = baseline;

  if (options.shadow) {
    context.shadowColor = 'rgba(0,0,0,0.6)';
    context.shadowBlur = 8;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
  }

  context.fillText(text, x, y);
  context.restore();
}
