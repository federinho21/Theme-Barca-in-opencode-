// Local V2 adaptation of https://github.com/anomalyco/oc-plugin-rainbow
// Same theme-aware diagonal bands; OpenTUI 0.6.8 uses packed RGBA8,
// not the Float32 color planes used by the original plugin.
import type { ResolvedTheme } from "@opencode/theme/tui";
import type { BufferAccess } from "@opentui/core";

export type Settings = {
  enabled: boolean;
  fg: boolean;
  bg: boolean;
  speed: number;
  turns: number;
  glow: number;
};

export const defaults: Settings = {
  enabled: true, fg: true, bg: true, speed: 0.008, turns: 3, glow: 0.05,
};

export function normalize(input: Record<string, unknown>): Settings {
  const num = (key: "speed" | "turns" | "glow", min: number, max: number) => {
    const n = input[key];
    return typeof n === "number" && Number.isFinite(n)
      ? Math.max(min, Math.min(max, n)) : defaults[key];
  };
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : defaults.enabled,
    fg: typeof input.fg === "boolean" ? input.fg : defaults.fg,
    bg: typeof input.bg === "boolean" ? input.bg : defaults.bg,
    speed: num("speed", 0, 0.03), turns: num("turns", 0.25, 8), glow: num("glow", 0, 0.15),
  };
}

type Color = { r: number; g: number; b: number };
type RGB = readonly [number, number, number];
const rgb = (c: Color): RGB => [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t,
];
const key = (a: RGB) => (a[0] << 16) | (a[1] << 8) | a[2];
const cellKey = (plane: Uint16Array, i: number) =>
  ((plane[i] & 255) << 16) | ((plane[i + 1] & 255) << 8) | (plane[i + 2] & 255);

function paint(plane: Uint16Array, i: number, color: RGB, amount: number) {
  for (let c = 0; c < 3; c++) {
    const before = plane[i + c] & 255;
    plane[i + c] = Math.round(before + (color[c] - before) * amount);
  }
  // Clear indexed/default color intent so the terminal actually uses our RGB.
  // Preserve opacity; character, attribute and hyperlink planes are untouched.
  plane[i + 3] &= 255;
}

export function createEffect(options: { palette?: "barca"; scope?: "accents" } = {}) {
  let time = 0;
  let signature = "";
  let palette: RGB[] = [];
  let texts = new Set<number>();
  let backgrounds = new Set<number>();
  const dx = Math.cos(25 * Math.PI / 180);
  const dy = Math.sin(25 * Math.PI / 180);

  return (cells: BufferAccess, delta: number, theme: ResolvedTheme, cfg: Settings) => {
    if (!cfg.enabled || (!cfg.fg && (!cfg.bg || cfg.glow === 0))) return;
    time = (time + Math.max(0, Number.isFinite(delta) ? delta : 0) * cfg.speed) % 100000;
    const dialog = theme.surface("dialog");
    const text = rgb(theme.text.base);
    const muted = rgb(theme.text.muted);
    const primary = rgb(theme.hue.interactive[400]);
    const accent = rgb(theme.hue.accent[400]);
    const secondary = options.palette === "barca" ? primary : rgb(theme.hue.purple[400]);
    // Accents-only avoids recoloring prose, code, errors and diff highlights.
    const textColors = options.scope === "accents"
      ? [primary, accent, rgb(theme.hue.blue[300]), rgb(theme.hue.red[300]), rgb(theme.border.base)]
      : [text, muted, rgb(dialog.text.base), rgb(dialog.text.muted)];
    const bgColors = [theme, dialog].flatMap(t => [
      rgb(t.background.base), rgb(t.background.raised.base),
      rgb(t.background.raised.high), rgb(t.background.raised.max),
    ]);
    const nextSignature = [...textColors, ...bgColors, primary, accent, secondary].flat().join(",");
    if (signature !== nextSignature) {
      signature = nextSignature;
      texts = new Set(textColors.map(key));
      backgrounds = new Set(bgColors.map(key));
      palette = options.palette === "barca"
        ? [primary, primary, mix(primary, accent, 0.5), accent, accent, mix(accent, primary, 0.5)]
        : [mix(text, primary, 0.4), primary, mix(primary, accent, 0.5),
          accent, mix(accent, secondary, 0.5), secondary, mix(secondary, muted, 0.35)];
    }
    const sample = (phase: number): RGB => {
      const pos = (phase - Math.floor(phase)) * palette.length;
      const index = Math.floor(pos);
      return mix(palette[index], palette[(index + 1) % palette.length], pos - index);
    };
    const span = Math.max(1, cells.width * dx + cells.height * dy);
    const blur = Math.max(0.5, cfg.turns * 0.55);
    for (let y = 0; y < cells.height; y++) {
      for (let x = 0; x < cells.width; x++) {
        const cell = y * cells.width + x;
        const i = cell * 4;
        const fgKey = cellKey(cells.fg, i);
        const position = (x * dx + y * dy) / span;
        if (cfg.fg && texts.has(fgKey)) {
          paint(cells.fg, i, sample(position * cfg.turns + time * 0.1), 1);
        }
        if (cfg.bg && cfg.glow > 0 && backgrounds.has(cellKey(cells.bg, i))) {
          const phase = position * blur + time * 0.04 + 0.17;
          const rise = Math.sin((phase - Math.floor(phase)) * Math.PI);
          const amount = cfg.glow * (0.35 + 0.65 * rise * rise);
          const color = sample(phase);
          paint(cells.bg, i, color, amount);
          if (cells.char[cell] === 0x2580 && backgrounds.has(fgKey)) paint(cells.fg, i, color, amount);
        }
      }
    }
  };
}
