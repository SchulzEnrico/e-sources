# Übergabe V32 → V33 E-Sources

Stand: 22.11.2026, Abend · Chat V32 abgeschlossen · Nächster Chat: **V33 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V33 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Im Farben-Block sind F-161 bis F-164 fertig; als Nächstes kommt **F-183** Icons (entschieden: Icons zuerst), danach **F-171 Stufe 2** (Tour „Design“: Desk-, Slot-/Portalfarben, Farbregeln, Regelübersicht – dann gleich mit Symbolen). Lies vorher F-183 und F-171. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (160 Einträge: **97 fertig, 13 teilweise, 1 ersetzt, 49 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-185)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V32 passiert ist

- V31 war schon committet (5697175).
- **F-164 ✓ – Regelübersicht im Cockpit.**
  - `rules.ts` (neu): `ruleList` (Farbregeln je Kategorie → Seiten alphabetisch → eingebaute), `ruleOn`/`setRuleOn`, `cleanDomain`, `setSiteCategory`, `deleteRule` (gibt `RuleUndo` mit) und `restoreRule`, `colorName` (Farbname aus ACCENTS, sonst „eigener Farbe (#…)“).
  - `types.ts`: `Workspace.rulesOff?: string[]` – Ids `tint:<Kategorie>`, `site:<Domain>`, `ask`, `offer`, `collect`. `storage` prüft (nur bekannte Arten, `tint:` nur für vorhandene Kategorien). Wandert mit dem Export der Arbeitsfläche.
  - Wirkung: `categoryTint` und `suggestCategory` beachten ausgeschaltete Regeln; App: `ask` aus → keine Kategorie-Frage, `offer` aus → Hinweis ohne „Farbe wählen …“, `collect` aus → keine Ansage „… ist jetzt im Main Desk gesammelt“ (gesammelt wird trotzdem).
  - Reducer: `ruleOn`, `siteCategory`, `ruleDelete`, `ruleRestore`.
  - `components/Rules.tsx` (neu): drei Bereiche; je Regel Häkchen (Ansage), Name, Farbpunkte (aria-hidden), Satz in Klartext (aria-describedby am Häkchen); „Ändern“ (aria-expanded) mit Farbfeldern bzw. Kategorie-Auswahl; „Löschen“ → Rückfrage (Fokus auf „Nein“) → Zeile „Regel „X“ gelöscht. Rückgängig“ (Fokus darauf). „+ Farbregel“ (Kategorie wählen, Farbe wählen → Regel erscheint, Bearbeiten offen) und „+ Seite“ (Domain + Kategorie, Enter legt an, Fehlermeldung bei Unsinn). Esc schließt zuerst Rückfrage/Bearbeiten, erst dann das Cockpit.
  - Cockpit (`Overview.tsx`): Knopf „Regeln“ ↔ „Radar“ (aria-pressed); Filterfeld nur im Radar. Hilfe-/Suche-Eintrag „Regeln (Cockpit)“ öffnet das Cockpit gleich mit den Regeln.
  - Farben-Dialog: `Row` exportiert (wird in Rules genutzt); bei ausgeschalteter Farbregel Hinweis im Bereich „Kategorie“, Slot-Zeilen zeigen dann nicht „Wie Kategorie“.
  - Texte `RULES_TEXT`, `CATEGORY_TEXT.ruleOff`; CSS `.rules*`.
- **F-172:** Cockpit-Tour mit Schritt „Regeln“ (9 Schritte). Fehler behoben: „Tour wieder starten“ zielte auf den ersten `.overview__tour`-Knopf (bei mehreren Desks „Hier sammeln“) – jetzt eigene Klassen `.overview__rules`, `.overview__restart`.
- **Begrüßung** lag (z-index 80) über dem Cockpit-Kopf und verdeckte dessen Knöpfe → z-index 69.
- Geprüft im eingebauten Browser (`?test=voll`): Übersicht, „+ Seite“ mit `https://www.YouTube.com/watch?v=1` → youtube.com; Kategorie „Video“ mit grünem Rahmen → Regel erscheint; Ausschalten → Portal ohne Rahmen, wieder ein → Rahmen; Akzent ändern; Seite auf „Video“ ändern; Löschen → Rückfrage → gelöscht → Rückgängig stellt alles wieder her; Suche „Regeln“ + Enter öffnet die Übersicht; Tour bis „Regeln“ / „Tour wieder starten“.
- **„Farbe anbieten“ ab Werk aus** (Enrico): `DEFAULT_OFF` in rules.ts, eingeschaltet steht es in `Workspace.rulesOn` (storage prüft). Damit kommt nach einem neuen Portal nur noch die Kategorie-Frage.
- Tests: 5 neue → **185, alle grün**. `tsc --noEmit` sauber.

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Regelübersicht im Cockpit: F-164; Cockpit-Tour Schritt Regeln; Übergabe V32“) und pushen.
2. Enrico in Chrome ansehen: Cockpit → „Regeln“; eine eingebaute Regel ausschalten (z. B. „Farbe anbieten“) und ein neues Portal anlegen.
3. F-183 Icons, danach F-171 Stufe 2 (Enrico: Icons zuerst).

## Kleine Punkte

- Neu: Die Regeln im Cockpit gelten für alle Desks (wie Kategorien); es gibt keine Regeln je Desk.
- Neu: Eine Farbregel lässt sich nur für vorhandene Kategorien anlegen; ohne Kategorien verweist der Text auf die Library (Anlegen einer Kategorie direkt in den Regeln fehlt).
- Neu: Ist „Seite → Kategorie“ ausgeschaltet und beantwortet man die Kategorie-Frage für diese Seite, wird die Zuordnung zwar neu gemerkt, bleibt aber ausgeschaltet.
- Neu: Die Rückgängig-Zeile bleibt, bis man die Regeln verlässt; nur die letzte Löschung ist umkehrbar.
- Erledigt: zwei Hinweise nacheinander nach neuem Portal – „Farbe anbieten“ ist ab Werk aus.
- Aus V31 (Auswahl, unverändert offen): Kategorie bleibt, auch wenn das Portal eine andere Seite zeigt; Hinweis mit Tastatur knapp erreichbar (8/12 s); Library-Liste ohne Kategorie-Farben (`.bm-cat`); Kategorie-Farbe gilt desk-übergreifend, „Alle auf Desk-Farben zurücksetzen“ lässt sie unberührt; Kategorie-Knopf ohne Zeichen (F-183); Slot-Farbe hängt am Slot-Namen; keine Ansage beim Wählen einer Farbe im Dialog, Rahmen ohne Kontrasthinweis; Kopfleiste/Hintergrund je Desk ohne eigene Farben.
- Aus V29: F-185 eigener Filter fehlt; Browsername beim Import fehlt; „wer“ bei Workspace-Import; Texte in Search.tsx/Launcher.tsx nicht in terms.ts; F-159 hell prüfen.
- Aus V28: Alt/⌥+K wirkt nicht im iframe; Ansage „gesammelt“ nur im Fenster mit Main Desk; 75 s bis hart beendete Fenster als gesammelt gelten; Portale bauen sich beim Desk-Wechsel neu auf (mit F-06).
- Aus V27: Hinweis „Neue Version“ überdeckt im Testmodus „Test: voll“; kein Service Worker; `npm run build` / `web/dist/version.json` noch nicht bestätigt.
- Aus V26 unverändert offen: siehe Liste in `V31_Uebergabe_E-Sources.md` (Kennfarbe am Zahnrad, Begrüßung in Zusatz-Desks, Import per Ziehen, Rückgängig nach Import, Popup-Sperre im Launcher, Fokusrückgabe nach Esc u. a.).

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Repo-Ordner muss in jedem Chat per Ordnerzugriff freigegeben werden (`~/Projects/e-sources`). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Testen mit `?test=voll` (nichts wird gespeichert; zweiter Desk „Desk 2 (Test)“, Id `w2`; die Testbelegung hat keine Kategorien – über ⋮ → Farben → „Neue Kategorie …“ anlegen). Im eingebauten Browser: **nie die ganze Seite als ariaSnapshot ausgeben** (riesig) – nur Teilbereiche, z. B. `page.locator('.rules').ariaSnapshot()`; `browser.show()` vorher, sonst blockiert die Begrüßung; `keyboard.press('Alt+k')`, `Control+.` geht nicht – Cockpit über den Knopf.

**Tests in Claudes VM:** vitest geht nicht. Das Ersatzmodul liegt in `/tmp/vt/node_modules/vitest` (dort `out` nicht beschreibbar) → nach `$HOME/vt2/node_modules/` kopieren, dann `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `import.meta`/`useUpdate`/`.at` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156).

## Arbeitsregeln

Wie V15–V31: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-183) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
