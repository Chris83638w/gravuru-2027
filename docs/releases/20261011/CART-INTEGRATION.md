# Schiefer-Warenkorb und Preisvertrag – 11.10.2026

Die interne Bestellzuordnung unterstützt jetzt den nativen Schiefer-Prüfstand. Die Material- und Maschinensperren bleiben wirksam. Ein Shopify-Warenkorb, eine Zahlung oder eine Fertigungsfreigabe wird durch diesen Entwicklungsschritt nicht behauptet.

## Umgesetzt

- Native und historische Acryl-Prüfstände werden mit ihrer festen Ausführung, Produktrevision, Menge und privaten Entwurfszugehörigkeit geprüft.
- Optionaler, ausschließlich serverseitig übergebener Shopify-Preisvertrag wird unveränderlich mit der Variantenbindung gespeichert. Aufpreise müssen dem gespeicherten Produkt entsprechen. Jedes Angebot erhält seinen eigenen unveränderlichen Preis und Entwurfsverweis.
- Warenkorbanfrage enthält die vorhandenen Felder der aktiven Preisfunktion: Motiv-/Fotoanzahl, Shopify-Preisrevision und einen undurchsichtigen Verweis auf den privaten bearbeitbaren Entwurf. Keine Kundentexte, Bilder, privaten Download-URLs oder Zugangsschlüssel.
- Antwort und signierter Testbestelleingang müssen alle Preis-/Entwurfsfelder bewahren. Fehlende, doppelte oder geänderte Zuordnungen werden abgewiesen. Journal verhindert automatisches erneutes Senden nach unklarem Ausgang; neue Preisfelder sind Teil der unveränderlichen Anfrageidentität.
- Expliziter tokenloser Storefront-Modus. Fehlende private Tokens führen weiterhin zu Fehlern, sofern nicht ausdrücklich dieser Modus gewählt wurde; kein stiller Wechsel der Authentifizierung.
- Warenkorb-Vorbereitung verwendet eine vorhandene Bindung wieder, statt sie ohne ihren gespeicherten Preisvertrag erneut anzulegen.
- Eigener, fest begrenzter Admin-Leseaufruf für Produkt-Veröffentlichung und das app-eigene Preisfeld. Keine beliebigen Abfragen oder Mutationen, keine Token-Ausgabe.

## Nachweise

[119 gezielte Tests](cart-regression.json) bestanden, einschließlich synthetisch signierter Testbestellungen, Manipulationsabwehr und Wiederaufnahme ohne doppelten Warenkorb. Anfangs verweigerte die Sandbox lokale Listener (`EPERM`); der sachlich angepasste Lauf mit Netzwerkberechtigung bestand.

[Händler-Browserprüfung](merchant-cart-browser.json): reale lokale Laufzeit mit synthetischer App-Bridge-Identität, Desktop/Mobil, private Kunden-Prüfstände und zweimalige Warenkorb-Vorbereitung mit nur einer Bindungsanlage bestanden. Keine echte Shopify-Händleranmeldung durch diesen Test.

[Alle neun Originalausführungen](native-cart-function-check.json) wurden in einer privaten temporären Kopie der gesicherten Händlerdaten durch native Entwurfssicherung, Aufpreisbindung und Anfrageaufbau geführt. Die aus dem bereits gesicherten Erweiterungs-ZIP geladene echte Preisfunktionsquelle bestätigte jeden Betrag. Der echte Übergabeadapter akzeptierte die native Zugehörigkeit und stoppte anschließend an den offenen Produktions-/Bestellblockern, bevor ein Netzwerkaufruf erfolgte. Original-Datenbankprüfsummen vor/nach der Prüfung unverändert.

Die frei gewählte Testzeichenfolge `TEST` wurde zunächst korrekt abgewiesen: Die importierte PDF-Schrift enthält das große T nicht. Für die anschließende Integrationsprüfung wurden ausschließlich bereits vorhandene Buchstaben zu einem nicht personenbezogenen Beispiel kombiniert. Anschließend entschied der Nutzer ausdrücklich für eine bereits vorhandene vollständige Werkstatt-Schrift. Cormorant Garamond aus den gesicherten, mit OFL-Lizenznachweisen vorhandenen Fontsegmenten enthält 327 Zeichen einschließlich Umlauten und †. Beide Textfelder wurden innerhalb ihrer bisherigen Bereiche auf ganze Millimeter eingepasst. Alle neun Ausführungen bestanden erneut mit `TEST ÄÖÜ †`; Originalrevision und private Quelldaten bleiben erhalten. Garamond Acryl wurde wegen fehlendem † verworfen. [Prüfung mit gewählter Schrift](native-cormorant-cart-check.json).

## Tatsächlicher Shop

[Eigene App-Vorprüfung](shopify-commerce-preflight.json) auf Plesk mit API 2026-07: richtige App und richtiger Shop, EUR, Preisrevision 30, alle neun Varianten, zusätzlicher Motivpreis 169 Cent und Fotopreis 999 Cent bestätigt. Das app-eigene Preisfeld war über den allgemeinen Connector nicht sichtbar; dessen Nullantwort wurde nicht als fehlende Konfiguration behandelt. Erst der Aufruf mit der eigenen App bestätigt den Vertrag.

[Storefront-Prüfung](storefront-read.json): tokenloser Lesezugriff HTTP 200, API-Version bestätigt, Produkt `null`. Die Gedenktafel ist aktiv, aber noch nicht im Onlineshop-Vertriebskanal veröffentlicht. Keine Mutation gesendet.

Verwendete offizielle Dokumentation: [Storefront API 2026-07 und tokenloser Zugriff](https://shopify.dev/docs/api/storefront/2026-07#tokenless-access), [Warenkorb-API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/migrate-to-cart-api). Neue Admin-Abfrage und Storefront-Leseabfrage wurden mit dem Shopify-Schemavalidator geprüft. Die gebündelten Skill-Skripte scheiterten an Netzwerkzugriff bzw. fehlendem `/assets`; stattdessen dokumentierter HTTPS-Abruf mit System-CA und Shopify-Connector-Validierung, keine unveränderten Wiederholungen.

## Noch nicht freigeschaltet

Die laufende Händlerwerkstatt bleibt auf dem zuvor bestätigten Serverstand, solange kein separater neuer Installations-/Aktivierungsnachweis vorliegt. Neue Preisverträge wurden noch nicht in die Live-Datenbank geschrieben. Checkout, Bestell-Webhooks und Produktion bleiben deaktiviert. Der Nutzer hat den Zahlungs-Testmodus bestätigt; ein tatsächlich ausgeführter Shopify-Testkauf steht aus.

Für frei eingebbare Namen fehlt die vollständige Originalschrift Edwardian Script ITC; der importierte PDF-Teilzeichensatz umfasst 24 Zeichen. Die vom Nutzer autorisierte vorhandene Ersatzschrift ist als neue Revision vorbereitet; alte Revisionen werden nicht geändert. `read_orders` fehlt außerdem in den bestätigten App-Berechtigungen; der Bestelleingang braucht einen geprüften Anschluss und eine entsprechende Shopify-Berechtigung.

## Schrift- und Übernahmeprüfung

Acht Schiefer-/Schriftprüfungen und vier Preisvertragsprüfungen nach der letzten Änderung bestanden. Drei private Dateiprüfungen bestätigen unverändertes binäres Lesen und Abweisung unsicherer Pfade. Die neun echten Varianten wurden in einer privaten Kopie als vollständiger Preisbindungs-Satz geprüft: falscher letzter Preis rollt alle neuen Bindungen zurück; Wiederholung erzeugt keine Duplikate. Die mobile Darstellung der Warenkorb-Vorbereitung wurde zusätzlich visuell geprüft.

Der Übernahmehelfer prüft Aktivierungsbeleg, alle drei privaten Sicherungsprüfsummen, den unveränderten Zielproduktstand und erneut die Shopify-Preise samt Optionsnamen. Er legt genau eine neue Schriftrevision an und übernimmt danach die atomare Bindungsgruppe. Nach einer Unterbrechung kann ausschließlich genau diese neue Revision fortgesetzt werden. Andere Produktänderungen führen zum Abbruch; ältere Revisionen bleiben erhalten.
