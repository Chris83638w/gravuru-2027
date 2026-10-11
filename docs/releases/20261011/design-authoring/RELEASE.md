# Eigene Gestaltung und sichtbare Musterfotos

Der bisherige PDF-Import erzeugte eine einzige feste Grafik. Im Händlereditor fehlten Befehle für neue Texte, Motive, Fotofelder und das Entfernen vorhandener Elemente. Zusätzlich färbte die Gravurvorschau jedes sichtbare Pixel einer importierten Grafik gleich ein: Ein eingebettetes Foto wurde zur geschlossenen Fläche. Frühere Prüfungen des Imports und der Anmeldung deckten diesen Gestaltungsablauf nicht ab.

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

649 Regressionstests ohne Fehler, anschließend fünf gezielte Prüfungen einschließlich mehrerer unveränderlicher Fotooriginale mit identischer Vorschau bestanden. Der erweiterte Browserlauf prüft eigene Designs, Texte, Bibliotheks-/Uploadmotive, Ziehen, WebP-Beispielfoto, Entfernen/Rücknahme, Speichern/Wiederöffnen und Mobilansicht; 202 authentifizierte API-Aufrufe, keine JavaScript-Fehler. Der Fotovergleich nutzt die tatsächlich neu importierte Original-PDF in einer privaten Kopie: Der geprüfte Fotobereich enthält wieder 766 statt eines Farbwerts. Installations- und Veröffentlichungsnachweise folgen nach Paketprüfung. Tests mit synthetischer Shopify-Identität sind keine Abnahme der echten Nutzeranmeldung. Der authentifizierte Browser des Nutzers ist hier nicht fernsteuerbar.

## Sicherung

Vor der Änderung wurden alle drei aktuellen Händlerdatenbanken per SQLite-Online-Backup auf dem Server gesichert und privat in dieser Cloud nach SHA-256 und `quick_check` verifiziert. Die neuere Produktrevision 3 einschließlich des zuletzt importierten Originals ist enthalten. Private Datenbanken, Originalfotos und Zugangsdaten werden nicht in Git veröffentlicht. Historische, bereits als unerreichbar dokumentierte Cloud-/Windows-Dateien sind dadurch nicht neu verfügbar geworden; siehe den vorhandenen Wiederherstellungsnachweis.
