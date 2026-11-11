# Produktpläne #230 – lokale Prüffassung

Stand 11.11.2026. Aus sieben unveränderten Excel-Akten wurden **sieben echte native Pläne** mit gespeicherten Quellen, Vorlagen, Plan-IDs und PlanHashes erzeugt. **823 Varianten und Preise stimmen vollständig mit den Excel-Akten überein.**

Die Kennungen gelten für den mitgelieferten isolierten Prüfbestand. Alle Pläne sind wegen der unten genannten offenen Punkte **nicht freigabefähig (valid:false)**. Keine Bestätigung, Ausführung, Shopify-Änderung oder Veröffentlichung.

| Produktakte | Varianten | Native Designs | Startvorschlag (noch offen) |
|---|---:|---:|---|
| Acrylglas-3mm (v4) | 778 | 1205 | TAE-V2A-8x5-D1 |
| Acrylglas-3mm-5x2 (v2) | 10 | 27 | TRE-V2A-5x2-D1 |
| Acrylglas-3mm-6x2 (v2) | 10 | 27 | TRE-V2A-6x2-D1 |
| Acrylglas-3mm-8x2 (v2) | 10 | 27 | TRE-V2A-8x2-D1 |
| Edelstahl-5x2 (v1) | 5 | 27 | TRE-V2A-5x2-D1 |
| Edelstahl-6x2 (v1) | 5 | 27 | TRE-V2A-6x2-D1 |
| Edelstahl-8x2 (v1) | 5 | 27 | TRE-V2A-8x2-D1 |

## Erledigt

- Vorhandenen nativen Weg verwendet: Katalog → planFamilyFormats → validierter persistierter Produktdatensatz → nativeModuleSources → ProductGroupTemplate.plan. Keine Testquelle, keine erfundene produktive Registry.
- 77 Hauptgrößen und sechs eigene Kleinformate. Acryl Schwarz/Anthrazit; bestätigte Schraubenaufschläge 269/329 Cent in den dynamischen Formatdaten. 164 historische Preisabweichungen beseitigt, ohne die Quell-Excel oder den Katalog zu ändern.
- Hauptacryl: Foto an, 999 Cent je Foto. Kleinformat-Vorschlag: Foto/Logo aus, mit echtem versioniertem Modulprofil; Entscheidung bleibt offen. Die Materialfarben sind eine Produktauswahl, kein UV-Farbeditor.
- Exakt 13 bestätigte Kleinformat-Motive im nativen Motivprofil; ausgeschlossene Datei schmetterlinge-1.svg, die einzelne schmetterling-1.svg bleibt. Eingebettete Motive der Originaldesigns unverändert.
- Auftragsliste: 1.298 Zeilen, **1.297 eindeutige Design-IDs**. TRE-V2A-7x2-D34 kommt als Rang 0 und Rang 1 vor; einmal übernommen, Rang 0 hat Vorrang. Die Liste selbst bleibt unverändert.

## Noch zu klären oder zu beheben

1. Startvorschläge und offene Module anhand dieses konkreten Pakets entscheiden. Alle starten ohne Befestigung; vorgeschlagene Acrylfarbe Schwarz. Hauptacryl-Logo ist technisch in dieser Quelle noch aus; die gleichzeitige Foto-/SVG-Logo-Anbindung braucht Prüfung.
2. **Neun Hauptdesigns haben native Kontur-/Randfehler.** Einzelne IDs und Fehlermeldungen in design-exclusions.json. Zwei weitere Designs sind bereits absichtlich hidden; deren Ausblendung bleibt erhalten, keine Wiederfreigabe nötig. Das Hauptprodukt enthält 1.205 native Designs statt 1.216 eindeutiger Listen-IDs. Bei den sechs Kleinformaten sind jeweils 27/27 vorhanden.
3. Die automatische Platzierung neuer Kleinformat-Motive rechts/links neben dem Text und die beiden Strich-Ausnahmen sind noch nicht im vorhandenen Kundenadapter belegt. Die Auswahl von 13 Motiven ist angeschlossen.
4. Verbliebene offene Excel-Angaben (insbesondere Mengenstaffel/Steuerkontext und Design-/Startreferenzen) in der nächsten Aktenversion zusammenführen. Bereits bestätigte Preise nicht erneut erfragen.
5. Motivprofil und native DB gehören gemeinsam zum Planpaket. Der bestehende Planservice pinnt Modulprofile, prüft jedoch noch nicht automatisch die Revision der separaten Motivbibliothek. Vor späterer Ausführung ist der dokumentierte Revisions-/Hashvergleich erforderlich.

Neue Quellen-/Vorlagenentscheidungen erzeugen neue Pläne und Hashes. Erst danach kann die separate Station-3-Freigabe auf die endgültigen Paare erfolgen. Die bloß fehlende Station-3-Bestätigung steht nicht als zirkuläre offene Planfrage in den Vorlagen.

## Quellen und Prüfung

- Katalog: 8236b8bfab7322447ec46661c116fa526331af3d; unveränderter Arbeitsbaum geprüft.
- Excel: bf8824c80347f63ffeb2c05cc9a34a9ffed6f9bd; alle sieben SHA-256 geprüft, Originaldateien unter excel/.
- Codebasis: 411188db5777d7fb0ec06c6fab2f6faf85270fc9. Keine Änderung unter app/.
- 7 persistierte native Quellen, 7 gespeicherte Pläne, 0 Bestätigungen, 0 Ausführungen. 823 Preis-/Variantenvergleiche; 14 Negativprüfungen mit absichtlich falschen Preisen bzw. fehlenden Varianten erkennen die Abweichung. 4/4 vorhandene Vertragsprüfungen grün.
- Unabhängiger Agentenreview liegt unter review/; Dateiprüfsummen im manifest.json. Native Quellen, SQLite-Dateien, Original-Excel und Planantworten sind zusammen im Paket.

## Planpaare dieser Prüffassung

| Produktakte | Native Plan-ID | Nativer PlanHash |
|---|---|---|
| Acrylglas-3mm (v4) | pgp_6720276e-c53e-4f9a-b0eb-2ea6d468e703 | 0000d819c61180ce0ae1d30b71499e2109d8ece68e31323b39e9edbc0c550497 |
| Acrylglas-3mm-5x2 (v2) | pgp_0868a8f2-d0de-48ad-9290-2dea51371ba3 | c333b9826f19d00eadba899bcffa92c9c1f66ff3f465c15292a9d98c5f93345f |
| Acrylglas-3mm-6x2 (v2) | pgp_853b95af-a140-45e2-9375-f8a8dd8a013a | 6b6d34709e85c1c7e046fe510bb7079a1be35e0286ee9f3e99ed6f93c59907c0 |
| Acrylglas-3mm-8x2 (v2) | pgp_1d20d28a-7f30-41ef-a33b-e0b278a1a966 | a1bae5f5637ef5037a452d528dbe7928e5097c8a8303b1e62e5e5c77891d06bc |
| Edelstahl-5x2 (v1) | pgp_d8449da5-0339-48b8-8356-6c3ce76c66a8 | ac75e9b321c426948adc40c316e182cc0be9c8428c6d9044695fa688aa5b1260 |
| Edelstahl-6x2 (v1) | pgp_f6e8ac45-ab2d-4d13-83df-e735f58cfde5 | f35b350f337181a7d1e93fdc77f3c857618b689f44fc4ead51982ffac465cb45 |
| Edelstahl-8x2 (v1) | pgp_0a234181-0829-4f7c-bfb7-7704932d6507 | 4bf7241215b49678519a6d1a3fc847afe6896fc520d01cc54bacc203464d216e |

Designs werden unverändert nach dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) behandelt. Die neun Geometriebefunde sind Prüfaufträge, keine in diesem Paket vorgenommenen Designänderungen.
