import * as T from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.min.js";
import { CATALOG, buildAsset } from "./biome-assets.js";

const $ = (id) => document.getElementById(id);
const vec = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const R = 6371000,
  side = 131072;
const sites = [
  {
    name: "Ancient grove",
    title: "Hain der Uralten",
    lat: 54.78,
    lon: 9.43,
    sky: 0xc6d8ae,
    fog: 0x9eada0,
    floor: 0x555f38,
  },
  {
    name: "Emberwood",
    title: "Glutwald",
    lat: -18.4,
    lon: 132.6,
    sky: 0xeec69e,
    fog: 0xc6a399,
    floor: 0x68503b,
  },
  {
    name: "Frost hollow",
    title: "Frostsenke",
    lat: 68.8,
    lon: -149.5,
    sky: 0xc9e1eb,
    fog: 0xb8cfd7,
    floor: 0x8a9e94,
  },
];
function globe(lat, lon) {
  const a = (lat * Math.PI) / 180,
    b = (lon * Math.PI) / 180;
  return vec(Math.cos(a) * Math.cos(b), Math.sin(a), Math.cos(a) * Math.sin(b));
}
sites.forEach((site) => (site.normal = globe(site.lat, site.lon)));
// Six oriented cube faces share their edges before projection onto the sphere.
const faces = [
  [
    [1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [-1, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ],
  [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, -1],
    [-1, 0, 0],
    [0, 1, 0],
  ],
].map((face) => face.map((a) => vec(...a)));
function normalAt(face, u, v) {
  const [n, x, y] = faces[face];
  return n
    .clone()
    .addScaledVector(x, (2 * u) / side - 1)
    .addScaledVector(y, (2 * v) / side - 1)
    .normalize();
}
function tileAt(n) {
  const abs = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
  const axis = abs.indexOf(Math.max(...abs)),
    f = 2 * axis + (n.getComponent(axis) < 0 ? 1 : 0);
  const [base, x, y] = faces[f],
    d = n.dot(base);
  const cell = (t) =>
    T.MathUtils.clamp(Math.floor(((t / d + 1) * side) / 2), 0, side - 1);
  return { f, i: cell(n.dot(x)), j: cell(n.dot(y)) };
}
const key = (t) => t.f + "/" + t.i + "/" + t.j;
function neighbor(t, x, y) {
  const i = t.i + x,
    j = t.j + y;
  return i >= 0 && i < side && j >= 0 && j < side
    ? { f: t.f, i, j }
    : tileAt(normalAt(t.f, i + 0.5, j + 0.5));
}
function around(center, radius) {
  const list = [{ t: center, ring: 0 }],
    seen = new Set([key(center)]);
  for (let k = 0; k < list.length; k++) {
    const { t, ring } = list[k];
    if (ring === radius) continue;
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++) {
        const next = neighbor(t, x, y),
          id = key(next);
        if (!seen.has(id)) {
          seen.add(id);
          list.push({ t: next, ring: ring + 1 });
        }
      }
  }
  return list;
}
function rng(t, seed, salt) {
  let h =
    (Math.imul(t.i, 73856093) ^
      Math.imul(t.j, 19349663) ^
      Math.imul(t.f + 1, 83492791) ^
      seed ^
      Math.imul(salt, 2654435761)) >>>
    0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let a = Math.imul(h ^ (h >>> 15), h | 1);
    a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
    return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  };
}
function biome(n) {
  return sites.reduce(
    (best, s) => (s.normal.dot(n) > best.normal.dot(n) ? s : best),
    sites[0],
  );
}
function elevation(n) {
  const x = n.x * R,
    y = n.y * R,
    z = n.z * R;
  return (
    2.7 * Math.sin(x * 0.018 + z * 0.007) +
    2.1 * Math.cos(y * 0.02 - z * 0.009) +
    0.7 * Math.sin((x - y) * 0.039)
  );
}
function frame(up, east) {
  const x = east
    ? east.clone().addScaledVector(up, -up.dot(east)).normalize()
    : vec(-up.z, 0, up.x).normalize();
  return {
    up: up.clone(),
    x,
    z: x.clone().cross(up),
    origin: up.clone().multiplyScalar(R),
  };
}
function local(frame, n) {
  const p = n
    .clone()
    .multiplyScalar(R + elevation(n))
    .sub(frame.origin);
  return vec(p.dot(frame.x), p.dot(frame.up), p.dot(frame.z));
}
// Reserve a sightline through adjacent cells, and assign landmarks to the
// cell containing their world position so streaming never duplicates them.
const landmarks = new Map();
for (const site of sites) {
  site.axes = frame(site.normal);
  for (const [layer, x, z] of [
    ["giant", -27, -108],
    ["boss", 8, -65],
  ]) {
    const n = site.normal
      .clone()
      .addScaledVector(site.axes.x, x / R)
      .addScaledVector(site.axes.z, z / R)
      .normalize();
    const id = key(tileAt(n));
    if (!landmarks.has(id)) landmarks.set(id, []);
    landmarks.get(id).push({ layer, n });
  }
}
function inClearing(site, n, layer) {
  if (site.normal.distanceToSquared(n) > (180 / R) ** 2) return false;
  const x = n.dot(site.axes.x) * R,
    z = n.dot(site.axes.z) * R;
  if (layer === "ground" || layer === "shrub") return Math.hypot(x, z) < 4;
  const width = layer === "giant" ? 48 : 16;
  return Math.abs(x) < width && z > -125 && z < 28;
}
const palettes = new Map();
for (const site of sites)
  for (const layer of ["giant", "tree", "shrub", "ground", "boss"])
    palettes.set(
      site.name + layer,
      CATALOG.filter((e) => e.layer === layer && e.biomes.includes(site.name)),
    );
let seed = 1847,
  density = 80,
  rings = 2;
function growTile(t) {
  const site = biome(normalAt(t.f, t.i + 0.5, t.j + 0.5)),
    items = [];
  const tileId = key(t);
  const add = (layer, n, random, scale) => {
    const options = palettes.get(site.name + layer);
    if (!options.length) return;
    const entry = options[Math.floor(random() * options.length)];
    items.push({ entry, n, scale, angle: random() * Math.PI * 2 });
  };
  for (const [index, [layer, count]] of [
    ["giant", 1],
    ["tree", 13],
    ["shrub", 17],
    ["ground", 34],
    ["boss", 1],
  ].entries()) {
    for (
      let k = 0;
      k <
      (layer === "ground" || layer === "tree" || layer === "shrub"
        ? Math.ceil(count * 1.25)
        : count);
      k++
    ) {
      const r = rng(t, seed, index * 100 + k + 1),
        u = r(),
        v = r(),
        selection = r();
      const rate =
        layer === "boss" ? 0.035 : layer === "giant" ? 0.31 : density / 125;
      if (selection >= Math.min(rate, 1)) continue;
      const n = normalAt(t.f, t.i + u, t.j + v);
      if (inClearing(site, n, layer)) continue;
      add(layer, n, r, 0.76 + r() * 0.48);
    }
  }
  for (const { layer, n } of landmarks.get(tileId) ?? []) {
    add(layer, n, rng(t, seed, layer === "boss" ? 712 : 713), 1);
  }
  return { items, site };
}

const canvas = $("scene");
const renderer = new T.WebGLRenderer({
  canvas,
  antialias: false,
  powerPreference: "high-performance",
});
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
const scene = new T.Scene(),
  camera = new T.PerspectiveCamera(68, 1, 0.18, 1350);
scene.add(new T.HemisphereLight(0xfff3cc, 0x607764, 1.85));
const sun = new T.DirectionalLight(0xffdfa0, 2.25);
sun.position.set(-70, 110, -65);
scene.add(sun);
const terrainMat = new T.MeshLambertMaterial({ vertexColors: true });
const assets = new Map(),
  cache = new Map();
let site = sites[0],
  player = site.normal.clone(),
  axes = frame(player),
  yaw = 0,
  pitch = 0.16;
let active = null,
  pending = null,
  assetView = null,
  orbit = 0,
  pitchOrbit = 0.15,
  catalogZoom = 1;
let activeKey = "",
  quality = "Mobil",
  scale = 0.8,
  effectiveScale = 0.8,
  tuningTime = 0,
  notice = "",
  keys = new Set(),
  pointer = null,
  joy = null;
let moveX = 0,
  moveY = 0,
  distanceWalked = 0,
  frameTime = 16.7,
  lastHud = 0,
  paused = false;
const object = new T.Object3D();
const limits = { Mobil: 2200, Ausgewogen: 4700, Weitsicht: 8500 };
function getAsset(e, lod) {
  const id = e.id + "/" + lod;
  if (!assets.has(id)) assets.set(id, buildAsset(T, e, lod));
  return assets.get(id);
}
function disposeWorld(w) {
  if (!w) return;
  w.group.removeFromParent();
  for (const mesh of w.group.children) {
    if (mesh.isInstancedMesh) mesh.dispose();
    else mesh.geometry.dispose();
  }
}
function schedule() {
  const t = tileAt(player);
  const id = [key(t), rings, density, seed, quality, $("bosses").checked].join(
    "|",
  );
  if (id === activeKey) return;
  activeKey = id;
  if (pending) disposeWorld(pending);
  pending = {
    group: new T.Group(),
    frame: frame(player, axes.x),
    tiles: around(t, rings),
    index: 0,
    batches: new Map(),
    positions: [],
    colors: [],
    indices: [],
    solids: [],
    bosses: [],
    count: 0,
    uploads: null,
    uploadIndex: 0,
  };
}
function sampleTile(w, { t, ring }) {
  const id = key(t);
  if (!cache.has(id)) cache.set(id, growTile(t));
  const { site, items } = cache.get(id);
  const steps = 8,
    offset = w.positions.length / 3,
    tint = new T.Color(site.floor);
  for (let y = 0; y <= steps; y++)
    for (let x = 0; x <= steps; x++) {
      const n = normalAt(t.f, t.i + x / steps, t.j + y / steps),
        p = local(w.frame, n);
      const shade = 0.89 + 0.13 * Math.sin(n.x * R * 0.09 + n.z * R * 0.07);
      w.positions.push(p.x, p.y, p.z);
      w.colors.push(tint.r * shade, tint.g * shade, tint.b * shade);
      if (x && y) {
        const c = offset + y * (steps + 1) + x;
        w.indices.push(
          c - steps - 2,
          c - steps - 1,
          c,
          c - steps - 2,
          c,
          c - 1,
        );
      }
    }
  for (const item of items) {
    const { entry, n, angle, scale } = item;
    if (
      (entry.layer === "ground" && ring > 1) ||
      (entry.layer === "shrub" && ring > 2) ||
      (entry.layer === "boss" && !$("bosses").checked)
    )
      continue;
    if (w.count >= limits[quality]) continue;
    const lod = ring === 0 ? 0 : ring === 1 ? 1 : 2;
    const id = entry.id + "/" + lod;
    if (!w.batches.has(id)) w.batches.set(id, { entry, lod, items: [] });
    const p = local(w.frame, n);
    const placed = { p, angle, scale };
    w.batches.get(id).items.push(placed);
    w.count++;
    if (ring <= 1 && ["giant", "tree", "boss"].includes(entry.layer))
      w.solids.push({
        p,
        r: Math.max(
          0.45,
          entry.height * scale * (entry.layer === "boss" ? 0.12 : 0.035),
        ),
      });
    if (entry.layer === "boss") {
      placed.boss = { p, entry, angle, scale };
      w.bosses.push(placed.boss);
    }
  }
}
function buildTerrain(w) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(w.positions, 3));
  g.setAttribute("color", new T.Float32BufferAttribute(w.colors, 3));
  g.setIndex(w.indices);
  g.computeVertexNormals();
  w.group.add(new T.Mesh(g, terrainMat));
  w.uploads = [...w.batches.values()];
}
function upload(w, b) {
  const asset = getAsset(b.entry, b.lod);
  const mesh = new T.InstancedMesh(
    asset.geometry,
    asset.material,
    b.items.length,
  );
  b.items.forEach(({ p, angle, scale, boss }, i) => {
    if (boss) {
      boss.mesh = mesh;
      boss.index = i;
    }
    object.position.copy(p);
    object.rotation.y = angle;
    object.scale.setScalar(scale);
    object.updateMatrix();
    mesh.setMatrixAt(i, object.matrix);
  });
  mesh.computeBoundingSphere();
  w.group.add(mesh);
}
function stream() {
  const w = pending;
  if (!w) return;
  const deadline = performance.now() + (quality === "Mobil" ? 3 : 5);
  do {
    if (w.index < w.tiles.length) sampleTile(w, w.tiles[w.index++]);
    else if (!w.uploads) buildTerrain(w);
    else if (w.uploadIndex < w.uploads.length)
      upload(w, w.uploads[w.uploadIndex++]);
    else {
      disposeWorld(active);
      active = w;
      axes = w.frame;
      scene.add(w.group);
      pending = null;
      const keep = new Set(w.tiles.map((v) => key(v.t)));
      for (const k of cache.keys()) if (!keep.has(k)) cache.delete(k);
      w.batches.clear();
      w.uploads = w.positions = w.colors = w.indices = null;
      w.group.visible = !assetView;
      break;
    }
  } while (performance.now() < deadline);
}
const sky = new T.Mesh(
  new T.SphereGeometry(1100, 32, 16),
  new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {
      horizon: { value: new T.Color() },
      zenith: { value: new T.Color() },
    },
    vertexShader:
      "varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `varying vec3 dir;uniform vec3 horizon,zenith;
 void main(){vec3 d=normalize(dir);float h=smoothstep(-.04,.93,d.y);
 float s=max(0.,dot(d,normalize(vec3(-.44,.55,-.7))));
 vec3 c=mix(horizon,zenith,h)+vec3(.62,.39,.13)*pow(s,18.)+vec3(2.,1.65,.97)*smoothstep(.998,.9996,s);
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,
  }),
);
sky.renderOrder = -2;
scene.add(sky);
function climate() {
  scene.fog = new T.FogExp2(site.fog, 1 / (rings * 59 + 55));
  sky.material.uniforms.horizon.value.setHex(site.fog);
  sky.material.uniforms.zenith.value.setHex(site.sky);
}
const presets = {
  Mobil: [2, 65, 0.75],
  Ausgewogen: [3, 85, 1],
  Weitsicht: [4, 105, 1.15],
};
function resize() {
  renderer.setPixelRatio(effectiveScale);
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  camera.aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
  camera.updateProjectionMatrix();
}
function settings() {
  rings = +$("rings").value;
  density = +$("density").value;
  scale = +$("scale").value;
  effectiveScale = scale;
  tuningTime = performance.now();
  $("ringsOut").textContent = rings;
  $("densityOut").textContent = density + " %";
  $("scaleOut").textContent = scale.toFixed(2);
  cache.clear();
  resize();
  climate();
  schedule();
}
function preset(value) {
  quality = value;
  [$("rings").value, $("density").value, $("scale").value] = presets[value];
  $("quality").value = value;
  settings();
}
function travel() {
  leaveCatalog();
  site = sites[+$("region").value];
  player = site.normal.clone();
  axes = frame(player);
  yaw = 0;
  pitch = 0.24;
  distanceWalked = 0;
  clearInput();
  cache.clear();
  disposeWorld(active);
  active = null;
  activeKey = "";
  climate();
  schedule();
  $("title").textContent = site.title;
}
const groups = {
  all: "Alle",
  giant: "Weltenbäume",
  tree: "Bäume",
  shrub: "Sträucher",
  ground: "Boden & Laub",
  boss: "Riesenbosse",
};
function entries() {
  $("entries").replaceChildren();
  for (const entry of CATALOG.filter(
    (e) => $("layer").value === "all" || e.layer === $("layer").value,
  )) {
    const b = document.createElement("button"),
      name = document.createElement("span"),
      unit = document.createElement("small");
    name.textContent = entry.name;
    unit.textContent = entry.height + " m";
    b.append(name, unit);
    b.onclick = () => inspect(entry);
    $("entries").append(b);
  }
}
function panel(open) {
  $("panel").hidden = !open;
  $("menu").setAttribute("aria-expanded", String(open));
  clearInput();
}
function inspect(entry) {
  leaveCatalog();
  const a = getAsset(entry, 0),
    group = new T.Group();
  group.add(new T.Mesh(a.geometry, a.material));
  const pad = new T.Mesh(
    new T.CylinderGeometry(
      entry.height * 0.58,
      entry.height * 0.62,
      Math.max(0.02, entry.height * 0.025),
      48,
    ),
    new T.MeshLambertMaterial({ color: 0x394a36 }),
  );
  pad.position.y = -Math.max(0.02, entry.height * 0.025) * 0.5;
  group.add(pad);
  assetView = { entry, group, pad };
  scene.add(group);
  if (active) active.group.visible = false;
  orbit = 0.4;
  pitchOrbit = 0.12;
  catalogZoom = 1;
  scene.fog = null;
  camera.near = Math.min(0.1, entry.height * 0.018);
  camera.updateProjectionMatrix();
  $("title").textContent = entry.name;
  $("return").hidden = false;
  document.body.classList.add("inspect");
  $("guide").textContent = "Ziehen zum Drehen · Mausrad zum Zoomen";
  panel(false);
}
function leaveCatalog() {
  if (!assetView) return;
  const { group, pad } = assetView;
  group.removeFromParent();
  pad.geometry.dispose();
  pad.material.dispose();
  assetView = null;
  if (active) active.group.visible = true;
  camera.near = 0.18;
  camera.updateProjectionMatrix();
  climate();
  $("return").hidden = true;
  document.body.classList.remove("inspect");
  $("title").textContent = site.title;
  guide();
}
function guide() {
  $("guide").textContent = matchMedia("(pointer:coarse)").matches
    ? "Links laufen · rechts umsehen"
    : "WASD / Pfeiltasten · Ziehen zum Umsehen · Shift zum Rennen";
}
function clearInput() {
  keys.clear();
  moveX = moveY = 0;
  pointer = joy = null;
}
$("menu").onclick = () => panel($("panel").hidden);
$("return").onclick = leaveCatalog;
sites.forEach((s, i) => $("region").add(new Option(s.title, i)));
Object.entries(groups).forEach(([id, label]) =>
  $("layer").add(new Option(label, id)),
);
$("total").textContent = CATALOG.length;
$("layer").onchange = entries;
entries();
$("region").onchange = () => {
  travel();
  panel(false);
};
$("seed").onchange = () => {
  const value = $("seed").valueAsNumber;
  if (!Number.isFinite(value)) {
    $("seed").value = seed;
    return;
  }
  seed = T.MathUtils.clamp(Math.trunc(value), 0, 2147483647);
  $("seed").value = seed;
  travel();
};
$("quality").onchange = () => preset($("quality").value);
for (const id of ["rings", "density", "scale", "adaptive", "bosses"])
  $(id).onchange = settings;
addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("panel").hidden) panel(false);
    else leaveCatalog();
    return;
  }
  if (
    !paused &&
    $("panel").hidden &&
    !assetView &&
    [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ShiftLeft",
      "ShiftRight",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  paused = document.hidden;
  clearInput();
});
canvas.onpointerdown = (e) => {
  if (!$("panel").hidden) {
    panel(false);
    return;
  }
  if (!pointer) {
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  }
};
canvas.onpointermove = (e) => {
  if (pointer?.id !== e.pointerId) return;
  const dx = e.clientX - pointer.x,
    dy = e.clientY - pointer.y;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (assetView) {
    orbit -= dx * 0.009;
    pitchOrbit = T.MathUtils.clamp(pitchOrbit + dy * 0.006, -0.15, 1.1);
  } else {
    yaw -= dx * 0.004;
    pitch = T.MathUtils.clamp(pitch - dy * 0.004, -1.3, 1.35);
  }
};
canvas.onlostpointercapture = () => (pointer = null);
canvas.onwheel = (e) => {
  if (assetView) {
    e.preventDefault();
    catalogZoom = T.MathUtils.clamp(
      catalogZoom * Math.exp(e.deltaY * 0.001),
      0.55,
      3,
    );
  }
};
const pad = $("pad");
function joystick(e) {
  const b = pad.getBoundingClientRect();
  moveX = T.MathUtils.clamp((e.clientX - b.left - b.width / 2) / 32, -1, 1);
  moveY = T.MathUtils.clamp((b.top + b.height / 2 - e.clientY) / 32, -1, 1);
}
pad.onpointerdown = (e) => {
  joy = e.pointerId;
  pad.setPointerCapture(joy);
  joystick(e);
};
pad.onpointermove = (e) => {
  if (joy === e.pointerId) joystick(e);
};
pad.onlostpointercapture = () => {
  moveX = moveY = 0;
  joy = null;
};
function touching(p, old) {
  for (const s of active.solids) {
    const d = (p.x - s.p.x) ** 2 + (p.z - s.p.z) ** 2;
    if (d < s.r * s.r && d < (old.x - s.p.x) ** 2 + (old.z - s.p.z) ** 2)
      return true;
  }
  return false;
}
function walk(dt) {
  let forward =
    moveY +
    Number(keys.has("KeyW") || keys.has("ArrowUp")) -
    Number(keys.has("KeyS") || keys.has("ArrowDown"));
  let right =
    moveX +
    Number(keys.has("KeyD") || keys.has("ArrowRight")) -
    Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  if (!(forward || right) || !active) return;
  const len = Math.max(1, Math.hypot(forward, right)),
    speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 12 : 5;
  const dx =
    ((Math.cos(yaw) * right - Math.sin(yaw) * forward) * speed * dt) / len;
  const dz =
    ((-Math.sin(yaw) * right - Math.cos(yaw) * forward) * speed * dt) / len;
  const n = player
    .clone()
    .addScaledVector(axes.x, dx / R)
    .addScaledVector(axes.z, dz / R)
    .normalize();
  if (touching(local(axes, n), local(axes, player))) return;
  player = n;
  distanceWalked += Math.hypot(dx, dz);
  schedule();
}
let previous = 0;
function animate(now) {
  if (paused) {
    previous = 0;
    return;
  }
  const elapsed = previous ? now - previous : 0,
    dt = Math.min(0.12, elapsed / 1000);
  previous = now;
  if (dt) frameTime += 0.08 * (elapsed - frameTime);
  if (!assetView) stream();
  if (assetView) {
    const h = assetView.entry.height;
    const d = h * catalogZoom * Math.max(1.4, 1.15 / camera.aspect);
    camera.position.set(
      d * Math.sin(orbit) * Math.cos(pitchOrbit),
      h * 0.44 + d * Math.sin(pitchOrbit),
      d * Math.cos(orbit) * Math.cos(pitchOrbit),
    );
    camera.lookAt(0, h * 0.44, 0);
  } else {
    if ($("panel").hidden) walk(dt);
    camera.position.copy(local(axes, player));
    camera.position.y += 1.8;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0, "YXZ");
  }
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
  if (now - lastHud > 250) {
    const hudDelta = Math.min(0.5, (now - lastHud) / 1000);
    lastHud = now;
    if ($("adaptive").checked && !pending && now - tuningTime > 2800) {
      const next = T.MathUtils.clamp(
        effectiveScale + (frameTime > 38 ? -0.1 : frameTime < 19 ? 0.05 : 0),
        Math.min(scale, 0.5),
        scale,
      );
      if (next !== effectiveScale) {
        effectiveScale = next;
        resize();
      }
      tuningTime = now;
    }
    if (assetView) {
      const e = assetView.entry;
      $("stats").textContent =
        groups[e.layer] + " · " + e.height + " m\n" + e.biomes.join(" / ");
    } else {
      let near = null,
        dist = Infinity;
      for (const b of active?.bosses ?? []) {
        const d = Math.hypot(
          camera.position.x - b.p.x,
          camera.position.z - b.p.z,
        );
        if (d < dist) {
          dist = d;
          near = b;
        }
      }
      if (near && dist < 54 && near.mesh) {
        const target = Math.atan2(
          camera.position.x - near.p.x,
          camera.position.z - near.p.z,
        );
        const diff = Math.atan2(
          Math.sin(target - near.angle),
          Math.cos(target - near.angle),
        );
        near.angle += T.MathUtils.clamp(
          diff,
          -hudDelta * 0.65,
          hudDelta * 0.65,
        );
        object.position.copy(near.p);
        object.rotation.y = near.angle;
        object.scale.setScalar(near.scale);
        object.updateMatrix();
        near.mesh.setMatrixAt(near.index, object.matrix);
        near.mesh.instanceMatrix.needsUpdate = true;
      }
      notice = !active
        ? "Wald wird aufgebaut …"
        : near && dist < 95
          ? near.entry.name +
            (dist < 54 ? " beobachtet dich" : "") +
            " · " +
            Math.round(dist) +
            " m"
          : "";
      $("notice").textContent = notice;
      $("notice").hidden = !notice;
      $("stats").textContent =
        (active?.tiles.length ?? 0) +
        " Sektoren · " +
        (active?.count ?? 0) +
        " Instanzen" +
        (pending ? " · lädt" : "") +
        "\n" +
        renderer.info.render.calls +
        " Draw Calls · " +
        Math.round(renderer.info.render.triangles / 1000) +
        "k Tris · " +
        Math.round(frameTime) +
        " ms · " +
        effectiveScale.toFixed(2) +
        "×" +
        "\n" +
        ((Math.asin(player.y) * 180) / Math.PI).toFixed(4) +
        "° / " +
        ((Math.atan2(player.z, player.x) * 180) / Math.PI).toFixed(4) +
        "° · " +
        Math.round(distanceWalked) +
        " m";
    }
  }
}
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  renderer.setAnimationLoop(null);
  clearInput();
  $("notice").hidden = false;
  $("notice").textContent = "Grafikkontext pausiert";
});
canvas.addEventListener("webglcontextrestored", () => {
  renderer.setAnimationLoop(animate);
});
addEventListener("resize", resize);
preset(
  matchMedia("(pointer:coarse)").matches || innerWidth < 761
    ? "Mobil"
    : "Ausgewogen",
);
travel();
guide();
renderer.setAnimationLoop(animate);
