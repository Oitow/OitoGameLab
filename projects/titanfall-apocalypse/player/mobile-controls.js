// Reusable touch controls. No DOM is created until this factory is called.
export function createMobileControls({ joystick, knob, lookSurface, onAbility = () => {} }) {
  const state = { x: 0, y: 0, yawDelta: 0, pitchDelta: 0 };
  let stickPointer = null, lookPointer = null, lastX = 0, lastY = 0;
  const listeners = [];
  const on = (element, event, fn) => { element.addEventListener(event, fn); listeners.push([element, event, fn]); };
  function moveStick(e) {
    const rect = joystick.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2, y = e.clientY - rect.top - rect.height / 2;
    const radius = Math.max(1, rect.width * .35);
    const length = Math.hypot(x, y), scale = Math.min(1, radius / Math.max(1, length));
    state.x = x * scale / radius; state.y = y * scale / radius;
    knob.style.transform = 'translate(' + (state.x * radius) + 'px,' + (state.y * radius) + 'px)';
  }
  on(joystick, 'pointerdown', e => { stickPointer = e.pointerId; joystick.setPointerCapture(e.pointerId); moveStick(e); });
  on(joystick, 'pointermove', e => { if (e.pointerId === stickPointer) moveStick(e); });
  const releaseStick = e => { if (e.pointerId !== stickPointer) return; stickPointer = null; state.x = state.y = 0; knob.style.transform = ''; };
  on(joystick, 'pointerup', releaseStick); on(joystick, 'pointercancel', releaseStick);
  on(lookSurface, 'pointerdown', e => { lookPointer = e.pointerId; lastX = e.clientX; lastY = e.clientY; lookSurface.setPointerCapture(e.pointerId); });
  on(lookSurface, 'pointermove', e => { if (e.pointerId !== lookPointer) return; state.yawDelta += e.clientX - lastX; state.pitchDelta += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; });
  on(lookSurface, 'pointerup', e => { if (e.pointerId === lookPointer) lookPointer = null; });
  on(lookSurface, 'pointercancel', e => { if (e.pointerId === lookPointer) lookPointer = null; });
  function consumeLook() { const result = { yaw: state.yawDelta, pitch: state.pitchDelta }; state.yawDelta = state.pitchDelta = 0; return result; }
  function dispose() { for (const [element, event, fn] of listeners) element.removeEventListener(event, fn); }
  return { state, consumeLook, onAbility, dispose };
}
