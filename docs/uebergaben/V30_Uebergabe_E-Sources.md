# Übergabe V30 → V31 E-Sources

Stand: 22.11.2026, Abend · Chat V30 abgeschlossen · Nächster Chat: **V31 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V31 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Im Farben-Block sind F-161 und F-162 fertig; als Nächstes kommt **F-163** Farbregeln (danach F-164, F-171 Stufe 2, zusammen mit **F-183** Icons). Lies vorher F-163, F-164 und F-183 und kläre mit Enrico die offenen Punkte von F-163 („Noch zu bestätigen“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (160 Einträge: **95 fertig, 13 teilweise, 1 ersetzt, 51 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-185)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V30 passiert ist

- V29 war schon committet (e8c6f88).
- **F-161 ✓ – Farben je Desk** (Entscheidung Enrico: Desk folgt dem Main Desk, bis er eigene Farben bekommt)
  - `types.ts`: `Workspace.deskLooks?: Record<winId, Look>`; Main Desk bleibt `ws.look`.
  - `look.ts`: `lookOf(ws, win)`, `hasOwnLook`, `setDeskLook` (Main → setLook, Zusatz-Desk → eigener Eintrag), `followMainLook`, `parseDeskLooks`; `LOOK_DEFAULT.theme` jetzt **'system'** (neue Nutzer).
  - `windows.syncWindows` entfernt Farben weggefallener Desks; `storage` liest sie (nur bekannte Desks).
  - Reducer: `look` mit `win`, neu `followMainLook`.
  - App: jedes Fenster wendet `lookOf(ws, win)` an. Dialog „Design anpassen · Für <Desk>“ mit Zeile `.design__scope` (folgt / eigene Farben) und Knopf „Wie Main Desk“ (Fokus danach auf erste Wahl). Desk-Umschalter: Farbpunkt `.desk-swatch` (aria-hidden) und „· eigene Farben“. Texte `DESK_LOOK_TEXT`.
  - Geprüft im eingebauten Browser: Desk 2 hell/grün, Main Desk bleibt dunkel/rot; „Wie Main Desk“ zurück. **Nicht gesehen:** Rückwechsel in den Main Desk im selben Fenster (dort Pop-up blockiert) – Enrico bitte in Chrome prüfen.
- **F-162 ✓ – Rahmen- und Akzentfarbe je Slot und Portal** (Entscheidung Enrico: zwei getrennte Farben; Anlegen bleibt ein Klick, danach Hinweis „Farbe wählen …“)
  - `types.ts`: `Tint { frame?, accent? }`, `PanelMeta.tint`, `SlotName extends Named { tint? }` für `areaNames`.
  - `tint.ts`: `parseTint`, `setPanelTint`, `setSlotTint` (gibt dem Slot bei Bedarf einen Namen über `claimSlot`), `slotTint`, `shownTint` (Portal → Slot → Desk, je Farbe mit Herkunft). `workspace.ts` exportiert `slotNameId`, `claimSlot`.
  - Reducer: `tintPanel`, `tintSlot` (Änderung `{ frame|accent: hex | null }`, null = erbt wieder).
  - `components/Colors.tsx`: Dialog mit „Dieses Portal“ (Wie Slot) und „Dieser Slot“ (Rahmen „Ohne“, Akzent „Wie Desk“), Farbfelder = Akzentfarben ohne Retro-Festfarben, eigene Farbe, Kontrasthinweis für Akzent. Fokus beim Öffnen auf erste Wahl, nach Esc zurück auf ⋮ des Portals.
  - PanelFrame: Klassen `win--framed` (3-px-Linie über `::before`, `--frame`) und `win--tinted` (`--accent-rgb` nur im Portal; `--accent`, `--glow`, `--name-accent` dort neu berechnet, hell abgedunkelt). Menü „◐ Farben …“.
  - App: `notify(text, ms, undo, action?)` mit Knopf im Hinweis (`flashAction`); `offerColors` nach neuem Portal und neuem Slot (8 s); `newSlot(side)` bündelt alle „+ NewSlot“-Wege.
  - Texte `TINT_TEXT`; Hilfe-Eintrag `colors`.
  - **Zurücksetzen** (Wunsch Enrico): Dialog „Farben“ → „Alles wie Desk“; Dialog „Design anpassen“ → Bereich „Slots und Portale“ (Anzahl, „Alle auf Desk-Farben zurücksetzen“ für diesen Desk). `tint.ts`: `deskTintCount`, `clearDeskTints` (mit Stand davor), `restoreTints`; Reducer `clearTints`, `restoreTints`. „Rückgängig“ steht im Dialog (der Hinweis unten ist hinter dem modalen Dialog nicht klickbar) und im Hinweis. Geprüft im Browser.
  - **Dialog ohne Scrollen** (Wunsch Enrico): je Farbe eine Zeile (Bezeichnung links, „Wie Slot/Ohne/Wie Desk“, 10 Farbfelder 24 px, eigene Farbe als gestricheltes Feld am Ende mit Tooltip/aria-label), kurze Einleitung `TINT_TEXT.short`, „Alles wie Desk“ in der Kopfzeile, Slot-Hinweis als Tooltip und aria-describedby. Breite 680 px; unter 560 px dürfen Zeilen umbrechen.
  - Geprüft: Dialog über ⋮, Slot-Rahmen grün + Portal-Akzent violett setzen die Klassen/Variablen; Hinweis nach neuem Portal, „Farbe wählen …“ öffnet den Dialog für das neue Portal; Fokus nach Esc auf ⋮.
- Tests: 8 neue → **176, alle grün**. `tsc --noEmit` sauber.

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Farben je Desk: F-161; Rahmen- und Akzentfarbe je Slot und Portal mit Zurücksetzen: F-162; Übergabe V30“) und pushen.
2. Enrico kurz in Chrome ansehen: Rahmenfarbe auf einem normal großen Portal (3 px gut sichtbar?), Desk-Farben beim Wechsel zurück in den Main Desk, helles Design.
3. F-163 Farbregeln (Kategorien), danach F-164, F-171 Stufe 2, F-183.

## Kleine Punkte

- Neu: Ein Hinweis mit Knopf erscheint jetzt bei **jedem** neuen Portal – falls das stört: abschaltbar machen oder nur beim ersten Mal.
- Neu: Der Hinweis verschwindet nach 8 s; mit Tastatur nur knapp erreichbar (bleibt über ⋮ → Farben jederzeit möglich).
- Neu: Kopfleiste und Hintergrund je Desk (Text F-161) folgen der Darstellung; eigene Farben dafür gibt es nicht.
- Neu: Slot-Farbe hängt am Slot-Namen; ein Portal, das in einen anderen Stack wandert, behält seinen alten Slot-Namen (wie bisher beim Namen) – die angezeigte Slot-Farbe richtet sich nach der Mehrheit im Stack.
- Neu: Keine Ansage beim Wählen einer Farbe im Dialog (Auswahl ist über aria-pressed hörbar); Rahmen hat keinen Kontrasthinweis.
- Neu: Tour „Design“ (F-171) kennt Desk- und Portalfarben noch nicht → Stufe 2.
- Aus V29: F-185 eigener Filter fehlt; Browsername beim Import fehlt; „wer“ bei Workspace-Import; Texte in Search.tsx/Launcher.tsx nicht in terms.ts; F-159 hell prüfen.
- Aus V28: Alt/⌥+K wirkt nicht, solange der Fokus in einer eingebetteten Seite (iframe) liegt – wie alle Kürzel (Hinweis in der Hilfe steht schon aus V26-Liste).
- Aus V28: Die Ansage „gesammelt“ macht nur das Fenster, das den Main Desk zeigt; zeigt kein Fenster den Main Desk, gibt es keine Ansage (gewollt?).
- Aus V28: Bei hart beendeten Fenstern dauert es bis zu 75 s, bis ihr Desk als gesammelt gilt.
- Aus V28: Beim Wechsel ohne Neuladen bauen sich Portale des neuen Desks frisch auf (iframes laden neu); Desks im Hintergrund am Leben halten wäre ein eigenes Thema (zusammen mit F-06 Ressourcen).
- Aus V27 unverändert: Hinweis „Neue Version“ überdeckt im Testmodus den Link „Test: voll“; kein Service Worker; `npm run build` und `web/dist/version.json` noch nicht von Enrico bestätigt.
- Aus V26 unverändert offen: Kennfarbe/Initialen am Zahnrad oder als Konto-Knopf; Begrüßung in Zusatz-Desks; Profil-Name je Tastendruck gespeichert; Import per Ziehen der Datei; Sortierhilfe-Regeln (F-163); Link „Ohne Kategorie“ → Sortierhilfe; „Rückgängig“ nach Import (F-185 hilft dabei); Hinweis bei sehr vielen Kategorien; Launcher meldet keine Popup-Sperre; gesperrte Sources aus der Library im Portal; Launcher-Lage je Desk statt je Bildschirmgröße; Toast erst mit Inhalt eingehängt (`sayLive` nutzen); Hilfe-/Design-Dialog geben Fokus nach Esc nicht zurück, wenn Auslöser weg; zweizeilige Kopfleiste Tab-Reihenfolge; Terminal-Akzent/Toast beim schnellen Designwechsel; schmale Portale ohne Portalnamen; Hilfe-Dialog freier Platz für „Ausführen“; Fokus je Desk mit Gesamtgrenzen (Rückfrage offen); README mit alten Begriffen.


## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Repo-Ordner muss in jedem Chat per Ordnerzugriff freigegeben werden (`~/Projects/e-sources`). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Testen mit `?test=voll` (nichts wird gespeichert; zweiter Desk heißt dort „Desk 2 (Test)“, Id `w2`). Im eingebauten Browser: `keyboard.press('Alt+k')` (nicht `Alt+KeyK`), `Control+.` geht nicht – Cockpit über den Knopf öffnen; Pop-ups aus Claudes Eingaben werden blockiert; `browser.tabs.create('about:blank')` + `page.goto` vermeidet riesige Seitenausgaben. Ein Tab, der wegnavigiert, meldet sich ab; ein per Werkzeug geschlossener nicht.

**Tests in Claudes VM:** vitest geht nicht (Rollup-Paket für macOS). Ersatz: kleines `vitest`-Modul (describe/it/expect mit toBe, toEqual, toBeNull, toBeUndefined, toBeTruthy, toBeFalsy, toContain, toHaveLength, toMatchObject, Vergleiche, .not), `tsc --outDir … --module commonjs src/workspace/*.ts`, dann mit `NODE_PATH` auf Ersatzmodul und `web/node_modules` die übersetzte `workspace.test.js` laden. Meldungen zu `import.meta`/`useUpdate` und „types node“ sind harmlos.

## Arbeitsregeln

Wie V15–V27: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-183) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
