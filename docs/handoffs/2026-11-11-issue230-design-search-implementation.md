# #230 C – freigegebene Designsuche umgesetzt

Stand 11.11.2026, Codex/Astra. Folgebranch `dev/astra-issue230-search-material-20261111` ab `6298f7af22056333569b030c249ce64568e46beb`. Chris hat im laufenden Chat den Einbau des gezeigten C1-Feldes auf Desktop/Mobil ausdrücklich freigegeben. Frühere Aussagen „C noch unbestätigt“ sind für diesen Folgeauftrag überholt. Keine Serverinstallation, keine Produkt-/Shopifyänderung, keine neue Designfreigabe.

## Quellen und fachliche Grenzen

- [Originalplan 6c9b2d98](https://github.com/Chris83638w/gravuru-2027/blob/6c9b2d98/docs/handoffs/2026-11-10-design-search-and-catalog-plan.md), [Bildherkunft 4682065](https://github.com/Chris83638w/gravuru-2027/blob/4682065aeec43a0046bdff2de0b5a4daf210cbec/docs/reviews/2026-11-11-design-search-preview/README.md), [Auftrag #230](https://github.com/Chris83638w/gravuru-2027/issues/230).
- GitHub `main` beim Beginn neu gelesen: `76269aa85b5dd7e22957fb138de7d404758d9ea5`. #230-Kommentare erneut gelesen; die spätere Chatfreigabe gilt. `AGENTS.md`, Entscheidungsregister, Start- und Umsetzungspakete wurden gelesen.
- Gesucht werden vorhandene Designnamen, vollständige Katalog-IDs, exakte D-Nummern (auch `23` und `D23`), Themen-IDs/deutsche vorhandene Themenbezeichnungen sowie explizite Motivnamen/Schlagworte. Keine Bild-/Konturerkennung, keine erfundenen Motivnamen. Originalspruchsuche wurde nicht zusätzlich aktiviert; Kundentexte werden nicht indexiert.
- Bestehende Sitzung, aktiver Produkt-/Variantenstand, Modulfreigabe, Material-/Prozesszuordnung, Form/Größe und native Passprüfung begrenzen die Auswahl vor Suche und Seitenteilung. Die Suche übersteuert nur die Themenvoreinstellung, keine Berechtigung. Eigene Originale vor Ergänzungen, innerhalb eines Rangs stabile Reihenfolge. Maximal 40 Karten pro Serverseite.
- Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich; dieser Auftrag verändert keine Gestaltung oder Originalressource.

## Implementierung

Ein beschriftetes Feld direkt vor den Designkarten, Beispiel „z. B. Haus, Familie oder D23“, Leeren, Trefferzahl und verständlicher Nulltreffer. Eingabe maximal 80 Zeichen, 250 ms Tippause; Enter sucht sofort, Escape/Leeren löscht, Fokus bleibt im Feld. Kompositionseingaben werden nicht vorzeitig abgesendet.

Die bestehende öffentliche Galerie erhält `q` über Client, Sitzungs-Transport und den engen Galerie-Endpunkt. Querywechsel invalidiert laufende Seiten sofort; verspätete Ergebnisse und Fehlermeldungen bleiben wirkungslos. Größen-/Themenwechsel und Leeren starten wieder auf Seite 0. Bestehendes Bildladen mit höchstens zwei gleichzeitigen Abrufen und sichtbarkeitsabhängigen Vorschaubildern bleibt erhalten.

Suchmetadaten gehören zur unveränderlichen Modellinstanz; keine synchronen Katalog-/SVG-Dateilesungen je Tastendruck. Signierte persistierte Galerie-Snapshots sind auf v3 angehoben, enthalten die begrenzten Suchmetadaten und verwerfen alte v2-Bestände. Die unveränderten Zugriffsprüfungen laufen auch bei Cachetreffern.

Native Vorschaueditoren ohne Shop-Galerie durchsuchen ihren bereits nach Form/Größe aufgelösten Vorlagenbestand mit demselben Suchmodell. Der Workflow erhält dafür einen einzelnen Hook. Suchausschlüsse haben ein eigenes Attribut mit einer CSS-Regel oberhalb der bestehenden `display:flex!important`-Spezifität sowie `inert`/`aria-hidden`; beim Leeren werden diese wieder entfernt. Dies behebt den in der echten Mobilprüfung entdeckten Fall „Trefferzahl 1, aber 27 sichtbare Karten“.

Die bestehende Suchauswertung wird durch Root um `searchKind: motif|design` erweitert, ohne neue Datenbank/App/API. Die Galerie meldet ausschließlich das abgeschlossene aktuelle Ergebnis mit Gesamttrefferzahl. Neue Eingaben brechen wartende Meldungen ab; Nachladeseiten zählen nicht erneut. Der unabhängige Review fand und korrigierte zusätzlich den Fall Haus → Hausx → Haus vor Ablauf der Meldefrist.

Die Browserprüfung deckte einen bisherigen Integrationsfehler der Modulprofile auf: `window.parent.UniversalConfig` besitzt einen anderen JavaScript-Objektprototyp als das Editorfenster. Der gezielte Folgefix akzeptiert echte fremde `Object.prototype` und Nullprototypen. Er prüft den eigenen Konstruktor-Deskriptor ohne Getteraufruf, den direkten Prototypabschluss, `constructor.prototype` und die native Object-Signatur. Klassen, Datum, Arrays, getarnte Prototypen, Zusatzfelder, ungültige Revisionen und nichtboolesche Freigaben bleiben verboten. Kein Host-Workaround und keine Lockerung der sieben Modulflags.

## Datenlücken aus den echten v8-Produkten

| Produktbestand | Native Designs | Designs mit mindestens einem unbenannten eingebetteten Motiv | Solche Motive insgesamt |
|---|---:|---:|---:|
| Hauptacryl | 1.205 | 1.157 | 1.367 |
| Jedes der sechs Kleinprodukte | 27 | 24 | 26 |

Das sind getrennte Produktbestände, keine Addition eindeutiger Katalogmotive. Ein Designname wie „Vor- und Nachname mit Haus“ ist weiterhin durchsuchbar. Diese Umsetzung behauptet keine vollständige redaktionelle Motivverschlagwortung. Die neun Geometrieausnahmen und zwei bewusst versteckten Designs aus B bleiben unverändert ausgeschlossen.

## Ausgeführte Prüfungen

- Suchmodell, native Tastatur-/Kompositionssteuerung, Paging, Galerie, Client und leichte Modellprojektion: 66/66 gezielte Prüfungen bestanden.
- Zusätzliche echte Varianten-/Material-/Größenpfade, Snapshot-Neuaufbau und -Wiederherstellung, exakte reine Designnummer: 47/48 im Erweiterungslauf; einziger Fehler war der unvollständige DOM-Testport (`before()` fehlte), danach der betroffene echte Native-Hook-Test separat grün. Kein Produktcode wurde auf diesen Testfehler angepasst.
- Native Sichtbarkeits-/ARIA-/Fokusmarker und tatsächliche CSS-Spezifität nach Browserbefund: 2/2 grün. Der Browsernachweis des berechneten Stils erfolgt bei Root; ein Quelltexttest wird nicht als Browserabnahme ausgegeben.
- Modulprofil-/Fenstergrenzen-/Native-Race-Gruppe: 12/12 grün; nach engerem Konstruktor-Deskriptorcheck betroffene Realm-Datei erneut 2/2 grün. B hat den finalen Prototyp-/Schema-Diff unabhängig grün gelesen.
- Öffentlicher Shop-Einstieg: 41/42 HTTP-Prüfungen zunächst grün, inklusive neuer Query-/Rechte-/Nummernprüfung. Einziger Fehler war `logo_converter_unavailable` im neuen Arbeitsbaum ohne Pythonkonfiguration. Mit dem bereits von B geprüften lokalen Python-/Cairo-Pfad nur diesen Test wiederholt: 1/1 grün. Keine erneute komplette Suite.
- 35 lokale HTTP-Fälle mit den sieben echten v8-Plänen: leer, Haus, D23, 23, unbekannter Begriff; alle erfolgreich. D23/23 je genau ein Treffer. Kleine Edelstahlakte: Haus 2, D23 1, Nulltreffer 0, leer 27. Hauptstand im Startformat: leer 124, Haus 12. Lokale Hauptabfragen ca. 1,9–3,1 Sekunden; keine allgemeine Leistungs-/Liveabnahme daraus abgeleitet.
- Letzter echter Host-Build: 157 Module, 16 Styles, 76 unveränderte geprüfte Referenzressourcen. `git diff --check` sauber. Auswertungs-/Materialtests und Root-Browserergebnisse werden im gemeinsamen Abschlussbericht separat geführt.

Wesentliche Befehle: `node --test app/configurator/variant-m/design-search.test.mjs app/configurator/variant-m/gallery-pager.test.mjs app/workshop/shop-design-gallery.test.mjs app/workshop/shop-entry-client.test.mjs app/workshop/shop-gallery-model.test.mjs`; Erweiterung mit `native-design-search.test.mjs`, `shop-design-gallery-alle.test.mjs`, `shop-design-gallery-variant.test.mjs`; `node --test app/workshop/shop-entry.test.mjs`; gezielte Wiederholung `--test-name-pattern='customer logo conversion'`; `node --test app/configurator/variant-m/module-profile-realm.test.mjs app/configurator/variant-m/module-profile.test.mjs`.

## Lokaler Host und nächster Schritt

Nur Loopback `http://127.0.0.1:8248/`, alle sieben echten v8-Planprodukte. `/review?product=Tuerschild-Edelstahl-5x2_v1` nutzt den tatsächlichen serverseitigen Galerieservice; `native=1` den nativen Fallback. `/review/analytics` lädt die echte Auswertungsseite mit lokalem Prüfhinweis. `/__proof` nennt die Plan-/Dateipins und den Build. Lokale Variantenbindungen sind synthetische Prüfadapter, keine produktiven Bindings. Nur die isolierte Suchstatistik wird geschrieben; Produkt-/Shop-/Uploadschreibwege liefern 403. Kein Confirm/Execute.

Der Host und lokale Datenbanken liegen ausschließlich unter `work/search-preview`, nicht im Git-Payload. Originalpläne und Ressourcen bleiben unangetastet. Die abschließende Root-Browserprüfung ist bestanden: Desktop/Mobil, native Acrylsuche mit tatsächlich ausgeblendeten und nicht fokussierbaren Ausschlüssen, vollständige Wiederherstellung beim Leeren sowie persistente Design-Auswertungsfilter. Belege und genau nächster Schritt stehen in der [gemeinsamen Abschlussübergabe](2026-11-11-issue230-search-material-final.md). Installation und Live-Abnahme bleiben getrennt.
