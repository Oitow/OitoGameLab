/** Pure proximity query. Eligibility and the resulting action belong to the game. */
export class InteractionSystem {
  constructor({ range = 1.8, maxHeightDifference = 1.3 } = {}) {
    if (
      !Number.isFinite(range) ||
      range <= 0 ||
      !Number.isFinite(maxHeightDifference) ||
      maxHeightDifference < 0
    ) {
      throw new RangeError(
        "Interaction distances must be finite and non-negative",
      );
    }
    this.range = range;
    this.maxHeightDifference = maxHeightDifference;
  }

  nearest(player, targets, isAvailable = () => true) {
    if (!player || ![player.x, player.y, player.z].every(Number.isFinite))
      return null;
    let nearest = null;
    let distance = Infinity;
    for (const target of targets) {
      const floor = target.groundY ?? target.y;
      if (
        ![target.x, target.z, floor].every(Number.isFinite) ||
        !isAvailable(target)
      )
        continue;
      if (Math.abs(player.y - floor) > this.maxHeightDifference) continue;
      const candidateDistance = Math.hypot(
        player.x - target.x,
        player.z - target.z,
      );
      if (candidateDistance > this.range) continue;
      if (
        candidateDistance < distance ||
        (candidateDistance === distance && target.id < nearest.id)
      ) {
        nearest = target;
        distance = candidateDistance;
      }
    }
    return nearest;
  }
}
