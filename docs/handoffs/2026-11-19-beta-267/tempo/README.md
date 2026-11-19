# Messrunde am bestehenden Prio-Konfi R15

Die geschützte Beta verwendet `f7504182`. Die vier Anwendungscommits beginnen nach `f8c2d583`. Die Vergleichsinstallation lief auf `347aa63f`. Zwischen diesem Stand und `f8c2d583` änderten sich Übergaben und ein Test. [Gemeinsame Beta](https://konfi-beta.gravuru-designwerkstatt.de/) · [Isolierter Codevergleich](https://github.com/Chris83638w/gravuru-2027/compare/f8c2d583...f7504182) · [Trennung der übrigen PR-Historie und Rückweg](INTEGRATION.md)

## Gleiche HTTPS-Adresse vor und nach dem Update

Je Stand drei frische Chrome-Kontexte am PC und drei mit 390 Pixel Handybreite. Jeder Kontext fügte zuerst „Haus Nord 12“, danach „Haus Süd 27“ hinzu. Beide Gestaltungen verwenden dieselbe Ring-Variante zu je 49,99 €. Die zweite Position nutzt den warmen Browsercache. Chrome 157.0.8103.78, ohne künstliche Drosselung. Siehe auch die getrennten Messungen mit Datensparmodus weiter unten. [Einzelwerte, Datengrößen und Zeitpunkte](HTTPS-Vergleich.json)

| Strecke, Median | Vorher | Nachher | Veränderung |
| --- | ---: | ---: | ---: |
| Produkt öffnen bis zur ersten sichtbaren Designkarte, einschließlich automatischem Öffnen von „Designs“ | 4,192 s | 2,784 s | −34 % |
| „Designs“ antippen bis zur ersten sichtbaren Originalkarte | 89 ms | 63 ms | −29 % |
| Andere Vorlage antippen bis zur neu gezeichneten Gestaltung | 366 ms | 229 ms | −37 % |
| Letzter Warenkorbklick bis **alle persönlichen Bilder sichtbar und dekodiert** | 4,150 s | 3,809 s | −8 % |
| Warenkorb nur am PC | 4,086 s | 3,790 s | −7 % |
| Warenkorb nur auf Handybreite | 4,150 s | 5,224 s | +26 % |

Die Spanne der zwölf Warenkorbzeiten betrug vorher 3,82–11,13 s und nachher 3,52–8,62 s. Vier gegenüber fünf Versuchen dauerten länger als fünf Sekunden. Auf Handybreite verbesserte sich die erste Position im Median von 4,15 auf 3,81 s. Die zweite stieg von 3,95 auf 6,64 s, bei drei Versuchen je Gruppe. Das Fünf-Sekunden-Ziel bleibt offen. Die geschützte Umgebung verwendet den regulären Editor, die R15-Entwürfe und Fertigungspakete sowie einen getrennten Prüfwarenkorb. Reales Shopify und ein physisches Smartphone stehen für diesen Commit noch aus.

| Gerät und Cache | Einstieg zur Karte vorher → nachher | Wechsel vorher → nachher | Warenkorb vorher → nachher |
| --- | ---: | ---: | ---: |
| PC kalt | 5,32 → 2,99 s | 369 → 246 ms | 4,19 → 3,77 s |
| PC warm | 3,43 → 2,40 s | 369 → 222 ms | 3,86 → 3,81 s |
| Handybreite kalt | 5,44 → 3,35 s | 343 → 235 ms | 4,15 → 3,81 s |
| Handybreite warm | 3,21 → 2,47 s | 331 → 153 ms | 3,95 → 6,64 s |

## Wo die Zeit verloren geht

1. **Warenkorb.** Zwei kleine persönliche Prüfbilder durchliefen nacheinander zwei Bildprozesse. `e8d46ffe` bündelt die beiden begrenzten Prüfungen. Die erzeugten Bilddaten werden weiterhin einzeln validiert. Der lokale Entwurfsaufruf sank am PC von 915 auf 741 ms und im langsamen Handyprofil von 1.279 auf 980 ms. Im Shopify-Pfad begann die Anmeldung für das Checkout-Bild erst nach dem Speichern. `f7504182` nutzt die bestehende Anmeldung während der unabhängigen Entwurfsarbeit und erspart einer verlässlich neuen Datei einen Suchaufruf. Wiederanlauf und Namenskonflikte benutzen den Suchpfad. Die sichtbare Übergabe im eingebetteten Theme verwendet, soweit verfügbar, das bestätigte Bild der festen Revision.
2. **Designwechsel.** R15 bereitete dasselbe physische Profil und dieselbe SVG-Szene innerhalb eines Zeichendurchlaufs mehrfach auf. `174cf8a6` und `a285e016` verwenden sie während dieses Durchlaufs erneut. Änderungen an Design, Optionen oder persönlichem Text erreichen weiterhin die zuständigen Zeichenfunktionen. Im lokalen langsamen Handyprofil sank der Wechsel von 1,51 auf 1,09 s.
3. **Designkarten.** Die Galerie zeichnete vorhandene Originalkonturen im zweiten Kartendurchlauf erneut. `a285e016` nutzt die bereits erzeugte unveränderte Originalkarte. Die sichtbare Karte muss das gewählte Original tatsächlich zeichnen. Erst nach zwei weiteren Bildschirmzyklen endet die Messung. Bearbeitete Vorlagen nutzen ihre persönliche Darstellung. Die alten A/B/C-Lader zeigen, welche Ressourcen bereits verfügbar waren. [Historische Quellen und Entscheidung je Ansatz](ALTQUELLEN.md)

Vier der zwölf Entwurfsaufrufe warteten auf dem Host vor dem Update 6,20–6,33 s bis zum ersten Antwortbyte, nach dem Update ebenfalls vier 6,11–6,31 s. Die übrigen acht lagen danach bei 1,11–1,72 s. Die zwei Gestaltungen sendeten jeweils 94.650 bzw. 95.706 Bytes. Bei je einem zusätzlichen Warenkorbaufruf vergingen in beiden Ständen rund 2,98 s. Der gesonderte HTTP/2-Lauf am neuen Stand erfasste sechs Übertragungen. Bei den zwei langsamen Entwürfen benötigte Chrome 86 ms bzw. unter 1 ms zum Senden. **Nach Ende des Sendens** wartete er weitere 6,28 bzw. 6,04 s auf den Antwortkopf. Die Dauer allein lässt offen, wie sie sich innerhalb von Vermittlung, Verarbeitung und Speicherung verteilt. [Übertragung und Antwort je Versuch](Uploadmessung.json)

Ein zusätzlicher kleiner Produktabruf während eines langsamen Speichervorgangs wartete 4,12 s. Ein zweiter solcher Abruf erhielt HTTP 503. Beide Entwürfe selbst wurden erfolgreich gespeichert. Im betreffenden Zehn-Minuten-Fenster registrierte CloudLinux für das Beta-Konto eine Drosselung am Festplattenlimit von **1 MB/s**, bei null Grenzverletzungen für CPU, Arbeitsspeicher, Prozessanzahl und IOPS. Das Hosting erfasst die Grenze für das gesamte Zeitfenster. Für den Nachweis ihres Anteils je Warenkorbklick fehlt ein Gegenlauf mit geänderter I/O-Grenze. [Zweite Anfrage und Hosting-Messwerte](Host-Gegenprobe.json)

In der lokalen Datenbank der zwölf Ring-Proben belegt der feste Entwurf von „Nord“ **1.623.121 Bytes**, der von „Süd“ **1.631.069 Bytes** bei einer Übertragung von jeweils unter 96.000 Bytes. Darin stecken rund 0,78 MB Konfiguratorquellen, 0,32 MB Produkt und Gestaltung sowie 0,49 MB persönliches PNG. Die verbliebene Position im Prüfwarenkorb hält ihr PNG zusätzlich (488.927 Bytes). Die Beträge sind Nutzdaten der bestehenden Tabellen. Physische Schreibmenge und Zeitpunkt der SQLite-Sicherung werden vom Dateisystem mitbestimmt. Das erklärt, weshalb die gemeldete I/O-Grenze für diesen Weg relevant ist. Der bestehende Fertigungspaketleser verlangt explizit unkomprimierte ZIP-Einträge. Eine Umstellung des Dateiformats würde ältere Leser und den Rückweg betreffen. [Messwerte aus der lokalen Prüfdatenbank](Speichervolumen.json) · [Vorhandener Paketleser](../../../../app/workshop/review-package.mjs)

## Vergleich mit den Originalen und mit dem nativen Shopify-Pfad

Für die originale Funkklingel C/v3 wurden die archivierte HTML-Datei und deren Originalressourcen unverändert lokal bedient. Chrome fand 16 gezeichnete Karten sowie 54–55 Ressourcen-Einträge beim Einstieg, darunter Cachetreffer. Während 24 echten Designwechseln kamen null abgeschlossene HTTP-Ressourceneinträge hinzu. Der R15-Prüflauf erfasste während der Wechsel vier bis fünf beginnende Motivabrufe. Das bestehende Nachladen sichtbarer Motive läuft zeitgleich. Ein neuer Produktprofilabruf wurde in diesen Zeitfenstern nicht beobachtet. Auf dem PC wechselte die alte Funkklingel in 886 ms, der R15 in 252 bzw. 190 ms. Im gedrosselten Handyprofil waren es 6,03 s für C, 1,51 bzw. 1,09 s für R15. Das C-Archiv verwendet ein anderes Profil. Die Ergebnisse zeigen den Nutzen der lokal vorhandenen Konturen und die tatsächlichen Zeichenkosten der jeweiligen Seite. [C-Einzelmessung](Funkklingel-C-v3.json) · [A/B, Edelstahl-C, M, FPD und Zakeke](ALTQUELLEN.md)

| Lokaler, paarweiser Test | PC vorher → nachher | Handy vorher → nachher |
| --- | ---: | ---: |
| Öffnen bis erste sichtbare Karte | 1,31 → 1,24 s | 8,31 → 6,41 s |
| Klick auf „Designs“ bis erste sichtbare Karte | 45 → 39 ms | 258 → 253 ms |
| Designwechsel | 252 → 190 ms | 1.510 → 1.091 ms |
| Letzter Klick bis sichtbare persönliche Bilder | 1,46 → 1,31 s | 3,83 → 3,28 s |

Drei Messpaare in wechselnder Reihenfolge (alt/neu, neu/alt, alt/neu), pro Paar und Stand je ein frischer PC- und Mobilkontext mit zwei Gestaltungen. Der PC lief ungedrosselt. Handy mit vierfach gebremster CPU, 80 ms Netzverzögerung, 8 Mbit/s Download und 2 Mbit/s Upload. Datensparmodus für beide Geräte eingeschaltet. Die eingefrorenen Bilddaten sowie die Preise beider Positionen stimmen über alle lokalen Vergleichsläufe überein. [Lokale Einzelwerte](Ring-Messwerte.json)

Der gesonderte Shopify-Test bedient die signierten R15-Routen für Entwurf, Theme-Übergabe und bestätigtes Checkout-Bild. SQLite und Bildverarbeitung laufen regulär. Ausschließlich die externen Antworten sind vorgegeben (kalte Anmeldung 1.950 ms, jeder GraphQL-Aufruf 120 ms). Median ab Entwurf bis bestätigter Bildadresse kalt 4,115 → 3,064 s, warm 2,144 → 1,784 s. Pro neuem Bild fielen vorher drei, danach zwei Dateiaufrufe an. Die Bestätigung `READY`, SKU, Preis sowie gespeicherte Revision wurden geprüft. Eine Verkaufs-Shop-Latenz lässt sich daraus nicht ableiten. [Aufrufe und Einzelzeiten](Shopify-Prueflauf.json) · [Frühere separate Beobachtungen im Shop](../SHOP-UND-INTEGRATION.md)

## Bedienung und Fertigung

512 gezielte Tests in 61 Dateien bestanden auf `f7504182`. Darunter liegen signierter Bestelleingang, Mengen- und Preisbindung, Originalfoto und physische Fertigungsmaße der bestellten Revision, Motive und Schriften, Fotoauflösung, Kontur, Skalierung und zulässige Produktoptionen. [Prüfumfang und Ergebnis](Regression.json)

Beim vollständigen Projekt-Testlauf in derselben Windows-Umgebung wurden beim vorherigen Stand 2.796 und beim neuen 2.798 Tests erfasst. Beide meldeten **dieselben acht Fehler und elf übersprungene Tests**. Bei der gezielten Wiederholung aller acht mit UTF-8 für Python bestanden die sieben Excel-Fälle auf beiden Ständen. Auf beiden bleibt derselbe bestehende Fehler bei der Liste der Werkstattseiten. Damit ist im direkten Vergleich kein neu fehlgeschlagener Test aufgetreten. [Vollständiger Gegenlauf und Wiederholung](Gesamttests.json)

Im Browser wurden zwei Texte, zwei Originalzierlinien und das echte Ring-Gerätefoto auf derselben SKU geprüft. Je Bild stimmen alle 24 geprüften Gerätepixel. Die Bilder bleiben den Positionen auch nach Vergrößerung, im Drawer, beim Entfernen einer anderen Position und nach Neuladen korrekt zugeordnet. Im Warenkorb sind Vergrößern und Entfernen verfügbar. [PC](Warenkorb-PC.png) · [Handybreite](Warenkorb-Mobil.png)

Weitere Warenkorb- und Exportprüfungen auf beiden Ständen betrafen Edelstahl „Heimathafen“ (10,99 €, Text und Motiv verschoben), Schiefer (33,98 €, Foto hochgeladen und verschoben) und Acryl (14,99 €, Foto hochgeladen). Preise, wirksame Optionen und wiedergewonnene Fotooriginale stimmen überein. Bei allen drei Produkten war die SVG, bei Acryl auch die Druck-PDF bytegleich. PyMuPDF öffnete jede heruntergeladene PDF. Die Kontur-Seiten maßen bei Edelstahl 90 × 60 mm, bei Schiefer 300 × 200 mm und bei Acryl 150 × 200 mm. Auch die entpackten PDF-Zeichenanweisungen der jeweiligen Seite sind bytegleich. Das vollständige ZIP wurde mit seinem Manifest gelesen. Separat angelegte Entwürfe erhalten eigene Kennungen und Pakete. Der Test zum signierten Bestelleingang prüft die unveränderliche gekaufte Revision bis zu den Fertigungsdateien. [Materialprüfungen](Materialexporte.json)

## Nachmessen

Die beiden Git-Arbeitskopien verwenden die oben genannten Commitstände. Benötigt werden Node 24, Chrome/Playwright, die Python-Bibliotheken des Projekts einschließlich `app/workshop/requirements-logo.txt`, der ursprüngliche Ring-Katalog und das Schieferregister der Beta. Vor den folgenden Befehlen `GRAVURU_KATALOG`, `GRAVURU_SCHIEFERREGISTER` und `GRAVURU_PYTHON` setzen. In jeder Kopie einen eigenen lokalen Prüfdatenordner als `GRAVURU_BETA_DATA` wählen. Das Messwerkzeug stammt aus dem Verzeichnis dieses Berichts im PR.

```powershell
# In jeder Arbeitskopie separat starten. Das Messmodul stammt aus dem Testpaket.
$messmodul=[Uri](Get-Item /pfad/zum/pr/tools/beta-267/server-timing.mjs).FullName
node --import $messmodul.AbsoluteUri tools/beta-267/preview.mjs 18280
# Für den zweiten Stand einen anderen Port verwenden, z. B. 18283.
```

```powershell
# Aus der Arbeitskopie mit den Messwerkzeugen starten.
$env:BETA_PHASES='1'
$env:BETA_RING_ONLY='1'
$env:BETA_CART_RUNS='1'
$env:BETA_SAVE_DATA='1'
$env:BETA_MOBILE_THROTTLE='1'
node tools/beta-267/check-hosted.cjs http://127.0.0.1:18280 ./messung/1-vorher
node tools/beta-267/check-hosted.cjs http://127.0.0.1:18283 ./messung/1-nachher
# Zwei weitere Paare mit der oben angegebenen Reihenfolge ausführen.
node tools/beta-267/measure-archived-c.cjs /pfad/zu/Funkklingel-Variante-C ./messung/alt-c.json
$env:BETA_CART_RUNS='3'
node tools/beta-267/measure-native-checkout.mjs /pfad/zur/referenz /pfad/zum/kandidaten ./messung/shopify.json
node tools/beta-267/check-material-cart.cjs http://127.0.0.1:18280 ./messung/material-vorher
node tools/beta-267/check-material-cart.cjs http://127.0.0.1:18283 ./messung/material-nachher
$files=(Get-Content -Raw docs/handoffs/2026-11-19-beta-267/tempo/Regression.json | ConvertFrom-Json).testFiles
node --test --test-concurrency=2 @files
```

Für die HTTPS-Wiederholung auf der freigegebenen Beta die beiden Drosselvariablen auf `0` setzen und das private Testkennwort als `BETA_REVIEW_PASSWORD` nur im Prozess bereitstellen. Im Vergleich je Stand `BETA_CART_RUNS=3` verwenden. Der gesonderte Übertragungstest verwendet zusätzlich `BETA_DEVICE=Mobil` und `BETA_TRANSFER_PHASES=1`. Auf jedem Stand bleiben die Eingaben und die Messgrenzen identisch.

## Verfügbarkeit und Rückweg

Alle vier Prüferzugänge wurden bestätigt. Ohne Anmeldung antworten Einstieg, Editor und Sitzung mit HTTP 401. Anwendung, Konto und Datenbestand sind von Mitarbeiter-App und Shopify getrennt. Die beiden zuvor und danach per HTTPS gelesenen Laufzeitdateien stimmen jeweils mit ihrem Git-Stand überein. Die geschützte Messrunde wurde am 19. November um 15:51 UTC bestätigt. Rückweg ist das im privaten Beta-Webspace hinterlegte Paket für `347aa63f`, SHA-256 `e0add4de7b91568be42bba643dd7ffce410a12a4125efaad35ea1ae468467ae6`. Das neue Anwendungspaket hat SHA-256 `fbe347761ce416a1e41b956e69dee834f16bab7cd33eb6edb5bc0991f721f611`. Ein Rückwechsel betrifft nur die Anwendung dieses Prüfstands. [Zugangsprüfung und Dateihashes](Zugangspruefung.json) · [Bestätigung in #267](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7014283025)
