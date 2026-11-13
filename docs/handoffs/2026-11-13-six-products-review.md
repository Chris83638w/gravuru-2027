# Sechs Shopprodukte: vollständige Bild-/Textfreigabe und Warenkorb-Teilstand

**[Alle sechs Bilder und Volltexte zur Freigabe ansehen](../reviews/2026-11-13-six-shop-review/preview/FREIGABE.md).** Das Paket enthält A52/A62/A82 und S52/S62/S82, eindeutige IDs, Preise, SEO, Handles, Alttexte, native Referenzen und die tatsächlichen Prüfgrenzen. Es ist eine Freigabevorlage; Bilder und Texte sind noch nicht in Shopify übernommen. Alle sieben Produktstände bleiben DRAFT.

## Quellen und Umfang

- Produktanlage und vollständige Variantenabnahme waren mit `d8bf96d` abgeschlossen. Diese Übergabe eröffnet keine neue Anlage und ändert weder die 808 Hauptvarianten noch die 45 neuen Varianten.
- Sechs KI-generierte Hauptbildvorschläge anhand bestehender Designs, jeweils 1254×1254 PNG, archiviert und sichtbar geprüft. Die nativen Originalvorschauen stehen daneben. Keine pixelidentische Materialkopie und kein Fertigungsfoto behauptet; Konfigurator-Startdesigns und Hauptbild H1 unverändert. Für die Gestaltung gilt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).
- Unveränderte Textquellen mit 11 fachlichen Prüfungen; 45 bestätigte Preise, inkl.19%MwSt., Mengenstaffeln und Motivregel korrekt übernommen. Keine neuen Produkteigenschaften erfunden.
- Lokal 13 Textkopien und 30 verlinkte Dateien geprüft, sechs Bildpins erhalten. Desktop-/390×844-Ansicht der Freigabeseite sichtbar geprüft. Das Paketmanifest erfasst alle übrigen Paketdateien; keine Zugangsdaten, Kunden-/Bestelldaten oder Shopwriter.
- Frische reine Status-/Zählerlesung vom 13.11.08:23UTC: sieben DRAFTs, 808+45 Varianten; bei den sechs neuen Produkten Bilder/Beschreibung noch leer. Kein erneuter Vollvariantenvergleich in dieser Lesung.

## Warenkorb: Teilerfolg und offene Nachweise

Der [Operatorbericht 6dd50ed0](https://github.com/Chris83638w/gravuru-2027/blob/6dd50ed0/ops/plesk/warenkorb-20261112/README.md) belegt sieben DRAFT-bedingte HTTP422-Ablehnungen und 438/438 JS-Quellfälle. Die neuen Produkte haben damit keinen vollständig geprüften realen Warenkorbweg.

Der neue [Claude-Bericht #1686847480102](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6847480102) bestätigt dagegen einen tatsächlichen Motivpfad am bestehenden ACTIVE-Edelstahlprodukt 16190784438652/Variante58104606556540: 1999+169=2168Cent im echten Warenkorb. Testzeile anschließend entfernt, vorheriger Warenkorb wiederhergestellt, keine Bestellung/Zahlung. Nicht auf Foto/Logo, Staffeln, neue Produktfelder oder vollständigen CartEdit übertragen. Gemeldete anfängliche Hausmotiv-/Rosenberg-Überlappung bleibt separat offen.

Das aktive Original-WASM (20977Byte/SHA256 a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2) fehlt weiterhin. Vollständiger WASM-/Instruktionsnachweis bleibt offen; ein Ersatzbuild ist kein identischer Originalbeleg.

## Geprüfte lokale Korrekturen

Die getrennte [Codeübergabe aea809f](2026-11-13-cart-mobile-fixes.md) enthält Mengenrückkehr/CartEdit-Vorrang und die mobile Reset-/Vorschaukorrektur: 13/13+5/5 gezielte Tests, unabhängige Reviews, lokale Chrome-Abnahme. Nicht als installiert melden. Claude erhält sie zum Abgleich seiner aktuellen Laufzeit und zum gemeinsamen Kandidaten mit seinem getrennten Startpaket. Unsere Dateien überschneiden sich nicht mit seinen angekündigten shop-entry-Dateien; sein installierter Galeriefix ff1f1ca bleibt erhalten. Kein neues Nutzer-Ja durch eine technische Übergabe.

## Konkreter nächster Schritt und Freigabe

1. Nutzer sieht sechs Bilder und Volltexte und nennt Zustimmung oder Änderungen anhand A52/A62/A82/S52/S62/S82.
2. Nur mit passender Übernahmefreigabe Bilder/Texte/SEO/Handles per Skript/API in die zugeordneten sechs DRAFTs übernehmen; zuvor frischer Soll-Ist-/Handleabgleich, anschließend vollständiger Readback.
3. Claude prüft und installiert den gemeinsamen Appkandidaten nur innerhalb der ausdrücklich passenden Appfreigabe, inklusive Sicherung/Rückweg und anschließendem Hostnachweis. Bericht in #168/#233.
4. Spätere Veröffentlichung und dadurch mögliche echte Tests der neuen Kaufwege bleiben gesondert freizugeben. Kein ACTIVE-Testumweg, keine Bestellung und kein Mainmerge durch diese Übergabe.

Zusatzauftrag des Nutzers erledigt: **[Issue #238](https://github.com/Chris83638w/gravuru-2027/issues/238)** enthält den vollständigen Auftrag für einen eigenständigen Produkt-/Designagenten. [Eigener Arbeitsbereich](../agent-start/Neue-Produkte-und-Designs/README.md) mit START.md, AUFTRAG-VORLAGE.md und README ist unter `1104811` auf demselben Aufgabenbranch gesichert und lokal separat angelegt. Keine Doppelbeauftragung der laufenden Türschildarbeiten.
