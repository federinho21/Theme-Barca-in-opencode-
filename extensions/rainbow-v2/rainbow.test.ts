import assert from "node:assert/strict";
import { test } from "node:test";
import type { BufferAccess } from "@opentui/core";
import type { ResolvedTheme } from "@opencode/theme/tui";
import type { Context } from "@opencode/plugin/tui/context";
import { createEffect, defaults, normalize } from "./effect.ts";
import plugin, { setup } from "./tui.ts";

const color = (r: number, g: number, b: number) => ({ r: r / 255, g: g / 255, b: b / 255 });
const theme = {
  text: { base: color(220, 220, 220), muted: color(120, 120, 120) },
  background: { base: color(20, 20, 20), raised: {
    base: color(30, 30, 30), high: color(40, 40, 40), max: color(50, 50, 50),
  } },
  hue: { interactive: { 400: color(50, 150, 250) },
    accent: { 400: color(250, 80, 200) }, purple: { 400: color(150, 100, 250) } },
  surface() { return this; },
} as unknown as ResolvedTheme;

function cells(width = 3, height = 1): BufferAccess {
  const count = width * height;
  const fg = new Uint16Array(count * 4);
  const bg = new Uint16Array(count * 4);
  for (let i = 0; i < count * 4; i += 4) {
    fg.set([220, 220, 220, 255], i);
    bg.set([20, 20, 20, 255], i);
  }
  return { width, height, generation: 0n, char: new Uint32Array(count).fill(65),
    fg, bg, attributes: new Uint32Array(count).fill(12345) };
}

test("normalizes invalid values and clamps numeric limits", () => {
  assert.deepEqual(normalize({}), defaults);
  assert.deepEqual(normalize({ speed: NaN, turns: Infinity, glow: "0.1" }), defaults);
  assert.equal(normalize({ speed: 99 }).speed, 0.03);
  assert.equal(normalize({ turns: -1 }).turns, 0.25);
  assert.equal(normalize({ glow: -1 }).glow, 0);
});

test("animates neutral colors, leaving semantic colors, opacity and metadata planes intact", () => {
  const c = cells();
  c.fg.set([255, 0, 0, 200], 4); // semantic error color
  c.bg.set([100, 0, 0, 200], 4); // semantic error fill
  const chars = c.char.slice();
  const attrs = c.attributes.slice();
  createEffect()(c, 16, theme, defaults);
  assert.notDeepEqual([...c.fg.slice(0, 3)], [220, 220, 220]);
  assert.notDeepEqual([...c.bg.slice(0, 3)], [20, 20, 20]);
  assert.deepEqual([...c.fg.slice(4, 8)], [255, 0, 0, 200]);
  assert.deepEqual([...c.bg.slice(4, 8)], [100, 0, 0, 200]);
  assert.equal(c.fg[3], 255);
  assert.deepEqual(c.char, chars);
  assert.deepEqual(c.attributes, attrs);
});

test("clears packed indexed/default intent only on repainted colors", () => {
  const c = cells(1);
  c.fg.set([220 | 0x0700, 220 | 0x0100, 220, 200]);
  createEffect()(c, 16, theme, { ...defaults, bg: false });
  assert.ok(c.fg.every(n => n <= 255));
  assert.equal(c.fg[3], 200);
});

test("disabled effect is a no-op; individual planes can be disabled", () => {
  const c = cells();
  const fg = c.fg.slice(), bg = c.bg.slice();
  createEffect()(c, 16, theme, { ...defaults, enabled: false });
  assert.deepEqual(c.fg, fg);
  assert.deepEqual(c.bg, bg);
  createEffect()(c, 16, theme, { ...defaults, fg: false });
  assert.deepEqual(c.fg, fg);
  assert.notDeepEqual(c.bg, bg);
  const other = cells();
  createEffect()(other, 16, theme, { ...defaults, bg: false });
  assert.deepEqual(other.bg, bg);
  assert.notDeepEqual(other.fg, fg);
});

test("zero speed is static, motion changes frames, resize is supported", () => {
  const apply = createEffect();
  const a = cells(), b = cells();
  apply(a, 16, theme, { ...defaults, speed: 0 });
  apply(b, 300, theme, { ...defaults, speed: 0 });
  assert.deepEqual(a.fg, b.fg);
  const moving = cells();
  apply(moving, 100, theme, defaults);
  assert.notDeepEqual(moving.fg, a.fg);
  assert.doesNotThrow(() => apply(cells(10, 5), 16, theme, defaults));
});

test("matches neutral block foregrounds to the tinted background", () => {
  const c = cells(1);
  c.char[0] = 0x2580;
  c.fg.set(c.bg);
  createEffect()(c, 16, theme, defaults);
  assert.deepEqual(c.fg, c.bg);
});

test("Barca accents use only blue/grana and leave prose and transparent backgrounds untouched", () => {
  const skin = {
    ...theme,
    border: { base: color(88, 115, 154) },
    hue: { ...theme.hue,
      blue: { 300: color(128, 175, 244) }, red: { 300: color(227, 103, 148) },
    },
  } as unknown as ResolvedTheme;
  const c = cells(3);
  c.fg.set([50, 150, 250, 255], 4);
  c.fg.set([255, 0, 0, 255], 8);
  c.bg.fill(0);
  const before = c.bg.slice();
  const apply = createEffect({ palette: "barca", scope: "accents" });
  const cfg = { ...defaults, bg: false, speed: 0.004 };
  apply(c, 200, skin, cfg);
  assert.deepEqual([...c.fg.slice(0, 4)], [220, 220, 220, 255]);
  assert.deepEqual([...c.fg.slice(8, 12)], [255, 0, 0, 255]);
  assert.deepEqual(c.bg, before);
  assert.ok(c.fg[4] >= 50 && c.fg[4] <= 250);
  assert.ok(c.fg[5] >= 80 && c.fg[5] <= 150);
  assert.ok(c.fg[6] >= 200 && c.fg[6] <= 250);
  const later = cells(3);
  later.fg.set([50, 150, 250, 255], 4);
  apply(later, 800, skin, cfg);
  assert.notDeepEqual([...later.fg.slice(4, 7)], [...c.fg.slice(4, 7)]);
});

function harness(options: Record<string, unknown> = {}) {
  const state = normalize(options);
  const callbacks = new Set<Function>();
  const commands: Record<string, any> = {};
  const selections: (string | undefined)[] = [];
  const prompts: (string | undefined)[] = [];
  const errors: string[] = [];
  let renders = 0;
  const context = {
    options, theme,
    storage: { store: () => [state, async (fn: Function) => { fn(state); }] },
    renderer: {
      addPostProcessFn: (fn: Function) => callbacks.add(fn),
      removePostProcessFn: (fn: Function) => callbacks.delete(fn),
      requestRender: () => { renders++; },
    },
    keymap: { layer: (fn: Function) => {
      for (const command of fn().commands) commands[command.id] = command;
    } },
    ui: {
      dialog: { select: async () => selections.shift(), prompt: async () => prompts.shift() },
      toast: { show: (t: { message: string }) => errors.push(t.message) },
    },
  } as unknown as Context;
  return { context, state, callbacks, commands, selections, prompts, errors, renders: () => renders };
}

test("V2 entrypoint registers commands, schedules frames, toggles and cleans up", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  assert.equal(plugin.id, "local.rainbow-v2");
  const dispose = setup(h.context);
  assert.equal(h.callbacks.size, 1);
  assert.equal(h.commands[`${plugin.id}.settings`].slash.name, "rainbow-settings");
  const first = h.renders();
  t.mock.timers.tick(100);
  assert.ok(h.renders() > first);
  const c = cells();
  const callback = [...h.callbacks][0];
  callback({ withBuffers: (fn: Function) => fn(c) }, 16);
  assert.notEqual(c.fg[0], 220);
  await h.commands[`${plugin.id}.toggle`].run();
  assert.equal(h.state.enabled, false);
  const paused = h.renders();
  t.mock.timers.tick(1000);
  assert.equal(h.renders(), paused);
  await h.commands[`${plugin.id}.toggle`].run();
  assert.equal(h.state.enabled, true);
  dispose();
  assert.equal(h.callbacks.size, 0);
  const stopped = h.renders();
  t.mock.timers.tick(1000);
  assert.equal(h.renders(), stopped);
});

test("settings persist edits, accept decimal comma, validate ranges and reset", async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  const dispose = setup(h.context);
  try {
    h.selections.push("speed", "turns", "fg", undefined);
    h.prompts.push("0,012", "99");
    await h.commands[`${plugin.id}.settings`].run();
    assert.equal(h.state.speed, 0.012);
    assert.equal(h.state.turns, 3);
    assert.equal(h.state.fg, false);
    assert.equal(h.errors.length, 1);
    h.selections.push("reset", undefined);
    await h.commands[`${plugin.id}.settings`].run();
    assert.deepEqual(h.state, defaults);
  } finally { dispose(); }
});

test("disabled or static options do not schedule animation timers", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  for (const options of [{ enabled: false }, { speed: 0 }, { fg: false, bg: false }]) {
    const h = harness(options);
    const dispose = setup(h.context);
    const initial = h.renders();
    t.mock.timers.tick(1000);
    assert.equal(h.renders(), initial);
    dispose();
  }
});
