# E-Source

Eine Arbeitsfläche, auf der beliebig viele Webseiten-Fenster nebeneinander im Raster liegen. Jedes Fenster bekommt später eine eigene Lesezeichen-Sammlung und Tabs. Das Lastenheft mit allen Anforderungen (F-01 bis F-95) ist die verbindliche Grundlage.

## Stand

**Ausbaustufe 1: Grundgerüst und Raster** (F-01 bis F-05, F-10 bis F-13)

- Fenster liegen im Kachel-Raster ohne Überlappung. Nachbarn weichen aus und wachsen wieder zurück.
- Fenster anlegen, schließen, umbenennen (Doppelklick auf den Namen oder ✎)
- Verschieben (an der Kopfzeile ziehen) und Tauschen (⇄, dann Ziel-Fenster anklicken)
- Größe am Rand oder an der Ecke ziehen, dazu voreingestellte Größen (▦)
- Maximieren, Splitscreen mit 2 oder 4 Fenstern, Esc führt zurück
- Gleich verteilen, Wunsch-Anordnung merken, einzelnes Fenster oder ganzes Layout zurücksetzen
- Alles wird vorerst nur im Browser gespeichert (localStorage)

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `web/` | Oberfläche: React, TypeScript, Vite, react-grid-layout |
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
