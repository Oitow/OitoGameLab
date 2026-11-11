# Ein neues Spiel hinzufügen

Die Engine bleibt gemeinsam. Ein Spielmodul beschreibt seine Ziele, Ressourcen, Interaktionen und Fortschritte. Der Browser-Einstieg verbindet es mit Welt, Charakter und Darstellung.

## 1. Ein kleines Ziel festlegen

Zum Beispiel: „Sammle drei Zutaten und koche am Lagerfeuer.“ Definiere eine Aktion, ein sichtbares Ziel und einen Neustart. Beginne mit einer vollständig spielbaren Schleife, bevor du weitere Systeme einführst.

## 2. Modul erzeugen

Im Repository-Hauptverzeichnis:

```sh
node scripts/new-game.mjs herb-hunt "Kräutersuche"
```

Das erzeugt `games/herb-hunt/game.js` und eine README. Der Starter enthält ein erreichbares Testziel auf einfachen Welten: einen Kristall sammeln. Er prüft trockenen Boden für seine Zielposition; überprüfe für die endgültige Mechanik zusätzlich den Weg und Hindernisse.

Die Spiel-ID besteht aus Kleinbuchstaben, Ziffern und einzelnen Bindestrichen. Vorhandene Dateien werden niemals überschrieben. Der Generator ändert die Registrierung und andere Spiele nicht.

## 3. Spiel registrieren

Importiere den benannten Export `game` in `games/registry.js` mit einem eigenen lokalen Namen:

```js
import { game as herbHunt } from "./herb-hunt/game.js";
```

Ergänze `herbHunt` in der dortigen Liste der Spieldefinitionen. Verwende die zentrale Registrierung für die Spielauswahl; lege keine zweite unabhängige Liste in der Benutzeroberfläche an.

Danach lokal starten und den Modus öffnen:

```sh
npm run dev
```

`http://localhost:4173/play/?game=herb-hunt&seed=12345`

## 4. Vorhandene Systeme zusammensetzen

| Aufgabe                            | Wiederverwendbarer Baustein                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Gleiche Welt wiederherstellen      | `Terrain(seed)` und seine Höhen-/Begehbarkeitsabfragen                        |
| Laufen, Springen, Bodenkontakt     | `CharacterController` über `Session`                                          |
| Statische Weltobjekte              | `WorldLayout` und Kollisionsadapter                                           |
| Gegenstände zählen und verbrauchen | `Inventory` unter `src/gameplay/`                                             |
| Nahe Interaktionsziele auswählen   | Interaktionssystem unter `src/gameplay/`                                      |
| Taste oder Touch-Aktion auslösen   | Eingabe-Aktion über `Session`, keine DOM-Ereignisse im Spiel                  |
| Speichern                          | Spiel-eigene `snapshot()` / `restore(data)` innerhalb des Session-Spielstands |
| Objekte sichtbar machen            | Spielmarker und Renderer; keine Meshes als Spielzustand                       |

Das Beispiel `games/camp/game.js` zeigt Interaktion, Inventar und ein Bauziel. `games/scavenger/game.js` zeigt eine kleine Sammelmechanik ohne Aktionsknopf. Verwende ihre tatsächlichen APIs; kopiere nicht den Engine-Kern in deinen Spieleordner.

## 5. Zustand und Verträge sauber halten

Eine Definition exportiert `id`, `name` und `create(terrain)`. Die erzeugte Spielsitzung liefert `markers`, `collected`, `step(dt, player)` und `status()`; optionale `prompt(player)` und `interact(player)` ergänzen Aktionen.

- Marker-IDs sind stabil und eindeutig innerhalb einer Welt.
- Simulation nutzt Sekunden und Meter, Y nach oben, X/Z als Bodenebene.
- Generiere aus dem Welt-Seed; kein `Math.random()` für Spielregeln.
- Validierung darf beim Laden keine Teiländerungen hinterlassen. Prüfe alle Daten, bevor du den aktiven Zustand veränderst.
- Speichere nur JSON-Daten, keine DOM- oder Three.js-Objekte.
- `snapshot()` gibt unabhängige Daten zurück, damit Änderungen am gespeicherten Objekt das Spiel nicht verändern.
- Ein neues gemeinsames System braucht einen tatsächlichen Anwendungsfall und Verhaltenstests.

## 6. Prüfen und einreichen

```sh
npm test
npm run check
```

Ergänze Tests für Erreichen des Ziels, Interaktionsreichweite, doppelte Aktionen, gültige/ungültige Spielstände und reproduzierbare Weltziele. Prüfe danach alle vorhandenen Spiele im Browser:

- Hochformat 390×844 und Desktop; keine Konsolenfehler.
- Bewegung, Springen und Interaktion mit Tastatur und Touch.
- Menü, Pause, Fokusverlust und Fortsetzen.
- Neue Welt und Moduswechsel, gültige sowie beschädigte Spielstände.
- Sichtbares Ziel und nachvollziehbarer Gewinnzustand.

Screenshots und Browser-Emulation ersetzen keinen Test auf einem echten Android-Gerät. Aktualisiere `docs/STATUS.md` und öffne einen fokussierten Pull Request mit Ergebnis, Prüfungen und bekannten Grenzen.
