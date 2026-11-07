# Demo R10 – echte Ausführungsreiter und PC-Ausrichtung

Stand: 07.11.2026, Codex/Mika, eigener Branch `dev/mika-mobile-demo-20261107`, Draft PR #193. Fortsetzung R9; ausschließlich die im Chat bestätigten Punkte. Designs folgen dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); Vorlagen, Grundplatten, Schriften, Optionen und Preisregeln bleiben unverändert.

## Sicherung vor Änderungen

Ausgangscommit `e5e7befb093d61f16249b0202a8ae431abe34800`. Quellarchiv `checkpoints/mobile-demo-r10-options-tabs-20261107/before-r10-e5e7befb.zip`, SHA256 `51fb6aa2c7e7de9383a404b70b5fb31c22ea8f4ff50cc1feb2de3ec38964735d`. R9 bleibt separat erreichbar. Kein Main-Merge und keine Änderung an Astra, Shopify oder bisherigen Kundenpfaden.

## Bestätigte Änderungen

- Material, Größe, Befestigung sind echte Reiter im Stil der Textauswahl. Initial Größe; darunter ist nur der gewählte Bereich sichtbar. Alle Zubehörgruppen bleiben erreichbar. Die Reiter bleiben stehen, nur der Optionsinhalt scrollt. Native Info-Buttons und Farbdialog bleiben erhalten. Keine native Auswahl oder Sichtbarkeitsregel überschrieben.
- „Automatisch einpassen“ und „Weiter bearbeiten“ erhalten dieselbe Breite/Höhe. Die bewusste Übernahme aus R9 bleibt erhalten; kein neuer Inhalt oder Prüfzwang.
- Kopfzeile: „Zurück zum Produkt“ vor dem nach rechts eingerückten Gravuru-Logo. Derselbe native Button/Handler wird verwendet. Nutzerantwort: später zur tatsächlichen Produktseite; keine zusätzliche Demo-Produktseite. Ohne verknüpften Rückweg ist der Button in der Standalone-Demo sichtbar deaktiviert. Kein geratener Link und kein history.back.
- PC-Hauptreiter ausschließlich über der linken Produktfläche, nicht über der rechten Bearbeitung. Ansicht bleibt unter der Tafel. Produktangabe/Preis neben Warenkorb mittig in der Leiste; der Preis hat unten wieder Abstand. Diese Preisanordnung gilt nur am PC.

## Technik und Prüfnachweise

`options-navigation.mjs` legt ausschließlich eigene Präsentationsattribute an, erhält die Eltern aller nativen Controls und entfernt seine Anpassungen vollständig bei dispose. Der bestehende Optionskörper wird zum inneren Scroller. Ausnahmen für echte ausgeblendete Container und offene Farbdialoge werden berücksichtigt. Andere Legacy-Strukturen behalten ihren vorhandenen Scroller. Neue unbekannte Bildergruppen bleiben unter Befestigung erreichbar.

`product-return.mjs` prüft den vorhandenen gleichursprünglichen Parent-Rückweg. Ein bloßes ShopEntry-Objekt im Standalone ist kein nachgewiesener Empfänger. Der Adapter erfindet keine Navigation, stellt disabled/title bei dispose wieder her. Kopfzeile, Preis- und Dialogformatierung bleiben demo-begrenzt.

220/220 gezielte Tests bestanden (Shell, Reiter 16, Rückweg 12, übrige Demo-/Überlagerungs- sowie Build-/Publikations-/native Workflow-/Vertragstests). Zwei Unteragenten arbeiteten getrennt an Reitern und Rückweg/Live-Abnahmevorbereitung. Lokale Chrome-Bedienprüfung: 390×844, 320×740, PC 1440×1000. Material-/Größen-/Befestigungswechsel hält Canvas und Navigation an derselben Position, page scroll 0. 30×20 plus zwei goldene Abstandshalter ergibt unverändert 31,98 €. Materialinformation öffnet. Beide Dialogaktionen jeweils 340×44 px bei 390 px Ansicht. PC-Tabs enden exakt an der Vorschaugrenze; Preisblock vollständig innerhalb der 76-px-Leiste. Testüberschneidung nur im eigenen Browser-Testzustand, danach frischer Originalstart.

Handybreiten im Desktop-Chrome ersetzen keinen physischen Android-/Edge-Test. Keine echte Bestellung ausgeführt. Auch 1024×768 geprüft: alle fünf PC-Reiter ohne Textüberlauf, Preis innerhalb der Leiste.

## Veröffentlichung und öffentliche Abnahme

Quellcommit `10bc14d6e0705da55a7353d54ca2f80712b6c078`, ausschließlich neuer Pfad `/konfi-demo/mobil-20261107-r10/`. [22×14 frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r10/22x14.html?fresh=1), [30×20 frisch starten](https://app-2027.gravuru-designwerkstatt.de/konfi-demo/mobil-20261107-r10/30x20.html?fresh=1). R9 bleibt unverändert erreichbar.

ZIP: 83.376.976 Bytes, 2.021 Archivdateien; SHA256 `2ae6f746c4e05c3a7c3c662b1855266607ccbbfba8d6385065b97709811a357a`. Manifest SHA256 `2c3b0ed7375327b1631e6ca9bedc37cc403b53ae22a78edbcf5eab79f1581dfd`. Vorher reiner Prüflauf, dann private Originalsicherung und Public-Inventar unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/mobil-20261107-r10-before-publication`. **Alle 12.119 vorherigen öffentlichen Dateien und vier geschützten Originale hashgleich erhalten.** Ausschließlich neuer R10-Ordner mit zusätzlicher `.htaccess`; kein Neustart, Routerwechsel, Datenbank- oder Shopify-Schreiben.

Zwölf öffentliche HTTP-Stichproben: 200, bytegleich zum Paket, Brotli, no-store/noindex. Öffentlicher Chrome bei 390×844: Material → Größe → Befestigung → zurück; Canvas bleibt y=94/h=286,95, Reiter y=485,95/h=58, page scroll 0. Bei 1440×1000: Hauptreiter enden exakt bei x=1022,41 wie die Vorschau; 30×20 zeigt 24,99 €. Preisblock vollständig innerhalb der Fußleiste, etwa 11 px Abstand nach unten. Keine erfassten Konsolenfehler. Nach Prüfung frischer Originalstart und Emulation zurückgenommen. Der Rückbutton bleibt in der ungebundenen Demo erwartungsgemäß deaktiviert; echter Shop-Rückweg gehört zur folgenden Live-Abnahme.

Nachweise: [220 Tests](../reviews/2026-11-07-mobile-demo/r10-tests.txt), [Vorprüfung](../reviews/2026-11-07-mobile-demo/host-preflight-r10.json), [Publikation](../reviews/2026-11-07-mobile-demo/host-publication-r10.json), [HTTP](../reviews/2026-11-07-mobile-demo/http-public-r10.json), [lokale Bedienprüfung](../reviews/2026-11-07-mobile-demo/r10-local-browser.json), [öffentliche Bedienprüfung](../reviews/2026-11-07-mobile-demo/r10-public-browser.json), [PC](../reviews/2026-11-07-mobile-demo/r10-public-desktop.png), [Handy](../reviews/2026-11-07-mobile-demo/r10-public-mobile.png), [gleich große Dialogbuttons](../reviews/2026-11-07-mobile-demo/r10-local-dialog.png).

## Angekündigter Livegang – noch getrennt abzunehmen

Der Nutzer möchte den Konfi anschließend live stellen. Die statische Demo ist keine kaufbare Veröffentlichung: ihr Paket entfernt Produkt-/Variantenbindungen und blockiert Shop-Schreibanfragen. Nicht einfach diesen Schutz oder das Demo-Flag abschalten.

1. Oberfläche als Produktionsdarstellung in den echten gebundenen Editor integrieren; Demo-Kontoaussagen und feste Schiefer-Beschriftung ablösen. Quellen `mobile-demo/demo.mjs`, `ops/mobile-demo/build.mjs`.
2. Ein bestätigtes Shopprodukt mit Produkt-ID, Varianten, Revision und Ausführungen binden; Größen und Zuschläge serverseitig abgleichen. Quelle `app/workshop/shop-entry.mjs`.
3. Über echte Produktseite öffnen und Rückweg prüfen. Native `gravuru-fk-close`/Host-Weiterleitung sowie bestätigte Produkt-URL verwenden. Quelle `app/workshop/ui/shop-entry-page.mjs`.
4. Beide Größen, Motiv, Foto/Maske, Menge, erneutes Bearbeiten ohne doppelte Warenkorbposition prüfen. Bestehende Entwurf-/Medien-/Preislogik in `variant-m/shop-cart.mjs` wiederverwenden.
5. Tatsächlichen Server-/Datenstand sichern, gezielt veröffentlichen und über die Produktseite auf Handy/PC prüfen. R10-Demotests belegen diesen Liveweg noch nicht.

Nächster Schritt: diese R10-Demo sichtbar abnehmen, anschließend den gebundenen Live-Übernahmeschritt durchführen. Backend-/Designgruppen-/Synchronisierungsauftrag und zentrale Ressourcenablage aus der Gesamtakte bleiben erhalten.
