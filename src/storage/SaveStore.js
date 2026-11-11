const CURRENT_KEY = "oito.save.v2";
const LEGACY_KEY = "oito.save.v1";

/** Storage adapter. Inject a storage-compatible object for tests or another host. */
export class SaveStore {
  constructor(storage) {
    this.storage = storage;
  }
  save(session) {
    this.storage.setItem(CURRENT_KEY, JSON.stringify(session.snapshot()));
  }
  load(definitions, createSession) {
    const raw =
      this.storage.getItem(CURRENT_KEY) ?? this.storage.getItem(LEGACY_KEY);
    if (!raw || raw.length > 100000)
      throw new Error("Kein gültiger Spielstand gefunden.");
    const data = JSON.parse(raw);
    if (
      !data ||
      !definitions.has(data.game) ||
      !Number.isInteger(data.seed) ||
      data.seed < 0 ||
      data.seed > 4294967295
    )
      throw new Error("Ungültiger Spielstand.");
    const candidate = createSession(definitions.get(data.game), data.seed);
    if (!candidate.restore(data)) throw new Error("Ungültiger Spielstand.");
    return candidate;
  }
}
