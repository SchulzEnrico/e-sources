# Übergabe V29 → V30 E-Sources

Stand: 22.11.2026, Abend · Chat V29 abgeschlossen · Nächster Chat: **V30 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V30 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Als Nächstes kommt der **Farben-Block** (F-161 → F-162 → F-163 → F-164, danach F-171 Stufe 2), zusammen mit **F-183** Icons. Lies vorher die Einträge F-161 bis F-164 und F-183 und frag Enrico kurz, ob er mit F-161 beginnen will. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` im Repo (Stand 160 Einträge: **93 fertig, 13 teilweise, 1 ersetzt, 53 offen**). Offen aus V27: Das Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 ist nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-185)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V29 passiert ist

- V28 war schon committet (9af36de). Enrico hat entschieden: F-185 vor F-159.
- **F-185 ✓ – Herkunft einer Source**
  - `types.ts`: `Bookmark.origin?: BookmarkOrigin` mit `via` ('hand' | 'launcher' | 'import' | 'sample' | 'workspace'), `at` (ISO), `by?` (Profilname), `from?` (Dateiname bzw. Gerät), `folder?` (Ordnerpfad im Browser).
  - `bookmarks.ts`: `originOf(ws, via, extra, now)`, `originWhen`, `originText` („Angelegt von Enrico am 22.11.2026, 16:55 · aus Lesezeichen-Import „bookmarks.html“, Ordner Arbeit“; ohne Angabe „Herkunft unbekannt …“). `saveBookmark` behält die Herkunft beim Ändern. `matches` durchsucht die Herkunft (also Library-Suche und Suchfeld, z. B. „Import 22.11.2026“). `addSamples(ws, makeId, now)` setzt 'sample'.
  - `browserBookmarks.applyImport(ws, plan, makeId, from?, now)` setzt 'import' mit Datei und Ordner (auch bei „alles in eine Kategorie“). Reducer-Aktion `importBookmarks` hat `from` (Dateiname aus App.tsx).
  - `transfer.readTransferFile(text, now)`: Sources ohne Herkunft bekommen 'workspace' mit Gerät der Datei; vorhandene bleiben.
  - `storage.ts` liest `origin` und verwirft Unbrauchbares.
  - Oberfläche: ☆/Library-Dialog → 'hand', Launcher (Tab in den Launcher und „Source anlegen“ im Launcher) → 'launcher'. Im Bearbeiten-Dialog ruhige Zeile `.bm-origin` direkt unter der Adresse (erst stand sie ganz unten und ging unter der langen Portal-Liste unter; Enrico fand sie nicht).
  - Texte: `ORIGIN_TEXT` und `TERMS.origin` in terms.ts; Hilfe/Suche-Eintrag `origin` (Begriffe). Suchhinweis nennt jetzt „Herkunft“.
  - Geprüft im eingebauten Browser (Testmodus): ☆ speichern → Dialog zeigt „Angelegt am … · von Hand gespeichert“; Suche „von Hand“ findet die Source und den Hilfeeintrag.
- **F-159 ✓ – Desk-Name als ruhige Beschriftung**: `.toolbar .brand .tb-win` ohne Rahmen und Hintergrund, Fokusfarbe (F-167) als 8-px-Punkt davor; umbenennbare Desks mit gepunkteter Unterstreichung beim Darüberfahren und Fokusrahmen bei Tastatur; F2/Klick zum Umbenennen unverändert. Geprüft: Main Desk und Desk 2 (Test), F2 öffnet die Eingabe.
- Tests: 3 neue → **168, alle grün**. `tsc --noEmit` sauber.
- Aus V28 von Enrico in Chrome geprüft: + NewDesk öffnet ein Fenster, „Desks hier sammeln“ schließt es (Desk 2 „gesammelt“), „Verteilen“ öffnet es wieder. Nicht gesehen: der `Parked`-Hinweis (erscheint nur, wenn sich ein Fenster nicht schließen lässt).
- Cockpit: „1 Portale“ → „1 Portal“ (`Overview.tsx`).

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Herkunft einer Source: F-185; Desk-Name als Beschriftung: F-159; Cockpit 1 Portal; Übergabe V29“) und pushen.
2. Farben-Block (F-161 → F-164, F-171 Stufe 2) mit F-183 Icons.

## Kleine Punkte

- Neu: F-185 „filterbar“ nur über die Suche; ein eigener Filter (z. B. „alles aus dem Import vom …“ mit einem Klick, Grundlage für „Rückgängig nach Import“) fehlt noch.
- Neu: Der Browser wird beim Lesezeichen-Import nicht genannt, nur der Dateiname (Chrome, Edge und Safari schreiben dasselbe Format).
- Neu: Beim Import der Arbeitsfläche fehlt „wer“ bei Sources ohne Herkunft (das Profil der Datei ist nicht unbedingt der Anleger).
- Neu: Texte in `Search.tsx` (Suchhinweis) und `Launcher.tsx` (aria-label) stehen nicht in terms.ts – alt, bei Gelegenheit umziehen.
- Neu: F-159 nur im dunklen Design angesehen; hell kurz prüfen.

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
