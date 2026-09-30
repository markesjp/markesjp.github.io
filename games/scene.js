// Shared drawing primitives; no timers, DOM listeners or animation loops.
export function mix(left, right, amount) {
  const parse = color => {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const full = hex.length === 3 ? [...hex].map(value => value + value).join('') : hex;
      return [0, 2, 4].map(offset => parseInt(full.slice(offset, offset + 2), 16));
    }
    return (color.match(/[\d.]+/g) || ['16', '22', '32']).slice(0, 3).map(Number);
  };
  const a = parse(left), b = parse(right);
  return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * amount)).join(',')})`;
}

export function palette() {
  const style = getComputedStyle(document.documentElement);
  const token = (name, fallback) => style.getPropertyValue(`--arcade-${name}`).trim() || fallback;
  return {
    bg: token('canvas-bg', '#0e131c'), ink: token('canvas-ink', '#edf0f7'),
    muted: token('canvas-muted', '#aebbd0'), grid: token('canvas-grid', '#35455c'),
    player: token('player', '#c4d0f3'), enemy: token('enemy', '#a8bcd8'),
    projectile: token('projectile', '#e9f1ff'), obstacle: token('obstacle', '#d7ab87'),
    danger: token('danger', '#dd9a82'), star: token('star', '#aab7ce'),
    light: document.documentElement.dataset.theme === 'light',
  };
}

export function path(ctx, points, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath(); ctx.fill();
}

export function panel(ctx, colors, title, subtitle, x, y, width) {
  ctx.save();
  ctx.globalAlpha = .94; ctx.fillStyle = colors.bg;
  ctx.fillRect(x, y, width, 78);
  ctx.globalAlpha = 1; ctx.strokeStyle = mix(colors.bg, colors.ink, .2);
  ctx.strokeRect(x + .5, y + .5, width - 1, 77);
  ctx.fillStyle = colors.ink; ctx.textAlign = 'center';
  ctx.font = '500 22px system-ui, sans-serif'; ctx.fillText(title, x + width / 2, y + 31);
  ctx.fillStyle = colors.muted; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(subtitle, x + width / 2, y + 56);
  ctx.restore();
}
