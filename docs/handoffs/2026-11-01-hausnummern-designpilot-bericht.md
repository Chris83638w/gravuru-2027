# Hausnummern: erstes Musterpaket · 01.11.2026

Issue #45 Nachricht 14. Reproduzierbarer Lieferform-2-Pilot: drei Gestaltungen in 150 × 100 und 180 × 120 mm, je drei Ziele AA/AS/S/S. **6 Designs / 18 offene Ziele; 18/18 Passungen und 108 Halter-/Farbkombinationen berechnet.** Keine Designfreigabe gesetzt.

[Ausführlicher Bericht, Kontaktbögen und Konfi-Übergabe im Katalog](https://github.com/Chris83638w/gravuru-katalog./blob/dev/hausnummern-designs-pilot-20261029-astra3/docs/handoffs/2026-11-01-hausnummern-designpilot-bericht.md)

Katalogbasis 811f26395fb6f90aab465814430be4a61fa6257a, Pilotcommit c0386f6c7bed2d9e868db27144bddc68cc4f8227; Codebasis 0f03c8e9caa2984c9f6a6d48296254d75c095982. Der ältere Code-Auftragsbranch dev/hausnummern-abstandshalter-20261029-astra3 hat fünf eigene, nicht in main enthaltene Commits und bleibt unberührt. Dieser Begleitbranch dev/hausnummern-designs-pilot-20261101-astra3 basiert auf aktuellem main.

## Reproduktion

```text
node scripts/build-house-number-pilot-20261101.mjs --katalog <isolierte-katalogkopie>
```

Benötigt die unveränderten vorhandenen Laufzeit-Ressourcen in app/designs/aosu-labrador/runtime. Keine externe Node-Abhängigkeit. Verwendet familyProductConfig, katalogDesignToTemplate, templateFit, selectedProfile, variantCombinations, quote und productPreview. Schreibt sechs Designordner, Indizes sowie Prüf-/Vorschau-Dateien in eine isolierte Katalogkopie. Vorhandene abweichende Design-/Indexdateien werden abgewiesen. Nicht gegen einen fremden bearbeiteten Katalogbaum ausführen. SVG-Vorschauen sind der originale Produkt-Renderer, keine Editor-Screenshots. PNG-Kontaktbögen sind Rasterableitungen mit Quellenvergleich; Rasterisierung ist nicht Teil dieses Node-Skripts.

Geprüft: Syntax, Ausführung mit Originalressourcen, Wiederholung mit identischen Designs, 18/18 passende Zielgeometrien, 108 gültige Kombinationen. Fünf registrierte Schriften mit Datei vorhanden. Keine Änderung an Produktions-/Konfigurator-Modulen. Keine neue Volltestsuite für diese Datenlieferung behauptet.

## Konfi-Nacharbeit

- **Schwarz/Weiß matt:** Chris bestätigt im Chat am 01.11.2026 matte Halter; Edelstahl metallisch. spacer-cap.mjs zeichnet derzeit für alle Farben dieselben radialen Reflexionssektoren und Ringe. Anpassung durch Konfi-Verantwortlichen nach Abstimmung, nicht Teil dieser Codeänderung.
- **S/S-Rückplatte in Zielvorschau:** targetDesignPreview in app/workshop/design-target-preview.mjs entfernt mit delete view.backing die Rückplatte und mit view.options=[] die Farboptionen. Für die Abnahme vollständige Familie/Standardbefestigung erhalten. productPreview zeigt die Rückplatte bereits korrekt.
- Materialwirkung AA/AS glänzend, S/S satiniert anhand Referenzen prüfen. Generiertes Chat-Muster ist eine Gestaltungsreferenz, kein Maß-/Produktionsnachweis; Abstandsringe/Tiefenwirkung offen.
- **Echter Editor 1440 × 900 / 390 × 664 fehlt:** lokaler Chromium-Start hier mit spawn EPERM blockiert. Keine Sicherheitsgrenze umgangen; keine Editor-Screenshots behauptet.
- Vollständiger Katalogbau mit CairoSVG/fontTools beim Operator offen. Familien und erzeugte Katalogansichten unverändert.

Kein Merge, kein Shopify-Schreiben, kein Import, keine Bereitstellung. Nach vollständiger Editor-Sichtprüfung entscheidet Chris über die Designs; erst dann weitere Formen/Größen und Gesamt-Import-Probelauf.


## Signaturgrenze dieser Abgabe

Die GitHub-Verbindung dieser Sitzung erzeugt API-Commits ohne Signatur (GitHub verification.verified=false, reason=unsigned), auch beim Schreiben über die Contents-API. Deshalb nur Entwurfs-PR; die ausdrücklich verlangte signierte Abgabe ist **offen**. Der Operator muss den geprüften Stand mit der eingerichteten Signatur übernehmen. Kein Merge durch Astra, keine behauptete Verified-Signatur.

Katalog-Entwurfs-PR: https://github.com/Chris83638w/gravuru-katalog./pull/16
