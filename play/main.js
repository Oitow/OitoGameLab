import { Session } from "../src/core/Session.js";
import { FixedStep } from "../src/core/FixedStep.js";
import { Input } from "../src/input/Input.js";
import { Renderer } from "../src/render/Renderer.js";
import { explorer } from "../games/explorer/game.js";
import { scavenger } from "../games/scavenger/game.js";
const $ = (s) => document.querySelector(s),
  definitions = { explorer, scavenger },
  clock = new FixedStep();
let session,
  renderer,
  input,
  frame,
  last = 0,
  paused = false,
  contextLost = false,
  uiTime = 0,
  frames = 0;
const notify = (message) => {
  $("#message").textContent = message;
};
function save() {
  try {
    localStorage.setItem("oito.save.v1", JSON.stringify(session.snapshot()));
    notify("Spielstand gespeichert.");
  } catch {
    notify("Speichern ist in diesem Browser nicht verfügbar.");
  }
}
function start(id, seed, data) {
  session = new Session(definitions[id] || explorer, seed);
  if (data && !session.restore(data))
    throw new Error("Spielstand ist ungültig.");
  input.onBlur();
  clock.reset();
  renderer.mount(session);
  $("#game").value = session.id;
  $("#seed").value = session.terrain.seed;
  $("#objective").textContent = session.game.status();
  notify("WASD / Joystick · Leertaste / Sprung");
}
function setPaused(value) {
  paused = value;
  input.onBlur();
  clock.reset();
  last = 0;
  $("#pause").textContent = paused ? "Weiter" : "Pause";
  $("#pause").setAttribute("aria-pressed", String(paused));
  notify(paused ? "Pause" : session.game.status());
}
try {
  renderer = new Renderer($("#scene"));
  input = new Input($("#joystick"), $("#knob"));
  const params = new URLSearchParams(location.search),
    seed = Number(params.get("seed") || 12345);
  start(params.get("game") || "explorer", Number.isFinite(seed) ? seed : 12345);
  $("#game").onchange = () => start($("#game").value, session.terrain.seed);
  $("#world").onsubmit = (e) => {
    e.preventDefault();
    start(session.id, Number($("#seed").value));
  };
  $("#random").onclick = () =>
    start(session.id, crypto.getRandomValues(new Uint32Array(1))[0]);
  $("#pause").onclick = () => {
    if (paused) $("#settings").open = false;
    setPaused(!paused);
  };
  $("#save").onclick = save;
  $("#load").onclick = () => {
    try {
      const data = JSON.parse(localStorage.getItem("oito.save.v1"));
      if (
        !data ||
        !definitions[data.game] ||
        !Number.isInteger(data.seed) ||
        data.seed < 0 ||
        data.seed > 4294967295
      )
        throw Error();
      const candidate = new Session(definitions[data.game], data.seed);
      if (!candidate.restore(data)) throw Error();
      start(data.game, data.seed, data);
      notify("Spielstand geladen.");
    } catch {
      notify("Kein gültiger Spielstand gefunden.");
    }
  };
  $("#settings").addEventListener("toggle", () => {
    if ($("#settings").open) setPaused(true);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setPaused(true);
  });
  $("#scene").addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    contextLost = true;
    setPaused(true);
    notify("Grafik unterbrochen. Wiederherstellung läuft …");
  });
  $("#scene").addEventListener("webglcontextrestored", () => {
    contextLost = false;
    renderer.mount(session);
    notify("Grafik wiederhergestellt. Mit Weiter fortsetzen.");
  });
  function tick(time) {
    frame = requestAnimationFrame(tick);
    const dt = last ? Math.min((time - last) / 1000, 0.1) : 0;
    last = time;
    if (contextLost) return;
    if (!paused) {
      input.update();
      clock.advance(dt, (step) =>
        session.step(step, {
          x: input.direction.x,
          z: input.direction.y,
          jump: input.consumeJump(),
        }),
      );
    }
    renderer.draw(paused ? 0 : dt, session);
    uiTime += dt;
    frames++;
    if (uiTime >= 0.5) {
      $("#objective").textContent = session.game.status();
      $("#stats").textContent =
        `${Math.round(frames / uiTime)} FPS · ${renderer.renderer.info.render.calls} Draw Calls · Seed ${session.terrain.seed}`;
      uiTime = 0;
      frames = 0;
    }
  }
  frame = requestAnimationFrame(tick);
  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(frame);
      input.dispose();
      renderer.dispose();
    },
    { once: true },
  );
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) location.reload();
  });
} catch (error) {
  console.error(error);
  $("#error").hidden = false;
  $("#error").textContent =
    `Start fehlgeschlagen: ${error.message}. Bitte Seite neu laden und WebGL/Internetverbindung prüfen.`;
}
