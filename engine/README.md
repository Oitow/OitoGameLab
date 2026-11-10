# OitoEngine

Modulares, leichtgewichtiges 3D-Engine-Fundament für Mobile-Portrait-Spiele.

## Live-Demo

https://oitow.github.io/OitoGameLab/engine/

## Start

Starte im Repository-Ordner einen lokalen HTTP-Server:

```sh
python3 -m http.server 8000
```

Öffne [die lokale Demo](http://localhost:8000/engine/). Three.js wird über ein CDN geladen.

## Module

- `src/core/Engine.js` – Three.js-Renderer, Scene, Game Loop, FPS
- `src/world/World.js` – deterministische prozedurale Insel, Terrain-Abfrage
- `src/world/WorldObjects.js` – prozedurale Vegetation als Instanzen
- `src/character/Character.js` – Bewegung, Sprung und prozedurale Gelenkanimation
- `src/input/Input.js` – Touch-Joystick und Tastatur
- `src/camera/CameraRig.js` – Kamera-Follow
- `src/main.js` – Initialisierung und Verbindung aller Systeme

## Steuerung

- Android verwendet den virtuellen Joystick und die Sprungtaste.
- Desktop verwendet WASD oder Pfeiltasten und die Leertaste.
- **Neue Insel** erzeugt einen neuen Seed und setzt Figur und Kamera zurück.

## Spieltest

1. Demo laden und prüfen, ob Gelände, Figur und FPS-Anzeige sichtbar sind.
2. Mit Joystick oder Tastatur geradeaus und diagonal laufen. Eingabe loslassen und den Stillstand prüfen.
3. Aus dem Stand und während der Bewegung springen. Landung und Kameraführung prüfen.
4. **Neue Insel** wählen und Startpunkt, Kamera und Eingabe erneut prüfen.

Die [Roadmap](ROADMAP.md) führt die nächsten Aufgaben. Die [Beitragsregeln](../AGENTS.md) beschreiben den PR-Ablauf.

## Designentscheidungen

- Eine Terrain-Mesh-Geometrie statt tausender Einzelobjekte.
- Vertex-Farben statt Texturen.
- Begrenzte Pixelratio (max. 1.5), kein Antialiasing.
- Zeitbasierte Bewegung mit begrenztem Delta.
- Module ohne Build-Schritt; Three.js via Import Map.
- Alte Demo `prototypes/island-explorer/` bleibt unangetastet.

## Bekannte Grenzen

- Baumkollisionen werden separat in [PR #2](https://github.com/Oitow/OitoGameLab/pull/2) entwickelt.
- Wasser ist eine einfache Ebene.
- Der FPS-Zähler ist ein grober Indikator; Geräteprofiling folgt später.
- Die Demo wurde noch nicht auf einem echten Android-Gerät verifiziert.
