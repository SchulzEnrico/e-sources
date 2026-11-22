# Übergabe V31 → V32 E-Sources

Stand: 22.11.2026, Abend · Chat V31 abgeschlossen · Nächster Chat: **V32 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V32 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Im Farben-Block sind F-161, F-162 und F-163 fertig; als Nächstes kommt **F-164** Regelübersicht im Cockpit (danach F-171 Stufe 2, zusammen mit **F-183** Icons). Lies vorher F-164, F-171 und F-183. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** `docs/Lastenheft/Lastenheft_E-Sources.md` (160 Einträge: **96 fertig, 13 teilweise, 1 ersetzt, 50 offen**). Offen aus V27: Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 nicht nachgezogen – klären, ob es noch gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-185)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V31 passiert ist

- V30 war schon committet (f965e60).
- **F-163 ✓ – Farbregeln über Kategorien.** Entscheidungen Enrico (im Lastenheft): Library-Kategorien nutzen; Regel = Rahmen + optional Akzent; Vorrang **Portal > Slot > Kategorie > Desk**; beim Anlegen **immer nachfragen**.
  - `types.ts`: `Category extends Named { tint? }` (`Workspace.categories: Category[]`), `PanelMeta.category?` ('' = bewusst ohne, fehlt = nie gefragt), `Workspace.siteCategory?: Record<domain, id|''>`.
  - `category.ts` (neu): `suggestCategory` (Source mit gleicher Adresse → gemerkte Domain → häufigste Library-Kategorie der Domain → bekannte Seite aus `sortHelp.KNOWN`), `setPanelCategory` (merkt Domain), `setPanelNewCategory`, `setCategoryTint`, `categoryOf`, `categoryTint`, `categoryPortals`.
  - `tint.ts`: `mergeTint`/`sameTint` exportiert; `shownTint(panel, slot, category?)`, `TintFrom` mit `'category'`.
  - `bookmarks.deleteCategory`: Portale der Kategorie → ohne, gemerkte Domains weg. `storage`: Farben der Kategorie, `panel.category`, `siteCategory` werden geprüft.
  - Reducer: `panelCategory`, `panelNewCategory` (Id kommt von außen), `tintCategory`.
  - App: Frage als **Hinweis unten mit mehreren Knöpfen** (`notify` nimmt jetzt ein Array `FlashAction[]`): „„X“ zeigt youtube.com. Kategorie „Video“?“ → „Video übernehmen“ / „Andere …“ / „Ohne“; ohne Vorschlag „Kategorie wählen …“ / „Ohne“; bei gemerkter „ohne“-Wahl „Ohne“ / „Andere …“. Auslöser: Effekt auf `ws.panels` – Portal dieses Desks ohne Kategorie zeigt eine neue Domain (je Portal und Domain einmal je Sitzung; beim Start vorhandene Adressen fragen erst bei neuer Domain). Hinweis steht 12 s.
  - Dialog „Farben“: neuer Bereich **„Kategorie“** am Ende (Reihenfolge = Vorrang): Auswahlliste (Ohne / Kategorien / „Neue Kategorie …“ → Namensfeld, Enter legt an, Esc bricht nur das Feld ab), Rahmen („Ohne“) und Akzent („Wie Desk“), „Farben gelten für n Portale“. Slot-Zeilen zeigen „Wie Kategorie“, wenn die Kategorie eine Farbe hat. Aus der Frage oder über die Kategorie in der Kopfzeile geöffnet, liegt der Fokus auf der Auswahl.
  - PanelFrame: Knopf `.win__cat` in der Kopfzeile mit Farbpunkt (aria-hidden) und Name, aria-label „Kategorie „X“ – Farben ändern“.
  - Texte `CATEGORY_TEXT`; Hilfe-Eintrag `colorRules`; `TINT_TEXT.short/intro` nennen die Kategorie.
  - Geprüft im eingebauten Browser (`?test=voll`): YouTube-Adresse → Frage mit „Video“ → übernommen, Kopfzeile zeigt Kategorie; Rahmen grün für „Video“ → Portal `win--framed`, `--frame #64a970`, Slot zeigt „Wie Kategorie“; Esc → Fokus auf ⋮; „Neue Kategorie …“ → „Lernen“ angelegt und gewählt; example.org → Frage ohne Vorschlag.
- Tests: 4 neue → **180, alle grün**. `tsc --noEmit` sauber.

## Nächste Schritte

1. Enrico: committen (Vorschlag: „Farbregeln über Kategorien: F-163; Übergabe V31“) und pushen.
2. Enrico in Chrome ansehen: Frage nach der Kategorie beim Öffnen einer Source und beim Tippen einer Adresse; Kategorie-Knopf in der Kopfzeile auf normal breiten Portalen (in der Testbelegung sind die Portale so schmal, dass nur der Farbpunkt zu sehen ist).
3. F-164 Regelübersicht im Cockpit (Farbregeln je Kategorie, Zuordnung Domain → Kategorie aus `siteCategory`, Sammeln der Desks F-160), danach F-171 Stufe 2 und F-183.

## Kleine Punkte

- Neu: Nach einem neuen Portal kommen jetzt zwei Hinweise nacheinander (erst „Farbe wählen …“, nach der ersten Adresse die Kategorie-Frage) – evtl. den ersten weglassen.
- Neu: Die Kategorie eines Portals bleibt, auch wenn es später eine ganz andere Seite zeigt (nur bei noch nie gewählter Kategorie wird neu gefragt). Ändern über Kopfzeile oder ⋮ → Farben.
- Neu: Wird der Hinweis ignoriert, fragt E-Sources für dieses Portal erst bei der nächsten neuen Domain wieder (bzw. nach Neuladen nicht mehr für die aktuelle).
- Neu: Kategorie-Knopf hat kein Zeichen (kommt mit F-183); in sehr schmalen Portalen ist der Name abgeschnitten.
- Neu: Library-Liste zeigt die Kategorie-Farben noch nicht (wäre ein Farbpunkt neben der Überschrift, `.bm-cat`).
- Neu: Kategorie-Farbe gilt desk-übergreifend (Kategorien sind global) – wie gewollt? „Alle auf Desk-Farben zurücksetzen“ (F-162) lässt Kategorie-Farben unberührt.
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
