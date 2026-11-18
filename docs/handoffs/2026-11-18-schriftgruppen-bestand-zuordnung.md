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

## Bestandsprüfung am Server – durchgeführt

Am **18.11.2026, 07:13–07:15 Uhr Europe/Bucharest** (05:13–05:15 UTC) über Chris’ angemeldete Plesk-Sitzung, Konsole **Node.js in app-2027.gravuru-designwerkstatt.de**, Node 24.22.3. Claude hatte eine andere, abgemeldete Browsersitzung; Astra hat die lesenden Abfragen ausgeführt und ihm die Ergebnisse zur Gegenprüfung gegeben. Die Serverprüfung ist nicht mehr durch eine fehlende Anmeldung blockiert.

Die tatsächlich ausgewählte Startdatei start-r5.cjs lädt app.cjs. Aus dessen Konfiguration wurden der native Datenpfad private/acryl-employee-20261021-v1/data und die aktive Katalogkopie private/issue139-katalog-20261102 bestätigt. Dieser Bericht betrifft diesen nativen Konfi-Datenbestand, nicht pauschal alle weiteren Legacy-, Galerie- oder Sicherungsdatenbanken des Servers.

| Feststellung | Tatsächlicher Bestand |
| --- | --- |
| Mandant | ausschließlich gravuru |
| Profildatenbank | Schema 2, WAL; 2 Profile insgesamt |
| Schriftprofil | genau eines: Schrift-Set tuerschilder (Katalog), Revision 1, 16 Schriften |
| Weiteres Profil | ein Motivprofil, nicht verändert |
| Schriftstandard / Kategoriezuordnungen | Standard „Vererben“, keine Schrift-Kategoriezuordnung, Einstellungsstand 1 |
| Produktdatenbank | Schema 4, WAL; 1.090 Datensätze: 19 Vorlagen und 1.071 Produkte, nicht archiviert |
| Direkte Schriftprofil-Zuordnung | 798 Produkte ohne das Feld, 273 mit „Vererben“, kein direkter Profilverweis |
| Bindung über Standard/Kategorie/Produkt | kein Produkt ist über diese Profilverwaltung an das Schriftprofil gebunden |
| Katalog-Importmarker | genau 1 Produkt mit katalog:-Marker, ebenfalls „Vererben“ |

**Wichtig:** Die 798 Produkte ohne Zuordnungsfeld gehören nicht zum vollständigen neuen Profilvertrag. Die ermittelte fehlende Profilbindung besagt nicht, dass sie keine Schriften oder keine eigenen eingefrorenen Auswahlregeln hätten. Auch published_revision = null bei allen geprüften Datensätzen ist kein Nachweis fehlender Shopify-Veröffentlichung; ältere Bindungswege werden dadurch nicht gezählt. Aktuelle Köpfe wurden untersucht, keine bestehenden Bestellstände verändert.

### Herkunft und Katalogabgleich

Die aktive Server-Katalogkopie steht ebenfalls auf **8236b8bf**. schriften/sets.json, themen.json und struktur.json sind anhand ihrer SHA-256-Prüfsummen bytegleich mit den Git-Quelldateien dieses Stands. Alle acht Listen stimmen einschließlich Reihenfolge überein.

Das vorhandene Türschild-Schriftprofil passt in allen **16 Positionen** zur Katalogliste: zehn Kennungen stimmen direkt als Name überein; sechs importierte Kennungen enthalten die passenden ersten zwölf Zeichen der vollständigen SHA-256-Prüfsumme ihrer tatsächlichen Katalog-Schriftdatei (Michroma, Lato, Comfortaa, Rounded Elegance, Alex Brush, Homage). Damit ist die Zuordnung durch Inhalt und Dateibelege gestützt, nicht bloß durch den Profilnamen. Noch keine Herkunft in Schema 3 eingetragen und nichts übernommen.

Die anderen sieben Kataloglisten haben in diesem nativen Bestand kein Schriftprofil. Insbesondere existiert hier kein Profil der alten Liste Schlüsselanhänger. Das ist ein Befund zu diesem Bestand, keine Aussage über beliebige andere Datenbanken oder eingebettete Designressourcen.

### Konsequenz für das spätere Einspielen

Die reine Pflege der Listen verbindet die neuen Gruppen **noch nicht** mit den bestehenden Produkten. Die neue Importlogik schützt bestehende abweichende Zuordnungen einschließlich „Vererben“; sie darf diesen Befund nicht still in 1.071 neue Zuordnungen umwandeln. Nach Bestätigung des Vorschlags braucht der Anschluss daher einen ausdrücklich beschriebenen, begrenzten Produkt-/Kategorieplan und eine Prüfung im tatsächlichen Kundenweg. Eingefrorene Designs, Entwürfe, Bestellungen und vorhandene Bindungen bleiben erhalten. Die zwei offenen Gruppeninhalte werden nicht erfunden.

### Nachweise und Grenzen

Je Datenbank nur lesende Transaktionen mit Zeitstempeln. Getrennte Lesungen sind kein gemeinsamer konsistenter Sicherungssatz. Produktabfragen projizierten nur Schriftzuordnung und Kategorie-IDs mit SQLite json_extract; große Ressourcen-/Designdokumente wurden nicht vollständig in den Prüfprozess geladen. Das ist eine begründete Anpassung der von Claude vorbereiteten Abfrage, kein unverändert ausgeführtes Skript. Keine neue SQLite-Sicherung erstellt; die passende Sicherung vor einer späteren Migration bleibt Teil des Einspielplans. Keine Migration, Geschäftsdatenänderung, App-Unterbrechung, Veröffentlichung oder Deployment. SQLite kann beim Lesen WAL/SHM-Begleitdateien öffnen/anlegen.

Die sichtbaren JSON-Ausgaben wurden inhaltlich unverändert gesichert: docs/measurements/2026-11-18-font-server-inventory.json. Lokaler Quellen-/Dateiabgleich: docs/measurements/2026-11-18-font-server-inventory-comparison.json. Keine Kunden-/Bestelldaten in den Nachweisen.

## Quellen und Stand

- [Katalog: Schriftlisten](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfab7322447ec46661c116fa526331af3d/schriften/sets.json), [Themen](https://github.com/Chris83638w/gravuru-katalog./blob/8236b8bfab7322447ec46661c116fa526331af3d/themen.json), [Produktlinien](https://github.com/Chris83638w/gravuru-katalog./tree/8236b8bfab7322447ec46661c116fa526331af3d/linien).
- [Gemeinsamer Abgleich im Issue #254](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6969615613).
- [Bereits abgenommene Backend-Pflege, PR #256](https://github.com/Chris83638w/gravuru-2027/pull/256#issuecomment-6969548604).

Keine Katalog-/Profil-/Produktänderung, kein Merge/Deploy. Nichts live ohne Chris’ „live“.
