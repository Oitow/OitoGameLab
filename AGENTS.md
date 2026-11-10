# OitoGameLab

## Geltungsbereich

- Entwickle OitoEngine unter `engine/`. Änderungen in `prototypes/island-explorer/` brauchen einen eigenen Auftrag.
- Die Engine läuft als native JavaScript-Module mit Three.js per Import Map auf GitHub Pages. Erhalte den Einstieg `engine/index.html` und relative Projektpfade. Neue Abhängigkeiten und Build-Schritte brauchen einen konkreten Grund.
- Android im Hochformat ist die primäre Zielplattform. Erhalte Touch-Joystick und Sprungtaste sowie WASD, Pfeiltasten und Leertaste auf Desktop.

## Ein Auftrag, ein Pull Request

1. Prüfe den aktuellen Stand von `main`, die offenen PRs und [die Roadmap](engine/ROADMAP.md). Vermeide doppelte Arbeit und nenne einen benötigten Vorgänger-PR im neuen PR.
2. Starte vom aktuellen `main` oder vom benötigten Vorgänger-Branch. Halte jeden PR auf ein spielbares Ziel beschränkt.
3. Halte `src/main.js` als Einstieg und Verbindung der Module schlank. Spiellogik gehört zum zuständigen Modul. Wiederverwendbare Engine-Logik und Demo-Inhalte erhalten getrennte Zuständigkeiten, sobald es konkrete Aufrufer dafür gibt.
4. Prüfe den Diff und die Syntax geänderter JS-Dateien. Starte die Demo über HTTP und prüfe bei Änderungen am Laufzeitverhalten den betroffenen Ablauf im Browser, sofern verfügbar.
5. Eröffne einen Draft-PR mit konkreten Spieltest-Schritten, Testergebnissen und offenen Punkten. Markiere Geräte- oder Browsertests, die ausstehen. Der Repo-Inhaber entscheidet über den Merge, sofern er ihn nicht ausdrücklich beauftragt.

## Prüfungen

- `git diff --check`
- Für geänderte JS-Dateien: `node --input-type=module --check < PFAD_ZUR_DATEI`
- HTTP-Start und Spieltest stehen in [engine/README.md](engine/README.md).
- Aktualisiere die betroffene Dokumentation, wenn sich Bedienung, Einstieg oder ein Roadmap-Schritt ändert.
