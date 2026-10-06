# Textvektoren erhalten und Mimaki-Außenkontur ergänzen

Branch `task/pdf-vector-contour-fix-20261006`, Basis `8745c9873942647796927d5680b9eb66ee14510e`.

Der Nutzer meldete Bitmap-Gruppen nach PDF-Import und die fehlende Außenkontur in der Mimaki-Weißdatei. Die fehlende Kontur ist im bisherigen Export bestätigt. Die bisherigen Texte waren in der PDF als Form-XObjects mit Pfaden gespeichert; eine konkrete Rasterung durch Corel wurde hier nicht ausgeführt oder reproduziert. Die zusätzlichen Text-Formhüllen sind jetzt entfernt. Je Texteingabe/zusammenhängender Farbe wird ein zusammengesetzter gefüllter Vektorpfad direkt in den vorhandenen Artwork-Strom geschrieben. Reihenfolge und echte Fotos bleiben erhalten.

Neue Mimaki-Weißdateien enthalten `RDG_WHITE` **und** die eigenständige `CutContour`, keine Farb-Bitmap. Farbdateien enthalten weiterhin kein RDG_WHITE. Beide Konturen/PageBoxes sind gleich, auch bei Spiegelung und 1-mm-Randzugabe. Die Druckebenen-Vorschau blendet die Schnittkontur weiterhin aus, damit sie nicht mit bedrucktem Weiß verwechselt wird.

## Bereitgestellte private Corel-Dateien

Aus der vom Nutzer zuvor für Roland bestätigten Quelle `2a5f60faded9bb1c6d0ac0c6fc896cb2778dfd8a34bcff4042bb151cb65f0552`, neue private Ablage `/workspace/gravuru-druckproben-vektoren-kontur-20261006/`. Keine PDFs/Fotos in Git. Die Cloud-Ablage ist keine dauerhafte gemeinsame Produktionsablage.

| Datei | SHA-256 |
|---|---|
| Roland-Textfelder-gruppiert.pdf | d723225dfbc79c0c682aa5017149c0138d25b987a933b53b5efa7e9899fab6aa |
| Mimaki-NUR-RDG_WHITE.pdf | c8547a326d05457f1ac6700ba1c7a4a66ead6a640dcb2cc9a64dd831b0fde3e2 |
| Mimaki-FARBE-ohne-RDG_WHITE.pdf | 7a331d08cef266e5b9320f4cedc3eacbb1cfcd3be48d2174a5ae8f835d0f7efc |

Alle weiterhin PDF 1.3, 150 × 200 mm. Vier Texteingaben als je ein zusammengesetzter Vektorpfad, ohne zusätzliche Text-Form-XObjects. Bestehende Bild-Streams bytegleich, Farbansichten bei 150/300 dpi pixelgleich. Weiß-Strom unverändert; ursprünglicher Kontur-Strom zusätzlich übernommen. Weißdatei hat **0 Bilder**, keine Form-XObjects. MuPDF ohne Reparatur und Ghostscript mit PDFSTOPONERROR erfolgreich. Vorhandene Dateien/Quelle werden nicht überschrieben.

Reproduzierbar mit `scripts/prepare-corel-separations.py QUELLE NEUER_PRIVATER_ORDNER` und `scripts/check-corel-separations.py QUELLE PRIVATER_ORDNER` (dokumentierte Python-Abhängigkeiten). Skripte nehmen nur die bekannte Gravuru-PDF-1.3-Struktur an, keine allgemeine Fremd-PDF-Konvertierung.

## Automatischer Dashboard-Export

Gleiche Regeln in `print-export-model.mjs` und `print-delivery.mjs`. Neue Rezepte `gravuru-form-print-proof/v5` und `gravuru-acrylic-print-proof/v3`; alte gespeicherte PDFs bleiben unverändert. Für die Korrektur einen neuen Ausgabeauftrag aus dem vorhandenen Prüfstand erzeugen. Reguläre Backend-PDF bleibt 1.7 mit erhaltener Transparenz; die spezielle PDF-1.3-Datei ist kein Beleg identischer Corel-Kompatibilität aller Backend-Ausgaben.

Gezielte Prüfung: 13 Tests bestanden (inklusive zwei neuen Strukturtests für Textpfade ohne Bilder und identische Außen-/Bohrkontur in beiden Mimaki-Dateien). Erster isolierter Strukturaufruf im eingeschränkten Subprozessmodus blieb hängen und wurde beendet; mit dem vorhandenen Ausführungsmodus für Prozess-/Loopbacktests erfolgreich. Keine fehlgeschlagene technische PDF-Prüfung verschwiegen.

[Browsernachweis](vektoren-kontur-browser-20261006.json): getrennte Downloads aus tatsächlichem Dashboard, identische ZIP-Inhalte und wiederholte Weißdatei, MuPDF/Ghostscript, direkte Schriftpfade, Farb-/Weißvorschau, 1440/390/768 Pixel, keine JavaScript-Fehler. [Handyansicht](vektoren-kontur-mobil-20261006.png).

**Cloud-Check:** 06.10.2026, 13:41:07–13:42:57 Europe/Berlin; **306 Tests bestanden, 0 Fehler/Skips**, Build 76 Ressourcen/1 Modell. [Bericht](vektoren-kontur-cloud-20261006.json).

**Grenzen:** Neuer Corel-/Mimaki-Import und reale Druckprobe NICHT AUSGEFÜHRT. Kein Live-Deploy, keine Shopify-Mutation, keine Änderung privater DBs. Angefangene Bestell-/Ausgaben-Verknüpfung separat im Cloud-Worktree erhalten und noch nicht als fertig gemeldet.
