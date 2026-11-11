/** Reusable bounded resources and named additive/multiplicative modifiers. */
export class Stats {
  constructor(base = {}) {
    if (Object.values(base).some((v) => !Number.isFinite(v) || v < 0)) throw new TypeError("Invalid base stats");
    this.base = Object.freeze({ ...base });
    this.modifiers = new Map();
    this.resources = new Map();
  }
  setModifier(id, stat, { add = 0, multiply = 1 } = {}) {
    if (!Object.hasOwn(this.base, stat) || !Number.isFinite(add) || !Number.isFinite(multiply) || multiply < 0) throw new TypeError("Invalid modifier");
    this.modifiers.set(id, { stat, add, multiply });
  }
  removeModifier(id) { this.modifiers.delete(id); }
  value(stat) {
    let add = 0, multiplier = 1;
    for (const m of this.modifiers.values()) if (m.stat === stat) { add += m.add; multiplier *= m.multiply; }
    return Math.max(0, ((this.base[stat] ?? 0) + add) * multiplier);
  }
  current(stat) { return Math.min(this.resources.get(stat) ?? this.value(stat), this.value(stat)); }
  change(stat, amount) {
    if (!Object.hasOwn(this.base, stat) || !Number.isFinite(amount)) throw new TypeError("Invalid resource");
    const value = Math.max(0, Math.min(this.value(stat), this.current(stat) + amount));
    this.resources.set(stat, value);
    return value;
  }
}
