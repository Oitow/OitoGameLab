# OitoGameLab

Mehrere kleine Browser-Spiele, eine gemeinsame modulare Grundlage. Mobile-first, Android und Hochformat; Desktop mit WASD und Leertaste.

**Neustart: OitoEngine 0.4.** Zwei Beispielspiele nutzen dieselben Systeme: Freies Erkunden und Kristallsuche. Weltgenerierung, Charakter-Simulation, Rendering, Eingabe und Spielregeln sind getrennt.

[Spielplatz](https://oitow.github.io/OitoGameLab/play/) · [Frühere Engine-Demo](https://oitow.github.io/OitoGameLab/engine/) · [Island Explorer](https://oitow.github.io/OitoGameLab/prototypes/island-explorer/)

Neue Links werden nach Merge und erfolgreicher Pages-Veröffentlichung verfügbar.

## Lokal starten

Node.js 22+, keine Paketinstallation nötig:

```sh
npm run dev
npm test
npm run check
```

Dann http://localhost:4173/play/ öffnen. Three.js wird in festgelegter Version vom CDN geladen; eine Internetverbindung ist nötig.

## Struktur

| Pfad                   | Verantwortung                                        |
| ---------------------- | ---------------------------------------------------- |
| `src/core`             | Session, feste Simulationsschritte, Spielstand-Daten |
| `src/world`            | Deterministische Weltgenerierung                     |
| `src/character`        | Bewegung, Springen, Bodenkontakt                     |
| `src/input`            | Touch und Tastatur → Aktionen                        |
| `src/render`           | Three.js, Meshes, Kamera, Animation                  |
| `games`                | Eigenständige Spielregeln, gemeinsame Engine         |
| `play`                 | Spielauswahl, Browser-Lifecycle, Speichern/Laden     |
| `tests`                | Verhaltenstests ohne Browser oder GPU                |
| `.github`              | CI, Agenten-Anweisungen, Issue-/PR-Vorlagen          |
| `engine`, `prototypes` | Unveränderte ältere Experimente                      |

## Weiterarbeiten

Zuerst [Status](docs/STATUS.md), [Architektur](docs/ARCHITECTURE.md), [Workflow](docs/WORKFLOW.md) und [Agenten-Regeln](AGENTS.md) lesen. Neue Spiele werden als Module unter `games/` hinzugefügt. Gemeinsam genutzte Systeme bleiben im Engine-Kern.

Agenten-Dateien beschreiben Rollen und Qualitätsregeln; sie starten keine selbstständig arbeitenden Hintergrund-Agenten. Dieses Fundament ist bewusst klein: echte Objektphysik, Inventar, NPCs und Streaming sind weitere Schritte.
