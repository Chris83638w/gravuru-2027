## Familie bearbeiten, Übernahme auf Produkte, Bohrloch-Schutzzone (nicht installiert) · 13.10.2026

Produktfamilien direkt bearbeitbar (Formen, Größen, Preise, Bohrbilder, Schutzzone, Schriften) mit Revisions- und Konfliktschutz; Änderungen per Vorschau und Bestätigung auf erzeugte Produkte übertragbar, Designs bleiben erhalten. Konfigurator und Händler-Editor zeigen die 1-mm-Schutzzone und einen Hinweis für Texte am Bohrloch; Prüfvermerk im Bestellstand. Größenänderung hält Bohrloch-Randabstand in mm. `npm test` 721/721, Ops 55/55 + 13 Python, Browserprüfungen 12/12 und 7/7. [Nachweis](docs/releases/20261013/hole-zones/RELEASE.md). **Nächster Schritt:** Exportvorgabe + Serienlauf für Plugin-Designs (Pakete D/E), danach Mehrfachimport (F). Installation aller Pakete erst nach Nutzerfreigabe.

## Paket A Produktfamilien umgesetzt (nicht installiert) · 13.10.2026

Verwaltung → Produktfamilien: Edelstahl-Türschilder aus vorhandenen Stammdaten (61 Größen, 5 Formen, 7 Bohrbild-Regeln; alle 63 Bohrbilder exakt reproduziert), Gestaltungsschablonen mit 1 mm Schutzzone, Produktentwürfe je Größe ohne Duplikate, Briefing-ZIP für das ChatGPT-Projekt. `npm test` 715/715, Ops 55/55, Browserprüfung PASS. [Nachweis und Grenzen](docs/releases/20261013/families/RELEASE.md). **Nächster Schritt:** Paket C (Schutzzone und Text-Hinweis im Konfigurator) und Rest von Paket B (Größenwechsel per Regel).

## P1-Korrekturen umgesetzt (nicht installiert) · 13.10.2026

Alle vier P1-Befunde behoben: Plugin-/Vorlagenpakete auf Stahl und Acryl 1:1 bzw. konturgerecht (P1-4), Stahl-Vektorgravur auch in der Kundenansicht schwarz (P1-3), Gravurdatei folgt der Vorschau und lässt Weiß frei (P1-1), überlagerte Elemente per Klick und Folgeklick erreichbar (P1-2). `npm test` 709/709, Ops 55/55 + 13 Python, Browserprüfung mit Gegenprobe. [Nachweis und Grenzen](docs/releases/20261013/p1-fixes/RELEASE.md). Live-App und Daten unverändert. **Nächster Schritt:** Paket A (Produktfamilie Edelstahl-Türschilder aus vorhandenen Stammdaten) gemäß [Plan](docs/plans/PLUGIN-DESIGN-STRECKE-20261013.md); Installation der Korrekturen erst nach Nutzerfreigabe.

## Claude-Prüfung und Umsetzungsplan Plugin-Strecke · 13.10.2026

[Claude-Prüfbericht](docs/reviews/CLAUDE-PRUEFBERICHT-20261012.md) zu `4e2713b` (Anwendungscode = installierter `7a168bc`): 769 Tests in isolierter Umgebung bestanden; 4 P1-, 15 P2-, ca. 12 P3-Befunde mit Datei, Nachweis und kleinster Korrektur. [Umsetzungsplan](docs/plans/PLUGIN-DESIGN-STRECKE-20261013.md): Produktfamilien als Datensatz mit Familien-Briefing, Bohrbild als Regel (Motive über Bohrloch erlaubt, Texte mit Hinweis), Exportvorgabe für ChatGPT „Product Design", Serienlauf ohne KI, Mehrfachimport 1:1, Shopify-Veröffentlichung für die erste Familie Edelstahl-Türschilder.

Nur Dokumentation auf Branch `task/plugin-design-pipeline-20261013`; Anwendungscode, Live-App und Daten unverändert. **Nächster Schritt:** P1-Fehler 1–4 beheben, dann Paket A. Offene Nutzerangaben: Befestigungsaufpreise, Stammdaten-Excel Edelstahl, Schutzzonen-Maß (Vorschlag 3 mm), zwei Plugin-Originalausgaben.

## Übergabe zur unabhängigen Claude-Prüfung · 12.10.2026

[Vollständige Projektübersicht](docs/reviews/PROJEKTUEBERBLICK-CLAUDE-20261012.md): Ziele, verbindliche Entscheidungen, Soll/Ist, tatsächliche Architektur, gemeldete Fehler/Korrekturen, Produktvorlagen, Shopify/KI/Fertigung, Sicherungen und offene Abnahmen. [Prüfpaket](deliverables/claude-review-20261012/README.md) mit Quellenbasis `9d388e3`, neuen Übergabedateien und 1.200 per SHA-256 geprüften Dateien; private Daten/Schlüssel ausgeschlossen, fehlende Dokumentmedien im Manifest benannt. Keine unabhängige Prüfung bereits erfolgt.

Heute 17 lesende HTTPS-Prüfungen bestanden: HTML/Tabs, zwölf quellgleiche JS-/CSS-Dateien, vier geschützte JSON-APIs. Drei Remote-Branches vor Übergabe auf `9d388e3` bestätigt; `main` bleibt auf `3ff2c2f`. Aktuelles Installations-ZIP erneut auf SHA-256 geprüft. Letzter vollständiger Server-/Datenbankbeleg bleibt 11.10., 19:46 UTC; heute kein echter angemeldeter Shopify-Klickablauf und keine neue Datenbankinventur. Quellen siehe [Abgleich](docs/reviews/overview-20261012-checks.json).

Eigener Dokumentationsbranch `task/claude-overview-20261012`; Anwendungscode, Live-App, Produkte, Bestellungen, KI-Konfiguration und private Daten nicht geändert. Keine erneute Regression für diese Dokumentationsarbeit. Nächster Schritt: unabhängige Prüfung mit konkreten Befunden und echte Bedien-/Verkaufs-/Fertigungsabnahmen entsprechend der Übersicht.

## Live: schwarze Edelstahlgravur und Produkt-/Designtabs · 11.10.2026

Quellstand **7a168bc**, Version `0.1.0-recovery.20261010+7a168bc66adc`: schwarze Vektorgravur, sichtbarer Importabstand mit Vorgabe 0 mm, „Ohne Rand neu einpassen“ sowie Tabs **Hauptprodukt / Designs** mit Suche. Bestehende Designs werden nur auf ausdrückliche Übernahme angepasst.

727 Regressionen abgedeckt; ein veralteter Farb-Sollwert korrigiert und alle 19 betroffenen Vertrags-/Randtests bestanden. Browser mit 120 lokalen API-Anfragen, sechs Pixelproben und aktuelles Edelstahlprodukt Revision 3 in privater Kopie geprüft. Isolierte Paketinstallation, 425 Manifestdateien, 17 HTTPS-Prüfungen und neuer Händlerprozess bestätigt. Originale/Revisionen und alle Zeilen in 50 Tabellen unverändert; drei private Datenbanken auf Server und in Cloud mit SHA-256/SQLite geprüft. Code, Berichte und versioniertes ZIP auf GitHub einschließlich beider Sicherungsbranches.

[Nachweise und Grenzen](docs/releases/20261011/steel-ink-tabs/RELEASE.md) · [Installationspaket](deliverables/merchant-steel-ink-tabs-20261011/README.md). **Nächster Schritt:** Gestaltung mit der neuen Produkt-/Designstruktur fortsetzen. Öffentliche Verkaufsbindung und Maschinenabnahme bleiben separate Abnahmen. Vor dem Neuladen der App ungespeicherte Browseränderungen speichern.

## 11.10.2026 · Hilfslinien, Formate, PDF-Einpassung und Katalog

Implementiert im Aufgabenbranch `task/steel-formats-catalog-20261011`: Geometrie/Import, Editorhilfen, getrennte Hintergründe, kompakter paginierter Produktindex, Kategorien sowie geschützte Shopify-Entwurfsanmeldung. 726 Regressionen, 29 abschließende gezielte Prüfungen und 38 Original-PDF-Konturprüfungen bestanden; Browserabnahme mit synthetischer Shopify-Identität. Drei aktuelle Datenbanken außerhalb Git auf Server/Cloud geprüft gesichert; Edelstahl Revision 2 und zusätzliche SVGs erhalten.

Quellstand **880f124** aktiviert. Versioniertes ZIP getrennt installiert, 425 Manifestdateien und 15 HTTPS-Prüfungen bestanden; neuer Prozess und echte Shopify-Entwurfsanmeldung bestätigt. Keine Shopify-Mutation oder zusätzliche KI-Kosten.

Alle bisherigen Zeilen in 49 Tabellen erhalten; drei private Datenbanken nach Wechsel auf Server und Cloud mit SHA-256/Integrität gesichert. Alle 7 Produkt-/Masterstände aktuell im Katalogindex. Code, Prüfnachweise und versioniertes Paket auf GitHub im Aufgabenbranch sowie auf `backup/account-recovery-20261010` und `task/full-backup-install-20261010` gesichert.

**Genau nächster Schritt:** öffentliche personalisierte Bestellstrecke samt Testbestellung abnehmen; feste AOSU-Konstruktion separat. [Detailbericht](docs/releases/20261011/formats/RELEASE.md).

## Live: vorhandene Acryl- und Edelstahlmuster · 11.10.2026

Händlerlaufzeit **732850e**, Version `0.1.0-recovery.20261010+732850e06919`. AOSU/Labrador und Edelstahl/Heimathafen jeweils als Master plus Produktkopie angelegt; drei vorhandene Produktstände einschließlich Acrylmaster/-produkt unverändert. Native Texte/Motive bearbeitbar, 40 AOSU-Ausführungen und Preislogik übernommen. Originalbild Charlotte Groner v4 als gesonderte Referenz, keine identische native Quelldatei gefunden.

**63 gezielte Tests**, isolierter Browser mit 95 authentifizierten API-Anfragen, wiederholter Import in privater Datenkopie, getrennte Paketinstallation und 11 HTTPS-Prüfungen bestanden. Aktiver neuer Händlerprozess und tatsächliche Serverdatensätze/Originalressourcen bestätigt. Alle ursprünglichen Zeilen in 49 Tabellen erhalten; drei Datenbanken auf Server und in Cloud privat mit SHA-256 und SQLite-Integrität gesichert. Keine KI-Kosten oder Änderungen an der bisherigen Kundenwerkstatt. [Nachweise und Grenzen](docs/releases/20261011/specimens/RELEASE.md) · [Installationspaket](deliverables/merchant-specimens-20261011/README.md).

**Nächster Schritt:** mit den importierten Mustern weitergestalten, den getrennten AOSU-Fertigungsexport anbinden und neue Shopify-Verkaufsbindungen separat abnehmen. Eine Veröffentlichung als Verkaufsartikel ist nicht Teil dieser Musterübernahme.

## Live: Shopify-Verbindung wiederhergestellt · 11.10.2026

Installierter Quellstand **f1bc2bc**. Shopify-Zeitabweichung korrigiert, verständliche Anmeldemeldungen und bedienbare Wiederverbindung ohne Verlust ungespeicherter Gestaltung. **Nutzer bestätigt nach Neuladen die Produktanzeige**; 19 erfolgreiche authentifizierte Zugriffe auf Sitzung, Produkte, Profile, Schriften und Vorschauen im Serverprotokoll.

65 Regressionstests, synthetischer Desktop-/Mobilablauf mit 49 API-Anfragen, isolierte Paketinstallation und neun HTTPS-Prüfungen bestanden. 411 Manifestdateien auf dem Server geprüft, neuer Händlerprozess bestätigt. Alle historischen Zeilen in 49 Tabellen erhalten; drei Datenbanken mit SHA-256/SQLite-Prüfung privat auf Server und Cloud gesichert. Keine neuen KI-Kosten; bisherige Kundenwerkstatt unverändert. [Nachweise und Grenzen](docs/releases/20261011/connection/RELEASE.md) · [Paket](deliverables/merchant-connection-20261011/README.md).

**Genau nächster Schritt (neuer Nutzerauftrag):** vorhandene ausgearbeitete Edelstahl- und Acrylschild-Vorlagen in diese Werkstatt übernehmen. Öffentliche neue Kunden-/Checkout-Strecke, allgemeine Shopify-Produktübertragung, Drive und Maschinenabnahme bleiben eigene offene Pakete. Folgende Abschnitte sind historische Nachweise.

## Live: KI-Stapelgestaltung · 11.10.2026

Installierter Quellstand **0b64e87**. Ausgewählte kompatible Produkte gemeinsam mit KI gestalten: Layout, einzelne neue Motive oder ausdrücklich zugeordnete Musterfotos. Dauerhafte serielle Warteschlange, Budgetpause, Abbruch und Fortsetzen nach Neustart; Vorschläge einzeln vergleichen und als neue Version übernehmen. Bestehende Einzel-KI und 100-EUR-Grenze wiederverwendet.

597 Regressionstests nach gezielter Korrektur des Zugriffstests bestanden; Browser mit synthetischer Shopify-Identität und 68 API-Aufrufen auf Desktop/Mobil bestanden. 100 Produkte mit 3 parallelen Änderungen: 97 Entwürfe, 3 Konflikte. Keine bezahlten API-Anfragen. [Nachweise](docs/releases/20261011/ai-batch/RELEASE.md).

**Installation und Auslieferung:** ZIP mit Version/Prüfsumme getrennt installiert, auf dem Server aufgebaut und nach privater Sicherung aktiviert. HTTPS, bytegleiche Oberfläche, geschützte API und neuer Händlerprozess bestätigt. Vorherige KI-Kosten unverändert 34 Cent von 100 EUR; keine zusätzliche Anfrage durch diese Prüfungen. Alle historischen Zeilen in 47 Tabellen erhalten. Drei Datenbanken privat auf Server und in Cloud mit SHA-256 und SQLite-Integrität geprüft. Code, Berichte und Paket auf Aufgaben-/Recovery-Branches gesichert.

**Genau nächster Schritt:** allgemeine Shopify-Produktübertragung als überprüfbare Entwürfe für weitere Werkstattprodukte abschließen. Echte Händleranmeldung als vollständiger Klicknachweis, öffentliche neue Kunden-/Checkout-Strecke, eigene Drive-Anbindung und Maschinenabnahme bleiben ausdrücklich offen. Die folgenden Abschnitte sind historische Nachweise.

## Live: KI-Motive und Musterfotos · 11.10.2026

Installierter Quellstand **5698c5f**: Produkt → Designs & Elemente → **Mit KI gestalten** → neues Motiv erzeugen oder ausgewähltes Musterfoto bearbeiten. Native Gestaltung, Originalmaske, Preise und Versionsschutz erhalten. Neues Gravurmotiv nach echter Sichtprüfung korrigiert: Alpha als technische Gravurmaske, Original-PNG bytegleich erhalten.

**688 Regressionstests**, **34 gezielte Folgeprüfungen**, Desktop-/Mobilablauf (86 API-Aufrufe, synthetische Shopify-Identität), getrennte v2-Paketinstallation und HTTPS bestanden. Genau zwei echte Bild-API-Aufträge: **9 + 23 Cent**; einschließlich früherem Texttest **33 Cent im Werkstattbudget**, 99,67 EUR verfügbar. 100-EUR-Monatsgrenze und Freigabe bis **10.11.2026, 12:38 UTC** unverändert. Echte Gedenktafel weiterhin Revision 5; Tests nur in privater Kopie übernommen.

Aktiver neuer Händlerprozess bestätigt. Alle historischen Zeilen in 47 Tabellen erhalten; drei private Datenbanken auf Server und in Cloud geprüft gesichert. Code, Dokumentation und v2-Paket auf GitHub. [Release, Bedienung und Grenzen](docs/releases/20261011/ai-images/RELEASE.md) · [Paket mit Prüfsumme](deliverables/merchant-ai-images-20261011/README.md).

**Genau nächster Schritt:** Stapel-KI als prüfbare Aufträge für ausgewählte kompatible Produkte unter demselben Budget. Echte Shopify-Anmeldung als vollständiger Klickablauf, öffentliche neue Kunden-/Checkout-Strecke, Drive, allgemeine Shopify-Produktübertragung und Maschinenabnahme bleiben eigene offene Arbeitspakete. Die folgenden Abschnitte sind historische Nachweise.

## Live: OpenAI verbunden und mit echter Antwort geprüft · 11.10.2026

Geschützter eigener Schlüssel eingerichtet, `gpt-4.1-2025-04-14` erreichbar. **Ein echter Gestaltungsauftrag bestanden:** gewünschte Textposition geändert, sonstige Elemente/Preise/Rechte erhalten. 1.194 Eingabe-/102 Ausgabetokens, **1 Cent im Werkstattbudget**, 99,99 EUR verfügbar. Übernahme/Wiederholung in privater Kopie geprüft; echtes Produkt bleibt Revision 5. Installierter Quellstand weiterhin **060a10b**.

Aktiver Händlerprozess nach Konfigurationsänderung und HTTPS geprüft. Bedienung: App neu laden → Produkt → Designs & Elemente → **Mit KI gestalten**. Freigabe aktuell bis **10.11.2026, 12:38 UTC**; danach Tarifprüfung erneuern. Alle historischen Zeilen in 47 Tabellen erhalten. [Prüfung, Konfiguration und Sicherung](docs/releases/20261011/openai-active/RELEASE.md).

**Nächster Ausbau:** neue KI-Bilder/Motive und Fotobearbeitung unter demselben Kostenrahmen ergänzen; Stapel-KI ebenfalls offen. Echte Shopify-Anmeldung des Browserlaufs und neue öffentliche Kunden-/Checkout-Strecke bleiben gesonderte Abnahmen. Die folgenden Abschnitte sind historische Nachweise.

## Live: vorbereitete OpenAI-Gestaltung mit Kostenkontrolle · 11.10.2026

Installierter Quellstand **060a10b**, Version `0.1.0-recovery.20261010+060a10b9d923`. Produkt → Designs & Elemente → **Mit KI gestalten**: native Texte/Layout/Farben/vorhandene Motive; Vorschlag prüfen und ausdrücklich als neue Revision übernehmen. 100-EUR-Monatsgrenze mit dauerhafter Reserve und befristeter Tarifprüfung. **Generierung ohne geschützten eigenen API-Schlüssel deaktiviert; kein echter OpenAI-Aufruf und noch keine reale Antwortabnahme.** Neue KI-Bilder, Fotobearbeitung und Stapel-KI bleiben offen.

**671 Regressionstests**, gezielte Anmelde-/CSRF-Prüfungen, synthetische Desktop-/Mobilabläufe, isolierte ZIP-Installation/Neustart sowie **28 HTTPS-Prüfungen** bestanden. 407 Serverdateien geprüft. Sämtliche historischen Zeilen in 46 Tabellen erhalten; nur leere KI-Tabelle ergänzt. Private Konfiguration, Startweiterleiter und Gedenktafel Revision 5 unverändert. Code und versioniertes ZIP auf GitHub einschließlich Recovery-Branch gesichert; private Daten separat.

[Release, Bedienung und genaue Grenzen](docs/releases/20261011/ai-design/RELEASE.md) · [Paket und Prüfsumme](deliverables/merchant-ai-design-20261011/README.md) · [Geschützte OpenAI-Einrichtung](ops/plesk/AI-DESIGN.md). **Nächster Schritt:** eigenen OpenAI-Projektschlüssel geschützt serverseitig hinterlegen, Verbindung und einen kleinen echten Auftrag abnehmen. Öffentliche neue Kunden-/Checkout-Strecke, allgemeine Shopify-Übertragung, eigene Drive-Autorisierung und Maschinenabnahme bleiben separate offene Anschlüsse. Die folgenden Abschnitte sind historische Nachweise.

**Anschlussfortschritt:** Nutzer hat den API-Schlüssel erstellt. Geschützte leere Datei `private/gravuru-openai-api-key.txt` auf dem Händler-Server angelegt und Eigentümerrechte geprüft; Inhalt nicht gelesen, keine Aktivierung. Nächste Nutzereingabe: Schlüssel dort im Plesk-Dateimanager speichern; danach serverseitig verbinden und echten Auftrag prüfen.

## Live: Original-Fotomaske und vollständiger Testkauf · 11.10.2026

Installierter Quellstand **9b77eb1**, Gedenktafel **Revision 5**. Originalmaske der PDF bleibt beim Fotoaustausch in Händleransicht, Kundenansicht und technischem Ausgabepaket erhalten; verständliche Elementnamen und M01/M02-Navigation. **654 Regressionstests**, Desktop-/Mobilabläufe, isolierte Paketinstallation und **25 HTTPS-Prüfungen** bestanden. Tatsächliche Shopify-Testbestellung mit Foto: **32,98 EUR + 4,99 EUR Versand**, Testgateway, bezahlt, nicht erfüllt; genau eine Position zugeordnet, keine Fertigungsfreigabe.

Händlerhost läuft nach Behebung einer Webserver-Startstörung. Plesk-Site 20 startet `start-r5.cjs` als stabilen Weiterleiter auf `app.cjs`; künftige Aktivierungen ändern weiterhin `app.cjs`. Alle drei privaten Datenbanken nach Testkauf auf Server und in Cloud mit Prüfsummen/Integrität gesichert; historische Daten in 46 Tabellen erhalten. Alte Kundenwerkstatt unverändert. [Release, Bedienung und Sicherung](docs/releases/20261011/template-r5/RELEASE.md) · [Installationspaket mit Prüfsumme](deliverables/merchant-template-r5-20261011/README.md).

**Nächste offenen Anschlüsse:** öffentliche neue Kunden-/Checkout-Strecke und allgemeine Shopify-Produktübertragung; eigene Drive-Autorisierung samt Ordner; OpenAI-Anbindung mit tatsächlich durchgesetztem Budget. Nutzer nennt „100“, als 100 EUR/Monat erläutert; keine kostenpflichtige API aktiviert. Maschinen-/Material-/ICC-Abnahme bleibt offen. Die folgenden Abschnitte sind historische Nachweise.

## 11.10.2026 · Originalmaske und Navigation als geprüfter Kandidat

Original-Fotomaske statt pauschalem Rechteck, unveränderliche Maskenreferenz bis ins Produktionspaket, bearbeitbare Elementnamen und Navigation nach M01/M02 umgesetzt. Tatsächliche PDF in privater Kopie als Revision 5 aufbereitet; Fotoaustausch/Speichern und technische Gravur-PDF geprüft. Vollständige Regression und isolierte Installation laufen. Live weiterhin `971c57d`, Produktrevision 4; keine neue Veröffentlichung behauptet. [Arbeitsnachweis](docs/releases/20261011/template-r5/RELEASE.md).

Nächster Schritt: Abnahme abschließen, privaten Bestand sichern und den freigegebenen Händlerstand veröffentlichen; historische Bestellungen unverändert erhalten.

## 11.10.2026 · Händler-Testbestellung mit Foto erfolgreich

Installierter Quellstand **971c57d**, Version `0.1.0-recovery.20261010+971c57dea374`. Revisionsfestlegung für Gedenktafel 4, neun tatsächliche Shopify-Ausführungen samt Fotoaufpreis geprüft und gebunden. Echter Testkauf: 32,98 EUR plus 4,99 EUR Versand, Gateway `bogus`, `test: true`, `PAID`, `UNFULFILLED`; signierter Eingang ordnet genau eine Position dem gespeicherten Stand zu. Fertigung/Kundendownload und öffentlicher neuer Checkout bleiben gesperrt.

44 gezielte Tests, neun anschließende Laufzeitprüfungen (überlappende Testmengen), alle neun Varianten in privater Kopie, isolierte Paketinstallation/Neustart sowie 20 HTTPS-Prüfungen bestanden. 399 Paketdateien auf Server verifiziert. Vorherige Laufzeit, Konfiguration und drei Datenbanken gesichert; nach Testkauf neue Server-/Cloud-Sicherung aller Datenbanken verifiziert. Ursprüngliche Zeilen in 46 Tabellen und Originalfoto im Bestellpaket byteidentisch erhalten. [Release und Grenzen](docs/releases/20261011/cart-r4/RELEASE.md) · [Installationspaket](deliverables/merchant-cart-r4-20261011/README.md).

Nächster Schritt: neue öffentliche Kundenstrecke mit denselben unveränderlichen Entwurfs-/Preisbindungen; physische Fertigungsabnahme gesondert. Ältere Abschnitte dokumentieren frühere Stände.

## 11.10.2026 · Geprüfte Händlerkorrekturen veröffentlicht

Runtime **c2d4069**, Version `0.1.0-recovery.20261010+c2d40692ce56`, Produktrevision **4** aktiv. Isoliertes Paket, Zielserver, HTTPS und vollständiger Originalerhalt in 46 Tabellen geprüft. Neue private Datenbanksicherungen heruntergeladen; Prüfsummen und Integrität stimmen. Details unter `docs/releases/20261011/completion/RELEASE.md`. Kein neuer echter Kauf, keine Fertigungsfreigabe. Initialer Renderer-Bildabruf abschließend behoben, tatsächliche PDF-Prüfung ohne fehlende Bilder bestanden. Nächster Schritt: neue revisionsgebundene Bestellfassung samt unveränderter Foto-Aufpreisregel abnehmen; externe Voraussetzungen getrennt offen.

## 11.10.2026 · Werkstatt-Abschluss: Bedienung und PDF-Kundenansicht

PDF-Schriftwahl über vollständige Bibliothek, Rückgängig/Wiederholen und standardmäßige Importaufbereitung ergänzt. Tatsächlicher PDF-Test deckte zwei Kundenansichtsfehler auf: veränderte immutable Ressourcendeskriptoren und unnötiger CSP-blockierter Daten-URL-Abruf. Beide korrigiert; private echte Vorlage bis gesichertem Kundenprüfstand getestet. 652 Regressionen, 29 gezielte Folgeprüfungen, erweiterter synthetischer Händler-Browserablauf bestanden. Versionierte Paket-/Live-Abnahme folgt in `docs/releases/20261011/completion/RELEASE.md`. Private Daten bleiben außerhalb Git; bestehende Originalrevisionen erhalten. Nächster Schritt: Paket isoliert installieren, serverseitige private Produktkopie prüfen, dann autorisierte Veröffentlichung.

## Live: Auswahl, PDF-Bearbeitung und echtes Musterfoto · 11.10.2026

Quellstand **4d8042f** läuft auf dem getrennten Händlerhost: sichtbare Auswahlgriffe, Maus/Touch, abbrechbare Vorschau; PDF/SVG standardmäßig in getrennte Bestandteile aufbereiten, Originaltexte gezielt in native Werkstatttexte umwandeln; echte Musterfotos mit lesbarem Hinweis. 650 Regressionstests, 21 abschließende gezielte Prüfungen und Browserablauf mit synthetischer Shopify-Identität bestanden. Alle 20 erreichbaren Original-PDFs aufbereitbar. Versioniertes Paket getrennt installiert, 398 Serverdateien und HTTPS geprüft. Alle ursprünglichen Zeilen in 46 Anwendungstabellen nach Veröffentlichung unverändert; drei private Datenbanksicherungen auf Server und in Cloud geprüft.

[Bericht, Bedienung und Grenzen](docs/releases/20261011/selection-pdf/RELEASE.md) · [Installationspaket und Prüfsumme](deliverables/merchant-selection-pdf-20261011/README.md). Bestehende PDFs im Editor über „PDF / SVG in Elemente aufbereiten“ vorbereiten, prüfen und speichern. Echte Nutzeranmeldung, tatsächliche Design-/Maschinenabnahme und übrige Master-Bauplan-Erweiterungen bleiben gesondert offen. Folgende Abschnitte sind historische Stände.

## Live: eigene Designs, Texte, Motive und Musterfotos · 11.10.2026

Aktuelles Paket ergänzt eigene Designs, native Texte/Fotofelder, Bibliotheks-/Uploadmotive, Ersetzen/Entfernen/Reihenfolge und direktes Verschieben. Foto-Tonwerte in importierten Designs erhalten; JPG/PNG/WebP-Beispielfotos samt privaten Originalen. Kundenrechte bleiben getrennt, Originale und bestehende Revisionen erhalten. Aktuelle private Produktrevision 3 vor Änderung gesichert.

649 Regressionstests, fünf anschließende Prüfungen der Originalzuordnung und vollständiger Desktop-/Mobil-Browserablauf mit synthetischer Identität bestanden. Aktuelle Original-PDF separat sichtbar geprüft; 766 statt eines einzigen Farbwerts im Fotobereich. Quellstand `74e7670` auf dem getrennten Händlerhost veröffentlicht; 396 Manifestdateien und HTTPS bestätigt. Paketinstallation/Neustart mit synthetischen Daten bestanden. Neuere Revision 3 und sämtliche bestehenden Originalzeilen erhalten; private Sicherung vor/nach Wechsel. [Paketbericht](docs/releases/20261011/design-authoring/RELEASE.md). Nächster Schritt: mit eigenen nativen Designs weiterarbeiten; importierte PDF-Inhalte werden nicht automatisch zu Feldern. Echte Nutzeranmeldung und Maschinenabnahme bleiben getrennte Nachweise.

## Live: Werkstattfehler behoben und gesichert · 11.10.2026

Getrennter Händlerhost auf **0754445**, Version `0.1.0-recovery.20261010+0754445b6249`. Shopify-Start ohne URL-Kontext und Navigation/History korrigiert. Schiefer-PDF-Import und geschützte Vorschaubilder korrigiert; Auswahl verändert die Grafik nicht mehr. Unter **Hintergrund & Szene** Rohlingbild austauschen; unter **Schriften & Profile** TTF/OTF hochladen und in Schriftprofilen gruppieren.

644 Tests, 130 authentifizierte API-Aufrufe in synthetischer Browser-Klickfolge, reale CDN-Initialisierung und 19 private Original-PDFs bestanden. Versioniertes Paket getrennt installiert und neu gestartet. 395 Serverdateien und tatsächliches HTTPS geprüft. Originalrevisionen, Ressourcen und Rohlingbild unverändert; Gedenktafel Revision 2 und neun Variantenbindungen erhalten. Drei private Datenbanken serverseitig und in Cloud hash-/integritätsgeprüft. Alte Kundenwerkstatt unverändert. [Bericht und Grenzen](docs/releases/20261011/workshop-repair/RELEASE.md) · [Installationspaket](deliverables/merchant-repair-20261011/README.md).

Nächster Schritt: vorhandene Shopify-App vollständig neu laden und die echte Händleranmeldung sowie die gemeldeten Bedienwege im Nutzerbrowser bestätigen. Dieser Browser ist nicht fernsteuerbar; eine echte Händleranmeldung wird nicht aus synthetischen Sitzungen abgeleitet. Historische Abschnitte folgen.

## Live: Händler-Testbestellung erfolgreich · 11.10.2026

Händlerhost läuft auf **ffdd150**, Version `0.1.0-recovery.20261010+ffdd150c8cd9`. Gedenktafel Revision 2 mit geschütztem Testwarenkorb und vorhandener vollständiger Schrift live. Echte Shopify-Testbestellung abgeschlossen: 22,99 EUR + 4,99 EUR Versand, Gateway `bogus`, `test: true`, `PAID`, `UNFULFILLED`. Signierter Eingang ordnet genau eine Position dem gespeicherten Entwurf zu. Fertigung/Kundendownload gesperrt; alte Kundenwerkstatt unverändert.

Versioniertes ZIP mit SHA-256, isolierter Installations-/Neustartprüfung, 65 gezielten Tests, acht Laufzeitprüfungen, Desktop-/Mobilbedienung und neun tatsächlichen Varianten in privater Kopie gesichert. Private Daten vor Wechsel auf Server und in Cloud geprüft; echte Bestelldaten/Checkout-Zugänge bleiben außerhalb Git. [Vollständiger Bericht](docs/releases/20261011/test-cart/RELEASE.md) · [Installationspaket](deliverables/merchant-test-cart-20261011/README.md).

Nächster Schritt: öffentliche neue Kundenstrecke weiterführen. Produktions-/Maschinenabnahme und echte Nutzeranmeldung bleiben separate Abnahmen. Historische Abschnitte folgen.

## Aktuell: Testbestelleingang und Shopify-Version veröffentlicht – 11.10.2026

Händlerlaufzeit **`ca4f6cd`**, Version `0.1.0-recovery.20261010+ca4f6cd5b5d2`, auf dem getrennten Händlerhost installiert. Signierter Eingang für bezahlte Testbestellungen aktiv; bestehende JWT-/CSRF-Grenzen bleiben erhalten. Shopify-Version **`gravuru-2027-orders-20261011-build2`** (`1162598875137`) veröffentlicht und nachgelesen: ausschließlich `read_orders` zusätzlich, sieben Module und 19 Theme-Dateien erhalten, Preisfunktion bytegleich. Gedenktafel Revision 2 und neun Preisbindungen unverändert.

**Bestellabonnement verbunden:** `read_orders` jetzt tatsächlich gewährt und in erneuter Abfrage mit eigener App lesend bestätigt. `ORDERS_PAID`-Abonnement **`2149402706300`** mit Filter `test:true`, API 2026-07, festem HTTPS-Ziel und begrenzten Feldern einmal angelegt und nachgelesen. Keine echte Bestellung, Zahlung oder Produktion ausgelöst. Checkout-Gesamtstrecke und echte Nutzeranmeldung bleiben eigene Abnahmen.

Versioniertes v2-Paket mit SHA-256 und 390 Manifestdateien; getrennte Installation, vollständige Aktivierung und Neustart mit synthetischen Daten bestanden. HTTP-, Händler-, Bestell-/Preis- und Abonnementprüfungen bestanden (überlappende Testmengen). Reale Probe fand Node-fetch-Browser-Metadaten: auf native HTTPS-Probe korrigiert, Browsersperre unverändert. Privater Datenbestand vor Wechsel gesichert; keine Geheimnisse/Datenbanken in GitHub. [Bericht und Grenzen](docs/releases/20261011/orders/RELEASE.md) · [Installationspaket](deliverables/merchant-orders-20261011/README.md).

Nächster Schritt: Kunden-/Checkout-Strecke verbinden und echte Testbestellung im bestätigten Testmodus einschließlich des jetzt angeschlossenen Bestelleingangs prüfen. Ältere Abschnitte darunter dokumentieren historische Stände.

## Aktuell: Cormorant Garamond und Preisbindungen veröffentlicht – 11.10.2026

Händlerlaufzeit auf Quellstand **`77b0472`** installiert und HTTPS-geprüft. Gedenktafel **Revision 2** verwendet auf Nutzerwunsch die vorhandene vollständige Schrift **Cormorant Garamond** (327 Zeichen, Umlaute und †). Zwei Textfelder innerhalb ihrer bisherigen Bereiche in ganzen Millimetern eingepasst; Revision 1 unverändert erhalten. Alle neun Ausführungen mit realen Shopify-Optionsnamen und Preisen abgeglichen und unveränderlich an Shopify-Preisrevision 30 gebunden. Shopify-Produkt, App-Module und bisherige Kundenwerkstatt unverändert.

Versioniertes Installations-ZIP mit SHA-256, 385 Manifestdateien, getrenntem Installations-/Laufzeittest und vollständigem Übernahmetest gesichert. Vorher-/Nachher-Sicherung aller drei privaten Datenbanken auf dem Server; neuer Stand zusätzlich privat in dieser Cloud, SHA-256 und SQLite-Integrität bestätigt. Keine privaten Daten in GitHub. 119 gezielte Warenkorbprüfungen, ergänzende Schrift-/Binärdateiprüfungen, alle neun Varianten samt atomarer/idempotenter Bindungsanlage sowie Desktop-/Mobil-Browserprüfung bestanden; Testmengen überschneiden sich.

[Veröffentlichung und Sicherung](docs/releases/20261011/RELEASE.md) · [Paket und Ablauf](deliverables/merchant-font-cart-20261011/README.md). **Offen:** echte Händleranmeldung als Nutzer abnehmen, neue öffentliche Kunden-/Checkout-Strecke, Bestelleingang mit erforderlicher Shopify-Berechtigung und tatsächlicher Testkauf im bestätigten Testmodus. Das Produkt ist noch nicht im Onlineshop veröffentlicht. Keine Zahlung oder Produktion ausgelöst. Nächster Schritt: Bestellanschluss und Checkout gemeinsam prüfen, ohne offene Maschinen-/Materialabnahmen als erledigt auszugeben. Historische Abschnitte folgen.

## Aktuell: Schiefer-Warenkorb und Preisvertrag geprüft – 11.10.2026

Neuer Entwicklungsschritt: native Schiefer-Prüfstände werden für unveränderliche Testbestellzuordnungen erkannt. Aufpreise und Entwurfsreferenz bleiben durch Angebot, Warenkorbjournal, Shopify-Anfrage, Antwortprüfung und signierten Testbestelleingang erhalten. Expliziter tokenloser Storefront-Modus ergänzt; bestehende private Token-Konfiguration bleibt gültig. Bestehende Zuordnung wird in der Warenkorb-Vorbereitung wiederverwendet.

119 gezielte Prüfungen und Händler-Browserprüfung mit synthetischer Identität bestanden. Alle neun Ausführungen aus einer privaten Kopie der tatsächlich installierten Gedenktafel gegen die archivierte Shopify-Preisfunktion geprüft; Original-Sicherungen unverändert. Eigene Shopify-App bestätigt Preisrevision 30, neun Varianten und Aufpreise. Das Produkt ist noch nicht im Onlineshop veröffentlicht. Kein Warenkorb oder Kauf im echten Shop erzeugt.

Neu gefundene Grenze: PDF-EdwardianScriptITC-eb1411f1 enthält nur 24 Zeichen, z. B. kein großes T. Nutzer wählt eine vorhandene vollständige Werkstatt-Schrift: Cormorant Garamond mit Umlauten und † geprüft, neue Revision und atomare/idempotente neun Preisbindungen in privater Kopie bestanden. Produktions-/Warenkorbsperren bleiben bestehen; Bestell-Webhook ist nicht angeschlossen. Veröffentlichter Server weiterhin `21f9922`, bis ein neuer Aktivierungsnachweis vorliegt.

[Prüfbericht](docs/releases/20261011/CART-INTEGRATION.md). Nächster Schritt: geprüfte Shop-Zuordnungen übernehmen und Testbestellstrecke mit tatsächlichem Bestelleingang anschließen. Historische Abschnitte folgen.

## Aktuell: Händlerwerkstatt in Shopify veröffentlicht – 10.10.2026

**Veröffentlichter Quellstand `21f9922`**, App-Version `gravuru-2027-merchant-20261010-build1` (`1162554900481`). Shopify-App „Gravuru Konfigurator“ öffnet jetzt `https://app-2027.gravuru-designwerkstatt.de/werkstatt/`. Alle sieben Module erhalten; Theme, Berechtigungen und Webhooks unverändert. Die Preisfunktion wurde aus gesicherten Quellen reproduziert und geprüft. Vorhandene Kundenwerkstatt unverändert.

Versioniertes ZIP mit SHA-256 und isoliert geprüfter Installation gesichert. Alle 16 PDF-Originale privat importiert; ein ursprüngliches Design als bearbeitbare native Gedenktafel mit neun Befestigungen übernommen. Alle drei Händlerdatenbanken inklusive Originalbibliothek konsistent auf Plesk und privat in der Cloud gesichert, Prüfsummen und Integrität bestanden.

[Veröffentlichungsbericht](docs/releases/20261010/RELEASE.md) · [Installationspaket](deliverables/merchant-originals-20261010/README.md) · [Shopify-Nachweis](docs/releases/20261010/merchant-publication.json).

**Noch offen:** echte Händleranmeldung durch den Nutzer bestätigen; neue Warenkorb-/Bestellstrecke anschließen und im bestätigten Zahlungs-Testmodus abnehmen. Keine Testbestellung oder Maschinenabnahme behaupten. Historische Abschnitte darunter sind frühere Zustände.

## Aktuell: Serverinstallation und PDF-Originale – 10.10.2026

Händlerpaket `2d86c73` auf dem getrennten HTTPS-Host installiert und geprüft; bisherige Startdatei, Code und alle drei Händlerdatenbanken auf dem Server sowie privat in dieser Cloud gesichert, Prüfsummen/SQLite-Integrität bestanden. Bestehende Kundenwerkstatt unverändert. Shopify-Kandidat mit sieben Modulen erstellt, noch nicht freigegeben; Theme/Berechtigungen/Webhooks unverändert, reproduzierte Preisfunktion separat geprüft.

Beim anschließenden Import der Original-PDFs gefunden: MuPDF-Ebenenannotation wurde korrekt sicherheitshalber abgewiesen. Nicht darstellungswirksame `groupmode=layer`-/Label-Angaben werden jetzt entfernt; 19 Tests und alle 16 tatsächlichen Original-PDFs bestanden. Originalbytes bleiben unverändert. Nächster Schritt: korrigiertes Paket installieren, Originalbibliothek übernehmen und geprüfte Händleradresse in Shopify freigeben. Echte Händleranmeldung und bestätigte Testbestellung bleiben gesonderte Nachweise.

## Aktuell: Geschützte Kundenvorschau im Händlerhost – 10.10.2026

Auf `2662ddd` weitergeführt: Acryl-/Schiefer-Renderer und freie Gestaltung mit angemeldeten API-Aufrufen, festgelegter Produktrevision, privaten Bildern und Entwurfssicherung verbunden. 40 gezielte Node-Tests und tatsächliche Desktop-/Mobilbedienung mit synthetischer Händleridentität bestanden. [Abnahme](docs/releases/20261010/MERCHANT-PREVIEW.md). Breite Prüfung: 655 Tests, zunächst ein fehlender Browserkontext im Kartentest; korrigiert und 16 betroffene Folgeprüfungen bestanden. Zusätzlich 5 Prüfungen für den gesperrten, gesicherten Installationswechsel bestanden.

Zahlungs-Testmodus vom Nutzer bestätigt. Noch keine echte Bestellung oder App-Umschaltung. Nächster Schritt: versioniertes Händlerpaket mit privater Bestandssicherung installieren; danach Shopify-App-Anschluss und operative Bestellprüfung. Die vorhandene Kundenwerkstatt bleibt bis zum geprüften Anschluss erhalten.

## Aktuell: Schieferprodukt, Originalressourcen und private Prüfstrecke – 10.10.2026

Auf `c628d88` weiterentwickelt: idempotente Schieferübernahme, neun Befestigungen, Original-Schrift-/Motiv-/Materialressourcen, Preisformular und Kunden-Prüfstand. 616 Tests bestanden, keine Fehler/Überspringungen. Tatsächlicher Desktop-/Mobilbrowser mit der wiedergewonnenen Gedenktafel: alle neun Preise, Textänderung und private Sicherung bestanden; daraus maßhaltige Vektor-Gravur-PDF erzeugt. [Abnahme und Grenzen](docs/releases/20261010/SLATE-ADAPTER.md).

Der Nutzer hat den Zahlungs-Testmodus im bestehenden Shop bestätigt. Noch keine Shopify-Testbestellung oder neue Live-Veröffentlichung. Nächster Schritt: vollständige Kunden-Vorschau aus dem authentifizierten Händlerhost, dann operative Warenkorb-/Bestellzuordnung. Die vorhandene Werkstatt und ihre Daten sind unverändert; neue Original-/Testdaten bleiben privat.

## Aktuell: Gesamtprüfung und Weiterentwicklung zur Veröffentlichung – 10.10.2026

Nutzerauftrag bestätigt: den gesamten erreichten Stand prüfen, fehlende Anschlüsse weiterentwickeln und anschließend veröffentlichen; vorhandenen Shopify-Shop direkt für Integrationsprüfungen nutzen. Frühere Entwicklungspausen sind überholt. **Noch keine neue App-Version veröffentlicht.**

607 aktuelle Node-Tests bestanden, keine Fehler/Überspringungen. Vollständiges Shopify-Erweiterungspaket wiederhergestellt, alle 19 Theme-Dateien mit aktiver Version identisch; Quell-/WASM-Prüfungen und isolierte Installation samt echtem Shopify-Build auf Plesk bestanden. Originale aller 16 Gedenktafel-Designs privat gesichert. [Aktueller Prüfbericht](docs/releases/20261010/REVIEW.md) · [Versioniertes Erweiterungspaket](deliverables/shopify-extension-build-20261010/README.md).

Branch `task/live-release-20261010`, Basis `260ada3`. Weiter: Schieferprodukt mit Originalelementen in die neue Werkstatt übernehmen, danach Kunden-/Warenkorb-/Bestellanschluss und echte Integrationsabnahme. Zahlungsanbieter ist verbunden; abbuchungsfreier Testmodus noch nicht bestätigt. Historische Abschnitte sind keine aktuelle Freigabe- oder Zugangsaussage.

## Aktuell: Vollständige erreichbare Sicherung und Installationsprüfung – 10.10.2026

Neuere Arbeit bis **`6f384f4`** aus dem verifizierten Plesk-Git-Bundle wiederhergestellt, danach letzte vollständige Dokumentationsdiffs aus dem verlorenen Chat rekonstruiert. Alle erfassten GitHub-Branchhistorien bleiben erhalten; keine Rücksetzung auf `a2af162`. Zusätzliche Theme-/Preisfunktionsquellen aus dem älteren Repository gesichert. **Live-Werkstatt unverändert.**

[Verbindlicher Sicherungs- und Prüfbericht](recovery/2026-10-10/REPORT.md) · [Installationspaket, SHA-256 und automatischer Installer](deliverables/recovery-install-20261010/README.md) · [Erreichbare und fehlende Dateien](recovery/2026-10-10/RECOVERY-PROVENANCE.md).

Paketversion `0.1.0-recovery.20261010+a9bfbfbc463e`, frische isolierte Installation bestanden; 588 breite Node-Prüfungen mit dokumentierter Umgebungsbereinigung, 66 gezielte Wiederherstellungsprüfungen sowie Operator-/Händler-Browserprüfungen bestanden. Testmengen überschneiden sich. Echte Shopify-Bestellstrecke, physischer Druck und private Datenbanksicherung damit nicht abgenommen. Produktcode unverändert; ausschließlich Sicherung, Installer und Korrektur eines kollidierenden Testaufbaus. Sicherungsziele auf GitHub: `backup/account-recovery-20261010` und `task/full-backup-install-20261010`, endgültigen Remote-Abgleich in der Abschlussmeldung beachten.

Nächster Schritt: unabhängige Prüfung auf dieser gesicherten Basis und separates Betriebsdaten-Backup planen; keine Live-Umschaltung aus historischen Freigabetexten ableiten. Die folgenden Abschnitte sind historische Arbeitsstände.

## Aktuell: Entwicklung für unabhängige Gegenprüfung angehalten – 09.10.2026

Nutzer wünscht wegen der Fehler und fehlenden Gesamtfertigstellung eine andere KI zur Prüfung. Weitere Entwicklung und Server-/Shopänderungen angehalten. Produktcode bei `6f384f4da4f0e5f43f67de73f6f89e596dd6ccd3` erhalten. Nur lokales Prüfbriefing, Beobachtungsnachweise und Exportauswahl aktualisiert. [Prüfauftrag](docs/reviews/CLAUDE-AUFTRAG-20261009.md) · [Änderungen und Prüflücken](docs/reviews/AENDERUNGEN-UND-PRUEFLUECKEN-20261009.md). Noch keine unabhängige Prüfung und kein Claude-Aufruf erfolgt. Nutzer entscheidet nach dem Befund über weitere Korrekturen.

Aktuelle GitHub-Diagnose: `GH_TOKEN` vorhanden, GitHub selbst antwortet 401 / `Bad credentials`. Repository-lokalen GitHub-Credential-Helper verbunden, normaler Git-Aufruf weiterhin Exit 128 / Anmeldung abgewiesen. Kein Tokenwert gespeichert; Ursache/Verantwortlichkeit der Token-Ungültigkeit nicht ermittelt. Shopify-Token funktioniert davon unabhängig. Kein GitHub-Push oder Live-Release behaupten.

## Historisch: Gedenktafel ausgewählt; Versionsversuch abgewiesen – 09.10.2026

Nutzer erlaubt Auswahl einer bestehenden Gedenktafel. Gewählt: **Gedenktafel aus Schiefer mit Foto für Menschen, 220 × 140 mm**, Shopify `16138083107196`. Eigener authentifizierter Leseabruf erfolgreich; alle **neun Befestigungen/Preise** stimmen mit bestehendem App-Metafeld Revision 30 überein, ab 22,99 €, Aufpreise 1,69 €/Motiv und 9,99 €/Foto erfasst. Auswahl gesichert, noch keine neue Werkstattrevision oder operative Bindung. Öffentliche Produktadresse aktuell 404 trotz Status ACTIVE. [Nachweis und Anschlüsse](docs/dashboard-20261004/SHOPIFY-GEDENKTAFEL-20261009.md).

Alle sieben vorhandenen App-Module privat gesichert. Unveröffentlichter Kandidat mit alleiniger App-URL-Änderung wurde von Shopify wegen unvollständigem Theme-Bundle und fehlender WASM-Datei abgewiesen. **Keine Kandidatenversion und kein Release; alle sieben aktiven Module nachweislich unverändert.** Fünf eingebettete Theme-Dateien wiedergewonnen; externe Assets/Function-Build weiterhin unvollständig. Token funktioniert, keine erneute Hinterlegung anfordern. GitHub-Authentifizierung fehlt auch in Revision 78; kein Push behaupten.

**6 neue lokale Tests bestanden**, tatsächliche Produktzuordnung gelesen/abgeglichen, Syntax/Diff geprüft. Keine unveränderte Gesamtabnahme wiederholt. Händlerdatenbank enthält bisher nur Acryl-Master; Schiefer-Adapter mit Befestigungen/Bohrbildern und Designübernahme ist noch nötig. Nächster Anschluss: ursprüngliches Theme-/Function-Projekt über wieder autorisierten GitHub-Zugang beschaffen und passenden Produktadapter vorbereiten; danach reale Händler-/Kunden-/Bestellstrecke. Installierte Weblaufzeit und beide bestehenden Werkstätten unverändert, keine Bestellung ausgelöst.

## Historisch: Getrennter Händlerhost auf Plesk geprüft – 09.10.2026

`https://app-2027.gravuru-designwerkstatt.de/werkstatt/` ist mit gültigem TLS erreichbar. Separat angelegt (Site 20), Paketquelle `5884f3e5becbb3226691fd0dc98beb5d8440306e`, 369 Dateien geprüft, Node 24.21.0, vorhandenes privates Python/Cairo ohne Änderungen verwendet. Vorbereitung/Prüfung erfolgreich; APIs ohne Händleridentität 401, private Dateien 403/404, CSRF-Sperre wirksam. Synthetisches Profil über echten HTTPS-Aufruf gespeichert, nach beobachtetem Prozesswechsel exakt erhalten und unter derselben ID weiterbearbeitet. Ein App-Prozess beobachtet; zweiter Sperrzugriff abgewiesen. [Servernachweise](docs/dashboard-20261004/merchant-runtime-20261009/server-installation.json).

**Noch keine echte Shopify-Händleranmeldung und keine vollständige Live-Umschaltung.** Der direkte Browseraufruf zeigt erwartungsgemäß die fehlende Shopify-Anmeldung; App Bridge meldet ohne Shopify-Kontext ein fehlendes `shop`-Feld. Bestehende Werkstatt, Operator-Testinstanz, Shopify-App-Konfiguration und globale Servereinstellungen unverändert. Claude wurde nicht ausgeführt; das externe Quell-/Prüfpaket enthält die neuen Servernachweise. GitHub-Push am 09.10.2026 erneut versucht: Exit 128, keine HTTPS-Anmeldung verfügbar. Lokal gesichert; nicht als auf GitHub veröffentlicht melden. CLI-Import geprüft: `dashboard-extensions` unterstützt keine Theme-/Function-Quellen und löst diese Sicherungslücke nicht.

## Historisch: Getrennter Shopify-Händlerstart lokal geprüft – 09.10.2026

Auf `a46af00` fortgeführt: eigener Plesk-Händlerstart mit privater Konfiguration/Datenablage, echter JWT-Prüfung, Host-/HTTPS-/CSRF-Grenzen und exklusivem Prozess-Lock. Neustart erhält gespeicherte Arbeit und offene Sitzung; Schlüsselwechsel sperrt alte Sitzungen. **6 neue Prüfgruppen + 16 gezielte bestehende Prüfungen bestanden.** Browser: synthetisches Produkt anlegen/wiederöffnen, private Vorschau, Desktop/Mobil PASS; echte Shopify-Anmeldung und neuer HTTPS-Host damit noch nicht bestätigt. [Prüfbericht](docs/dashboard-20261004/SHOPIFY-HAENDLER-LAUFZEIT-20261009.md) · [getrennte Installation](ops/plesk/MERCHANT-README.md).

Nutzer wünscht Claude-Gegenprüfung. Hier kein Claude-Werkzeug/CLI vorhanden; [konkreter Prüfauftrag](docs/reviews/CLAUDE-AUFTRAG-20261009.md) und exportierbares Quellpaket vorbereitet. **Keine erfolgte Claude-Prüfung behaupten.** Nächster Schritt: getrennten Plesk-Bereich prüfen/installieren und reale Host-Abnahme; vorhandene Erweiterungen sichern, Checkout-Fehler und Bestellstrecke anschließen. Bisherige Live-/Operator-Instanz und App-Konfiguration unverändert. GitHub-Zugang bleibt ein eigener offener Anschluss.

## Historisch: Shopify-Token bestätigt und Rückkehrversion gesichert – 09.10.2026

Token durch Nutzer sicher auf Plesk hinterlegt; echter Konfigurations-/Versionsabruf **Exitcode 0**. Aktive Version **`variante-m-embedded-motifs-20260928`**, ID `gid://shopify/Version/1146632241153`, Originalkonfigurationen privat gesichert. CLI-Flagkonflikt und wechselnde TOML-Reihenfolge im Helfer behoben; **15 gezielte Tests** und erfolgreicher Serverlauf. [Nachweis und offene Anschlüsse](docs/dashboard-20261004/SHOPIFY-ZUGRIFF-BESTAETIGT-20261009.md).

Bestehende Preisfunktion `gravuru-personalization-price` mit `blockOnFailure: true` lesend bestätigt. Erweiterungsquellen fehlen in aktuellem Projekt und durchsuchter Serverablage; kein vollständiges Erweiterungs-Backup und kein Blind-Deployment. Nächster Schritt: vorhandene Erweiterungen erhalten, Checkout-Fehler klären und Händler-/Kunden-/Bestellanschluss umsetzen. Die Veröffentlichungsfreigabe gilt; kein erneuter Token-Auftrag nötig. Laufende App/Produktionsdaten unverändert, Paketbasis `583ad9a`. GitHub-Anmeldung fehlt weiterhin in Cloud-Revision 70; lokale Sicherung getrennt vom nicht erfolgten Push ausweisen.

## Historisch: Sicherungsabruf für Shopify vorbereitet – 09.10.2026

Nutzer bestätigt **„alles komplett live setzen“**; keine erneute allgemeine Freigabe anfragen. Neuer eigener Betriebshelfer auf Quellcommit `3996475c88cf5d27b8affbbeacbf723ec1ce70fe`: vorhandene Shopify-App-Konfiguration und aktive Rückkehrversion rein lesend und mit Konsistenzprüfung sichern. **13 neue lokale Tests bestanden**. Über Plesk privat installiert und SHA-256 bestätigt; Produkt-/Weblaufzeit und Paketquelle `583ad9a` unverändert.

**Konkreter Blocker heute:** vorbereitete App-Automation-Token-Datei vorhanden, privat, aber weiterhin leer. Echter Helferaufruf endet deshalb mit Exitcode 1 vor Shopify-Zugriff. Keine App-Konfiguration/Rückkehrversion abgerufen und kein Release erfolgt. Kontoinhaber zur sicheren Token-Hinterlegung in Plesk aufgefordert. [Nachweis und genauer nächster Schritt](docs/dashboard-20261004/SHOPIFY-RELEASE-VORBEREITUNG-20261009.md) · [Zugangsanleitung](ops/shopify/README.md).

Nach Hinterlegung tatsächliche Version/Konfiguration und vorhandene Erweiterungen sichern, anschließend den Händler-/Kunden-/Bestellanschluss umsetzen. Sichere Testbestellung, passende Preis-/Variantenbindung und weitere externe Abnahmen bleiben offen. GitHub-Authentifizierung in Laufzeitrevision 64 weiterhin fehlend: lokale Sicherung vorhanden, kein Push behaupten. Keine neuen Gesamtprüfungen, keine Produktionsdaten-Ersetzung und keine Veröffentlichung synthetischer Produkte.

## Historisch: Shopify-Veröffentlichung freigegeben, Kontozugang fehlt – 08.10.2026

Nutzerauftrag: **„dann setz es live“ → „alles bei shopify online“**. Die bestehende App **Gravuru Konfigurator** soll angeschlossen/veröffentlicht werden; keine neue App, keine automatische Veröffentlichung synthetischer Testprodukte. Die frühere allgemeine Veröffentlichungssperre ist damit für diesen Auftrag aufgehoben. Aktuelle Produkt-/Paketbasis `583ad9a`, lokale Dokumentationssicherung `d6af150` erhalten.

Shopify-Browserzugriff führt zur Kontenanmeldung; kein angemeldeter Shopify-/Dev-Dashboard-Zugang in dieser Sitzung. Der vorhandene App-Schlüssel ist für Admin-Daten nutzbar, ersetzt aber keinen CLI-Veröffentlichungszugang. Eine **leere private Token-Datei mit 0600** auf dem vorhandenen Plesk-Server vorbereitet. Der Kontoinhaber wurde um den einmaligen App-Automation-Token für **dieselbe App** gebeten; sichere Ablage/Bedienung: [konkrete Anleitung](ops/shopify/README.md). Shopify CLI 4.9.0 privat installiert; Version und beide benötigten Lese-Befehlshilfen auf dem Server mit Exitcode 0 geprüft. Keine Schlüssel im Chat. Kein Shopify-Release oder Live-App-Wechsel behauptet.

Nach Hinterlegung zuerst tatsächliche aktuelle App-Konfiguration, aktive Rückkehrversion und Erweiterungen sichern; erst daraus den gezielten Anschluss erstellen. Händler-/Kunden-/Bestellstrecke ist noch nicht vollständig produktiv angeschlossen; der vorhandene Webstart bleibt geschützter Operator-Test. Physische Druckabnahme, Drive/KI und sicherer Testzahlungsweg bleiben gesondert offen. GitHub-Anmeldung auch nach Cloud-Revision 45 weiter nicht verfügbar; kein erfolgreicher Push.

## Historisch: Lesende Shopify-Vorprüfung – 08.10.2026

Quellcommit **`583ad9a3aa68b8369f8cfa82b6fdd4f67971622b`**, auf `d8a0944` fortgeführt, Branch `feat/excel-profile-assignments-20261007`. Neuer eigener Client-Credentials-Anschluss mit Token-Erneuerung, festen lesenden Admin-Abfragen und revisionsbezogener Varianten-/Preisprüfung. Keine Webstart-/Shopify-App-Konfiguration verändert. **29 gezielte neue Tests bestanden**; keine unveränderte Gesamtabnahme wiederholt.

Auf [der getrennten HTTPS-Testinstanz](https://test-2027.gravuru-designwerkstatt.de/werkstatt/) installiert, 364 Paketdateien verifiziert. Der echte CLI-Aufruf bestätigt App/Shop und weist den unpassenden Lesekandidaten korrekt ab: **40,00 € statt 14,99 € und andere Optionen**, Exitcode 2; keine Zuordnung, Shopmutation oder Bestellung. [Prüfbericht](docs/dashboard-20261004/SHOPIFY-VORPRUEFUNG-20261008.md) · [aktuelles Installationspaket](deliverables/plesk-shopify-preflight-20261008/README.md).

**Nächster Anschluss:** bestätigten Shopify-Testweg und passende explizite Variante klären; vor Änderungen an laufender App konkrete Änderung/Rückweg freigeben lassen. GitHub-Anmeldung dieser Cloud-Sitzung fehlt: lokal committet und auf Testserver installiert, **noch nicht zu GitHub gepusht**; sichere Wiederverbindung angefragt. Danach normalen Push prüfen. Drive/KI-Autorisierung bzw. Kosten, Kundenkonto-/Bestellstrecke und physische Druckabnahme bleiben offen. Keine Live-Veröffentlichung.

## Historisch: Geschützte HTTPS-Testinstanz und echte Serverprüfung – 07.10.2026

**[Test-Dashboard öffnen](https://test-2027.gravuru-designwerkstatt.de/werkstatt/)** · [Zugang, Bedienung und vollständiger Prüfbericht](docs/dashboard-20261004/HTTPS-TESTABNAHME-20261007.md) · [Installationspaket 25,9 MiB](deliverables/plesk-private-test-accepted-20261007/README.md) · [Excel-Vorlagen und Server-Druckproben](deliverables/testabnahme-20261007/README.md).

Installierter Quellcommit **`e157a865327aea859d8e9e91cd6c04cd6a87c8ff`**, aktueller Aufgabenbranch `feat/excel-profile-assignments-20261007`. Neueste Produktbasis einschließlich ZIP-Import erhalten. Separate Site 19 auf vorhandenem Plesk/LiteSpeed, Node 24.21.0, privates Python 3.11.16/Cairo, getrennte SQLite-Ablage. `plesk:prepare` und `plesk:check` auf dem Server erfolgreich. TLS/Passwortschutz/private Dateisperren, Excel-/ZIP-/Ordnerimport, Korrektur ohne Duplikate, Ausführungsgruppe, Dashboard, bestehender Acryl-Konfigurator, freie Gestaltung und Entwürfe auf dem echten Testserver geprüft. Echter Neustart erhält Daten und offene Seitensitzung; 20 parallele Leseaufrufe erfolgreich, zweite Dateninstanz gesperrt.

Hostingfehler behoben: LiteSpeed-Listener, gemeinsame private Konfiguration und sichtbarer Python-Interpreter; fehlendes privates Entwurfstoken; beim Prozesswechsel ungültige CSRF-Sitzung. Zusätzlich Foto-Regler während Uploadvorschau zuverlässig gesperrt, damit schnelle Farbauswahl nicht verloren geht. Sieben gezielte lokale Laufzeitgruppen, drei passende HTTP-Prüfungen und zwei gezielte Browserprüfungen; keine unveränderte breite Gesamtabnahme wiederholt. Sechs **auf dem Server erzeugte** Roland-/Mimaki-PDFs technisch geprüft, keine physische Druckfreigabe.

**Neue Shopify-Evidenz:** Historischer App-Schlüssel heute sicher vorhanden; eigener Node-Prozess auf dem Server authentifiziert als bestehende App „Gravuru Konfigurator“, Token und lesende Admin GraphQL jeweils HTTP 200. Kein Connector-Ersatz, kein Schlüssel ausgegeben, keine Shopmutation. Paketstart bleibt `shopifyConnected: false`. `read_orders` fehlt; der Shop ist reguläres Shopify Plus, kein bestätigter Entwicklungs-/Testzahlungsweg. Testvariante, eingebettete Händler-/Kundenanmeldung, echte Bestellzuordnung und kaufgebundene Dateifreigabe bleiben offen. Kein Secret mehr als fehlend behaupten.

**Nächster notwendiger Anschluss:** bestätigten getrennten Shopify-Testshop/Testzahlungsweg klären, dann konkrete erforderliche App-Konfigurationsänderung mit Rückweg vorlegen. Nutzer dazu gefragt; ohne Antwort keine echte Bestellung. Drive-OAuth noch nicht eingerichtet, KI-Anbieter/Kostenrahmen offen; physische RIP-/ICC-/Material-/Geräteabnahme extern. Keine Live-Werkstatt, Produktionsdatenbank oder globale Servereinstellung verändert; keine Produktivumschaltung. Frühere Zugangssperren und Installationsstände unten sind historische Nachweise.

## Historisch: Getrennter Plesk-Testbereich eingerichtet, Installation läuft – 07.10.2026

Plesk-Browserzugang ist jetzt authentifiziert. Vorhandene Bereiche geprüft; neue separate Subdomain **test-2027.gravuru-designwerkstatt.de** (Site 19) angelegt, DNS und gültiges HTTPS bestätigt. Die bestehende Werkstatt und ihre Daten wurden nicht geändert. Tatsächlich aktiv: LiteSpeed 6.3.7, Plesk 18.0.81, Node 24.21.0, Python 3.12.14 und libcairo.

Zwei konkret vor Ort erkannte Hostingunterschiede behoben: LiteSpeed übernimmt nur den äußeren geschützten Listener; Plesk-npm-Skripte und App lesen eine getrennte Konfiguration aus einer privaten Datei (0700/0600, keine Geheimnisse im Git/ZIP). Quellcommit **47ffda076a870bf1085f16a3449dfc2cece7655c**, bisheriger Produktstand vollständig erhalten. [Aktuelles Installationspaket](deliverables/plesk-private-test-hosted-20261007/README.md), **25,9 MiB**, SHA-256 `b41590bb66e211594979e857bab843a1824f9941f6891973b1410612fe031785`.

**5 neue Node-Prüfungen und 5 gezielte Paketgruppen PASS**, einschließlich simulierter LiteSpeed-Übernahme, echter privater Konfigurationsdatei ohne App-Variablen, Imports, Zugriffsschutz und Neustart. Alle manifestierten Dateien des neuen Pakets auf dem Server unverändert bestätigt. Neue private Daten-/Python-Pfade angelegt; Installation läuft noch. Test-App bis erfolgreichem Vorabcheck deaktiviert; kein fertiger App-Link oder echte Server-Gesamtabnahme behauptet.

**Nächster konkreter Schritt:** `plesk:prepare` abschließen, `plesk:check`, nur Test-App starten und tatsächliches HTTPS-/Passwort-/Prozess-/Neustartverhalten abnehmen. Shopify-/Drive-/KI-Anschluss und physische Druckabnahme bleiben offen. Keine Produktionsumschaltung, keine globalen Serveränderungen, keine SSH/VPN/API-Schleife. Frühere Aussagen über fehlende Browseranmeldung sind überholt.

## Historisch: Plesk-Browserweg bestätigt, sichere Anmeldung fehlt – 07.10.2026

**Korrektur der bisherigen Zugangseinschätzung:** Chromium/Playwright in dieser Cloud kann die Plesk-Anmeldeseite tatsächlich bedienen. Auf `https://gravuru.highspeed.cloud:8443` über vorgesehenen Proxy mit gültiger TLS-Prüfung **HTTP 200**, Plesk Obsidian 18.0.81; der Nutzerlink ohne Port liefert 404. Keine Verbindung zur bereits angemeldeten Nutzersitzung. Keine Serveränderung.

**Nächster erforderlicher Schritt:** bestehende Plesk-Anmeldedaten ausschließlich sicher als angeforderte persönliche Laufzeitvariablen `GRAVURU_PLESK_USERNAME` und `GRAVURU_PLESK_PASSWORD` für `gravuru-2027` binden. Cloud-Revision 36 meldet keine Bindungen. Danach kann die vorhandene Browsersteuerung zuerst Testbereiche und Servervoraussetzungen prüfen und die bereits freigegebene separate Testinstanz einrichten. Kein erneutes Erfragen technischer Serverdaten beim Nutzer nötig, sobald Anmeldung verfügbar. [Prüfnachweis und sichere Einbindung](docs/dashboard-20261004/PLESK-BROWSERZUGANG-20261007.md).

Produktcode, Installationspaket und lokale Abnahmen bleiben unverändert; echte Server-/Shopify-/Maschinenabnahme weiterhin offen. SSH/VPN/API-Einrichtung bleibt zurückgestellt. Die folgenden älteren Hinweise auf fehlende Browsersteuerung sind damit ersetzt.

## Historisch: Aktualisiertes Installationspaket lokal abgenommen – 07.10.2026

Neuer Produkt-/Quellcommit **`2c46b7fc3b93a6d9f601a37b3c46ee881f38bec3`**, Branch `feat/excel-profile-assignments-20261007`, bereits auf GitHub gesichert. Enthält Stand a2af162, ZIP-Import und die neue Excel-/Formprofilbindung. [Aktuelles Installationspaket](deliverables/plesk-private-test-profiles-20261007/README.md): **25,9 MiB**, SHA-256 `9d08a8bba5a6ddb7de5ea6adeee523ab4778e296415ebb0b752e9bbea25ddca0`. [Excel-Vorlagen, sechs synthetische PDFs, Bedienung und Abnahmestand](deliverables/testabnahme-20261007/README.md).

Produktpaket: **50 gezielte Node-Prüfungen und 5 neue Browsergruppen bestanden**. Aktualisiertes ZIP zusätzlich tatsächlich entpackt: **5 lokale Paketprüfgruppen PASS**, darunter prepare/check/Cairo, Schutzgrenzen, SQLite und Neustart ohne Duplikate. Keine echte HTTPS-/Plesk-/Passenger-Abnahme; keine physische Maschinenfreigabe.

**Nächster zwingender Schritt:** manuelle Plesk-Bedienung unter Websites & Domains: zuerst vorhandenen geeigneten Testbereich und Servervoraussetzungen bestätigen, dann nur diesen Bereich nach `ops/plesk/README.md` einrichten. Kein angemeldeter Browserzugriff oder bestätigter Testlink in dieser Laufzeit. Danach sichere Testzugangsbindung und neue echte Serverabnahme. SSH/VPN/API-Einrichtung bleibt zurückgestellt. Drive noch nicht eingerichtet (Nutzer bestätigt); KI-Anbieter/Kostenrahmen unentschieden, keine kostenpflichtigen Aufträge. Reale Shopify-Anmeldung/Varianten-/Warenkorb-/Bestell-/Kundenkontostrecke offen; Änderungen an laufender App erst konkret mit Rückweg freigeben lassen. Keine Live-Veröffentlichung oder Serveränderung erfolgt.

## Historisch: Excel-Profilzuordnungen und lokale Testlieferung – 07.10.2026

Branch `feat/excel-profile-assignments-20261007`, Basis **`a2af162edd3a1dfa2106212c9f4b76c7ae351b70`** erhalten. ZIP-/Ordner-/Excel-Wiederaufnahme unverändert fortgeführt. Optionale Schrift-/Motiv- und feste Fertigungsprofilzuordnung im Serienimport; geänderte Auswahlrevisionen verlangen erneute Prüfung. Formprodukte mit ausdrücklicher Profilregel, serverseitig begrenzter Kundenauswahl und eingefrorener Auswahl je Produkt-/Entwurfsstand. Keine Migration.

**50 gezielte Node-Prüfungen (6 neu), 5 neue Browsergruppen PASS**, Desktop/390/768 ohne Überlauf oder JavaScript-Fehler. Zwei sichtbare Nachweise gesichtet. Sechs synthetische aktuelle Roland-/Mimaki-PDFs und beide Excel-Vorlagen bereit. [Umfang und Nachweise](docs/dashboard-20261004/EXCEL-PROFILE-20261007.md) · [Testlieferung und offene Anschlussbedingungen](deliverables/testabnahme-20261007/README.md).

**Nächster konkreter Schritt:** aktualisiertes privates Installationspaket aus diesem Quellstand erstellen und verifizieren; parallel auf notwendige Plesk-Bedienung warten. Kein Plesk-Testhost/HTTPS-Link bestätigt; keine Serverprüfung, reale Shopify-Testbestellung oder physische Druckabnahme behauptet. Einrichtung nur der getrennten Testinstanz ist jetzt freigegeben; SSH/VPN/Plesk-API bleiben zurückgestellt. Drive-Autorisierung und KI-Anbieter/Kostenrahmen angefragt. Keine Live-Veröffentlichung, keine Änderung der laufenden App oder Werkstatt.

## Historisch: Privates Plesk-Testpaket vorbereitet – 07.10.2026

Auf Wunsch des Nutzers jetzt Upload über den vorhandenen Plesk-Dateimanager vorbereiten; keine weitere SSH-/VPN-/Plesk-API-Einrichtung. Branch `feat/plesk-private-test-package-20261007`, unveränderte Produktbasis **`74a1e8b61b564b1fa9421b153d3d7da7c7999b0a`**, Paket-Laufzeitcommit **`ec4ecf105c94576008bf477080a6f3689da68f19`**. ZIP-Import, gemeinsame Quellordner und alle neueren Produktänderungen enthalten. [Testpaket mit SHA-256](deliverables/plesk-private-test-20261007/) · [Konkrete Plesk-Anleitung](ops/plesk/README.md).

Eigener HTTPS-Teststart mit separatem Testpasswort, exaktem Host-/Origin-/Proxy-Protokollschutz und vorhandener CSRF-Prüfung. Eigene gekennzeichnete Daten-/Python-Verzeichnisse; zweite App-Instanz vor Datenbanköffnung gesperrt. Shopify-Transport und echte Anmeldung bleiben ausgeschaltet. Ein entpacktes Paket mit fünf gezielten Prüfgruppen lokal bestanden: Schutzgrenzen, Python/Cairo, SVG-/Excel-/SQLite-Bedienung und Neustart ohne Duplikate. Desktop/390 ohne Überlauf oder JavaScript-Fehler. [Prüfbericht und Grenzen](docs/dashboard-20261004/PLESK-TESTPAKET-20261007.md).

**Nächster konkreter Schritt:** Person mit Plesk-Browserzugriff bestätigt für eine getrennte Test-Subdomain Node 24+, Python 3.11+/venv/pip/Cairo und einen einzelnen App-Prozess, richtet HTTPS sowie getrennte Pfade ein, lädt das Paket hoch und führt `plesk:prepare`, `plesk:check` und die neue Hosting-Abnahme aus. Plesk/Passenger, DNS/Zertifikat und Zielserverrechte hier nicht geprüft. Keine Serveränderung, neue Cloud-Umgebung, Live-Veröffentlichung oder Shopify-App-Änderung. SSH/VPN bleiben zurückgestellt; echte Shopify-Anbindung weiterhin offene Folgeaufgabe. Das unabhängige Excel-Profilpaket bleibt für die anschließende Produktentwicklung offen.

## Historisch: Gemeinsame Design-Quellordner in Excel umgesetzt – 07.10.2026

Branch `feat/design-source-settings-20261007`, bestätigte GitHub-Basis **`dfd8c0f59a04a205a23dfb0c86d7a9850ca868f9`** einschließlich ZIP-Import und ergänzender Übergabe. Offene Anforderung aus G27-07 geschlossen: gemeinsamen Quellordner einmal im optionalen Blatt **Einstellungen** hinterlegen; je Produkt-/Designzeile mit `design_folder` überschreiben. Exakte aufgelöste Pfade vor Übernahme sichtbar. Vorhandene Tabellen, private Originale und gespeicherte Prüfungen bleiben nutzbar; keine Migration. Vorlage, Prüfbericht, Korrekturdatei und private Wiederaufnahme ergänzt.

**13 gezielte Node-Tests bestanden (5 neu), neuer Browserablauf mit 5 Prüfgruppen PASS.** Default/Abweichung/Auswahlwurzel, echte ZIP-Zuordnung, Originalbytes/SHA, Wiederaufnahme ohne ZIP, Korrektur ohne Duplikate, unzulässige Einstellungen vor Upload, CSV und ausgelieferte Excel-Vorlage geprüft. Desktop/390/768 ohne Überlauf oder JavaScript-Fehler; zwei Screenshots gesichtet. Acht bestehende Tests ausschließlich wegen Änderungen am gemeinsamen Planer/Bericht ausgeführt. [Bedienung, Grenzen und Nachweise](docs/dashboard-20261004/DESIGN-QUELLORDNER-20261007.md).

Nächster unabhängiger Anschluss aus der Excel-Anforderung: ausdrückliche Schrift-/Motivprofilzuordnungen je Produktzeile an die vorhandene Profilauflösung anschließen (bisher nur Master-/Kategorieübernahme im Serienimport). Vor Umsetzung beide Produkttypen und Vererbungsregeln gezielt abgleichen, keine neuen Profile erfinden. Drive benötigt eigene App-Autorisierung, KI Provider-/Kostenfestlegung. Plesk pausiert; echte Shopify-Anbindung einschließlich HTTPS-Testbackend/Testbestellung ausdrücklich offen. Keine Live-Veröffentlichung, Hostingänderung oder Änderung der laufenden Werkstatt.

## Historisch: ZIP-Designquelle umgesetzt – 07.10.2026

Branch `feat/design-zip-import-20261007`, Produktbasis **`dd42faf55df44686d3b6185807c35497ceba8df0`** plus ergänzende Übergabe **`dc941043c7184dfe6775c3e995989a8c70b13fd6`**. Übergabe gelesen und erhalten, kein älterer Produktstand übernommen. ZIP bewusst auswählen, exakte Archivpfade in Excel zuordnen, nur referenzierte SVG/PDF-Dateien nach Prüfung hochladen. Vorhandene private Originalablage und Produktprüfung wiederverwendet. Begrenzte Entpackung, Größen-/CRC-/Headerprüfung; unsichere, doppelte oder kollidierende Referenzen und beschädigte Archive blockiert. Excel-Vorlage aktualisiert.

10 gezielte Node-Tests (7 neu) und neuer Browserablauf mit 5 Prüfgruppen bestanden. SVG, Unicode-Pfade, PDF-Seite 2, Originalbytes, Wiederaufnahme ohne ZIP, Korrektur und Wiederholung ohne Duplikate geprüft. Desktop/390/768 ohne Überlauf oder JavaScript-Fehler. [Bedienung, Formate, Grenzen und Nachweise](docs/dashboard-20261004/DESIGN-ZIPIMPORT-20261007.md).

Lokale Datei-/Ordner-/ZIP-Quellen fertig. Nächster offener Quellenanschluss: eigene autorisierte Google-Drive-Anbindung mit Datei-IDs und revisionsgebundener Originalkopie; Chat-Connector ersetzt sie nicht. KI benötigt Provider-/Kostenfestlegung. Plesk bleibt pausiert; echte Shopify-Anbindung samt HTTPS-Testbackend und Testbestellung ausdrücklich offen. Keine Live-Veröffentlichung oder Änderung der laufenden Werkstatt.

## Ergänzende Chat-Übergabe – 07.10.2026

[Gesammelte Entscheidungen, aktueller Einstieg und Dateiinventar](docs/dashboard-20261004/UEBERGABE-NEUER-CHAT-20261007.md). Produktbasis: `dd42faf55df44686d3b6185807c35497ceba8df0` (Ordnerimport fertig); nächstes Paket: ZIP-Designquelle. Plesk pausiert, echte Shopify-Anbindung offen. Diese Ergänzung ändert keine Produktfunktionen. Bei neuerem Arbeitsstand nur ergänzend lesen, nicht zurücksetzen.

## Historisch: Design-Ordner im Serienimport umgesetzt – 07.10.2026

Branch `feat/design-folder-import-20261007`, bestätigte GitHub-Basis **`72b70416ecf16040b19ab774b43f5f5a67d5680d`**. Nächstes offenes unabhängiges Funktionspaket aus G27-07: lokalen Design-Ordner bewusst auswählen und SVG/PDF über genaue relative Unterordnerpfade zuordnen. Gleichnamige Dateien bleiben getrennt; nur referenzierte Dateien werden beim Prüfen hochgeladen. Vorhandene Konvertierung, Produktprüfung und private Originalablage wiederverwendet; keine Migration. Excel-Vorlage/Generator ergänzt.

29 gezielte Node-Tests (5 neu) und neuer Browserablauf mit 5 Prüfgruppen bestanden. Originalbytes, feste Quellzuordnung, gesicherte Pfade, gezielte Korrektur, Wiederaufnahme und Konflikt bei späterer lokaler Änderung geprüft. Desktop/390/768 ohne Überlauf oder JavaScript-Fehler. [Bedienung, Grenzen und Nachweise](docs/dashboard-20261004/DESIGN-ORDNERIMPORT-20261007.md).

Nächstes unabhängiges Teilpaket: ZIP als bewusst ausgewählte Designquelle mit denselben Pfad-/Quellenregeln und begrenzter Entpackung. Plesk bleibt pausiert; echte Shopify-Anbindung samt HTTPS-Testbackend und Testbestellung ausdrücklich offen. Keine Live-Veröffentlichung oder Änderungen an der laufenden Werkstatt.

## Historisch: Test-Dateifreigabe und Widerruf sichtbar abgenommen – 07.10.2026

Branch `test/customer-file-grants-ui-20261007`, bestätigte GitHub-Basis **`cc2e7d8812a4c2036e3f381e918707660e77bc1e`** (Excel-Paket). Als nächstes unabhängiges Paket die bestehende Händlerbedienung der kaufgebundenen Test-Dateifreigaben im Browser geprüft: PDF-Standard und Wiederholschutz, ausdrückliches ZIP, fehlende Weißdatei, Widerruf/Neuöffnen, Positionswechsel mit verspäteter Antwort und Sperre nach synthetischer Erstattung. Richtiger Kunde erhält identische Dateibytes, fremdes Konto nicht; ursprüngliche Bestellung bleibt erhalten. Produktcode unverändert.

Fünf gezielte Ablaufgruppen PASS, Desktop/390/768 ohne Überlauf und JavaScript-Fehler, zwei Screenshots gesichtet. Ausschließlich synthetische Händler-/Kundentokens, Testbestellungen und Zugriffsprüfdateien; keine echte Shopify-Anmeldung oder neue Druckabnahme. [Prüfbericht und Grenzen](docs/dashboard-20261004/TEST-DATEIFREIGABE-ABNAHME-20261007.md).

Plesk-Einrichtung bleibt pausiert. Echte Shopify-Appanmeldung, geschütztes HTTPS-Testbackend, reale Testvariantenbindung und Testbestellung sind weiterhin offene Folgeaufgaben. Der nächste reale Anschluss benötigt diese Voraussetzungen; keine Live-Veröffentlichung und keine Änderungen an der laufenden Werkstatt.

## Historisch: Gespeicherte Excel-Serien und Ausführungsgruppen abgenommen – 07.10.2026

Branch `test/saved-excel-resume-20261007`, bestätigte Basis `79c570061141c8c432e90962c19ed8845cad62b5`. Beide Importarten im Browser mit echten Excel-Dateien geprüft: Speichern/Wiederöffnen, Teilübernahme, verlorene Serverantwort, Prozess-/SQLite-Neustart, gezielte Korrektur und Wiederholung ohne Duplikate. Designs, Varianten, Produktstände und erfolgreiche Geschwister unverändert erhalten. Revisionskonflikte ausdrücklich in Excel korrigiert; Entfernen einer Prüfung löscht keine Produkte/Gruppen.

Ein Bedienfehler in beiden Importoberflächen behoben: Nach fehlgeschlagenem Öffnen bleibt der alte Prüfplan jetzt gesperrt, bis erneut erfolgreich geprüft wurde; Eingaben bleiben erhalten. Zwei gezielte Browserläufe PASS, sieben Ablaufgruppen, Desktop/390/768, keine JavaScript-Fehler. Keine Wiederholung der allgemeinen Abnahmen oder Backend-Lastprüfungen. [Prüfbericht, Befehle und Screenshots](docs/dashboard-20261004/GESPEICHERTE-EXCEL-ABNAHME-20261007.md).

Plesk-Einrichtung auf Nutzerwunsch pausiert. Echte Shopify-Appanmeldung, HTTPS-Testbackend, Testvariantenbindung und Testbestellung bleiben offen. Keine Live-Veröffentlichung. Nächstes unabhängiges vereinbartes Paket: Händlerbedienung der kaufgebundenen Test-Dateifreigabe und Widerruf sichtbar mit synthetischer Anmeldung abnehmen; keine echte Kundenkontoanbindung behaupten.

## Historisch: Positionsbezogene Erstattungsanzeige umgesetzt – 07.10.2026

Fortsetzung ausschließlich in dieser Aufgabe auf `task/order-line-refunds-20261007`, Basis `c19cbd8606258860848608938965536286d90519`; übernommener Neuaufbau und Browserabnahme `0202493f715d53316eb893e94fb672c4ac8eeb04` bleiben erhalten. Das Testbestell-Dashboard zeigt jetzt gemeldete Erstattungsmengen, Warenwerte und Steueranteile je Position. Fehlende/ältere/widersprüchliche Angaben werden kenntlich gemacht; doppelte/verspätete Nachrichten summieren nichts zusätzlich. Kein berechneter Auszahlungserfolg. Ursprüngliche Bestell-/Produktionsstände unverändert; betroffene Kunden-Dateifreigaben bleiben gesperrt.

39 unterschiedliche gezielte Node-Prüfungen bestanden (12 neu), neue Browserprüfung Desktop/390/768 ohne JavaScript-Fehler; Fixture-Build 76 Ressourcen/1 Modell/461440 Editor-Bytes. Keine Wiederholung der allgemeinen Browserabnahme. [Änderungen, Befehle, Screenshots und Grenzen](docs/dashboard-20261004/POSITIONSERSTATTUNGEN-20261007.md).

Nutzerergänzung: Der Shopify-Connector konnte im alten Chat am 07.10. authentifiziert Shop-/Produkt-/Variantendaten lesen; keine Testvariante zugeordnet und nichts im Shop geändert. Dies ersetzt keine Anmeldung unseres App-Prozesses. Plesk/HTTPS-Testbackend und sichere Laufzeitbindung bleiben offen; nur abhängige Arbeit pausiert. Keine Live-Veröffentlichung. Nächster unabhängiger Schritt: gespeicherte Excel-Serien/Ausführungsgruppen mit gezielter Fehlerkorrektur sichtbar abnehmen.

## Historisch: Shopify-Anschluss vorbereitet, HTTPS-Testhost noch offen – 07.10.2026

Auf `task/shopify-test-preparation-20261007`, Basis `0202493f715d53316eb893e94fb672c4ac8eeb04`: private leere Testablage `/workspace/gravuru-private/shopify-admin-test-20261007` mit 0700 außerhalb von Git vorbereitet; Schreibprobe bestanden. Anschlusscheck mit diesem Pfad nennt nur noch App-Secret und HTTPS-Origin als fehlend. Keine Browser-/Fachtests wiederholt.

Vorhandene private Site `gravuru-design-test-mika.gravur4you-cy.chatgpt.site` per HTTPS erreichbar (anonym 401), dokumentiert jedoch statisch ohne Werkstatt-Backend. Nutzer bestätigt Plesk für die laufende Werkstatt und keine bestätigte Test-Subdomain. Kein authentifizierter Plesk-Zugang und kein Cloud-HTTPS-Preview-Werkzeug hier verfügbar. Live-Adresse/Hosting unverändert. Die wertfreie Anforderung des direkten App-Secrets konnte wegen `draft_not_editable` nicht gespeichert werden; alter Entwurf unverändert. [Vorbereitung, persönlicher Tresor und konkrete nächste Schritte](docs/dashboard-20261004/SHOPIFY-ANSCHLUSS-VORBEREITUNG-20261007.md). Nächster Schritt: vorhandene getrennte HTTPS-Möglichkeit in Plesk authentifiziert nur lesen und sichere direkte Secret-Bereitstellung der gewählten Testlaufzeit herstellen. Keine neue Umgebung und keine Veröffentlichung.

## Historisch: Übergabe übernommen, fünf Browserabläufe bestanden – 07.10.2026

Die vorhandene Zielinstanz hat den Remote-Stand `task/cloud-runtime-handoff-20261007` auf **`8b2d3885e684425d43ccada3045b65ffabfb7806`** übernommen und per Remote-Abgleich bestätigt. Alter Branch `work` unverändert erhalten, keine ungesicherten Änderungen vorhanden gewesen. Der Neuaufbau unter `app/` ist maßgeblich; nicht bei G27-01 anfangen.

Fortsetzung auf **`test/cloud-browser-acceptance-20261007`**: Loopback-Listener und Chromium funktionieren. Fünf aktuelle Browserabläufe bestanden: Versionsvergleich/Profil-Auswirkung/Zuordnungen mit Abbrechen und Speichern; Dashboard zum bestehenden Acryl-Konfigurator mit festem Revisionslink; Fotozuschnitt/Graustufen mit Originalerhalt; private Kundenentwürfe unter Ladefehlern; getrennte Mimaki-PDFs und Ebenenvorschau. Desktop/390/768 Pixel, Versionsdialog zusätzlich Touch-Emulation. Keine JavaScript-Fehler, Fixture-Builds 76 Ressourcen/1 Modell/461440 Editor-Bytes. Keine Produktcodeänderung. Neues Prüfskript, Berichte und fünf gesichtete Screenshots: [Cloud-Browser-Abnahme](docs/dashboard-20261004/CLOUD-BROWSER-ABNAHME-20261007.md).

Nur temporäre synthetische Daten, Loopback-/Host-/Origin-/CSRF-Schutz geprüft; keine gehostete Händleranmeldung. `shopify:check` meldet fehlende Felder `GRAVURU_SHOPIFY_CLIENT_SECRET`, `GRAVURU_SHOPIFY_APP_ORIGIN`, `GRAVURU_PRIVATE_DATA_DIR`. Kein geschützter Handy-Vorschau-Link verfügbar, keine Live-Veröffentlichung. Nächster Schritt: zusätzliche Nutzerübergabe und sichere bestehende App-/Testshop-Anbindung samt privater Ablage, danach reale authentifizierte Testbestellstrecke. Physischer Touch- und RIP-/Maschinen-/ICC-Nachweis bleiben offen. Historische Nachweise folgen.

## Historisch: Sicherung und Übergabe an vorhandene funktionierende Cloud-Aufgabe – 07.10.2026

Die zuvor nur lokal bestätigten Druckprüfungen sind jetzt auf GitHub gesichert: Branch `test/dashboard-print-acceptance-20261007`, Remote-Commit **`d1bc7ffbf61b708899fee1c9a74cc15c9fb6f746`**, Vergleich `identical`. Sein Git-Baum `3533dce4ab42e36a7e5df070d0c7e01ea333c798` stimmt exakt mit dem lokalen Prüfstand überein. Produktcode unverändert; beide Testpakete vom 06./07.10. erhalten.

Die vom Nutzer benannte vorhandene Zielaufgabe **„gravuru-2027 NEU“ (`01a115b2-0173-7419-9c03-1af745f5c07c`)** hat GitHub/Shopify per HTTPS erreicht. Dort liegt noch der alte Commit `3ff2c2f8e7cb2565f60bd016f73a99ff6520152b` auf `work`; die dortige Aussage „neue App noch nicht implementiert“ gilt nur für diesen alten Checkout. Nicht bei G27-01 neu anfangen. Sie nutzt dieselbe Umgebungskonfiguration, aber eine neuere Version und andere Instanz als dieser alte Chat mit Proxyfehler. Kein belegter Accountfehler. [Verbindliche Fortsetzung, Grenzen und einmaliger Übergabeauftrag](docs/dashboard-20261004/CLOUD-FORTSETZUNG-20261007.md). Übergabebranch `task/cloud-runtime-handoff-20261007`; die tatsächliche Fortsetzung im Zielchat ist noch nicht bestätigt. Kein verfügbares Werkzeug zum direkten Nachrichtensenden an den Zielchat. Nächster Schritt dort: aktuellen Übergabestand übernehmen und geschützte sichtbare Dashboard-/Konfigurator-Abnahme mit synthetischen Daten durchführen, soweit Werkzeuge verfügbar. Keine neue Umgebung oder Serverplanung.

Für diese Übergabe nur Dokumentdiffs, Archiv-/Secretmusterprüfung und Remote-Abgleich durchgeführt; keine neuen fachlichen Tests, keine Produkt- oder Liveänderungen. Die folgenden Ausführungsnachweise bleiben historisch erhalten.

## Nachweis: Dashboard bis Druckdatei in wiederaufgenommener Cloud geprüft – 07.10.2026

Branch **`test/dashboard-print-acceptance-20261007`**, Produktcode unverändert auf bestätigtem GitHub-Stand **`f28dfc032c6d374d7d0967fe8eb8f37895d2a8f2`**. Der wiederhergestellte Checkout enthielt bereits den lokalen Prüfcommit `b86e4994b9c650638b2c83dbdcfaa01d9473e62b` vom 06.10.; dessen Remote-Testbranch war nicht abrufbar (404). Seine Dateien bleiben erhalten und werden mit dieser Abnahme gesichert. Frühere Ergebnisse wurden nicht als neue Ausführung ausgegeben.

**Heute ausgeführt: drei zusammenhängende Abläufe bestanden, 0 Fehler/Skips.** PDF-Design auf freier Form mit Kundentext/Graustufen-Prüfbild; vollflächiger Druck mit 1 mm Farbüberdruck und Spiegelung; bestehender Acryl-Konfigurator mit Fotoersatz, Eiche, Wandhalterung und zwei Stück. Danach den Acryltest ergänzt und erneut bestanden: gebundenes Fertigungsprofil nach Sicherung, aber vor dem ersten Export auf 600 dpi/kein Weiß/Spiegelung geändert und archiviert. Die gesicherte Ausgabe behält 300 dpi, motivbezogenes Vektor-Weiß und ursprüngliche Spiegelung. Produkt-/Gestaltungsänderungen sowie Neustart verändern alte Pakete und PDFs nicht. Keine Produktcodekorrektur erforderlich.

Befehle: `GRAVURU_FLOW_OUTPUT_DIR=/workspace/artifacts/dashboard-print-acceptance-20261007 node --test --test-isolation=none app/workshop/dashboard-print-flow.test.mjs`; anschließend derselbe Befehl mit `--test-name-pattern='existing acrylic'` für den erweiterten Fall. `npm run build`: 76 Ressourcen, 1 Modell, 461440 Editor-Bytes. ZIP-Inhalt und alle PDF-SHA-256 erneut geprüft; `git diff --check` erfolgreich. Drei unterschiedliche Abläufe, nicht vier addierte Tests. HTTP-Handler im Prozess, temporäre private SQLite-Datenbanken, echte Konverter/Ausgabe-Warteschlange; keine Browserautomation.

[Neun aktuelle Test-PDFs als ZIP](docs/dashboard-20261004/dashboard-print-acceptance-20261007.zip) · [Aktueller Prüfbericht](docs/dashboard-20261004/dashboard-print-acceptance-20261007.json). 391713 Bytes, SHA-256 `1198f5039c949db12ea5192e2e1b2683ae991ebcedd902f5be028f86173e9dc3`. Ausschließlich synthetische Prüfgrafiken, keine Kundenfotos, Tokens oder Datenbanken. Je Testfall Roland kombiniert sowie Mimaki Farbe/Kontur und separates Vektor-Weiß/Kontur. Beide Mimaki-Konturen identisch; Weiß-PDF ohne Rasterbilder. Texte als Pfade, CMYK-Raster, Löcher/Ausschnitte frei. PDF-Vorschauen aller drei Roland-Ausgaben mit PyMuPDF gerendert und angesehen. Hintergrundweiß der Bildschirmdarstellung ist kein flächiger Weißdruck.

**Offen:** echte Dashboard-/Touch-Bedienung, Shopify-Testbestellung, gemessenes ICC-Profil und reale Corel-/RIP-/Maschinenabnahme. Keine Live-Veröffentlichung. Nächster externer Schritt: passendes PDF-Paar im RIP maßhaltig überlagern und Testdruck prüfen; ZIP-Bediennotiz beschreibt die erwarteten Konturen, Weißflächen und Spiegelung. Dies kann unabhängig vom Laptopzugang zur Cloud später erfolgen. Historische Zwischenstände folgen.

## Historisch: Durchgängige Dashboard-/Konfigurator-Druckprüfung – 06.10.2026

Branch **`test/dashboard-print-flow-20261006`**, bestätigter Produktcode-Stand **`f28dfc032c6d374d7d0967fe8eb8f37895d2a8f2`**. Drei neue zusammenhängende Integrationstests bestanden: (1) PDF-Design auf freier Form mit transparenten Bereichen, Kundentext und Graustufenfoto; (2) vollflächiger Farbdruck mit 1 mm Überdruck und horizontaler Spiegelung; (3) vorhandener Acryl-Konfigurator mit Fotoersatz, Eiche, Wandhalterung und zwei Stück. Keine Produktcodeänderung nötig. Neuer Test: `app/workshop/dashboard-print-flow.test.mjs`.

Die Tests benutzen die echten HTTP-Serverhandler im Prozess, echte PDF-/SVG-Konverter, private temporäre SQLite-Datenbanken, Fotoaufbereitung und Ausgabe-Warteschlange. Ohne Listening-Socket und ohne Browserbedienung. Produktanlage/Import, Revisionskonflikt, gesperrtes Feld/Designelement, fehlendes Pflichtfoto, privater Entwurfszugriff, Kundentext/Fotobeschnitt, Originaldatei-Hashes, idempotenter Prüfstand und Exportauftrag, CSRF beim Download sowie Neustart mit wartendem Auftrag geprüft. Produkt-/Kundenänderungen nach der Sicherung verändern weder das alte Paket noch die heruntergeladenen PDFs. Für das Acrylbeispiel 3097 Cent je Stück, 6194 Cent für zwei Stück und 7 mm Einsteckbereich bestätigt.

PDF-Prüfung mit PyMuPDF: Dokument ohne Reparatur lesbar, 300 dpi als gespeicherte Exportvorgabe, DeviceCMYK-Rasteranteile, Textpfade ohne eingebettete Schrift, Vektor-RDG_WHITE und CutContour. Mimaki erhält zwei getrennte PDFs mit identischen Schnittpfaden; die Weißdatei enthält keine Bilder. Leere Stellen/Loch/Ausschnitt bleiben transparent, die Weißmaske folgt der Gestaltung. 1 mm Farbüberdruck nur beim randfüllenden Beispiel, ohne Weißüberdruck. Spiegelung am asymmetrischen Loch geprüft. Graustufen anhand der CMYK-Schwarzseparation geprüft – neutrale RGB-Anzeigewerte wären wegen der PDF-Farbumrechnung kein geeigneter Nachweis.

**Ausgeführt:** `GRAVURU_FLOW_OUTPUT_DIR=/workspace/artifacts/dashboard-print-flow-20261006 node --test --test-isolation=none app/workshop/dashboard-print-flow.test.mjs` für die beiden Formabläufe und gezielt `--test-name-pattern='existing acrylic'` für den anschließend ergänzten Acrylablauf; zusammen **3 unterschiedliche Tests bestanden, 0 offene Fehler/Skips**. `npm run build`: **76 Ressourcen, 1 Modell, 461440 Editor-Bytes**. Syntax und `git diff --check` erfolgreich. Frühere Testzahlen sind keine neue Gesamtabnahme. Während der Testerstellung wurden die Python-String-Übergabe und die Graustufen-Prüfmethode korrigiert; kein daraus abgeleiteter Produktfehler.

[Neun synthetische Test-PDFs als ZIP](docs/dashboard-20261004/dashboard-print-flow-20261006.zip) · [Messwerte und SHA-256](docs/dashboard-20261004/dashboard-print-flow-20261006.json). ZIP enthält drei Testfälle mit jeweils Roland-PDF sowie Mimaki-Farb- und Weiß-PDF und eine Bediennotiz. Keine privaten Fotos, Secrets, Entwurfstokens oder Datenbanken. Die farbigen Prüfgrafiken sind bewusst synthetisch.

**Offen:** reale sichtbare Dashboard-/Touch-Abnahme, Shopify-Testbestellung und Maschinen-/RIP-Prüfung. Generisches DeviceCMYK ist kein gemessenes ICC-Profil; technische PDFs sind keine Fertigungsfreigabe. Kein Deployment. Nächster konkreter Abnahmeschritt: die passende PDF-Paarung aus dem ZIP in Corel/RIP öffnen und Deckung, Vektor-Weiß und Außenkontur prüfen; echte Druckprobe separat bestätigen. Historische Zwischenstände folgen.

## Historisch: Auswirkungen von Profilen und Zuordnungen vor dem Speichern – 06.10.2026

Branch **`task/profile-impact-preview-20261006`**, bestätigte GitHub-Basis **`3f0572542878971ee29945234a915f0ab2b929fe`**. Beim Bearbeiten eines vorhandenen Schrift-, Motiv-, Farb- oder Bestsellerprofils zeigt das Dashboard vor dem Speichern die wirksam zugeordneten Produkte/Master, ihren Stand und die Auswahl vorher/nachher. Standard, geordnete Kategorien, eigene Produktzuordnungen und bewusst leere Auswahlen verwenden dieselbe bestehende Auflösung. Auswirkungen einer Motiveinschränkung auf Bestseller werden mit angezeigt. Archive sind markiert; Formprodukte nutzen diese Auswahlprofile nicht. Dieselbe Vorschau ist auch beim Speichern von Standard-/Kategoriezuordnungen eingebaut. Sie unterscheidet geänderte Auswahl von geänderter Herkunft derselben Auswahl und blendet durch eigene Produktzuordnungen abgeschirmte Produkte aus. Zurück/Escape verwirft die Eingaben nicht.

Die Vorschau ist lesend. Das Dashboard sendet beim anschließenden Speichern einen Prüfwert; veränderte Produkte, Zuordnungen oder wirksame Profilstände machen ihn ungültig und verlangen eine erneute Vorschau. Bestehende API-Aufrufer ohne Prüfwert behalten ihre bisherige revisionengesicherte Speicherfunktion. Historische Produkt-/Profilstände und Bestellstände werden nicht geändert. Fehlende alte Katalogeinträge lassen sich im bearbeiteten Profil gezielt durch gültige Einträge ersetzen; normale Auflösung akzeptiert fehlende Ressourcen weiterhin nicht.

**37 unterschiedliche gezielte Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell (461440 Editor-Bytes).** Ausgeführt: `node --test --test-isolation=none app/workshop/profile-impact.test.mjs app/workshop/profile-library.test.mjs app/workshop/shopify-admin-host.test.mjs`, Syntaxprüfungen beider UI-Module, `npm run build` und `git diff --check`. Echte temporäre SQLite-Datenbanken und realer HTTP-Handler im Prozess, synthetische Daten. Abgedeckt sind zusätzlich Zuordnungswechsel, Vererben/Leer, zwischenzeitlich geänderte Zielprofile und unveränderte Einstellungsrevision vor Bestätigung. Kein neuer Browser-/Touch-Nachweis, keine reale Shopify-Verbindung und kein Deployment.

Neue Module: `app/workshop/profile-impact.mjs`, `profile-impact.test.mjs`, `ui/profile-impact-ui.mjs`; vorhandene Profilbibliothek, HTTP-Routen und Profilseite gezielt ergänzt. Keine Migration, privaten Daten oder zusätzlichen Zugänge nötig. Maximal 100 Produktzeilen und 20 Auswahleinträge je Liste werden sichtbar dargestellt; die Gesamtzahlen bleiben ausgewiesen, die Prüfung selbst berücksichtigt alle.

**Nächster Abnahmeschritt:** In einer ausführbaren geschützten Vorschau Profil ändern, Kategorie-/Standardzuordnung ändern, jeweils abbrechen und anschließend bewusst speichern; unveränderte Eingaben und korrekte betroffene Produktliste prüfen. Die bekannte Listener-/Browsergrenze ist nicht aufgehoben. Historische Zwischenstände folgen.

## Historisch: Gespeicherte Produktstände vergleichen – 06.10.2026

Branch **`task/product-revision-compare-20261006`**, bestätigte GitHub-Basis **`f1ef6976906d1eba8e40ffea3cb0a98d3b4fff20`**. In der Acryl-Werkstatt unter „Gespeicherte Stände“ und im Formprodukt beim Ansehen eines historischen Standes gibt es jetzt **„Mit aktuellem Stand vergleichen“**. Das Fenster zeigt die beiden exakten Revisionsnummern und Änderungen an Produktdaten, Texten, Preisen, Elementrechten sowie gesicherten Profil-/Fertigungszuordnungen. Kein automatisches Übernehmen oder Zurücksetzen; ungespeicherte Eingaben gehören ausdrücklich nicht zum Vergleich. Das bisherige Wechseln eines Formproduktstandes behält seine Rückfrage bei ungespeicherten Eingaben.

**41 gezielte Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell (461440 Editor-Bytes).** Reale temporäre SQLite-Datenbanken, synthetische Produktdaten und tatsächlicher HTTP-Handler im Prozess. Geprüft: stabile Element-IDs, hinzugefügt/entfernt/umgeordnet, unveränderte Historie, historische Profilbindung, ungültige/fehlende Revisionen, Zugriff ohne Händlersitzung, Fremd-Host/Origin, Auslieferung beider neuen UI-Dateien. Große Inhalte bleiben zusammengefasst, höchstens 200 Änderungen werden angezeigt; eine längere Liste wird ausdrücklich gekennzeichnet. Vergleich ausschließlich gespeicherter Produktstände einschließlich ihrer Metadaten, keine Prüfung externer Quelldateien, aktueller Shop-Daten oder Bestellungen.

Dateien: `app/workshop/product-revision-compare.mjs`, zugehöriger Test, gemeinsame UI `revision-compare-ui.mjs`/`revision-compare.css`, Einbindung in beide vorhandenen Editoren und geschützten HTTP-Handler. Keine Datenbankmigration und keine private Datei im Commit.

Ausgeführt:

```sh
node --test --test-isolation=none app/workshop/product-revision-compare.test.mjs app/workshop/repository.test.mjs app/workshop/shopify-admin-host.test.mjs
node --check app/workshop/ui/revision-compare-ui.mjs
node --check app/workshop/ui/app.mjs
node --check app/workshop/ui/form-product-ui.mjs
npm run build
git diff --check
```

**Grenze:** Keine neue Browser-/Touch-Abnahme, kein Deployment. Die bestehende veröffentlichte Testseite wird durch diesen GitHub-Stand nicht verändert. Nächster Abnahmeschritt: In einer ausführbaren geschützten Vorschau beide Vergleichseinstiege öffnen, Scrollen/Schließen/Fokus prüfen und bestätigen, dass ein ungespeicherter Acryl-Entwurf erhalten bleibt. Die bereits dokumentierte Laufzeitblockade für Listener/Browser ist durch diese Tests nicht aufgehoben. Historische Zwischenstände folgen.

## Historisch: Ausführungsgruppen aus Excel wiederaufnehmen – 06.10.2026

Branch **`task/variant-import-resume-20261006`**, bestätigte GitHub-Basis **`2828939c24f83115e56392f312e89b87fc7ebec8`**. Auch die vorhandene Ausführungsgruppen-Ansicht kann geprüfte Tabellen privat speichern, frisch wieder öffnen und gezielte Excel-Korrekturen samt allen zugehörigen Varianten herunterladen. Produktserien und Ausführungsgruppen bleiben getrennt; beide verwenden dieselbe geprüfte Speicherfunktion. Preise, Maße und Designs kommen weiterhin aus den unveränderten gespeicherten Produktständen.

**47 unterschiedliche gezielte Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Belegt sind 97 erhaltene Gruppen plus gezielte Korrektur von drei Gruppen, Wiederholung ohne Duplikate, Revisions-/Archivkonflikte, unveränderte Produktdaten und authentifizierte Downloads. [Umfang, Befehle und Grenzen](docs/dashboard-20261004/EXCEL-FEHLERKORREKTUR-20261006.md#ausfuehrungsgruppen-excel-und-wiederaufnahme).

Keine Veröffentlichung und keine reale Browserabnahme. Neue private Tabelle `variant_batch_jobs` in derselben `workshop.sqlite`; kein zusätzlicher Server und keine neue Datenbankdatei. Nächster Abnahmeschritt bleibt die sichtbare Bedienprüfung beider Importansichten in einer ausführbaren geschützten Vorschau. Die aktuelle Runtime besitzt weiterhin keine konfigurierten App-Secrets; das blockierte diese Codearbeit nicht. Historische Zwischenstände folgen.

## Historisch: Private Serienprüfung speichern und wiederaufnehmen – 06.10.2026

Branch **`task/batch-resume-20261006`**, GitHub-Basis **`336c9d74ff2d580e0670bce559eaa6449bcd4e0b`**. Zusätzlich zum Excel-Prüfbericht kann die bestehende Serienansicht geprüfte Importdaten privat speichern, auflisten, erneut öffnen und bewusst entfernen. Beim Öffnen wird ein neuer Prüfplan aus dem aktuellen Produktstand erstellt. Bereits ausgeführte Zeilen werden aus dem dauerhaften Importjournal erkannt, auch wenn die ursprüngliche Browserantwort verloren ging. Gespeicherte Designverknüpfungen funktionieren nach Neustart ohne erneutes Hochladen, solange dieselbe private Ablage vorhanden ist.

**34 unterschiedliche gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echte temporäre SQLite-Datenbanken und echte SVG-Quelle; Händler-/CSRF-/Origin-/Hostschutz im Prozess geprüft. [Bedienung, Speichermodell und Grenzen](docs/dashboard-20261004/EXCEL-FEHLERKORREKTUR-20261006.md#wiederaufnahme-im-dashboard-zweiter-teilschritt).

Kein Deployment und keine neue visuelle Browserabnahme. Speicherung erfolgt in einer zusätzlichen Tabelle der privaten `workshop.sqlite`, nicht in Git oder einem öffentlichen Snapshot. Dies macht die Cloud-VM nicht zu einer dauerhaften gemeinsamen Datenablage. Nächster Abnahmeschritt: gespeicherte Serie in der geschützten Dashboard-Vorschau öffnen und Bedienung prüfen, sobald die Vorschau ausführbar ist. Die Codearbeit benötigte keinen Laptop, keine neuen Secrets und keine weitere Nutzerentscheidung. Historische Zwischenstände folgen.

## Historisch: Excel-Prüfbericht und gezielte Fehlerkorrektur – 06.10.2026

Branch **`task/batch-correction-20261006`**, GitHub-Basis **`4976bee6fa1785d23f8476c4bcb2b30b3261c0a3`**. Die bestehende Serienansicht bietet jetzt einen vollständigen Excel-Prüfbericht und eine separate Korrekturdatei nur für fehlerhafte Produktzeilen einschließlich ihrer Designzuordnungen. Der Server prüft beim Download erneut; keine Produktänderung durch den Export. Masterstand, Importschlüssel und erwartete Revision bleiben erhalten. Private Designbilder dieser Ansicht verwenden nun ebenfalls den authentifizierten Medienabruf.

**15 unterschiedliche gezielte Prüfungen bestanden, 0 offene Fehler/Skips; Build 76 Ressourcen/1 Modell.** Belegt: 97 erfolgreiche Produkte bleiben nach Neustart erhalten, die drei korrigierten Zeilen ergänzen nur drei Produkte; wiederholter Import erzeugt keine Duplikate. [Bedienung, Prüfungen und Grenzen](docs/dashboard-20261004/EXCEL-FEHLERKORREKTUR-20261006.md).

Keine neue Nutzerentscheidung für dieses Paket nötig. Keine Veröffentlichung oder reale Browserabnahme; GitHub-Sicherung allein aktualisiert die gehostete Vorschau nicht. Die Datei ermöglicht Wiederaufnahme durch erneutes Auswählen, ist noch kein dauerhaft gespeicherter Importauftrag im Dashboard. Nächster eigenständig umsetzbarer Dashboard-Schritt: private Importauftrag-Historie mit erneutem Prüfplan nach Wiederaufnahme. Shopify-Zugänge und Druckabnahme bleiben separat offen. Historische Zwischenstände folgen.

## Historisch: Private Händlerbilder und ausführbarer Teststart – 06.10.2026

Branch **`task/merchant-runtime-20261006`**, GitHub-Basis **`2104489fb9dea722081e847be60728e9ade6128c`**. Private Produkt-/Design-/Konturvorschauen laden im Händlerdashboard jetzt mit frischem Shopify-Token; Bildwechsel, entfernte Elemente und abgebrochene Antworten sind abgesichert. Ursprüngliche SVG-Bytes bleiben erhalten. Separater `npm run shopify:test`-Einstieg mit vorgeschalteter `npm run shopify:check`-Prüfung; keine automatische Aktivierung im normalen Start.

**58 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Die öffentliche Client-ID der bestehenden App wurde direkt von Shopify gelesen und fest zugeordnet. [Teststart, genaue sichere Bereitstellung und Grenzen](docs/dashboard-20261004/SHOPIFY-TESTSTART-20261006.md). Eine leere private Testablage außerhalb des Projekt-Checkouts ist vorbereitet. Kein Restore und kein dauerhafter gemeinsamer Datenbestand.

**Aktueller externer Blocker für den echten Händlertest:** geschützter App-Client-Schlüssel und bestätigter HTTPS-Origin fehlen dieser Laufzeit. `shopify:check` meldet genau diese beiden Felder, wenn die vorbereitete Testablage angegeben wird. Für eine tatsächliche Produktanlage ist zusätzlich der Admin-API-Zugang nötig. Keine reale Einbettungsabnahme oder Veröffentlichung erfolgt. Kundenkonto/öffentliche Kundenstrecke, Produktmedien/-updates, Drive-/KI-Dienste und Produktionsabnahmen bleiben offen; das Gesamtprojekt ist noch nicht abgeschlossen. Historische Zwischenstände folgen.

## Historisch: Vorbereiteter Shopify-Händlerstart – 06.10.2026

Branch **`task/shopify-admin-bootstrap-20261006`**, GitHub-Basis **`a4ccb954cfe3d35bac680a6d3cca2d81adc5dabf`**. Der bestehende Server unterstützt jetzt ausdrücklich konfigurierten `embedded-test`-Betrieb für einen festen Shop/HTTPS-Origin mit App-Bridge-Start, passender Händler-Sitzungsprüfung und exakter CSP-Einbettungsfreigabe. Excel-/Dateilinks verwenden den authentifizierten Händler-Request statt unautorisierter Browsernavigation. Fehlende App Bridge führt nicht zu anonymen API-Anfragen. Der Standardscriptstart bleibt unverändert.

**75 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Synthetische HTTP-Aufrufe im Prozess, keine reale Shopify-Browserabnahme. [Anschlussfelder und verbleibende Voraussetzungen](docs/dashboard-20261004/SHOPIFY-HAENDLERSTART-20261006.md). Kein Deployment, keine neue App, keine Änderung der vorhandenen App-URL. Für die weitere Codearbeit ist gerade keine Nutzeraktion nötig; vor echter Integration müssen sichere Runtime-Zugänge und die Zieladresse bestätigt sein. Private Bild-/SVG-Unterressourcen, öffentliche Kundenrouten und Kundenkonto-Erweiterung sind noch nicht vollständig angeschlossen. Historische Stände folgen.

## Historisch: Shopify-Entwurfsübertragung mit Wiederholschutz – 06.10.2026

Branch **`task/shop-draft-transfer-20261006`**, GitHub-Basis **`88d1536dc1411ee4ea9f4633a9fe4b00089834cb`**. Die Produktvorbereitung kann bei ausdrücklich eingerichteter Händleranbindung Titel, SEO und alle gespeicherten Grundausführungen als Shopify-Entwurf übertragen. Private Übertragungsaufzeichnung verhindert doppelte Anlage; nach unklaren Antworten erfolgt nur ein lesender Abgleich. Geprüfte Shopify-Varianten werden den unveränderten lokalen Preisen/Optionen zugeordnet. Neue Schaltflächen in der bestehenden Produktvorbereitung; standardmäßig deaktiviert.

**58 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Beide GraphQL-Operationen gegen das Shopify-Schema validiert. Shopantworten waren synthetisch; **keine echte Produktanlage oder visuelle Abnahme**. [Vertrag, Nachweise und Grenzen](docs/dashboard-20261004/SHOP-ENTWURFSUEBERTRAGUNG-20261006.md).

Noch offen: sicherer Runtime-Appzugang und Host-/Kundenkontoanschluss, Produktbilder und Aktualisierung bestehender Shopprodukte, individuelle Aufpreise, Drive-/KI-Anwendungsdienste und reale Endabnahme. Die Domainfreigabe allein liefert keine App-Anmeldung. Keine neue Umgebung oder Serverplanung. Folgende Einträge sind historische Zwischenstände; insbesondere deren Aussage „Produktübertragung nicht implementiert“ ist für den oben beschriebenen Teilumfang überholt.

## Historisch: Anmeldung und kaufgebundene Testdateien integriert – 06.10.2026

Branch **`task/integrated-finish-20261006`**, GitHub-Basis **`548a69e0e4e1e1baeedf3ad03655bbff1b209852`**. Getrennte Shopify-Händler-/Kunden-Sitzungsprüfung, private Kundenbindung aus signierten Testzahlungen, widerrufbare Dateifreigabe mit festem SHA und Kundenkonto-Dateiliste/Download. Erstattung/Storno/fremdes Konto/geänderte Datei sperren den Zugriff. Der bestehende Bestellbildschirm enthält Ausgabe-/Formatwahl und Widerruf; Händler-Requests nutzen frische App-Bridge-Token, wenn der Host sie bereitstellt. Standardvorschau weiterhin ohne reale Shopify-Anbindung.

**82 gezielte Fälle bestanden; 1 bestehender Sockettest scheitert an `listen EPERM`; 0 Skips. Build: 76 Ressourcen/1 Modell.** Neue HTTP-Grenzen im Prozess mit synthetischen Nachrichten geprüft. **Keine visuelle Abnahme, echte Shopify-Zahlung oder Livefreigabe.** [Zusammenhängender Stand, Anschlussvertrag, genaue Prüfungen und offene Arbeiten](docs/dashboard-20261004/INTEGRIERTER-ABSCHLUSS-20261006.md).

**Gesamtprojekt noch nicht abgeschlossen:** sichere echte App-/Hostanbindung, Kundenkonto-Erweiterung und öffentliche Kundenrouten; tatsächliche Shopify-Produktübertragung, Drive-/KI-Dienste; vollständige Referenzserie und Maschinen-/ICC-Abnahme; dauerhafte private Betriebsablage. Das sind teils weitere Codearbeiten, teils externe Voraussetzungen. Nächster Integrationsschritt ist die bestehende App an den geprüften Testvertrag anzuschließen, sobald der sichere Runtime-Appzugang verfügbar ist. Keine neue Umgebung/Serverplanung. Nachfolgende Abschnitte sind historische Zwischenstände.

## Historisch: Ausdrücklich aktivierbarer HTTP-Warenkorbanschluss – 06.10.2026

Branch **`task/cart-http-gate-20261006`**, GitHub-Basis **`6b944c1bab2d6219e5a585c3d979bd5eec8bf1b7`**. Der private Form-/Acryl-Warenkorbanschluss ist jetzt über einen kontrollierten POST-Handler erreichbar, sofern eine ausdrückliche serverseitige Testanbindung eingerichtet wird. Die Standardvorschau bleibt deaktiviert. Host/Origin/CSRF, privater Entwurfszugang, unveränderliches Angebot, aktive Produktfreigabe und ein vertrauenswürdiger Käuferkontext werden geprüft. **41 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Prüfumfang und Konfigurationsvertrag](docs/dashboard-20261004/WARENKORB-ENTWURFSZUGRIFF-20261006.md).

Vorschauzugriff erneut geprüft: lokaler Listener weiterhin `EPERM`; aktuelle Laufzeit weiterhin eingeschränkte Paketmanager-Netzfreigaben, keine konfigurierten Laufzeit-Secrets/Identitäten. Keine neue Umgebung eingerichtet. HTTP-Handler einschließlich äußerem Host-/Origin-Schutz im Prozess mit synthetischen Shopantworten geprüft, keine echte Shopify-Anfrage. Noch offen: sichtbare Vorschauabnahme und sichere reale Testanbindung. Der Käuferkontext darf nicht durch frei übermittelte Browser-IP-Header ersetzt werden. Keine Liveänderungen, kein Merge. Historische Abschnitte folgen.

## Historisch: Private Acrylentwürfe am vorhandenen Sichern-Button – 06.10.2026

Branch **`task/acrylic-private-drafts-20261006`**, GitHub-Basis **`4fe1cf6b59f22ea25393b7b0d5d8860e74c2339c`**. Acryl hat jetzt eine private persistierte Entwurfszuordnung mit unveränderlichen Revisionen. Der bestehende Sichern-Button legt diesen Entwurf an und speichert spätere Änderungen als neue Revision. Originalfotos und bestehende Prüfarchive bleiben bytegleich erhalten. Derselbe Warenkorbanschluss prüft jetzt auch die Acryl-Zugriffsberechtigung und den aktuellen Prüfstand. **53 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Details und tatsächliche Prüfgrenzen](docs/dashboard-20261004/WARENKORB-ENTWURFSZUGRIFF-20261006.md).

Nicht veröffentlicht und noch nicht visuell im Browser abgenommen. Der neue HTTP-Handler wurde mit echten Requests als Streams, echter SQLite-Datenbank und echter Fotoprüfung geprüft, ohne Netzwerklistener. Zugriffstoken bleiben im Browser-Tab (sessionStorage), private Inhalte ausschließlich im privaten Paket; kein automatischer Zugriff von einem anderen Gerät/Konto. Maschinen-/Bestellblocker werden weiter beachtet. Nächster Schritt: sichtbare Prüfung dieses Sicherungsablaufs in der verfügbaren geschützten Vorschau und kontrollierter Anschluss des Warenkorbhandlers mit bestätigter Laufzeit-Appanbindung. Keine neue Umgebung oder Serverplanung. Nachfolgende Abschnitte sind historische Zwischenstände.

## Historisch: Privater Entwurfszugriff vor Warenkorbübergabe – 06.10.2026

Branch **`task/cart-draft-access-20261006`**, GitHub-Basis **`20f970dbda089f037ed8f35d38fbc69ad27da475`**. Der neue serverseitige Anschluss prüft den privaten Entwurfszugang, den aktuellen gespeicherten Prüfstand und das bestehende Angebot vor Versand und vor Rückgabe der Checkout-Adresse. Fremde, geänderte, abgelaufene oder bereits bestellte Angebote sind gesperrt. Preise/Varianten/Mengen kommen ausschließlich aus der gespeicherten Bindung. **40 gezielte Prüfungen bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Keine neue vollständige Testsuite, Browserabnahme oder echte Shopify-Bestellung. [Prüfumfang und Anschlussgrenzen](docs/dashboard-20261004/WARENKORB-ENTWURFSZUGRIFF-20261006.md).

Der Anschluss unterstützt zunächst gespeicherte Form-Kundenentwürfe mit privatem Zugriffstoken. Acryl-Prüfstände benötigen noch die entsprechende dauerhafte Entwurfszuordnung; kein Ersatz durch bloßes Wissen einer Prüfstand-ID. Noch kein öffentlicher HTTP-/UI-Anschluss und keine Shopify-Kundenkontoanmeldung. Nächster Schritt: diese Entwurfszuordnung für Acryl ergänzen, danach den kontrollierten HTTP-Anschluss mit bestehendem Host-/Origin-/CSRF-Schutz und bestätigtem Käuferkontext anbinden. Dafür müssen derzeit keine Passwörter geschickt werden. Nachfolgende Abschnitte dokumentieren historische Zwischenstände.

## Historisch: Privates Journal für Warenkorbübergaben – 06.10.2026

Branch **`task/cart-handoff-journal-20261006`**, Basis **`b8a82328e127901d95dbbc269a9f4c30ec7d2fb1`**. Neuer serverseitiger Wiederholschutz in derselben privaten Kundenentwurfs-Datenbank: bestätigtes Ergebnis wiederverwenden, parallele Zugriffe sperren, unklare/abgebrochene Vorgänge auch nach Neustart nicht erneut senden. Keine neue Kundenroute oder automatische Bestellfreigabe. **18 neue Prüfungen und 6 bestehende Bestellregressionen bestanden; Build 76 Ressourcen/1 Modell.** HTTP-Regressionen sind in dieser laufenden Sandbox durch `listen EPERM` blockiert; kein neuer vollständiger 355-Test-Nachweis. [Umfang und nächste Anbindung](docs/dashboard-20261004/WARENKORB-JOURNAL-20261006.md).

Shopify-App über verbundenen Connector lesend bestätigt: **Gravuru Konfigurator**, App-ID **423276544001**, Shop **gravuru-design.myshopify.com**. „Gravuru 2027 – Cloud – Mikail“ ist der Chatname. Die veröffentlichte neue Cloud-Konfiguration wurde vom Nutzer bestätigt; diese bisherige Aufgabe meldete bei der letzten Prüfung weiterhin Paketmanager-Freigaben. Browseranmeldung und Connector ersetzen keine Laufzeit-App-Authentifizierung. Nächster Schritt: authentifizierten Handler mit gespeichertem Angebot/Entwurfszugriff verbinden; echten Netzwerk-/Appzugriff in der aktualisierten Aufgabe prüfen. Keine Liveänderung, neue Umgebung, private Daten in Git oder Merge. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Gemeinsamer Abschlussabgleich und Storefront-Transport – 06.10.2026

Branch **`task/completion-pass-20261006`**, Basis **`4b296b28e2d2c7b6f76e82c98589188c40d2af30`**. Dashboard-/Kundenentwürfe gegen verlorene Eingaben und verspätete Antworten abgesichert, Fotoeditor erhält die verfügbare Originalauflösung des Zuschnitts, Excel verarbeitet gültige Zeilen trotz einzelner Datumsfehler. Neuer serverseitiger Storefront-Warenkorbtransport mit Preis-/Variantenprüfung, festen Zielen, Timeout und ohne automatische Wiederholung; noch ohne App-/UI-Anschluss. **355 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Vier echte synthetische Browserabläufe auf Desktop/Handy/Tablet bestanden. [Gesamtstand, Nachweise und genaue Grenzen](docs/dashboard-20261004/ABSCHLUSSABGLEICH-20261006.md).

**Gesamtprojekt noch nicht vollständig abgeschlossen.** Echte Händler-/Kundenanmeldung, authentifizierte Bestellannahme und kaufgebundene PDF-Downloads benötigen noch Implementierung und sichere App-/Betriebsanbindung. Ebenso offen: reale Shopify-Produktübertragung, Drive-/KI-Dienst, vollständige Originaldesignserie und Maschinen-/ICC-Abnahme. Historische Vorbereitungen sind keine echte Bestellung. Der bekannte Shopify-Link bezeichnet ein Schieferprodukt, keine App. **Nächster Anschluss: bestehende konkrete Shopify-Test-App per Name/Verwaltungslink identifizieren; keine Secretwerte im Chat.** Originalarchiv 13–18 auf GitHub bestätigt, Binärabruf hier blockiert; 1–12 darin nicht enthalten. Kein neuer Serverplan und keine pauschale erneute Uploadanforderung.

Keine Veröffentlichung, echte Shopbestellung, privaten Daten in Git oder Merge. Nachfolgende Abschnitte sind historische Nachweise; bei abweichenden offenen Punkten gilt dieser aktuelle Abgleich.

## Historisch: Verwendung von Fertigungsprofilen sichtbar – 06.10.2026

Branch `task/production-profile-usage-20261006`, Basis `8f2a0539923d5f2e9adb7914b095ce1464be382e`. **Fertigungsprofile → Verwendung in Produkten** zeigt aktuelle und intern aktivierte Produktstände samt gebundener Profilrevision, einschließlich archivierter Master. Neue Profilrevisionen ändern keine bestehenden Zuordnungen. Direkter Link zum aktuellen Acryl-/Formprodukteditor; historische Bestellungen/Prüfstände ausdrücklich außerhalb der Liste. **322 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf auf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/FERTIGUNGSPROFIL-VERWENDUNG-20261006.md).

Keine Veröffentlichung oder Maschinenfreigabe. Reale Corel-/Mimaki-Druckabnahme und bestätigte Fertigungsvorgaben bleiben offen; nächster externer Schritt ist das Ergebnis der bereitgestellten PDFs zur konkreten Datei zu dokumentieren. Tatsächliche Shop-/Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Vollständiger und filterbarer Prüfverlauf – 06.10.2026

Branch `task/output-check-history-20261006`, Basis `7ca26dfcbdecd4301c72b05004e0d7fb3cf434ca`. Unter **Ausgaben** ältere Prüfvermerke nachladen und nach PDF/Weiß-PDF sowie Import/Druckprobe filtern. Frühere 200-Einträge-Grenze aufgehoben; neue Einträge beim Blättern erzeugen keine Duplikate oder Lücken. Erfassungsformular bleibt erhalten, Ausgabewechsel setzt Kontext zurück. **321 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; neuer Browserablauf und bestehender Journalablauf auf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-PRUEFVERLAUF-20261006.md).

Keine Veröffentlichung oder reale Maschinenabnahme; PDFs und bestehende Einträge unverändert. Nächster externer Schritt: tatsächliches Corel-/Mimaki-Import-/Druckergebnis der bereitgestellten Dateien dokumentieren. Shop-Bestellstrecke, dauerhafte private Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Gesicherte Ausgabeeinstellungen vergleichen – 06.10.2026

Branch `task/output-specification-20261006`, Basis `962d10c4725a74e3725818731dcf9819375c813d`. Unter **Ausgaben** zeigt der neue Vergleich die angeforderten und im Erstellungsnachweis gespeicherten Einstellungen einschließlich Spiegelung, Weiß und effektivem Überdruck. Fester Profilstand und Abweichungen sichtbar; fehlende historische Angaben bleiben ausdrücklich unbekannt. PDF-Erzeugung und vorhandene Druckdateien unverändert. **319 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-EINSTELLUNGEN-20261006.md).

Keine Veröffentlichung oder Maschinenfreigabe. Nächste externe Abnahme: reales Corel-/Mimaki-Import-/Probedruckergebnis der bereitgestellten Dateien im Prüfjournal festhalten. Echte Test-App-/Betriebsanbindung und gemessenes ICC separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Alte fehlgeschlagene Ausgaben ohne Wiederholungsschleife – 06.10.2026

Branch `task/obsolete-output-recovery-20261006`, Basis `56a7467b4407455f2870066a3cd31916c08875bb`. Alte fehlgeschlagene Ausgabeversionen erhalten unter **Ausgaben** die Aktion **Mit aktueller Ausgabeversion neu anlegen**. Gesicherte Gestaltung und Einstellungen bleiben erhalten; alter Auftrag/Verlauf unverändert, Wiederholung ohne Duplikate, Bestellbezug erhalten. Neue PDF ausdrücklich erneut prüfen. **316 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/AUSGABE-NEUANLAGE-20261006.md).

Keine automatische Neuberechnung bestehender Dateien, keine Veröffentlichung oder Maschinenfreigabe. Aktuelle fehlgeschlagene Aufträge behalten ihren normalen Wiederholweg. Nächste externe Abnahme: reales Import-/Probedruckergebnis der bereitgestellten Dateien und bestätigte Fertigungsvorgaben dokumentieren. Test-App-/Betriebsanbindung separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Fertigungsprofil bei Bestellgestaltung → Produkt erhalten – 06.10.2026

Branch `task/order-product-profile-20261006`, Basis `928c071ec8a777e10494ba1bbe2d8698735629ea`. Neue Acrylproduktentwürfe aus gesicherten Bestellungen übernehmen jetzt den festen Fertigungsprofilstand, statt auf Standardwerte zurückzufallen. Referenzen und Hash geprüft; neuere Profile nicht automatisch übernommen. Private Kundenbilder, ursprüngliche Bestellung und Shopbindungen bleiben unverändert. **315 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; durchgehender synthetischer Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/BESTELLPRODUKT-PROFIL-20261006.md).

Keine Veröffentlichung, echte Zahlung oder Maschinenfreigabe. Bereits zuvor angelegte Produktentwürfe werden nicht nachträglich verändert. Nächste externe Abnahme: reales Import-/Probedruckergebnis und bestätigte Fertigungsvorgaben dokumentieren; echte Test-App-/Betriebsanbindung separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Gespeicherte Gravur-PDF direkt ansehen – 06.10.2026

Branch `task/engraving-pdf-preview-20261006`, Basis `d7bf81fed4bad7a381eb4a43e0bdc4ce545d0d78`. Unter **Ausgaben → Gravur-PDF ansehen** wird die tatsächliche gesicherte Raster-/Vektorgravur auf Weiß dargestellt, einschließlich PDF-Prüfsumme. Keine zusätzliche Spiegelung, Umfärbung oder Änderung der Datei; Schnittkontur bleibt separat. **314 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Gravur-Browserablauf und Druckvorschau-Regression Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/GRAVUR-PDF-VORSCHAU-20261006.md).

Synthetische technische Abnahme, keine reale Probegravur oder Veröffentlichung. Vorhandene Druck-/Weißvorschau erhalten. Nächster fachlicher Schritt: reale Import-/Maschinenprüfung der gesicherten Dateien dokumentieren; bestätigte Maschinen-/Materialprofile separat hinterlegen. Echte Shop-/Betriebsabnahme bleibt offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Feste Fertigungsprofile auch für native Acrylprodukte – 06.10.2026

Branch `task/acrylic-production-profiles-20261006`, Basis `ece60315a8b016c5f6b741bfd6a226508ea0b13e`. Unter **Fertigung** einen passenden Profilstand auswählen und mit dem Acrylprodukt speichern. Neue gesicherte Gestaltungen übernehmen diesen festen Stand samt Druck-/Gravurvorgaben; spätere Profiländerungen ersetzen ihn nicht automatisch. Alte Produktrevisionen und Ausgaben bleiben erhalten. **313 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansicht](docs/dashboard-20261004/ACRYL-FERTIGUNGSPROFILE-20261006.md).

Prüfung mit synthetischen Profilen/Daten, keine reale Maschinenfreigabe oder Veröffentlichung. Weiß-PDF vektoriell mit RDG_WHITE und CutContour bestätigt; bisherige private Corel-Dateien per SHA unverändert. Nächster fachlicher Schritt: reales Import-/Probedruckergebnis zu den bereitgestellten Dateien im Prüfprotokoll erfassen und bestätigte Fertigungsvorgaben hinterlegen. Echte Shop-/Betriebsabnahme separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Prüfvermerke zur konkreten Ausgabedatei – 06.10.2026

Branch `task/output-check-journal-20261006`, Basis `26907140e0de3486e8a7bf04368913d7d556b146`. Unter **Ausgaben** können Dateiimport und Probedruck/Probegravur getrennt zur konkreten PDF-SHA dokumentiert werden. Unveränderlicher Verlauf, Wiederholschutz und Korrekturen als neue Einträge; PDFs, Aufträge und Berechtigungen bleiben unverändert. **310 Tests bestanden, 0 Fehler/Skips; Build 76/1; tatsächlicher Browserablauf Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/AUSGABE-PRUEFVERMERKE-20261006.md).

Nur synthetische Prüfvermerke zur technischen Abnahme. Keine echte Maschinenprüfung behauptet, kein Deploy/Shopify-Schreibzugriff. Neue private Corel-Testdateien unverändert; deren Nutzerabnahme steht aus. Nächster fachlicher Anschluss: gespeicherte Fertigungsprofile auch dem nativen Acrylprodukt zuordnen (bisher nur Formprodukte); keine Ersatz-Druckparameter erfinden. Externe Betriebs-/Shop-Abnahme separat offen. Nachfolgende Nachweise sind historisch.

## Historisch: Bestellposition direkt mit ihren Ausgaben verbunden – 06.10.2026

Branch `task/order-output-complete-20261006`, Basis `b64494f3fec7e46af9f5e9f12473b2d066e86294` einschließlich Vektor-/Mimaki-Konturkorrektur. Testbestellung → gesicherte Gestaltung → Ausgabe → PDF/ZIP mit erhaltenem Bestellbezug. Dateien gehören zur festen Prüfstand-ID; andere Gestaltung desselben Produkts ausgeschlossen. Storno/Erstattung sichtbar, Originale und Berechtigungen unverändert. **307 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/BESTELLUNG-AUSGABEN-20261006.md).

Keine Veröffentlichung, echte Shopify-Anfrage oder private DB verwendet. Neue Corel-Testdateien als direkte Vektortexte und Mimaki-RDG_WHITE samt Kontur technisch geprüft; realer Import-/Drucktest steht aus. Nächste Betriebsabnahme: bestätigte Test-App-Verbindung und sicher erreichbares dauerhaftes Backend. Keine erneute Cloud-Migration oder allgemeine Serverplanung. Nachfolgende Nachweise sind historisch.

## Historisch: Vektor-Texte und Mimaki-Außenkontur – 06.10.2026

Branch `task/pdf-vector-contour-fix-20261006`, Basis `8745c9873942647796927d5680b9eb66ee14510e`. Texte als zusammengesetzte Vektorpfade ohne zusätzliche Text-Formhüllen; Mimaki-Weißdatei enthält nun auch die maßgleiche CutContour. Neue private PDF-1.3-Testdateien bereitgestellt, normale Backend-Rezepte v5/v3 korrigiert; ältere gespeicherte Ausgaben erhalten. **306 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet und MuPDF/Ghostscript bestanden.** [Dateinachweis und Grenzen](docs/dashboard-20261004/PDF-VEKTOREN-KONTUR-20261006.md).

Nutzer meldete Bitmap-Gruppen in Corel; die frühere PDF-Struktur enthielt Vektorpfade in Form-XObjects. Neue direkte Pfade technisch geprüft; tatsächlicher Corel-/Mimaki-Import bleibt ausstehend. Kein Deploy. Nächster unabhängiger Code-Schritt: erhaltene Bestell-/Ausgaben-Verknüpfung fertigstellen. Nachfolgende Nachweise sind historisch.

## Historisch: Farbe und Weiß aus der gespeicherten PDF prüfen – 06.10.2026

Branch `task/dashboard-plate-preview-20261006`, Basis `ff8b4c5bb6a6eefd5879281126553f56eb051c3a`. Unter **Ausgaben** lassen sich Farbe und Weiß getrennt auf transparentem Karohintergrund ansehen. Quelle ist die tatsächlich gesicherte PDF, bei Mimaki die jeweilige separate Datei; Quellen-SHA sichtbar. Kein Weiß-Button bei Ausgabe ohne Weiß, kein altes Bild nach Auftragswechsel. PDFs/ZIPs bleiben unverändert. **304 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Handy/Tablet/Desktop bestanden.** [Nachweis und sichtbare Ansichten](docs/dashboard-20261004/DASHBOARD-DRUCKEBENEN-20261006.md).

In der vorhandenen Cloud implementiert und geprüft, nicht veröffentlicht. Keine Maschinen-/ICC-Freigabe oder echte Shop-Verbindung daraus ableiten. Nächster Schritt: Mimaki-Importergebnis des Nutzers übernehmen und bei Bedarf mit der gespeicherten Druckebene vergleichen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Mimaki-Trennung im Dashboard – 06.10.2026

Branch `task/dashboard-print-separations-20261006`, Basis `6ca4df1c7dd82a669eb72eca0348d72b9f35d3b1`. Neue Ausgabeaufträge liefern Mimaki-Farbe ohne RDG_WHITE und reine RDG_WHITE-Vektoren getrennt, beide einzeln im Prüfstand/unter „Ausgaben“ und im ZIP. Texte je Eingabe gruppiert; alte gespeicherte Dateien bleiben unverändert. **301 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet sowie MuPDF/Ghostscript bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/DASHBOARD-DRUCKTRENNUNG-20261006.md).

In der vorhandenen Cloud umgesetzt und geprüft, kein Deploy oder Shop-Schreibzugriff. Nutzerfreigabe betrifft weiterhin die konkrete frühere Roland-PDF-1.3-Probe; der reguläre Renderer erhält PDF-1.7-Transparenzen. Nächster Schritt: Mimaki-/Corel-Test der bereitgestellten Dateien übernehmen; automatische Ausgabe bei Bedarf im selben Importer vergleichen. Echte Maschinen-/ICC-Abnahme, Backend-Hosting und Shop-Verbindung bleiben separat offen. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Roland bestätigt, Mimaki getrennt – 06.10.2026

Branch `task/print-separations-20261006`, Basis `9a05d1b0d4641ae2a395493ae7a87cc5190964f5`. Nutzer bestätigt die korrigierte PDF als für Roland gut. Vier Texteingaben in einer neuen Kopie zu je einem Vektorobjekt zusammengefasst; Mimaki erhält zwei separate Dateien: nur RDG_WHITE-Vektoren sowie CMYK-Farbe ohne RDG_WHITE. Quelle erhalten, Formate und Platzierung identisch. **Alle drei Dateien mit MuPDF/Ghostscript geprüft; Farbansichten bei 150/300 dpi pixelidentisch.** [Nachweis und Ablauf](docs/dashboard-20261004/COREL-MIMAKI-TRENNDATEIEN-20261006.md).

Private PDFs außerhalb Git bereitgestellt. Separate reproduzierbare Nachverarbeitung, noch keine Änderung des Dashboard-Downloads. Nächster Schritt: Mimaki-/Corel-Gruppierungsabnahme, dann bestätigte Ausgabe in den normalen Download integrieren. App-Tests/Build nicht wiederholt; vorherige 300/0/0 und 76/1 bleiben historische Ergebnisse. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Gemeinsame Varianten-Zuordnung – 06.10.2026

Branch `task/shop-variant-mapping-20261006`, Basis `8b4bacf38e39a3a3b4285115c10c96252e1322a3`. In **Shop vorbereiten** lassen sich jetzt alle 28 Acryl-Ausführungen zusammen vorhandenen Varianten-IDs zuordnen. Serverpreise aus gespeichertem Produktstand, gemeinsames Speichern mit vollständigem Zurückrollen bei Fehler, erhaltene historische Bindungen und Anschluss an gesicherte Kundenentwürfe. **300 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Ansichten](docs/dashboard-20261004/SHOP-VARIANTENZUORDNUNG-20261006.md).

Nur lokale Vorbereitung mit synthetischen Daten: Variantenexistenz und Shoppreise noch nicht online bestätigt; nichts an Shopify gesendet oder veröffentlicht. Nächster Schritt: echte Varianten-/Preisprüfung nach bestätigter Test-App-Anbindung. Corel-Probe bleibt unabhängig beim Nutzer zur Abnahme. Nachfolgende Abschnitte sind historische Nachweise.

## Historisch: Spätere Bestellstatusmeldungen – 06.10.2026

Branch `task/order-status-20261006`, Basis `95788388cb853a7a76c3bb2ff723e334be25caa4`. Dashboard zeigt Teil-/Vollerstattung und Storno zusätzlich zum unveränderten ursprünglichen Bestellstand; verspätete Meldungen und Wiederholungen geprüft. **296 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Nachweis und Handyansicht](docs/dashboard-20261004/BESTELLSTATUS-20261006.md).

Nur signierte synthetische Testereignisse, keine Shop-Mutation oder Veröffentlichung. Positionsbezogene Rückzahlungen, echte Test-App-Zustellung und Kunden-Downloads bleiben offen. Neue kombinierte Corel-PDF-1.3-Probe besteht MuPDF und Ghostscript; Nutzerabnahme steht aus. Frühere EINE-DATEI-Kompatibilitätsprobe hatte einen reproduzierbaren Lesefehler und ist ersetzt. Die folgenden Abschnitte sind historische Nachweise.

## Historisch: Importfarbe und RDG_WHITE-Vektorregel – 06.10.2026

Branch `task/acrylic-import-tint-20261006`, Basis `e70aeb2b10bc7d441bebfa4509205a655a7fb283`. Eingefärbte SVG-/PDF-Importe jetzt auch in der nativen Ausgabe mit erhaltener Transparenz. **292 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser/Desktop/Handy/Tablet bestanden.** RDG_WHITE verbindlich immer Vektor und echte Sonderfarbe, zusätzlich gezielt geprüft. [Nachweis, Foto-Druckproben und offene Importdiagnose](docs/dashboard-20261004/ACRYL-IMPORTFARBE-WEISSVEKTOR-20261006.md).

Keine Veröffentlichung. Nutzer-Probedruck meldet ein Weißproblem; PDF-Struktur ist Vektor, konkreter Corel-/RIP-Import noch ungeklärt. Nächster Schritt: separate RDG_WHITE-Vektordatei im betroffenen Programm vergleichen. Folgende Abschnitte sind historische Paketnachweise.

## Historisch: Sichtprüfung und Excel direkt verfügbar – 06.10.2026

Branch `docs/dashboard-review-pack-20261006`, geprüfter Produktcode `f9f1fba6bb5560183c25ddc15b7d97f898eb5290`. Frische Aufnahmen der tatsächlichen Cloud-Oberfläche mit synthetischen Daten: Produktübersicht, Acryl-Editor, Excel, Prüfstand, Bildqualität und Gravur. [PDF, HTML, Excel und genaue Grenzen](docs/dashboard-20261004/DASHBOARD-SICHTPRUEFUNG-20261006.md).

Browseraufnahme am 06.10.2026 um 11:20 Uhr Europe/Berlin erfolgreich, keine JavaScript-Fehler; Build 76 Ressourcen/1 Modell. Die 289 Tests des vorherigen Pakets wurden nicht erneut ausgeführt. Produktcode unverändert. Kein Deploy: Der bestehende private Muster-Link ist weiterhin Site-Version 12 und enthält kein Werkstatt-Backend. Für interaktiven Dashboard-Zugriff fehlt in dieser Aufgabe eine authentifizierte Browser-/Portfreigabe der bestehenden Node-/SQLite-/Python-Laufzeit; nicht durch eine statische Nachbildung ersetzen. Shopify-/Maschinenabnahme bleiben separat offen. Folgende Abschnitte sind historische Paketnachweise.

## Historisch: Fotofenster-Abdeckung im Dashboard – 06.10.2026

Branch `task/acrylic-photo-coverage-20261006`, Basis `537730a2ac659f2d8cd244d5efa1037a0e07ef5c` (Remote bestätigt). Neue Acryl-Prüfstände zeigen pro Foto, ob seine Bildfläche die tatsächliche Maske vollständig abdeckt. Rechteck, Kreis, Ellipse und Bogen einschließlich Fotozoom, Versatz und Drehung geprüft. Bewusst freie Stellen bleiben erlaubt; keine Exportblockade, automatische Verschiebung oder neue Druck-Überlappungswarnung.

**289 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Beide Browserfälle (vollständig bedeckt/teilweise frei) mit PDF/ZIP auf Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-FOTOFENSTER-20261006.md).

Abdeckung betrifft die Bildfläche, nicht transparente Pixel innerhalb der Datei. Alte Prüfstände bleiben unverändert. Keine Veröffentlichung oder privaten Daten. Nächste externe Abnahme bleibt die bestätigte Shopify-Test-App-Anbindung und reale Maschinenprobe. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Bildauflösung im Acryl-Prüfstand – 06.10.2026

Branch `task/acrylic-photo-quality-20261006`, Basis `ef36ab0106be85baae2eef58997cb02e8792461b` (Remote bestätigt). Das Dashboard zeigt die Pixeldichte hochgeladener Bilder in ihrer gespeicherten Platzierung, einschließlich Plattengröße, Zoom und bearbeiteter Bildfassung. Unter 300 dpi gibt es einen konkreten Hinweis; höherer Export-dpi-Wert ersetzt keine fehlenden Bilddetails. Werte sind im Prüfstand/ZIP gesichert. Alte Stände und Originalbilder bleiben unverändert.

**286 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserprüfung Desktop/Handy/Tablet mit Anzeige, PDF/ZIP und Wiederholungsdownload bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-BILDAUFLOESUNG-20261006.md).

Prüfung der verfügbaren Pixel, keine automatische Schärfeprüfung; Beispielbilder/importierte Designquellen nicht bewertet. Kein Deploy oder privater Datenbestand. Reale Shopify-Test-App-Anbindung und Maschinenabnahme bleiben externe Voraussetzungen. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Acryl-Gravur aus dem gesicherten Prüfstand – 06.10.2026

Branch `task/acrylic-engraving-output-20261006`, Basis `f5ea76d2fa266d37dfe5d4d2569fd33dc92bc1cf` (Remote bestätigt). Das vorhandene Dashboard erzeugt jetzt auch aus nativen Acryl-Gravurständen eine Graustufen-PDF für Fotos oder eine Vektor-PDF für reine Pfade. Standard 300 dpi, ohne Druckweiß; Schnittkontur separat im ZIP. Helle Gravur-Vorschaufarben werden für Schrift und Bibliotheksmotive als schwarze Gravurflächen ausgegeben. Originalfotos und eingefrorene Gestaltung bleiben erhalten.

**283 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserprüfung mit PDF/ZIP, Fehlerfall Foto im Vektormodus und Wiederholungsdownload auf Desktop/Handy/Tablet bestanden. [Nachweis und Beispiel](docs/dashboard-20261004/ACRYL-GRAVUR-AUS-PRUEFSTAND-20261006.md).

Die frühere Sperre der nativen Acryl-Gravurausgabe ist damit aufgehoben. Technische Prüfung mit synthetischen Daten; keine Laserparameter-/Probegravurfreigabe, echte Shopify-Zahlung oder Veröffentlichung. Nächster externer Schritt bleibt die bestätigte Test-Store-/App-Anbindung; reale Maschinenabnahme separat. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Acryl-Bestellgestaltung als neuer Produktentwurf – 06.10.2026

Branch `task/acrylic-order-product-20261006`, Basis `5f97ce4a964b4e80907bd4a4608c53d4599fcdcf` (Remote bestätigt). Im Dashboard: Testbestellung → Gestaltung als neues Produkt → Vorschau → privater Acrylentwurf im vorhandenen Editor. Layout/Farben/Schriftgestaltung und Löschungen bleiben erhalten; standardmäßig ursprüngliche Beispieltexte, Kundentexte nur ausdrücklich. Kundenfotos/Logos und Uploaddaten werden entfernt. Bestellung, Ausgangsprodukt und Shopbindungen bleiben unverändert; Wiederholung erzeugt keinen Doppelentwurf.

**280 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Browserablauf einschließlich neuem Produkt Desktop/Handy/Tablet geprüft. [Nachweis, Bilder und Verlauf der vier Pakete](docs/dashboard-20261004/ACRYL-BESTELLUNG-NEUES-PRODUKT-20261006.md).

Damit technisch lokal geprüft: bestehender Acryl-Konfi → fester Prüfstand → CMYK-PDF/ZIP → lokale Variantenbindung → signierte synthetische Testbestellung → neuer privater Produktentwurf. **Keine echte Shopify-Zahlung/Kundenkontofreigabe, kein Live-Deploy und keine Maschinen-/ICC-Abnahme.** Nächste externe Voraussetzung: bestätigte Test-Store-/App-Anbindung mit passenden Acrylvarianten; bekannter Schieferartikel bleibt unberührt. Private Bestände wurden nicht verwendet. Folgende Abschnitte sind historische Paketnachweise.

## Historisch: Native Acryl-Bestellübergabe lokal geprüft – 06.10.2026

Branch `task/acrylic-order-handoff-20261006`, Basis `a6d4e18a50d0b5ee97dde1ee0231c81f59274e54`. Gesicherte Acryl-Ausführung und Menge jetzt im Dashboard an die vorgesehene Shop-Variante binden und Übergabe lokal prüfen. Optionen/Revisionspreis unveränderlich; gleich teure andere Ausführungen und falsche Mengen werden abgewiesen. Signierte synthetische Testbestellung übernimmt 36,97 € × 2 = 73,94 € samt festem Stand; Wiederholung bleibt ohne Doppelbestellung.

**278 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echte Dashboardbedienung Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-BESTELLUEBERGABE-20261006.md). Keine echte Shopify-Anfrage, Zahlung, Veröffentlichung oder Kundenfreigabe. Nur neue synthetische Datenbanken; private Bestände unverändert.

Nächster Code-Schritt: native Acrylgestaltung aus Testbestellung als neuen privaten Produktentwurf übernehmen, ohne Kundenfotos. Reale Store-/App-Anbindung und ICC-/Maschinenabnahme bleiben offen. Die folgenden Abschnitte sind historische Nachweise.

## Historisch: Gleiche Acrylpreise in Konfi und Commerce-Zuordnung – 06.10.2026

Branch `task/acrylic-commerce-prices-20261006`, Basis `91541d6d331cb976196942b7c3ea2feb75117a4c` (Remote bestätigt). Die Commerce-Prüfung verwendet jetzt die bestehende versionierte Kalkulation statt einer zweiten Summe der Optionspreise. Damit werden große Sockel korrekt mit +100 Cent berücksichtigt: große Platte/Eiche/Wandhalterung **36,97 €**. Veraltete Preisbindungen werden auch direkt vor der Auswahl abgewiesen; Zusatzmotive/-fotos bleiben ohne bestätigte Aufpreis-Anbindung gesperrt.

**275 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell**, Cloud-Check 06.10.2026, 10:17–10:18 Uhr Europe/Berlin. [Prüfbericht](docs/dashboard-20261004/acryl-commerce-preise-cloud-report.json). Fünf gezielte neue Tests prüfen alle 28 Kombinationen, Mengen, geänderte Preisrevisionen, generische Produkte und gesperrte Aufpreise. Keine Shop-Verbindung oder Mutation; kein neuer Kundendialog. Nächster Schritt: native Acryl-Prüfstände in die lokale Warenkorb-/Testbestellprüfung übernehmen. Die folgenden Abschnitte sind historische Nachweise.

## Historisch: Acryl-PDF aus dem unveränderlichen Prüfstand – 06.10.2026

Branch `task/acrylic-snapshot-output-20261006`, Basis `7b071fc64c6604affbdb5190bb1814d3ebf38427`. Dashboard-Prüfstand erzeugt native Acryl-PDF serverseitig aus gesicherten Textpfaden, Design- und Fotoquellen. Standard: PDF, 300 dpi, CMYK, RDG_WHITE nur unter Druck, keine Randzugabe; Mimaki/ZIP optional. Konturdownload, Vollfläche mit optionalem 1-mm-Rand und einmalige Spiegelung geprüft. Originalfoto und alte Ausgabe bleiben erhalten.

**270 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser Desktop/Handy/Tablet mit bearbeitetem Foto, beiden Exporten und Vergleich zur Konfi-Gestaltung bestanden; bisherige Formprodukt-/Testbestellstrecke erneut bestanden. [Nachweis und PDF-Vorschau](docs/dashboard-20261004/ACRYL-FERTIGUNG-AUS-PRUEFSTAND-20261006.md).

**Grenzen:** technische generische CMYK-Prüfung, noch keine ICC-/RIP-/Maschinenfreigabe oder echte Shopify-Bestellung. Native Acrylgravur und ausdrücklich nicht unterstützte Elementtypen werden abgewiesen. Keine Veröffentlichung; private Bestände bleiben außerhalb Git. Nächster Schritt: Preisparität der Acryl-Commerce-Zuordnung, danach native Bestellübergabe. Die folgenden Abschnitte sind historische Paketnachweise; die frühere Sperre der Acryl-Druck-PDF ist durch dieses Paket aufgehoben.

## Historisch: Acryl-Konfi → unveränderlicher Werkstattprüfstand – 06.10.2026

Branch `task/acrylic-review-handoff-20261006`, Basis `8cb741d67fb867faefc70f97117a5f741fc5b705` (Remote bestätigt). Im bestehenden Acryl-Konfi nach „Gestaltung fertig“ jetzt „Für die Werkstattprüfung sichern“: natives Design, unveränderte Originalbilder, bearbeitete Bildfassung, Produktrevision, Schrift-/Motivquellen, Ausführung, Geometrie und serverberechneter Preis. Dashboard zeigt die gesicherte Gestaltung und Ausführung; ZIP/Originalfotos herunterladbar. Spätere Bearbeitungen bleiben getrennt, Wiederholungen erzeugen keine Doppelstände. Keine Umwandlung in ein Formprodukt.

**269 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Echter Browser mit synthetischem Foto/Text und großer Platte/Eiche/Wandhalterung: 36,97 €, 7 mm Einstecktiefe, Desktop/Handy/Tablet bestanden. [Nachweis und Bilder](docs/dashboard-20261004/ACRYL-WERKSTATT-UEBERGABE-20261006.md).

**Grenzen:** Die gespeicherte PNG ist eine Browserreferenz, keine serverseitig reproduzierte Fertigungsdatei. Ausgabeaufträge und Shopify-Warenkorb sind für diese neue Acryl-Snapshotart ausdrücklich gesperrt; vorhandene Formprodukt-Ausgaben bleiben erhalten. Keine Veröffentlichung oder echte Bestellung. Private Daten liegen ausschließlich in der laufenden privaten Cloud-Aufgabe; GitHub sichert Code und synthetischen Nachweis, nicht eine dauerhafte gemeinsame Kundendatenbank. Nächster Code-Schritt: native Acryl-Fertigungsausgabe aus dem eingefrorenen Stand anbinden, ohne den älteren RGB-Commerce-Export als CMYK-Produktion auszugeben. Echte Shopify-App-Bindung und Maschinenabnahme separat offen. Folgende Abschnitte sind historische Nachweise.

## Historisch: Gemeinsamer Konfi-Einstieg bis PDF/ZIP geprüft – 06.10.2026

Branch `task/konfi-form-completion-20261006`, Basis `3ddb7c4d6ba26f686a74bec0f680cec6b1354f36`. Formprodukte und Ausführungsgruppen öffnen jetzt den gemeinsamen Konfigurator-Einstieg mit Vorschau, Bearbeitungsreitern und integrierter Ausführungswahl. Vorhandener Acryl-Editor erhalten und erneut geprüft. Durchgehend: Excel → Kunde → unveränderlicher Werkstattprüfstand → Roland-PDF/Mimaki-ZIP → synthetische Testbestellung → neuer Produktentwurf ohne Kundenfoto. **268 Tests bestanden, 0 Fehler/Skips; Build 76/1; Browser Desktop/Handy/Tablet bestanden.** [Gesamtnachweis, Bilder und genaue Grenzen](docs/dashboard-20261004/KONFI-GESAMTABLAUF-20261006.md).

Shopify-Link aus dem anderen Chat wiedergefunden und lesend bestätigt: `gravuru-design.myshopify.com`, Produkt `16138521641340` ist eine Schiefer-Grabtafel im Entwurf mit sieben Varianten. Nicht mit dem Acrylmuster gleichsetzen. Die Adresse fehlt nicht mehr. **Noch keine echte Shop-/Maschinenabnahme:** Testziel/App-Anbindung, Acryl-Warenkorbparität, Kundenkonto und reale Fertigungsprofile bleiben offen. Keine Shopify-Mutation, Veröffentlichung oder private Daten in Git. Nächster externer Schritt: konkretes Testziel und App-Anbindung freigeben; keine erneute Migrationsplanung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Bestehenden Konfi angebunden geprüft – 06.10.2026

Branch `task/existing-konfi-binding-20261006`, Basis `84f649eab669486428c9450483605bbfd459660b`. Acryl-Dashboard öffnet den bestehenden Kundenkonfigurator; beide Editor-Vorschaulinks jetzt auf die gespeicherte Revision festgelegt und bei ungespeicherten Änderungen verborgen. Echter Browserlauf mit Dashboardänderung, späterer Revision und Neuladen des alten Links bestanden; Desktop/Handy/Tablet, keine JavaScript-Fehler. Fixture-Build **76 Ressourcen/1 Modell**. Die **268 Tests** des vorigen Pakets sind ein historischer Nachweis und wurden hier nicht wiederholt. [Prüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-BESTEHENDER-KONFI.md).

**Nächster Schritt:** Freie Formprodukte in den vorhandenen Konfigurator einbinden; ihre bisherige separate Kunden-Testansicht ist dafür noch keine Abnahme. Danach durchgehender Kundenentwurf → Werkstatt → PDF/ZIP. Muster Acrylglasbild und separate Testseite unverändert; keine Veröffentlichung. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Excel bis Kundenkonfigurator zusammenhängend geprüft – 06.10.2026

Branch `task/excel-customer-flow-20261006`, Basis `e57a7defee4ff8e554f4f17c5beb0442120e224b`. Echte XLSX-/SVG-/PDF-Importe → drei Formprodukte → Design-Excel-Update → Gruppe aus Produktkatalog → alle drei Kundenausführungen, Texte speichern/neuladen und Designs wechseln. Spätere Preis-/Designänderung übernimmt ein alter Gruppenlink nicht still. Gefundene PDF-Rundungsabweichung bei maßgleicher Platzierung korrigiert, Originalmaß unverändert. **268 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; durchgehender Browserlauf Desktop/Handy/Tablet bestanden.** [Ergebnis, Bilder und wiederholbarer Ablauf](docs/dashboard-20261004/DASHBOARD-EXCEL-KUNDENABLAUF.md).

Nächster Schritt: Kundenentwurf → Werkstattprüfstand → PDF/ZIP-Ausgabe zusammenhängend abnehmen. Nur synthetische Prüfdaten; keine echte Bestellung oder Fertigungsfreigabe. Keine Veröffentlichung, kein Merge/PR; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Designzuordnungen aus Excel bearbeiten – 06.10.2026

Branch `task/design-excel-export-20261006`, Basis `a06bab0cb0f3ec1eb1ef220992f4d39d1e6aa2e8`. Produktserien exportiert vorhandene Formprodukte mit Designnamen, IDs und Standardauswahl. Ohne neue Grafik bleiben Original, Platzierung, Kundenfelder und Rechte erhalten. Unveränderte Formprodukte werden übersprungen; Konflikte und Wiederaufnahme bleiben geprüft. **267 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echter Download/Bearbeitung/Reimport, Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNZUORDNUNGEN-EXPORT.md).

Nächster Schritt: Tabellenablauf Produktanlage → Designzuordnung → Ausführungsgruppe → Kundenkonfigurator zusammenhängend prüfen. Keine privaten Bestände verwendet, keine Veröffentlichung, kein Merge/PR. Separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Ausführungen als ausgefüllte Excel bearbeiten – 06.10.2026

Branch `task/variant-excel-export-20261006`, Basis `61903f9ae655116f3c8b8e7ae774a7f19c0e96ea`. Ausführungen → Excel-Zuordnung exportiert ausgewählte Gruppen samt festen Produktständen und zusätzlicher Produktliste. Herunterladen → bearbeiten → prüfen → übernehmen im Browser geprüft; unveränderte Gruppen werden ohne neue Revision übersprungen. **263 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet geprüft.** [Bedienung, Installation und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXPORT.md).

Neue Python-Anforderung für dynamische XLSX: `python3 -m pip install --target .local-data/python -r app/workshop/requirements-excel.txt`. Nächster Schritt: Designzuordnungen aus bestehenden Formprodukten für den Tabellenabgleich bereitstellen, ohne private Bilddateien oder Kundeninhalte zu exportieren. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; bisherige Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Ausführungsgruppen per Excel zuordnen – 06.10.2026

Branch `task/variant-excel-20261006`, Basis `35e3cae6b34d6ef0daee099e0ada0f81bb63358d`. Neue XLSX-Vorlage mit **Gruppen**, **Varianten**, **Anleitung** und Oberfläche unter Ausführungen → Excel-Zuordnung. Vorschau, explizite Teilübernahme, gezielte Updates und Wiederaufnahme ohne doppelte Gruppen. Feste Produktrevisionen; ungenannte Ausführungen bleiben erhalten. **259 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echter Excel-Upload/Download und Browserprüfung Desktop/Handy/Tablet bestanden.** [Vorlage, Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN-EXCEL.md).

Nächster Schritt: vorhandene Gruppen und Produktreferenzen als befüllbare Excel-Datei exportieren, damit IDs/Revisionen nicht abgetippt werden müssen. Dieser Import verwendet bereits gespeicherte Produkte; keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Größen-/Materialausführungen verbinden – 06.10.2026

Branch `task/form-variants-20261006`, Basis `67205fa26b8b48fa02f5a0e3959a3f1dcddc91ed`. Backend verbindet vorbereitete freie Formprodukte zu einer gemeinsamen Kundenauswahl mit Standardausführung. Jede Größe/Materialkombination verweist ausdrücklich auf ihre Produktrevision mit passender Kontur, Bohrungen, Preis und Designs. Historie, Konflikte und Archivierung geprüft; alte Gruppenlinks übernehmen spätere Preise nicht still. **254 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browserprüfung Desktop/Handy/Tablet einschließlich Kundenwechsel und Konflikt.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-AUSFUEHRUNGEN.md).

Nächster Schritt: Excel-Kindtabelle an diese geprüfte Ausführungszuordnung anschließen (noch offen). Keine automatische Größen-/Kundenfeldumrechnung. Kein Publish/Deploy, Merge, PR oder Zugriff auf private Bestände; separate Acryl-Testseite unverändert. Nachfolgende Abschnitte dokumentieren historische Pakete.

## Historisch: Mehrere Designs je Formprodukt per Excel – 06.10.2026

Branch `task/batch-design-sheet-20261006`, Basis `d24d8297d8a751f7961d6b4c989b092783dca3a1`. Optionales Blatt **Designs** verbindet mehrere SVG/PDF-Seiten mit einer Produktzeile, ergänzt/ersetzt gezielte Designs und wählt ein Standarddesign. Bis 30 Designs pro Formprodukt; unberührte Kundenfelder/Rechte bleiben erhalten. Fehler blockieren das betroffene Produkt; Wiederholung und Updates bleiben revisionsgeschützt. **249 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Echte XLSX mit SVG und zwei PDF-Seiten, Desktop/Handy/Tablet und Kunden-Designwechsel geprüft.** [Bedienung, Aufnahmen und Nachweis](docs/dashboard-20261004/DASHBOARD-DESIGNTABELLE.md).

Nächster Schritt: separate Varianten-Kindtabelle mit expliziten Material-/Maßkombinationen und passender Designzuordnung. Keine automatische Variantenanlage durch diese Designzeilen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestände; bestehende separate Acryl-Testseite unverändert. Nachfolgende Abschnitte sind historische Paketnachweise.

## Historisch: Vorhandene Produkte per Excel/CSV aktualisieren – 06.10.2026

Branch `task/batch-update-20261006`, Basis `5dc75f9e84db992e139cfc17ce43527601e07ea3`. Serienimport unterstützt ausdrücklich `action=update` mit Produkt-ID und erwartetem Stand. Leere Felder behalten Bestand; eigene Geometrie/Designrechte bleiben erhalten, kein Master wird neu darüberkopiert. Neue Revision unter gleicher ID; Wiederholung und zwischenzeitliche Bearbeitung gegen Überschreiben geschützt. **245 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte 22-Spalten-XLSX in Desktop/Handy/Tablet geprüft.** [Bedienung und Nachweis](docs/dashboard-20261004/DASHBOARD-TABELLENAKTUALISIERUNG.md).

Nächster Schritt: offene Varianten-/Designzuordnung aus separaten Tabellen mit dem bestehenden Modell abgleichen. Kein Publish/Deploy, Merge oder Zugriff auf private Bestandsdaten. Folgende Abschnitte sind historische Paketnachweise.

## Historisch: Materialgerechte Gravur für Edelstahl, Holz und Leder – 06.10.2026

Branch `task/material-engraving-preview-20261006`, Basis `725a7c62b9be6536f9bdd2cd502547424228e867`. Vorhandene fünf Materialreferenzen erneut angesehen; Gravur wirkt auf Edelstahl dunkel/neutral, auf Eiche/Buche/Kirsche/Leder dunkelbraun, abgestuft nach Quellhelligkeit/Alpha. Druck bewahrt Originalfarben. Backend, Produktkarten, Kundenbearbeitung und unveränderliche Ausgaben geprüft. **241 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Vergleichsbild und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALGRAVUR.md).

Nächster Schritt: verbliebene Dashboard-Import-/Variantenabläufe mit dem dokumentierten Soll abgleichen. Schiefer-Rohlingreferenz, reale Maschinenprobe und echte Shopify-Teststrecke bleiben separat offen. Keine Veröffentlichung oder Änderung privater Bestände. Die folgenden Abschnitte sind historische Paketnachweise.

## Historisch: Helle Acrylgravur statt Druckfarben – 06.10.2026

Branch `task/acrylic-engraving-preview-20261006`, Basis `150aa8ea5344f8577686b1ffdff5d40b8e77851f`. Gemeinsame Materialvorschau zeigt bei Gravur helle Acrylwirkung entsprechend Quellhelligkeit/Alpha; Druck behält Originalfarben. Weiße und transparente Quellbereiche bleiben ohne Gravur, Fotoabstufungen erhalten. Backend-/Kundenansicht einschließlich direkter Texteingabe geprüft; Originale und technische Ausgabe unverändert. **239 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** [Vergleichsbilder, Tonwertprüfung und Grenzen](docs/dashboard-20261004/DASHBOARD-ACRYLGRAVUR-VORSCHAU.md).

Historischer nächster Schritt: weitere Materialgravuren; im Paket oben abgeglichen. Reale Laser-/RIP-Probe und echte Shopify-Teststrecke bleiben offen. Kein Publish/Deploy oder Merge; bisherige separate Testseite nicht aktualisiert. Nachfolgende Pakete sind historische Nachweise.

## Historisch: Matte UV-Aufdruckansicht und glänzender Hinterdruck – 06.10.2026

Branch `task/uv-print-surface-20261006`, Basis `0a0a7bf3d018ed00e687227724bf57810181298a`. Im Formprodukt-Backend ist die Druckansicht wählbar: vorne matt mit dezenten Druckpunkten oder hinter klarem Acryl mit Glasreflexion. Speichern/Neuladen und Kundenansicht geprüft. Vorhandene Produktstände bleiben erhalten; reine Vorschauwahl ohne Änderung von Druckparametern oder Spiegelung. **237 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Browser Desktop/Handy/Tablet.** [Bilder und Nachweis](docs/dashboard-20261004/DASHBOARD-UV-DRUCKANSICHT.md).

Die Fragen zu Matt/Hochglanz und „UV-Markern“ sind geklärt. Historischer nächster Schritt: Acrylgravurvorschau; im Paket vom 06.10.2026 oben umgesetzt. Keine Veröffentlichung, kein Eingriff in private Bestände. Frühere Paketabschnitte darunter sind historische Nachweise.

## Historisch: Formserien und vollflächiger Farbdruck – 05.10.2026

Branch `task/form-batch-20261005`, Basis `fdbb5be293a0517767d2f0f20a56b6b2b0281620`. Freie Formmaster jetzt im bestehenden Excel-/CSV-Serienimport: Material, Stärke, Verfahren, Szene, genaue Kontur und Kundenrechte vererben; Grundpreis und SVG/PDF-Design je Zeile zuordnen. Prüfen, partielle Anlage und Wiederaufnahme ohne Duplikate; direkte Formeditorlinks und mobile Ergebniskarten. **235 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Excel-/Browserprüfung Desktop/Handy/Tablet.** Vollflächige Farb-PDF mit Weiß, Bohrung und optionalem Außenrandüberdruck zusätzlich geprüft. [Ergebnis und farbiges Prüfbeispiel](docs/dashboard-20261004/DASHBOARD-FORMSERIEN.md).

Historischer nächster Schritt; am 06.10.2026 beantwortet und umgesetzt: matte Vorderdruckansicht mit feinen UV-Druckpunkten, glänzender Hinterdruck durch klares Acryl. Keine Veröffentlichung oder Maschinenfreigabe. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Acrylmaterialien und Szenen für Formprodukte – 05.10.2026

Branch `task/form-material-scenes-20261005`, Basis `a407c4114f3914d26f3a58baa8de4628a96161b0`. Klares/satiniertes/anthrazitfarbenes/schwarzes Acryl als dokumentierte 2D-Näherung; persistente Backend-Szenenauswahl und Kante aus tatsächlicher Produktstärke. Dieselbe Ansicht in Backend, Kunde, Vollbild, Produktkarte und Prüfstand. Produktübersicht lädt wieder (veraltetes Symbolziel korrigiert); Navigation ohne Seitenüberlauf. Geometrie/Bohrungen unverändert; Szene und Material bleiben aus der Druckdatei. **231 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Handy/Tablet und Transparenzpixel geprüft.** [Ergebnis, Materialherkunft, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-MATERIAL-SZENEN.md).

Keine Maschinen-/Livefreigabe; keine Veröffentlichung. Schiefer-Rohling und echte freigegebene Produktszenen für freie Formen bleiben offen. Nächster unabhängiger Schritt: weitere Material-/Form- und Stapelabläufe im Dashboard. Die folgenden Abschnitte dokumentieren frühere Arbeitspakete.

## Historisch: Eigene Texte und Motive in Formprodukten – 05.10.2026

Branch `task/form-added-elements-20261005`, Basis `5dd07c49da473c309281d6203e600ecca9577f4d` (Produktcode `0265ed5ad83c05fd3d7569ccb522b75e8b464e94`). Kunden ergänzen eigene Texte und Motive aus der vorhandenen Bibliothek; freie Platzsuche, Farben/Drehung, direkte Bearbeitung, Löschen/Rückgängig und revisionsgeschütztes Speichern. Backend-Freigaben je Design, unveränderliche Prüfstände und PDF-/Vorlagenübernahme angeschlossen. **229 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und Touch geprüft.** [Ergebnis, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-EIGENE-ELEMENTE.md).

Bestehender Chat laut Nutzer wieder erreichbar; Sicherung und ausführliche Übergabe bleiben erhalten. Keine neue Umgebung oder Veröffentlichung. Nächste unabhängige Arbeit: verbleibende Material-/Szenendarstellung. Echte Shopify-Teststrecke und Maschinenabnahme bleiben offen; angefragte Store-Adresse laut Nutzer bereits in anderem Chat, hier nicht lesbar. Folgende Abschnitte dokumentieren frühere Pakete.

## Historisch: Projektzusammenfassung und vorsorgliche Sicherung – 05.10.2026

Nach einer vom Nutzer gemeldeten Chat-/Linkstörung ist der bestehende Chat laut dessen Rückmeldung wieder da. Wir arbeiten hier weiter; kein neuer Chat oder neue Cloud-Umgebung angelegt. [Detaillierte Projektübergabe mit allen Entscheidungen, offenen Punkten und Startanleitung](docs/chat-recovery-20261005/MIKAIL-PROJEKTUEBERGABE.md), [Sicherungsübersicht](docs/chat-recovery-20261005/README-ZUERST.md). Dokumentbranch `docs/chat-recovery-mika-20261005`, Produktbasis `0265ed5ad83c05fd3d7569ccb522b75e8b464e94` auf `task/form-direct-edit-20261005`, per Git frisch bestätigt. Keine Produktänderung und kein neuer Testlauf; letzter dokumentierter Nachweis bleibt 226/0/0, Build 76/1. Private Datenbanken/Browserentwürfe sind nicht Bestandteil der Quellcodesicherung. Die angefragte Shopify-Adresse wurde laut Nutzer bereits in einem anderen Chat angegeben; der genaue Wert ist hier nicht verfügbar. Nachfolgend frühere Paketabschlüsse.

## Aktueller gesicherter Arbeitsstand – 05.10.2026

Branch `task/form-direct-edit-20261005`, GitHub-Basis `2c932f013332f827ec7471aab1b8bbb42186ae6a`. Direkte Text-/Fotobearbeitung für Formprodukte mit großer Gesamtvorschau, ganzen Schrift-mm, Farbpunkten, Auswahlgriffen, expliziter Löschfreigabe, Abbrechen und Touch. Edelstahl erhalten; Eiche/Buche/Kirsche/Leder als separat abgeleitete leere Materialvorschauen ergänzt. **Cloud-Check: 226 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell. Desktop/Mobil/Tablet und echte Touch-Eingaben geprüft.** [Bedienung, Bilder, Prüfungen und Restumfang](docs/dashboard-20261004/DASHBOARD-DIREKTBEARBEITUNG-ABSCHLUSS.md).

Der Branch enthält die bisherige Verwaltung, Ausgabe- und synthetische Testbestellstrecke einschließlich Produktentwurf aus Bestellgestaltung. **Keine Live-/Maschinenfreigabe:** Echter Shopify-Checkout/Kundenkonto benötigt bestätigten Entwicklungsstore und sichere App-Anbindung; danach reale RIP-/Maschinenprobe. Weitere Formprodukt-Motive, Materialansichten/Szenen und vollständige UV-Originale bleiben im verlinkten Restumfang ausdrücklich offen. Keine neue Serverplanung, keine Veröffentlichung, keine privaten Daten in Git. Nächste nötige Nutzerangabe für den echten Shoptest: ausschließlich dessen `…myshopify.com`-Adresse. Die folgenden Abschnitte sind historische Pakete.

## Historisch: Produktentwurf aus Bestellgestaltung – 05.10.2026

Branch `task/order-product-drafts-20261005`, GitHub-Basis `7786a685bb8d4e876805a5196f88280abdca601c`. In Testbestellungen lässt sich eine gesicherte Formprodukt-Gestaltung nach Vorschau als eigener Produktentwurf übernehmen: Layout, Farben, Schriftgrößen, Feldrechte und entfernte Felder bleiben erhalten. Beispieltexte wahlweise aus der Vorlage oder ausdrücklich aus der Gestaltung; Kundenfotos werden zu austauschbaren Fotobereichen. Originalprodukt und Bestellung bleiben unverändert; wiederholtes Anlegen erzeugt kein Duplikat. **222 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und Öffnen des Produkteditors.** [Nachweis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRODUKT-AUS-BESTELLUNG.md).

Geprüft mit synthetischen signierten Testpositionen, keine echte Shopify-Bestellung. Neuer Entwurf bleibt privat und ohne Shop-Verknüpfung. Weitere Materialdarstellung und Acryl-Parität sind unabhängig weiterzuführen; tatsächlicher Shopify-Test wartet auf die bestätigte Store-Anbindung. Maschinen: Roland mit VersaWorks bestätigt, genauer Mimaki-RIP weiterhin offen. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Warenkorb-Übergabe im Backend – 05.10.2026

Branch `task/checkout-handoff-20261005`, GitHub-Basis `0785d0fe7bfe2f6266996382b09220139ddfd642`. Gesicherte Formprodukt-Gestaltungen können jetzt ohne Shell einer Shop-Variante zugeordnet und für den Test-Warenkorb vorbereitet werden. Feste Revision, Preis und Menge; private Gestaltung bleibt außerhalb des Warenkorbs. **219 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browser Desktop/Mobil/Tablet einschließlich Neuladen und nachfolgender Produktänderung.** [Nachweis und Aufnahme](docs/dashboard-20261004/DASHBOARD-WARENKORB-UEBERGABE.md).

**Nutzerbestätigung:** Roland LEF-200 und MO-240 mit VersaWorks. Für Mimaki 2513 EX sagte der Nutzer „die von Mimaki“; genauer Name und Version bleiben offen. RasterLink ist nicht als bestätigt eingetragen. Auswahlhilfe ohne Änderung vorhandener Profilstände.

Die Übergabe wurde lokal vorbereitet und ihr GraphQL-Schema geprüft; kein Warenkorb an einen Shop gesendet. Für die echte Teststrecke fehlen bestätigter Entwicklungsstore und dessen Anbindung. Nächster externer Schritt: nur dessen `…myshopify.com`-Adresse nennen; keine Zugangsdaten im Chat. Kundenkonto-Kaufberechtigung und Maschinenabnahme bleiben offen. Frühere Abschnitte sind historische Pakete.

## Historisch: Signierte Testbestellungen – 05.10.2026

Branch `task/order-intake-20261005`, GitHub-Basis `a06d821bd5389016d92d0ff0087c7f066c4f864a`. Neue Backend-Ansicht für unveränderliche Testpositionen mit festem Formprodukt-, Preis- und Prüfstand. Empfang prüft die Signatur der Originalnachricht, Shop, Variante, Menge und serverseitigen Preis; mehrfache Zustellung dupliziert keine Position. **215 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserprüfung Desktop/Mobil/Tablet inklusive Produktänderung und PDF-Download.** [Nachweis und Grenzen](docs/dashboard-20261004/DASHBOARD-TESTBESTELLUNGEN.md).

**Nur synthetische, signierte Testnachrichten geprüft; keine echte Shopify-Testbestellung.** Empfang standardmäßig deaktiviert, Live-Bestellungen gesperrt. Keine Kundenkonto-Downloadberechtigung oder Maschinenfreigabe. Nächster Schritt: Entwicklungsstore zuordnen und den tatsächlichen Test-Checkout anbinden; weitere unabhängige Dashboard-Arbeiten bleiben möglich. Store-Adresse und RIP-Namen sind angefragt, keine Zugangsdaten. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Shop-Vorbereitung und Umfangsabgleich – 05.10.2026

Branch `task/dashboard-readiness-20261005`, GitHub-Basis `82db3b5798ae9b27443e041f94c4517fd3b2f0a7`. Werkstatt → Shop vorbereiten zeigt feste Produktstände, Designs, SEO und Ausführungen mit bestehenden Preisregeln (28 Acrylkombinationen). JSON-Übergabe ohne Übertragung an Shopify. Formprodukte: Seitentitel/Kurzbeschreibung speichern; historische Preise bleiben unverändert. **211 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet einschließlich nachfolgender SEO-Bedienprüfung.** [Ergebnis und ehrlicher Umfangsabgleich](docs/dashboard-20261004/DASHBOARD-SHOPVORBEREITUNG.md).

**Nächster Schritt:** authentifizierte Bestellübernahme und unveränderliche Positionen vorbereiten. Echte Shopify-Testbestellung, Kaufberechtigung im Kundenkonto und Maschinenabnahme sind noch offen. Weitere Materialableitungen/UV-Originale stehen separat im Abgleich; das Gesamtprojekt ist nicht als vollständig abgenommen bezeichnet. Kein externer Dashboard-Publish, kein Live-Systemzugriff. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Technische Gravurausgabe – 05.10.2026

Branch `task/form-engraving-20261005`, GitHub-Basis `6a23acc56a7f98f629107dd4f8769a901a2af164`. Gesicherte Formprodukte: Graustufenraster aus Originalfotos oder echte Vektorformen/Schriftpfade, ohne Druckweiß. Standard PDF/300 dpi, Kontur separat im optionalen ZIP; einmalige Spiegelung, Profilvorgaben und persistente Ausgabeaufträge. Rasterbilder werden im Vektormodus ausdrücklich abgelehnt. **208 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-/ZIP-Download.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-GRAVURPRUEFUNG.md).

**Nächster Schritt:** verbleibende Dashboard-, Kunden- und Bestellabläufe abgleichen und fortsetzen. Reale RIP-/ICC-/Material-/Maschinenabnahme fehlt; keine Produktionsfreigabe. Die drei genannten Druckmaschinen ersetzen kein Gravurmaschinenprofil. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Historisch: Persistente Ausgabeaufträge – 05.10.2026

Branch `task/export-queue-20261005`, GitHub-Basis `720d0d1243375109cc237dac4ef9d7d87e416f0a`. Werkstatt → Ausgaben: Status, Verlauf, Wiederholung nach Fehler und gesicherter PDF-/ZIP-Download. Druckaufträge laufen nach Verlassen der Browserseite weiter; dieselbe private Datenbank erhält sie über Prozessneustarts. Doppelte Anforderungen und verspätete alte Ergebnisse überschreiben keine Ausgabe. **204 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Cloud-Browserablauf Desktop/Mobil/Tablet einschließlich PDF und ZIP geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-AUSGABEAUFTRAEGE.md).

**Nächster Schritt:** Gravurausgabe ohne Druckweiß an dieselben unveränderlichen Prüfstände anbinden; danach weitere Dashboard-/Bestellabläufe. Maschinen bekannt: Roland LEF-200, Roland MO-240, Mimaki 2513 EX; RIP-/ICC-/Maschinenabnahme offen. Keine Bestellung, dauerhafte gemeinsame Ablage oder externe Dashboard-Veröffentlichung behauptet. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Versionierte Fertigungsprofile – 05.10.2026

Branch `task/production-profiles-20261005`, GitHub-Basis `62243a23ad8734a28c30f9f9552dfe0f1730b865`. Werkstatt → Fertigungsprofile: Druck-/Gravurvorgaben erstellen, ändern, historische Stände ansehen, kopieren und archivieren. Formprodukte binden eine feste Profilrevision passend zu Verfahren, Material und tatsächlicher Stärke. Prüfstände übernehmen Profilinhalt und Prüfsumme unveränderlich; die Druckausgabe startet mit diesen gesicherten Vorgaben. **201 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; vollständiger Cloud-Browserablauf Desktop/Mobil/Tablet mit PDF-Download geprüft.** [Ergebnis](docs/dashboard-20261004/DASHBOARD-FERTIGUNGSPROFILE.md).

**Bestätigte Maschinen (Nutzer, 05.10.):** Roland LEF-200, Roland MO-240, Mimaki 2513 EX. RIP-Software, konkrete Material-/ICC-Profile und reale Maschinenabnahme sind noch nicht benannt beziehungsweise bereitgestellt. Keine automatisch freigegebenen Maschinenprofile. **Nächster Schritt:** Persistente Ausgabeaufträge mit Status, Fehleranzeige und Wiederaufnahme; danach Gravurausgabe. Das Gesamtprojekt wird gemäß Nutzerauftrag weitergeführt. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Schriftpfade in der technischen Druck-PDF – 05.10.2026

Branch `task/form-vector-text-20261005`, GitHub-Basis `886a7573b91f7c25edbe491205435af8e2401416`. Explizite Textfelder gesicherter Formprodukte erscheinen jetzt als echte CMYK-Vektorpfade mit identischen Weißkonturen in der Prüf-PDF. Reihenfolge zu Fotos, Mehrzeiligkeit, vorhandene Schriftform, Kursivtransformation und einmalige Spiegelung bleiben erhalten. 300 dpi bleibt der Bildstandard; Schriftpfade sind davon unabhängig. Rezept v2 bewahrt zuvor gespeicherte v1-Dateien. **199 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tabletprüfung und PDF-/ZIP-Downloads.** [Ergebnis und Grenzen](docs/dashboard-20261004/DASHBOARD-SCHRIFTPFADE.md).

**Nächster Schritt:** Versioniertes Fertigungsprofilmodell an den festen Prüfstand anbinden, ohne reale ICC-/Maschinenparameter zu erfinden. Importierte Designquellen (einschließlich darin fest enthaltener Schrift) und Fotos sind weiterhin gerastert; Gravurausgabe und Maschinenfreigabe bleiben offen. Kein externer Dashboard-Publish, keine Änderung des gesicherten Acrylmusters. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Technische Druckprüfung für Formprodukte – 05.10.2026

Branch `task/form-print-proof-20261005`, GitHub-Basis `2b2d75a2ecf1061275feffa76c7da9f90a3d9ba0`. Gesicherte Gestaltungen erhalten im Backend eine technische PDF-Ausgabe: CMYK/300 dpi, Roland `RDG_WHITE` oder Mimaki-Vektorweiß, standardmäßig nur unter bedruckten Elementen, optionaler 1-mm-Überdruck bei Außenrandkontakt und einmalige Rückseitenspiegelung. Originalfotos, freie Außenkontur und Bohrungen bleiben maßgeblich. PDF oder ZIP mit Originalen; erzeugte Varianten bleiben unveränderlich gespeichert. **197 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserdownloads auf Desktop sowie Mobil-/Tabletprüfung.** [Ergebnis, Installation und Aufnahmen](docs/dashboard-20261004/DASHBOARD-DRUCKPRUEFUNG.md).

**Grenze:** technische Prüfung, keine Produktionsfreigabe. Farbgestaltung einschließlich Text ist in dieser PDF gerastert; Schriftpfade bleiben im gesicherten SVG. Weiß/Schnittkontur sind Vektoren. ICC-/Maschinenfreigabe und Gravurausgabe fehlen weiterhin. **Nächster Schritt:** Schrift-/Designvektoren in der Druckausgabe erhalten und das versionierte Fertigungsprofil daran anbinden. Keine erfundenen Maschinenparameter. Kein externer Dashboard-Publish; Acrylmuster erhalten. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Historisch: Unveränderliche Prüfstände im Backend – 05.10.2026

Branch `task/form-production-snapshots-20261005`, GitHub-Basis `280c773c72b55aefecdc0d5d6680fdd0cd07d663`. Gespeicherte Formprodukt-Kundenentwürfe können jetzt unveränderlich für die Werkstattprüfung gesichert werden. Neue Backend-Übersicht mit fester Gestaltung, Produkt-/Entwurfsrevision, Preis, Originalen, Prüfsummen und klaren Fertigungshindernissen. Downloads: reine 1:1-Kontur-PDF, vollständiges Prüfpaket und Originalfotos separat als ZIP. **194 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Desktop-/Mobil-/Tablet-Browserprüfung einschließlich Downloads.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-PRUEFSTAENDE.md).

**Nächster Schritt:** Produktionsprofilmodell und technische Druck-/Gravur-Ausgabe an den festen Prüfstand anbinden; vorhandene Acryl-Exportmodule verwenden und freie Konturen ausdrücklich unterstützen. Reale Maschinen-/ICC-Freigaben, Zahlung/Shopify-Bestellbindung und gehostete Kunden-/Operatoranmeldung bleiben offen. Prüfstände sind keine Bestellungen oder druckfertigen PDFs. Kein externer Dashboard-Publish; Acrylmuster unverändert. Nachfolgende Abschnitte sind historische Arbeitspakete.

## Historisch: Formprodukt-Kundenentwürfe und echte Übersichtsvorschauen – 05.10.2026

Branch `task/form-customer-editor-20261005`, GitHub-Basis `cb878ffaaf1f794f2aadb226b47dcc0f4f2091b6`. Gespeicherte Formprodukte öffnen jetzt einen eigenen privaten Kundenentwurf: Text/Schrift/ganze mm, Foto-Upload, Verschieben hinter festem Ausschnitt, Zoom/Drehung/Graustufen, Rückgängig und revisionsgeschütztes Speichern. Feldrechte werden serverseitig geprüft. Übersichtskarten zeigen das gespeicherte Design auf der vorhandenen Materialoberfläche. **193 Gesamttests bestanden; danach betroffene Prüfungen und echte Cloud-Browserabläufe erfolgreich. Build 76 Ressourcen/1 Modell.** [Umfang, Aufnahmen und Grenzen](docs/dashboard-20261004/DASHBOARD-FORMKUNDEN.md).

**Nächster Schritt:** Kundenentwurf mit unveränderlichem Bestell-/Produktionsstand verbinden; vorhandene Produktionsmodule wiederverwenden. Produktive Kundenanmeldung, Aufbewahrung und reale Maschinen-/Farbprofile bleiben offen. Die neue Ansicht läuft im geschützten Cloud-Entwicklungsserver; kein neuer extern erreichbarer Dashboard-Link und keine Shopveröffentlichung. Acrylmuster bleibt erhalten. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Historisch: Designs und Kundenfelder für Formprodukte – 05.10.2026

Branch `task/dashboard-form-designs-20261005`, GitHub-Basis `34bb395cfacba140a486bb987c8f90a98a90a736`. Bestehende SVG/PDF-Dateiablage für freie Formprodukte wiederverwendet: mehrere Designvorlagen, Originalmaß/proportionales Einpassen, Standarddesign, Textfelder mit vorhandenen Schriftpfaden/ganzen mm und explizite Fotobereiche. Material-/Designvorschau hält Originalkontur und Bohrungen frei. Gemeinsame Revisionen, Historie und Kopien bleiben erhalten. **191 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Cloud-Browserprüfung Desktop/Mobil/Tablet.** [Ergebnis und Aufnahmen](docs/dashboard-20261004/DASHBOARD-FORMDESIGNS.md).

**Nächster Schritt:** Formprodukt-Kundenansicht mit tatsächlichem Foto-Upload und serverseitiger Durchsetzung der gespeicherten Feldrechte anbinden. Fotobereiche sind bislang Backend-Platzhalter, keine fertige Bestell- oder Fertigungsstrecke. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Historisch: Edelstahl-Oberfläche im Formprodukt – 05.10.2026

Branch `task/dashboard-material-preview-20261005`, GitHub-Basis `3d0d60480c283c19945ea8c534693f35830b5b19`. Materialansicht mit vorhandener reiner Edelstahlstruktur, umschaltbar zur Konturprüfung; originale Außenform und transparente Ausschnitte bleiben erhalten. Historische Stände berücksichtigen ihre Materialauswahl. Andere Materialien bleiben ausdrücklich ohne zugeordnete leere Oberfläche. **190 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet in Cloud-Chromium geprüft.** [Ansicht und Nachweis](docs/dashboard-20261004/DASHBOARD-MATERIALANSICHT.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an Formprodukte binden; weitere vorhandene Materialreferenzen getrennt zu leeren Oberflächen aufbereiten und sichtbar prüfen. Keine neue Materialstärke/Herstellerfreigabe abgeleitet, keine Veröffentlichung. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Formprodukte, Materialzuordnung und 1:1-Kontur-PDF – 05.10.2026

Branch `task/dashboard-form-products-20261005`, GitHub-Basis `7943804ad30a4e94e023c880d24ef9cec5d899a2`. Aus Konturvorlagen entstehen eigene Produktentwürfe in derselben Produktverwaltung, mit Material-/Stärkenangaben, eigenem Preis, unveränderlichen Revisionen, Historie/Kopie/Archiv und passender Vektor-Kontur-PDF. Acrylprodukte bleiben erhalten. **188 Gesamttests bestanden; anschließend 4 gezielte Formprodukt-/PDF-Tests bestanden. Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet tatsächlich geprüft.** [Ergebnis, Ansicht und PDF-Beispiel](docs/dashboard-20261004/DASHBOARD-FORMPRODUKTE.md).

**Nächster Schritt:** Designvorlagen und Kundenfelder an diese Formprodukte binden, ohne die Kontur zu verändern oder Gestaltungen zu verzerren. Formprodukte sind noch keine freigegebenen Kunden-/Fertigungsprodukte; Materialszene, Produktionsprofil und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte sind historische Pakete.

## Historisch: Formkonturen importieren und prüfen – 05.10.2026

Branch `task/dashboard-contour-import-20261005`, Basis `138dc8bbc3dc7f742d40f86fa813fc706a41ec26` (M02-Varianten, über GitHub bestätigt). Werkstatt → Formkonturen: geschlossene SVG-/PDF-Außenform mit Innenausschnitten in tatsächlichen mm importieren, Vorschau und unverändertes Original sichern, gespeicherte Vorlagen erneut öffnen. Bestehende Designs/Produkte unverändert. **185 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet mit synthetischen Konturdateien geprüft.** [Ergebnis, Installationsbefehl und Bilder](docs/dashboard-20261004/DASHBOARD-KONTUREN.md).

**Nächster Schritt:** Konturvorlage in das versionierte Material-/Formproduktmodell einbinden und dieselbe Geometrie in 2D-Vorschau und Produktionskontur nutzen. Importbibliothek ist fertig; freie Produkt-/Fertigungsanbindung und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Historisch: M01 und M02-Variantensteuerung – 05.10.2026

Branch `task/dashboard-options-20261005`, Basis `092228adb0fbc6a14b0850cdeccee947c2c17a45` (M01-Karten/Verwaltungsaktionen, auf GitHub bestätigt). Zusätzlich in M02: verfügbare Größen, Sockel und Wandhalterungen samt Kunden-Startauswahl bearbeiten; gemeinsame Vorschau-/Preisauflösung und Revisionen. **177 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Backend → Speichern → echter Kundenkonfigurator in der bestehenden Cloud mit synthetischen Daten geprüft. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-VARIANTEN.md). Muster Acrylglasbild erhalten, kein Dashboard-Publish.

**Nächster Schritt:** Maßhaltiger SVG-/PDF-Konturimport im Material-/Formmodell, getrennt vom Designimport; Originalmaße und vorhandene Materialreferenzen erhalten. Shopify/Bestellstrecke und reale Fertigungsabnahme bleiben offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Historisch: M01-Karten und Verwaltungsaktionen – 05.10.2026

Branch `task/dashboard-m01-overview-20261005`, Basis `8227eb7db836de5e30779e42fdd7bd36cb1a68f4`. Große Produktkarten mit tatsächlichem Design und vollständiger Platte, Größen/Stand/Designanzahl, Kopieren und revisionsgeschützte Einzel-/Mehrfacharchivierung samt Wiederherstellung. M02 und Muster Acrylglasbild bleiben erhalten. **176 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Cloud-Browserprüfung Desktop/Mobil mit synthetischen Daten, einschließlich parallelem Speicherkonflikt. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-M01.md). Kein Dashboard-Publish.

**Nächster Schritt:** Verfügbare Acrylgrößen/Sockel und Startauswahl in M02 „Optionen & Preise“ über das bestehende Variantenmodell bearbeitbar machen. Shopify, weitere Materialadapter und echte Produktionsabnahme sind weiterhin offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Historisch: M02-Produktbearbeitung – 05.10.2026

Branch `task/dashboard-m02-editor-20261005`, Basis `b51f7fb6fa5ef4f9ed2b53832858f2035fc283e4`. Große Entwurfsvorschau zwischen Bereichen/Elementen und Eigenschaften; Text/Schrift/mm/Farbe, Kundenrechte, Beispielfotoersatz und Uploadhinweis angebunden. Vorhandene Speicher-/Import-/Verlauffunktionen weiterverwendet. **175 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Desktop/Mobil mit synthetischen Daten in der bestehenden Cloud geprüft. [Ergebnis, Grenzen und Bilder](docs/dashboard-20261004/DASHBOARD-M02.md). Keine Dashboard-Veröffentlichung; Muster Acrylglasbild unverändert.

**Nächster Schritt:** M01-Produktkarten entsprechend der ausgewählten fotografischen Übersicht korrigieren. Die älteren „fertig“-Aussagen sind keine vollständige Dashboard-Abnahme.

## 05.10.2026 – Dashboard M01 umgesetzt

Nutzerbestätigter Folgeauftrag „Dashboard“. Branch `task/dashboard-product-cards-20261005`, Basis `775557fef6933509d095b9e2756a5f799a7fd670`. Produktkarten mit revisionsbezogenen Vorschauen, Suche/Verfahrens-/Archivfilter, Masterübersicht und Kopie aus Master; vorhandener Editor und Schutz ungespeicherter Eingaben weiterverwendet. Muster Acrylglasbild unverändert separat erreichbar.

174 Tests/0 Fehler/0 Skips, danach 2 HTTP-Tests erfolgreich; Build 76 Ressourcen/1 Modell. Desktop/Mobil mit synthetischen Daten tatsächlich geprüft. [Bilder, Umfang und Grenzen](docs/dashboard-20261004/DASHBOARD-M01.md). Kein zusätzlicher gehosteter Dashboard-Link; aktuelle Bedienprüfung im Cloud-Entwicklungsserver. Nächster Schritt: M02-Produktbearbeitung.

## 05.10.2026 – Muster Acrylglasbild gesichert

Bestehende private Site in „Muster Acrylglasbild“ umbenannt; Direktzugriff im START_HERE und [Musterregister](docs/dashboard-20261004/MUSTER-ACRYLGLASBILD.md). Native Version 12 samt Archiv und Produktcommit `f4c9a2068f7d159def5f88f2a841bf01c1a59bd8` tatsächlich geprüft. Keine neuen Tests/Builds oder Änderungen am Konfigurator. Folgeauftrag „mit dem anderen“: Rückfrage Dashboard/Werkstatt oder weitere UV-Designs gestellt; noch keine Zuordnung behauptet.

## Historisch: neutrale Oberfläche, Motivfarben und gezieltes Löschen

Aufgabenbranch `task/unlock-design-elements-20261005`, Basis `3d09c9428f1637db6ece5052af8efd471f473397`. Weiß/Grau/Graphit im Konfigurator; Motiv direkt mit sechs runden Farbvorgaben, freier Farbe, Größenänderung und Drehung bearbeiten. Vorlagenelemente nach Backend-Freigabe bewusst zum Löschen entsperren, Original und Rückgängig erhalten. Weiße Seitenflächen schließen die Vollbildvorschau.

173 Quelltests bestanden, 0 Fehler/Skips; danach 21 gezielte Tests bestanden. Build 76 Ressourcen/1 Modell. Desktop-/Mobil-Bedienprüfung mit synthetischem Stand erfolgreich. Details und Grenzen: `docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md`. Nur private Testseite aktualisiert, keine private Datenbank oder Live-Shopänderung. Nächster Schritt: Nutzerprüfung der neuen Bedienung; Bestellung → neuer Produktentwurf bleibt separat offen.

## 05.10.2026 – Foto-/Textwerkzeuge und kompakte Motivwahl

Branch `task/full-preview-base-20261005`, Weiterführung nach Sockel-/Rahmenkorrektur `8f507ddd66aedf19cf8ff9466f2a6388e37a680c`. Bearbeiten vor Ersetzen; Fotozuschnitt und Original/Graustufen/Sepia; direkte Schriftwahl, Fett und Kursiv; Motive in tatsächlich freie Flächen, kompaktere Übersicht (6 Desktop/4 Mobil). Außenklick schließt Vollbild, weißer Innenbereich nicht. 172 Gesamttests erfolgreich, finale gezielte Tests erfolgreich, Build 76/1, Desktop-/Mobil-Browserprüfung ohne Seitenfehler. Grenzen/Details in docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md. Nächster Schritt: Nutzerprüfung der aktualisierten privaten Testseite.

## 05.10.2026 – Sockel im Vollbild und sichtbarer Vorschauhinweis

Branch `task/full-preview-base-20261005`, Basis `d127b5a9ee6f52f3aad69ae5061e8d48d5f7edf0`. Vollbild streckt die Acrylszene nicht mehr; vorhandene Sockelposition/7-mm-Regel bleibt erhalten. Oberer Hinweisrahmen jetzt als sichtbare Ebene nach jeder Inhaltsänderung für 1,6 Sekunden statt nur dreimal. Desktop-/Mobil-Browserprüfung mit Nussbaumsockel und je fünf Textänderungen bestanden, keine Seitenfehler; Build 76/1. Details: docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md. Nächster Schritt: Nutzer prüft dieselben Aktionen auf der aktualisierten privaten Testseite.

## 04.10.2026 – Vollständige Vorschau und ganze Schrift-mm

Aufgabenbranch `task/cmyk-300dpi-20261004`, Basis `8a4da028feb1f5df49b3c0e9686e994f04361b73`. Große obere linke Mobilvorschau mit kompletter Acrylszene, proportional/bündig; kurzer Hinweisrahmen nur bei ersten Änderungen. Ganzzahlige Kundenschriftgröße (8,7 → 9 mm), keine Änderung des Plattenformats. 16 gezielte Tests / 0 Fehler / 0 Skips, Build 76/1; mobile Browserprüfung einschließlich kompakter Textbearbeitung erfolgreich. Details und historische CMYK-Prüfung: docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md. Nächster Schritt: Nutzerprüfung auf bestehender privater Testseite. Kein neuer RIP-/Corel-Nachweis.

## Historisch: CMYK / 300 dpi und kompakte Direktbearbeitung (04.10.2026)

Standard-PDF: echtes DeviceCMYK / 300 dpi, optional 600 dpi mit Feinheits-Hinweis. Kompakte Textleiste statt großem Formular. Masterbegriffe Motiv/Design in AGENTS.md festgehalten. 169 Tests bestanden, Build 76/1; tatsächliche CMYK-Downloads und Desktop-/Mobilbedienung geprüft. Keine druckerspezifische ICC-Konvertierung. [Nachweis](docs/dashboard-20261004/CMYK-DIREKTBEARBEITUNG.md).

## Historisch: Direktbearbeitung und ruhiger Foto-Upload (04.10.2026)

Text am Auswahlrahmen live bearbeiten, Fotoeditor per Doppelklick, kein Upload-Scrollsprung; Download bleibt auf derselben privaten Testseite. Build 76/1, 167 Tests bestanden, danach 18 gezielte Tests sowie Desktop-/Mobil-/PDF-Browserprüfung bestanden. Details: [DIREKTBEARBEITUNG.md](docs/dashboard-20261004/DIREKTBEARBEITUNG.md).

## Historisch: Master-Bedienregeln und Weißkanalprüfung – 04.10.2026

Druck ohne Überlagerungswarnungen, Gravur weiterhin mit Hinweisen. Erstfokus markiert den gesamten Text. Ein-Design-Ausblendung bestätigt; zwei bestehende Designs erhalten. Kunden-Testansicht ohne Druckdownload; separater privater Werkstatt-Exporttest. Überdruck nur bei tatsächlichem Randdruck, Weißkanal-Vorschau und motivbezogene Weißvektoren ohne Seitenclip. 167 Tests, Build 76/1 und Browser-/PDF-Prüfung bestanden. Corel-Import und bezahlter Konto-Download nicht ausgeführt/angebunden. [Nachweis und nächste Prüfung](docs/dashboard-20261004/MASTER-BEDIENREGELN.md).

Präzisierung Weiß am 04.10.2026: Standard nur unter bedruckten Motivflächen; freies Acryl bleibt transparent. Ersetzt die vorherige Vollflächen-Voreinstellung. Vollfläche ist ausdrücklich als „Gesamte Platte weiß hinterlegen“ gekennzeichnet.

Exportvorgaben am 04.10.2026 angepasst: Nur PDF, Roland RDG_WHITE, Farbüberdruck 1 mm umlaufend, Weiß vollflächig innerhalb der Kontur, Weißüberdruck 0 mm. Frischer Browserstart geprüft; bestehende sechs Exporttests weiterhin bestanden.

## Historisch: PDF-Druckdownload als Prüfexport – 04.10.2026

Aufgabenbranch `task/print-download-20261004`, Basis `7f6bd786ebf097ec8047d7d14ee9705d1ad7030a`. Standard nur PDF; Roland/Mimaki beim Download wählbar, optional ZIP aller verfügbaren Gestaltungsdaten und Originalfoto separat. Überdruck Farbe 0/1 mm, Weißumfang getrennt, Kontur unverändert. 165 Tests bestanden, Build 76/1, tatsächliche PDF- und Browserdownloads geprüft. [Umfang, Prüfung und Grenzen](docs/dashboard-20261004/DRUCKDOWNLOAD.md). PDF-Farbmotiv RGB/600 dpi; Kontur und Weiß Vektor. RIP-/ICC-/Produktionsfreigabe weiterhin offen. Statische private Testseite bleibt ohne dauerhafte Werkstattdaten. Keine Produktivveröffentlichung.

# Aktuell: sichtbare Fotobewegung und normale Bedienelemente korrigiert – 04.10.2026

Branch `task/configurator-controls-20261004`, Basis `5ddd3a1473c32da7682e47ddc6a0445472c4597e`. Die vorherige Ausrichtung wurde vor dem Rendern entfernt; der vorherige Test erkannte nur geänderte interne Werte. Jetzt bleibt der Ausschnitt im Vorschauvertrag und die tatsächlich gezeichnete Bildbewegung bei 100 % ist geprüft. Foto-/Textgriffe für Größe, Drehen und Entfernen erhalten; Design und Maske bleiben fest. Größen-/Löschfreigaben im Backend je Text einstellbar, neue Texte standardmäßig freigegeben. 159 Tests, Build 76/1, sichtbare Desktop-/Touchbedienung und Backend-Speichern/Neuöffnen bestanden. [Korrektur und Nachweis](docs/dashboard-20261004/KONFIGURATOR-BEDIENGRIFFE.md).

Nächster Schritt: aktualisierte private Kundenansicht mit eigenem Foto prüfen. Ältere Aussagen zur erfolgreichen Fotobewegung sind durch die oben dokumentierte Korrektur ersetzt.

# Aktuell: Fotoausrichtung und Backend-Textfreigaben – 04.10.2026

Branch `task/photo-position-20261004`, Basis `57ce8ff6a39fb5c78a6983af8f12c4bf0528b918`. Foto ohne grünen Rahmen, direkt hinter fester Maske verschieb-/zoombar. Neue Texte standardmäßig beweglich; im Backend je Textfeld „Festes Textfeld / Frei verschiebbar“ einstellbar und revisionsgesichert. Eigentliches Design bleibt fest. 157 Tests bestanden, 0 Fehler/Skips; Build 76/1. Echte Desktop-/Touchprüfung und Backend-Speichern/Neuöffnen mit synthetischen Daten bestanden. [Prüfung und Grenzen](docs/dashboard-20261004/FOTO-TEXT-AUSRICHTUNG.md).

Private Testseite zeigt nur die Kundenansicht und speichert keine Werkstattdaten. Originaltreue/Produktion weiterhin offen. Nächster Schritt: Nutzer prüft Foto- und Textausrichtung. Folgende Einträge sind frühere Stände.

# Aktuell: Beispielbild und Originalvorgaben korrigiert – 04.10.2026

Nutzerkorrektur: Foto mit direktem Uploadhinweis erhalten; Pia & Rafael bleiben als vom Kunden änderbare Vorgabe. Massive Holzsockel verdecken unten 7 mm (bestätigt). Folgebranch `task/uv-original-preview-20261004`, Basis `8438bc2a4638c0a2017d98fc9670169661711a1c`. Separate geprüfte Beispielfotoressource, Hinweis nur in Bedienvorschau, direkter Klick/Enter, Fotoersatz und unveränderte Texte beim Neuladen geprüft. 152 Tests bestanden, 0 Fehler/Skips; Build 76/1; Desktop/Mobil geprüft.

Die verlangte 1:1-Originaldarstellung ist noch NICHT bestanden: Linien/Schrift weichen ab, ZIP-Basis ist laut eigener Masteranleitung eine Rekonstruktion; bisherige 93-%-Einpassung bleibt. Vor weiteren Designs originale bearbeitbare Gestaltung/Schrift zum Mockup klären. Kein neues ZIP pauschal verlangen, keine Serienfreigabe behaupten. [Nachweis und präzise Lücke](docs/dashboard-20261004/UV-ORIGINAL-KORREKTUR.md). Die folgenden Ergebnisse sind historische Zwischenstände.

# Aktuell: UV-Vorlagenimport umgesetzt – 04.10.2026

Aufgabenbranch `task/uv-design-pilot-20261004`, auf `51841fda34a8e49f5f3d3634e77ef965720cdef7`. Nutzer-Masterpaket geprüft (17 Manifestdateien). Pilot „Unser kleines Glück“: neun Ebenen, vier Texte plus Bogenfoto. Wiederholbare Vorbereitung, zusätzlicher JSON-Import, unveränderte Bestandsdesigns/Preise, Fotoaustausch ohne Dublette und gespeicherte Kundenfelder. 150 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; echte Browserprüfung einschließlich Größenwechsel und serverseitiger Kundenvalidierung bestanden. Dateien, Befehle und Grenzen: [UV-PILOT-PRUEFUNG.md](docs/dashboard-20261004/UV-PILOT-PRUEFUNG.md).

Nächster Schritt: einen weiteren vorhandenen Entwurf nach [VORLAGENFORMAT.md](docs/dashboard-20261004/VORLAGENFORMAT.md) vorbereiten; dafür fehlt hier noch dessen hochauflösende Quelldatei. Product-Design-Auftrag konkretisiert, aber kein weiterer Agent/Serienlauf gestartet. Beliebige flache Bildzerlegung, vollständige Fonts und Produktionsausgabe bleiben offen. Originalbilder/Pilotdatenbank privat außerhalb Git; keine dauerhafte gemeinsame Ablage behauptet. Nichts live veröffentlicht.

Die folgenden Abschnitte sind historische Zwischenstände; insbesondere der dortige Masterpaket-Downloadblocker ist durch den Nutzerupload erledigt.

# Aktuell: UV-Designpilot – 04.10.2026

Nutzerpriorität: vorhandene UV-Designserie automatisiert als bearbeitbare Vorlagen übernehmen, zuerst „18 – Unser kleines Glück“. Sechs Originalvorschauen (13–18), Direktimportauftrag und private GitHub-Release-Pakete wiedergefunden. Vorschau tatsächlich gelesen; Masterpaket-Download in dieser Aufgabe mit Forbidden blockiert. Keine neue Konvertierung oder Druckprüfung behauptet. Nach bestandenem Pilot weitere Designs durch ein anderes Modell vorbereiten lassen. Quellen, Abnahme und genau fehlende Datei: [UV-DESIGN-PILOT.md](docs/dashboard-20261004/UV-DESIGN-PILOT.md). Codebasis 03fc8aa74df2714ae523fd8208ae2ad3d7327cfa; Aufgabenbranch task/uv-design-pilot-20261004. Nur Dokumentation geändert; keine erneuten Tests erforderlich.

# Aktueller Stand – Gravuru 2027

## Historisch: Dashboard-Neuaufbau fortgesetzt – 04.10.2026

Maßgeblicher Einstieg: [CLOUD-HANDOVER.md](CLOUD-HANDOVER.md). Aktiver Aufgabenbranch `task/dashboard-customer-fields-20261004`, Basis `1b4626eab6cc2e7d22f815754583cc678e57d558`. Neu: ausdrückliche Text-/Fotofelder für importierte Designs mit Vorschau, mm-Einstellungen, runden Farben, Kundenrechten und unveränderlichen Produktrevisionen. 143 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; synthetischer Desktop-/Mobil-Browserablauf geprüft. [Nachweis und Bilder](docs/dashboard-20261004/PRUEFUNG.md).

Der vorhandene G27-02-Neuaufbau bleibt Grundlage. M01/M02 und die dokumentierten Änderungen gelten gemeinsam; die Gesamtansichten sind noch nicht vollständig umgesetzt. Nächster fachlicher Schritt: bestehende Produktübersicht mit echten Konfigurationsvorschauen nach M01 weiterentwickeln. Keine neue Migrations-/Serverplanung und keine Work-Verknüpfung als Voraussetzung. Private Bestandsdaten sind hier weiterhin nicht angebunden und für dieses Teilstück nicht erforderlich.

Die folgenden Übergabeabschnitte dokumentieren den vorherigen Stand; bei abweichenden nächsten Schritten gilt der aktuelle Einstieg oben.

## Aktueller Cloud-Übergabestand – 04.10.2026

**Cloud-Neustart/Quellabnahme, isolierter Cloud-Restore und GitHub-Leseübergabe bestanden. Der Nutzer hat die Weiterentwicklung ausschließlich in Codex Cloud beauftragt. Eine gemeinsame Serverinstallation ist dafür keine Voraussetzung. Produktion bleibt ungeprüft und nicht freigegeben.**

Fachliche GitHub-Basis: `infra/gravuru-2027-cloud-20261003`, Remote-HEAD am 04.10. geprüft: `f7c3f24db55003c28fec5274dfc5df2736926b6b`. Diese Dokumentübergabe liegt separat auf `infra/cloud-only-handoff-20261004`; kein Merge. Vor weiterer Arbeit aktuellen Remote-HEAD prüfen.

- [Neue Mikail-Cloud-Abnahme](https://github.com/Chris83638w/gravuru-2027/blob/5e40517a85a07d7226989b3863ce025f382aaa20/docs/cloud-migration-20261003/CLOUD-ACCOUNT-A-TEST.md), Marker `5e40517a85a07d7226989b3863ce025f382aaa20`: 137 bestanden, 0 Fehler, 0 Skips; Build 76 Ressourcen/1 Modell; geschützte HTTP-Routen sowie Host/Origin/CSRF geprüft. Die Auswahl Cloud → gravuru-2027 ist durch den Nutzerscreenshot belegt.
- [Chris' isolierter Cloud-Restore](docs/cloud-migration-20261003/CLOUD-RESTORE-NACHWEIS-20261004.md), Originalnachweis `e624833aecf6382f9b5edb4c432eb4e7c81a5cb2`, abgeschlossen 04.10.2026 um 14:13 Europe/Berlin: 16 Teile, 528682206 verschlüsselte Bytes, Archiv-/Manifest-/DB-Prüfungen bestanden. Werkstatt: 7 Produkte/17 Revisionen/4 Importitems; Profile: 2 Profile/2 Profilrevisionen/1 Bibliothekseinstellung/5 Einstellungsrevisionen; Designressourcen: 2 Originalquellen/3 Assets. Keine alten WAL-/SHM-Dateien übernommen.
- Mikail hat den Nachweis am 04.10. gegen 14:25 direkt von GitHub gelesen und beide Remote-HEADs sowie AGENTS.md, CLOUD-AKTUELL.md und STATUS.md geprüft. Dokumentierte Wissensübergabe bestanden; kein Zugriff auf Chris' private Laufzeitdateien.

Die vorstehenden Tests wurden für diese Dokumentübergabe nicht wiederholt. Alte Aussagen »Cloud-Restore/Neustart offen« sind für diese bestandenen isolierten Prüfungen überholt. Dauerhafte gemeinsame private Datenablage, Zugriff beider Konten, App-Anbindung und visuelle Abnahme bleiben offen.

## Nutzerentscheidung: Cloud-Entwicklung fortsetzen

Die spätere Nutzerentscheidung ersetzt die vorherige Entwicklungspause: ausschließlich in der vorhandenen Codex Cloud weiterentwickeln, GitHub als gesicherten Code-/Entscheidungsstand verwenden. Work soll Gestaltung und Bilder übernehmen; die technische Cloud-Verknüpfung ist noch zu bestätigen. Konkreter Einstieg und nächster Schritt: [CLOUD-AKTUELL.md](CLOUD-AKTUELL.md#einstieg-für-work). Keine neue Servereinrichtung als Voraussetzung. Die Vorbereitung auf `infra/private-runtime-preparation-20261004` bleibt separat und wird nicht installiert.

Diese Änderung betrifft ausschließlich CLOUD-AKTUELL.md, START_HERE.md und STATUS.md. Dokumentdiffs geprüft; App-Code und Restorebericht nachweislich unverändert; kein neuer Test-/Build-/Restore-Nachweis. Private Daten aus Chris' Aufgabe sind hier weiterhin nicht verfügbar. Nächstes fachliches Paket: explizite Kundenfelder/Fotobereiche in importierten Designs; keine automatische Editierbarkeit beliebiger Pfad-PDFs.

## Frühere Nachweise und ursprüngliche Übergabe

## Cloud-Übernahme geprüft (03.10.2026)

Aktueller normaler Quellbaum unter `app/` auf `infra/gravuru-2027-cloud-20261003`, übernommen aus dem SHA-256-geprüften Transportstand `3b2ac03d213ac913bcc61520b595f97dde6aa072`. Ausgangsbranch tatsächlich abgerufen: `9ca2d1256c006b20d4a4ca238deca34426b1b2ff`. Die folgenden älteren lokalen/GitHub-Aussagen sind historische Nachweise.

Frisches Verzeichnis in der bestehenden Linux-Cloud-Maschine: 215/215 Quelldateien identisch, vier Referenzarchive korrekt. Node 24.19.0, Python 3.12.14, PyMuPDF 1.28.2. `cloud-check.mjs` und separat `npm test`: jeweils 137 bestanden, 0 Fehler, 0 Skips; `npm run build`: 76 Ressourcen, ein Modell. Kundenkonfi, Editor, Werkstatt/Profile/Serien und Produkt-/Modell-API per HTTP geprüft; fremder Host/Origin und Schreiben ohne CSRF werden mit 403 abgewiesen. Keine Browserabnahme dieses Cloud-Laufs.

Nachweis: `CLOUD-VALIDIERUNG-20261003.md`, `CLOUD-SOURCE-COMPARISON.json`. Kein privater Datenbank-Restore; nur automatisch erzeugter synthetischer Entwicklungs-Master. Keine Produktivveröffentlichung, kein Main-Merge. Neu veröffentlichte Cloud-Maschine, zweiter Account, 24-Stunden-Laptop-aus-Test und vollständige private Sicherung bleiben NICHT GEPRÜFT. Nächster Schritt: Entwicklungsumgebung veröffentlichen und in einer neuen Aufgabe validieren; Datenmigration separat sicher vorbereiten.

Stand: 02.10.2026. **Kundenkonfigurator, Produktverwaltung, Profilbibliothek, erste Excel-Stapelanlage und SVG/PDF-Designersatz sind lokal lauffähig. Die Gesamtanwendung ist noch nicht live fertig.**

## Aktueller Auftrag: Sicherung und vollständige Cloud-Übergabe (02.10.)

**Prüfergebnis:** Neues Paket `outputs/Gravuru-2027-Cloud-Sicherung-20261002.zip` außerhalb des Repositorys, Snapshot 21:23:31 Europe/Berlin, Quellcommit `3b2ac03`, 302 Dateien/Archive, 365.154.964 Bytes, kein fehlender inventarisierter Eingang. Alle drei Datenbanken und Datei-/Originalhashes geprüft. Getrennte Wiederherstellung lädt 7 Produkte und alle 17 Revisionen mit Profil-/Designauflösung; Build 76 Ressourcen/ein Modell, vier Referenzarchive korrekt. Wiederherstellungstests: 133 bestanden, 4 PDF-Tests wegen fehlender nutzbarer Bibliothek übersprungen, 0 Fehler. Details/Hash/IDs und offene Cloud-Abnahme in `CLOUD-SICHERUNG-PRUEFUNG.md`. Originale unverändert; kein Cloud-Upload erfolgt. Dieser nachträgliche Prüfbericht liegt zusätzlich neben dem unveränderten Paket.

Der Nutzer verlangt ausdrücklich, dass beim Wechsel nichts verloren geht und alle Projektressourcen in der Cloud verfügbar werden. Arbeitsstand Einzelimport `fd40467`, Serienimport `076b06e`. `CLOUD-UEBERGABE.md` beschreibt Umfang, geschützten Datentransport, Wiederherstellung und Abnahme. `scripts/prepare-cloud-handoff.py` erstellt ein neues separates Paket mit Quellbaum/Git-Bundle, konsistenten Snapshots aller drei Datenbanken, externen Projektoriginalen sowie SHA-256-Inventar. Es prüft Dateihashes, sämtliche Original-/Vorschauhashes, referenzierte Assets aller Produktrevisionen und SQLite-Integrität. Wiederherstellung überschreibt keine vorhandenen Ordner. Prüfergebnis steht beim konkreten Paket; ein lokal erstelltes Archiv ist noch kein Cloud-Nachweis.

Zugriff am 02.10.: GitHub-Connector auf `Chris83638w/gravuru-2027` liefert 404; Chrome-Sitzung derzeit nicht erreichbar. Keine Wiederholung der alten Cloud-Einrichtung oder Behauptung einer gestarteten Aufgabe. Erst vollständige Sicherung/Probewiederherstellung, dann Übertragung über tatsächlich verfügbaren privaten Zugang. Offizielle Cloud-Doku nennt derzeit Computer-/Browserbedienung als nicht unterstützt; lokale Plugins und Anmeldungen werden nicht automatisch übernommen.

## Neu: Excel-Stapelanlage mit zugeordneten SVG/PDF-Dateien (02.10.)

- http://127.0.0.1:8961/werkstatt/serien/ nimmt jetzt mehrere Design-Dateien gemeinsam mit der Tabelle an. `design_file` verweist auf den exakten Dateinamen, `design_page` auf die PDF-Seite (Standard 1), `design_id` auf das zu ersetzende Masterdesign (leer = Standarddesign), `design_fit` auf `visible` oder `original`. Maximal 100 Produktzeilen/Dateizuordnungen, jede Datei höchstens 15 MB. Keine Ordner-/Drive-Abfrage und keine dauerhaften Hintergrundjobs.
- Vorschau je Produktzeile mit Datei, Seite, Ziel-Design und tatsächlichen Platzierungsmaßen. Der Nutzer prüft vor der Anlage. Fehlende/mehrdeutige Dateien, ungültige Seiten und zu große Originalmaße erzeugen Fehler. Gültige Zeilen können ausdrücklich separat übernommen werden. Abbrechen stoppt nach der laufenden Datei, ohne Produkte anzulegen.
- Derselbe geprüfte Designerersatz wird für Einzelimport und Serie verwendet (`replaceDesignArtwork`). Dateihashes sind Bestandteil der unveränderlichen Produkte und der Importprüfung. Geänderte Dateizuordnung entwertet die alte Freigabe. Wiederholung mit gleichem Importschlüssel erzeugt keine Dubletten, und ein Fehler beim Speichern rollt die Produktserie zurück. Ein importiertes Gesamtmotiv mit gleichzeitig gefüllten Textspalten wird ausdrücklich abgewiesen; Personalisierung wird nicht stillschweigend ignoriert.
- Die herunterladbare Excel-Vorlage besitzt 18 Spalten und eine ergänzte Anleitung; die bisherigen 14 Spalten, Beispielzeile und 100 freien Eingabezeilen bleiben erhalten. Mit Artifact Tool exportiert, neue Bereiche visuell geprüft und alle 1428 alten Zellen unabhängig verglichen. Echter XLSX-Upload wird vom Browserparser akzeptiert. Der verwendete Artifact-Prozess exportierte vollständig, meldete danach beim nativen Windows-Beenden `0xC0000409`; ZIP/XML, native Tabelle, Exportidentität und tatsächliches Einlesen sind gesondert erfolgreich geprüft.
- Testnachweis: voller Lauf 137 Tests, davon 133 bestanden und 4 zunächst wegen Bibliothekszugriff übersprungen. Nach Wiederherstellung des Sitzungszugriffs alle 26 Import-/PDF-Tests bestanden, 0 übersprungen (einschließlich der vier zuvor ausgelassenen). Damit alle 137 verschiedenen Tests abgedeckt, kein Fehler. Kein erneuter vollständiger Testlauf ohne neuen Anlass. Serverstart/Build: 76 Ressourcen/ein Modell.
- Echte Browserprüfung: neue XLSX-Vorlage eingelesen; zwei vorhandene Daria-PDFs mit drei Seitenzuordnungen in einer CSV-Serie geprüft und drei Testprodukte angelegt. IDs: `cfg_12edb094-6d72-4088-bb70-d35feda079e2` (Gesamtmotiv), `cfg_c21ec259-e6cf-4827-a867-6e6ece238313` (Einzelteile Seite 1), `cfg_a1be746e-0896-4646-88be-4e027605860c` (Einzelteile Seite 2). Die letzten beiden sind ausdrücklich Einzelteil-Testprodukte, keine fertig gestalteten Verkaufsprodukte.
- Änderungen: `batch.mjs`, `design-import.mjs`, `http.mjs`, Serien-UI/Parser/Stile, XLSX-Builder/Vorlage und neue `batch-assets.test.mjs`. Vorheriger gesicherter lokaler Einzelimport-Commit `fd40467`; neue Serienänderungen lokal, noch nicht GitHub.

**Nächster fachlicher Schritt:** Kundenfelder/Fotobereiche ausdrücklich in importierten Designs definieren, ohne Originaltext oder Fotos nur mit neuen Feldern zu überdecken. Designsammlungen mit mehreren zugeordneten Designs pro Produkt sind noch über den Master möglich; die neue Excel-Zeile ersetzt jeweils genau ein Design. Freie Formkonturen, Materialien/Bohrbilder, KI-Gestaltung, Shopify und Produktionspakete bleiben offen.

**Aktuelle Cloud-Frage:** Der Nutzer fragt wieder nach Entwicklung bei geschlossenem Laptop. Offizielle aktuelle Doku https://learn.chatgpt.com/docs/cloud bestätigt Aufgaben in veröffentlichten Cloud-Umgebungen unabhängig vom Laptop. Es wurde kein neuer Cloud-Auftrag gestartet und keine Migration behauptet. Vor einem solchen Auftrag aktuellen Quellstand und benötigte Test-/Designressourcen bereitstellen, Node/Python/Abhängigkeiten dort prüfen und Ergebnisse/Änderungen nachvollziehbar zurückführen. Lokale Datenbanken nicht unkontrolliert veröffentlichen. Aktuelle Arbeit zuerst sauber festhalten.

## Neu: echter SVG/PDF-Designersatz (02.10.)

- Werkstatt → Produkt → Designs & Texte → **SVG / PDF ersetzen …**. Auswahl einer PDF-Seite, Prüfung von Maßen und Inhalt, proportionale Platzierung in der sichtbaren Acrylfläche oder Originalmaß, Vorschau vor dem Speichern. Der Import ersetzt ausschließlich das gewählte Design. ID, Varianten, Preise und andere Designs bleiben erhalten.
- Byte-identische Originale und passive SVG-Vorschauen liegen unveränderlich und nach Prüfsumme adressiert in `.local-data/design-assets.sqlite`. Historische Produktrevisionen behalten ihre Quellen. Alle drei Datenbanken in `.local-data/` zusammen sichern. Keine Benutzerdaten nach Git aufnehmen.
- PDF-Schriften werden für die Vorschau zu Pfaden; Vektoren bleiben Vektoren und eingebettete Bilder bleiben Bilder. Keine Rasterung der ganzen Seite. SVG muss bereits Schriftpfade enthalten. Aktive Inhalte, externe Referenzen, nicht unterstützte SVG-Funktionen und PDFs mit nicht eingebetteten Nicht-Standardschriften werden abgewiesen. Die Originaldatei bleibt stets separat herunterladbar.
- Ein importiertes Design ist derzeit **ein gesperrtes Gesamtmotiv**, ohne automatisch editierbare Texte/Fotofelder. Der Foto-Reiter verschwindet nur bei dieser Vorlage ohne Fotofeld; bei einem anderen Design mit eingerichtetem Fotofeld erscheint er wieder. Der Importdialog nennt diese Grenze ausdrücklich. Produktions-CMYK, Schmuckfarben und druckfertige Bestellexporte werden damit nicht behauptet; die Browser-SVG ist eine RGB-Vorschau.
- Aktive Dateien: `app/workshop/design-assets.mjs`, `design-converter.py`, `design-import.mjs`, `ui/design-import-ui.mjs`; Anbindung in HTTP/UI und Kundenmodell. `app/configurator/variant-m/artwork-resource.mjs` transportiert Originalproportionen bis zum Renderer; dies behebt die bei der Sichtprüfung gefundene quadratische Darstellung.
- Vollständiger Testlauf: **128 bestanden, 0 fehlgeschlagen, 0 übersprungen**. Enthält tatsächliche PDF-Konvertierung, SVG-Masken/Farben/Bilddaten, 28 unveränderte Variantenpreise, gezielten Designersatz, unveränderliche Originale/Revisionen, Konfliktschutz, manipulierte Ressourcen, HTTP/CSRF und korrekte Hoch-/Querformatdarstellung. Build weiterhin 76 Ressourcen/ein Modell.
- Echte Browserabnahme mit `Daria-CorelDRAW-2021.pdf`: Import, Vorschau, Ersetzen/Speichern und Kundenansicht, Größen-/Sockelwechsel sowie Foto-Reiter beim Designwechsel geprüft. Separates Prüfprodukt: http://127.0.0.1:8961/werkstatt/?configuration=cfg_a20d644c-1e4c-4158-8f7b-2be30049722b (Revision 2). Originales Arbeitsprodukt `cfg_ad9a9754-9bf2-416c-a366-da9c996cb841` bleibt Revision 10. PDF 150 × 200 mm ist proportional auf 139,5 × 186 mm eingepasst, damit sie vollständig oberhalb des Sockels sichtbar bleibt; keine Behauptung eines physischen 1:1-Produktionsmaßes.
- PDF-Abhängigkeit: PyMuPDF 1.28.2, lokal unter `.local-data/python` installiert. Start-/Installationshinweise in `LOKAL-STARTEN.md`. Paketmetadaten nennen AGPL-3.0 oder kommerzielle Artifex-Lizenz. Vor einem proprietären Hosted-Release den passenden Lizenzweg klären oder einen entsprechend geeigneten Konverter wählen; keine kommerzielle Lizenz wurde erworben.

**Weiterer Ausbau:** importierte Vorlagen mit ausdrücklich zugeordneten Kundenfeldern und austauschbaren Fotobereichen verbinden (keine falsche automatische Rekonstruktion von Pfaden versprechen). Die Datei-IDs sind inzwischen im Excel-Stapelimport verwendbar, siehe neuester Abschnitt. Material-/Form-/Bohrmodell, dauerhafte Jobs, Shopify und verlässliche Druck-/Gravurpakete bleiben weitere offene Pakete.

**Fortsetzungs-/GitHub-Stand:** Lokal `task/g27-02-workshop`, vorheriger Commit `5e2b219`. Die aktuelle Importimplementierung ist noch nicht auf GitHub. Dort enthält Entwurfs-PR #1 (https://github.com/Chris83638w/gravuru-2027/pull/1), Branch `task/g27-02-cloud`, Commit `e8021251a3bf86590798b85dca1bbf001c1fa88c`, den früheren G27-02-Stand als ZIP-Transport. Lokale und entfernte Historien nicht per Force-Push zusammenführen. Es läuft **kein Cloud-Auftrag**; der Nutzer hat die lokale Weiterarbeit verlangt. Keine erneute Cloud-Einrichtung oder Sicherungssuche als Voraussetzung.

## Werkstattbasis vom 01.10. (historischer Nachweis)

- http://127.0.0.1:8961/werkstatt/ – Produkte/Master, stabile cfg-IDs, Kopieren, Preise/SEO/Kategorien/Designtexte, Archiv, lokale Freigabe und Wiederherstellung.
- http://127.0.0.1:8961/werkstatt/profile/ – Schriften, Motive, Farben, Bestseller. Standard → Kategorien in gespeicherter Reihenfolge → eigene Produktzuordnung. Vererben, ausdrücklich leer und eigenes Profil sind verschieden. Tatsächliche Auswahl im Kundenkonfigurator wird gefiltert; vorhandene Vorlagengrafiken und Schriftumrisse bleiben erhalten.
- http://127.0.0.1:8961/werkstatt/serien/ – XLSX/CSV/TSV mit bis zu 100 Produktzeilen aus gespeicherten Mastern, Prüfung vor Anlage, Importschlüssel gegen Duplikate. Optional gültige Zeilen übernehmen und Fehler offen lassen. Noch kein PDF-/SVG-Designersatz oder KI-Stapeljob.
- Mehrere Designs pro Konfiguration: kopieren, sortieren, Standard bestimmen, entfernen (letztes geschützt), Texte und getrennte Elementrechte. Der bestehende Foto-/Designwechsel bleibt verwendbar. Aktuell sind Designvarianten Kopien des Acrylpiloten, keine neu rekonstruierten Bildvorlagen.

Aktive Module: `app/workshop/`. SQLite-Dateien `.local-data/workshop.sqlite` und `profiles.sqlite` bleiben lokal und sind ignoriert. Produktmigration 3, unveränderliche Dokument- und Metadatensnapshots, erwartete Revision gegen überschreibende Paralleländerungen. Die aktuelle Vorschau ohne `revision` benutzt aktuelle Profilzuordnungen. Historische Links mit `revision` verwenden den gespeicherten Profilstand. Vor Einführung der Metadaten erzeugte Revisionen haben die ursprüngliche uneingeschränkte Auswahl.

Browsernachweis: Master kopiert, Name und Preis geändert, gespeichert, neu geladen, Kundenansicht geprüft; Wiederherstellung, Freigabe, Archivieren/Rückholen; zweites Design und Kategorie-Schriftprofil in echter Kundenansicht; XLSX-Vorlage hochgeladen und Produkt angelegt. Getrennte Text-/Farb-/Fotorechte im Kundeneditor geprüft; temporäre Rechteprüfung anschließend auf den regulär bearbeitbaren Stand zurückgesetzt (neue Revision 10). Vollständiger aktueller Testlauf: **111 bestanden, 0 fehlgeschlagen**. Build: **76 Ressourcen, ein Modell**. Das ist kein Nachweis einer Shopify-Bestellstrecke oder Maschinenproduktion.

Lokaler Aufgabenbranch `task/g27-02-workshop`. Der damalige Stand wurde später als G27-02-ZIP übertragen; maßgeblicher Transportstand siehe oben. Quellhistorien nicht per Force-Push zusammenführen.

Damals offen: allgemeines Material-/Form-/Bohrmodell, freie PDF/SVG-Design-/Konturübernahme, Medienverwaltung, anhaltende Importjobs und gezielte Aktualisierung vorhandener Produkte, Shopify-Installation/Zuordnung, Checkout und unveränderliche Bestellungen, Druck-/Gravurpakete, KI-Design und Drive. Der inzwischen gebaute Designersatz und seine Grenzen stehen oben; Formkonturimport bleibt offen. Endgültige Schriften und freigegebene Produktionsprofile bleiben offen. Server bindet nur Loopback; lokale Werkstatt ist keine gehostete Händleranmeldung.

## Historischer G27-01-Nachweis (30.09.)

## Aktuelle Umsetzung

Aktive Anwendung: `app/`. Start: `LOKAL-STARTEN.md`. Vorschau: http://127.0.0.1:8961/?model=acryl. Der alte Vergleich auf Port 8951 bleibt getrennt. Dies ist eine lokale Entwicklungsgrundlage, keine installierte oder live bestellbare Shopify-App.

Gezielt übernommen: Kundeneditor, Motive, Schriften, Acrylszene und sechs Sockel samt benötigter Laufzeitmodule. `app/REFERENCE-UI.json` dokumentiert die ursprünglichen Dateien/Prüfsummen; aktive Fassungen enthalten bewusste Änderungen. Neuer lokaler Server und Einstieg laden nur das Acrylmodell, keine alten Admin-/Bestell-/Produktionsrouten.

Implementiert: gemeinsame versionierte Acrylpreisquelle, validierte Rechte fixer Vorlagenelemente, Fotozuordnung nur über eindeutige semantische Feldschlüssel. Kundenkorrekturen: physische mm-Schriftgrößen, runde Farbfelder/Farbwähler, deutlicher Fotoersatz, mobile direkte Texteingabe, Griffe vor dem Sockel, unpassende Reiter/Bedienelemente ausgeblendet. Das sind Teile von G27-02/G27-05, keine vollständige Abnahme dieser Pakete.

Aktuelle Prüfung: **57 Tests bestanden**; Build mit **76 Ressourcen und einem Modell**. Reale Browserprüfung: alle Sockel, Größe/Preis/Text/Farbe, zweimal Fotoersatz, mobile Texteingabe, mm-Wert nach Fokuswechsel und Griffe vor dem Sockel. Unabhängige Astra-Prüfung mit hohem Denkaufwand: gefundene mm-/Fotoformfehler behoben und nachgeprüft. Details und Grenzen: `G27-01-PRUEFUNG.md`.

Lokaler Aufgabenbranch: `task/g27-01-runnable-foundation`. Die lokale Git-Historie wurde aus dem Referenzstand initialisiert und ist nicht mit der Remote-Historie verbunden. **Nicht per Force-Push übertragen.** Connectorzugriff auf das neue private Repository und Git-Anmeldung waren nicht verfügbar. Ein Übergabearchiv ist ein separater Transportweg, kein gepushter Quellbranch.

GitHub-Sicherung anschließend bestätigt: Branch `task/g27-01-package`, Remote-Commit `36f7c16494feb24abc980f9813a1dec855cc4975`. Enthält `GRAVURU-2027-G27-01.zip` mit aktivem Quellstand des lokalen Commits `51d555e` sowie aktualisierte Start-/Prüf-/Übergabedokumente. https://github.com/Chris83638w/gravuru-2027/tree/task/g27-01-package. Kein Merge nach main und kein Pull Request erstellt. Archiv frisch entpackt: Build mit 76 Ressourcen/einem Modell erfolgreich. Prüfsumme in `G27-01-UEBERGABE.md`.

## Abgeschlossen

- Eigenständiges privates Repository: `Chris83638w/gravuru-2027`.
- Ausgangsdokumentation auf GitHub: Commit `573d882588d968964bfd2a1e17414b22c3f69eac`.
- Umsetzungspakete, Startauftrag für GPT-6.1 Sol, Arbeitsregeln und Materialzuordnung vorbereitet.
- Vier Referenzarchive mit 294 Dateien: bestehender Quellcode, Motive/Schriften, Acrylressourcen, zwölf Materialbilder und zwei ausgewählte Oberflächenentwürfe.
- Probeentpackung und alle Datei-/Archivprüfsummen erfolgreich. 19 vorhandene Tests bestanden; Build erfolgreich mit 104 geprüften Ressourcen und 7 Modellen. Details in `QUELLEN-UND-START.md`.

## Keine Fertigbehauptung

Die erste lokale Kundenoberfläche ist implementiert. Neuere Werkstattfunktionen und verbleibende Grenzen stehen oben. Referenzarchive sind keine automatische Migration.

## Neu berücksichtigt

Edelstahl, Schiefer, Leder und Holz gehören neben Acryl zur Grundlage. In der historischen Sammlung ist **Edelstahl v4** ausgewählt; v6 war eine falsche Zwischenzuordnung. Leder 2 mm und Holz 5 mm sind dort nur Bildannahmen. Schiefer-Designbeispiele liegen vor, reine Rohlingreferenz noch nicht eindeutig zugeordnet. `MATERIALREFERENZEN.md` lesen.

## Genau weiter so

Aktuelle Implementierung weiterverwenden. G27-02 auf Materialien, freie Formen/Bohrbilder und weitere Varianten ausbauen; vorhandenen PDF/SVG-Import aus den Quellen gezielt anschließen. Danach Bestellsnapshots/Produktionspakete und Shopify-Verknüpfung. Keine erneute vollständige Recherche, neue UI-Grundlage oder parallele zweite Datenbank für Produkte erstellen.

## Fortschritt pro Paket ergänzen

Paket / Status / Branch und Commit / betroffene Dateien / konkret ausgeführte Tests / Ergebnislink / offene Grenzen / nächstes Paket. Historische Tests nicht als aktuelle Ergebnisse neuer Änderungen fortschreiben.
