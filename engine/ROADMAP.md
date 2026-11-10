# OitoEngine Roadmap

| Reihenfolge | Aufgabe | Fertig, wenn |
| --- | --- | --- |
| 1 | Charakteranimation im Spiel prüfen ([PR #1](https://github.com/Oitow/OitoGameLab/pull/1)) | Gehen, Sprung, Landung und Reset wirken bei Touch- und Tastatursteuerung stimmig. |
| 2 | Baumkollisionen prüfen und integrieren ([PR #2](https://github.com/Oitow/OitoGameLab/pull/2)) | Direkte Anläufe stoppen, schräge Anläufe gleiten vorbei und eine neue Insel hat einen freien Startpunkt. |
| 3 | Kleinen Bewegungsparcours ergänzen | Ein reproduzierbarer Startbereich enthält ein niedriges Hindernis und einen schmalen Durchgang zum Testen von Sprung und Bewegung. |
| 4 | Wiederverwendbarkeit an einer zweiten kleinen Szene prüfen | Beide Szenen nutzen denselben Game Loop und dieselbe Eingabeschicht. Der Szeneninhalt ist separat definiert. |

PR #1 ist gemergt. Der visuelle Spieltest kann über die veröffentlichte Demo erfolgen, sobald der Stand auf GitHub Pages sichtbar ist. PR #2 ist der laufende Implementierungsschritt. Danach jeweils den nächsten überprüfbaren Schritt als eigenen PR umsetzen.
