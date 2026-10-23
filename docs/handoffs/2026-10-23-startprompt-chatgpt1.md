# Startprompt für ChatGPT-Account 1 („Astra 1“) · Paket F Konturen aus Corel · 23.10.2026

Einstellungen (Chris: Qualität vor Kosten): **Codex** (Agent mit Repo-Zugriff und Ausführung), Modell **GPT-5** bzw. das
stärkste verfügbare Codex-Modell, Reasoning **high**. Kein reiner Chat: das Paket liest Dateien und führt Python aus.
Vorab von Chris: Pfad der Corel-/SVG-Zeichnungen der Formen (Retro 1/2, Kreuze, Herzen …), ggf. die Preis-Excel.
Repos als Ordner bereitstellen: `gravuru-2027` (Code) und `gravuru-katalog.` (Katalog, mit Punkt).

---

Du arbeitest im Projekt gravuru 2027 der gravuru GmbH (Chris, Inhaber; Deutsch, Du, kurz). Zwei Repos liegen als Ordner
vor: Code `gravuru-2027` und Katalog `gravuru-katalog.`; Branch `main` ist jeweils die Wahrheit. Lies zuerst
`gravuru-2027/docs/handoffs/2026-10-23-delegation.md` (Abschnitt 0 Regeln, Abschnitt 2, dann Paket F), danach
`gravuru-katalog./CLAUDE.md` und `gravuru-katalog./zeichnungen/README.md`.

Dein Paket F: **Konturen aus Corel-/SVG-Zeichnungen lesen** – Vorarbeit für die neue Form „Kontur“ im Katalog (Retro 1/2
jetzt, Kreuze/Herzen und weitere Formen später).

Vorbild und Zielformat: `gravuru-katalog./zeichnungen/edelstahl-schilder-2027/geometrie.json` – je Form und Größe eine
Zeile mit `id`, `form`, `kind`, `labelCm`, `widthMm`, `heightMm`, `thicknessMm`, `baseCents` (nur aus Excel von Chris,
sonst `null`), `weightG` (falls bekannt), `holes` (x, y, diameter in mm, Ursprung oben links der Platte), `options`
(falls aus Excel), `outline` (geschlossener SVG-Pfad in mm, Ursprung 0/0, Breite/Höhe = Pfadausdehnung), `sourceNote`,
`drawingPathIndex`, `drawingExtentMm`, `drawingCalibration`; Kopf mit `sourceDrawing`, `drawingSha256`, `sourceExcel`,
`excelSha256`, `rowCount`, `forms`, `missing`. Leser-Vorbilder im Code-Repo: `scripts/read-corel-plates.py` (Plattenbericht
aus Corel-PDF/SVG: rot = Platte und Löcher, cyan = Rückplatte, Kreise Ø 8 = Abstandshalter) und `scripts/corel-linie.py`.
Nutze diese Leser und erweitere sie, statt einen neuen zu schreiben; Python 3.11+, Abhängigkeiten `fonttools pymupdf
cairosvg svgpathtools` bei Bedarf. Python, das fremde Dateien liest, mit `python3 -I` starten.

Vorgehen:
1. Zeichnung(en) von Chris lesen (SVG/PDF bevorzugt; CDR nur über den vorhandenen Leser). Jede Platte: Außenkontur,
   Löcher, Maße; Kalibrierung gegen die Maßangaben der Zeichnung – Abweichung ≤ 0,1 mm, sonst Zeile als „prüfen“
   markieren, nie „vereinheitlichen“. Löcher nur, wenn gezeichnet.
2. Ergebnis als `gravuru-katalog./zeichnungen/<linie>-<jahr>/geometrie.json` + `platten.md` (Tabelle: Form, Größe, Maße,
   Löcher, Status) + Kopie/Prüfsumme der Quelle (keine CDR > 50 MB ins Repo; dann nur SHA-256 und Pfad).
3. Dry-run-Bericht `BERICHT.md` im selben Ordner: Zähler (gelesen, ok, prüfen, fehlt), Abweichungen, offene Fragen.
4. Erst wenn Chris den Bericht gesehen hat: Branch `dev/konturen-<datum>-chatgpt1` im Katalog-Repo, Commit mit Begründung,
   Push. Dazu ein Absatz **oben** in `gravuru-2027/STATUS.md` (Datum, „ChatGPT 1“, Commit, Zähler, offene Punkte) und
   eine kurze Übergabe `gravuru-2027/docs/handoffs/<datum>-konturen-chatgpt1.md` (eigener Branch im Code-Repo).

Regeln: nichts erfinden (Preise/Gewichte ohne Quelle = `null`), nichts löschen, nichts in Shopify/Amazon/Plesk schreiben,
keine Geheimnisse in Repo oder Chat, bestehende Dateien im Katalog nicht umformatieren, Kennungen stabil (Schema wie bei
Edelstahl: `T<Form>-V2A-<BxH>`), Familien nicht anfassen (das macht Claude-Account 2 in Paket A auf Basis deiner Daten).
Frage Chris nur bei echten Entscheidungen (welche Zeichnung, unklare Maße), sonst arbeite durch und liefere den Bericht.
