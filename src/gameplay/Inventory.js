/** Small serializable inventory with explicit item IDs and atomic recipe spending. */
export class Inventory {
  constructor(itemIds) {
    if (
      !Array.isArray(itemIds) ||
      itemIds.length === 0 ||
      new Set(itemIds).size !== itemIds.length ||
      itemIds.some(
        (id) => typeof id !== "string" || !/^[a-z][a-z0-9_-]*$/i.test(id),
      )
    ) {
      throw new TypeError("Inventory requires unique, non-empty item IDs");
    }
    this.items = new Map(itemIds.map((id) => [id, 0]));
  }

  count(id) {
    return this.items.get(id) ?? 0;
  }

  add(id, amount = 1) {
    if (
      !this.items.has(id) ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(this.count(id) + amount)
    )
      return false;
    this.items.set(id, this.count(id) + amount);
    return true;
  }

  canAfford(recipe) {
    if (!isRecord(recipe)) return false;
    return Object.entries(recipe).every(
      ([id, amount]) =>
        this.items.has(id) &&
        Number.isSafeInteger(amount) &&
        amount >= 0 &&
        this.count(id) >= amount,
    );
  }

  spend(recipe) {
    if (!this.canAfford(recipe)) return false;
    for (const [id, amount] of Object.entries(recipe)) {
      this.items.set(id, this.count(id) - amount);
    }
    return true;
  }

  snapshot() {
    return Object.fromEntries(this.items);
  }

  restore(data) {
    if (
      !isRecord(data) ||
      Object.keys(data).length !== this.items.size ||
      !Object.entries(data).every(
        ([id, amount]) =>
          this.items.has(id) && Number.isSafeInteger(amount) && amount >= 0,
      )
    )
      return false;
    this.items = new Map(Object.entries(data));
    return true;
  }
}

function isRecord(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}
