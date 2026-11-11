/** Independent named random streams: adding one generator cannot reshuffle another. */
export class Generator {
  constructor(seed = 0, namespace = "root") {
    let hash = seed >>> 0;
    for (const letter of namespace) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
    this.seed = hash;
    this.state = hash;
  }
  next() {
    let value = this.state += 0x6d2b79f5;
    this.state >>>= 0;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  range(min, max) { return min + (max - min) * this.next(); }
  pick(values) { return values[Math.floor(this.next() * values.length)]; }
  fork(name) { return new Generator(this.seed, name); }
}
