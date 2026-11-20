# Live-Abnahme des Ring-Referenzartikels am 19. November 2026

Die Messungen und Bestellungen auf dieser Seite gehören zum Ring-Shopartikel. Er öffnet die native Werkzeugleiste des gemeinsamen Kerns. Die bestätigten Zeiten für die Prio-Werkzeugleiste und deren Verbindung zum Warenkorb stehen im gesonderten Edelstahl-Nachweis. [Echter Prio-Konfi im Shop](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen) · [Prio-Prüfung](../prio/README.md)

Shopify nahm vor und nach der letzten Optimierung je zwei verschiedene Gestaltungen derselben Ring-Variante an. Die Testbestellungen **#1033** und **#1034** erreichten die Werkstatt über den normalen Zahlungseingang. Der Zeitvergleich vom letzten Klick bis zu den sichtbaren persönlichen Bildern ergab **6,59 s vorher und 5,57 s nachher**. [Veröffentlichter Ring-Artikel](https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert) · [Produktionscode](https://github.com/Chris83638w/gravuru-2027/commit/b36a8eef) · [Koordination in #267](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7021750493)

## Was im Browser schneller wurde

Die Zeitangaben sind Mediane, die Spanne ist gesondert ausgewiesen. Unmittelbar vor und nach dem Wechsel wurden je zwölf personalisierte Artikel hinzugefügt, je zwei pro frischem Warenkorb. Die Uhr stoppt, nachdem der Browser die passenden Vorschaubilder im Warenkorb dekodiert hat.

| Messpunkt | Vergleichsstand | Veröffentlicht |
| --- | ---: | ---: |
| PC, bis zum persönlichen Bild im Warenkorb | 6,26 s | 5,50 s |
| Handybreite, bis zum persönlichen Bild im Warenkorb | 6,76 s | 5,74 s |
| Alle zwölf Warenkorbzeiten | 6,59 s | 5,57 s |
| Kürzester bis längster Warenkorbvorgang | 5,76–7,91 s | 5,43–6,50 s |
| Warten auf das von Shopify bestätigte Kassenbild | 2,14 s | 1,42 s |

Über den gesamten Auftrag sank der Designwechsel von **977 auf 191 ms**. Vom Klick auf „Jetzt personalisieren“ bis zur erreichbaren Designauswahl vergingen in denselben äußeren Reihen **4,82 s und 3,53 s**. Die Stichprobenkarte im Datensparmodus blieb im Ausgangszustand in acht von acht Versuchen über drei Sekunden leer. Am Endstand erschien sie in acht von acht Versuchen. Der Median ab Scrollen in den sichtbaren Bereich betrug 26 ms. Die Handywerte stammen aus Chrome bei 390 × 844, die PC-Werte bei 1440 × 960. [Einzelzeiten, Bildschirmprofile und abgebrochene Zusatzreihen](Messreihen.json)

Der letzte persönliche Warenkorb war vor Ende der Nachprüfung sichtbar. Beim zusätzlichen Abruf eines seiner Originalbilder unterbrach die Verbindung. Daher liegen zwölf Kundenzeiten und elf vollständig abgeschlossene zusätzliche Bildprüfungen aus dieser Reihe vor. Alle zwölf gespeicherten Fertigungspakete wurden anschließend separat gelesen. Eine weitere Reihe mit vier vollständigen Positionen ergab 5,75 s im Median. Bei weiteren Wiederholungen drosselte Shopify die Prüferverbindung und forderte eine Verbindungsprüfung an. Ein Wert unter fünf Sekunden wurde in den beiden unmittelbar verglichenen Zwölferreihen nicht erreicht. [Messreihen](Messreihen.json) · [Fertigungspakete](Fertigung.json)

## Ursachen und einzeln ausgelieferte Änderungen

| Engpass | Änderung am bestehenden R15 | Nachweis |
| --- | --- | --- |
| Die sichtbare Designkarte wartete auf Schrift-/Motivkonturen. Beim Zeichnen analysierte R15 dieselben Grafiken und das physische Profil wiederholt. | Fehlende Konturen für sichtbare Karten laden. Beim Zeichnen das bereits gewählte Profil sowie die vorhandene Originalkarte wiederverwenden. | In 72 kontrollierten Wechseln sank die Zahl der SVG-Analysen je Wechsel im Median von 63 über 25 auf 13. Die drei Stände benötigten in diesem Zusatzvergleich 202, 194 und 192 ms. |
| R15 startete zwei Bildprüfungen für das Kundenbild und das Referenzbild. | Beide Bilder mit den bestehenden Bildregeln in einem Arbeitsprozess aufbereiten. | Serverzeit der Vorschauvorbereitung im Live-Vergleich von 544 auf 441 ms. Bei zwölf abwechselnden Durchläufen mit denselben Dateien sank die Zeit von 363 auf 322 ms. Sämtliche ausgegebenen Bilddateien waren Byte für Byte gleich. |
| Die Freigabe des persönlichen Shopify-Bildes lag auf dem Weg vom Klick zum sichtbaren Warenkorb. | Shopify kann unmittelbar nach dem gesicherten Entwurf mit dessen festem Original beginnen. Die Übergabe übernimmt weiterhin erst die bestätigte persönliche Shopify-Datei. Die Warenkorbzeile fordert die zum Bildschirm passende Bildbreite an. | Direkter Zeitgewinn im Median 1,03 s beziehungsweise 16 %. Ein früherer 12,64-s-Fall umfasste 8,14 s Wartezeit auf Shopify. |

Die Datenbank schrieb den Entwurf in der direkten Vorher-/Nachher-Reihe im Median in 9,46 bzw. 10,32 ms. Auf dem Produktionshost begründete dieser Messwert weder eine höhere Hosting-Grenze noch eine Änderung der Schreibsicherheit. [Einzelvergleiche](Einzelvergleiche.json) · [Erste fünf Auslieferungen](../README.md)

## Echte Bestellungen und Fertigung

| Bestellung | Zeitpunkt im Test | Shopify | Werkstatt |
| --- | --- | --- | --- |
| #1033 | Vor der letzten Tempoänderung, nach der Ring-Kassenreparatur | Zwei persönliche Artikel zu je 49,99 €, Testzahlung bestätigt, unversandt | Zwei richtige Revisionen angenommen, null Positionsfehler |
| #1034 | Nach der letzten Tempoänderung | Zwei persönliche Artikel zu je 49,99 €, Testzahlung bestätigt, unversandt | Zwei richtige Revisionen angenommen, null Positionsfehler |

Alle 15 Warenkorbangaben je Position stimmten mit den gespeicherten Bestellangaben überein. Die Kasse zeigte bei jeder Bestellung zwei unterschiedliche persönliche Bilder. Alle vier verknüpften Shopify-Bilder waren in voller Auflösung pixelgleich mit den gespeicherten R15-Originalen (952 × 1600 Pixel). Die Werkstatt meldete für alle vier Positionen den Teststatus, ohne Freigabe für die physische Fertigung. Die gespeicherten Pakete stimmen mit den Prüfsummen der jeweiligen Bestellpositionen überein. Aus beiden Gestaltungen entstanden die Gravur-SVG sowie getrennte SVGs und PDFs für Edelstahl und Acryl in 160 × 280 mm. Beim PDF-Vergleich wurde ausschließlich der Erstellungszeitpunkt normalisiert. [Shopify- und Werkstattbelege](Bestellnachweis.json) · [Dateivergleich](Fertigung.json)

Auf PC und Handybreite zeigte die veröffentlichte Warenkorbseite beide persönlichen Bilder. Die Vergrößerung öffnete das zugehörige Original mit 952 × 1600 Pixeln. Der Klick auf „Entfernen“ bei „Haus Nord 12“ ließ „Haus Süd 27“ zu 49,99 € übrig, auch nach dem Neuladen. Auf beiden Bildschirmbreiten zeigte auch die geöffnete Warenkorbschublade die zwei passenden Bilder. In beiden Ansichten wurden null Bearbeiten-Schaltflächen gefunden. [Bedienprüfung am veröffentlichten Theme](Warenkorbbedienung.json)

Auf der nachgelagerten Shopify-Bestellstatusseite erschienen in beiden Bestellungen die richtigen Gravurtexte. Shopify verwendet dort das Artikelbild. Der persönliche Entwurf ist über die gespeicherte Bildreferenz der jeweiligen Bestellposition abrufbar. Der Warenkorb und die Kasse zeigen ihn unmittelbar. Das bereits eingerichtete Test-Zahlungs-Gateway war bei beiden Prüfungen aktiv. Es kann keine echten Kartenzahlungen verarbeiten. [Bestellansicht im Vorher-/Nachher-Vergleich](Bestellnachweis.json) · [Shopify zum Test-Zahlungs-Gateway](https://help.shopify.com/en/manual/checkout-settings/test-orders/payments-test-mode)

Die erste Kassenprüfung vor der Reparatur wies beide Gestaltungen zurück. Die zuständige Shopify-App bestätigte das fehlende Preis-Metafeld. Für genau diesen Ring-Artikel stimmten alle 120 freigegebenen Werkstattvarianten, ihre Ausführungen und die vorhandenen Shopify-Preise zwischen 49,99 und 75,98 € überein. Mit Chris' Freigabe wurde die bestehende Tabelle der Shopify-Kassenprüfung zugeordnet. Vier Mengenfälle je Variante ergaben 480 korrekte Preise und 480 weiterhin abgewiesene unvollständige Gestaltungen. Die Prüfsumme der veröffentlichten Preistabelle ist `c87e9f3efa75b27d0909fb9f9c86258a72f6fd905787c4f094a2d2be25f20f5a`. Das Öffnen zweier bereits gespeicherter Angebote wurde mit unveränderten Originalen geprüft. Bereits im Warenkorb befindliche Positionen aus der Zeit vor der Reparatur können die vier erforderlichen Kassenangaben noch vermissen. [Einzelner Ring-Fix und Rückweg für das Preis-Metafeld](https://github.com/Chris83638w/gravuru-2027/commit/6543d962)

## Auslieferung und Wiederholung

Der ursprüngliche Serverstand war `9af3a1ac`. Die zusätzlichen Änderungen wurden in der Reihenfolge `8a3d6c86`, `3b3b4626` und `44543823` einzeln auf den bestehenden R15 übertragen. Beim Neustart fielen zwei zuvor ausgelieferte Editor-Dateien durch HTTP 404 auf. Die Korrektur `169bec03` erhält genau diese Versionen für bereits geöffnete Editoren. Nach dem abschließenden Serverwechsel waren alle drei Editor-Dateien und das Editor-Dokument über die öffentliche Adresse mit HTTP 200 abrufbar. Die spätere Shopify-Stufe `5de3ce84`, die Modulkorrektur und die Ring-Preiszuordnung ergeben den geprüften Produktionsstand `b36a8eef`. Die Quellen liegen auf dem isolierten Produktionszweig. PR #268 enthält Messverfahren und Belege. [Produktionszweig](https://github.com/Chris83638w/gravuru-2027/tree/dev/astra-r15-live-267-20261119) · [PR #268](https://github.com/Chris83638w/gravuru-2027/pull/268)

Die Server-Sicherung besteht aus drei zurückgelesenen, auf Wiederherstellung geprüften Datenbanken. Jede Serverstufe hat einen vorbereiteten Rückweg. Für die Shopify-Tempostufe führt er zum laufenden Vorgänger mit Ring-Preiszuordnung. Das Shopify-Preis-Metafeld besitzt eine eigene Sicherung und einen auf dieses eine Produkt begrenzten Rückweg. Der veröffentlichte Theme-Stand ist 190984126844. [Erster Sicherungs- und Themebeleg](../Auslieferung.json)

Für den Vergleich Chrome und Playwright verwenden. Der Live-Prüfer legt pro Durchgang zwei eigene Gestaltungen für dieselbe Variante an. Originalbilder, Preistabelle und Auftragsmerkmale dürfen ausschließlich aus der eigenen Testbestellung gelesen werden. Die Zeitmessung endet vor den zusätzlichen Bildabrufen. `R15_SMALL=1`, `R15_PREVIEW_ONLY=1` und `R15_CHECK_PHOTO=1` schalten die Prüfungen auf Bildbreite, Warenkorbansicht und Gerätefoto ein. Die Testkäufe #1033 und #1034 sind separate manuelle Freigabeschritte und werden durch das Messskript nicht ausgelöst.

```text
node tools/beta-267/measure-live-r15.cjs neuer-lauf cart 3 <absoluter-privater-Ausgabeordner>
node tools/beta-267/compare-published-ring-editor.cjs <Produktions-Checkout> <Ordner-mit-drei-Editorpaketen> <Ausgabe.json>
node tools/beta-267/compare-live-preview-pairs.mjs <vorher> <nachher> < eigene-bildpaare.json
```

Das zweite Skript prüft die SHA-256-Werte der drei identifizierten Browserpakete vor dem Vergleich. Das dritte vergleicht zwei echte, zuvor erfasste Bildpaare in wechselnder Reihenfolge. Berechtigte Prüfer finden die Originale in ihrem eigenen privaten Nachweisordner. [Browsermessung](../../../../../../tools/beta-267/measure-live-r15.cjs) · [Editorvergleich](../../../../../../tools/beta-267/compare-published-ring-editor.cjs) · [Bildvergleich](../../../../../../tools/beta-267/compare-live-preview-pairs.mjs)

## Persönlicher Text auf den Designkarten

Von den 16 Ring-Designs übernehmen neun das erste Namensfeld. Auf der veröffentlichten Produktseite wurde der Name zu „Koch“ geändert. Auf dem PC und in Handybreite änderten sich die tatsächlich gezeichneten Schriftkonturen auf allen neun zugehörigen Karten. Nach dem Zurücksetzen entsprachen sie auf allen neun Karten wieder dem Ausgangszustand. Zwei getrennte Durchläufe ergaben dieselben Kartenkennungen, darunter FK-D05, FK-D07, FK-D08 und FK-D15. [Ergebnisse für beide Bildschirmgrößen](Designkartentext.json) · [Wiederholbarer Browsertest](../../../../../../tools/beta-267/check-ring-card-text.cjs)

Mit Chrome und Playwright lässt sich die Prüfung auf der veröffentlichten Produktseite wiederholen. Das Skript bearbeitet nur das Textfeld im geöffneten Editor.

```text
node tools/beta-267/check-ring-card-text.cjs <neue-Ausgabedatei.json>
```

## Breiter Vergleich mit dem ursprünglichen R15

Unter Windows liefen 2.752 Editor- und Werkstatttests auf dem veröffentlichten Code. Im ersten Durchgang bestanden 2.649, 92 schlugen fehl und elf wurden übersprungen. Für die Bild- und Exporttests wurde die fehlende Cairo-Bibliothek im lokalen Prüfstand ergänzt. Anschließend liefen alle 32 zuvor auffälligen Testdateien erneut. Von deren 204 Tests bestanden 197. Die sieben übrigen Fehler traten in der Gegenprüfung auf dem ursprünglichen R15 (`9af3a1ac`) an denselben Stellen mit derselben Abweichung auf.

Drei betreffen die erwartete Auflösung bei Acryl-Fotoausschnitten, drei das Aufräumen temporärer SQLite-Verzeichnisse unter Windows und einer die erwartete Liste der Werkstattseiten. Die zusätzlichen Prüfgruppen für Preis und Auftragsübernahme (41 von 41) sowie die Editor-Dateien (9 von 9) bestanden auf PR #268. [Zählungen, betroffene Testfälle und Wiederholungsliste](Gesamttest.json)

```text
node --test --test-concurrency=4 app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs
```
