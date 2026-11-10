# OitoEngine v0.1

Modulares, leichtgewichtiges 3D-Engine-Fundament für Mobile-Portrait-Spiele.

## Live-Demo

https://oitow.github.io/OitoGameLab/engine/

## Start

Öffne die Live-Demo über GitHub Pages. Alternativ lokal über einen HTTP-Server ausliefern (ES-Module funktionieren nicht zuverlässig über file://). Internetverbindung zum Laden von Three.js über CDN erforderlich.

## Module

- `src/core/Engine.js` – Three.js-Renderer, Scene, Game Loop, FPS
- `src/world/World.js` – deterministische prozedurale Insel, Terrain-Abfrage
- `src/character/Character.js` – Platzhalter-Figur, Bewegung und Bodenkontakt
- `src/input/Input.js` – Touch-Joystick und Tastatur
- `src/camera/CameraRig.js` – Kamera-Follow
- `src/main.js` – Initialisierung und Verbindung aller Systeme

## Steuerung

Android: linker virtueller Joystick. Desktop: WASD oder Pfeiltasten. `Neue Insel` erzeugt einen neuen Seed.

## Designentscheidungen

- Eine Terrain-Mesh-Geometrie statt tausender Einzelobjekte.
- Vertex-Farben statt Texturen.
- Begrenzte Pixelratio (max. 1.5), kein Antialiasing.
- Zeitbasierte Bewegung mit begrenztem Delta.
- Module ohne Build-Schritt; Three.js via Import Map.
- Alte Demo `prototypes/island-explorer/` bleibt unangetastet.

## Bekannte Grenzen

- Kein Springen, keine Objektkollisionen oder Animation.
- Wasser ist eine einfache Ebene.
- Der FPS-Zähler ist ein grober Indikator; Geräteprofiling folgt später.
- Die Demo wurde noch nicht auf einem echten Android-Gerät verifiziert.
