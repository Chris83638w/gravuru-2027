from pathlib import Path
import json
ROOT = Path(__file__).resolve().parent
readme = '''# gravuru Salbei – Shopify-Shop

Stand: 11.10.2026. Vollständiger Storefront-Aufbau auf Dawn im unveröffentlichten Theme **190064427388**. Der bestehende Live-Shop wurde nicht veröffentlicht oder verändert.

[Shop-Vorschau öffnen](https://gravuru-design.myshopify.com/?preview_theme_id=190064427388)

## Enthalten

Acht Startseitenbereiche, sieben Themenwelten, Mega-Menü, echte Katalogprodukte, Produktdetails, Suche, Filter, Warenkorb, Kundenkonto, Beratung, FAQ, bestehende Informationsseiten, Rechtsnavigation und das vorhandene B2B-Registrierungsformular. Die vorhandenen FPD-App-Blöcke und Theme-App-Einbindungen sind im neuen Theme eingebunden. Es wurde kein Code aus Hyper oder Prestige übernommen.

Die Primärfarbe ist Salbei `#354C3B`, ergänzt um warme neutrale Flächen. Die fünf mitgelieferten Entwurfsillustrationen sind keine bestätigten Produktfotos. Produktkarten zeigen die tatsächlichen Katalogbilder. Bilder können im Editor ersetzt werden.

## Ohne KI bearbeiten

1. In Shopify unter **Onlineshop > Themes** beim Salbei-Entwurf **Anpassen** öffnen.
2. Startseitenbereiche umsortieren und Texte, Bilder, Buttons oder Kollektionen direkt ändern.
3. In der **Kopfzeile** Mega-Menü-Blöcke pflegen; in der **Fußzeile** bestehende Shopify-Menüs auswählen.
4. In **Theme-Einstellungen** Farben und Typografie ändern.
5. Unter **Produkte** die vorhandenen Produktvorlagen und App-Blöcke bearbeiten. B2B verwendet die Seitenvorlage **registration** und das vorhandene Shopify-Forms-Formular 648263.

Die sieben Themenwelt-Vorlagen werden über `?view=salbei-home`, `salbei-photo`, `salbei-memory`, `salbei-horse`, `salbei-kids`, `salbei-wedding` und `salbei-christening` verwendet. Gemeinsame Kollektionszuordnungen des Live-Shops bleiben erhalten.

## Vor dem Verkaufsstart noch abzunehmen

- Mehrere Geschenk-Kategorien enthalten derzeit keine aktiven Artikel. Vorhandene Entwürfe wurden nicht global freigegeben.
- Deutsch ist die einzige veröffentlichte Shop-Sprache. Systemtexte für EN/FR/NL/ES/IT/TR sind vorbereitet; vollständige Übersetzungen von Katalog, Seiten und redaktionellen Inhalten fehlen noch.
- Die neue Gravuru-Werkstatt besitzt noch keine bestätigte öffentliche Checkout-Freigabe. Ihre vorhandene Kundenfreigabe bleibt Voraussetzung; ein interner Vorschaulink wird nicht als fertiger Bestellweg ausgegeben.
- B2B-Firmenfreigaben, individuelle Kataloge, Preislisten und Zahlungsbedingungen wurden nicht neu eingerichtet.
- Visuelle Desktop-/Mobilprüfung und Ende-zu-Ende-Prüfung der Designer-, Warenkorb- und Bestellstrecke sind offen. Die verfügbare Browserumgebung konnte nicht gestartet werden.

## Prüfungen und Paket

Alle 60 neuen/geänderten Theme-Dateien wurden über Shopify gespeichert und anschließend ausgelesen. 413 Dateien befinden sich im Gesamtpaket `gravuru-salbei-0.2.0.zip`. Lokale Strukturprüfung: 111 JSON-Dateien, 48 Section-Schemas, 0 Fehler. JavaScript-Syntax und offizieller Shopify Theme Check bestanden; Theme Check meldet 0 Fehler und 11 Warnungen. Details stehen in [STORE-STATUS.md](STORE-STATUS.md).

Die Vorschau ist bereits aktualisiert; ein erneuter Upload ist nicht nötig. `upload-salbei.ps1` verweist für einen späteren kontrollierten Neu-Upload auf Version 0.2.0 und prüft deren Hash und Manifest. Es veröffentlicht kein Theme. `python package_theme.py 0.2.0` erzeugt das Paket erneut aus den Theme-Quelldateien.

`configure_theme.py`, `complete_store.py`, `finish_store.py` und die Korrekturskripte dokumentieren den Erstaufbau. Nicht gegen ein inzwischen im Editor bearbeitetes Theme ausführen; sie überschreiben redaktionelle Einstellungen. Maßgeblich sind die finalen Dateien unter `theme/`.

Dawn-Basis: Shopify/dawn Commit `258f00f64365e2018ca4c62778a6bf55a5d3cd18`. Die Lizenz bleibt in `theme/LICENSE.md` und `theme/assets/dawn-license.txt` erhalten.
'''
(ROOT/'README.md').write_text(readme, encoding='utf-8')
source = json.loads((ROOT/'source.json').read_text(encoding='utf-8'))
source['scope'] = 'Complete unpublished storefront theme. Public configurator checkout, catalogue release, translations and company-specific B2B terms remain acceptance gates.'
source['theme_id'] = '190064427388'
source['package_version'] = '0.2.0'
(ROOT/'source.json').write_text(json.dumps(source, indent=2) + '\n', encoding='utf-8')
status = (ROOT/'STORE-STATUS.md').read_text(encoding='utf-8')
(ROOT/'theme_validation_report.md').write_text(status, encoding='utf-8')
(ROOT/'design-qa.md').write_text('# Salbei Design- und Funktionsprüfung\n\nAktueller Stand: siehe [STORE-STATUS.md](STORE-STATUS.md).\n\nDie Browserumgebung ist technisch blockiert. Eine Sichtprüfung oder echte Testbestellung wird nicht behauptet. Statische Prüfung, Shopify Theme Check und API-Rückprüfung sind durchgeführt.\n', encoding='utf-8')
files = ['README.md','source.json','STORE-STATUS.md','theme_validation_report.md','design-qa.md','package_theme.py','SHA256SUMS.txt','theme-manifest.json','upload-salbei.ps1','fix_link_defaults.py','finalize_store_docs.py']
(ROOT/'final-docs.json').write_text(json.dumps({name:(ROOT/name).read_text(encoding='utf-8') for name in files}, ensure_ascii=True), encoding='ascii')
print('Documentation and upload package reference updated')
