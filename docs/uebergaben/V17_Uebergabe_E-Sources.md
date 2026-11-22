# Übergabe V17 → V18 E-Sources

Stand: 22.11.2026, Mittag · Chat V17 abgeschlossen · Nächster Chat: **V18 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V18 E-Sources**. Lies diese Übergabedatei und das Lastenheft (Link unten). Prüfe zuerst kurz im Browser (`?test=voll` und Demo), ob die neuen Begriffe überall stimmen, dann weiter mit **F-156 Hilfe in der Suche** (Grundlage: `workspace/terms.ts`). Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft (verbindlich):** https://claude.ai/artifact/5Lcrj6JwXyEvUMcJjZQRY8 – Begriffstabelle ist neu (F-154); F-154 hat einen Umsetzungs-Vermerk
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick-Liste noch nicht nachgezogen (F-151 bis F-156)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`
- Frühere Übergaben: `docs/uebergaben/V01` bis `V16_Uebergabe_E-Sources.md`

## Was in V17 passiert ist

- **F-154 Umbenennung der Oberfläche** (fertig): Desk / Main Desk / Desk N (`MAIN_NAME`, `nextWindowName`), View mit Dashboard / 2 × 2 / 2 / Solo (`VIEW_NAME`), Slot / „+ NewSlot“ (`AREA_DEFAULT = 'NewSlot'`), Stack, Portal / Portale, Source (Webseite und einzelnes Lesezeichen), Library (Sammlung; je Portal „Library dieses Portals“), Cockpit, Fokusanzeige (`focusText`), Adjust (`.sizebar`), Case/Space in der Suche. „⧉ In neues Fenster“ → „⧉ Neuer Desk“; Öffnen außerhalb heißt „In neuem Browserfenster“. Export/Import: „Desks exportieren/importieren“, Meldungen sprechen vom „Stand“.
- **Begriffe erklären (Wunsch Enrico):** neues Modul `workspace/terms.ts` (`TERMS.desk`, `slot`, `stack`, `portal`, `source`, `library`, `cockpit`, `focus`, `adjust`, `view`, `dashboard`). Schon genutzt in Tooltips von Desk-Name, View-Knopf, „+ NewSlot“, Stack-Leiste, Cockpit-Überschrift, Library-Knopf, Adjust-Leiste; Kopfzeile jedes Portals nennt „Portal „Name““.
- **Nachbesserung nach Test Enrico:** Desk-Name steht jetzt neben dem Logo (Logo + Name gemeinsam in `.toolbar > .brand`, damit das 3-Spalten-Raster der Kopfleiste und die Fokusanzeige rechts bleiben) (Main Desk fest, weitere Desks umbenennbar, Tooltip aus `TERMS.desk`); angelegte Slots heißen „Slot N“ (`AREA_DEFAULT = 'Slot'`, der Knopf bleibt „+ NewSlot“); ausgeklappte Stack-Leiste zeigt oben „Stack · N Portale“ (`.stack__label`); alte Namen „NewArea N“/„NewSlot N“ werden beim Laden zu „Slot N“ (`storage.ts`) – nichts muss gelöscht werden.
- Code-Namen und Kommentare unverändert (win, Area, Panel …). Tests 118/118 (nur Prüftexte angepasst, Testbeschreibungen unverändert), Typprüfung grün, `?test=voll` im eingebauten Browser geprüft.
- Lastenheft: Begriffstabelle ersetzt (mit Spalte „Früher“), F-154 mit Umsetzungs-Vermerk. Ältere Einträge und der Dokumenttitel nutzen noch alte Begriffe (bewusst, Hinweis unter der Tabelle).

## Noch zu committen

- Dateien: `App.tsx`, `App.css`, `workspace/storage.ts`, `components/{Bookmarks,Overview,PanelFrame,Ruler,Search,StackBar}.tsx`, `workspace/{focus,probe,transfer,windows,workspace,workspace.test}.ts`, **neu** `workspace/terms.ts`, diese Übergabe.
- Summary-Vorschlag: „F-154: Oberfläche umbenannt (Desk, Slot, Stack, Portal, Source, Library, Cockpit, Adjust), Begriffserklärungen, Desk-Name im Header, Stack-Beschriftung, Slot N; Übergabe V17“.

## Nächste Schritte

1. Sichtprüfung der Begriffe in Chrome (Demo + `?test=voll`, Cockpit, Menüs, Adjust, Library-Schublade, Suche).
2. **F-156 Hilfe in der Suche** + Hilfe-Knopf (?) – eine Liste aller Funktionen mit Kürzeln; `TERMS` als Glossar einbinden; danach **F-95 Tour**.
3. **F-157** bebilderte Erklärungen (Schema/Screenshots mit Hinweisen zu `TERMS`) und **F-158** Export/Import je Slot (neu im Lastenheft). Offen aus F-154: Lastenheft-Titel und ältere Einträge.
4. Offene Rückfrage: Mitte auf dem Dashboard = „Im Portal ablegen“, Tauschen mit Umschalt?
5. F-27 weiter, F-06, F-29 Einstellungen, F-104 Kanban.

## Kleine Punkte

- README nennt noch alte Begriffe (war schon veraltet).
- Vom Nutzer vergebene Portalnamen wie „Panel 1“ bleiben (das sind Daten); nur neue Portale heißen „Portal N“.
- Alle Punkte aus V16 „Kleine Punkte“ gelten weiter.

## Technische Rahmenbedingungen

Wie V16, dazu:
- Umbenennen sicher: auf Kopie unter `~/work` arbeiten und danach per `cp` zurück (git darf ohne Löschrecht nichts zurücksetzen). Hilfsskript-Idee: Ersetzungen nur innerhalb von Zeichenketten/JSX-Text, danach Diff mit `git diff --no-index --word-diff`.
- Ersatz-vitest unter `~/vt` (VM-Home wechselt je Chat, neu anlegen).

## Arbeitsregeln

Wie V15/V16: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe für Anwender erklären (Tooltips aus `TERMS`) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-159) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/`.
