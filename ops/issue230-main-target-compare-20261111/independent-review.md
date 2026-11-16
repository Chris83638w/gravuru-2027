# Unabhängiger Review des Hauptziel-Kopievergleichs

11.11.2026. Enger lesender Review von `main-target-compare-helper/compare-main-target-copy.mjs`, dessen Tests und `copy-guard.mjs`. Keine App-/DB-/Servermutation; keine breite Testsuite. Abgleich gegen die vorhandenen nativen Bindungs-, Profil- und Preisvertragsquellen im eingefrorenen Integrationskandidaten.

## Bestätigte Eigenschaften

- Nur Node-Kernmodule, keine App-/Repository-/Profilkonstruktoren, keine Migrationen, HTTP-Aufrufe oder Schreib-API. Alle geöffneten SQLite-Verbindungen erhalten `readOnly:true`, `query_only=ON` und einen Lesesnapshot. Der Helfer bestätigt/importiert/aktiviert nichts und gibt `readyForImport:false` aus.
- Absolute bestehende reguläre Kopiedatei mit `.copy.sqlite`, kein Symlink/Hardlink, bekannte Live-Datenverzeichnisse ausgeschlossen. Nichtleere WAL-/Journal-Abhängigkeiten führen zum Abbruch; die Datenbankbytes werden vor/nach dem Lesen verglichen. Ein geschlossenes, konsistentes Backup bleibt Voraussetzung.
- CLI hat feste echte Produkt-/Revisions-/Store-/Shop-/Dokument-/Countpins und exakte Mapping-/Intent-Dateihashes; keine CLI-Pinüberschreibung. Explizite synthetische Pins existieren ausschließlich am exportierten Testkern. Es wird kein Produkt aus einem Anzeigenamen oder unvollständigen Blatt abgeleitet.
- Produkt-/Variantenidentität und aktive Revisionsköpfe werden über tenant-/shopbezogene Joins gelesen. Feste Bindung, Optionen und Personalisierung werden über Binding-ID und – im nativen Schema – denselben Mandanten verbunden. 808 eindeutige erwartete IDs sind in 778 Zielzeilen und 30 zu erhaltende Restzeilen aufgeteilt; fehlende/zusätzliche/doppelte IDs, falsche Produkt-/Store-/Revisions-/SHA-/Fixed-Bindingwerte bleiben sichtbar. Eine zu große Abfrage bricht ab statt abgeschnittenen Erfolg auszugeben.
- Alle 778 nativen Optionen und Zielpreise werden gegen die gepinnte, zuvor unabhängig geprüfte v9-Zuordnung verglichen; alle 808 Preise zusätzlich gegen die vollständige alte Shopify-Lesekopie. Die 30 Restzeilen erhalten keinen erfundenen v9-Preis: ihre Optionen werden nur bei eindeutiger exakter Zuordnung der alten Shopbezeichnungen zum tatsächlichen alten Dokument verglichen. Mehrdeutigkeiten werden ausgegeben.
- Produktgruppenhash, lexikalischer Binding-Stringhash und gespeicherte SQL-Bytehashes sind getrennt und entsprechen den nativen Verfahren. Die 158 Preisabweichungen werden einzeln erfasst; keine eigene Preisformel. Die begrenzte Ressourcenprofilprojektion folgt den vier tatsächlichen Defaults des ausdrücklich gepinnten Zieles mit leeren Kategorien und vererbten Produktzuordnungen; Bestsellerfilter entspricht dem nativen Resolver. Sie ersetzt weder Ressourcenvalidierung noch Produktionsfreigabe.
- Vollmodelle, Font-/SVG-/Bildressourcen, beliebige Metadatenwerte, Kunden-/Ordertabellen werden nicht ausgegeben. Der Bericht enthält technische Identitäten, Hashes, Zähler, konkrete Options-/Preisdeltas und schmale Profil-/Vertragszusammenfassungen. Fehlende Profilkopie oder Tabellen werden nicht als vorhandene Profilpins ausgegeben.

## Vor Abschluss gefundene Nachbesserungen

Root identifizierte den vollständigen `readFileSync`-Buffer für den Hash der echten 4,35-GB-DB. Ein blockweise berechneter Datei-SHA ist erforderlich; größere Dokumentartefakte sind hiervon getrennt. Der Reviewer ergänzte drei enge Punkte: Der Legacyzweig ohne native Tenantspalten darf nicht beliebigen Mandanten zugeordnet werden; die tatsächliche Motiv-Abrechnungsart muss im Vertragssummary stehen; der gespeicherte `metadata.productionProfile`-Pin muss separat ohne eingebettetes Dokument gezeigt werden. Der Paketautor ist vor Abschluss informiert.

## Korrektur-Nachprüfung

**Abgeschlossen, kein verbleibender Befund im geprüften Kopievergleichsumfang.** Die vier Änderungen wurden eng nachgelesen:

- `hashFile()` verwendet einen wiederverwendeten 1-MiB-Puffer, `readSync` bis EOF und `closeSync` im `finally`; beide DB-Dateihashes rufen diese Funktion auf. Es gibt keinen Vollpuffer der Datenbank mehr. Zusätzlich unabhängig ausgeführt: ausschließlich diese Hashfunktion auf dem bereits geprüften 15.062.280-Byte-Ziel-Gzip, Ergebnis exakt `6b2d5989b1dd4859f4a6923faab2cbf9f25102f1f3e95edd77dad48b386c52cc`. Dafür wurde keine DB geöffnet und keine Datei geschrieben.
- Der fehlende Tenantspaltenfall verlangt jetzt explizit `--legacy-single-store true` **und** `tenantId==='gravuru'`. Moderne Tabellen lehnen das Legacyflag ab; gemischte Tabellen bleiben abgewiesen. Die gewählte Schemaart steht ausdrücklich im Ergebnis. Das entspricht der bestehenden nativen Begrenzung statt eines stillen Rückfalls.
- Tatsächliches und gewünschtes `motifCharge` werden getrennt ausgewiesen; fehlender Wert bleibt null. Keine neue Abrechnungsregel.
- Der gespeicherte Fertigungs-Metadatenpin ist auf `{id,revision,sha256}` beschränkt. Konsistenz zur Dokumentreferenz wird gesondert gemeldet; Abweichungen erscheinen zusätzlich in `pending`. Eingebettetes Fertigungsdokument, Maschinen-/Notiztexte werden nicht übernommen.

Finaler Autorenlog `main-target-compare-helper/tests.txt`: **9/9** gezielte synthetische Prüfungen erfolgreich, 0 übersprungen. Die ergänzten Regressionen prüfen mehrere Hashblockgrenzen, unzulässigen Legacytenant, unveränderte 808er Vollständigkeit, Motivabrechnungsart, schmale Metadatenprojektion und den nativen Bestsellerfilter ohne Ausgabe der Auswahltexte. Quellen und Log gelesen; keine breite Wiederholung. `copy-guard.mjs` ist unabhängig als bytegleich zum vorhandenen Operatorguard bestätigt.

Geprüfte endgültige Quellhashes:

| Datei | SHA-256 |
|---|---|
| `compare-main-target-copy.mjs` | `bc3dc7f8a1f3d215c4415d22cd48ccd76131cd78ced7b9b76c590d4197438a93` |
| `compare-main-target-copy.test.mjs` | `90bde38122d96e63625a3767a5e18369353c9bd88cf55535a16f027048889bfe` |
| `copy-guard.mjs` | `466ffb3e96fa8bcc2b569a3069abe7ea4ca00a856fae9a8cc65ac186b39a1671` |
| `README.md` | `0df8cdbc4a7f8f562a9b0fa4357fba8429ec4649f769328b3c8c6669876d8993` |
| `tests.txt` | `ec155dc639e878b46bfe3f5eb5c06b2974f4af5724e4476db4190f058a16e41b` |

Grenze: Kein tatsächlicher Zielregistry-Abgleich, keine 4-GB-Testdatei, keine Live-/Import-/Produktionsfreigabe. `identityAndCoveragePassed` bewertet nur Identität und Abdeckung; Preis-/Options-/Profilabweichungen bleiben in den eigenen Zählern/Deltas/Pendingfeldern zu lesen. Der tatsächliche private Kopielauf ist weiterhin der erforderliche nächste Beleg.
