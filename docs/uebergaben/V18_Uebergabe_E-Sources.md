# Übergabe V18 → V19 E-Sources

Stand: 22.11.2026, 13 Uhr · Chat V18 abgeschlossen · Nächster Chat: **V19 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V19 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Prüfe kurz im Browser (Demo und `?test=voll`, auch schmal ≈ 375–700 px), ob Kopfleiste, ⇄, „+ NewDesk“ und die Ampelfarben der Plus-Knöpfe stimmen, dann weiter mit **F-156 Hilfe in der Suche** (Grundlage: `workspace/terms.ts`). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – neu F-159 bis F-167
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick-Liste noch nicht nachgezogen (F-151 bis F-167)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- Frühere Übergaben: `docs/uebergaben/V01` bis `V17_Uebergabe_E-Sources.md`

## Was in V18 passiert ist

- **Lastenheft neu:** F-159 Desk-Name als ruhige Beschriftung (kein Knopf-Look) · F-160 Desk-Umschalter und Sammeln der Desks im Hauptfenster (Entscheidung: automatisch **und** per Befehl; gesammelter Desk wird kein Dashboard, Überblick bleibt im Cockpit; TERMS.desk muss von „ein Fenster“ auf „eigene Arbeitsfläche, in eigenem Fenster oder gesammelt“ geändert werden) · F-161 Farbschema und Farbmodus (Hell/Dunkel/System) je Desk – Darstellung und Akzentfarbe gibt es schon global, F-161 macht sie je Desk · F-162 Rahmen-/Akzentfarbe je Slot und Portal, schon beim Anlegen · F-163 Farbregeln über Kategorien (Vorschlag: Kategorie je Source mit Farbe und Zeichen, Vorschlag anhand der Adresse beim Anlegen, übernehmen / andere / neue; noch zu bestätigen) · F-164 Regelübersicht im Cockpit (anlegen, ändern, an/aus, löschen) · F-165 „+ NewDesk“ · F-166 Kopfleiste für schmale Bildschirme · F-167 Ampelfarben der Plus-Knöpfe.
- **F-165 umgesetzt:** Knopf „+ NewDesk“ neben dem Desk-Namen (`Win.addDesk`, Aktion `addDesk`), legt „Desk N“ mit „Portal N“ an und öffnet ihn per `openAppWindow`. Test ergänzt. Von Enrico noch nicht im echten Popup bestätigt.
- **F-160 Stufe 1 umgesetzt:** Knopf ⇄ (Menu, ab zwei Desks) listet alle Desks mit Portalzahl und Fokusfarbe; Wahl lädt dieses Browserfenster mit `?win=<id>` neu (`switchDesk` in App.tsx), ist der Desk schon offen, wird sein Fenster nach vorn geholt. `window.name` folgt jetzt dem gezeigten Desk (auch Main Desk). Offen: Stufe 2 (automatisch sammeln, „Desks hier sammeln“ / „verteilen“, Tastenkürzel).
- **F-166 umgesetzt:** Raster `minmax(0,1fr) auto minmax(0,1fr)`; unter 1100 px linksbündig (`auto minmax(0,1fr) auto`), Knöpfe nur als Zeichen (`.tb-label` visuell versteckt, Name bleibt für Bildschirmleser/Tooltip), Desk-Name mit Ellipse; < 600 Suchfeld flexibel, < 480 Fokusanzeige nur Zahl, < 420 kein Logo, Suche als Lupe, die sich bei Fokus über die Kopfleiste legt. Geprüft 1440–375 px ohne Überlappung (Main Desk und Desk 2). Offen: 320 px (Fokusanzeige unter Zahnrad).
- **F-167 umgesetzt:** `effectOf(ws, panels, tabs)` und `deskFocusOf(ws, win)` in `focus.ts`; Plus-Knöpfe („+ NewSlot“, „+ NewDesk“, Portal-Kopf, Stack-Leiste: +1 Portal; Tab-Plus: +0,5) in der Ampelfarbe danach (`StackAddIcon color`, `Fx`-Typ in PanelFrame), Desk-Name-Rahmen in der Farbe des Desk-Fokus (gleiche Regel nur für seine Portale). Tooltip/aria: „danach Fokus gelb (10 Punkte)“. Nach Test Enrico gedämpft: nur das Plus farbig, 1-px-Rahmen mit 30–45 % Farbe, kein Schein. Test ergänzt.
- **Kleinkram:** Cockpit-Hilfetext (sr-only, `#overview-help`) auf neue Begriffe; Menüs am linken Rand bleiben im Bild (`Menu` in PanelFrame); Silberverlauf von `.brand` machte Knopfschrift durchsichtig → `-webkit-text-fill-color: currentColor` für Knöpfe/Eingaben im Desk-Bereich.
- Tests 120/120 (Ersatz-vitest), Typprüfung grün.

## Noch zu committen

- Dateien: `web/src/App.tsx`, `App.css`, `components/PanelFrame.tsx`, `components/StackBar.tsx`, `workspace/focus.ts`, `workspace/terms.ts`, `workspace/workspace.test.ts`, diese Übergabe. (F-165/F-166 sind schon in Commit d0d73ac.)
- Summary: „F-160 Desk wechseln (⇄), F-167 Plus-Knöpfe und Desk-Name in Ampelfarben, Kopfleiste schmal linksbündig; Übergabe V18“

## Nächste Schritte

1. Sichtprüfung (siehe Startanweisung); „+ NewDesk“ im echten Browser (Popup) testen.
2. **F-156 Hilfe in der Suche** + Hilfe-Knopf (?) – Liste aller Funktionen mit Kürzeln, `TERMS` als Glossar; danach **F-95 Tour**.
3. F-159 (Main Desk ohne Knopf-Look) und F-160 Stufe 2; dabei TERMS.desk anpassen.
4. Danach Farben: F-161 → F-162 → F-163 → F-164 (Funktion vor Design).
5. F-157, F-158; offen aus F-154: Lastenheft-Titel und ältere Einträge; Rückfrage „Mitte = im Portal ablegen, Tauschen mit Umschalt?“; F-27, F-06, F-29 Einstellungen, F-104 Kanban.

## Kleine Punkte

- Leerzustand-Knopf „+ NewSlot“ (keine Portale) ist noch nicht ampelfarbig.
- Fokus je Desk nutzt dieselben Grenzen wie der Gesamtfokus – ggf. eigene Grenzen (Rückfrage an Enrico offen).
- README nennt noch alte Begriffe. Alle Punkte aus V16/V17 „Kleine Punkte“ gelten weiter.

## Technische Rahmenbedingungen

Wie V17. Dev-Server läuft bei Enrico auf `localhost:2910`, im eingebauten Browser erreichbar (`setViewportSize` für Breiten-Tests). Ersatz-vitest: `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain, toMatchObject, not), dann `tsc --outDir ~/vt/out --module commonjs --target es2022 … src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, react verlinken, `node workspace.test.js`. Git nur bei Enrico (GitHub Desktop).

## Arbeitsregeln

Wie V15–V17: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe für Anwender erklären (Tooltips aus `TERMS`) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-168) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
