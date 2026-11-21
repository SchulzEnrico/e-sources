# Übergabe V08 → V09 E-Sources

Stand: 21.11.2026, ca. 18:05 · Chat V08 abgeschlossen · Nächster Chat: **V09 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V09 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Wir beginnen mit **F-128 Area** (siehe „Nächste Schritte“). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 (Claude Doc, mit den Docs-Werkzeugen lesen)
- **Repository (öffentlich):** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- **Online-Demo:** https://schulzenrico.github.io/e-sources/ (baut automatisch bei jedem Push auf `main`)
- **Altes Projekt (nur Vorbild):** GitHub `SchulzEnrico/ESourc-es-` (öffentlich, in der Cloud-Umgebung per `git clone --depth 1` lesbar); Mac-Ordner `~/Desktop/Bootcamp/projects/CapstoneProject/esource` ist für Claude **nicht** freigegeben.
- **Frühere Übergaben:** `docs/uebergaben/V01` bis `V07_Uebergabe_E-Sources.md`

## Was in V08 passiert ist

- **Lesezeichen (F-14, F-20, F-21, F-30 bis F-32, gepusht):**
  - `types.ts`: `Bookmark` (`id`, `title`, `url`, `category`, `tags`, `note?`, `panels[]`); `Workspace.bookmarks`, `Workspace.categories` (`Named[]`). Reihenfolge im Array = Position in der Kategorie. Kategorie `''` = „Ohne Kategorie“.
  - Neues Modul `workspace/bookmarks.ts`: `saveBookmark` (anlegen/ändern, URL ergänzt, Titel aus Domain, Tags bereinigt), `deleteBookmark`, `moveBookmark(id, to, category?)`, `dropBookmark(id, targetId)` (nach unten dahinter, nach oben davor), `toggleBookmarkPanel`, `addCategory` (keine doppelten Namen), `renameCategory`, `deleteCategory` (Lesezeichen bleiben, ohne Kategorie), `moveCategory` (noch ohne Oberfläche), `groups(ws, panelId|null, query)`, `matches` (Titel, URL, Kategorie, Tags, Notiz; mehrere Wörter = alle), `bookmarkOf`, `sameUrl`, `collectionSize`, `openBookmark` (offener Tab → hinspringen; leerer Tab → dort; sonst neuer Tab; bei 9 Tabs `'full'`).
  - `removePanel` nimmt das Panel aus `bookmark.panels`, das Lesezeichen bleibt in der Gesamtsammlung.
  - Speicher **`esource.workspace.v6`** (liest v5 und v4), Datei-Format F-121 **Version 3** (liest 1 und 2). Kaputte Lesezeichen fallen beim Laden einzeln weg.
  - Oberfläche `components/Bookmarks.tsx`: Seitenleiste links im Panel (`.drawer`, über der Seite). `BookmarkEditor` (Titel, Adresse, Kategorie inkl. „＋ Neue Kategorie …“, Tags mit Komma, Notiz, Panels als Häkchen; Löschen in zwei Klicks). `CollectionDrawer` („Dieses Panel“/„Alle“, Suche, Gruppen nach Kategorie, Klick öffnet als Tab, ☆/★ zuordnen, ✎ bearbeiten, Ziehen sortiert/verschiebt, Kategorie umbenennen per ✎ oder Doppelklick, löschen in zwei Klicks, unten „Neue Kategorie“).
  - Kopfleiste Panel: Stern ☆/★ rechts **in** der Adresszeile (nur bei offener Seite), Sammlungs-Knopf (Band mit Strichen) links neben der Adresszeile; Menü ⋮ oben „☰ Sammlung (n)“ und „Lesezeichen speichern/bearbeiten“.
  - Von Enrico getestet: Speichern mit neuer Kategorie „Lexika“ und Tags funktioniert. **Bedienbarkeit will Enrico später überarbeiten** („muss mich dran gewöhnen“).
- **F-126 Panelname statt „Platz“ (gepusht):** Stapel-Knopf, Menüpunkt, „+“ der Stapel-Leiste und die Hinweise bei 5/9 Panels nennen den Panelnamen.
- **F-127 Knopf „Ansicht“ (gepusht):** ersetzt „Split 2“ und „Split 4“. Jeder Klick: Arbeitsfläche → 2 × 2 → 2 → 1 (aktives Panel maximiert) → Arbeitsfläche; Esc zurück. `ViewIcon` zeigt die aktuelle Ansicht, Tooltip „Ansicht: … · Klick: …“.
- **F-15, F-125 Lineal (Commit bei Enrico offen):** nach dem alten `Ruler.tsx` (Striche alle 10/50/100 px oben und links, Zahlen alle 100 px, 9 Farben). Neu `components/Ruler.tsx`: liegt über der Seite mit `pointer-events: none` (Seite bleibt bedienbar), Größe des Anzeigebereichs unten rechts, kleine Leiste oben rechts (Farbpunkt: Klick/Mausrad, „123“, ×). `Workspace.ruler` (`on`, `labels`, `color`), `PanelMeta.ruler?` (Wahl je Panel geht vor). Funktionen `rulerShown`, `toggleRulerAll` (hebt Einzelwahl auf), `toggleRulerPanel`, `setRulerStyle`, `RULER_COLORS`. Knöpfe: „Lineal“ in der Hauptkopfleiste (alle), Lineal-Symbol in jeder Panel-Kopfleiste links neben ⤢ (Enrico-Wunsch), Menü ⋮.
- **Stapel-Leiste:** Doppelklick auf einen Eintrag benennt das Panel um (Commit offen). Die grüne Tab-Linie endet bei Panels im Stapel an der Stapel-Leiste (`.tabs--stacked`, `--tabs-cut: 24px`; Linie jetzt als Hintergrund statt Rahmen).
- **Umbenennung F-116:** Ebene Privat/Geschäftlich heißt jetzt **Sphere** (`PanelMeta.sphere`, `Workspace.spheres`; alte Felder `area`/`areas` werden beim Laden übernommen). Der Begriff **Area** ist frei für F-128.
- **Lastenheft:** F-126, F-127, F-128 neu; F-116, F-119 auf „Sphere“ umgestellt. Weiter ab **F-129**.
- Tests **62/62** grün (bei Enrico zuletzt 60/60 vor dem Lineal), Typprüfung grün.

## Nächste Schritte

0. **Erst kurz prüfen:** Ist der Commit „F-15, F-125 Lineal …“ samt dieser Übergabe gepusht? Dann `npm test` (62).
1. **F-128 Area:** Liegen mehrere Panels auf einer Stelle, ist das eine Area mit eigenem Namen. Kopfleiste: groß der Area-Name, klein darunter der Name des aktiven Panels (Enrico-Wunsch nach Screenshot der Panel-Kopfleiste). Area-Name umbenennbar. **Vorher mit Enrico klären:** Standardname einer neuen Area (z. B. Name des ersten Panels oder „Area 1“). Technik: Plätze (`Place`) gibt es je Bildschirm-Einstellung; der Name muss überall gelten. Idee: Name am **Panel-Satz** festmachen (z. B. `Workspace.areaNames: Record<erstes Panel-Id, string>` oder Gruppen-Id an den Panels) statt am `Place` – vorher abwägen. Begriff „Platz“ in Kommentaren/Code ggf. schrittweise zu „Area“.
2. Lesezeichen-Bedienung mit Enrico überarbeiten (wenn er so weit ist).
3. Design aus der Sammlung: F-67, F-68, F-69, F-114, F-115.
4. Später: F-27, F-40 (Ablage, dann F-43 „in die Ablage verschieben“), F-33/F-34 zentrale Suche über alle Panels.

## Kleine Punkte (zum Auffüllen)

- Grüne Tab-Linie: bei **ausgeklappter** Stapel-Leiste läuft sie über deren breiteren Teil hinaus (eingeklappt passt es).
- Kategorien per Ziehen sortieren (Funktion `moveCategory` gibt es schon).
- Lineal: auf iPhone/iPad prüfen (Mausrad-Farbwechsel gibt es dort nicht, Klick schon).

## Notiert (noch nicht im Lastenheft, beim nächsten Sammeln eintragen)

- **Demo-Startbelegung:** Besucher sehen leere Panels; Idee: Beispiel-Layout mit einbettbaren Seiten.
- Tabs und Lesezeichen per Ziehen nutzen HTML5 Drag & Drop – auf iPhone/iPad prüfen, ggf. auf Zeiger-Gesten umbauen.
- Panels zwischen Plätzen verschieben (einzelnes Panel aus einem Stapel auf einen anderen Platz) gibt es noch nicht.
- Profil-PDF ist 2,6 MB (Bilder in voller Auflösung).

## Offene Rückfragen an Enrico

- F-128: Standardname einer Area.
- **F-69 Chakren-Farben:** genaue Farbwerte (PDF „Die 7 Chakren – Übersicht“).
- F-116 bis F-119: ✓/✕ im Lastenheft.
- Linie des aktiven Tabs oben – so gewollt?

## Offen (unverändert)

- `npm audit`: 3 Schwachstellen ansehen, **nicht** `npm audit fix --force`.
- Server-Standort und Kosten, Apple-Entwicklerkonto (bis Stufe 8).

## Technische Rahmenbedingungen

- Claudes Shell auf dem Mac (`device_bash`) ist eine Linux-VM **ohne Internet**, darf ohne Freigabe **nicht löschen**; `.git` nur lesen (`git --no-optional-locks`). **npm und git laufen in Enricos Terminal / GitHub Desktop.** Der Home-Ordner der VM wechselt je Chat (`~/vt` muss neu angelegt werden).
- Verbundene Ordner: `~/Projects`, `~/Documents/GitHub/SchulzEnrico.github.io` (in der VM `~/mnt/Projects`, `~/mnt/SchulzEnrico.github.io`). Weitere Ordner-Freigaben wurden in V08 von der Umgebung abgelehnt.
- Typprüfung in der VM: `node node_modules/typescript/bin/tsc --noEmit -p .` (in `web/`, prüft auch Komponenten).
- Tests ohne Vite: Ersatzmodul `~/vt/node_modules/vitest/index.js` (describe/it/expect mit toBe, toEqual, toHaveLength, toContain; toEqual vergleicht per JSON), dann `tsc --outDir ~/vt/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts`, `cp -r ~/vt/node_modules ~/vt/out/`, `cd ~/vt/out && node workspace.test.js`.
- Code-Änderungen per Python mit exakten Ersetzungen (je `assert count == 1`) – bewährt.
- Bilder/Icons: Cloud-Umgebung hat `rsvg-convert`, Playwright und `/usr/bin/google-chrome`; Ergebnisse mit `device_commit_files` zurückschreiben. Bauen (`vite`) geht dort nicht (node_modules sind für macOS).
- Lastenheft-Bearbeitung: neue Einträge mit `insert` nach der letzten Liste (`side: after`); Wörter per `find` ersetzen (ohne Guards). Bei `replace` eines ganzen Listeneintrags den `h` des **listItem** als `ifHash` nehmen.
- Portfolio: bei jeder CSS-Änderung die Version `?v=…` in `index.html`, `en/index.html`, `impressum.html`, `en/legal-notice.html` erhöhen (zuletzt `20261121c`).
- Enricos Mac: Node 24, Java 21, Chrome; lokal http://localhost:2910.
- **Committen:** GitHub Desktop (Summary → „Commit to main“ → „Push origin“; Enrico schreibt „PO ist durch“) oder Terminal in neuem Tab.

## Arbeitsregeln

- **Funktion vor Design** (Ausnahme: ausdrücklicher Wunsch).
- **Offene Punkte immer im Blick:** Claude führt die offenen Punkte aus Lastenheft und Übergabe mit und nutzt Restplatz im Chat für passende **kleine Punkte** aus dem Lastenheft – schlägt sie von sich aus vor.
- **Lastenheft ist die Grundlage:** Neue Wünsche mit Nummer eintragen, bevor sie gebaut werden. Weiter ab **F-129**.
- **Sammelmodus** `>START` … `<ENDE`.
- **Terminal-Anleitungen:** immer nur den nächsten Schritt, dann nachfragen.
- **Übergaberegel:** nach jeder Ausbaustufe, spätestens bei 60–70 % Chat-Füllstand, nie mitten in einer Aufgabe; Claude kündigt sie vorher an.
- **Übergabedatei:** `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
