// The ball is now a real PNG sprite, never terminal block/pixel art.
export const footballFrameCount = 32;

export function footballVisible(enabled: boolean, status: string | undefined): boolean {
  return enabled && status === "running";
}

export function footballScene(tick: number) {
  const index = Math.abs(Math.floor(Number.isFinite(tick) ? tick : 0)) % footballFrameCount;
  const phase = index / footballFrameCount * Math.PI * 2;
  return {
    index,
    file: `ball-${String(index).padStart(2, "0")}.png`,
    x: 64 + 10 * Math.sin(phase),
    y: 48 - 2 * Math.cos(phase * 2),
  };
}

export const creator = "FK GUTI CREATED";
