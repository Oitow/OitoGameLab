import { Engine } from './core/Engine.js';
import { World } from './world/World.js';
import { Character } from './character/Character.js';
import { Input } from './input/Input.js';
import { CameraRig } from './camera/CameraRig.js';
try {
  const engine = new Engine();
  let seed = 12345;
  const world = new World(engine.scene, seed);
  const character = new Character(engine.scene, world);
  const input = new Input(document.querySelector('#joystick'), document.querySelector('#knob'));
  const cameraRig = new CameraRig(engine.camera);
  const stats = document.querySelector('#stats');
  cameraRig.snap(character.group.position);
  document.querySelector('#regenerate').addEventListener('click', () => {
    seed = Math.floor(Math.random() * 999999) + 1;
    world.generate(seed);
    character.reset();
    cameraRig.snap(character.group.position);
  });
  let uiTime = 0;
  engine.start(dt => {
    input.update();
    character.update(dt, input);
    cameraRig.update(dt, character.group.position);
    uiTime += dt;
    if (uiTime > 0.3) {
      stats.textContent = `FPS: ${engine.fps} · Seed: ${seed}`;
      uiTime = 0;
    }
  });
} catch (error) {
  console.error(error);
  const box = document.querySelector('#error');
  box.style.display = 'block';
  box.textContent = 'Engine-Fehler: ' + (error?.message || error);
}