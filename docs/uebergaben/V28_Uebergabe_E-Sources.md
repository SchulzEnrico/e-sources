# Übergabe V28 → V29 E-Sources

Stand: 22.11.2026, später Nachmittag · Chat V28 abgeschlossen · Nächster Chat: **V29 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V29 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Frag Enrico kurz, ob **F-185** (Herkunft eines Lesezeichens) vor F-159 kommen soll (Vorschlag: ja, klein, und je früher erfasst, desto mehr Sources haben die Angabe). Dann **F-185** bzw. **F-159**, danach der Farben-Block. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` im Repo (Arbeitskopie; Stand 160 Einträge: **91 fertig, 13 teilweise, 1 ersetzt, 55 offen**). Offen aus V27: Das Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 ist nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-185)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V28 passiert ist

- **F-160 Stufe 2 ✓ – Desks sammeln und verteilen**
  - Desk-Wechsel ohne Neuladen: `App.tsx` hat eine Hülle `App` (hält `useWorkspace`, den gezeigten Desk, `history.replaceState` mit `?win=`) und den eigentlichen Desk `DeskApp` mit `key={win}` – beim Wechsel wird der Desk frisch aufgebaut, die Arbeitsfläche bleibt (auch im Testmodus). Keine Begrüßung nach einem Wechsel.
  - `windows.ts` (rein, getestet): `collectedDesks`, `deskRing`, `stepDesk`, `deskSaid`. „Gesammelt“ = Desk ohne eigenes offenes Fenster.
  - **Alt/⌥+K** nächster, **Alt/⌥+Umschalt+K** voriger gesammelter Desk; Ansage „Desk 2 · 2 von 3 hier · 4 Portale“, Fokus auf den Tab des ersten Portals. (Alt+D ging nicht: öffnet unter Windows/Linux die Adresszeile.)
  - Automatisch sammeln: Schließt ein Desk-Fenster, sagt das Fenster mit dem Main Desk nach 2 s an „„Desk 2“ ist jetzt im Main Desk gesammelt“ (nicht beim Neuladen, nicht nach „Hier sammeln“, nicht wenn der Desk aufgelöst wurde).
  - `useWindows.ts`: neue Nachricht `collect`; **Lebenszeichen** alle 10 s, Fenster ohne Lebenszeichen gelten nach 75 s als geschlossen (vorher blieb ein hart beendetes Fenster für immer „offen“).
  - „Desks hier sammeln“ / „Auf Fenster verteilen“: im Umschalter ⇄ (Abschnitt „Fenster“), im Cockpit („Hier sammeln“, „Verteilen“), in Suche und Hilfe. Beim Sammeln schließen sich die anderen Fenster; kann eines sich nicht schließen, zeigt es nur noch den Hinweis `Parked` („Fenster schließen“, „Hier wieder zeigen“). Verteilen nennt blockierte Desks.
  - Cockpit: „gesammelt“ statt „geschlossen“, Knöpfe „Hier zeigen“ und „Eigenes Fenster“.
  - + NewDesk: Blockiert der Browser das Fenster, erscheint der neue Desk hier.
  - Begriffe: `TERMS.desk` neu („eine eigene Arbeitsfläche mit Slots, in eigenem Fenster … oder gesammelt im Main Desk“), neu `collected`, `collectDesks`, `distributeDesks`, `parked`; `switchDesk` nennt Alt/⌥+K. Hilfe/Suche: `collected`, `collectDesks`, `distributeDesks`, `switchDesk` mit Taste und `run: 'nextDesk'`.
  - Geprüft im eingebauten Browser (Testmodus): Umschalter, Alt+K vor/zurück mit Ansage und Adresse, Cockpit-Knöpfe, Sammeln (zweiter Tab schließt sich), Ansage beim Schließen eines Desk-Tabs, Meldung bei blockiertem Verteilen.
  - **Nicht geprüft:** echtes Verteilen auf mehrere Fenster (der Browser-Bereich lässt keine Pop-ups aus Claudes Eingaben zu) und der `Parked`-Hinweis. Enrico: einmal in Chrome mit 2 Desks „Auf Fenster verteilen“ und „Desks hier sammeln“ ausprobieren. Chrome lässt pro Klick oft nur ein neues Fenster zu – dann Pop-ups für localhost erlauben.
- **F-184 ✓ – Kennfarbe im Stil des Logos** (Wunsch Enrico): Klasse `.kenn` in `App.css` für Avatar und Farbauswahl – Verlauf wie die Logo-Flächen, Metallkante wie die Logo-Kante (dunkel silbern, hell graphit), Glanz oben, gewählte Farbe mit äußerem Ring. In hell und dunkel angesehen.
- **F-185 neu im Lastenheft** (Wunsch Enrico): Herkunft eines Lesezeichens – wer (Profilname, später Konto), woher (von Hand, Launcher, Lesezeichen-Import mit Browser/Ordner, Beispiele, Import der Arbeitsfläche), wann. Lesezeichen entstehen an diesen Stellen: `App.tsx` ~1301 (Launcher) und ~2097, `components/Bookmarks.tsx:77` (Library-Dialog), `browserBookmarks.applyImport`, `addSamples` im Reducer. Feld am besten `origin?: { by?: string; via: 'hand' | 'launcher' | 'import' | 'sample' | 'workspace'; at: string; from?: string }` in `Bookmark` (types.ts), `parseWorkspace` muss es durchlassen.
- Tests: 2 neue → **165, alle grün**. `tsc --noEmit` sauber.

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Desks sammeln und verteilen, Alt+K: F-160; Kennfarbe im Logo-Stil: F-184; F-185 im Lastenheft; Übergabe V28“) und pushen. Vorher kurz im echten Chrome testen (siehe oben).
2. Reihenfolge F-185 / F-159 klären, dann umsetzen.
3. Danach Farben-Block (F-161 → F-164, F-171 Stufe 2), F-183 Icons.

## Kleine Punkte

- Neu: Alt/⌥+K wirkt nicht, solange der Fokus in einer eingebetteten Seite (iframe) liegt – wie alle Kürzel (Hinweis in der Hilfe steht schon aus V26-Liste).
- Neu: Die Ansage „gesammelt“ macht nur das Fenster, das den Main Desk zeigt; zeigt kein Fenster den Main Desk, gibt es keine Ansage (gewollt?).
- Neu: Bei hart beendeten Fenstern dauert es bis zu 75 s, bis ihr Desk als gesammelt gilt.
- Neu: Beim Wechsel ohne Neuladen bauen sich Portale des neuen Desks frisch auf (iframes laden neu); Desks im Hintergrund am Leben halten wäre ein eigenes Thema (zusammen mit F-06 Ressourcen).
- Aus V27 unverändert: Hinweis „Neue Version“ überdeckt im Testmodus den Link „Test: voll“; kein Service Worker; `npm run build` und `web/dist/version.json` noch nicht von Enrico bestätigt.
- Aus V26 unverändert offen: Kennfarbe/Initialen am Zahnrad oder als Konto-Knopf; Begrüßung in Zusatz-Desks; Profil-Name je Tastendruck gespeichert; Import per Ziehen der Datei; Sortierhilfe-Regeln (F-163); Link „Ohne Kategorie“ → Sortierhilfe; „Rückgängig“ nach Import (F-185 hilft dabei); Hinweis bei sehr vielen Kategorien; Launcher meldet keine Popup-Sperre; gesperrte Sources aus der Library im Portal; Launcher-Lage je Desk statt je Bildschirmgröße; Toast erst mit Inhalt eingehängt (`sayLive` nutzen); Hilfe-/Design-Dialog geben Fokus nach Esc nicht zurück, wenn Auslöser weg; zweizeilige Kopfleiste Tab-Reihenfolge; Terminal-Akzent/Toast beim schnellen Designwechsel; schmale Portale ohne Portalnamen; Hilfe-Dialog freier Platz für „Ausführen“; Fokus je Desk mit Gesamtgrenzen (Rückfrage offen); README mit alten Begriffen.

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Repo-Ordner muss in jedem Chat per Ordnerzugriff freigegeben werden (`~/Projects/e-sources`). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Testen mit `?test=voll` (nichts wird gespeichert; zweiter Desk heißt dort „Desk 2 (Test)“, Id `w2`). Im eingebauten Browser: `keyboard.press('Alt+k')` (nicht `Alt+KeyK`), `Control+.` geht nicht – Cockpit über den Knopf öffnen; Pop-ups aus Claudes Eingaben werden blockiert; `browser.tabs.create('about:blank')` + `page.goto` vermeidet riesige Seitenausgaben. Ein Tab, der wegnavigiert, meldet sich ab; ein per Werkzeug geschlossener nicht.

**Tests in Claudes VM:** vitest geht nicht (Rollup-Paket für macOS). Ersatz: kleines `vitest`-Modul (describe/it/expect mit toBe, toEqual, toBeNull, toBeUndefined, toBeTruthy, toBeFalsy, toContain, toHaveLength, toMatchObject, Vergleiche, .not), `tsc --outDir … --module commonjs src/workspace/*.ts`, dann mit `NODE_PATH` auf Ersatzmodul und `web/node_modules` die übersetzte `workspace.test.js` laden. Meldungen zu `import.meta`/`useUpdate` und „types node“ sind harmlos.

## Arbeitsregeln

Wie V15–V27: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-183) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
