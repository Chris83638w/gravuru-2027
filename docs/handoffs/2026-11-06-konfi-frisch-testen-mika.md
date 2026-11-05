# Konfi bei jedem Test neu beginnen

Stand 06.11.2026, Codex/Mika, Branch `dev/mika-konfi-anschluss-20261105`, PR #178. Aufbau auf `5100f4ae`. Aktive Prüfversion R8b: `editor-a82b6d7db96395ec.mjs`, aktiviert am 05.11.2026 um 23:07:26 UTC (06.11., 00:07 Uhr Berlin).

## Auftrag und Umfang

Mikail präzisierte „bitte cache leeren / beim konfi“ mit „nein, ich möchte immer von vorne testen“. Deshalb gibt es einen ausdrücklichen frischen Teststart über `?fresh=1`. Die ursprüngliche Produktvorlage bleibt der Ausgangspunkt; es wird keine neue leere Designvorlage erzeugt. Keine zusätzlichen Änderungen an Oberfläche, Preisen, Designs oder Kundenverhalten.

[Frischer Testlink](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html?fresh=1). Der Größenwechsel auf 30×20 cm bleibt im Konfi verfügbar.

Weiterhin gilt der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); dieses Paket ändert keine Gestaltung.

## Umsetzung

- `session-guard.mjs`: `freshPreviewRequested` erkennt `fresh=1` ausschließlich bei einer ausdrücklichen Produktvorschau (`productPreview`) oder einem Prüfmodell (`reviewOnly`). Normale Shopkonfigurationen ignorieren diesen Parameter.
- `ux.mjs`: In diesem Modus wird die lokale Sitzung weder wiederhergestellt noch neu gespeichert. Fotos bleiben während des Tests im Arbeitsspeicher; vorhandene gespeicherte Entwürfe werden nicht gelöscht oder überschrieben.
- `session-guard.test.mjs`: Tatsächliche UX-Initialisierung prüft alte Sitzung → frischer Start → Änderungen ohne Speicherung → erneuter frischer Start. Der normale Link stellt den bisherigen gespeicherten Stand weiterhin wieder her. Beide Vorschaukennzeichnungen und normale Shopkonfigurationen sind abgedeckt.

## Abnahme

**255/255 lokal und 255/255 Linux**, keine Fehler oder übersprungenen Tests. Serverbuild erfolgreich. Gezielte Sitzungstests einschließlich Uploadspeicher zusätzlich 7/7. Die vorhandene Suite umfasst auch Größen/Preise, Text-/Fotobedienung, Kategorien und mobile Navigation.

Tatsächlicher Live-Browser: Mit `fresh=1` erschien Bruno mit vier Vorlagenelementen, keinem Foto und 19,99 EUR, obwohl im normalen Link ein alter Teststand lag. Dann Name auf `Neustart-Test` geändert und ein synthetisches 400×600-Testbild hochgeladen: fünf Elemente, ein Foto, 29,98 EUR. Normales Neuladen desselben Links stellte wieder Bruno, vier Elemente, null Fotos und 19,99 EUR her. Bildschirmnachweis lokal gesichert. Der neue Neustartablauf wurde am Desktop geprüft; die Handybedienung des unveränderten R7-Umfangs ist in der vorherigen Übergabe dokumentiert.

Beide Prüfseiten und Modelle sowie alle fünf Moduldateien HTTP 200. Beide Produktmodelle bytegleich zu R7: 43 Designs, Basispreise 1999/2499 Cent, 169 Cent je Zusatzmotiv. [Maschinenlesbarer Nachweis](2026-11-06-konfi-frisch-testen-nachweis.json).

## Veröffentlichung und nächster Schritt

Versionierte Serverkopie mit Hashabgleich, Tests und Build; nur Laufzeitpfad und die Modul-Ladeabschnitte beider Prüfseiten umgeschaltet. Vorversionen und Sicherungen bleiben erhalten. Keine Änderung der Datenbank, Produktmodelle oder bestehenden Bestellungen; kein Produktlaunch und kein neuer Warenkorbnachweis. Der bisherige normale Link behält die automatische Wiederherstellung.

Nächster Schritt: Mikails Sichtprüfung über den frischen Testlink. Bei jedem Öffnen oder Neuladen beginnt dort ein neuer Test mit der ursprünglichen Vorlage.
