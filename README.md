# E-Source

Eine Arbeitsfläche, auf der beliebig viele Webseiten-Panels lückenlos nebeneinander liegen. Jedes Panel bekommt später eine eigene Lesezeichen-Sammlung und Tabs. Das Lastenheft mit allen Anforderungen (F-01 bis F-95) ist die verbindliche Grundlage.

## Stand

**Ausbaustufe 1: Grundgerüst und Kachel-Anordnung** (F-01 bis F-05, F-08, F-10 bis F-13)

- Panels füllen die Fläche immer lückenlos (Teilungsbaum, `web/src/workspace/tree.ts`).
- Pfeil-Griffe an allen vier Kanten und Ecken: Ziehen verschiebt die gemeinsame Kante, ein Nachbar wächst, der andere schrumpft.
- Panel an der Kopfzeile ziehen: auf die Mitte eines anderen Panels = tauschen, an dessen Rand = andocken, ganz an den Rand der Fläche = über die ganze Breite bzw. Höhe.
- Panels anlegen, schließen, umbenennen (Doppelklick auf den Namen oder ✎), tauschen per ⇄
- Voreingestellte Größen (▦), Maximieren, Splitscreen mit 2 oder 4 Panels, Esc führt zurück
- Bildschirmklassen mit Stapel für überzählige Panels
- Gleich verteilen, Wunsch-Anordnung merken, einzelnes Panel oder ganzes Layout zurücksetzen
- Alles wird vorerst nur im Browser gespeichert (localStorage, Schlüssel `esource.workspace.v4`)

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `web/` | Oberfläche: React, TypeScript, Vite |
| `server/` | Server: Java 21, Spring Boot (ab Stufe 3/4 mit PostgreSQL und Anmeldung) |
| `docs/uebergaben/` | Übergabedateien zwischen den Chats |

## Starten

Oberfläche:

```bash
cd web
npm install
npm run dev      # http://localhost:2910
npm test         # Tests der Raster-Logik
```

Server:

```bash
cd server
./mvnw test
./mvnw spring-boot:run   # http://localhost:8080/api/health
```
