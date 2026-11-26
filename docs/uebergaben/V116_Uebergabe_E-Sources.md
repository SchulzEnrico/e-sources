# Übergabe V116 → V117 E-Sources

Stand: 26.11.2026 · Chat V116 (Enrico unterwegs, Claude allein weitergebaut) · Nächster Chat: **V117 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V117 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-220** („Gebaut V116“), **F-206 Schritt 10** (Absätze „Gebaut V115“ und „Gebaut V116“), **F-226**, **F-227** (Handbuch). Entscheidungs-Doc **Projekt-Desk** https://claude.ai/artifact/TnR2hhZUvPR3xTHAZiDmKg (PDF `docs/Arbeitspakete/F-206_V116_Projekt-Desk.pdf`) – **entschieden V116** (Option B, PD1–PD10, Lastenheft F-206 Schritt 10 „Projekt-Desk entschieden V116“), neu **F-230** Import/Export ohne Verlust. Weitere Docs: F-226 https://claude.ai/artifact/QxM6UPG6NFaAgkJwsb8EVy, F-228 https://claude.ai/artifact/UUvw5HtX9663ESsT4tS5my, F-222 https://claude.ai/artifact/MXgwEhtFcAJSLYc13zbZd8, Schritt 9/10 V96 https://claude.ai/artifact/B8bKXzxLhqACZrJ2T1gmgE, Datenmodell V98 https://claude.ai/artifact/7H8PyejdbccEeJzj3SrKXF, F-220 V100 https://claude.ai/artifact/JmywyHycJbBYnG8tfcccs5. **Termin Fr 04.12.2026**, Enricos Testphase ab 07.12. Leitlinien: **Trello**, **IPMA ICB4 / GPM-Leitfaden Z01D Rev. 09**, **MS Project / iTaskX**, Design und Anordnung an unsere UX/UI angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, kleine Punkte aus `V74_`–`V116_…` gelten weiter. **Handbuch** `docs/Handbuch/E-Sources_Handbuch.md` bei jeder Änderung mitführen. **Leitlinie neu (V116): Rangfolge 1. IPMA ICB4, 2. Funktionen von MS Project/iTaskX/Trello, 3. darauf aufbauend unsere Sicht und Verbesserungen.** Offen von Enrico: Rückmeldung zu Formularen Stufe 2, Bericht (PDF), Basisplan, Netzplan – aufnehmen, wenn er sie bringt; sonst „Nächste Schritte“ ab 1 **bauen**.

**Tests** (VM ist nach jedem Chat leer – neu anlegen):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in workspace persons stage noteSources gpm wheelOrder calendar resources; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
bash $HOME/vt2/run.sh
```

## Was in V116 passiert ist

`npx tsc --noEmit -p .` sauber. Tests: workspace 526, persons **18** (+1), stage 4, noteSources 1, gpm 43, **wheelOrder 5**, **calendar 4**, **resources 2** (neu) – alle grün.

1. **F-220 gebaut** (R1–R7): `workspace/wheelOrder.ts` (Nutzung 30 Tage, `arrange`, anheften/lösen/verschieben/belegen/automatisch, `setWheel`), Aktion `wheelPrefs`, Brücke `components/wheelPrefs.ts` (App meldet `ws.wheels`; Nutzung je Gerät `esource.wheelUse.v1`, Hinweis R6 einmal je Rad `esource.wheelHint.v1`), Bauteil `components/ArrangedWheel.tsx` = `ModeWheel` + ⋮ in der Hülle `Menu` (neu: `wrapClass`). `ModeWheel` hat neu `onMenu` (Rechtsklick, Umschalt+F10, Kontextmenü-Taste) und `onAltStep` (Alt+Pfeil). Eingebaut: Cockpit-Haupt-Rad (`cockpit`), Projekt-„Ansicht“ (`projectView`), Library-Rad (`library`). Nutzung friert beim Öffnen ein, eigene Änderungen wirken sofort; Meldung am Rad mit Rückgängig; Bildschirmleser hören die neue Reihenfolge. Feld `order` bleibt ungenutzt. Icon `pin`. Cockpit-Überlauf behält `.awheel`.
2. **Projekt-Desk entschieden** (Claude Doc, Kommentare Enrico): Option B – Desk an ein Projekt gebunden, **Projekt-Umschalter Pflicht**, Desk öffnet **immer das zuletzt geöffnete Projekt**, neue Notizen und Filter folgen dem gezeigten Projekt (PD1–PD10 im Lastenheft). Neu **F-230** Import/Export ohne Verlust (MSPDI-XML, Trello-JSON). Noch **nichts gebaut** – Bau 1–5 in V117.
3. **Ressourcen-Ansicht** (Rad „Ansicht“ jetzt 10: … Netzplan · **Ressourcen** · Risiken …): `workspace/resources.ts`, `components/ProjectResources.tsx` – Stunden je Ressource und KW gegen Kapazität, rot darüber, Vorgänge + Kapazitätszeile aufklappbar, „Vorgänge zeigen“, Klick öffnet Notiz, „Ohne Ressource“.
4. **Arbeitskalender (K7 Stufe 2):** `workspace/calendar.ts` (Feiertage je Bundesland inkl. Ostern-Rechnung, eigene freie Tage, `setCalendar` modulweit – App setzt ihn bei jedem Zeichnen wie `setNoticeMs`), `Workspace.calendar` (Format 11 bleibt), `schedule.ts`/`focusLoad.ts`/`capacityOn` beachten ihn, Gantt hinterlegt freie Tage (`.gt__off`). Steckbrief-Block `components/ProjectCalendar.tsx`. ColorGentlemen mit Hamburg: Ende 30.06.2027 wie im Report.
5. **Task-Limit je Projekt:** `Project.taskLimit` (Steckbrief „Allgemein“), `Ps.projectLimitOf`, `limitOf(ws, id, project)`; Nachfrage beim Zuweisen in `PersonChips` (zuerst Projekt-Limit).
6. Hilfe: „Rad nach Nutzung ordnen, anheften, belegen“, „Ressourcen im Projekt“, „Arbeitskalender und Feiertage“, „Task-Limit je Projekt“; Begriffe `resourceUse`, `workCalendar`, `taskLimitProject`; Handbuch 4 und 7 (Stand V116, Änderungsverzeichnis); Lastenheft F-220 und Schritt 10 „Gebaut V116“; `APP_VERSION = 'V116'`.

**Nicht im Browser gesehen:** Der Dev-Server ließ sich in diesem Chat nicht aus der VM starten (Start wurde abgelehnt). Alles oben ist nur über `tsc` und Tests geprüft – **in V117 als Erstes im eingebauten Browser ansehen** (Enrico startet ggf. `npm run dev` in `web/`), vor allem: ⋮ am Cockpit-Rad (Lage des Menüs, Meldung unter dem Rad, Überlauf im schmalen Cockpit), Ansicht „Ressourcen“ mit dem Beispielprojekt, Kalender-Block im Steckbrief.

## Nächste Schritte

1. **Browser-Blick** auf alles aus V116 (siehe oben), Kleinigkeiten nachbessern.
2. **Projekt-Desk bauen** (entschieden, Lastenheft F-206 Schritt 10 „Projekt-Desk entschieden V116“, Bau 1–5).
2a. Danach **F-230** Import/Export ohne Verlust: erst Entscheidungs-Doc (Regel Enrico), dann bauen.
3. **Tour „Projekte“** um Netzplan, Basisplan, Ressourcen und Arbeitskalender ergänzen (F-217), Tour „Feedback“ (F-221) noch offen.
4. Earned Value als Grafik (PV/EV/AC über die Zeit).
5. Kleine Punkte bis 04.12.: F-191 Bestätigen-Knöpfe in Dialogen prüfen, Hinweis R6 im Cockpit-Rad erst bei echtem Umsortieren testen.
6. **Prüfliste für Enrico** (alles aus V77–V115 plus):
   - Seite neu laden, dann `npm test` in `web/`.
   - Cockpit: ⋮ neben dem Haupt-Rad → „„Notizen“ anheften“ → Meldung am Rad mit „Rückgängig“; Nach vorn/hinten bzw. Alt+↑/↓ am Rad; „Rad belegen …“ blendet z. B. „Layouts“ aus (der letzte Eintrag lässt sich nicht ausblenden); „Automatisch ordnen“ aus/an; „Auf Werk zurück“. Rechtsklick und Umschalt+F10 am Rad öffnen dasselbe Menü. Nach einigen Tagen Nutzung: Cockpit öffnen → häufige Modi vorn, einmal Hinweis „Nach deiner Nutzung geordnet …“.
   - Dasselbe am Rad „Ansicht“ im Projekt-Modus und am Library-Rad „Sources · Notizen“.
   - Projekt-Modus › Ansicht › **Ressourcen** (Beispielprojekt): Wochen, rote Zellen, ▸ klappt auf, „Vorgänge zeigen“, Klick öffnet Notiz.
   - Steckbrief › „Arbeitskalender“: Feiertage „Hamburg“ → Gantt endet am 30.06.2027, Feiertage grau hinterlegt mit Tooltip; „+ Freier Tag“, ×, „Rückgängig“. Wieder auf „keine“ → 22.06.
   - Steckbrief › „Task-Limit je Person“ = 1, dann einer Person zwei Aufgaben im Projekt zuweisen → Nachfrage „… in diesem Projekt schon 1 von 1 …“.

## Kleine Punkte (neu in V116)

- Der Arbeitskalender ist bewusst **ein** Kalender für alle Projekte (modulweiter Zustand in `calendar.ts`). Tests, die Feiertage brauchen, setzen ihn mit `Cal.setCalendar(…)` und stellen ihn im `finally` zurück.
- `ArrangedWheel` liest die Prefs über `useSyncExternalStore`; beim allerersten Zeichnen sind sie noch leer und kommen im nächsten Frame (App setzt sie im `useLayoutEffect`).
- Ein ausgeblendeter Eintrag bleibt sichtbar, solange er gewählt ist (Touren und Kurzbefehle greifen über die Id).
- Neue Arbeitsregeln Enrico (V116): Ändert er in einem Doc etwas, werden alle abhängigen Stellen mitgezogen; „io“ (auch „iO“, „oi“) heißt: Rest des Dokuments anpassen und mit den Vorschlägen vorausfüllen. Nach jeder Doc-Änderung das PDF in `docs/Arbeitspakete/` erneuern.
- Der Dev-Server ließ sich aus der VM nicht starten – für den Browser-Blick Enrico bitten, `npm run dev` in `web/` zu starten.

## Commit-Text V116 (e-sources)

**Summary:** `V116: Umschalt-Räder nach Nutzung ordnen und anheften (F-220), Ressourcen-Ansicht, Arbeitskalender mit Feiertagen, Task-Limit je Projekt`

**Description:**
```
- F-220: Cockpit-Rad, Projekt-„Ansicht“ und Library-Rad ordnen sich nach Nutzung der letzten 30 Tage; ⋮/Rechtsklick/Umschalt+F10: anheften, lösen, nach vorn/hinten (Alt+Pfeil), Rad belegen, automatisch ordnen, auf Werk zurück – Meldung am Rad mit Rückgängig
- F-206 Schritt 10: neue Ansicht Ressourcen (Stunden je Ressource und Woche gegen Kapazität, Vorgänge aufklappbar)
- Arbeitskalender (K7): Feiertage nach Bundesland, eigene freie Tage, im Gantt hinterlegt; Beispielprojekt endet mit Hamburg am 30.06.2027
- Task-Limit je Person im Projekt mit Nachfrage beim Zuweisen
- Projekt-Desk entschieden (PD1–PD10, Option B mit Projekt-Umschalter), neu F-230 Import/Export ohne Verlust, Rangfolge ICB4 → andere Anwendungen → eigene Verbesserungen; Hilfe, Begriffe, Handbuch V116, Lastenheft, Tests wheelOrder/calendar/resources, Übergabe V116

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5y5oHcQ5E4f3AFcDi
```
