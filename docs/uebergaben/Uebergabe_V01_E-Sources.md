# Übergabe V01 → V02 E-Sources

Stand: 20.11.2026 · Chat V01 (Planung) abgeschlossen · Nächster Chat: **V02 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V02 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **Ausbaustufe 1: Grundgerüst und Raster**. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindliche Grundlage):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8
- **Altes Projekt (nur als Referenz):** Mac-Ordner `~/Desktop/Bootcamp/projects/CapstoneProject/esource`, GitHub `SchulzEnrico/ESourc-es-`
- **Neues Repository:** https://github.com/SchulzEnrico/e-sources (Public, nur README, keine Lizenz, keine .gitignore). Geklont nach `~/Projects/e-sources`.

## Was in V01 entschieden wurde

- **Neubau.** Der alte Code (Spring Boot 3.2 + MongoDB + React, feste Panel-Aufteilung) wird nicht weiterverwendet. Er dient nur als Ideengeber.
- **Konzept:** Fenster-Arbeitsfläche als Kachel-Raster ohne Überlappung. Jedes Fenster ist ein „Browser im Browser“ mit eigener Lesezeichen-Sammlung (Menü) und Tabs. Dazu kommt eine schwebende Ablage für Seiten, die sich nicht einbetten lassen. Außerdem Layouts, Szenarien, Fenstergruppen, Fokus-Modus mit Timern, Hilfe für Neulinge. Details mit Nummern F-01 bis F-95 und NF-01 bis NF-05 stehen im Lastenheft.
- **Technik:** Server mit Java 21 und Spring Boot, dazu Spring Security (E-Mail sowie GitHub, Apple und Google) und PostgreSQL. Oberfläche mit React, TypeScript, Vite und react-grid-layout. Desktop-App mit Electron und SQLite (zeigt auch gesperrte Seiten). Eigene Synchronisierung mit Löschmarken, bei Konflikten gewinnt die neueste Änderung.
- **Plattformen:** Desktop-App (Mac/PC), Web-App, Smartphone als installierbare Web-App. App-Stores sind perspektivisch geplant.
- **Name:** „E-Source“ (E und S = Enrico Schulz). Chats heißen „Vxx E-Sources“.
- **Instagram-Anmeldung:** gestrichen (Meta bietet sie für normale Apps nicht mehr an).
- **Noch offen (bis Stufe 8):** Wo läuft der Server und wer trägt die Kosten? Kommt ein Apple-Entwicklerkonto? Während der Entwicklung läuft der Server lokal auf dem Mac.

## Technische Rahmenbedingungen

- In Claudes Arbeitsumgebung sind Paket-Downloads (Maven Central, npm) **gesperrt**. Den Java-Code kann Claude schreiben, aber nicht selbst bauen. Gebaut und getestet wird auf Enricos Mac (`./mvnw test`, `npm install`, `npm run dev`). Alternative: Paket-Installationen in den Netzwerkeinstellungen erlauben; die Änderung gilt erst in einem neuen Chat.
- Vorhanden: in der Cloud Java 21 und Gradle, in der Mac-Arbeitsumgebung Node 22.
- **Enricos Mac (geprüft am 20.11.2026):** Java 21.0.2, Node 24.22.3 (über Homebrew, umgestellt von 21.7.1), Git 2.44, Docker 25.0.3, Homebrew aktuell, oh-my-zsh aktualisiert. Das Repository wird nach `~/Projects/e-sources` geklont.
- Ordnerzugriff: Projektordner in der Claude-Desktop-App über **+ → „Add folder“** verbinden. Hinweis: Dateien, die tiefer als 7 Ordnerebenen liegen, kann Claude nicht direkt übertragen. Das betrifft Java-Pakete. Claude liest und schreibt sie deshalb über die Shell auf dem Mac.

## Nächster Schritt: Ausbaustufe 1 (F-01 bis F-13)

1. ~~Repository anlegen und klonen~~: erledigt in V01. Enrico verbindet `~/Projects/e-sources` im Chat V02 über **+ → „Add folder“**.
2. ~~Werkzeuge auf dem Mac prüfen~~: erledigt in V01, siehe oben.
3. Claude legt die Grundstruktur an: `server/` (Spring Boot), `web/` (React), `docs/` (Übergaben), README.
4. Claude baut das Raster: Fenster anlegen, schließen, benennen, verschieben, tauschen, Größe ändern, maximieren, Splitscreen, Wunsch-Anordnung zurücksetzen. Zunächst wird alles lokal im Browser gespeichert.
5. Zum Abschluss: testen, committen, Übergabe V02 → V03.

## Arbeitsregeln

- **Funktion vor Design.**
- **Lastenheft ist die Grundlage:** Neue Wünsche kommen dort mit Nummer hinein, bevor sie gebaut werden.
- **Übergaberegel:** Übergabe nach jeder abgeschlossenen Ausbaustufe, spätestens bei geschätzt 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe. Claude kündigt die Übergabe vorher an.
- **Übergabedatei:** heißt „Übergabe Vxx E-Sources“ und wird im Repository unter `docs/uebergaben/` abgelegt.
