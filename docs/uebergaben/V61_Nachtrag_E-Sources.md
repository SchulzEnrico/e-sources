# Nachtrag zur Übergabe V61 → V62 E-Sources

Stand: 23.11.2026, 21:50 · geschrieben in V61, nachdem V62 schon lief. Ergänzt `V61_Uebergabe_E-Sources.md`.

## Was sich nach der Übergabe geändert hat

- **Neue Ablage (Enrico):**
  - `docs/Dashboards/` – Dashboards als PDF (`E-Sources_Dashboard_V36.pdf`, `E-Sources_Dashboard_V51.pdf`). Der alte Pfad `docs/E-Sources_Dashboard_V51.pdf` gilt nicht mehr.
  - `docs/Arbeitspakete/` – Entscheidungs-Docs von Arbeitspaketen als PDF. Darin jetzt: `E-Sources – Notizen und Ansichten To-do, Kanban, Eisenhower (F-17, F-104).pdf` (Stand der Entscheidungen zu F-206).
  - Übergabe V61 und Lastenheft (F-206) verweisen schon auf diese Pfade.
- **Arbeitsregel neu:** Nach jedem Entscheidungs-Doc (Claude Doc an der Seite) das PDF in `docs/Arbeitspakete/` ablegen. Claude kann große PDFs nicht selbst speichern, darum Enrico bitten: Name des Docs › Export › PDF, dann in den Ordner schieben.

## Hinweis zum Commit

- Der V61-Commit umfasst **nur `docs/`** (Lastenheft, Übergabe V61, dieser Nachtrag, `docs/Arbeitspakete/`, `docs/Dashboards/`, `V61_Entwurf_pad_VarianteA.ts.txt`).
- Die Änderungen unter `web/src/workspace/` (`notes.ts` neu, `types.ts`, `storage.ts`, `slotFile.ts`) stammen aus **V62** und gehören in den V62-Commit. V61 hat daran nichts geändert.

## Commit-Text V61 (endgültig)

**Summary:** `V61: Lastenheft F-206 Notizen und Ansichten, Übergabe V61`

**Description:**
```
Entscheidungen zu Notizen, To-do, Kanban und Eisenhower (Claude Doc):
- Notiz als eigenes Objekt, Notizblock/To-do/Kanban/Eisenhower als
  Ansichten; Unter-Notizen, Vorgänger (Netzplan), Spur, Zustände
  inkl. „in Prüfung“, Verschieben über Portale und Desks
- Lastenheft: neuer Eintrag F-206 mit Bau-Reihenfolge, Reihenfolge
  Punkt 21; F-17 und F-104 verweisen darauf
- Verworfener Code-Entwurf (Variante A) nur als Ansicht unter
  docs/uebergaben/V61_Entwurf_pad_VarianteA.ts.txt
- Ablage: docs/Arbeitspakete (PDF zu F-206), docs/Dashboards
- Übergabe V61 → V62 mit Nachtrag (kein Code geändert)
```
