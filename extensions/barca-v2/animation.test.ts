import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { creator, footballFrameCount, footballScene, footballVisible } from "./animation.ts";

test("animation has 32 real PNG frames, with no terminal block art", () => {
  assert.equal(footballFrameCount, 32);
  for (let n = 0; n < footballFrameCount; n++) {
    const path = new URL(`./assets/football/${footballScene(n).file}`, import.meta.url);
    assert.ok(existsSync(path));
    const png = readFileSync(path);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), 128);
    assert.equal(png.readUInt32BE(20), 96);
  }
});

test("football is visible only while working and enabled", () => {
  assert.equal(footballVisible(true, "running"), true);
  assert.equal(footballVisible(true, "idle"), false);
  assert.equal(footballVisible(true, undefined), false);
  assert.equal(footballVisible(false, "running"), false);
});

test("animation loops and invalid frame inputs are safe", () => {
  assert.deepEqual(footballScene(32), footballScene(0));
  assert.deepEqual(footballScene(NaN), footballScene(0));
  assert.deepEqual(footballScene(Infinity), footballScene(0));
});

test("motion is gentle and frame filenames stay in bounds", () => {
  for (let n = 0; n < 64; n++) {
    const a = footballScene(n), b = footballScene(n + 1);
    assert.ok(Math.abs(a.x - b.x) < 2);
    assert.ok(Math.abs(a.y - b.y) < 0.8);
    assert.ok(a.x >= 54 && a.x <= 74);
    assert.ok(a.y >= 46 && a.y <= 50);
    assert.match(a.file, /^ball-(0\d|[12]\d|3[01])\.png$/);
  }
});

test("creator watermark retains the requested wording", () => {
  assert.equal(creator, "FK GUTI CREATED");
});
