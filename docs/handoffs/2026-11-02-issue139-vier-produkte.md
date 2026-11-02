# Issue 139: vier Produkte, Versand und Testbestellung · Codex · 02.11.2026

Chris autorisiert im laufenden Chat beide Astra-Bereiche ausdrücklich live. [Issue 139](https://github.com/Chris83638w/gravuru-2027/issues/139), [aktueller Prüfnachweis im Issue](https://github.com/Chris83638w/gravuru-2027/issues/139#issuecomment-6582111675), [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md). Türschildoptionen bleiben getrennt von Funkklingeln und Gedenktafeln. Dies ist ein Teilabschluss, keine Erledigung des gesamten Issues.

## Live-Stand

Laufzeit `private/issue139-finish-20261102`, Code PR 148/main `4fbd9898eda72e9c2d69eeeb5b6706f22e532df2`, seit 15:10 UTC aktiv. Öffentliches Editorpaket `editor-4060e18e30bafecc.mjs`, SHA-256 `b56bada80f822344c9e628574171f7f3c6da956c8a651863db325606a7f1f66d`. Label „Vornamen“ im echten D10-Editor geprüft; 36 gezielte Tests und Build bestanden. PR 149 enthält anschließend die getrennten Funkklingel-Nachweise, keine neue Laufzeitlogik.

Katalog-main `ab0510147512df0bfc2d034122454e17b58c742d`; vorhandene Dashboard-Bearbeitungen erhalten. Keine weitere Designfreigabe erfunden.

| Start | Größe | Shopify-Produkt | Native Revision | Designs |
|---|---|---|---|---|
| D8 Leuchtturm | 12×8 cm | 16077798965628 | cfg_98436fb0-886d-4af8-bc11-f45ef809684c r4 | 208 |
| D10 Baum | 12×8 cm | 16077799063932 | cfg_9f058cdb-85c1-45dd-8783-f45931d1e193 r2 | 208 |
| D12 Pusteblume | 15×10 cm | 16077799096700 | cfg_c09f287e-654c-439b-b4dc-134d16591c2f r1 | 209 |
| D34 Katze | 15×10 cm | 16077799162236 | cfg_3b1a5ad5-3136-487b-9092-2c9573e2348a r1 | 209 |

Alle vier haben feste Größe/Startdesign, fünf Befestigungen, kein Foto/Logo, sämtliche kompatiblen freigegebenen textführenden Designs in „Weitere Designs“, native Variantenbindung und unveränderliche Verkaufsfreigabe. Vorlage `konfi` und Produktschnitt nachgelesen. K00 19,99 / 23,99 Euro; KGL +2,99, KRA +3,99, B02 +2,49, B02S +2,69 Euro. Mengenrabatte ab 3/5/10 Stück 5/10/15 % auf die ganze Einheit. Zusatzmotiv 1,69 Euro.

[Alle vier in der Kategorie](https://gravuru-design.myshopify.com/collections/familienschilder-aus-edelstahl). Der historische D34-Handle enthält weiterhin „hund-silhouette“; Titel, Startdesign und Bild zeigen die Katze. Kein doppeltes Produkt oder stiller URL-Wechsel.

## Tatsächliche Kundenprüfung

Beide 15×10-Produkte im öffentlichen Shop bis Warenkorb geprüft: Bedienbarkeit 17,8 / 14,8 Sekunden, richtige Variante, je 23,99 Euro, Bearbeiten-Link, keine Browserfehler und kein hängender Ladehinweis. D10-Zusatzmotiv 21,68 Euro bestätigt. Ein vorangehender Versuch hatte einen einmaligen Fehler beim Laden der Warenkorbübergabe; frischer Wiederholungslauf bestand, Ursache nicht belegt.

Vorherige D8/D10-Prüfung und mobiler Bearbeiten-Rundlauf siehe [erste Produkte](2026-11-02-issue139-erste-produkte.md). Die dort noch offene Label-Aktivierung ist inzwischen erledigt.

Am 02.11. um 16:13 UTC wurde eine echte Shopify-Testbestellung über das bereits aktive Test-Zahlungs-Gateway abgeschlossen: D12/K00, 23,99 Euro plus 4,99 Euro Versand. Genau eine Position wurde per signiertem Bestelleingang in der Werkstatt erfasst, test=true, keine Eingangsfehler. Unveränderlicher Produktstand und Quellpaket stimmen mit der technischen Gravurprüfung überein. Personen-/Bestell- und Zugriffsdaten bleiben ausschließlich im privaten Nachweis; Details im verlinkten Issue.

Gravur-PDF und Kontur-PDF jeweils eine Seite 150×100 mm, keine Schriftobjekte oder Rasterbilder; 14 Gravurpfade und eine Kontur. SVG ohne Text-/Bildobjekte. Sichtprüfung zeigt ausschließlich Gravur bzw. Kontur, keine Materialszene oder Bedienelemente. Quellpaket-SHA `65296ffeb5b4c7da6cac6ec7562254447ecf89bd4cd6327292150cb71cdfa5db`, technisches PDF-SHA `94420ea8218ae19b65b82ee42b61366983c73d2a71b08ac59304ab9022d1f374`.

**Keine Maschinenfreigabe:** productionProfile=null, productionReady=false. Testbestellung nicht erfüllt und ausdrücklich nicht versenden. Der Shop verwendet weiterhin das Test-Zahlungs-Gateway; eine echte Zahlungsbereitschaft ist damit nicht belegt.

## Produktseiten und Versand

Vier Hauptbilder aus echten Konfi-Startvorschauen mit eingebautem image_gen erzeugt, eigene Namen aus fünf Suchbegriffen, bildgetreue Alt-Texte ohne SKU. Jetzt WebP, maximal 1536 px, 255–520 KB. PNG-Originale erhalten; doppelte generierte PNG nur aus Produktgalerien gelöst, Dateien erhalten. Quellen/Prompts separat gesichert.

Eigene Titel, Beschreibungen, SEO mit Handlungsaufforderung; über vier Texte höchstens eine gemeinsame Fünfwortfolge. Öffentliche Produktseiten/Bilder und Kategorie liefern HTTP 200. Shopify-Strukturdaten verwenden ProductGroup/hasVariant; D12 enthält alle fünf Varianten mit korrektem Preis/Verfügbarkeit. Fehlender top-level Product ist deshalb kein Fehler.

Alle vier: Google custom_product=true und Kategorie 572, Material/Größe/Gravur, korrekte Montage-Kurztexte statt pauschal inklusive Klebeband, eigene Zusatztexte statt Platzhalter. Herstellerkontakt aus bestehendem veröffentlichtem Impressum, Lieferzeit und Hinweis zu individualisierten Waren aus vorhandenen Shop-Richtlinien übernommen und nachgelesen; keine Rechtsprüfung behauptet. Shop-Betriebs-/Abrechnungsadressen sind davon getrennt und wurden nicht geändert. Google-Feed-Feld identifier_exists und Kanalannahme bleiben ungeprüft.

Versandprofil, Warenkorb und Topbar enthielten bereits die bestätigten Staffeln. Die Versandrichtlinie enthielt noch 69 Euro; im angemeldeten Shop-Admin korrigiert und öffentlich/API nachgelesen: bis 17,99 Euro 2,99; bis 27,99 Euro 4,99; bis 49,99 Euro 5,90; bis 89,99 Euro 7,45; ab 90 Euro frei. Ausland und restliche Richtlinie unverändert. [Öffentliche Richtlinie](https://gravuru-design.myshopify.com/policies/shipping-policy).

Die Shopify-Verbindung hat weder write_orders noch write_legal_policies. Bestellung über bestehenden Test-Checkout und Richtlinienkorrektur über Admin-UI erledigt, keine App-Rechte erweitert.

## Sicherung und nächster Schritt

Private Servernachweise `private/issue139-live-20261102-nachweis/wave-8x5-15x10` (tatsächlich nur die beiden 15×10-Produkte), `production-steel`, vorherige `wave-12x8`. Vor Import SQLite-Backup mit Integritätsprüfung; vorherige Shopify-/Metafeld-/Bild-/Policy-Exporte vorhanden. Historische Bestellstände und Produktrevisionen bleiben unverändert. Rückweg: jeweilige vorherige Produktzuordnung/Metafelder/Bilder/Policy aus Export wiederherstellen, keine Datenbank zurückrollen.

Nächster Schritt: weitere veröffentlichbare Produktwellen mit Originalquellen vorbereiten. 8×5 D14/D33 fehlen in expliziter Master-Größenliste trotz Hauptproduktzuordnung; keine Freigabe umgehen. AE-Loch-/Trägerpreise, neue Schieferfamilien/Geometrien und weitere materialbezogene Anschlüsse bleiben offen. Suchfilter, Tracking-Ereignisse sowie alle übrigen Größen/Unterkategorien beider Astra-Teile sind noch nicht abgeschlossen. Issue 139 bleibt offen.
