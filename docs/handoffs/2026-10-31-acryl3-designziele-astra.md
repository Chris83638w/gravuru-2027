# Nachricht 35: gemeinsame Acryl-3-mm-Designziele

31.10.2026 · Astra. Auftrag und verbindliche Kennungen: [Issue #48](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6547828561). Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich; keine Gestaltung wird verändert.

Katalog: [PR #11](https://github.com/Chris83638w/gravuru-katalog./pull/11), zwei native Familien mit je 80 Größen, 737 gemeinsame Master, 1.474 neue Ziele mit freigabe null. Preise aus der Acryl-Serie (79/80); Oval schmal 30×10 bleibt offen. Kein Import und keine Freigabe.

## Warum der Code mitgeliefert wird

Der bisherige Größenanschluss kennt historische Retro-Größen nur bei Stahl. Außerdem würde ein Ziel mit neuen Größenschlüsseln die explizite Quellliste zugunsten aller passenden Seitenverhältnisse verlassen. Beides widerspricht der beauftragten identischen Designverfügbarkeit.

`design-targets.mjs` erkennt eine abgeleitete Familie an ihrer vorhandenen `source.path`-Referenz auf eine tatsächlich geladene Katalogfamilie. Nur deren erlaubte Größen mit exakt gleicher Geometrie werden zugeordnet. Maße, Form, Rundung, Kontur und feste Löcher werden verglichen; Originaltexte, Motive, Quellgrößen und Freigaben bleiben unverändert. Kein neuer Schlüssel im Familienschema, keine Sonderkennung fest einprogrammiert. Normale Materialübertragungen ohne solche Herkunft bleiben wie bisher. Der Größenplan wird einmal je Master gebildet und für dessen Größen wiederverwendet.

## Fachliche Quellen und Prüfung

- Material/Farbe: Chris über Claudes Antwort 31.10., Acryl 3 mm Schwarz/Anthrazit; Geometrie identisch zu steel-door-signs.
- Preise ausschließlich aus Acryl-Serie; 2 Schrauben 299 ct, 4 Schrauben 339 ct. Keine Übernahme der Edelstahlpreise.
- Ziel-Freigabe explizit null; Edelstahl-Freigaben nicht übertragen. 5-mm-Familien nicht geändert.
- 105/106 gezielte Windows-Tests bestanden, 0 Fehler, 1 optionaler echter-Export-Test übersprungen. Anfangs scheiterten zwei Tests an Windows-Zugriffsrechten auf temporäre Journaldateien; mit regulären lokalen Dateirechten bestanden sie unverändert. Kein Linux-Vollauf dieses Pakets.
- Neue sieben Regressionen prüfen Retro-Übernahme, abweichende Kontur/Löcher/Maße/Form, fehlende Quelle sowie explizite Größenlisten gewöhnlicher Platten.
- `node ops/check-acryl3-shared-targets.mjs <Katalogpfad>`: 13 gültige Familien, 12 Linien, 737/737 Master in beiden Farben größenidentisch, 129 Retro-Master, 0 kopierte Designs/Freigaben. Nur-Lese-Prüfung gegen den vorherigen Katalog-Commit 60657f6.
- Katalogvollbau (13 Familien), 14 echte Zielbilder und zwei klar markierte leere Rund-Platten im Katalog-PR.

Noch fachlich offen: Acrylpreis Oval 30×10, Rund-Designlücke beider Linien und D36 ohne aktuellen Originalmaster. Ziel-Freigaben und Linux-Prüfung durch Claude stehen aus. Kein Merge, kein Import, nichts live. Nachricht 36 beginnt getrennt nach diesem Paket; Master-Oberfläche bleibt unverändert.
