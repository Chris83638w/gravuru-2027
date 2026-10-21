# Serienimport: Hunde-Gedenktafeln 22 × 14

Fuenf Shopify-Vergleichsentwuerfe: jeweils 16 Designbilder, 48 kombinierbare Zubehoervarianten, SEO und 19 mm Lochmitte zum Rand. Die aktuellen Daten stehen im Katalog unter entwuerfe/gt22x14-hunde-codex/produktplan.json. produktplan.fixture.json ist nur die eingefrorene Testeingabe.

node --test scripts/gt22x14-serienimport/serienimport.test.mjs

node scripts/gt22x14-serienimport/serienimport.mjs --plan <Katalog-Produktplan.json> --media <Medienzuordnung.json> --out <Importpaket.json>

Ohne --commit entsteht nur ein lokales Paket. Mit --commit --shop gravuru-design.myshopify.com --journal <Protokollordner> werden nur neue DRAFT-Produkte geschrieben, Token aus GRAVURU_SHOPIFY_ACCESS_TOKEN. Bestehende eigene Entwuerfe werden rueckgelesen und vollstaendig verglichen; Fremdprodukte und unbestaetigte fruehere Schreibversuche sperren die Neuanlage. Keine Updates/Publikation bestehender Produkte.

PDFs: Python 3.12+, requirements.txt, Poppler; pdfs-aufbereiten.py --pdf <Originalordner> --out <leerer Ordner> --plan <Produktplan> --fonts <lizenzierter Schriftordner>. Nur freigegebene IDs, Quellen-Pruefsummen, Warnungsstopp. Originale unveraendert.

Gemeinsame Bohrgeometrie aus app/platform/sources/app/shared/models/mounting-rules.mjs. Preise stammen aus dem Produktplan in Cent; dieselben Werte ergeben Varianten und Konfigurationsdaten. Kein installierter zweiter Konfigurator.

Stand: DRAFTs im getrennten gravuru_codex-Namensraum; native Vorlagen-/Variantenbindung, Herzmaske D236, Blutenrahmen D213 beim Fotoersatz, Hintergrundoption, zweites Foto/zusatzliches Motiv, Mengenstaffel und Fertigung ohne Upload-Hinweis bleiben vor Bestellfreigabe zu pruefen. Konfi neu ist laut Projektstatus nicht auf dem Haendlerhost installiert. Installation und Veroeffentlichung sind hier nicht enthalten.

8 Tests bestanden; reale Ruecklesedaten bestaetigen 5 DRAFTs, 240 Varianten, je 16 Bilder, SEO und Metadaten. Vollstaendige lokale Uebergabe: outputs/Serienimport/README.md im auftrag-schiefer-gedenktafel-22-14-cm-3-Arbeitsordner.
