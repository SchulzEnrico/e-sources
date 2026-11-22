# Übergabe V27 → V28 E-Sources

Stand: 22.11.2026, später Nachmittag · Chat V27 abgeschlossen · Nächster Chat: **V28 E-Sources**

## Startanweisung für den neuen Chat

> Das ist Chat **V28 E-Sources**. Lies diese Übergabedatei und das Lastenheft unter `docs/Lastenheft/Lastenheft_E-Sources.md`. Die Reihenfolge im Lastenheft (Abschnitt „Stand und Reihenfolge“) ist freigegeben. Mach mit **F-160 Stufe 2** weiter (Desks im Main Desk sammeln und wieder verteilen, Tastenkürzel), danach **F-159**. Halte dich an die Arbeitsregeln am Ende dieser Datei.

## Links

- **Lastenheft:** Arbeitskopie im Repo `docs/Lastenheft/Lastenheft_E-Sources.md` (von Enrico in V27 aus dem Claude Doc abgelegt; dort F-168 schon auf `[✓ V27]` gesetzt, Zählung 89/14/1/54). Das Claude Doc https://claude.ai/artifact/5LcrJ6JwXyEvUMcJjZQRY8 war aus V27 nicht erreichbar („access denied“) – falls es verbindlich bleibt, dort F-168 `[✓ V27]` und die Zählung nachziehen. Klären, welche Fassung künftig gilt.
- **Benennung – Ergebnis:** https://claude.ai/artifact/5Di2hzfovkm1NcmV3bocdp
- **Geschichte der Anwendung:** https://claude.ai/artifact/QjpbDizWw2VzQzWNmZgirP – Ausblick noch nicht nachgezogen (F-151 bis F-183)
- **Repository:** https://github.com/SchulzEnrico/e-sources · lokal `~/Projects/e-sources`

## Was in V27 passiert ist

Stand Lastenheft danach: **89 fertig, 14 teilweise, 1 ersetzt, 54 offen** (von 158).

- **F-168 Hinweis „Neue Version verfügbar“ ✓**
  - `vite.config.ts`: Plugin `e-sources-build-id` – Build-Kennung (Zeitpunkt, z. B. `20261122T153033`) als `__BUILD_ID__` im Code (Deklaration in `src/env.d.ts`) und als `version.json` im Build (`{"build": …}`); im Dev-Server liefert eine Middleware dieselbe Datei (no-store).
  - `workspace/update.ts` (rein, getestet): `parseBuild`, `isNewBuild`, `dueCheck` (Rückkehr frühestens nach 1 min, sonst alle 30 min), `versionUrl` (mit Unterpfad und Zeitstempel gegen Zwischenspeicher).
  - `workspace/useUpdate.ts`: Hook `useUpdateCheck(current, enabled)` – prüft bei `visibilitychange`, `pageshow` (iOS-Zurückblättern), `online` und per Intervall, nur wenn die Seite sichtbar ist; „Später“ blendet für genau diese Version aus.
  - `components/UpdateNotice.tsx`: Karte unten links (kein Dialog, nimmt keinen Fokus), „Neu laden“ (aria-label „E-Sources neu laden“, weil jedes Portal auch „Neu laden“ hat) und „Später“, Esc blendet aus. App sagt per `sayLive` an. Nicht in eingebetteten E-Sources.
  - Begriff `TERMS.update`, Hilfe-/Suchpunkt `reload` („Neu laden“, Suchwörter neue Version, Update, iPhone …), `HelpRun 'reload'`.
  - Ausprobieren: `?test=voll&version=alt` (tut so, als liefe eine alte Version). Die Prüfung beim Zurückkehren greift frühestens 1 min nach dem Laden.
  - Geprüft im eingebauten Browser: Hinweis erscheint und wird angesagt, Esc blendet aus, „Neu laden“ im Hinweis und aus der Suche lädt neu, Lage bei 390 × 844 in Ordnung.
  - **Nicht geprüft:** `npm run build` (in Claudes VM fehlt das Rollup-Paket für Linux). Enrico: einmal `npm run build` und schauen, ob `web/dist/version.json` entsteht. Der GitHub-Workflow baut ohnehin frisch.
- Tests: 5 neue → **163, alle grün**. `tsc --noEmit` sauber.
- **Tests in Claudes VM:** Ersatz-vitest wie in V26 beschrieben (in V27 neu geschrieben, mit toBeTruthy/toBeFalsy/Vergleichen dazu). Beim Übersetzen meldet tsc für `useUpdate.ts` „import.meta“ (wegen `--module commonjs`) – harmlos, die Tests laufen trotzdem; wer es sauber will, nimmt `useUpdate.ts` beim Übersetzen aus.
- Browser-Tipp: Wenn der eingebaute Browser nicht sichtbar ist, meldet die Seite `visibilityState = hidden` – vorher `browser.show()`.

## Nächste Schritte

1. Enrico: e-sources committen (Vorschlag: „Hinweis Neue Version verfügbar: F-168; Lastenheft als Markdown; Übergabe V27“) und pushen. Achtung: `docs/Lastenheft/v1 Lastenheft_E-Sources.pdf` ist als gelöscht markiert – gewollt?
2. **F-160 Stufe 2** (siehe Lastenheft): automatisches Sammeln, sobald ein Desk kein eigenes Fenster mehr hat; Befehle „Desks hier sammeln“ und „wieder auf Fenster verteilen“ (auch im Cockpit); Tastenkürzel nächster/voriger Desk mit Ansage; TERMS.desk anpassen („eine eigene Arbeitsfläche mit Slots, in eigenem Fenster oder gesammelt im Main Desk“). Ein gesammelter Desk wird kein Dashboard.
3. Danach F-159, dann Farben-Block usw. laut Reihenfolge.

## Kleine Punkte

- Neu: Hinweis „Neue Version“ überdeckt im Testmodus den Link „Test: voll“ unten links (nur dort).
- Neu: Kein Hinweis, wenn eine Seite während der Prüfung offline ist – erst beim nächsten Mal (gewollt).
- Neu: Ein Service Worker (Offline-Betrieb) gibt es nicht; käme er, muss F-168 auf dessen Update-Ereignis umgestellt werden.
- Aus V26 unverändert offen: Kennfarbe/Initialen am Zahnrad oder als Konto-Knopf; Begrüßung in Zusatz-Desks; Profil-Name je Tastendruck gespeichert; Import per Ziehen der Datei; Sortierhilfe-Regeln (F-163); Link „Ohne Kategorie“ → Sortierhilfe; „Rückgängig“ nach Import; Hinweis bei sehr vielen Kategorien; Launcher meldet keine Popup-Sperre; gesperrte Sources aus der Library im Portal; Launcher-Lage je Desk statt je Bildschirmgröße; Toast erst mit Inhalt eingehängt (`sayLive` nutzen); Kürzel im iframe-Fokus (Hinweis in der Hilfe); Hilfe-/Design-Dialog geben Fokus nach Esc nicht zurück, wenn Auslöser weg; zweizeilige Kopfleiste Tab-Reihenfolge; Terminal-Akzent/Toast beim schnellen Designwechsel; schmale Portale ohne Portalnamen; Hilfe-Dialog freier Platz für „Ausführen“; Fokus je Desk mit Gesamtgrenzen (Rückfrage offen); README mit alten Begriffen.

## Technische Rahmenbedingungen

Git nur bei Enrico (GitHub Desktop). Enricos Dev-Server (`npm run dev`, http://localhost:2910) ist im eingebauten Browser erreichbar; Änderungen über device_bash kommen per Hot Reload sofort an (Änderungen an `vite.config.ts` starten den Dev-Server neu). Messen und Testen mit `?test=voll` (nichts wird gespeichert; Touren starten dort nicht von selbst) und `page.setViewportSize`. `tsc --noEmit` in `web/`. `vite build` geht in Claudes VM nicht (Rollup-Binärpaket für macOS).

## Arbeitsregeln

Wie V15–V26: Funktion vor Design · Barrierefreiheit immer (NF-03) · Begriffe erklären (Texte nur in terms.ts/help.ts) · offene Punkte im Blick, Restplatz mit kleinen Punkten füllen · Lastenheft zuerst (ab F-183) · Sammelmodus `>START` … `<ENDE` · Terminal: nur nächster Schritt · „PO“ = Push Origin · Übergabe spätestens bei 60–70 %, nie mitten in einer Aufgabe · Datei `Vxx_Uebergabe_E-Sources.md` unter `docs/uebergaben/` · Usability: so einfach und wirksam wie möglich für den Anwender.
