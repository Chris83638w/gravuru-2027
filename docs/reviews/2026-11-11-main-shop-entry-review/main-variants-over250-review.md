# Hauptacryl: Grenze von 250 Theme-Varianten

Stand `af6fd986c735d97bddc974261398ab8c4e88e00b`, rein lesend, keine App-/DB-/Shopänderung.

**Ergebnis:** Die 250er Liste begrenzt **nicht** die spätere native Auswahl oder Warenkorbzuordnung. Sie verursacht aber im geprüften `shop-embed.mjs` eine falsche **Startvorauswahl**, wenn die auf der Produktseite gewählte Variante nicht darin vorkommt. `shop-entry-client` enthält keine eigene vollständige Shopify-Variantenzuordnung: Der Editor erhält die 778 v9-Ausführungen aus dem gespeicherten Modell; die vollständige Zuordnung zu Shopify-IDs übernimmt beim Warenkorb der Server. Der Variantenbestand des derzeitigen Shops umfasst weiterhin 808 IDs. Beides ist auseinanderzuhalten.

## Enger lokaler Nachweis

Aus dem vorhandenen vollständigen 17-Seiten-Shopify-Lesebestand wurde Variante **58104626479484**, Position **331** der 808 IDs, gewählt: **Rechteck abgerundet 12 × 8 cm, Schwarz, ohne Bohrung**, 1499 Cent. Sie ist in v9 enthalten. Benutzt wurden das unveränderte v9-Dokument und tatsächliche Modul-Exports des eingefrorenen Kandidaten; Sitzungs-/Registry-/Entwurfs-/Shopify-Adapter waren ausdrücklich synthetisch und ausschließlich im Arbeitsspeicher.

Sechs gezielte Prüffälle bestanden:

1. Gerendertes Produkt-JSON mit den ersten 250 IDs und ausgewählter ID 331: `pageConfig()` ersetzt die ausgewählte ID durch **58104615666044**, die erste Listen-ID. `currentVariant()` und `startHref()` übernehmen diesen falschen Rückfall.
2. Start mit einer bekannten ID, danach Formularwahl ID 331: `productForms()` findet dieses Formular wegen des Listenfilters nicht mehr. `currentVariant()` fällt auf die ursprüngliche **58104615993724** zurück.
3. Das tatsächliche v9-Familienmodell enthält **778** Kombinationen und lässt die Zielausführung mit 120 × 80 mm und 1499 Cent zu.
4. Tatsächliche `createShopEntry()`-/`createShopEntryClient()`-Exports: Start mit einer frühen Variante, danach gespeicherte Auswahl der Zielausführung. Der gemeinsame Server-Warenkorbpfad löst **58104626479484** aus allen injizierten 778 Bindungen auf; korrektes Ergebnis 1499 Cent. Keine Begrenzung auf die 250 IDs der Shopseite.
5. Ein direkt korrekt übergebener signierter Start mit ID 331 wird angenommen und liefert diese Vorauswahl im Modell. Der Server selbst hat keine 250er Startgrenze.
6. Tatsächlicher `createThemeCartClient()` mit geprüfter synthetischer Übergabe: `/cart/add.js` erhält ID **58104626479484**, und die Rückleseprüfung akzeptiert dieselbe ID/Produkt/Menge/Preis. Nur synthetischer Transport, kein Shopify-Schreibzugriff.

Aufruf: `node work/restabschluss/check-main-variants-over250.mjs`. Ergebnis/Quellhashes: `main-variants-over250-proof.json`; Protokoll: `main-variants-over250-proof.log`. Keine DB geöffnet, kein Listener gestartet, kein Netzwerkaufruf im Prüfskript. Der Server-Auswahlzweig wurde über `/cart` ausgeführt; die anschließende `/theme-cart`-Paketvorbereitung wurde anhand der Quelle geprüft, der echte Browser-Transport separat ausgeführt. Keine vollständige Live-Bestellung behauptet.

## Tatsächlicher Weg im Quellcode

- **Shopseite → Start:** `ui/shop-embed.mjs:83–113` begrenzt das generische JSON auf 250 IDs, verlangt Mitgliedschaft für Vorauswahl/Formular/Link; `:264–276` überschreibt beim Vorwärmen und Klicken den vorhandenen Liquid-Link. Genau hier entsteht der belegte Rückfall.
- **Start → iframe:** `shop-entry.mjs:297–322` prüft Produkt/Variante über Registry und lädt die feste Produktrevision. `ui/shop-entry-page.mjs:32–44` reicht dieses native Modell an das Editor-iframe weiter. Die 250er Theme-Liste wird nicht mitgereicht.
- **Ausführung:** `variant-m/family-formats.mjs:27–50,77` verwendet Größen/Farben/Befestigungen des Modells. `shop-entry.mjs:201–210` setzt nur die Startoptionen aus der gebundenen Variante, entfernt nicht den übrigen Familienbestand.
- **Gesicherte Auswahl → Warenkorb:** `shop-entry.mjs:355–369` nimmt die Optionen aus dem gespeicherten Entwurf, sucht in allen passenden Produkt-/Revisionsbindungen und prüft jede Kandidaten-ID erneut durch die Registry. Genau ein Treffer erforderlich. `theme-cart.mjs:42–43` gibt `offer.variantId` weiter; `ui/theme-cart-client.mjs:78–88` sendet diese ID an Shopify und prüft sie zurück. `shop-embed.mjs:222–229` reicht die Übergabe an diesen Client; keine erneute Prüfung gegen `pageConfig().variants`.

## Präziser noch erforderlicher Pilotcheck

Die aktive Theme-Quelle ist direkt gelesen und erzeugt für Acryl nur `product.variants`; das vollständige 404er R15-Manifest gilt ausschließlich für Edelstahl. Die aktuell ausgelieferten JS-Bytes konnten wegen HTTP 403 nicht abgeglichen werden. Daher gilt der beschriebene Startfehler sicher für **Kandidat + nachgebildetes 250er Produkt-JSON**, noch nicht als beobachteter Livefehler.

Claude/Browserabnahme: Auf der tatsächlichen Hauptacryl-Produktseite ID 331 über `?variant=58104626479484` bzw. die Shop-Auswahl setzen, dann die gewählte Formular-ID, `#gravuru-konfi.variantId`, Listenlänge und den unmittelbar vor dem Klick erzeugten Startlink vergleichen. Erwartet überall dieselbe ID. Danach mit einer frühen Variante starten, **im Konfigurator** die genannte 12×8-Ausführung wählen und über den autorisierten Pilotweg gespeicherte Optionen, aufgelöste Bindungs-ID und Warenkorbposition/1499 Cent nachweisen. Revision/Freigabe müssen zum installierten Stand passen; v9 ist hier nur lokale Eingabe, kein Beleg bereits umgestellter 778 Livebindungen.

## Minimaler Lösungsvorschlag bei bestätigter gleicher Laufzeit

Die aktuelle Auswahlidentität von der begrenzten Vorschau-Liste trennen: `pageConfig()` muss die von Liquid für **dasselbe Produkt** gelieferte ausgewählte ID erhalten; `productForms()/currentVariant()` müssen das Formular über seine belegte Produktzugehörigkeit identifizieren und dessen aktuelle ID lesen; `startHref()` darf diese nicht allein wegen fehlender Mitgliedschaft in den ersten 250 ersetzen. Fremde Produktempfehlungsformulare weiterhin ausschließen, Server-Registry unverändert maßgeblich lassen. Dazu genau die beiden oben belegten Regressionen plus Fremdprodukt-Abweisung testen. **Keine pauschale Erhöhung auf 808/2048 und keine Änderung am Preis-/Warenkorbvertrag.** Nur Vorschlag; eingefrorener Kandidat unverändert.

Ausgearbeiteter Minimalvorschlag einschließlich aktiver Theme-Formularzuordnung, Sicherheitsgrenze und kleinster Dateigruppe: `main-variants-over250-fix-proposal.md`. Der falsche direkte Rückfall `58104615666044` gehört im vorhandenen Abgleich sogar zu den 30 nicht im v9-Hauptprodukt enthaltenen Bestandsvarianten (8×2 Schwarz K00); die Folgen der späteren tatsächlichen Bindungsfortschreibung wurden hier nicht angenommen.
