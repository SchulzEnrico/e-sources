# Übergabe V33 → V34 E-Sources

Stand: 22.11.2026, Abend · Chat V33 abgeschlossen · Nächster Chat: **V34 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V34 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. F-183 Stufe 1 (Symbolsatz) ist fertig. Als Nächstes **F-183 Stufe 2** (alle vier Punkte gewünscht, siehe Lastenheft), dann – Platz mit Enrico bestätigen – **F-186** Fragen als Vorschläge in Hilfe und Suche, danach **F-171 Stufe 2** (Tour „Design“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (161 Einträge: **97 fertig, 14 teilweise, 1 ersetzt, 49 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-186)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V33 passiert ist

- V32 war schon committet (3f54592).
- **F-183 Stufe 1 ◐ – Symbolsatz.**
  - `workspace/icons.ts` (neu): `ICONS` (48 Strichsymbole, Raster 16, `vb`/`w` je Symbol möglich), `HELP_ICON` (Hilfe-Id → Symbol), `helpIcon(id)` (Ersatz: Hilfe-Symbol).
  - `components/Icon.tsx` (neu): `<Icon name size className>`, immer aria-hidden, focusable=false.
  - Hilfe: Symbol neben dem Namen. Suche: Portal / Source / Launcher-Source / Funktion. Einstellungsmenü: `Item` hat jetzt `icon?: IconName` (PanelFrame.tsx), alle Einträge außer dem Schalter „Touren automatisch zeigen“. Cockpit: Hier sammeln, Verteilen, Regeln↔Radar, Tour, Desk-Kopf im Radar, Werkzeuge Verschieben (swap) / Holen (import) / Umbenennen (rename). Kopfleiste: Zahnrad, Design, Gleich verteilen, Zurück, ⇄, Launcher aus dem Satz.
  - CSS am Ende von App.css (F-183-Block); `.overview__tour` nowrap.
  - Tests: 3 neue (Vollständigkeit der Zuordnung, keine verwaisten Ids, gültige Pfade) → **188, alle grün**. `tsc --noEmit` sauber.
  - Geprüft im eingebauten Browser (`?test=voll`, 1280×800): Menü, Suche „tour“, Hilfe, Cockpit-Kopf.
- **F-186 neu** (Wunsch Enrico): Fragen wie „Wie verschiebe ich ein Portal?“ als Vorschläge beim Tippen in Hilfe und Suche; Fragen am Eintrag in help.ts.
- **F-183 Stufe 2** – Enrico: alle vier offenen Punkte ja (Zeichen je Kategorie, NewSlot/NewDesk + Portal-Glyphen, „Kompakt: nur Symbole“, Favicons – Abruf vorher klären).

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Symbolsatz F-183 Stufe 1; F-186 ins Lastenheft; Übergabe V33“) und pushen.
2. F-183 Stufe 2, danach F-186 (Platz bestätigen), dann F-171 Stufe 2.

## Kleine Punkte

- Neu: Symbole sitzen bei Menü/Suche als `display: inline-block` (global ist `.icon` block); neue Einsatzorte darauf achten.
- Neu: F-186 Platz in der Reihenfolge – Vorschlag Claude: direkt nach F-183 Stufe 2, vor F-171 Stufe 2; Enrico hat noch nicht ausdrücklich zugestimmt.

- Aus V32: Die Regeln im Cockpit gelten für alle Desks (wie Kategorien); es gibt keine Regeln je Desk.
- Aus V32: Eine Farbregel lässt sich nur für vorhandene Kategorien anlegen; ohne Kategorien verweist der Text auf die Library (Anlegen einer Kategorie direkt in den Regeln fehlt).
- Aus V32: Ist „Seite → Kategorie“ ausgeschaltet und beantwortet man die Kategorie-Frage für diese Seite, wird die Zuordnung zwar neu gemerkt, bleibt aber ausgeschaltet.
- Aus V32: Die Rückgängig-Zeile bleibt, bis man die Regeln verlässt; nur die letzte Löschung ist umkehrbar.
- Aus V31 (Auswahl, unverändert offen): Kategorie bleibt, auch wenn das Portal eine andere Seite zeigt; Hinweis mit Tastatur knapp erreichbar (8/12 s); Library-Liste ohne Kategorie-Farben (`.bm-cat`); Kategorie-Farbe gilt desk-übergreifend, „Alle auf Desk-Farben zurücksetzen“ lässt sie unberührt; Kategorie-Knopf ohne Zeichen (F-183); Slot-Farbe hängt am Slot-Namen; keine Ansage beim Wählen einer Farbe im Dialog, Rahmen ohne Kontrasthinweis; Kopfleiste/Hintergrund je Desk ohne eigene Farben.
- Aus V29: F-185 eigener Filter fehlt; Browsername beim Import fehlt; „wer“ bei Workspace-Import; Texte in Search.tsx/Launcher.tsx nicht in terms.ts; F-159 hell prüfen.
- Aus V28: Alt/⌥+K wirkt nicht im iframe; Ansage „gesammelt“ nur im Fenster mit Main Desk; 75 s bis hart beendete Fenster als gesammelt gelten; Portale bauen sich beim Desk-Wechsel neu auf (mit F-06).
- Aus V27: Hinweis „Neue Version“ überdeckt im Testmodus „Test: voll“; kein Service Worker; `npm run build` / `web/dist/version.json` noch nicht bestätigt.
- Aus V26 unverändert offen: siehe Liste in `V31_Uebergabe_E-Sources.md` (Kennfarbe am Zahnrad, Begrüßung in Zusatz-Desks, Import per Ziehen, Rückgängig nach Import, Popup-Sperre im Launcher, Fokusrückgabe nach Esc u. a.).

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Repo-Ordner muss in jedem Chat per Ordnerzugriff freigegeben werden (`~/Projects/e-sources`). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an. Testen mit `?test=voll` (nichts wird gespeichert; zweiter Desk „Desk 2 (Test)“, Id `w2`; die Testbelegung hat keine Kategorien – über ⋮ → Farben → „Neue Kategorie …“ anlegen). Im eingebauten Browser: **nie die ganze Seite als ariaSnapshot ausgeben** (riesig) – nur Teilbereiche, z. B. `page.locator('.rules').ariaSnapshot()`; `browser.show()` vorher, sonst blockiert die Begrüßung; `keyboard.press('Alt+k')`, `Control+.` geht nicht – Cockpit über den Knopf.

**Tests in Claudes VM:** vitest geht nicht. Das Ersatzmodul liegt in `/tmp/vt/node_modules/vitest` (dort `out` nicht beschreibbar) → nach `$HOME/vt2/node_modules/` kopieren, dann `npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts` und `NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/workspace.test.js`. Meldungen zu `import.meta`/`useUpdate`/`.at` sind harmlos. Hilfe-Texte dürfen nicht mit „Wort = …“ beginnen (Test F-156).

## Arbeitsregeln

Wie V15–V32: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-183) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
