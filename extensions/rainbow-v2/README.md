# Rainbow: local OpenCode V2 adaptation

Based on the behavior of https://github.com/anomalyco/oc-plugin-rainbow (0.1.1).
This is a local adaptation, not an official V2 release of that package.

Targets OpenCode 2.1.4 / OpenTUI 0.6.8 packed RGBA8 color planes.
Preserves theme-aware text bands and optional background tint, with persistent
settings using the V2 storage and dialog APIs. The optional upstream white-flash
logo splash is not included. No third-party dependencies are installed.

- `/rainbow-settings`: change enabled state, foreground/background, speed, bands and glow.
- `/rainbow-toggle`: enable/disable the effect.
- Settings are global per user and survive reloads.
- Your selected theme is not replaced.

Registered in `~/.config/opencode/cli.json` as `./extensions/rainbow-v2`.
Run `/reload` after initial installation if the commands do not appear.
To uninstall, remove only that package entry from the `plugins` array in `cli.json`.
The source directory may be kept; it is outside automatic plugin discovery.

Tests (Node 24+): `node --test rainbow.test.ts`.
