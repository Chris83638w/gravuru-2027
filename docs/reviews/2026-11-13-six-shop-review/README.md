# Sechs neue Shopprodukte: Bilder und Texte zur Freigabe

**[Alle sechs Bilder, vollständigen Texte und Prüfergebnisse direkt ansehen](preview/FREIGABE.md).** Stand 13.11.2026; Vorschläge noch nicht durch den Nutzer freigegeben oder in Shopify übernommen. Alle sieben Produkte sind DRAFT. Die neue Produktanlage selbst war bereits mit d8bf96d abgeschlossen.

Die sechs IDs A52/A62/A82 und S52/S62/S82 unterscheiden Acryl 3mm beziehungsweise Edelstahl 1,5mm in 5/6/8×2cm. Hauptbilder sind KI-Vorschläge anhand bestehender Designs. Originale native Material-/Designansichten stehen daneben; die Bilder sind keine gefertigten Produktfotos oder pixelidentischen Materialkopien. Konfigurator-Startdesigns und Hauptacryl H1 bleiben unverändert. Designregeln: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Inhalt und Prüfung

- preview/: vollständige Freigabeansicht als GitHub-Markdown und lokale HTML-Seite, sechs Bilder, native Referenzen, vollständige Verkaufstexte/SEO/Alttexte, Preise, Daten und zeitgebundene Screenshots. README und checks.json erläutern Sicht-/Link-/Kopierprüfungen.
- provenance/texts/: unveränderte Textquellen samt Quellen, 11 fachlichen Prüfungen und ursprünglichem Manifest. Die 45 bestätigten Preise bleiben erhalten.
- provenance/images/: unveränderte Generations-/Herkunfts-/Sichtbelege. Absolute Pfade darin sind historische Quellenangaben; mitgelieferte Bilder liegen unter preview/images.
- agent-start.md: bytegleiche vollständige START.md des separaten [Agentenauftrags #238](https://github.com/Chris83638w/gravuru-2027/issues/238); eigener GitHub-Ordner docs/agent-start/Neue-Produkte-und-Designs. Dieser Auftrag übernimmt keine laufenden Türschildarbeiten.
- manifest.json: SHA256 und Bytezahlen aller übrigen Paketdateien; kein Geheimnis, Kundendatensatz, Sessiondump oder Produktwriter enthalten.

## Belegter Stand und Grenzen

[Warenkorbbericht](preview/cart-report-20261113.md): 438/438 JS-Quellfälle bestanden. Claude bestätigt einen echten Motivwarenkorbpfad an einem bestehenden ACTIVE-Edelstahlprodukt, 1999+169=2168Cent, Testzeile danach entfernt. Die sieben DRAFT-Übergaben bleiben HTTP422; ihre realen Zeilenpreise, Foto/Logo, Staffeln und CartEdit sind nicht vollständig belegt. Original-WASM20977Byte fehlt; kein vollständiger WASM-/Instruktionsnachweis. Neu gemeldete Motiv/Text-Überlappung bleibt offen.

[Codeübergabe aea809f](https://github.com/Chris83638w/gravuru-2027/blob/aea809f/docs/handoffs/2026-11-13-cart-mobile-fixes.md): Mengenrückkehr und Handyvorschau lokal korrigiert, 13/13+5/5 gezielte Tests, unabhängige Reviews und echte lokale Chrome-Sichtprüfung. Einbau/Hostnachweis stehen separat aus. Der von Claude installierte Galeriefix ff1f1ca ist erhalten; unsere vier Laufzeitdateien überschneiden sich nicht mit seinem angekündigten Startpaket.

[Frische Shopify-Lesung](preview/data/product-status-final.json): 13.11.08:23UTC, alle sieben DRAFT, 808+45 Varianten, sechs neue Produkte weiterhin ohne Bilder/Beschreibung. Nur Status und Zähler gelesen, kein erneuter Vollvariantenvergleich.

## Nächster Schritt

Nutzer prüft die sechs Bilder und Texte anhand ihrer IDs. Erst innerhalb einer konkreten Übernahmefreigabe dürfen sie per Skript/API in die sechs DRAFTs geschrieben und vollständig zurückgelesen werden. Veröffentlichung ist damit nicht freigegeben. Claude übernimmt die getrennten geprüften Codefixes nur innerhalb der passenden Appfreigabe, dokumentiert Kandidatenprüfung/Einbau und ergänzt den Hostnachweis. Keine Bestellung/Zahlung, kein ACTIVE-Testumweg und kein Mainmerge durch dieses Paket.
