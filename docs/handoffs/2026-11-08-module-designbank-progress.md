# Konfi-Module und Edelstahl-Designbank – gesicherter Stand

08.11.2026: **Die Designbank ist serverseitig auf Revision 4 aktiviert.** Kundenstart, Designwechsel nach Formatwechsel, drei Warenkorbpreise und die korrekte Logo-PNG-Vorschau sind bestätigt. Die gezielten R15-Korrekturen aus PR #209–211 sind aktiviert; Wieder-Auswahl und große Vorschau haben die Browserprüfung bestanden. **Der Bearbeiten-Link im Warenkorb öffnet noch den alten Konfi; der ergänzende Themefix ist vorbereitet, aber nicht gespeichert.** Die allgemeine Modulverwaltung und Synchronisierung bleiben **nicht produktiv aktiviert**.

## Verbindlicher Umfang

Ein gemeinsamer freigegebener R15-Konfi; Kundenaufbau und bestehende Gestaltung bleiben unverändert. Produktgruppen bestimmen Module und Ausführungen, konkrete Optionen/Preise werden vor Neuanlage bestätigt. Edelstahl: acht Formen, 80 Größen, 404 Kombinationen; keine Fotos, optional SVG-Logo für 12,99 EUR. Startdesign Familie Rosenberg. Historische Bestellstände bleiben erhalten.

## Sicherung

Private Sicherung `mika-module-design-backup-20261108-v1`, abgeschlossen am 08.11., 10:36:45–10:38:42 Uhr Berlin: sechs SQLite-Dateien mit Integritätsprüfung, zugehörige JSON-Dateien, beide Startdateien und aktive Laufzeit; insgesamt 13 Dateien. Private Nutzdaten liegen nicht in GitHub.

- Serverbeleg: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-design-backup-20261108-v1/receipt.json`
- Beleg-SHA-256: `4adcfced9feac1a0c6c8d9649cf9590aeaf63bfd664b53746c7f7fc60ed985ef`
- Gesicherte Codebasis: `private/mika-steel-r15-shopify-20261108`; lesender Vergleich von 770 Quellmodulen, Manifest-SHA-256 `5f10e8caa033dc922562e8d3d57b80640e7f451d06a46ba2f0acfac954e91e94`.

## Designbank: erfolgreich aktiviert

Der D1-Import bot zuvor nur eine Wahl je Größe. Revision 4 enthält **251 vorhandene freigegebene Originale**, je Format 9–23 passende Designs; AB 12×8 und RE 15×10 jeweils 21. Alle 80 Größen, 404 Preis-/Befestigungskombinationen, bisherigen Originale und Rosenberg als Start bleiben erhalten. Ungeeignete Originale/Größenzuordnungen wurden dokumentiert, nicht umgestaltet.

Produkt: `cfg_ac514214-a313-4738-8008-00445ee1befd`. Der erfolgreiche Serverlauf dauerte **11:04:44–11:05:48 UTC / 12:04–12:05 Uhr Berlin**, Exit 0. Alle 404 Pläne wurden geprüft; 404 neue Bindungen und 404 aktive Zuordnungsköpfe auf Revision 4 atomar übernommen. Katalogfreigabe `mika-steel-normal-door-bank-r4-20261108` einmal angelegt. Anschließende externe Rückprüfung erfolgreich; **0 Shopify-Schreibzugriffe**, alte Bestellstände nicht umgeschrieben. Lokaler Beleg: `outputs/steel-design-bank-repair-20261108/server-activation-complete.json`. Signierte Kundenlinks werden nicht dokumentiert.

Die ersten Versuche stoppten wegen 53 fehlender Katalogressourcen und anschließend wegen unterschiedlicher Sortierung numerischer Schlüssel im Operator-Hash; die Bindungstransaktion wurde zurückgerollt. Ressourcen und vier benötigte Laufzeitkonstruktoren wurden privat ergänzt. Nur der Operator-Bindungshash wurde korrigiert; Importfingerprint, Preisbelege und nativer Binder blieben unverändert. Drei gezielte Regressionen bestanden, danach der erfolgreiche dritte Serverlauf.

Die Prüfsummen haben unterschiedliche Zwecke:

| Zweck | SHA-256 |
|---|---|
| Gesicherte Ausgangsrevision 3 | `bfca056e6e9e4a026e004c52e6bc95b35fc2b2567244a0116bf04d5c1e47245a` |
| Finale normalisierte Kandidatdatei | `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0` |
| Operator-Kanonisierung / Importfingerprint | `852bfe8174aa0bec8d8187f8dd00d3f90b281b1ea58399ce7441f1b4ee9dd451` |
| Nativer Bindungs-Dokumenthash | `3b28df2b1792ca561243f1c592458f4dd309b0c317e88b83362a69e3e0586c1c` |

Kandidat: `outputs/steel-design-bank-repair-20261108/live-runner/candidate-product-document.live-normalized.compact.json`. Operator-/Transportdateien bleiben privat unter `private/mika-steel-designbank-update-20261108-v1/`. Frühere Payloadgrößen waren vor Normalisierung gemessen; die finale Kundenauslieferung ist separat zu messen.

## Module und Synchronisierung: geprüft, noch nicht live

- [PR #201](https://github.com/Chris83638w/gravuru-2027/pull/201): Modulprofile und bestätigte Produktgruppen-Anlage. Echter Edelstahl lokal mit/ohne Logo geprüft: 808 unveränderte Preis-/Geometrievergleiche, keine Duplikate. [Abnahme](../reviews/2026-11-08-module-profiles/real-steel-local-acceptance.md).
- [PR #202](https://github.com/Chris83638w/gravuru-2027/pull/202), Abschluss `324a6434c2e506f222dd3056b4333ad36af38b8d`: bestätigter Galerieabgleich, serverseitige Modulgrenzen und atomare Bindungen. Zwischenreview: Legacy-Preisverträge bleiben strikt, gesperrte Logos nicht speicherbar, Altbestellungen unverändert. Browser-Modulverwaltung auf **Port 8209 mit simuliertem Shopify** erfolgreich geprüft; die frühere 403-Navigation ist kein offenes Abnahmehindernis mehr. Zugriffsschutz unverändert. [Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-module-sync-20261108/docs/handoffs/2026-11-08-module-sync-adapter.md).
- [Draft PR #203](https://github.com/Chris83638w/gravuru-2027/pull/203), Commit `0da2cf7ea59a4b9670e71e6aaf647f11cf26b2f0`, Basis PR #194 `d689044b`: separater Verwaltungshost-Anschluss, optional `--management-config`; 4/4 Tests bestanden, nicht aktiviert.
- [Draft PR #207](https://github.com/Chris83638w/gravuru-2027/pull/207), Commit `4821ff99babd41b32784e1014e8124bac9912d5b`: derselbe optionale Anschluss für den tatsächlichen Plesk-Start. 7/7 gezielte Prüfungen; fremde/fehlende Originalzuordnung gesperrt. Drei Live-Basisdateien gesichert und Delta geprüft; kein Deploy.
- [Draft PR #208](https://github.com/Chris83638w/gravuru-2027/pull/208), Produktionscommit `150a04f`, Nachweisstand `043846538d9177f933708dafa55392a58fb5036a`: gemeinsamer Modul-/Gruppenservice mit derselben dynamischen Galerie-Registry. **5/5 Tests, keine übersprungenen Fälle**: echte isolierte Plesk-Routen, Profilzuweisung, bestätigter Entwurf, Quellkonflikt, Idempotenz und Zugriffsschutz. Logo an/aus am echten r4-Dokument erhält alle 251 Designs. Zwei Produktionsmodule geändert, nicht aktiviert. [Übergabe](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-shared-module-management-20261108/docs/handoffs/2026-11-08-shared-module-management.md).

## Abnahme und nächster Schritt

**Wieder-Auswahl und Vorschau bestätigt:** Im tatsächlichen Shopify-Iframe mit Chrome-Touchsimulation bei 390×844 sind Anker-Motiv und Text nach Tippen auf eine freie Fläche wieder auswählbar und verschiebbar. Auch nach Textbearbeitung, „Fertig“ und erneuter Abwahl funktioniert das Motiv erneut; die Ansicht bleibt bei 100 %. „Große Vorschau“ öffnet den bestehenden Dialog, „Zurück zur Konfiguration“ kehrt korrekt zurück – mobil simuliert und am Desktop bei 1440×709. Dies ist ein echter Browsernachweis, kein Test auf Handyhardware. Der Bearbeiten-Link aus dem Warenkorb ist weiterhin offen; Ursache und vorbereiteter Themefix stehen unten.

Designkandidat: 7.021 Struktur-/Galerie-/Preisprüfungen, 1.497 Vorlagenverträge und 37 Kundenfälle. Performance: 67/67 gezielte Tests; unabhängige Live-Codekopie mit 404 Bindungen erfolgreich, einschließlich spätem Rollback und Wiederholung ohne Duplikate. Alle 404 alten Bindungen/Preisverträge unverändert; 60-Sekunden-Frischegrenze erhalten. [Nachweis](https://github.com/Chris83638w/gravuru-2027/blob/dev/mika-module-sync-20261108/docs/reviews/2026-11-08-module-sync-performance/README.md).

Browserabnahme durch den Hauptagenten: frischer Kundenstart auf Revision 4, 21 Designs sichtbar; D3 „Zwei Zeilen mit Trennlinie“ mit drei Ebenen und eigenem Text geladen. Im tatsächlichen Shopify-Warenkorb bestätigt:

- AB 12×8, ohne Bohrung, D3 / „Test Eins“: **19,99 EUR**.
- RE 15×10, KGL, D1 / „Test Zwei“: **26,98 EUR**.
- Retro2 9×6, B02, „Test Drei“ mit SVG-Logo: **30,47 EUR**, davon Logo 12,99 EUR.

Gesamt **77,44 EUR**. Logo-Position mit Menge 2: 60,94 EUR, Gesamt 107,91 EUR; anschließend zurück auf Menge 1. Belege: `outputs/steel-design-bank-repair-20261108/live-cart-r4-three-cases.jpg` und `.txt`. **Die Logo-PNG-Vorschau ist inzwischen im echten Shopify-Warenkorb bestätigt:** Nach frischer R15-Bearbeitung zeigt „Test Drei“ das T-Kreis-SVG korrekt; Konfigurationsrevision 3, weiterhin 30,47 EUR und Gesamt 77,44 EUR. Belege: `outputs/cart-preview-uploads-20261108/live-cart-logo-correct.jpg` und `.txt`.

Die gezielten Serverfixes [PR #204](https://github.com/Chris83638w/gravuru-2027/pull/204) und [PR #205](https://github.com/Chris83638w/gravuru-2027/pull/205) sind aktiv: Nach Wechsel auf **RE 15×10 / KGL** erscheinen 21 Designs; **D3 „Zwei Zeilen mit Trennlinie“ wird übernommen**, drei Ebenen, Preis weiterhin **26,98 EUR**. Belege: `outputs/steel-gallery-lookup-fix-20261108/live-activation.json` und `outputs/steel-design-switch-projection-fix-20261108/live-selected-design.jpg`. Preise und Ausführungen unverändert.

[PR #206](https://github.com/Chris83638w/gravuru-2027/pull/206) für die Upload-PNG-Vorschau wurde **11:52:47.732 UTC / 12:52 Uhr Berlin** veröffentlicht: drei exakt geprüfte Quelldateien, bestehender R15-Serverbuild mit 151 Modulen/16 Styles; Bundle `editor-40ce536a78607de9.mjs`, HTML-SHA `b2a6d21d0ef3f096d91911b8b8c970dd42e58d7398b0efc539cd79d7a9d99d37`. Beleg: `outputs/cart-preview-uploads-20261108/live-activation.json`. Das tatsächlich geladene Bundle wurde für den oben genannten Logo-PNG-Nachweis im Browser verifiziert.

Die sieben Runtime-Dateien aus [PR #209](https://github.com/Chris83638w/gravuru-2027/pull/209), [#210](https://github.com/Chris83638w/gravuru-2027/pull/210) und [#211](https://github.com/Chris83638w/gravuru-2027/pull/211) wurden anschließend **12:13:41.722 UTC / 13:13 Uhr Berlin** geprüft aktiviert: R15 beim Bearbeiten aus dem Warenkorb erhalten, Wieder-Auswahl nach freier Fläche repariert und „Große Vorschau“ unter dem Produkt ergänzt. Aktives Bundle `editor-22ba7897da3f65ac.mjs`, HTML-SHA `fe8db413fc8d2eaebeb925a55dda4f5437e49c6caf87b574e2907c6393d570f1`; 151 Module/16 Styles. Bestehende `demo.css` bytegleich, keine weiteren Layoutänderungen; 0 Datenbank- und 0 Shopify-Schreibzugriffe bei dieser Aktivierung. Beleg: `outputs/r15-final-corrections-20261108/live-activation.json`. Browserbelege für die oben beschriebene Wieder-Auswahl und Vorschau: `mobile-reselect-and-preview.jpg`, `mobile-preview-under-product.jpg` und `desktop-preview-under-product.jpg` im selben lokalen Ausgabeordner.

**Warenkorb-Bearbeiten noch nicht abgeschlossen:** Die erneute Übergabe von Konfigurationsrevision 4 gelang: 30,47 EUR, Gesamt 77,44 EUR, weiterhin drei Zeilen ohne Duplikat. Der tatsächlich angeklickte Bearbeiten-Link öffnet jedoch weiterhin den alten Konfi. Der Serverteil aus PR #209 reicht allein nicht: Das aktive Theme-Liquid erzeugt den Link selbst und verwirft dabei den gespeicherten `ui`-Parameter. [PR #212](https://github.com/Chris83638w/gravuru-2027/pull/212), Commit `4d202f473e47db460e556ad5e57ce1bf6027b79c`, ergänzt genau diesen Parameter in einer Theme-Datei; 7/7 Renderprüfungen bestanden. Die aktive Datei ist gesichert, der Patch im Shopify-Editor vorbereitet und nach Textnormalisierung bytegleich geprüft, **aber noch nicht gespeichert**. Das Shopify-GraphQL-Werkzeug sperrt Schreibzugriffe auf das Haupttheme ausdrücklich; der Hauptagent hat den Nutzer deshalb um „Save“ im geöffneten Editor gebeten. Nach dem Speichern muss der echte Bearbeiten-Link zu Revision 4 erneut geprüft werden. Kein weiterer Konfi-Umbau und keine vorweggenommene Freigabe.

Für den Verwaltungshost sind Zielwerkstatt (`private/acryl-employee-20261021-v1/data`), Mandant `gravuru`, Store-Key `acryl`, Shop `gravuru-design.myshopify.com`, Produkt `16190784438652` und alle 404 aktiven Varianten belegt. Site 19 startet über `gravuru-2027-bulkapproval-3db1ef5d/ops/plesk/app.cjs`, Daten/Galerie unter `private/gesamtbestand-stage-0bb50565-20261106-v1/{data,gallery-4}`. **Dort sind nur 24/251 benötigte Stahloriginale vorhanden; diese alte Galerie darf nicht die vollständige r4-Designbank ersetzen.** Die 23-GB-Datenbank wurde nicht kopiert oder unbeschränkt durchsucht. Reine Moduländerung ohne Designüberschreibung ist lokal nachgewiesen; produktiver Anschluss bleibt getrennt freizugeben. Vorhandene App-/Preisleser, Freigabe und CSRF wiederverwenden; geprüfte PR-Stände kontrolliert zusammenführen. Private Anschlussvorlage: `outputs/module-production-connection-20261108/README.md`. Kein neuer Konfi, kein Live-Mount vor geklärter Quelle und bestätigtem Plan.
