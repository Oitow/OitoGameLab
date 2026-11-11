export class Input {
  constructor(element, knob) {
    this.element = element;
    this.knob = knob;
    this.direction = {
      x: 0,
      y: 0,
      set(x, y) {
        this.x = x;
        this.y = y;
      },
      lengthSq() {
        return this.x * this.x + this.y * this.y;
      },
      normalize() {
        const n = Math.hypot(this.x, this.y);
        this.x /= n;
        this.y /= n;
      },
    };
    this.touch = {
      x: 0,
      y: 0,
      set(x, y) {
        this.x = x;
        this.y = y;
      },
      lengthSq() {
        return this.x * this.x + this.y * this.y;
      },
      normalize() {
        const n = Math.hypot(this.x, this.y);
        this.x /= n;
        this.y /= n;
      },
    };
    this.enabled = true;
    this.keys = new Set();
    this.pointerId = null;
    this.jumpQueued = false;
    this.interactQueued = false;
    this.interactButton = document.querySelector("#interact");
    this.onInteract = (e) => {
      e.preventDefault();
      if (this.enabled) this.interactQueued = true;
    };
    this.interactButton?.addEventListener("pointerdown", this.onInteract);
    this.jumpButton = document.querySelector("#jump");
    this.onJump = (e) => {
      e.preventDefault();
      if (this.enabled) this.jumpQueued = true;
    };
    this.jumpButton.addEventListener("pointerdown", this.onJump);
    this.onDown = (e) => {
      if (!this.enabled || this.pointerId !== null) return;
      this.pointerId = e.pointerId;
      this.element.setPointerCapture(e.pointerId);
      this.move(e);
    };
    this.onMove = (e) => {
      if (e.pointerId === this.pointerId) this.move(e);
    };
    this.onUp = (e) => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerId = null;
      this.touch.set(0, 0);
      this.knob.style.transform = "translate(0,0)";
    };
    this.onKeyDown = (e) => {
      if (!this.enabled || e.target.isContentEditable) return;
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.target.tagName === "BUTTON" && e.code === "Space") return;
      const k = e.key.toLowerCase();
      if ((k === " " || k === "spacebar") && !e.repeat) {
        this.jumpQueued = true;
        e.preventDefault();
      }
      if (k === "e" && !e.repeat) {
        this.interactQueued = true;
        e.preventDefault();
      }
      this.keys.add(k);
      if (k.startsWith("arrow")) e.preventDefault();
    };
    this.onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this.onBlur = () => {
      this.interactQueued = false;
      this.jumpQueued = false;
      this.direction.set(0, 0);
      const captured = this.pointerId;
      this.pointerId = null;
      if (captured !== null && this.element.hasPointerCapture?.(captured))
        this.element.releasePointerCapture(captured);
      this.keys.clear();
      this.touch.set(0, 0);
      this.pointerId = null;
      this.knob.style.transform = "translate(0,0)";
    };
    element.addEventListener("pointerdown", this.onDown);
    element.addEventListener("pointermove", this.onMove);
    element.addEventListener("pointerup", this.onUp);
    element.addEventListener("pointercancel", this.onUp);
    element.addEventListener("lostpointercapture", this.onUp);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }
  move(e) {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(x, y);
    const scale = Math.min(1, length / 44);
    this.touch.set(
      length ? (x / length) * scale : 0,
      length ? (-y / length) * scale : 0,
    );
    this.knob.style.transform = `translate(${this.touch.x * 42}px,${-this.touch.y * 42}px)`;
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    this.onBlur();
  }
  update() {
    if (!this.enabled) {
      this.direction.set(0, 0);
      return;
    }
    let x = this.touch.x,
      y = this.touch.y;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x--;
    if (this.keys.has("d") || this.keys.has("arrowright")) x++;
    if (this.keys.has("w") || this.keys.has("arrowup")) y++;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y--;
    this.direction.set(x, -y);
    if (this.direction.lengthSq() > 1) this.direction.normalize();
  }
  consumeJump() {
    const value = this.jumpQueued;
    this.jumpQueued = false;
    return value;
  }
  consumeInteract() {
    const value = this.interactQueued;
    this.interactQueued = false;
    return value;
  }
  dispose() {
    this.onBlur();
    this.interactButton?.removeEventListener("pointerdown", this.onInteract);
    this.jumpButton.removeEventListener("pointerdown", this.onJump);
    this.element.removeEventListener("pointerdown", this.onDown);
    this.element.removeEventListener("pointermove", this.onMove);
    this.element.removeEventListener("pointerup", this.onUp);
    this.element.removeEventListener("pointercancel", this.onUp);
    this.element.removeEventListener("lostpointercapture", this.onUp);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
  }
}
