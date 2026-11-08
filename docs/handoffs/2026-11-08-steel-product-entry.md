# Produktspezifischer R15-Einstieg – Edelstahlpilot

Auftrag von Mika/Parent, 08.11.2026: vorhandenes Produkt16190784438652 mit dem freigegebenen R15-Aufbau verbinden, Hauptbild und native Startgestaltung gleich halten; laufenden Overlay und Shop nicht ändern. Eigener Branch `dev/mika-steel-product-entry-20261108`, Basis `c8318aff3c600bfb409ab35b39a6f46374c6de41`. Dieser Patch braucht den R15-Overlay als Basis und ist kein Main-Merge.

## Ergebnis

- Ein geändertes Laufzeitmodul: `app/workshop/ui/shop-embed.mjs`. Keine API-, Registry-, Preis-, Warenkorb- oder Konfiguratoränderung.
- Opt-in aus vollständigem produktbezogenem JSON im **vorhandenen** Custom-Liquid-Startblock. Es gilt nur für Produkt16190784438652 und dessen bestätigte Customization-ID. Andere Produktseiten behalten den bisherigen Codepfad.
- Falls das globale App-Embed-JSON `#gravuru-konfi` vorhanden ist, muss die Produkt-ID übereinstimmen. Falls es fehlt, wird das neue Profil nur neben der passenden bestehenden Produktkarte mit genau eigenem Proxy-Startpfad akzeptiert. Die aktuelle Main-Themequelle setzt das globale JSON nicht selbst; deshalb ist dieser zweite Fall ausdrücklich getestet.
- Alle404 realen Varianten-IDs aus dem frischen Admin-Readback, keine Neuanlage oder erfundene IDs. Der normale250-Grenzwert bleibt für Seiten ohne Opt-in gleich. Die2048-Obergrenze ist lediglich eine begrenzte Frontend-ID-Liste; jede tatsächlich gewählte Variante muss weiterhin durch die signierte serverseitige Registry.
- Erststart passend zum Hauptbild: AB12×8 ohne Bohrung, Variante58104606556540, OriginalTAE-V2A-8x5-D1. Eine ausdrücklich in der URL gewählte Variante und spätere echte Formularauswahl gewinnen. Rückwechsel zur ersten Variante ist möglich. Veraltete Ratenzahlungs-/Sticky-Formularkopien überschreiben die Hauptauswahl nicht.
- `ui=prio-r15` bleibt beim Vorladen, Klick, Variantenwechsel und Seiten-Fallback erhalten. Ein beliebiger URL-Parameter aktiviert keine andere Produktseite.

## Vorbereitete lokale Dateien

Unter `outputs/steel-shopify-20261108/product-entry-candidate/` im gemeinsamen Arbeitsbereich:

- `product.konfi.candidate.json`: aus dem frisch gelesenen Main-Theme185833718140; semantisch genau `/sections/main/blocks/custom_liquid_mTPWzc/settings/custom_liquid` verändert. Keine andere Theme-/Layout-Einstellung.
- `custom-liquid.candidate.liquid`: derselbe einzige Block separat zur Prüfung.
- `manifest.json`: Eingangshashes, Kandidatenhash, vollständige ID-Listen-Prüfsumme.
- `real-manifest-test.json`: alle404 tatsächlich gelesenen IDs mit/ohne globalem App-Embed-JSON geprüft, nicht nur synthetische IDs.
- `tests.tap`:72 Tests bestanden (39Server-/Zugangstests,21Clienttests,2Toolbarqueries,10neueProdukttests).

Erzeugung ausschließlich lokal:

```powershell
node ops/shopify/prepare-steel-presentation.mjs --theme ../../outputs/steel-shopify-20261108/theme-konfi-before.json --plan ../../outputs/steel-shopify-20261108/normal-door-native-plan.json --out ../../outputs/steel-shopify-20261108/product-entry-candidate
```

Das Skript lehnt andere Produkt-/Startidentitäten, unvollständige/duplizierte Varianten und abweichenden bestehenden Liquid-Aufbau ab. Es kann nicht zu Shopify oder zum Server schreiben. Die404-ID-Liste ist ein Deployment-Snapshot aus demselben bestätigten Variantenbestand; bei späteren Variantenänderungen muss sie gemeinsam mit den bestätigten Produktdaten neu erzeugt werden.

## Hauptproduktbild ohne Designänderung

`app/workshop/product-preview.mjs:productPreview({universal:document.config})` ruft denselben nativen `studioSvg`-Renderer auf. Quelle ist exakt `normal-door-native-plan.json.nativeUpdate.document`, nicht ein erneuter Designimport. OriginalTAE-D1, Michroma, Texte „Familie“ / „Rosenberg“, AB120×80,K00. Keine Text-/Positions-/Schriftänderung; Dokument vor/nach Render identisch geprüft.

Lokale Ausgaben in `outputs/steel-shopify-20261108/native-main-image/`:

- `tae-d1-ab-120x80-k00-native.svg` und `.png`: native Vorschau ohne Bediengriffe/Hinweise.
- `tae-d1-ab-120x80-k00-shop-1600.jpg` / `.png`:1600×1600, weißer Bildrand, vollständige native Platte mittig, kein Beschnitt.
- `manifest.json`: Quellen-/Dokument-/Objekt-/Dateihashes. PNG aus CairoSVG; eingebettetes WebP lediglich in eine PNG-Transportfassung überführt, dekodierte RGBA-Pixelgleichheit geprüft. Gravurtexte sind schon native Pfade.

Shop-JPEG SHA256: `6c43d55506ca0ce370389fcc4cf992e732f931d52ac18da071e5bb3d513f38ab`.

## Prüfung und noch offene Abnahme

Tests mit vorhandener Testumgebung `work/audit-python-env/Scripts/python.exe`, `PYTHONPATH=work/audit-python-deps`; keine Installation. Ein vorheriger Lauf ohne diese Umgebungsvariablen lieferte den erwarteten lokalen `logo_converter_unavailable`; der vollständige Lauf mit korrekter Umgebung besteht alle72Tests.

Browser-/Theme-Vorschau auf dem echten Produkt durch Parent noch ausstehend. Nach Prüfung der aktuellen Source-SHAs zuerst Servermodul im gesicherten Kandidaten bereitstellen, dann exakt diesen produktbedingten Liquid-Block übernehmen. Prüfen: ohne `?variant` AB12×8/TAE-D1, direkte Variante hinter Index250, Wechsel einschließlich Rückkehr zur ersten Variante, neues Fenster/normaler Klick, Vorladen, Zurück-zum-Produkt und echter Warenkorb. Kein neuer Checkout-Bypass.

Rollback: exakten bisherigen Custom-Liquid-Block aus dem Backup wiederherstellen; der R15-Opt-in entfällt. Geändertes Servermodul ebenfalls auf die c8318af-Fassung zurücknehmen. Produkt-/Varianten-/Preis-/Bestelldaten werden von diesem Patch nicht berührt.

Offizielle Shopify-Belege, gelesen08.11.2026: [High-variant products](https://shopify.dev/docs/storefronts/themes/product-merchandising/variants/support-high-variant-products), [Liquid product.variants](https://shopify.dev/docs/api/liquid/objects/product), [2048-Variantenlimit](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant). Liquid liefert unpaginiert maximal250; deshalb reicht das bloße Anheben eines JS-Limits nicht.
