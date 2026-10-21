# Getrennter nativer Entwurfsadapter

Dieser reine Testadapter verändert weder den September-Konfigurator noch Serverdaten. Er hat keine Netzwerkfunktion. Er berechnet keine Preise, erzeugt keine Produktgeometrie und setzt keine Bestell-/Fertigungsfreigabe.

`prepareNativeReview({model,draft,quantity,files,preview})` nimmt die unveränderte Antwort des bestehenden `GET /api/workshop/customer-model/cfg_…?revision=n`, ein vorhandenes `gravuru-customer-design/v2` oder `gravuru-universal-customer-draft/v1`, die Dateizuordnung des Editors (`Map`, `file`/`blob` als Blob), die Menge und die Base64-Referenzvorschau entgegen.

Die Quelle muss bereits für exakt diese cfg_-Produktrevision geladen worden sein. Ein historisches 300×200-Schieferdesign wird nicht auf das vorhandene 220×140-Produkt umgeschrieben oder skaliert. Der Pilot ist auf native rechteckige Schieferprodukte begrenzt. AOSU, Materialdemos, Zusatzfelder und Rückseiten benötigen eigene geprüfte Übergänge.

## Ergebnis und Grenzen

- `input` und `body: {input}` entsprechen der gelesenen nativen Eingabe. Produktkennung/-revision, Design, Objekte, Optionen, Menge, Original/Edited und Freistellwunsch bleiben erhalten. Die Produktgeometrie wird nicht als Kundeneingabe gesendet; sie kommt vom festen Serverprodukt.
- `reopening` ist eine **lokale ergänzende Datensammlung**, kein vom Server akzeptiertes Feld. Sie hält `photoEdit`, Bildabmessungen, zugeordnete Objekte, nicht verwendete/ausgeblendete Bilddateien und relevante alte UI-Werte. Sie kann private Bilddaten enthalten und gehört weder ins Repository noch in öffentliche Protokolle.
- Der vorhandene native Medienvertrag erlaubt nur `id`, `original`, `edited`. Der native Objektvertrag enthält `uxPhotoCrop`, aber nicht `photoEdit` mit Farbe/Spiegelung/Zuschnittformat. Die Bedeutungen sind verschieden und werden nicht umetikettiert. Bearbeitungsparameter und ausgeblendete Bilder lösen daher ausdrückliche Sperrgründe aus. Ein unbekannter Bezug zur Original-/Ergebnisfassung wird zusätzlich markiert.
- Die alte `cleanObject`-Whitelist lässt unter anderem native Fotomasken-, Asset-, Rollen-, Seiten- und Schriftmetadaten aus. Fehlt ein solches Feld bei einem eindeutig zugeordneten Vorlagenobjekt, benennt `native_template_fields_missing` die Daten und sperrt den Versand. Die ursprünglichen Werte bleiben in `reopening.templateFields`; sie werden nicht stillschweigend als Kundenänderung ergänzt. Die spätere UI-Brücke muss diese Informationen vom geladenen Produkt bis zum Entwurf erhalten.
- `gates.nativeSendAllowed` ist nur ohne Datenverlust-/Wiederöffnungsblocker **true**. Das bedeutet ausschließlich: Die Eingabe eignet sich für einen gesondert authentifizierten Testtransport. Diese Komponente sendet nichts und erteilt keine Zugriffsrechte. `requiresAuthenticatedTestTransport` und `serverValidationRequired` bleiben **true**, `checkoutAllowed` und `productionAllowed` bleiben **false**. Vollständige Wiederaufnahme, Kundenzugriff, CSRF, Preisabgleich, Angebots-/Warenkorbbindung sowie Bestellannahme bleiben außerhalb dieses Adapters. Rechte/Schriften/Konturen und Bilddekodierung prüft weiterhin der echte Server; die Formprüfung hier ersetzt dies nicht.
- Keine tatsächliche Produktfreigabe aus der synthetischen Testfixture ableiten. Tests nutzen absichtlich einen anderen cfg_-Beispielschlüssel, eigene Text-/Motivkennungen und ein synthetisches Einpixelbild. Maße und Beispieloptionen bilden nur Abgrenzungsfälle ab.

## Gelesene Vertragsquellen

Repository `Chris83638w/gravuru-2027`, Branch `dev/konfi-neu-20261019`, fest gepinnt auf `bf5c059f13e0868d7c554616b7c35ff7a328ae62`:

- `app/workshop/http.mjs`, `model()` und `/api/workshop/acrylic-drafts`: cfg_-ID, `${id}:${revision}` als Profilrevision, POST-Hülle `{input}`, private Entwurfsänderungen mit Token/erwarteter Revision.
- `app/workshop/acrylic-review.mjs`: `validateAcrylicReview`, native Eingabefelder und Medienzuordnung; `prepareAcrylicReview` speichert Original/Edited und nutzt serverseitige Produkt-/Preisprüfung.
- `app/configurator/variant-m/contract.mjs`: `cleanObject`-Felder und Abgrenzung `uxPhotoCrop`.
- `app/configurator/variant-m/workshop-review.mjs`: bestehender nativer Browseraufbau des Inputs.
- `app/workshop/customer-photo.mjs`: kanonisches Base64, maximal 15 MB und serverseitiges Bilddekodieren.
- Unveränderte lokale Quelle: `../../konfigurator-update-bis-20261016/configurator/variant-m/ux-model.mjs` (`customerDraft`) sowie `photo-editor.mjs` (separate `photoEdit`-Parameter).

Prüfung: `node --test adapter/native-review-adapter.test.mjs` aus dem Pilotordner, mit Node.js 24. Der Test importiert den unverändert gesicherten September-`customerDraft`-Erzeuger aus `legacy-source/configurator/variant-m/ux-model.mjs`. Er prüft unter anderem Produkt-/Revisionsverwechslungen, abweichende Maße, bytegleiche Original/Edited-Bilder, Freistellwünsche, Verlustsperren und unveränderte Eingaben. Das ist eine lokale Vertragsprüfung, kein erfolgreicher Server-/Shopify-Durchlauf.

## Eigenständig prüfbare Quellsicherung

`legacy-source/` enthält die 13 JavaScript-Dateien des vollständigen statischen Importbaums dieses `customerDraft`-Erzeugers, einschließlich der vorhandenen Abhängigkeit `fflate`, sowie deren vorhandenen Lizenztext `fflate-LICENSE.txt`. Die Dateien wurden bytegleich mit ihren ursprünglichen relativen Pfaden übernommen. Bilder, Materialdateien, Schriftdateien, Datenbanken, Laufzeitkonfigurationen und Zugangsdaten sind nicht Teil dieser Kopie. Die gesicherten Quelldateien wurden nicht bearbeitet.

`legacy-source/SOURCE-MANIFEST.json` nennt für jede Datei Originalpfad, Dateigröße, SHA-256-Prüfsumme und statische Imports. Es kennzeichnet die Sicherung ausdrücklich als lokalen Arbeitsstand; der dort genannte historische Übergabecommit ist keine Behauptung, dass alle Dateien noch diesem Commit entsprechen. Die Prüfungen benötigen damit weder den ursprünglichen September-Ordner noch Pakete aus `node_modules`. Ein frischer Klon des vollständigen Pilotordners und Node.js 24 genügen für den oben genannten Testlauf. Das bedeutet nicht, dass damit der Konfigurator oder das Backend vollständig gestartet werden kann.
