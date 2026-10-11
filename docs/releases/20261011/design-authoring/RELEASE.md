# Eigene Gestaltung und sichtbare Musterfotos

Der bisherige PDF-Import erzeugte eine einzige feste Grafik. Im Händlereditor fehlten Befehle für neue Texte, Motive, Fotofelder und das Entfernen vorhandener Elemente. Zusätzlich färbte die Gravurvorschau jedes sichtbare Pixel einer importierten Grafik gleich ein: Ein eingebettetes Foto wurde zur geschlossenen Fläche. Frühere Prüfungen des Imports und der Anmeldung deckten diesen Gestaltungsablauf nicht ab.

Veröffentlicht auf dem getrennten Händlerhost am 11.10.2026: Quellcommit **`74e767062ff6b45e9ddde07f8283924c4379f218`**, Version **`0.1.0-recovery.20261010+74e767062ff6`**. HTTPS und die ausgelieferten Dateien anhand SHA-256 bestätigt. [Installationspaket und Prüfsumme](../../../../deliverables/merchant-authoring-20261011/README.md).

## Änderung

- Eigene Designs als zusätzliches Standarddesign anlegen; vorhandene Designs bleiben erhalten. Namen ändern, native Texte und Fotofelder hinzufügen, Motive aus der vorhandenen Bibliothek auswählen oder eigene SVG/PDF-Motive hochladen.
- Motive ersetzen, Elemente in mm positionieren und skalieren, direkt auf der Platte verschieben, nach vorne/hinten stellen und entfernen. Elementaktionen können vor weiteren Änderungen zurückgenommen werden. Kundenrechte bleiben getrennt; technische Sperren bleiben wirksam. Ein Design enthält weiterhin 1–20 Elemente.
- Fotofelder mit Rechteck-, Oval-/Kreis- oder Bogenform und eigenem Beispielfoto. JPG/PNG/WebP werden serverseitig geprüft. Die unveränderten Uploadbytes und ihre Zuordnung bleiben in der privaten Datenbank; eine getrennte PNG-Vorschau sorgt auch bei WebP für einen lesbaren SVG-Inhalt.
- Importierte Grafiken erhalten in der Gravurvorschau Tonwertabstufungen statt einer vollständig deckenden Einfärbung. Transparenz bleibt erhalten. Unveränderte Originaldateien und gespeicherte Produktionsquellen werden nicht ersetzt; die Vorschau ist keine Maschinenabnahme.
- Die Bibliotheksmotive werden durch denselben abgesicherten Import wie eigene Dateien in unveränderliche Ressourcen überführt. Die bestehende strenge Prüfung nativer Ressourcen bleibt bestehen.

## Bedienung

Produkt öffnen → **Designs & Elemente**. **Eigenes Design anlegen** erhält die vorhandene importierte Referenz. Mit **+ Text**, **+ Motiv** und **+ Fotofeld** die neue Gestaltung zusammenstellen; bei Motiven stehen Bibliothek und eigener Upload zur Verfügung. Fotofeld auswählen → **Bild ersetzen**. Position und Größe stehen direkt im rechten Bereich; Verschieben geht zusätzlich durch Ziehen auf der Platte. Danach **Änderungen speichern**.

Ein PDF/SVG-Import bleibt eine zusammenhängende Grafik. Seine enthaltenen Buchstaben und Fotos werden nicht automatisch zu einzelnen Feldern. Zum freien Neugestalten stehen die nativen Elemente und ein zusätzliches eigenes Design zur Verfügung. Das Entfernen der importierten Grafik beendet nur ihre Zuordnung im aktuellen Entwurf; Original und ältere Revisionen bleiben erhalten.

## Prüfung und Veröffentlichung

649 Regressionstests ohne Fehler, anschließend fünf gezielte Prüfungen einschließlich mehrerer unveränderlicher Fotooriginale mit identischer Vorschau bestanden. Der erweiterte Browserlauf prüft eigene Designs, Texte, Bibliotheks-/Uploadmotive, Ziehen, WebP-Beispielfoto, Entfernen/Rücknahme, Speichern/Wiederöffnen und Mobilansicht; 207 authentifizierte API-Aufrufe, keine JavaScript-Fehler. Der Fotovergleich nutzt die tatsächlich neu importierte Original-PDF in einer privaten Kopie: Der geprüfte Fotobereich enthält wieder 766 statt eines Farbwerts. Frische isolierte Installation/Start sowie synthetischer Bestelleingang einschließlich doppelter Zustellung nach Neustart bestanden. Auf dem Zielserver sind alle 396 Manifestdateien geprüft und die private Laufzeitkonfiguration bestätigt. Tests mit synthetischer Shopify-Identität sind keine Abnahme der echten Nutzeranmeldung. Der authentifizierte Browser des Nutzers ist hier nicht fernsteuerbar.

## Sicherung

Vor der Änderung wurden alle drei aktuellen Händlerdatenbanken per SQLite-Online-Backup auf dem Server gesichert und privat in dieser Cloud nach SHA-256 und `quick_check` verifiziert. Die neuere Produktrevision 3 einschließlich des zuletzt importierten Originals ist enthalten. Private Datenbanken, Originalfotos und Zugangsdaten werden nicht in Git veröffentlicht. Historische, bereits als unerreichbar dokumentierte Cloud-/Windows-Dateien sind dadurch nicht neu verfügbar geworden; siehe den vorhandenen Wiederherstellungsnachweis.

## Gesicherter Endstand

Alle 396 installierten Manifestdateien mit dem geprüften Quellstand identisch. Fünf Produktrevisionen, zwei Profilrevisionen, 20 Originalquellen, 20 Designvorschauen und ein Rohlingbild unverändert erhalten. Das ausgewählte Produkt steht weiterhin auf seiner vom Nutzer gespeicherten Revision 3; die Veröffentlichung erzeugt keine neue Gestaltung und überschreibt keine Nutzeränderung. Diese Revision enthält das flache PDF und besitzt keine eigenen Shopify-Preisbindungen. Bestehende ältere Testbestellstände werden nicht auf die neue Revision umgebunden.

Zusätzliche private Sicherung direkt vor der Aktivierung: alle drei Datenbanken, vorherige Startdatei/Konfiguration und vollständiges Laufzeitarchiv (54.527.200 Bytes, SHA-256 `101b7b73b4f759d490b89aa477e82a980d83fa84edd4edafd705262d40fa0bab`). Nach dem Start erneutes Serverbackup, zusätzlich privat in dieser Cloud mit Prüfsummen/SQLite-Integrität abgelegt. Die neue leere Zuordnungstabelle für Fotooriginale erklärt die geänderte Dateiprüfsumme der Ressourcendatenbank; sämtliche bisherigen Zeilen sind unverändert.

Der erste Aktivierungsversuch wurde vor Schreibzugriffen wegen des noch laufenden Händlers gestoppt. Nach Prüfung und Beendigung ausschließlich dieses Prozesses wurde aktiviert. Der HTTP-Verwaltungsaufruf lief beim Archivieren in sein Zeitlimit; ein separater Prozess-/Belegabruf bestätigte den Abschluss, ohne die Aktivierung doppelt auszuführen. Die bisherige Kundenwerkstatt und Shopify-App-Konfiguration wurden nicht geändert. Kein echter Testkauf, keine Abbuchung oder Produktionsauslösung in diesem Paket.

[Browsernachweis](browser.json) · [Regression](regression.json) · [Installation](package-install.json) · [Bestelleingang mit synthetischen Daten](order-package.json) · [HTTPS](https.json) · [Datenerhalt](preservation.json).
