# Öffentliche Vorschauen: unabhängige native Startprüfung

## Ergebnis

Der gemeldete Fehler ist lokal genau reproduziert und mit dem Einzeiler aus `126574a4c219469cf32c1aa9bb3ad3bdada28cd6` behoben. Keine Produktionsdatei wurde für diesen Review verändert; weder Server noch Shopify oder Browser wurden benutzt.

Der Cache rief die Bindungsauflösung bei Vorbereitung mit den beiden Shopify-IDs auf, beim Start und öffentlichen Bildabruf dagegen mit der vollständigen Bindung. Der echte Vertrag in `shop-product-binding-store.mjs`, Funktion `ids()`, akzeptiert ausschließlich die beiden IDs. Die Ablehnung wurde zu einer leeren Vorschauliste bzw. HTTP 404 abgefangen. Der Fix projiziert diese zwei IDs vor der Auflösung. Die anschließenden Prüfungen der tatsächlichen Bindung, Freigabe, Modellidentität und Signatur bleiben bestehen.

## Exakte Prüfung

- Unveränderte Integrationsbasis: `491b82ad105477dd2222cbf6c9f006f82d141fcc`.
- Geprüfter Fix: `126574a4c219469cf32c1aa9bb3ad3bdada28cd6`, ausschließlich `public-design-previews.mjs`.
- Fixdatei SHA256: `58151ce11021a41592492a3ea62f303074826b810f32db7e69e41d0b8df9b6cf`.
- Private lokale r4-Datenquelle SHA256: `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`. 251 Designs, 80 Größen, 404 Kombinationen; Datendatei nicht eingecheckt.
- Echte `createWorkshop`-Instanz mit temporärer SQLite-Datenbank, nativer `model()`-Erzeugung einschließlich `legacy`, gebundener Revision 4 und `publishedRevision:null`; echter `createModelSlimmer` und signierte lokale HTTP-Startanfragen. Bindung und Freigabe sind ausdrücklich synthetisch. Der Resolver bildet den strikten Zweifelder-Vertrag der nativen Registry ab.

| Prüfschritt | Vorher | Mit geprüftem Fix |
|---|---:|---:|
| Explizit vorbereitete Vorschauen | 3 | 3 |
| Vorschauen im Startmanifest | 0 | 3 |
| Direkter SVG-Abruf | 404 `shop_entry_route` | dreimal 200 |
| Sichtbare Galeriekarten | — | 21 |
| Neustart mit denselben Cachedateien | — | identische drei URLs und Bildbytes |
| Rendering im Start-/Abrufpfad | 0 | 0 |

Der reale Renderer wurde dreimal ausschließlich während der expliziten Vorbereitung aufgerufen. Im zweiten Prozess waren sämtliche Dateien wiederverwendbar; keine neue Darstellung wurde berechnet. GET und HEAD funktionierten. Die Modellbytes waren kalt und warm sowie nach Neustart gleich. Damit ist eine Mutation durch die untersuchte Verschlankung als Ursache dieser Reproduktion ausgeschlossen.

Die SVGs enthalten zusammen 418.299 Bytes (140.037/139.106/139.156). Lokale Startantworten lagen bei 412–507 ms. Das sind lokale Messwerte, keine Aussage über das Handy oder das produktive Netzwerk. Dieser Lauf prüft die reale Bank und die ausgewählte AB 12×8/K00-Variante zu 19,99 €, keine erneute Gesamtabnahme aller 404 Preisfälle.

## Wiederholung und Nachweise

Harness: `ops/proofs/public-preview-native-start.mjs`. Er verändert keine Produktionsquelle. Für die Fixprüfung lädt der Node-Testprozess die genaue geprüfte Service-Datei aus dem separaten Fixbaum; ihr Hash wird im Bericht festgehalten. Sämtliche temporären Daten werden anschließend geschlossen und innerhalb des validierten Testverzeichnisses entfernt.

```powershell
# Baseline: erwarteten Ausfall nachweisen
$env:GRAVURU_EXPECT_REJECTION = '1'
node ops/proofs/public-preview-native-start.mjs

# Kandidat: native Vorbereitung, Start, Bilder und echter Prozessneustart
Remove-Item Env:GRAVURU_EXPECT_REJECTION
$env:GRAVURU_REVIEW_PREVIEW_SERVICE = (Resolve-Path '../public-preview-identity-20261109/app/workshop/public-design-previews.mjs').Path
node ops/proofs/public-preview-native-start.mjs
```

Verdichteter Laufbeleg liegt unter `docs/reviews/2026-11-09-public-preview-native-start/proof.json`. Vollständige lokale Berichte: `outputs/r15-resume-integration-20261108/native-start-strict-before.json` und `native-start-strict-after.json`. Der vorgelagerte native Test ohne strikten Resolver blieb grün; genau diese tolerante Testdoppel-Grenze erklärt, warum der Fehler zuvor nicht gefunden wurde.

**Nächster Schritt:** Root übernimmt ausschließlich den geprüften Service-Fix und bestätigt die bereits vorbereiteten Dateien über den tatsächlichen Start- und Bildabruf. Eine Liveabnahme ist nicht Bestandteil dieses unabhängigen Berichts.
