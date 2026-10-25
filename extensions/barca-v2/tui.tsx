/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui";
import { createEffect, createMemo, createSignal } from "solid-js";
import { NativeImage } from "@opentui/core";
import { creator, footballScene, footballFrameCount } from "./animation.ts";

export default Plugin.define({
  id: "local.barca-v2",
  async setup(context) {
    const sprites: NativeImage[] = [];
    try {
      for (let frame = 0; frame < footballFrameCount; frame++) {
        sprites.push(await NativeImage.load(new URL(`./assets/football/${footballScene(frame).file}`, import.meta.url), {
          owner: context.renderer.nativeScene.resourceContext,
        }));
      }
    } catch (error) {
      for (const sprite of sprites) sprite.dispose();
      throw error;
    }
    const [settings, update] = context.storage.store("decorations", {
      initial: { enabled: true, motion: true },
    });
    const [tick, setTick] = createSignal(0);
    const ball = createMemo(() => footballScene(tick()));
    const running = () => {
      const route = context.ui.router.current();
      return route.type === "session" && context.data.session.status(route.sessionID) === "running";
    };
    let timer: ReturnType<typeof setInterval> | undefined;
    const stopTimer = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    createEffect(() => {
      stopTimer();
      if (settings.enabled && settings.motion !== false && running()) {
        timer = setInterval(() => setTick(value => (value + 1) % footballFrameCount), 100);
      }
    });

    const removeHome = context.ui.slot({
      before: "home.footer",
      render: () => settings.enabled ? (
        <box flexDirection="row" justifyContent="center" paddingBottom={1} flexShrink={0}>
          <text>
            <span style={{ fg: context.theme.hue.blue[400] }}>▰▰ </span>
            <span style={{ fg: context.theme.hue.yellow[200] }}>Visca el Barça</span>
            <span style={{ fg: context.theme.hue.red[400] }}> ▰▰</span>
          </text>
        </box>
      ) : null,
    });

    const removeFooter = context.ui.slot({
      append: "prompt.footer.status",
      render: () => settings.enabled ? (
        <text fg={context.theme.text.muted} flexShrink={1} wrapMode="none">
          <span style={{ fg: context.theme.hue.blue[300] }}>FC</span>
          <span style={{ fg: context.theme.hue.red[300] }}>B</span>
          {running() ? "" : " · Més que un club"}
        </text>
      ) : null,
    });

    // Replace the host's working indicator, rather than adding a second one.
    // Unregister on idle/disabled to restore the host's normal footer hints.
    let removeBall = () => {};
    createEffect(() => {
      removeBall();
      removeBall = () => {};
      if (!settings.enabled || !running()) return;
      removeBall = context.ui.slot({
        replace: "prompt.footer.status",
        render: () => (
          <box flexDirection="row" alignItems="center" gap={1} flexShrink={0}>
            <image width={6} height={2} flexShrink={0}
              source={sprites[ball().index]} fit="fill" protocol="sixel" />
            <text fg={context.theme.text.muted} wrapMode="none">
              <span style={{ fg: context.theme.text.base }}>esc</span>{" interrumpir"}
            </text>
          </box>
        ),
      });
    });

    // Keep the signature compact; no more twelve-column moving track.
    const removeSignature = context.ui.slot({
      after: "prompt.footer",
      render: () => settings.enabled ? (
        <box flexDirection="row" justifyContent="space-between" paddingTop={0} flexShrink={0}>
          <box flexDirection="row" gap={1} flexShrink={0}>
            <text wrapMode="none">
              <span style={{ fg: context.theme.hue.blue[400] }}>▰▰</span>
              <span style={{ fg: context.theme.hue.red[400] }}>▰▰</span>
            </text>
          </box>
          <text fg={context.theme.text.faint} flexShrink={1} wrapMode="none">
            {creator}
          </text>
        </box>
      ) : null,
    });

    context.keymap.layer(() => ({
      mode: "global",
      commands: [{
        id: "local.barca-v2.toggle",
        title: "Barça: mostrar/ocultar detalles",
        group: "Barça",
        palette: true,
        slash: { name: "barca-toggle" },
        run: async () => {
          await update(draft => { draft.enabled = !draft.enabled; });
        },
      }, {
        id: "local.barca-v2.motion",
        title: "Barça: pausar/reanudar pelota",
        group: "Barça",
        palette: true,
        slash: { name: "barca-motion" },
        run: async () => {
          await update(draft => { draft.motion = draft.motion === false; });
        },
      }],
    }));

    return async () => {
      stopTimer();
      removeHome();
      removeFooter();
      removeBall();
      removeSignature();
      await context.renderer.idle();
      for (const sprite of sprites) sprite.dispose();
    };
  },
});
