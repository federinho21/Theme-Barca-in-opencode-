import type { Context } from "@opencode/plugin/tui/context";
import { createEffect, normalize, type Settings } from "./effect.ts";

const id = "local.rainbow-v2";

export function setup(context: Context) {
  const barca = context.options.palette === "barca";
  const [stored, update] = context.storage.store(barca ? "settings-barca" : "settings", {
    initial: normalize(context.options),
  });
  const settings = () => normalize(stored);
  const effect = createEffect({
    palette: barca ? "barca" : undefined,
    scope: context.options.scope === "accents" ? "accents" : undefined,
  });
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stopTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const schedule = () => {
    stopTimer();
    const cfg = settings();
    if (disposed || !cfg.enabled || cfg.speed === 0 || (!cfg.fg && (!cfg.bg || cfg.glow === 0))) return;
    // Match upstream's 12–24 fps budget without acquiring a continuous live loop.
    const phaseRate = cfg.speed * (cfg.fg ? 0.1 : 0.04);
    timer = setTimeout(() => {
      timer = undefined;
      if (disposed) return;
      context.renderer.requestRender();
      schedule();
    }, Math.max(1000 / 24, Math.min(1000 / 12, 0.05 / phaseRate)));
  };
  const postProcess: Parameters<typeof context.renderer.addPostProcessFn>[0] = (buffer, delta) => {
    const cfg = settings();
    if (!cfg.enabled) return;
    buffer.withBuffers(cells => effect(cells, delta, context.theme, cfg));
  };
  const save = async (values: Partial<Settings>) => {
    if (disposed) return;
    const cfg = normalize({ ...settings(), ...values });
    await update(draft => Object.assign(draft, cfg));
    if (disposed) return;
    schedule();
    context.renderer.requestRender();
  };
  const showSettings = async () => {
    while (!disposed) {
      const cfg = settings();
      const selected = await context.ui.dialog.select<keyof Settings | "reset">({
        title: "Rainbow settings",
        options: [
          { title: "Efecto arcoíris", value: "enabled", footer: cfg.enabled ? "ON" : "OFF" },
          { title: "Colores del texto", value: "fg", footer: cfg.fg ? "ON" : "OFF" },
          { title: "Colores del fondo", value: "bg", footer: cfg.bg ? "ON" : "OFF" },
          { title: "Velocidad", value: "speed", footer: String(cfg.speed), description: "0–0.03; 0 detiene la animación" },
          { title: "Número de bandas", value: "turns", footer: String(cfg.turns), description: "0.25–8" },
          { title: "Intensidad del fondo", value: "glow", footer: String(cfg.glow), description: "0–0.15" },
          { title: "Restablecer ajustes", value: "reset" },
        ],
      });
      if (disposed || selected === undefined) return;
      if (selected === "reset") { await save(normalize(context.options)); continue; }
      if (selected === "enabled" || selected === "fg" || selected === "bg") {
        await save({ [selected]: !cfg[selected] });
        continue;
      }
      const input = await context.ui.dialog.prompt({ title: selected, value: String(cfg[selected]) });
      if (disposed) return;
      if (input === undefined) continue;
      const n = Number(input.trim().replace(",", "."));
      const range = selected === "speed" ? [0, 0.03] : selected === "turns" ? [0.25, 8] : [0, 0.15];
      if (input.trim() === "" || !Number.isFinite(n) || n < range[0] || n > range[1]) {
        context.ui.toast.show({ message: `Introduce un número entre ${range[0]} y ${range[1]}.`, variant: "error" });
        continue;
      }
      await save({ [selected]: n });
    }
  };
  context.keymap.layer(() => ({
    mode: "global",
    commands: [
      { id: `${id}.settings`, title: "Rainbow settings", group: "Rainbow", palette: true,
        slash: { name: "rainbow-settings" }, run: showSettings },
      { id: `${id}.toggle`, title: "Rainbow: activar/desactivar", group: "Rainbow", palette: true,
        slash: { name: "rainbow-toggle" }, run: () => save({ enabled: !settings().enabled }) },
    ],
  }));
  context.renderer.addPostProcessFn(postProcess);
  context.renderer.requestRender();
  schedule();
  return () => {
    disposed = true;
    stopTimer();
    context.renderer.removePostProcessFn(postProcess);
    context.renderer.requestRender();
  };
}

// V2 definition shape (Plugin.define is an identity function).
export default { id, setup };
