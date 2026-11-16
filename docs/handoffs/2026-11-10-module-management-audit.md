# Modulverwaltung: vorhandenen Anschluss fortsetzen, keine neue Oberfläche

Stand 10.11.2026. Isolierte Prüfung auf PR224-HEAD `56be0409defa92653d9400a4ed3e688f4e94210d`, Branch `review/mika-module-management-20261110`. Keine Server-, Shopify-, Produkt- oder Profiländerung; Testdaten ausschließlich in temporären lokalen Datenbanken.

## Gesicherter Stand und drei getrennte Vorgänge

GitHub am 10.11. erneut gelesen: [PR223](https://github.com/Chris83638w/gravuru-2027/pull/223) (HEAD `fce83b0494e320ce3821be25edad27ab747332f5`) und [PR224](https://github.com/Chris83638w/gravuru-2027/pull/224) sind offene Drafts, nicht gemergt. [Issue227](https://github.com/Chris83638w/gravuru-2027/issues/227) ist offen und beschreibt den verbindlichen Produkt-/Preis-/Excel-Freigabeprozess.

1. **Wiederverwendbare Profile bearbeiten:** `/werkstatt/module/`, API `/api/workshop/configurator-modules`. Vorhandene Profilbibliothek, sieben Schalter, unveränderliche Versionen. Speichern eines Profils weist es keinem vorhandenen Produkt zu.
2. **Neue lokale Produktentwürfe:** Quelle und Produktgruppen-Vorlage auswählen, konkrete Produkte benennen, vollständigen Preis-/Variantenplan anzeigen, ausdrücklich bestätigen, dann lokale Entwürfe erzeugen. Das ist der bestehende `createProductGroupTemplates`-Weg, ohne Shopify-Transport. Die Bestätigung gilt nur für diese vollständige Produktliste, nicht pauschal für künftige Produkte der Gruppe.
3. **Bestehende Shopprodukte auf ein Profil umstellen:** `/originale/verwaltung#synchronisieren`, vorhandener Sync-/Journal-/CAS-Weg. PR224 verbindet ihn mit der tatsächlichen Profilbibliothek und dem Journal. Beide Ausführungsschalter bleiben fest `false`; Pläne und Bestätigungen können gespeichert werden, Zielprodukt und Shopify können darüber nicht geschrieben werden. PR223 beschleunigt die geschützte atomare Bindungsphase, öffnet aber keine Schalter.

Die private Verwaltung v2 wurde laut gesicherten Serverbelegen bereits installiert. Der zusätzliche PR224-Vorschauanschluss wurde nicht als live abgenommen und wird durch dieses Audit nicht installiert. Kundenruntime und private Verwaltung sind getrennt: Die Kunden-Modulregeln sind inzwischen in PR222 enthalten; alte private Übergaben mit dem damaligen Stand „Kundengates noch offen“ sind keine aktuelle Aussage über den Kundenhost. Eine tatsächliche Produktprofilzuweisung folgt daraus nicht.

## Konkrete kleine Korrektur

In `app/workshop/ui/module-profiles.mjs` blieb der Vorlageneditor nach „Anlageplan prüfen“ geöffnet. `reload()` ersetzte jedoch die vollständigen Quelldaten durch kompakte Übersichten. Beim anschließenden Wiederanwählen einer vorher entfernten Befestigung verwendete `editedTemplate()` die alte sichtbare Feldnummer mit der inzwischen verkürzten Werteliste. Der neue Regressionstest reproduzierte vor der Korrektur tatsächlich `null` statt der dritten Quelloption.

Nach dem Neuladen werden ausschließlich die bereits gewählten Quellen über den vorhandenen Detail-Endpunkt wieder geladen. Der nächste Eingriff behält damit alle zulässigen Originaloptionen und ihre Preise. Kein Layout, kein neuer Endpunkt, keine Änderung an Quellen, Preisen, Validierung oder Bestätigung. Eine bearbeitete Auswahl verwirft weiterhin den vorherigen Plan und benötigt eine neue ausdrückliche Bestätigung.

## Bestehende Verträge und Grenzen

- Profil: `gravuru-configurator-modules/v1`, exakt `options/designs/text/motifs/photo/logo/colors`; `module-profile.mjs` prüft die ursprünglichen Produktfähigkeiten. Neue Wünsche werden zuerst erfragt und dokumentiert, nicht als unbekannter Schalter oder erfundene Produktionsfreigabe eingeschleust.
- Gruppe: `gravuru-product-group-template/v1` in `product-group-templates.mjs`. Echte Registry-Schlüssel, Quellrevisionen und Profilrevisionen werden gebunden.
- Plan: `gravuru-product-group-creation-plan/v1`. `plan → confirm → execute` prüft Planhash, aktuelle Vorlage, Quelle, Materialangebot und Profilversion erneut, zuletzt im nativen `importBatch.beforeWrite`. Keine Bestätigung oder veränderte Abhängigkeit bedeutet keine neue Produktanlage.
- `productGroupVariantReview` zeigt alle tatsächlichen Kombinationen samt Maßen, Form, Befestigung und Centpreis. Der vorhandene 8-Formen-/80-Größen-Datensatz ergibt 404 gültige Kombinationen.
- Bei Mehrformatquellen darf eine Änderung nur der obersten Optionsliste die formatabhängigen Regeln nicht umgehen. Dafür bleibt `group_options_adapter_required` bestehen; solche Einschränkungen müssen durch den vorhandenen Formatadapter vorbereitet werden. Profil an/aus allein übernimmt die vollständige native Form-/Größen-/Befestigungsmatrix unverändert.
- Keine neuen Design-/Original-IDs aus Dateinamen ableiten. Designs, Startdesign und Ressourcen kommen aus dem freigegebenen nativen Quelldokument. Ein reiner Profilwechsel schreibt keine Designbank neu.
- Die Bestätigung im System ist kein automatischer Nachweis, dass Mikail die produktbezogene Excel bereits geprüft hat. Issue227 verlangt weiterhin vor jedem Produkt bzw. vollständig benannten Batch seine konkrete Freigabe aller Module, Optionen, Grund-/Zusatzpreise und Designreferenzen sowie die Frage nach weiteren Wünschen. Offene Preise sind nicht null Euro.
- Die versionierte Excel je Produkt ist verbindliche Referenz. Eine automatische XLSX-Übernahme mit festem Excel-Hash im Plan ist weiterhin nicht implementiert und wird hier nicht behauptet. Bis dahin müssen Excel und exakte Planübersicht vor der Bestätigung abgeglichen werden.

## Gezielte Nachweise

**14/14 grün, 0 Skip**, keine Wiederholung des großen PR223-Aktivierungslaufs:

- Neuer UI-Regressionstest: abgewählte Option nach Planprüfung wieder aufnehmen; Quellwert und Preis identisch, nur gewählte Quelle nachgeladen, Bestätigung erneut nötig.
- Tatsächlicher lokaler Händler-HTTP-Weg: CSRF, Profil an/aus, Bestätigung erforderlich, lokale Entwürfe, idempotente Wiederholung, derselbe Editor, abgelehnter nicht erlaubter Logo-Upload.
- Frische Vorlage/Quelle/Materialangebot/Profilrevision, erneuter Guard unmittelbar vor Schreiben; ungültige abhängige Optionen und manipulierte Profilfelder abgewiesen.
- Vollständige reale Kataloggeometrie: 8 Formen, 80 Größen und 404 Kombinationen; Logo an/aus und Wiederöffnung lokaler Entwürfe erhalten sämtliche Geometrien, Befestigungen und Preise.

Die Familienprüfung verwendet die eingecheckten tatsächlichen Optionen mit isolierten leeren Testvorlagen. Sie ist kein neuer Sichtnachweis für die 251 Kundenoriginale. Die schon vorhandenen PR223/224-Nachweise des echten 251er Datenstands bleiben getrennt bestehen; sie wurden nicht erneut als neuer Test ausgegeben.

Logs: [gezielte Verwaltungsprüfungen](../reviews/2026-11-10-module-management-audit/targeted-tests.log), [Familien-/Modulprüfung](../reviews/2026-11-10-module-management-audit/family-module-tests.log). [Dateihashes und Schutzgrenze](../reviews/2026-11-10-module-management-audit/proof.json).

## Kleinster noch nötiger Anschluss

Keine neue Verwaltung oder neuer Konfigurator nötig. Root kann nach gesonderter Prüfung das bereits vorbereitete PR224-Delta gegen den tatsächlich installierten privaten Stand montieren: vier bestehende Backenddateien, vier neue Module und ein externer Loader-Verweis. Der heutige Optionsfix ist zusätzlich genau eine private Verwaltungsdatei.

Die acht PR224-Dateien sind `app/workshop/gallery-shop-sync-transport.mjs`, `gallery-shop-sync.mjs`, `shop-product-binding-store.mjs`, `scripts/lib/gallery-production-activation.mjs`, `gallery-production-module-target.mjs`, `gallery-production-shopify-read.mjs`, `gallery-production-preview-mount.mjs` und `ops/plesk/module-activation-preview-config.mjs`. Vollständige Pfade und Vorherpins stehen im bestehenden PR224-Paketbauer; keine alte Kundenruntime übernehmen.

Einziger externer Auswahlpunkt bleibt `GRAVURU_GALLERY_MANAGEMENT_CONFIG` auf `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-connect-20261108-v2/gallery-module-activation-preview.mjs`. Gleiche Bibliothek `module-management.sqlite`, gleiches Journal `module-shop-sync-preview.sqlite`, gleiche Galerie und Anmeldung. Vorher aktuellen Loader, vier ersetzte Dateien und Bibliothek/Journal sichern. Beide Schalter bleiben aus.

Danach privat sichtbar prüfen: vorhandene zwei Stahlprofile → gewählte Quelle/konkretes Produkt → vollständige Änderungen und Preise → ausdrückliche Bestätigung → Ausführung des bestehenden Produktupdates weiterhin gesperrt. Für die getrennte lokale Neuanlage erst einen konkret durch Mikail freigegebenen Produkt-/Excel-Umfang verwenden; dieses Audit ist keine solche Freigabe.

Rücknahme des heutigen Fixes: ausschließlich dessen eine private UI-Datei auf den gepinnten Vorherstand zurücksetzen. Rücknahme des späteren PR224-Mounts: vorherigen Loader und vier Backenddateien zurückspielen, nur private Verwaltung neu starten. Kein Datenbankrestore über inzwischen gespeicherte Pläne, Profile, Bestellungen oder neue Revisionen.
