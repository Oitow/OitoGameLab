// Model space is Y-up, with one ground-level pivot per asset. All dimensions
// below are fractions of mature height. The final mesh is scaled to metres.
const GROVE = "Ancient grove",
  EMBER = "Emberwood",
  FROST = "Frost hollow";
const allBiomes = [GROVE, EMBER, FROST];
const leaf = ["#243e31", "#35583b", "#63834a", "#93a761"];
const copper = ["#61382d", "#91472e", "#bb6338", "#ddb462"];
const rime = ["#344b50", "#466968", "#739587", "#b9c6a2"];
const forestBark = ["#382f2a", "#514232", "#71583d"];
const emberBark = ["#352b2e", "#583631", "#99533b"];
const frostBark = ["#39424b", "#5a6666", "#878e83"];

function asset(
  id,
  name,
  layer,
  biomes,
  height,
  form,
  foliage,
  bark = forestBark,
) {
  return { id, name, layer, biomes, height, form, foliage, bark };
}

export const CATALOG = [
  asset("elder-oak", "Cathedral oak", "giant", [GROVE], 108, "oak", leaf),
  asset(
    "cinder-spire",
    "Ember spire",
    "giant",
    [EMBER],
    132,
    "redwood",
    copper,
    emberBark,
  ),
  asset(
    "frost-crown",
    "Rime high cedar",
    "giant",
    [FROST],
    94,
    "cedar",
    rime,
    frostBark,
  ),
  asset("lantern-willow", "Lantern willow", "tree", [GROVE], 19, "willow", [
    "#395343",
    "#54794c",
    "#81a761",
    "#c0c87b",
  ]),
  asset("spear-pine", "Spear pine", "tree", [GROVE, FROST], 28, "pine", [
    "#284b40",
    "#3c6450",
    "#54765a",
    "#8aa06d",
  ]),
  asset("copper-birch", "Copper birch", "tree", [EMBER], 21, "birch", copper, [
    "#706653",
    "#aea28a",
    "#dfd3aa",
  ]),
  asset(
    "ghost-aspen",
    "Ghost aspen",
    "tree",
    [FROST],
    18,
    "birch",
    ["#456969", "#72998c", "#a2b692", "#d2d7ab"],
    frostBark,
  ),
  asset(
    "charred-snag",
    "Lightning snag",
    "tree",
    [EMBER, GROVE],
    17,
    "snag",
    copper,
    emberBark,
  ),
  asset(
    "wineberry",
    "Wineberry thicket",
    "shrub",
    [GROVE, EMBER],
    1.9,
    "berry",
    leaf,
  ),
  asset(
    "ember-sumac",
    "Flame sumac",
    "shrub",
    [EMBER],
    2.7,
    "sumac",
    copper,
    emberBark,
  ),
  asset(
    "frost-heather",
    "Frost heather",
    "shrub",
    [FROST],
    1.1,
    "heather",
    ["#485856", "#88829b", "#bba1bf", "#dfcbd5"],
    frostBark,
  ),
  asset("sword-fern", "Sword fern", "ground", [GROVE], 1.35, "fern", leaf),
  asset(
    "moon-caps",
    "Mooncap colony",
    "ground",
    [GROVE, FROST],
    0.68,
    "mushroom",
    ["#425957", "#5a8d88", "#9bd0c1", "#d8e4be"],
  ),
  asset(
    "fire-caps",
    "Cinder waxcaps",
    "ground",
    [EMBER],
    0.52,
    "mushroom",
    copper,
  ),
  asset("reed-tuft", "Silver tussock", "ground", allBiomes, 1.05, "grass", [
    "#615e38",
    "#81824a",
    "#aaa263",
    "#cbc59a",
  ]),
  asset(
    "fallen-leaves",
    "Fallen leaf drift",
    "ground",
    [GROVE, EMBER],
    0.16,
    "litter",
    copper,
  ),
  asset("rime-blossom", "Rime starflowers", "ground", [FROST], 0.54, "flower", [
    "#57745a",
    "#85a37c",
    "#b9c6c8",
    "#e1d7da",
  ]),
  asset("antler-warden", "Antler warden", "boss", [GROVE], 28, "warden", leaf),
  asset(
    "basalt-colossus",
    "Basalt colossus",
    "boss",
    [EMBER],
    33,
    "colossus",
    copper,
    emberBark,
  ),
  asset("rime-stag", "Rime stag", "boss", [FROST], 24, "stag", rime, frostBark),
];

const TURN = Math.PI * 2,
  GOLDEN = 2.39996323;
const radial = (angle, radius, y, x = 0, z = 0) => [
  x + Math.cos(angle) * radius,
  y,
  z + Math.sin(angle) * radius,
];
const add = (a, x, y, z) => [a[0] + x, a[1] + y, a[2] + z];
const ringDetail = [8, 6, 4];

function makeBuilder(T, entry, lod) {
  const positions = [],
    colors = [],
    indices = [],
    palette = new Map();
  const sides = ringDetail[lod];
  function vertex(p, paint, shade = 1) {
    if (!palette.has(paint)) palette.set(paint, new T.Color(paint));
    const c = palette.get(paint);
    colors.push(c.r * shade, c.g * shade, c.b * shade);
    positions.push(...p);
    return positions.length / 3 - 1;
  }
  function join(a, b) {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      indices.push(a[i], b[i], a[j], a[j], b[i], b[j]);
    }
  }
  // Rings are perpendicular to each limb, including near-horizontal roots.
  function limb(points, radii, paint, segments = sides) {
    let previous;
    const forward = new T.Vector3(),
      u = new T.Vector3(),
      v = new T.Vector3();
    const overall = points.at(-1).map((value, i) => value - points[0][i]);
    const ref =
      Math.abs(overall[0]) > Math.abs(overall[2])
        ? new T.Vector3(0, 0, 1)
        : new T.Vector3(1, 0, 0);
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)],
        b = points[Math.min(points.length - 1, i + 1)];
      forward.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      u.crossVectors(ref, forward).normalize();
      v.crossVectors(u, forward);
      const ring = [];
      for (let j = 0; j < segments; j++) {
        const angle = (j / segments) * TURN + 0.23;
        const r = radii[i] * (j % 2 ? 0.91 : 1.08);
        const x = Math.cos(angle) * r,
          y = Math.sin(angle) * r;
        ring.push(
          vertex(
            add(
              points[i],
              u.x * x + v.x * y,
              u.y * x + v.y * y,
              u.z * x + v.z * y,
            ),
            paint[j % paint.length],
            0.84 + (0.16 * i) / (points.length - 1),
          ),
        );
      }
      if (previous) join(previous, ring);
      if (i === points.length - 1) {
        for (let j = 1; j < segments - 1; j++)
          indices.push(ring[0], ring[j + 1], ring[j]);
      }
      previous = ring;
    }
  }
  // An uneven perimeter and offset ridge create readable overlapping masses.
  function mass(center, width, height, depth, paint, phase = 0, n = sides) {
    const bottom = vertex(add(center, 0, -height * 0.78, 0), paint[0]);
    const top = vertex(
      add(center, width * 0.13, height, -depth * 0.09),
      paint.at(-1),
    );
    const middle = [],
      upper = [];
    for (let j = 0; j < n; j++) {
      const angle = (j / n) * TURN + phase,
        r = 0.9 + 0.1 * Math.cos(angle * 3 + phase);
      const x = Math.cos(angle) * width * r,
        z = Math.sin(angle) * depth * r;
      middle.push(
        vertex(
          add(center, x, -height * (0.12 + 0.15 * Math.sin(angle * 3)), z),
          paint[1],
        ),
      );
      if (lod === 0)
        upper.push(
          vertex(
            add(
              center,
              x * 0.72,
              height * (0.42 + 0.18 * Math.cos(angle * 2)),
              z * 0.72,
            ),
            paint[2 + (j % (paint.length - 2))],
          ),
        );
    }
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n,
        crown = upper.length ? upper : middle;
      indices.push(bottom, middle[j], middle[k], crown[j], top, crown[k]);
    }
    if (upper.length) join(middle, upper);
  }
  // Centre folds give even small blades highlights under a moving sun.
  function blade(base, tip, width, paint) {
    const dx = tip[0] - base[0],
      dz = tip[2] - base[2],
      len = Math.hypot(dx, dz) || 1;
    const middle = [
      (base[0] + tip[0]) / 2,
      (base[1] + tip[1]) / 2,
      (base[2] + tip[2]) / 2,
    ];
    const sx = (-dz / len) * width,
      sz = (dx / len) * width;
    const a = vertex(base, paint[0]),
      b = vertex(add(middle, sx, 0, sz), paint[1]);
    const c = vertex(tip, paint.at(-1)),
      d = vertex(add(middle, -sx, 0, -sz), paint[1]);
    const ridge = vertex(add(middle, 0, width * 0.38, 0), paint[2]);
    indices.push(a, b, ridge, b, c, ridge, c, d, ridge, d, a, ridge);
  }
  function finish() {
    let min = Infinity,
      max = -Infinity;
    for (let i = 1; i < positions.length; i += 3) {
      min = Math.min(min, positions[i]);
      max = Math.max(max, positions[i]);
    }
    const scale = entry.height / (max - min);
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] *= scale;
      positions[i + 1] = (positions[i + 1] - min) * scale;
      positions[i + 2] *= scale;
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const material = new T.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
      side: T.DoubleSide,
    });
    return { geometry, material };
  }
  return { lod, limb, mass, blade, finish };
}

function trees(b, e) {
  const { lod, limb, mass, blade } = b;
  const giant = e.layer === "giant",
    conifer = ["redwood", "pine", "cedar"].includes(e.form);
  const dead = e.form === "snag",
    birch = e.form === "birch",
    willow = e.form === "willow";
  const width = giant ? 0.072 : birch ? 0.022 : 0.038;
  const bark = e.bark,
    foliage = e.foliage;
  const top = [0.022, conifer ? 1 : 0.86, -0.019];
  limb(
    [
      [0, 0, 0],
      [-0.016, 0.1, 0.008],
      [0.012, 0.38, 0.016],
      [-0.013, 0.65, 0.013],
      top,
    ],
    [width * 1.6, width, width * 0.67, width * 0.42, width * 0.1],
    bark,
    giant ? [12, 8, 5][lod] : [7, 5, 4][lod],
  );
  if (giant && lod < 2) {
    for (let i = 0; i < (lod === 0 ? 8 : 5); i++) {
      const a = i * GOLDEN,
        foot = radial(a, 0.17 + (i % 3) * 0.023, 0.007);
      limb(
        [[0, 0.17 + (i % 2) * 0.032, 0], radial(a, 0.075, 0.043), foot],
        [width * 0.62, width * 0.58, width * 0.045],
        bark,
        4,
      );
    }
  }
  if (conifer) {
    const tiers = e.form === "redwood" ? 6 : 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1),
        y = 0.34 + 0.59 * t;
      const radius = (e.form === "cedar" ? 0.29 : 0.23) * (1 - 0.78 * t);
      const a = i * GOLDEN,
        cx = Math.cos(a) * 0.022,
        cz = Math.sin(a) * 0.022;
      if (lod === 0 && i < tiers - 1) {
        for (let j = 0; j < 5; j++) {
          const tip = radial(
            a + (j * TURN) / 5,
            radius * 0.86,
            y - 0.028,
            cx,
            cz,
          );
          limb(
            [[cx, y + 0.062, cz], tip],
            [width * (0.32 - 0.12 * t), 0.003],
            bark,
            3,
          );
          mass(
            tip,
            radius * 0.51,
            0.066 * (1 - 0.45 * t),
            radius * 0.48,
            foliage,
            a + j,
            5,
          );
        }
      }
      mass(
        [cx, y + 0.045, cz],
        radius,
        0.13 * (1 - 0.4 * t),
        radius * 0.94,
        foliage,
        a,
        [9, 7, 4][lod],
      );
    }
    return;
  }
  const branches = dead ? 5 : birch ? 7 : giant ? 10 : 8;
  for (let i = 0; i < branches; i++) {
    const t = i / (branches - 1),
      angle = i * GOLDEN + 0.36;
    const spread =
      (birch ? 0.2 : dead ? 0.19 : 0.38) *
      (0.9 - 0.42 * t) *
      (0.9 + 0.12 * Math.sin(5 * i));
    const base = [0.008, 0.35 + t * 0.4, 0.01];
    const elbow = radial(
      angle - 0.13,
      spread * 0.48,
      base[1] + (willow ? 0.105 : 0.06),
    );
    const tip = radial(angle, spread, base[1] + 0.17 + (i % 3) * 0.025);
    if (lod < 2 || i % 2 === 0)
      limb(
        [base, elbow, tip],
        [width * (0.59 - 0.26 * t), width * 0.28, width * 0.075],
        bark,
        [6, 4, 3][lod],
      );
    if (dead) {
      if (lod < 2)
        limb(
          [elbow, add(elbow, 0.019, 0.092, -0.032)],
          [0.013, 0.002],
          bark,
          4,
        );
      continue;
    }
    if (lod === 2 && i % 2 === 1) continue;
    const size = birch ? 0.105 : 0.155;
    mass(tip, size * (1 - 0.12 * t), size * 0.62, size * 0.85, foliage, angle);
    if (lod === 0) {
      const fork = radial(angle + 0.61, spread * 0.95, tip[1] + 0.059);
      limb([elbow, fork], [width * 0.21, width * 0.035], bark, 4);
      mass(fork, size * 0.81, size * 0.48, size * 0.66, foliage, angle + 1);
      for (let j = 0; j < (willow ? 7 : 4); j++) {
        const a = angle + j * GOLDEN,
          anchor = radial(a, size * 0.77, tip[1], tip[0], tip[2]);
        const end = radial(
          a,
          size * (willow ? 0.9 : 1.24),
          tip[1] - size * (willow ? 1.45 : 0.35),
          tip[0],
          tip[2],
        );
        blade(anchor, end, size * (willow ? 0.11 : 0.18), foliage);
      }
    }
  }
  if (!dead)
    mass(
      top,
      birch ? 0.11 : 0.16,
      birch ? 0.13 : 0.11,
      birch ? 0.1 : 0.15,
      foliage,
      1,
    );
}

function undergrowth(b, e) {
  const { lod, limb, mass, blade } = b,
    p = e.foliage;
  const count = [8, 5, 3][lod];
  if (e.form === "mushroom") {
    for (let i = 0; i < Math.max(2, count - 2); i++) {
      const a = i * GOLDEN,
        h = 1 - i * 0.083;
      const stem = radial(a, i === 0 ? 0 : 0.48 + (i % 2) * 0.29, 0);
      const cap = add(stem, 0.1 * h, 0.67 * h, 0.06 * h);
      limb(
        [stem, cap],
        [0.095 * h, 0.071 * h],
        ["#a8a993", "#c5c3a9"],
        lod === 0 ? 5 : 3,
      );
      mass(cap, 0.47 * h, 0.25 * h, 0.42 * h, p, a, lod === 0 ? 8 : 5);
      if (lod === 0) {
        for (let j = 0; j < 3; j++) {
          const dot = radial(
            j * GOLDEN,
            0.2 * h,
            cap[1] + 0.16 * h,
            cap[0],
            cap[2],
          );
          mass(
            dot,
            0.043 * h,
            0.022 * h,
            0.041 * h,
            ["#b6b49c", "#c6c4ae", "#e2ddbd", "#eee7ca"],
            j,
            4,
          );
        }
      }
    }
    return;
  }
  if (e.form === "litter") {
    // Low leaf drifts are deliberately much wider than their catalog height.
    for (let i = 0; i < count * 2; i++) {
      const a = i * GOLDEN,
        base = radial(a, 0.75 * Math.sqrt(i), 0.012 + (i % 3) * 0.018);
      const end = radial(
        a + 0.6,
        0.94 + (i % 3) * 0.15,
        base[1] + 0.12,
        base[0],
        base[2],
      );
      blade(base, end, 0.37, p);
    }
    return;
  }
  if (e.form === "grass" || e.form === "fern" || e.form === "flower") {
    for (let i = 0; i < count; i++) {
      const a = i * GOLDEN,
        x = Math.cos(a),
        z = Math.sin(a);
      const reach = (e.form === "fern" ? 0.85 : 0.44) * (0.65 + (i % 4) * 0.12);
      const tip = radial(a, reach, 0.6 + (i % 3) * 0.15);
      blade(radial(a, 0.06, 0), tip, e.form === "fern" ? 0.04 : 0.045, p);
      if (e.form === "fern") {
        const pairs = [7, 4, 2][lod];
        for (let j = 1; j <= pairs; j++) {
          const t = j / (pairs + 1),
            sideSize = Math.sin(t * Math.PI) * 0.23;
          const base = [tip[0] * t, tip[1] * t, tip[2] * t];
          for (const side of [-1, 1]) {
            blade(
              base,
              add(
                base,
                x * 0.13 - z * side * sideSize,
                0.12,
                z * 0.13 + x * side * sideSize,
              ),
              0.048,
              p,
            );
          }
        }
      } else if (e.form === "flower") {
        for (let j = 0; j < 5; j++) {
          const end = radial(
            a + (j * TURN) / 5,
            0.14,
            tip[1] + 0.04,
            tip[0],
            tip[2],
          );
          blade(tip, end, 0.046, [p[2], p[3], p[3]]);
        }
      } else if (lod === 0) {
        const head = add(tip, x * 0.09, 0.2, z * 0.09);
        blade(tip, head, 0.035, ["#87744e", "#bba87a", "#e3d6aa"]);
      }
    }
    return;
  }
  for (let i = 0; i < count; i++) {
    const a = i * GOLDEN,
      h = 0.43 + (i % 4) * 0.098;
    const base = radial(a, 0.07, 0),
      elbow = radial(a, 0.22, h * 0.58),
      tip = radial(a, 0.38 + (i % 2) * 0.11, h);
    limb([base, elbow, tip], [0.034, 0.021, 0.007], e.bark, 3);
    if (e.form === "sumac") {
      for (let j = 0; j < (lod === 0 ? 6 : 3); j++) {
        const origin = add(tip, 0, 0.03 * j, 0);
        blade(
          origin,
          radial(a + j * GOLDEN, 0.28, origin[1] + 0.13, origin[0], origin[2]),
          0.066,
          p,
        );
      }
    } else {
      mass(
        tip,
        0.25,
        e.form === "heather" ? 0.27 : 0.16,
        0.22,
        p,
        a,
        lod === 0 ? 7 : 4,
      );
      if (lod === 0 && e.form === "berry") {
        for (let j = 0; j < 3; j++) {
          const fruit = radial(
            a + j * 1.4,
            0.2,
            tip[1] - 0.014,
            tip[0],
            tip[2],
          );
          mass(
            fruit,
            0.042,
            0.039,
            0.042,
            ["#502a38", "#753549", "#a24e59", "#c47a78"],
            j,
            4,
          );
        }
      }
    }
  }
}

function guardians(b, e) {
  const { lod, limb, mass } = b,
    frost = e.form === "stag",
    stone = e.form === "colossus";
  const hide = stone
    ? ["#303238", "#524849", "#745e51", "#998065"]
    : frost
      ? ["#374856", "#516874", "#819799", "#b5c6be"]
      : ["#403a2f", "#64533c", "#88744c", "#b19e69"];
  const horns = stone
    ? ["#362d29", "#6b4233", "#cc7740"]
    : frost
      ? ["#4c6971", "#86adb1", "#d4e5df"]
      : ["#685d3d", "#918556", "#c4b785"];
  const eye = stone
    ? ["#ce4e22", "#f18932", "#ffca6b", "#ffe1a0"]
    : ["#457b6d", "#91ba91", "#cfdea8", "#f1e9b7"];
  const n = [7, 5, 4][lod],
    chestY = stone ? 0.65 : 0.48;
  mass(
    [0, chestY, 0],
    stone ? 0.26 : 0.14,
    stone ? 0.22 : 0.13,
    stone ? 0.16 : 0.27,
    hide,
    0,
    n,
  );
  if (stone) {
    mass([0, 0.43, 0], 0.17, 0.15, 0.13, hide, 0.6, n);
    mass([0, 0.85, 0.036], 0.11, 0.12, 0.1, hide, 0.2, n);
    for (const side of [-1, 1]) {
      const shoulder = [0.25 * side, 0.7, 0],
        elbow = [0.38 * side, 0.48, 0.022];
      mass(shoulder, 0.14, 0.13, 0.14, hide, 0.1, n);
      limb(
        [shoulder, elbow, [side * 0.35, 0.31, 0.074]],
        [0.12, 0.076, 0.098],
        hide,
        n,
      );
      mass([side * 0.35, 0.28, 0.074], 0.1, 0.1, 0.1, hide, 0, n);
      limb(
        [
          [side * 0.125, 0.47, 0],
          [side * 0.17, 0.24, 0.019],
          [side * 0.19, 0.025, 0.036],
        ],
        [0.112, 0.073, 0.096],
        hide,
        n,
      );
      limb([shoulder, [side * 0.32, 0.92, -0.01]], [0.074, 0.006], horns, 5);
      if (lod === 0)
        limb(
          [
            [side * 0.18, 0.7, 0.13],
            [side * 0.07, 0.61, 0.15],
            [side * 0.1, 0.52, 0.12],
          ],
          [0.012, 0.009, 0.005],
          horns,
          3,
        );
      mass([side * 0.057, 0.875, 0.115], 0.02, 0.013, 0.015, eye, 0, 4);
    }
    return;
  }
  const neck = [0, 0.66, 0.24],
    head = [0, 0.73, 0.27];
  limb([[0, 0.5, 0.15], neck, head], [0.105, 0.061, 0.067], hide, n);
  mass(head, 0.075, 0.084, 0.11, hide, 0.4, n);
  mass([0, 0.704, 0.35], 0.052, 0.048, 0.084, hide, 0.1, n);
  for (const side of [-1, 1]) {
    for (const fore of [-1, 1]) {
      const hip = [side * 0.091, 0.48, fore * 0.158],
        knee = [side * 0.103, 0.245, fore * 0.17 - 0.035];
      const foot = [side * 0.103, 0.012, fore * 0.17 + 0.01];
      limb([hip, knee, foot], [0.059, 0.032, 0.019], hide, n);
    }
    const brow = add(head, side * 0.035, 0.055, -0.008);
    const mid = add(brow, 0.14 * side, 0.093, -0.035);
    const crown = add(brow, 0.225 * side, 0.22, -0.087);
    limb([brow, mid, crown], [0.034, 0.026, 0.005], horns, 5);
    for (let i = 0; i < (lod === 2 ? 2 : 4); i++) {
      const t = i / 4,
        base = [
          mid[0] * (1 - t) + crown[0] * t,
          mid[1] * (1 - t) + crown[1] * t,
          mid[2] * (1 - t) + crown[2] * t,
        ];
      limb(
        [base, add(base, side * (0.025 - i * 0.01), 0.1 + i * 0.007, 0.034)],
        [0.018, 0.002],
        horns,
        3,
      );
    }
    mass(add(head, side * 0.06, 0.012, 0.063), 0.014, 0.012, 0.012, eye, 0, 4);
  }
  if (!frost && lod < 2) {
    for (let i = 0; i < 4; i++) {
      const a = i * GOLDEN;
      mass(
        radial(a, 0.09, 0.58, 0, -0.03),
        0.084,
        0.045,
        0.088,
        e.foliage,
        a,
        5,
      );
    }
  }
}

/** Create one reusable indexed mesh and one material for instanced rendering.
 * The caller owns both returned resources. lod 0 is near, 1 mid, 2 far. */
export function buildAsset(T, entry, lod = 0) {
  const b = makeBuilder(
    T,
    entry,
    Math.max(0, Math.min(2, Math.trunc(lod) || 0)),
  );
  if (entry.layer === "tree" || entry.layer === "giant") trees(b, entry);
  else if (entry.layer === "boss") guardians(b, entry);
  else undergrowth(b, entry);
  return b.finish();
}
