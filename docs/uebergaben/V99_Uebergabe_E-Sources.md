# Übergabe V99 → V100 E-Sources

Stand: 25.11.2026 · Chat V99 · Nächster Chat: **V100 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V100 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **F-206 Schritt 10** („Gebaut V99“). Entscheidungs-Docs: V96 (https://claude.ai/artifact/B8bKXzxLhqACZrJ2T1gmgE) – alle Vorschläge gelten; V98 „F-206 V98 – Projekte: Datenmodell für PSP, Gantt und Basisplan (Schritt 10)“ (https://claude.ai/artifact/7H8PyejdbccEeJzj3SrKXF, PDF `docs/Arbeitspakete/F-206_V98_Projekte_Datenmodell.pdf`) – **K1–K8 entschieden (Enrico V99: „Wir arbeiten erstmal nach deinem Vorschlag“) = alle Vorschläge gelten** (A1 `duration` in Arbeitstagen, Ersatz A2, sonst 1 Tag, Meilenstein 0; B1 je Vorgang automatisch/manuell, neu = automatisch; Stichtag „fällig am“ nur als roter Hinweis; C1 ein Basisplan am Projekt mit Start, Ende, Dauer, Aufwand, Kosten je Vorgang + Projekt-Start/-Ende/-Budget + Datum; D2 `order` am Projekt; Kalender Mo–Fr ohne Feiertage; Dateiformat 10 in einem Schritt). Leitlinien: **Trello** für Karte und Board, **IPMA ICB4** und **MS Project / iTaskX** für den ganzen Bereich Projekte, Design und Anordnung an unsere Anwendung angepasst, **Funktion vor Design**, NF-08. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ `V61_Nachtrag_…`), Umschalt-Rad `V83_…`, Vorlagen `docs/Arbeitspakete/Vorlagen/LIESMICH.md`; kleine Punkte aus `V74_`–`V99_…` gelten weiter. Dann „Nächste Schritte“ ab 1.

## Was in V99 passiert ist

`npx tsc --noEmit -p .` sauber. Tests mit `vitest-ersatz.js`: workspace 471 (+1) – grün. **Enrico bitte `npm test` in `web/`.** Im eingebauten Browser angesehen (`localhost:2910/?test=voll`, 1440 × 900): Moduswechsel, Projekte anlegen (auch Unterprojekt), Pfeile, Entf mit Rückfrage und Rückgängig, Start/Ende mit Meldung „Ende liegt vor dem Start“, Budget, Ziel, Priorität, Zustand-Rad, Notiz über den Chip „Projekt“ zuordnen, Vorgang im Steckbrief öffnen – alles ging.

1. **Projekt-Modus** – Rad „Arbeitsweise dieses Desks“: **Desk · Notizen · Projekte** (Kopf und Menü „Notizen & Aufgaben“ aus einer Liste `DESK_MODE_OPTIONS` in App). `deskMode.ts`: `DeskMode` + `'projects'` (Test). Im Projekt-Modus liegt `.projlayer` über den Portalen (die ruhen unsichtbar, `.area.is-projects`), Pads und Dock wie im Desk-Modus.
2. **`components/ProjectCockpit.tsx`** (Texte `PROJECTS_TEXT`): Projektliste links (Spalten wie Projektübersicht MS Project/iTaskX), Steckbrief rechts (ICB4) – Einzelheiten im Lastenheft. Aufbau und Tastatur wie Cockpit „Personen“ (gleiche Klassen `pc__…`, eigene `pj__…`).
3. **`components/ProjectChips.tsx`**: Chip „Projekt“ in der Notiz (dritter Eintrag der Zeile „Zuständig · Aufwand“, `PeopleRow` hat dafür `after`), Auswahl mit Suche, Baum, „kein Projekt“, „anlegen“.
4. Symbol `project`, Hilfe „Projekte“, Begriffe in `terms.ts`, CSS am Ende von `App.css` (V99-Block).
5. Lastenheft F-206 Schritt 10 „Gebaut V99“, Zählzeile.

## Nächste Schritte

1. **Dateiformat 10** (K1–K8 entschieden, siehe oben) (`duration`, `manual`, `baseline`, `order`; Parser in `noteObjects.ts`/`storage.ts`, Gist), dann **PSP** (Ansicht im Projekt-Modus, Code aus Präfix + Stelle) → **Gantt** (Vorgänger, kritischer Pfad, Stichtag-Hinweis K3) → Meilensteine → Basisplan → Netzplan → Ressourcen je Projekt (Task-Limit je Projekt) → Bericht (ICB4, PDF) → Projekt-Desk.
2. Projekt-Modus ausbauen (Ansichtsleiste wie MS Project/iTaskX, J2: Projekte · Steckbrief · PSP · Gantt · Netzplan · Meilensteine · Ressourcen · Bericht – als Umschalt-Rad im Kopf der Projektliste), Filter nach Scope (J12), Quellen am Projekt (Q12), Tour „Projekte“ (F-217).
3. Touren aus V98 im Browser messen (`?test=voll`, Cockpit in allen 5 Ansichten; Notizen-Tour mit offenem Pad; Main Stage setzen → Tour startet).
4. Portfolio „Aktuelles“ nachziehen (seit V83; `~/Projects/SchulzEnrico.github.io`, `#aktuell` DE/EN): Notizen, Kanban, Personen/Projektfokus, Main Stage, Touren, Projekte.
5. **Wenn alles steht – Prüfliste für Enrico:** alles aus V77–V98 plus:
   - `npm test` in `web/`.
   - Rad Desk · Notizen · Projekte im Desk-Kopf und im Menü „Notizen & Aufgaben“; Wahl bleibt je Desk nach Neuladen.
   - Projekt-Modus: „+ Projekt“ (mit übergeordnetem Projekt, „ähnlich: …“), Liste mit Pfeilen, F2, Entf + Rückgängig; Steckbrief: Zustand-Rad, Priorität, Scope, Start/Ende (Ende vor Start → Meldung), Budget, Ziel/Vorgehen/Organisation, „noch offen: …“, gerechnete Termine „Übernehmen“.
   - Notiz: Chip „Projekt“ → wählen, neu anlegen, „kein Projekt“; Projektliste zählt den Vorgang; Klick im Steckbrief öffnet die Notiz.
   - Suche „Projekte“ findet die Hilfe.

## Kleine Punkte (neu in V99)

- K1–K8: Spalte „Antwort Enrico“ im Doc V98 ist leer geblieben – Enrico hat im Chat entschieden: alle Vorschläge gelten.
- Zustand-Rad: der Wert gilt erst, wenn das Rad eingerastet ist (wie alle Räder, gut 1 s) – im Browser-Test daher auf die Änderung warten.
- Main Stage im Projekt-Modus: Pads weichen weiter der (unsichtbaren) Stage aus (`notesMode ? undefined : stageOf` – Projekt-Modus nicht eingerechnet). Bei Bedarf wie im Notizen-Modus abschalten.
- Meldung beim Moduswechsel steht weiter unten am Rand (alter Weg `notify`), nicht am Rad – „Meldungen am Ort“ bei Gelegenheit nachziehen (gilt auch für Desk/Notizen).
- Kopfzeile bei 1440 px: „NewDesk“ wird neben dem Rad abgeschnitten („NewDe…“), die Fokus-Zeile überlappt „Notizen & Aufgaben“ leicht – vorher nicht verglichen, ob neu.
- Budget-Feld zeigt nach dem Speichern „12500“ (ohne Tausenderpunkt); Kennzahlen zeigen „12.500 €“.
- Projekt-Chip wirkt sofort am gespeicherten Stand der Notiz (wie Quellen), nicht im Entwurf – „Verwerfen“ nimmt die Zuordnung nicht zurück.
- `.help__run` ist ab Werk unsichtbar (`opacity: 0`, nur im Hilfe-Dialog beim Darüberfahren) – neue Bereiche brauchen eine Freigabe wie `.projlayer .help__run { opacity: 1; }`.

## Commit-Text V99

**Summary:** `V99: F-206 Schritt 10 – Projekt-Modus mit Projektliste und Steckbrief, Projekt an der Notiz`

**Description:**
```
- Rad „Arbeitsweise dieses Desks“: Desk · Notizen · Projekte (Kopf und
  Menü gleich), DeskMode 'projects' je Gerät und Desk
- Projekt-Modus: Projektliste wie Projektübersicht MS Project/iTaskX
  (eingerückte Unterprojekte, Zustand, Start/Ende – gerechnet kursiv,
  Fortschritt, Vorgänge, Aufwand, Meilensteine, überfällig), + Projekt
  mit „ähnlich: …“, F2, Entf mit Rückfrage und Rückgängig am Ort
- Steckbrief nach IPMA ICB4: Zustand-Rad, Priorität, Scope, übergeordnetes
  Projekt, Start/Ende mit Prüfung, Budget, Ziel/Vorgehen/Organisation,
  „noch offen: …“, Kennzahlen, Vorgänge (öffnen im Pad)
- Chip „Projekt“ in der Notiz mit Auswahl und Anlegen
- Symbol, Hilfe „Projekte“, Begriffe, Test DeskMode
- Lastenheft F-206 Schritt 10, Übergabe V99
```
