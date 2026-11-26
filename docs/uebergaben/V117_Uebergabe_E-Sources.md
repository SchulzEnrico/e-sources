# Übergabe V117 → V118 E-Sources

Stand: 26.11.2026 · Chat V117 · Nächster Chat: **V118 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V118 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 10** (Absätze „Gebaut V116“ und „Gebaut V117“), **F-230**, **F-226**, **F-227** (Handbuch). Entscheidungs-Doc **F-230 Import/Export ohne Verlust** https://claude.ai/artifact/G7tBqH9dJ3MR2WCAjSLLcj (PDF `docs/Arbeitspakete/F-230_V117_Import-Export.pdf`) – **Antwort Enrico offen** (F1–F10, Vorschlag Option C). Projekt-Desk-Doc https://claude.ai/artifact/TnR2hhZUvPR3xTHAZiDmKg (entschieden V116, **gebaut V117**). Weitere Docs: F-226 https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy, F-228 https://claude.ai/artifact/UUvw5HtX9663ESsT4tS5my, F-222 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8, Datenmodell V98 https://claude.ai/artifact/7H8PyejdbccEeJzj3SrKXF. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. unsere Sicht und Verbesserungen**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V117_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. Offen von Enrico: Antwort im Doc F-230; Rückmeldung zu Formularen Stufe 2, Bericht (PDF), Basisplan, Netzplan, Projekt-Desk – aufnehmen, wenn er sie bringt; sonst „Nächste Schritte“ ab 1 **bauen**.

**Tests** (VM ist nach jedem Chat leer – neu anlegen):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in workspace persons stage noteSources gpm wheelOrder calendar resources deskProject; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```
**Browser:** Enrico startet `npm run dev` in `web/`; der eingebaute Browser erreicht dann **http://localhost:2910/** (in V117 ging das). Beispielprojekt: ⚙ (Kopfleiste › Einstellungen) › „Beispielprojekt „ColorGentlemen“ anlegen“.

## Was in V117 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons 18, stage 4, noteSources 1, gpm 43, wheelOrder 5, calendar 4, resources 2, **deskProject 6** (neu) – alle grün.

1. **Browser-Blick auf V116** (eingebauter Browser, 1024 × 768 und schmal): ⋮ am Projekt-„Ansicht“-Rad, Anheften mit Meldung am Rad, Ressourcen-Ansicht, Arbeitskalender im Steckbrief, Task-Limit-Feld – in Ordnung. **Nachgebessert:**
   - ⋮ am **Cockpit-Rad** schloss das Cockpit (Fokus wanderte ins Menü-Portal) → `Overview.onBlur` lässt `.menu__list` zu.
   - **ModeWheel:** Scrollen ohne Bedienung (verstecktes Rad in der Überlauf-Leiste wird sichtbar, steht auf 0) stellte den Wert um – der Desk sprang beim Laden von „Projekte“ auf „Desk“. Jetzt zählt nur Scrollen nach Rad/Maus/Finger/Taste (`touched`, 2,5 s), sonst stellt sich das Rad zurück.
   - Ressourcen-Zellen auf **eine Nachkommastelle** (genau im Tooltip).
   - `initialsOf` ohne Anrede, Rolle nach „ – “ und Klammern: „Fr. Stanczak – … (CG)“ → „S“ statt „F(“ (Test +3 Erwartungen).
2. **Projekt-Desk gebaut (Bau 1–5, PD1–PD9)** – Einzelheiten im Lastenheft „Gebaut V117“, Handbuch 7.2:
   - Logik `workspace/deskProject.ts`, Daten `Workspace.deskProjects` (Desk-Id → `{ project, assign? }`), `Project.accent`.
   - ⋮ neben dem Desk-Namen (`DeskProjectMenu`), Pflicht-Umschalter im Projekt-Modus (`DeskProjectBar`), „Nur … · Alles zeigen“ (`ScopeNote`) in Suche, Library-Notizen (Cockpit) und Fokus, „Eigener Desk“ im Steckbrief, Rad „Farbe (Desk)“.
   - Neue Notizen bekommen auf gebundenem Desk das gezeigte Projekt (in `createNote`, modulweit wie der Kalender). Im Browser geprüft: Notiz im neuen Pad trägt „ColorGentlemen“; Suche zeigt „Nur „ColorGentlemen“ · Alles zeigen“; Zurück zu …; Neuladen öffnet das zuletzt gezeigte Projekt; „Eigener Desk“ legt „ColorGentlemen“-Desk an (Popup im Browserfenster blockiert → Desk hier gezeigt).
3. **Tour „Projekte“** um Gantt/Basisplan, Netzplan, Ressourcen, Arbeitskalender, Projekt-Desk ergänzt (Test angepasst).
4. **F-230 Entscheidungs-Doc** angelegt (Optionen A–D, Vorschlag C, Feld-Zuordnung, F1–F10, Bauplan), PDF abgelegt.
5. Hilfe „Projekt-Desk“, Begriff `projectDesk`, Handbuch V117 (7.2, Änderungsverzeichnis), Lastenheft, `APP_VERSION = 'V117'`.

## Nächste Schritte

1. **F-230:** Antwort Enrico im Doc abwarten (bei „io“ Vorschläge übernehmen, alle abhängigen Stellen mitziehen, PDF erneuern), dann ins Lastenheft und **bauen** nach Bauplan 1–4 (MSPDI) bis 04.12.
2. **Earned Value als Grafik** (PV/EV/AC über die Zeit; dataviz-Regeln).
3. Kleine Punkte bis 04.12.: F-191 Bestätigen-Knöpfe in Dialogen prüfen; Hinweis R6 im Cockpit-Rad; Meldung „Rad belegen“ liegt unter der offenen Menü-Seite (erst nach dem Schließen lesbar) – ggf. Menü-Seite versetzen; Seite 2 des Rad-Menüs springt seitlich (Position neu berechnen); Meldungen „Desk Mode: …“/„Projekte: …“ und „Beispielprojekt angelegt“ stehen noch unten statt am Ort (#perfekte Fokussierung).
4. Tour „Feedback“ (F-221) noch offen.
5. **Prüfliste für Enrico** (alles aus V77–V116 plus):
   - Seite neu laden, dann `npm test` in `web/`.
   - Cockpit öffnen → ⋮ neben dem Rad: Menü öffnet, **Cockpit bleibt offen**.
   - Desk in „Projekte“ stellen, Seite neu laden → bleibt in „Projekte“.
   - Projekt-Modus › Ressourcen: Initialen „S“, „L“, „M“, „K“, Zellen mit einer Nachkommastelle.
   - ⋮ neben „Main Desk“ › „An Projekt binden …“ › ColorGentlemen → Meldung am ⋮ mit „Rückgängig“; Kopf zeigt „Main Desk · ColorGentlemen“.
   - Steckbrief › „Farbe (Desk)“ z. B. Goldgelb → Akzentfarbe des Desks wechselt.
   - „+ Projekt“ anlegen → oben Rad „Projekt“, „Zurück zu „ColorGentlemen““, „An dieses Projekt binden“; Liste zeigt nur das gezeigte Projekt.
   - Neues Pad › Neue Notiz → Chip „ColorGentlemen“ an der Notiz. ⋮ › „Neue Notizen … zuordnen“ aus → nächste Notiz ohne Projekt.
   - Suche „Projekt“ → rechts in der Chip-Zeile „Nur „ColorGentlemen“ · Alles zeigen“; Cockpit › Library › Notizen und Cockpit › Personen (Fokus) ebenso.
   - Steckbrief › „Eigener Desk“ → neues Fenster „ColorGentlemen“ im Projekt-Modus; daneben „2 Desks gehören zu diesem Projekt“.
   - Projekt löschen, das an einen Desk gebunden ist → Meldung „… Der Desk dazu bleibt und ist jetzt ungebunden.“ → „Rückgängig“ bindet wieder.
   - Tour „Projekte“ im Steckbrief starten → Schritte Gantt/Basisplan, Netzplan, Ressourcen, Arbeitskalender, Projekt-Desk.

## Kleine Punkte (neu in V117)

- `deskProject.ts` importiert bewusst nichts aus `projects.ts`/`notes.ts` (`notes.ts` liest `newNoteProject` – sonst Importkreis).
- PD4/PD5 wirken über modulweiten Zustand (`setDeskScope` in `DeskApp` bei jedem Zeichnen). Tests setzen ihn mit `Dp.setDeskScope({...})` und stellen im `finally` mit `Dp.setDeskScope({})` zurück.
- Begrenzung PD5 gilt genau für das gezeigte Projekt (Unterprojekte nicht mitgezählt) – bei Bedarf erweitern.
- „Alles zeigen“ wird über das Ereignis `esource:deskscope` an die App gemeldet (`Dp.toggleShowAll`).
- `windowName` liefert für gebundene Desks den Projektnamen – überall (Cockpit, Desk wechseln, Fenstertitel). `nextWindowName` zählt weiter über die gespeicherten Desk-Namen.
- Ein ModeWheel nimmt Scrollen nur noch an, wenn innerhalb von 2,5 s eine Bedienung (Rad, Zeiger, Finger, Taste, `roll`) war.
- Docs: kein `open` im Artifact-Werkzeug – Link im Chat nennen. PDF-Export: `mcp__Claude_Docs__export` liefert JSON mit base64 → in `/mnt/user-data/outputs/` dekodieren, mit `device_commit_files` nach `docs/Arbeitspakete/` (gitignore).

## Commit-Text V117 (e-sources)

**Summary:** `V117: Projekt-Desk (an Projekt binden, Umschalter, eigene Desks, Projektfarbe, nur gezeigtes Projekt), Tour Projekte erweitert, Nachbesserungen aus dem Browser-Blick, Entscheidungs-Doc F-230`

**Description:**
```
- Projekt-Desk (F-206 Schritt 10, PD1–PD9): ⋮ neben dem Desk-Namen bindet an ein Projekt und löst; „Eigener Desk“ im Steckbrief legt einen gebundenen Desk in eigenem Fenster an; Pflicht-Umschalter „Projekt“ im Projekt-Modus mit „Zurück zu …“ und „An dieses Projekt binden“; Desk trägt Name und Farbe des Projekts (neu „Farbe (Desk)“); neue Notizen bekommen das gezeigte Projekt; Suche, Library-Notizen und Fokus zeigen nur dieses („Alles zeigen“); Projekt gelöscht → Desk ungebunden, Rückgängig bindet wieder; zuletzt gezeigtes Projekt je Gerät
- Nachgebessert: ⋮ am Cockpit-Rad schließt das Cockpit nicht mehr; Umschalt-Räder stellen sich beim Laden nicht mehr von selbst um (Desk sprang auf „Desk“); Ressourcen-Zellen mit einer Nachkommastelle; Initialen ohne Anrede und Rolle
- Tour „Projekte“ um Gantt/Basisplan, Netzplan, Ressourcen, Arbeitskalender und Projekt-Desk ergänzt
- F-230 Import/Export ohne Verlust: Entscheidungs-Doc (Optionen A–D, Feld-Zuordnung, Fragen F1–F10)
- Hilfe, Begriff, Handbuch V117 (7.2), Lastenheft, Tests deskProject, Übergabe V117

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q6pHz7fyyBjbpqKS5C
```
