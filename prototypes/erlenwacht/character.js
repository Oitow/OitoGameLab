// Articulated Windkap wayfarer. Local axes: +Z forward, +Y up, metres from the soles.
(() => {
  const { sin, cos, min, max, hypot, sqrt, PI, exp } = Math;
  const unit = value => min(1, max(0, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const palette = {
    coat: 0x277271, shade: 0x184b53, collar: 0x3a8780,
    cape: 0x9f4733, fold: 0xb75d3b, edge: 0xe1a45e,
    boots: 0x684634, sole: 0x352f30, leather: 0x82523a,
    trousers: 0x354b57, metal: 0x84999a, steel: 0xb0bfc0,
    hood: 0x365867, hoodLight: 0x496b78, skin: 0xcd997b,
  };

  function solveLeg(side, hip, phase, move, run) {
    const reach = mix(.27, .41, run) * move;
    const swing = sin(phase);
    const lift = max(0, cos(phase));
    const ankle = [side * (.119 + .026 * lift * move),
      .13 + lift * lift * move * mix(.12, .23, run), .025 + reach * swing];
    const dz = ankle[2] - hip[2], dy = ankle[1] - hip[1];
    const distance = max(.001, hypot(dz, dy));
    const bend = sqrt(max(0, .445 ** 2 - (distance * .5) ** 2));
    const knee = [(hip[0] + ankle[0]) * .5,
      (hip[1] + ankle[1]) * .5 + dz / distance * bend,
      (hip[2] + ankle[2]) * .5 - dy / distance * bend];
    return { hip, knee, ankle, pitch: move * (.24 * swing - .22 * lift) };
  }

  function pose({ time = 0, phase = 0, step = 0, sprint = false, cast = 0 } = {}) {
    const move = unit(step), run = unit(Number(sprint)), spell = unit(cast);
    const breath = sin(time * 2.05);
    const sway = cos(phase) * .029 * move;
    const hips = [sway, .922 + breath * .007 * (1 - move) -
      cos(phase * 2) * mix(.024, .039, run) * move, 0];
    const twist = sin(phase) * .17 * move - .19 * spell;
    const chest = (x, y, z) => [hips[0] + x * cos(twist) + z * sin(twist),
      hips[1] + y + breath * .006, -x * sin(twist) + z * cos(twist) + y * move * (.055 + .14 * run)];
    const limbs = [-1, 1].map((side, index) => {
      const offset = phase + index * PI;
      const hip = [hips[0] + side * .109, hips[1], -side * .037 * sin(phase) * move];
      const leg = solveLeg(side, hip, offset, move, run);
      const shoulder = chest(side * .227, .548, 0);
      const armAngle = -.08 - sin(offset) * (.50 + .27 * run) * move;
      const bend = .35 + move * (.24 + run * .48);
      const elbow = [shoulder[0] + side * .061, shoulder[1] - .275 * cos(armAngle),
        shoulder[2] + .275 * sin(armAngle)];
      const wrist = [elbow[0] - side * .021, elbow[1] - .239 * cos(armAngle + bend),
        elbow[2] + .239 * sin(armAngle + bend)];
      const targetElbow = chest(side * (.33 + (side > 0 ? .04 : 0)), .42, side > 0 ? .19 : .08);
      const targetWrist = chest(side * (side > 0 ? .23 : .34), side > 0 ? .57 : .38, side > 0 ? .43 : .27);
      for (let i = 0; i < 3; i++) {
        elbow[i] = mix(elbow[i], targetElbow[i], spell);
        wrist[i] = mix(wrist[i], targetWrist[i], spell);
      }
      return { side, leg, shoulder, elbow, wrist };
    });
    return { hips, chest, limbs, move, run, spell, time, phase };
  }

  const ringCache = new Map();
  function ringAngles(n) {
    if (!ringCache.has(n)) {
      ringCache.set(n, Array.from({ length: n }, (_, i) =>
        [cos((i + .5) * 2 * PI / n), sin((i + .5) * 2 * PI / n)]));
    }
    return ringCache.get(n);
  }

  function bridge(a, b, color) {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      tri(a[i], b[i], a[j], color);
      tri(a[j], b[i], b[j], color);
    }
  }

  // Horizontal shaped sections for head, tunic, belt and boots.
  function profile(origin, sections, n, colors) {
    const rings = ringAngles(n);
    let previous;
    for (let i = 0; i < sections.length; i++) {
      const [height, width, depth, shift = 0] = sections[i];
      const row = rings.map(([x, z]) => origin(x * width, height, shift + z * depth));
      if (previous) bridge(previous, row, colors[i - 1]);
      previous = row;
    }
    const [height, , , shift = 0] = sections[sections.length - 1];
    const top = origin(0, height, shift);
    for (let j = 0; j < n; j++) tri(previous[j], top, previous[(j + 1) % n], colors.at(-1));
  }

  // Limb cross-sections follow the bone axis, including when a hand casts horizontally.
  function bone(a, b, sections, colors) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const len = hypot(dx, dy, dz);
    if (len < .0001) return;
    const radial = hypot(dy, dz) || 1;
    const uy = dz / radial, uz = -dy / radial;
    const vx = radial / len, vy = -dx * dy / (radial * len), vz = -dx * dz / (radial * len);
    let previous;
    const directions = ringAngles(6);
    for (let i = 0; i < sections.length; i++) {
      const [t, radius] = sections[i];
      const ring = directions.map(([u, v]) => [a[0] + dx * t + radius * v * vx,
        a[1] + dy * t + radius * (u * uy + v * vy), a[2] + dz * t + radius * (u * uz + v * vz)]);
      if (previous) bridge(previous, ring, colors[i - 1]);
      previous = ring;
    }
  }

  function cape(p) {
    const rows = [];
    for (let row = 0; row < 3; row++) {
      const t = row * .5;
      const tail = t * t;
      const drift = (.017 * sin(p.time * 2.3) + .055 * sin(p.phase - .65) * p.move) * tail;
      const points = [];
      for (let col = 0; col < 5; col++) {
        const across = (col - 2) / 2;
        const h = mix(.55, -.32, t) + tail * (.06 * across + .04 * (col % 2));
        const z = -.16 - .078 * t - tail * p.move * (.10 + .12 * p.run) + .038 * (col % 2);
        points.push(p.chest(across * mix(.19, .256, t) + drift, h, z));
      }
      rows.push(points);
    }
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const a = rows[row][col], b = rows[row][col + 1];
        const c = rows[row + 1][col], d = rows[row + 1][col + 1];
        const color = col % 2 === 0 ? palette.cape : palette.fold;
        tri(a, b, c, color); tri(b, d, c, color);
      }
    }
    const mark = (x, y, z) => p.chest(x, y, z);
    const top = mark(0, .42, -.188), bottom = mark(0, .21, -.21);
    tri(top, mark(-.049, .32, -.202), bottom, palette.edge);
    tri(top, bottom, mark(.049, .32, -.202), palette.edge);
  }

  let previousTime = null, moveWeight = 0, runWeight = 0;
  function render(input) {
    const time = input.time ?? 0;
    const elapsed = previousTime === null ? .1 : min(.1, max(0, time - previousTime));
    previousTime = time;
    moveWeight = mix(moveWeight, unit(input.step || 0), 1 - exp(-elapsed * 13));
    runWeight = mix(runWeight, input.sprint && input.step ? 1 : 0, 1 - exp(-elapsed * 10));
    const p = pose({ ...input, step: moveWeight, sprint: runWeight });
    const c = palette;
    for (const arm of p.limbs) {
      const { hip, knee, ankle, pitch } = arm.leg;
      bone(hip, knee, [[0,.113],[.28,.115],[1,.075]], [c.trousers, c.trousers]);
      bone(knee, ankle, [[0,.078],[.16,.089],[.26,.087],[.65,.075],[1,.069]],
        [c.trousers, c.leather, c.boots, c.boots]);
      const boot = (x, y, z) => [ankle[0] + x, ankle[1] + y * cos(pitch) + z * sin(pitch),
        ankle[2] - y * sin(pitch) + z * cos(pitch)];
      profile(boot, [[-.10,.092,.143,.042],[-.069,.093,.149,.046],[.018,.076,.094,.016]],
        6, [c.sole, c.boots]);
      bone(arm.shoulder, arm.elbow, [[0,.103],[.18,.122],[.33,.121],[.48,.087],[1,.068]],
        [c.metal, c.metal, c.steel, c.coat]);
      bone(arm.elbow, arm.wrist, [[0,.074],[.23,.069],[.29,.081],[.78,.068],[1,.059]],
        [c.shade, c.edge, c.leather, c.boots]);
      const hand = [arm.wrist[0], arm.wrist[1] - .077 + .035 * p.spell, arm.wrist[2] + .035 + .03 * p.spell];
      bone(arm.wrist, hand, [[0,.059],[.68,.06],[1,.026]], [c.skin, c.skin]);
    }
    profile(p.chest, [[-.15,.219,.145],[-.09,.211,.143],[.086,.170,.126],[.136,.178,.132],
      [.405,.233,.145],[.545,.219,.13],[.605,.13,.1]], 8,
      [c.edge, c.shade, c.leather, c.coat, c.coat, c.collar]);
    profile(p.chest, [[.545,.147,.123],[.598,.154,.128],[.64,.113,.10]], 7, [c.cape, c.fold]);
    profile(p.chest, [[.614,.108,.11,.028],[.67,.139,.126,.029],[.797,.15,.14,.025]],
      8, [c.skin, c.skin]);
    profile(p.chest, [[.670,.149,.129,-.025],[.734,.157,.151,-.013],
      [.825,.156,.148],[.90,.105,.11,-.028],[.922,.032,.05,-.075]], 8,
      [c.hood, c.hood, c.hoodLight, c.hood]);
    cape(p);
  }
  globalThis.ErlenCharacter = Object.freeze({ pose, render });
})();
