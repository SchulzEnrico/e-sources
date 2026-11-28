# Übergabe V157 → V158 E-Sources

Stand: 28.11.2026 · Chat V157 · Nächster Chat: **V158 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V158 E-Sources**. Lies diese Übergabedatei, dann im Lastenheft **„Gebaut V157“** und **„Gebaut V156“** (unter F-236) und **F-227** (Handbuch). Docs K14 https://claude.ai/artifact/4u9FXZYv8BKUVC2VqzQ5Wy, F-236 https://claude.ai/artifact/HfV14fYQiE26JdKwsMQnGP, F-232 https://claude.ai/artifact/FJY3u5QVqoNtku1MhNDhKn, V156 https://claude.ai/artifact/F7iBBE93raKoH4eGpZVQep sind entschieden – nur auf neue Kommentare prüfen (`query`; Stand V157: keine). **Erstes Paket V158: Rest der Browser-Prüfrunde** (Liste „Noch nicht im Browser geprüft“ unten), Mängel gleich beheben (Funktion vor Design). **Dann:** Ergebnis von Enricos `npm audit` einordnen (siehe unten). Enricos Daten nicht verändern: nur ansehen bzw. mit `?test=voll` + Knopf „Beispiel ‚ColorGentlemen‘“. **In jedem Chat vor der Übergabe:** `python3 tools/live_project.py V<n> <JJJJ-MM-TT>`. Enricos Testphase ab 07.12., Termin Fr 04.12. **Prüfdateien (F9) erst ab 07.12.** Leitlinien: **Rangfolge 1. IPMA ICB4, 2. MS Project/iTaskX/Trello, 3. unsere Sicht**, **Dokumente wie im Report** (Vorlage `docs/Arbeitspakete/Vorlagen/Report_ColorGentlemen_CG-1.pdf`), **Funktion vor Design**, **Texte in Grafiken nie über Feldränder**, **Meldungen am Ort**, NF-08, F-231. Arbeitsregeln und Technik `V61_Uebergabe_E-Sources.md` (+ Nachtrag), Umschalt-Rad `V83_…`, Browser-Hinweise `V150_…`/`V152_…`/`V156_…` und unten, kleine Punkte aus `V74_`–`V157_…` gelten weiter. **Handbuch** bei jeder Änderung mitführen. **Dashboards** zählen wie V127. Am Ende nach dem Begrüßungstext den **Projektstand** als Textbaustein.

**Tests** (VM ist nach jedem Chat leer – neu anlegen): wie `V135_Uebergabe_E-Sources.md`, aber die Testliste aus den Dateien lesen (alle 33 `*.test.ts`):
```
mkdir -p $HOME/vt2/node_modules/vitest && cp $HOME/mnt/Projects/e-sources/docs/uebergaben/vitest-ersatz.js $HOME/vt2/node_modules/vitest/index.js
cat > $HOME/vt2/run.sh <<'EOS'
cd $HOME/mnt/Projects/e-sources/web
rm -rf $HOME/vt2/out
npx tsc --outDir $HOME/vt2/out --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node src/workspace/*.ts >/dev/null 2>&1
for t in ${TESTS:-$(ls src/workspace/*.test.ts | xargs -n1 basename | sed 's/.test.ts//')}; do echo "== $t"; NODE_PATH=$HOME/vt2/node_modules:$PWD/node_modules node $HOME/vt2/out/$t.test.js 2>&1 | tail -3; done
EOS
```
Aufruf `timeout 175 bash $HOME/vt2/run.sh 2>&1 | grep -E "grün|FAIL" | awk '{s+=$1} END{print s}'` mit `timeout_ms: 180000`. Tests V157: **803** grün. `npx tsc --noEmit -p .` sauber.

**Löschen:** keine Freigabe in V157 (nichts gelöscht). Prüfbilder `toc-02.png`, `toc-03.png` in `Projects/Claude outputs` können weiter weg.

## Was in V157 passiert ist

1. **Docs** K14, F-236, F-232, V156: keine neuen Kommentare.
2. **Wichtig – Testbelegung löschte echte Medien:** 30 s nach dem Start räumt die App Bilder, Töne und Tinte auf, die die Arbeitsfläche nicht mehr nennt (älter als 24 h). Das lief auch mit `?test=voll`/`slot` und in eingebetteten E-Sources – deren Arbeitsfläche kennt die echten Medien nicht, der Gerätespeicher (IndexedDB, gleiche Adresse localhost:2910) ist aber derselbe. Jetzt nur noch, wenn die Seite speichern darf (`mayStore()` in `storage.ts`, Aufruf in `App.tsx`). **Gefunden, bevor ich die App im Testmodus geöffnet habe.** Ob frühere Prüfrunden (seit V79) im eingebauten Browser schon Medien gelöscht haben, lässt sich nicht mehr sehen – betroffen wäre nur der Gerätespeicher des eingebauten Browsers, nicht Enricos eigener Browser.
3. **Prüfrunde V150–V156 im eingebauten Browser** (`?test=voll`, Beispiel ColorGentlemen): Layout-Regeln (Primär, Extern in drei Stufen, Nebentext, Ecken, Schatten, Schrift-Rad, Größe, Kopf der Tabellen, Raster), Ansicht „Inhalt“, Seitenleiste „Inhalt“, Farbe je Kasten, Steckbrief-Zeilen, Medien (Einfügen, ✕, Rückgängig, ZIP abgelehnt), Vorlagen. **Mängel behoben:** Kopf der Tabellen in den Formular-Spaltenköpfen; Ecken 0 für Wurzelkasten/Glanz/Legende (+ Test); „Als Vorlage speichern“ mit einem Klick; Rückgängig nach Löschen der letzten Vorlage; Fokus nach ✕/Rückgängig am Ort (Kastenfarbe, Medien, `useFieldMsg`); **Kopfleiste** ohne Überlappung (Fokusanzeige lag bei 1400 px über „?“). Einzelheiten im Lastenheft „Gebaut V157“.
4. **`npm audit`** von hier nicht möglich (Prüfstelle von npm gesperrt). Offline-Liste der Pakete, die Paged.js mitbringt: `@babel/polyfill` 7.12.1, `core-js` 2.6.12, `regenerator-runtime` 0.13.11, `@babel/runtime` 7.29.16, `css-tree` 1.1.3, `mdn-data` 2.0.14, `source-map` 0.6.1, `clear-cut` 2.0.2, `event-emitter` 0.3.7, `es5-ext` 0.10.64, `d`, `es6-iterator`, `es6-symbol`, `esniff`, `ext`, `next-tick`, `type`. Enrico führt `npm audit` in `web/` aus.
5. Handbuch V157 (Kap. 2 Überlauf, 7 Layout-Vorlage, Änderungsverzeichnis); Lastenheft „Gebaut V157“; `APP_VERSION = 'V157'`; Live-Projekt V157 (206 F-Punkte, 3 ersetzt, 131 fertig, 25 teilweise, 47 offen).

## Noch nicht im Browser geprüft (für V158)

- **Eisenhower-Sheet** Alt/⌥+↑/↓ (V153), Projekt › Formulare › 15.2 gleiche Reihenfolge.
- **Regel** „Notiz kommt in den Eingang“ → Tag (V153); Tour „Notizen & Aufgaben“ Schritte Eingang/Gedankenparkplatz.
- **Logo** in der Kopfzeile (Ziehen/Einfügen, auf allen Blättern, ✕) (V154) – Fokus nach ✕ dort ebenfalls ansehen.
- **Bericht** (nur über `document.write` in einen eigenen Tab, Hinweise `V156_…`): Medien, Logo, Kopf der Tabellen, Raster, Druck-Schalter, Kastenfarben.
- **„Übernehmen von“** › Gespeicherte Vorlage in einem zweiten Projekt (V155).
- **„Wo war ich?“** nach einer Pause (V156) – im Test per Zeit schwer; ggf. `visibilitychange` mit verschobener Uhr.
- Steckbrief: Start/Ende leeren → „aus dem Gantt“ (V153).

## Prüfliste für Enrico (zusätzlich zu V77–V156)

- **Kopfleiste** bei deiner Fensterbreite: nichts liegt übereinander; „?“ und Feedback lassen sich klicken; wird es eng, stehen sie unter „weitere Elemente“.
- **Layout › Kopf der Tabellen** dunkelblau → in Formulare die Spaltenköpfe (z. B. 2.2 Projektziele) dunkelblau mit weißer Schrift.
- **Layout › Ecken 0** → Zielhierarchie ganz eckig, auch der oberste Kasten.
- **Als Vorlage speichern:** Namen eintippen und gleich auf den Knopf – ein Klick reicht; letzte Vorlage mit ✕ löschen → „Rückgängig“ steht da.
- Mit der Tastatur: ✕ an einem Bild im Feld bzw. „↺ auf Regel zurücksetzen“ an einem Kasten → Fokus bleibt in der Nähe.
- **`npm audit`** in `web/` (Terminal) – Ergebnis in den nächsten Chat.
- Weiter offen aus V156/V155/V154/V153/V152/V151/V150/V149.

## Browser-Hinweise (V157)

- `browser.tabs.create("http://localhost:2910/package.json")`, `browser.show()`, `setViewportSize({width:1400,height:900})`, dann `goto("/?test=voll")`, Knopf `getByRole('button', { name: /Beispiel „ColorGentlemen“/ })`. Änderungen an `.tsx`/`.css` behielten die Testdaten in V157, an `gpmFigures.ts` auch (Vorschau aber erst nach der nächsten Regeländerung neu).
- **Bildschirmfotos im Vorschaubild hinken oft einen Schritt hinterher** – Zustand per `evaluate` lesen.
- Rad „Ansicht“: `aria-valuetext` meldet die neue Raste erst nach ~1 s; bei mehreren Tasten hintereinander kann eine verschluckt werden – nach jeder Taste lesen.
- Meldungen verschwinden nach einigen Sekunden – „Rückgängig“ im selben Skript prüfen.
- Kopfleiste messen: Skript `measure2` (Überlappung aller Knöpfe der `.toolbar`) – bei Änderungen an der Kopfleiste 700–1920 px durchmessen.

## Kleine Punkte

- **Offen:** `npm audit` (Enrico). Inhaltsverzeichnis im Bericht 2 Seiten bei 53 Einträgen. Eisenhower 15.2 Alt+Pfeile vs. Sheet Alt+↑/↓ (NF-08). Ansicht „Inhalt“ steht im Rad am Ende (V153 schrieb „ganz vorn“) – Reihenfolge folgt der Nutzung, ggf. so lassen.
- Beim Einfügen eines Bilds stehen zwei Meldungen am Feld („Datei eingefügt.“ und „… gespeichert.“) – zusammenfassen wäre ruhiger.
- `localStorage` für Ansichts-Vorlieben (Rad-Stellung, Seitenleiste) wird auch im Testmodus geschrieben – harmlos, aber nicht „nichts wird gespeichert“.
- Unverändert: NF-01 (Apple-Texterkennung), Tinte gerätegebunden, Fußzeile in Browsern ohne Seitenrand-Felder, F-211 (Rechte/Server). Sonst unverändert in `V156_…` bis `V131_…`.

## Commit-Text V157 (e-sources)

**Summary:** `V157: Prüfrunde V150–V156 – Testmodus räumt keine Medien mehr auf, Kopfleiste ohne Überlappung, Layout-Regeln vollständig`

**Description:**
```
- Schutz: Aufräumen von Bildern, Tönen und Tinte nur noch, wenn die Seite speichern darf (nicht in ?test=voll und nicht eingebettet) – sonst hätte die Testbelegung echte Medien im Gerätespeicher gelöscht
- Kopfleiste: rechte Seite behält ihren Platz, die Mitte klappt bei Enge in „weitere Elemente“ ein (vorher lag die Fokusanzeige bei 1400 px über „?“)
- Layout-Vorlage: „Kopf der Tabellen“ auch für die Spaltenköpfe der Formulare; Ecken 0 auch für obersten Kasten, Glanz und Legende
- Vorlage speichern mit einem Klick direkt nach dem Namen; Rückgängig auch nach Löschen der letzten Vorlage
- Fokus bleibt nach ✕ und Rückgängig am Ort (Kastenfarbe, Medien im Feld, Meldungen der Blätter)
- Test Ecken 0; Handbuch V157, Lastenheft „Gebaut V157“, APP_VERSION V157, Live-Projekt V157, Übergabe V157

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Thf8Q5udgaxFD7pTogD6MD
```
