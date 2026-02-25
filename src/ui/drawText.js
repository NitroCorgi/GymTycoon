export function drawText(context, text, x, y, color = '#ffffff') {
  context.fillStyle = color;
  context.font = '16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  context.fillText(text, x, y);
}
