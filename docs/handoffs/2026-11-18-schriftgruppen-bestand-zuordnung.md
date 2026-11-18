# Alte Schriftlisten → Chris’ Schriftgruppen

18.11.2026 · Vorschlag von Astra und Claude, noch nicht angewendet.

## Ergebnis der Katalogprüfung

Katalog-main **8236b8bfab7322447ec46661c116fa526331af3d**, gegen den Remote-Stand geprüft. **8 Listen, 20 Themen, 59 Unterkategorie-Zuordnungen in 14 Produktlinien**. Alle Verweise zeigen auf vorhandene Listen. Astra und Claude haben die Zuordnung unabhängig abgeglichen. Die 106 Hauptprodukt-Einträge im Katalog sind keine Zählung tatsächlich importierter oder live geschalteter Produkte.

| Alte Liste | Vorgeschlagene Gruppe | Unterkategorien | Bestehende Themen |
| --- | --- | ---: | --- |
| Hausnummern (`hausnummern`) | **Hausnummer & Firma** | 4 | Hausnummern |
| Türschilder / Namensschilder (`tuerschilder`) | **Tür & Familie** | 15 | Namensschilder, Familienschilder, Willkommensschilder, Monogramme |
| Andenken / Gedenken (`andenken`) | **Andenken & Hochzeit** | 16 | Hochzeitsschilder, Gedenktafeln, Andenkenschilder, Tiergedenktafeln, Hunde-Gedenktafeln, Katzen-Gedenktafeln |
| Schlüsselanhänger (`schluesselanhaenger`) | **Geschenke & Kinder** | 0 |  |
| Geschenkartikel (`geschenkartikel`) | **Geschenke & Kinder** | 6 | Baby- und Geburtsschilder, Kinderzimmerschilder, Geschenkartikel, Wanddeko |
| Pferdeschilder / Stall / Hof (`pferdeschilder`) | **Tiere & Hof** | 2 | Pferdeschilder |
| Hundeschilder (`hundeschilder`) | **Tiere & Hof** | 6 | Hundeschilder, Katzenschilder |
| Firmenschilder (`firmenschilder`) | **Hausnummer & Firma** | 10 | Firmen- und Praxisschilder, Hinweisschilder |

Die acht technischen Kennungen bleiben zunächst erhalten. Mehrere bisherige Listen können derselben inhaltlichen Gruppe entsprechen. Das allein führt sie noch nicht zu einer einzigen gemeinsam bearbeiteten Liste zusammen; dafür muss der anschließende Pflegeablauf konkret festgelegt werden. Keine Änderung von Themen, Produktzuordnungen oder gespeicherten Designs in diesem Vorschlag.

## Die zwei wichtigen Sonderfälle

- **Tiergedenken gehört zu Andenken & Hochzeit.** Hunde-/Katzenschilder gehören zu Tiere & Hof. Entscheidend ist hier der Verwendungszweck.
- **Die alte Liste „Schlüsselanhänger“ hat im Katalog keine Verweise.** Die Produktlinie Schlüsselanhänger nutzt bereits je nach Thema andere Listen. Dass die alte Liste auch in der Serverdatenbank unbenutzt ist, ist noch nicht nachgewiesen.

Unser Vorschlag erhält zunächst die thematische Zuordnung. Deshalb bekäme beispielsweise ein Schlüsselanhänger mit Namen weiterhin die Gruppe Tür & Familie, ein Hochzeits-Schlüsselanhänger Andenken & Hochzeit. In den vier Geschenk-Linien Brettchen, Lineale, Schlüsselanhänger und Stifthalter nutzen **11 von 15 Unterkategorien** solche anderen Themenlisten, vier nutzen Geschenkartikel. Alle Geschenkprodukte pauschal Geschenke & Kinder zuzuordnen wäre eine zusätzliche fachliche Änderung; sie ist hier nicht enthalten.

## Schriftinhalte

Bestätigt sind die gleichen **29 Standardschriften** für Tür & Familie, Hausnummer & Firma und Andenken & Hochzeit. Hinzu kommen die Originalschriften des geöffneten Designs. Keine feste 32er-/35er-Abschneidegrenze.

Alex Brush, Allura, Audiowide, Bebas Neue, Caveat, Caviar Dreams, Cinzel, Comfortaa, Comic Neue, Dancing Script, Daniel, Dream Orphans, Fineliner Script, Great Vibes, Homage, Kaushan Script, Lato, Magnolia Script, Michroma, Montserrat, Pacifico, Permanent Marker, Roboto Slab, Rounded Elegance, Sacramento, Stylish, Tangerine, Zentenar Fraktur, Poppins.

Für **Geschenke & Kinder** sowie **Tiere & Hof** bleibt die Schriftauswahl offen. Die vorhandenen Vorschläge werden nicht als bestätigte Auswahl eingetragen. Poppins hängt weiterhin am noch nicht eingespielten [Katalog-PR #192](https://github.com/Chris83638w/gravuru-katalog./pull/192).

Beim später bestätigten Übernehmen der 29er-Auswahl würden folgende Schriften aus der allgemeinen neuen Auswahl verschwinden. Sie bleiben in bestehenden Designs erhalten und sind beim Öffnen eines solchen Designs zusätzlich verfügbar:

- **Türschilder / Namensschilder**: 5 bisherige Auswahlschriften entfallen: Raleway, Cormorant Garamond, Playfair Display, Lora, Josefin Sans.
- **Hausnummern**: 5 bisherige Auswahlschriften entfallen: Minimalist, Archivo Black, Days One, Fjalla One, Oswald.
- **Firmenschilder**: 7 bisherige Auswahlschriften entfallen: Aldrich, Raleway, Playfair Display, Libre Baskerville, Roboto Condensed, Josefin Sans, Courier Prime.
- **Andenken / Gedenken**: 10 bisherige Auswahlschriften entfallen: Antic Slab, Bellefair, Bernardo Moda Contrast, Italianno, Parisienne, Cormorant Garamond, Playfair Display, Libre Baskerville, Lora, Josefin Sans.

## Bestandsprüfung am Server

**Noch offen: Plesk ist abgemeldet.** Chris wurde um Anmeldung im vorhandenen Tab gebeten; der Auftrag zur Prüfung liegt bereits vor. Kein erfundener Profil-/Produktbestand und keine Gleichsetzung von Katalogbestand und Live-Datenbank.

Nach Anmeldung: Datenpfade und Mandanten prüfen, Profil-Schema und vorhandene Listen nur lesend erfassen, mögliche Katalogherkunft mit Liste und Verweisen vergleichen, aktuelle Produkte nach Zuordnungsart sowie Profil zählen. Keine automatische Übernahme anhand eines Namens. Keine Bestell-/Kundendaten in Git oder diesen Bericht aufnehmen. Datenbank-Schreibvorgänge, Migration, App-Stopp, Import, Veröffentlichung und Deployment sind nicht Bestandteil dieser Prüfung. Bei getrennten Lesetransaktionen Zeitpunkte und mögliche Zwischenänderungen kennzeichnen; nicht als gemeinsamen konsistenten Sicherungssatz ausgeben.

## Quellen und Stand

- [Katalog: Schriftlisten](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfab7322447ec46661c116fa526331af3d/schriften/sets.json), [Themen](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfab7322447ec46661c116fa526331af3d/themen.json), [Produktlinien](https://github.com/Chris83638w/gravuru-katalog./tree/8236b8bfab7322447ec46661c116fa526331af3d/linien).
- [Gemeinsamer Abgleich im Issue #254](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6969615613).
- [Bereits abgenommene Backend-Pflege, PR #256](https://github.com/Chris83638w/gravuru-2027/pull/256#issuecomment-6969548604).

Keine Katalog-/Profil-/Produktänderung, kein Merge/Deploy. Nichts live ohne Chris’ „live“.
