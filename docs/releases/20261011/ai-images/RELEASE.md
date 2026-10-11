# KI-Motive und Musterfotos · 11.10.2026

Installierter Quellstand **5698c5f**, Version `0.1.0-recovery.20261010+5698c5fbf10c`, Händlerhost **https://app-2027.gravuru-designwerkstatt.de**. Neues Arbeitspaket nach der aktivierten Text-/Layoutgestaltung. Zwei Funktionen im vorhandenen KI-Fenster: **Neues Motiv erzeugen** und **Musterfoto bearbeiten**. Das Motiv wird ein einzelnes Bildelement; Fotobearbeitung ersetzt nur das Musterfoto des ausgewählten Felds. Originalmaske, Texte, Geometrie, Preise und vorhandene Kundenrechte bleiben erhalten. PNG-Originale und alte Versionen bleiben privat gespeichert. Vorschau, ausdrückliche Übernahme als neue Revision, Konfliktprüfung und Schutz vor doppelten Aufträgen verwenden die bestehende Logik.

## Geprüft

688 Regressionstests bestanden. 25 gezielte Tests für KI, Bildverarbeitung und geschützte Konfiguration sind darin enthalten. Browser mit tatsächlicher lokaler Händlerlaufzeit und synthetischer Shopify-Identität: 86 API-Aufrufe, Vorschau/Übernahme/Neuladen für Layout, Motiv und Musterfoto; Desktop und Mobil; Abbruch mit Kostenerhalt. Keine Konsolenfehler, private Bilder vollständig in Vorschau eingebettet. Screenshots enthalten ausschließlich synthetische Daten.

Erster Konfigurationstest lief in `/tmp`, das in dieser Cloud einen Git-Marker enthält und daher richtigerweise vom Schutz privater Dateien abgewiesen wird. Mit getrenntem Testpfad unter `/var/tmp` bestanden; Produktschutz unverändert.

## Kosten und Modell

Gemeinsame 100-EUR-Monatsgrenze und dasselbe private Kostenjournal; keine zweite Freigabe. `gpt-image-1.5`, ein PNG in mittlerer Qualität, feste Größen. Modellkennung durch authentifizierte Modellliste bestätigt. Dokumentierter Snapshot `gpt-image-1.5-2025-12-16` beim echten Schlüssel mit 404 abgewiesen; keine identische Wiederholung. Stattdessen Verfügbarkeit über die Modellliste geklärt. Preisquellen und Einrichtung in [AI-DESIGN.md](../../../../ops/plesk/AI-DESIGN.md).

## Installation und echte API

Korrigiertes v2-Paket mit SHA-256 und 409 Manifestdateien isoliert installiert/gestartet und auf dem Server erneut geprüft. Händler-Einstieg auf die neue Version umgestellt; ursprünglicher `start-r5.cjs`-Weiterleiter, Shopify-Konfiguration, andere Sites und Kundenwerkstatt erhalten. Vor Wechsel drei Datenbanken, bisheriger Laufzeitstand und Konfiguration privat gesichert. Bilder aktiviert, bestehende Kostenfreigabe **bis 10.11.2026, 12:38 UTC** und Monatslimit 100 EUR unverändert.

Genau zwei echte Images-Aufträge, jeweils HTTP 200: ein Motiv und eine Fotobearbeitung. Kosten atomar vor den Aufrufen im echten Werkstattjournal reserviert und nach bestätigtem Verbrauch mit **9 + 23 Cent** verrechnet. Zusammen mit früherem Texttest **33 Cent**, damit **99,67 EUR** verfügbar. Konservative Werkstattbewertung, keine Aussage zur tatsächlichen OpenAI-Rechnung.

Vorschläge in privater Datenkopie geprüft; Fotobearbeitung dort als neue Revision übernommen und Wiederholung geprüft. Gleiche Auftragskennungen erzeugen keine weiteren Provideraufrufe. Die zwei operativen Testaufträge stehen im Live-Kostenjournal ausdrücklich als verworfene interne Prüfungen, ohne übernehmbaren Produktkandidaten. **Echte Gedenktafel weiterhin unverändert Revision 5.** Originalbilder und tatsächliche Vorschauen bleiben außerhalb GitHub.

HTTPS nach Neustart: Werkstatt mit Shopify-Kontext erreichbar, ausgeliefertes KI-Modul bytegleich zum neuen Code, anonyme KI-/Produkt-API jeweils 401. Reale API-Aufrufe waren serverseitige Prüfungen; eine echte angemeldete Shopify-Browserbedienung wird dadurch nicht behauptet.

## Weiter offen

Stapel-KI, echte Shopify-Nutzeranmeldung als vollständiger Klickablauf, öffentliche neue Kunden-/Checkout-Strecke, eigene Drive-Anbindung, allgemeine Shopify-Produktübertragung und Maschinen-/Material-/ICC-Abnahme. Historische unerreichbare Cloud-/Windows-Dateien und Commit `c64c197` bleiben gemäß Herkunftsbericht ungesichert. Kein neuer Testkauf und keine Produktionsauslösung in diesem Paket.

## Sichtprüfung und Korrektur vor Veröffentlichung

Beide echten API-Aufträge bestanden technisch (9 Cent Motiv, 23 Cent Foto; mit früherem Texttest insgesamt 33 Cent). Keine Live-Produktübernahme. Sichtprüfung fand ein zu schwaches weißes Gravurmotiv: die bestehende Graustufenabbildung macht weiße Pixel transparent. Neue KI-Gravurmotive werden deshalb ausdrücklich aus der Transparenz als technische schwarze Gravurmaske abgeleitet. Das Original-PNG bleibt bytegleich erhalten; Druckmotive und Fotobearbeitung behalten RGB. 34 gezielte Folgeprüfungen einschließlich echter Bilddecodierung, Originalerhalt und Gravur-Ausgabe bestanden. Erneute Vorschau mit demselben echten KI-Ergebnis, kein weiterer kostenpflichtiger Aufruf. Fotobearbeitung verändert sichtbare Bilddetails/Ausschnitt; deshalb ausdrücklich vor Übernahme prüfen, keine Identitäts- oder Rekonstruktionsgarantie.

## Laufzeitnachweis und Bestandssicherung

Nach frischem Seitenaufruf genau ein Händlerprozess bestätigt, gestartet **14:07:34 UTC**, nach der Konfigurationsänderung. Native KI und Bild-KI aktiv, Schlüssel geschützt, andere Händlerkonfiguration unverändert. Die erste isolierte Prozessprüfung konnte den Neustart nicht bestätigen und wurde nicht als Erfolg gewertet; die Folgeprüfung löste zuerst einen echten HTTPS-Aufruf aus und prüfte unmittelbar danach Prozess, Sperre und Startzeit. Keine weitere erzwungene Prozessbeendigung nötig.

Alle historischen Zeilen in **47 Tabellen** gegen die letzte Sicherung nach OpenAI-Aktivierung abgeglichen: vollständig erhalten. Genau zwei neue Zeilen im KI-Kostenjournal; keine bestehenden Produkte, Bestellungen, Profile oder Ressourcen geändert. Vor-/Nachher-Sicherungen auf dem Server mit SQLite-Integrität und SHA-256 geprüft. Nachher-Datenbanken zusätzlich privat in dieser Cloud gesichert und verifiziert; Details in `private-backup-verified.json`. Schlüssel und geschützte Konfigurationssicherungen bleiben ausschließlich auf dem Server. Bisheriger Runtime-Tarball ebenfalls privat auf dem Server. Echter Modelltest und korrigierte Vorschau bleiben in der privaten Prüfdatenkopie; keine Originalbilder oder privaten Datenbanken in GitHub.

Code, Ressourcen, Dokumentation und [versioniertes v2-Installationspaket](../../../../deliverables/merchant-ai-images-20261011/README.md) auf dem Aufgabenbranch und Recovery-Zielen gesichert. `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` ist weiterhin Vorfahr; keine neueren Änderungen verworfen.

## Bedienung

Shopify-App neu laden → Produkt → **Designs & Elemente → Mit KI gestalten**. In „Was möchtest du gestalten?“ zwischen Layout, **Neues Motiv erzeugen** und **Musterfoto bearbeiten** wählen. Für Fotobearbeitung muss ein gespeichertes Musterfoto im gewählten Design vorhanden sein. Auftrag senden, Vorher/Nachher prüfen und ausdrücklich als neue Version übernehmen. Das hinzugefügte Motiv anschließend mit den vorhandenen Werkzeugen positionieren oder skalieren. Ein KI-Ergebnis kann unpassend sein; Vorschau verwerfen verändert das Produkt nicht.
