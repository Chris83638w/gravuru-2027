# Prio R15 im regulären Shopify-Shop

**129 Artikel haben einen normalen R15-Einstieg mit Werkstatt- und Kassenbindung.** Davon sind 88 im Shop aktiv und 41 bereits veröffentlichte Hochformat-Klingelschilder nur per Direktlink erreichbar. Die anklickbare Liste nennt zu jedem Produkt die Anzahl der Varianten, die Profilrevision und die Art der Prüfung. Das Inventar enthält auch alle Entwürfe und Ausnahmen. [Prüfliste für Chris](Pruefliste.md) · [Vollständiges Inventar](Artikelinventar.csv)

## Selbst ausprobieren

Auf der normalen Produktseite „Jetzt personalisieren“ antippen, einen eigenen Text eingeben, in den Warenkorb legen und auf das Bild tippen. Es öffnet sich die vergrößerte persönliche Gestaltung. Für den Blick in die Kasse reicht „Zur Kasse“. [Ring](https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert) · [AOSU](https://gravuru-design.myshopify.com/products/klingelschild-aosu-pro-v8p1ax11-querformat-24x20-personalisiert) · [Eufy](https://gravuru-design.myshopify.com/products/klingelschild-eufy-1080p-t8220-querformat-24x20-personalisiert) · [Edelstahl](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen) · [Acryl mit Baum](https://gravuru-design.myshopify.com/products/familienschild-acryl-baum-12x8-personalisiert)

Die 22×14-Demo ist die von Chris bestimmte visuelle Referenz. Der veröffentlichte Edelstahlartikel nutzte die Prio-Bedienung bereits. Beim Ring wurde zuerst der reguläre Einstieg einzeln umgestellt, anschließend die zentrale Darstellungswahl im bestehenden signierten R15-Einstieg für die gebundenen Produkte. Jeder Artikel lädt sein eigenes Profil. Claude bestätigte die Produktdaten der Ring-Ansicht und las die beiden einzelnen Positionen von Testauftrag #1035 in Shopify zurück. [Originalansicht](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r15/22x14.html?fresh=1) · [PC-Ansichten](Oberflaeche-PC.png) · [Handyansichten](Oberflaeche-Mobil.png) · [Claudes Befund](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7032020259)

## Motive ohne Scrollen

Seit dem 20. November 2026 hat die offene Motivauswahl im Prio R15 eine gemeinsame Zeile für die vier Schnellkategorien und das Kategorienmenü. Das Infosymbol steht neben der Suche. Beim Schließen mit „Fertig“ erhält die Schildvorschau ihre bisherige Größe zurück. Zum Ausprobieren auf der Produktseite „Jetzt personalisieren“ und anschließend „Motive“ öffnen. [Edelstahl-Türschild im Shop](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen)

| Browserfenster | Vollständige, geladene und auswählbare Motive vorher | Live |
|---|---:|---:|
| 320 × 568 | 0 | 3 |
| 360 × 640 | 0 | 3 |
| 390 × 844 | 3 | 6 |
| 1440 × 900 | 3 | 12 |

Gemessen über die normale Produktseite in neu geöffneten Chrome-Sitzungen mit den angegebenen Fenstergrößen. Eine Kachel zählt, sobald das Bild geladen, die Auswahl aktiv und die Karte oben, mittig und unten vor der festen Navigation erreichbar ist. Die Liste stand bei allen Messungen ganz oben. Ab dem ersten sichtbaren Raster benötigten die Bilder in den vier Live-Durchläufen bis zu 1,54 Sekunden. [360 Pixel vorher](Motive-360-vorher.png) · [360 Pixel live](Motive-360-live.png) · [390 Pixel live](Motive-390-live.png) · [Messwerte](Motive-Sichtpruefung.json)

Bei Edelstahl und Ring wurden Suche, Info, Schnellwahl, alle 48 Kategorien, Tastaturauswahl, Motivübernahme und erneutes Öffnen über den öffentlichen Shop geprüft. Das Edelstahl-Türschild zu 19,99 € mit dem zusätzlichen Motiv „Haus“ kam vor und nach der Änderung mit 21,68 € und eigenem Bild bis in die Shopify-Kasse. Der ausschließlich für die offene Motivauswahl geänderte Stil lässt sich einzeln zurücknehmen. [Änderung](https://github.com/Chris83638w/gravuru-2027/commit/2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179)

Für eine Wiederholung am Shop `node tools/beta-267/check-visible-motifs.cjs ./motivpruefung` mit Playwright und Chrome ausführen. Das Programm speichert für jede Fenstergröße den Bildschirm und die Messwerte. [Browserprüfung](../../../../../../tools/beta-267/check-visible-motifs.cjs)

## Bestellungen, persönliche Bilder und Werkstatt

| Artikel | Geprüfter Kundenweg | Ergebnis |
|---|---|---|
| Ring Wired Pro, 160 × 280 mm | Zwei verschiedene Texte und Designs derselben Variante auf PC und Handy, zunächst über die geschützte Prüfung, dann über die normale Produktseite | Zwei einzelne Entwürfe, persönliche Bilder und je 49,99 €. Beide Bilder an der Kasse bestätigt. Das Original ließ sich auf 952 × 1600 Pixel vergrößern. Das Entfernen einer Position ließ nach Neuladen die richtige zweite Position bestehen. |
| Shopify-Testbestellung #1035 | „Haus Nord 12“ und „Haus Süd 27“ mit derselben Ring-Variante | Zwei Positionen und Revisionspakete im Werkstatteingang, passende SVGs und PDFs. |
| Shopify-Testbestellung #1036 | AOSU Pro 24 × 20 cm mit eigenem Text | Artikel 59,99 €, bestehender Versand 7,45 €, Testbestellung 67,44 €. Eine Position, sieben zugeordnete Archivdateien, Werkstatteingang ohne Zuordnungsfehler. |
| Weitere Familien | AOSU Hochformat per Direktlink, Eufy Querformat, Edelstahl und beide Acrylartikel | Auf dem PC und bei 390 Pixel Handybreite über den normalen Produktbutton getestet. Shopify zeigte die jeweilige persönliche Vorschau im Warenkorb und in der Kasse. |

Für beide Testbestellungen wurde der bereits eingerichtete Shopify-Testzahlungsweg verwendet. Die Prüfung umfasste den Eingang in der Werkstatt. Es wurde kein Maschinenlauf ausgelöst. [Ring-Bestelleingang](Ring-Werkstatt.json) · [Ring-SVG und PDF](Ring-SVG-PDF.json) · [Ring-Kassenbilder](Kasse-Ring-Bilder.json) · [AOSU-Bestelleingang](AOSU-Werkstatt.json) · [Vergrößern und Entfernen](Zoom-Entfernen.json) · [Browserprüfungen je Familie](Produktfamilien-Shoptest.json)

Die Funkklingel-Vorschau im Editor verwendete schon die vorhandene WebP-Textur des gebürsteten Edelstahlrahmens. Der persönliche Bildexport bettet diese Textur jetzt bei neuen Entwürfen mit ein. Beim normalen Ring-Kundenweg wurde die richtige Ressource beim Export mit HTTP 200 geladen und das zugehörige Bild im echten Checkout angezeigt. Die optische Abnahme übernimmt Chris. [Materialkorrektur](https://github.com/Chris83638w/gravuru-2027/commit/6907c1f74f4c004a2e9bba8cf796079608a4dff8) · [Öffentlicher Prüfnachweis](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7032520240)

Beim Acrylglas wechselte mit jedem Zeichnen die interne Nummer eines Vorschaufilters. Die Layoutprüfung meldete eine Änderung selbst bei identischer Gravur. Sie erkennt diesen Filter jetzt unabhängig von seiner laufenden Nummer. Geometrie, Inhalt, individuelle Filter und Bestätigung echter Überlagerungen werden weiter geprüft. Beide Acrylartikel erreichten anschließend mit ihrem eigenen Entwurf zu 14,99 € den Warenkorb und die Kasse. [Acrylkorrektur und Regressionstest](https://github.com/Chris83638w/gravuru-2027/commit/02c80062433a70e7789f5b5550c4e6bf5050b842)

## Preis- und Variantenabgleich

Bei 84 aktiven Klingelschildern passten die Werkstattfreigaben und die bestehenden Shopify-Preise. Es fehlte das Preisfeld der Shopify-Kassenprüfung. Für alle 10.080 Varianten wurden die drei vorhandenen Preisquellen sowie Referenz und feste Produktrevision abgeglichen. Nach dem Pilotkauf folgten die übrigen Einträge. Für jede Variante wurden die Mengen 1, 2, 5 und 99 sowie die Zurückweisung eines unvollständigen Entwurfs geprüft. [Abgleich der 84 Artikel](Kassenabgleich-84.json)

Die 41 Hochformat-Produkte waren bereits in Shopify veröffentlicht und über Direktlinks erreichbar. Für alle lagen die gespeicherte Freigabe `chris-chat-ui-live-20261029`, der bestätigte Dokumentstand 2 sowie 120 zugehörige Varianten vor. Alle 4.920 Preise stimmten mit der bestehenden Werkstattbindung und Shopify überein. Nach dem Pilot am AOSU Pro für 49,99 € wurden die fehlenden Kassenfelder je Artikel gesetzt und nochmals über die besitzende App gelesen. Der Sichtbarkeitsstatus hat sich dadurch nicht geändert. Die zehn weiteren Direktlink-Produkte besitzen keine R15-Bindung. Die vollständige Liste nennt sie einzeln. [Abgleich der 41 Artikel](Kassenabgleich-41.json) · [Gespeicherte Freigabe vom 29. Oktober](https://github.com/Chris83638w/gravuru-2027/blob/7762f94c/docs/handoffs/2026-10-29-funkklingeln-live-abschluss-astra.md) · [Bediente Preiswege](https://github.com/Chris83638w/gravuru-2027/commit/7762f94ceb41f5986dfbe420e7834cbc0e52fa65)

## Wartezeit im richtigen Prio

Die vier früheren Normalshop-Ringdurchläufe auf der neu aktivierten Prio-Leiste lagen bei 5,54–6,25 Sekunden bis zum persönlichen Bild. Die vier geschützten Läufe lagen bei 5,21–6,88 Sekunden. Die ersten Edelstahlprüfungen lagen bei 12,07 und 12,48 Sekunden. In den Funktionsprüfungen nach den Korrekturen dauerte es beim Acrylglas 25–34 Sekunden. Das sind einzelne Beobachtungen über das Internet. Der Nachweis eines durchgängigen Fünf-Sekunden-Ziels steht aus. Vor weiteren Tempoexperimenten prüft Chris persönlich. [Einzelwerte der Ringprüfung](Prio-Warenkorb.json) · [Weitere Funktionsläufe](Produktfamilien-Shoptest.json) · [Grok/Cursors Zeitaufschlüsselung](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7032168086)

## Wiederholung und Rückweg

Die Kundenprüfung beginnt auf der normalen Produktseite. Für den ausführlichen Ring-Durchlauf setzt das vorhandene Browserprogramm `R15_PRIO_UI=1`, `R15_SMALL=1`, `R15_PREVIEW_ONLY=1` und `R15_CHECK_PHOTO=1`. Der Aufruf `node tools/beta-267/measure-live-r15.cjs eigener-messname cart 1 /absoluter/ausgabeordner` legt eigene Testpositionen an. Für den gemeinsamen geschützten Einstieg kommt `R15_PRIO_BETA=1` hinzu. Die Prüfseite liegt im privaten Anwendungsordner neben dem Startmodul und wird erst nach Anmeldung ausgeliefert. [Browserprogramm](../../../../../../tools/beta-267/measure-live-r15.cjs) · [Gemeinsame Prüfseite](https://konfi-beta.gravuru-designwerkstatt.de/prio-pruefung.html) · [Zugangsrücklesung](Zugangspruefung.json)

Die Darstellungswahl und die Preisbindung haben getrennte, gesicherte Startstände. Die beiden Änderungen am Kundeneditor haben eigene Vorherkopien und inhaltlich benannte Browserpakete. Vor jeder Umschaltung wurde das Rücksetzen an einer Kopie ausgeführt. Der Kassenoperator sichert je Produkt den Originalzustand und bestätigt die geschriebenen Werte. Sein Einzelrückweg prüft zuerst Besitzer-App, Produkt, Stand und Prüfsumme. Persönliche Entwürfe und historische Bestellpakete werden dabei nicht neu geschrieben. [Ring-Pilot](https://github.com/Chris83638w/gravuru-2027/commit/208dcc83) · [Zentrale Prio-Wahl](https://github.com/Chris83638w/gravuru-2027/commit/b733dee1) · [Einzeloperator](https://github.com/Chris83638w/gravuru-2027/blob/7762f94c/ops/plesk/repair-ring-checkout-pricing.mjs)
