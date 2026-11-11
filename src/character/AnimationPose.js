/** View-independent locomotion pose. Can drive procedural meshes or a future rig. */
export function locomotionPose(state, index, speed = 5.3) {
  const gait = Math.min(Math.hypot(state.vx, state.vz) / speed, 1);
  const phase = state.phase + index * Math.PI;
  const stride = Math.sin(phase), recovery = Math.max(0, -Math.cos(phase));
  const rising = state.vy > 0, landing = state.landing || 0;
  return {
    hip: state.grounded ? stride * 0.65 * gait - landing * 0.28 : rising ? -0.55 : -0.2,
    knee: state.grounded ? recovery * 0.8 * gait + landing * 0.52 : rising ? 0.9 : 0.35,
    shoulder: state.grounded ? -stride * 0.5 * gait : rising ? -0.65 : -0.25,
    elbow: state.grounded ? -0.24 * gait : -0.75,
  };
}
