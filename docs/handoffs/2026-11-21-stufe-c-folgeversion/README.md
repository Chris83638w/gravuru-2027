# Stufe C im Shop am 21. November 2026

Shopify hat Claudes Korrektur `4fbf2e61` um 14:56 Uhr (Bukarest) als Version `gravuru-2027-stufe-c-4fbf2e61-beide` mit der ID `1260601606145` freigegeben. Die aktive Version enthält elf Module. Der vollständige Vergleich bestätigt die neun bestehenden Module, 21 Theme-Dateien und die bisherigen Berechtigungen einschließlich `write_orders`. Die tatsächlich übertragenen Binärdateien für Preisberechnung und Kassenprüfung stimmen mit den gesicherten Dateien überein. Der Server und der R15-Editor liefen während der Freigabe auf `815a0cfb`. [Shopify-Versionsvergleich](shopify-version.json)

## Was Käufer und Mitarbeiter sehen

Die drei Bilder gehören zur Shopify-Testbestellung #1042 über das vorhandene Testgateway. Der Artikel ist ein Acryl-Familiennamensschild mit Baum und der Gravur „Claudetest Altmann“. Die Bildadresse ist der betreffenden Bestellposition zugeordnet.

- Auf der Danke-Seite erscheint die persönliche Gestaltung direkt an der Bestellposition. Darunter steht „Bitte prüfe die Schreibweise.“ Ein Antippen öffnete das positionsrichtige Original mit 1600 × 1102 Pixeln. [Danke-Seite](danke.png)
- Im angemeldeten Käuferkonto lässt sich dieselbe Gestaltung über die Bestellübersicht aufrufen. Die Scrollaufnahme verbindet zwei überlappende Originalausschnitte der Position. Interne Angaben sind grau abgedeckt. [Bestellstatus im Kundenkonto](bestellstatus.png)
- Im angehefteten Block „Gravuru Gestaltung“ sehen Mitarbeiter das Bild. „Gestaltung ansehen“ führt zum Original. „Fertigungsdatei“ öffnet die Werkstatt mit PDF, PDF mit Kontur, SVG und SVG mit Kontur. Shopify bietet am Desktop „Mehr anzeigen“ an, um die Karte vollständig zu öffnen. [Bestellseite der Mitarbeiter](bestellverwaltung.png)

## Prüfungen und Rückweg

In der aktiven Konfiguration „Gravuru Design configuration“ steht „Gravuru Gestaltung prüfen“ nach erneutem Öffnen jeweils genau einmal auf „Dankeschön“ und „Bestellstatus“. Der Adminblock ist für die Mitarbeiter angeheftet. Im Checkout-Editor enthielten ein gewöhnlicher Musterartikel auf der Danke-Seite und zwei auf der Statusseite jeweils die reguläre Artikelanzeige. Der Fall einer Bestellung ganz ohne Gravuru-Position wurde am Adminblock automatisiert mit dem Hinweis „Diese Bestellung enthält keine Gravuru-Gestaltung.“ geprüft. Alle 23 im Shop vor dem Sichttest vorhandenen Testbestellungen enthielten Gravuru-Positionen.

Die 78 Quelltests des Auftrags bestanden mit den Originaldateien unter Linux. Beim ersten Testkauf #1041 konnten wir das Originalbild aus der Danke-Seite öffnen. Die Bildschirmaufnahme zeigte noch den Ladevorgang. Für die vollständige Sichtprüfung wurde die Bestellung im selben Testgateway als #1042 wiederholt. Bei beiden Testbestellungen führte der Werkstattlink aus einer frischen Browsersitzung zu Shopifys Anmeldeweg und der vorgeschalteten Sicherheitsprüfung. Die angemeldete Mitarbeiteransicht öffnete die Fertigungsdateien der Testposition.

Für eine Rücknahme kann „Gravuru Gestaltung prüfen“ im Checkout-Editor von beiden Seiten entfernt und „Gravuru Gestaltung“ auf der Bestellseite gelöst werden. Der gesicherte vorherige App-Stand ist `gravuru-2027-stufe-c-20261121-scope`, ID `1260442845185`, mit neun Modulen und `write_orders`. Sein Vergleichswert steht im Versionsbeleg.
