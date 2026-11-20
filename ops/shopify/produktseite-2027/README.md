# Produktseite 2027 · Vorschau für Chris

Die bestehende 2027-Produktvorlage wurde am 20. November in einer neuen unveröffentlichten Kopie des aktuellen Shops eingerichtet. Die Kopie heißt „Produktseite 2027 – Prio-Abnahme 20.11.“ und hat die Shopify-ID `191449661820`. Der veröffentlichte Shop nutzt weiterhin Theme `190984126844`.

| Produkt | Einheitliche Produktseite zur Sichtprüfung | Regulärer Shop |
|---|---|---|
| Ring Wired Pro | [Vorschau](https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert?preview_theme_id=191449661820&view=konfi-2027&pb=0) | [Produktseite](https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert) |
| AOSU Pro Querformat | [Vorschau](https://gravuru-design.myshopify.com/products/klingelschild-aosu-pro-v8p1ax11-querformat-24x20-personalisiert?preview_theme_id=191449661820&view=konfi-2027&pb=0) | [Produktseite](https://gravuru-design.myshopify.com/products/klingelschild-aosu-pro-v8p1ax11-querformat-24x20-personalisiert) |
| Türschild aus Edelstahl mit Form- und Größenwahl | [Vorschau](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen?preview_theme_id=191449661820&view=konfi-2027&pb=0) | [Produktseite](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen) |
| Familienschild mit Baum aus Acryl | [Vorschau](https://gravuru-design.myshopify.com/products/familienschild-acryl-baum-12x8-personalisiert?preview_theme_id=191449661820&view=konfi-2027&pb=0) | [Produktseite](https://gravuru-design.myshopify.com/products/familienschild-acryl-baum-12x8-personalisiert) |
| AOSU Pro Hochformat, nur per Direktlink | [Vorschau](https://gravuru-design.myshopify.com/products/klingelschild-aosu-pro-v8p1ax11-personalisiert?preview_theme_id=191449661820&view=konfi-2027&pb=0) | [Produktseite](https://gravuru-design.myshopify.com/products/klingelschild-aosu-pro-v8p1ax11-personalisiert) |

Auf dem Handy folgt der vorhandene Knopf „Jetzt personalisieren“ beim Scrollen an den unteren Bildschirmrand. Die Seite gibt für diese Produkte einen Preis und eine Kaufhandlung aus. Die R15-Auswahl verwendet die tatsächlichen Produktdaten. Als Preis erscheint der Shopify-Produktpreis, bei unterschiedlichen Variantenpreisen der Mindestpreis mit „ab“. Produktbeschreibung und die Artikelangaben zu Material, Montage und Sicherheit bleiben als HTML lesbar. Die Vorlage prüft die Felder vor der Ausgabe. [Handyansicht](abnahme/Produktseite-Ring-Mobil.png) · [PC-Ansicht](abnahme/Produktseite-Edelstahl-PC.png)

## Reichweite im aktuellen Bestand

| Heutige Zuweisung der geeigneten Produkte | Aktiv | Nur mit Direktlink | Befund auf den heutigen Produktseiten |
|---|---:|---:|---|
| Standardprodukt | 1 | 41 | Bei Ring und AOSU Hochformat erscheint der Shopify-Variantenwähler vor dem Prio. |
| `funkklingeln-2027` | 84 | 0 | Beim AOSU Querformat erscheint derselbe zusätzliche Variantenwähler. |
| `konfi` | 3 | 0 | Bei Edelstahl und Acryl sind zwei Preisblöcke sichtbar. Das native Kaufformular steht noch im Seitenquelltext. |

Die zehn anderen Direktlink-Produkte haben keine gesicherte R15-Bindung. Die Dienstleistung „Eigenes Logo – einmalige Einrichtung“ behält ihren normalen Kaufweg. Shopify-Entwürfe und der archivierte Artikel sind keine öffentlichen Kandidaten. [Einzelinventar mit den 129 Produktlinks und allen Ausnahmen](https://github.com/Chris83638w/gravuru-2027/blob/9c86a6b3ffb19a9b0b18116c8303ce88f1ba5c63/docs/handoffs/2026-11-19-beta-267/tempo/live/prio/Pruefliste.md)

## Technische Prüfung

Bei fünf R15-Produktseiten und einer Dienstleistung wurden der aktuelle Shop und die Vorschau auf PC und Handybreite geprüft. Im Kaufbereich der Vorschau stand genau ein sichtbarer Prio-Knopf. Der R15-Pfad enthielt die richtige Produkt- und Variantenkennung. Shopify-Variantenwähler, Mengenfeld und natives Kaufangebot kamen an dieser Stelle im ausgelieferten HTML nicht vor. Auf dem Handy blieb der einzelne Knopf auch nach dem Scrollen im sichtbaren Bereich. Bei dem Vergleichsartikel ohne Prio-Bindung blieb der native Kaufweg verfügbar. [PC-Prüfung](abnahme/Produktseiten-PC.json) · [Handyprüfung](abnahme/Produktseiten-Mobil.json)

Aus der Vorschau wurden vier Produkte mit eigenem Text in den echten Shopify-Warenkorb gelegt und ihr jeweils zugeordnetes Bild in der Kasse geöffnet. Zusätzlich erreichte die 404. Edelstahlvariante mit SKU `156-GR-ES-RT2-300X200-T15-B02S` den Warenkorb und die Kasse zu ihrem vorhandenen Preis von 77,68 €. Damit ist auch ein Fall jenseits der von Liquid gewöhnlich gelieferten ersten 250 Varianten belegt. [Fünf vollständige Kundenwege](abnahme/Vorschau-Warenkorb.json)

Die Vorschau basiert auf den vorhandenen Bausteinen aus Issue #236 und der in Shopify zurückgelesenen aktuellen Shopgestaltung. Installiert wurde ausschließlich `templates/product.konfi-2027.json`. Das frühere alternative Farb-, Schrift- und Logopaket gehört nicht zu dieser Bereitstellung. `pb=0` blendet Shopifys eigene Vorschauleiste aus und lässt am Handy den unteren Bildschirmrand bedienbar. [Shopifys Dokumentation zur Vorschauleiste](https://shopify.dev/changelog/posts/the-ab-cookie-will-no-longer-be-set)

## Bereitstellung nach Sichtfreigabe

Das Bauskript liest die beiden Liquid-Blöcke in diesem Verzeichnis und erzeugt dieselbe Vorlage auf jeder Plattform. Der vorhandene Shop-Fußbereich liefert die Produkt- und Variantenkennung und lädt den bestehenden Shopify-App-Einstieg. Die Warenkorb- und Werkstattstrecke wird bei der Vorlagenwahl weiter serverseitig geprüft. [Knopf und mobile Leiste](blocks/personalisieren.liquid) · [Artikelangaben](blocks/produktdetails.liquid) · [Bauskript](build-konfi-2027.py)

Für die spätere Umstellung genügt die einzelne Vorlage im dann aktiven Theme. Vor einer Zuweisung werden Freigabestatus, Produktbindung und ursprünglicher Vorlagenname je Artikel erneut gelesen. Ein einzelner Pilot geht dem Rest der geprüften Gruppe voraus. Der Rückweg stellt je Artikel seinen zuvor gespeicherten Vorlagennamen wieder her. Die integrierte Produktwerkstatt soll künftigen bestätigten R15-Artikeln diesen Vorlagennamen bei der regulären Shopfreigabe zuweisen. Hier ist die Sichtfreigabe von Chris für die Live-Produktseiten offen. [Auftrag und Freigabegrenze](https://github.com/Chris83638w/gravuru-2027/issues/236#issuecomment-7032492509) · [Shopify-Publisher der Produktwerkstatt](https://github.com/Chris83638w/gravuru-2027/issues/276)
