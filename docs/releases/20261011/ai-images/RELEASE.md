# KI-Motive und Musterfotos · 11.10.2026

Neues Arbeitspaket nach der aktivierten Text-/Layoutgestaltung. Zwei Funktionen im vorhandenen KI-Fenster: **Neues Motiv erzeugen** und **Musterfoto bearbeiten**. Das Motiv wird ein einzelnes Bildelement; Fotobearbeitung ersetzt nur das Musterfoto des ausgewählten Felds. Originalmaske, Texte, Geometrie, Preise und vorhandene Kundenrechte bleiben erhalten. PNG-Originale und alte Versionen bleiben privat gespeichert. Vorschau, ausdrückliche Übernahme als neue Revision, Konfliktprüfung und Schutz vor doppelten Aufträgen verwenden die bestehende Logik.

## Geprüft

688 Regressionstests bestanden. 25 gezielte Tests für KI, Bildverarbeitung und geschützte Konfiguration sind darin enthalten. Browser mit tatsächlicher lokaler Händlerlaufzeit und synthetischer Shopify-Identität: 85 API-Aufrufe, Vorschau/Übernahme/Neuladen für Layout, Motiv und Musterfoto; Desktop und Mobil; Abbruch mit Kostenerhalt. Keine Konsolenfehler, private Bilder vollständig in Vorschau eingebettet. Screenshots enthalten ausschließlich synthetische Daten.

Erster Konfigurationstest lief in `/tmp`, das in dieser Cloud einen Git-Marker enthält und daher richtigerweise vom Schutz privater Dateien abgewiesen wird. Mit getrenntem Testpfad unter `/var/tmp` bestanden; Produktschutz unverändert.

## Kosten und Modell

Gemeinsame 100-EUR-Monatsgrenze und dasselbe private Kostenjournal; keine zweite Freigabe. `gpt-image-1.5`, ein PNG in mittlerer Qualität, feste Größen. Modellkennung durch authentifizierte Modellliste bestätigt. Dokumentierter Snapshot `gpt-image-1.5-2025-12-16` beim echten Schlüssel mit 404 abgewiesen; keine identische Wiederholung. Stattdessen Verfügbarkeit über die Modellliste geklärt. Preisquellen und Einrichtung in [AI-DESIGN.md](../../../../ops/plesk/AI-DESIGN.md).

## Noch ausstehend in diesem Zwischenstand

Paketinstallation, echter Generierungs-/Fotobearbeitungsauftrag, Serveraktivierung und abschließende Bestandssicherung. Die vorhandene Live-Laufzeit bleibt bis zur bestandenen Prüfung auf `060a10b`. Echte Shopify-Nutzeranmeldung, öffentliche Kunden-/Checkout-Strecke, Drive, allgemeine Shopify-Übertragung, Stapel-KI und Maschinen-/Material-/ICC-Abnahme sind nicht durch synthetische Tests erledigt.

## Sichtprüfung und Korrektur vor Veröffentlichung

Beide echten API-Aufträge bestanden technisch (9 Cent Motiv, 23 Cent Foto; mit früherem Texttest insgesamt 33 Cent). Keine Live-Produktübernahme. Sichtprüfung fand ein zu schwaches weißes Gravurmotiv: die bestehende Graustufenabbildung macht weiße Pixel transparent. Neue KI-Gravurmotive werden deshalb ausdrücklich aus der Transparenz als technische schwarze Gravurmaske abgeleitet. Das Original-PNG bleibt bytegleich erhalten; Druckmotive und Fotobearbeitung behalten RGB. 34 gezielte Folgeprüfungen einschließlich echter Bilddecodierung, Originalerhalt und Gravur-Ausgabe bestanden. Erneute Vorschau mit demselben echten KI-Ergebnis, kein weiterer kostenpflichtiger Aufruf. Fotobearbeitung verändert sichtbare Bilddetails/Ausschnitt; deshalb ausdrücklich vor Übernahme prüfen, keine Identitäts- oder Rekonstruktionsgarantie.
