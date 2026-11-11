import test from "node:test";
import assert from "node:assert/strict";
import { Input } from "../src/input/Input.js";

class Surface {
  constructor(tagName = "DIV") {
    this.tagName = tagName;
    this.style = {};
    this.handlers = new Map();
    this.captured = new Set();
  }
  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
  }
  removeEventListener(type, handler) {
    this.handlers.get(type)?.delete(handler);
  }
  send(type, props = {}) {
    const event = { target: this, preventDefault() {}, ...props };
    for (const handler of this.handlers.get(type) || []) handler(event);
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 128, height: 128 };
  }
  setPointerCapture(id) {
    this.captured.add(id);
  }
  releasePointerCapture(id) {
    this.captured.delete(id);
  }
  hasPointerCapture(id) {
    return this.captured.has(id);
  }
}
function setup() {
  const previousWindow = globalThis.window,
    previousDocument = globalThis.document;
  const window = new Surface(),
    joystick = new Surface(),
    knob = new Surface(),
    jump = new Surface("BUTTON"),
    interact = new Surface("BUTTON");
  globalThis.window = window;
  globalThis.document = {
    querySelector: (selector) =>
      selector === "#jump" ? jump : selector === "#interact" ? interact : null,
  };
  const input = new Input(joystick, knob);
  return {
    window,
    joystick,
    knob,
    jump,
    interact,
    input,
    cleanup() {
      input.dispose();
      globalThis.window = previousWindow;
      globalThis.document = previousDocument;
    },
  };
}

test("keyboard movement normalizes diagonals and ignores editable fields", () => {
  const h = setup();
  try {
    h.window.send("keydown", { key: "w", code: "KeyW" });
    h.window.send("keydown", { key: "d", code: "KeyD" });
    h.input.update();
    assert.ok(h.input.direction.x > 0 && h.input.direction.y < 0);
    assert.ok(
      Math.abs(Math.hypot(h.input.direction.x, h.input.direction.y) - 1) <
        1e-10,
    );
    h.input.onBlur();
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"])
      h.window.send("keydown", { key: "w", code: "KeyW", target: { tagName } });
    h.input.update();
    assert.equal(h.input.direction.lengthSq(), 0);
  } finally {
    h.cleanup();
  }
});

test("jump is consumed once and repeated keyboard events do not queue it", () => {
  const h = setup();
  try {
    h.window.send("keydown", { key: " ", code: "Space", repeat: false });
    assert.equal(h.input.consumeJump(), true);
    assert.equal(h.input.consumeJump(), false);
    h.window.send("keydown", { key: " ", code: "Space", repeat: true });
    assert.equal(h.input.consumeJump(), false);
    h.jump.send("pointerdown", { pointerId: 2 });
    assert.equal(h.input.consumeJump(), true);
  } finally {
    h.cleanup();
  }
});

test("joystick retains its owner during multitouch and clears on cancellation", () => {
  const h = setup();
  try {
    h.joystick.send("pointerdown", { pointerId: 1, clientX: 108, clientY: 64 });
    h.joystick.send("pointerdown", { pointerId: 2, clientX: 20, clientY: 64 });
    h.joystick.send("pointermove", { pointerId: 2, clientX: 20, clientY: 64 });
    h.jump.send("pointerdown", { pointerId: 2 });
    h.input.update();
    assert.equal(h.input.pointerId, 1);
    assert.equal(h.input.direction.x, 1);
    assert.equal(h.input.consumeJump(), true);
    h.joystick.send("pointercancel", { pointerId: 1 });
    h.input.update();
    assert.equal(h.input.direction.lengthSq(), 0);
    assert.equal(h.input.pointerId, null);
    h.joystick.send("pointerdown", { pointerId: 3, clientX: 64, clientY: 20 });
    h.joystick.send("lostpointercapture", { pointerId: 3 });
    h.input.update();
    assert.equal(h.input.direction.lengthSq(), 0);
  } finally {
    h.cleanup();
  }
});

test("blur drops held keys, pointer ownership and pending jump", () => {
  const h = setup();
  try {
    h.window.send("keydown", { key: "w", code: "KeyW" });
    h.joystick.send("pointerdown", { pointerId: 1, clientX: 108, clientY: 64 });
    h.jump.send("pointerdown", { pointerId: 2 });
    h.window.send("blur");
    h.input.update();
    assert.equal(h.input.direction.lengthSq(), 0);
    assert.equal(h.input.pointerId, null);
    assert.equal(h.input.consumeJump(), false);
    assert.equal(h.knob.style.transform, "translate(0,0)");
  } finally {
    h.cleanup();
  }
});

test("dispose removes all registered input listeners", () => {
  const h = setup();
  try {
    h.input.dispose();
    for (const element of [h.window, h.joystick, h.jump, h.interact]) {
      assert.equal(
        [...element.handlers.values()].reduce((n, set) => n + set.size, 0),
        0,
      );
    }
  } finally {
    h.cleanup();
  }
});
