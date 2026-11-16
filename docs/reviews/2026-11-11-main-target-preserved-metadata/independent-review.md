# Unabhängiger Review: Zielentwurf mit erhaltenen Metadaten

11.11.2026. Rein lesender Diff-/Hashreview, kein Serverlauf, Import oder erneuter nativer Vollvalidatorlauf. Vergleich: bereits geprüfter Label-Zielentwurf gegen `main-target-preserved-metadata/target-document.preview.json.gz`.

## Dokumentvergleich

**Bestätigt: exakt vier geänderte Pfade** – `categoryIds`, `name`, `seo.title`, `config.profile.name`. Alle angegebenen Vorher-/Nachherwerte gegen beide vollständigen vorhandenen Dokumente geprüft. Nach Rücknahme genau dieser vier Änderungen ist das neue Dokument vollständig strukturell gleich zum vorigen geprüften Ziel. Damit sind alle anderen Felder, Varianten, Preise, Elementrechte, Modulschalter, Ressourcen-/Fertigungsverweise und Startdesigns unverändert.

Die Kategorien stehen exakt in der übergebenen Ist-Reihenfolge: `extern-shopifyproductid-16190784602492`, danach `linie-acryl-tuerschilder`. Name und SEO-Titel lauten `Türschild Acrylglas 3 mm – Form und Größe selbst wählen`, SEO-Beschreibung bleibt leer. Die zusätzliche innere Namensanpassung ist die bereits bestehende native Normalisierung in `validateProductDocument` und wird im Entwurf ausdrücklich als vierter Pfad ausgewiesen.

Profilstart bleibt `katalog-TAE-V2A-8x5-D1`, `familyFormats.source.shopProduct.defaultDesignId` bleibt kongruent `TAE-V2A-8x5-D1`. Kein LEER-Zusatz, keine weitere Vorlage oder Rechteänderung. Der Prüfumfang bezieht sich auf den übernommenen bestätigten Startstand; keine neue Designwahl durch den Reviewer.

| Verfahren | Unabhängig nachgerechneter SHA-256 |
|---|---|
| Produktgruppen-Dokument | `ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407` |
| ID-Binding-Dokument | `f0bb7d95e89e3aae66ab04454d6476132fe197aaae7c1da48ce8209ced62d285` |
| Exakte transportierte JSON-Bytes | `ae09cbf6b58719b61729c7fab7a5685b464aae1e8d08691a706111e97b58e407` |
| Gzip-Datei | `2a7b1adf55afbda5728cf062e91208f42c559fa1578b771b0ad4aa5912ffadb1` |

Produktgruppen-, Binding- und Bytehashverfahren bleiben getrennt. Die Gleichheit von Produktgruppenhash und aktuellem Transportbytehash folgt hier aus dessen konkreter Serialisierung; sie behauptet keinen späteren SQL-Bytehash.

## Paketnachcheck

**Abgeschlossen, kein verbleibender Befund im Metadaten-Zielpaket.** Alle neun im Manifest aufgeführten Dateien plus Manifest geprüft; Größen/SHA stimmen. Geprüftes Zehn-Dateien-Manifest SHA-256 `4b90295d6ca2cabdf440b569bbf060b6a5f4031864707448f25d9dc31cc3836a`. Aktualisierter nicht ausführbarer Intent SHA-256 `fcfddddeae4a188ef980a67912e247d85bb42b46c1d4836de669207b01b2282b`; Zielpins stimmen mit den unabhängig berechneten Werten überein. Kein natives `document`/Importkey/Bestätigungstoken im Intent.

`materialize-metadata-preview.mjs` akzeptiert ausschließlich die vier dokumentierten Pfade, prüft feste Produktgruppen- und Bindinghashes vor/nach Änderung und schreibt nur eine neue lokale Datei mit `wx`. Keine App-/DB-/Netzwerk-/Importinstanz. Materializer-SHA `84e82f7ecc935abb154e7bb1af4eb5abd161820a71fbb723076d0df00d847643`. Sein vorliegender erfolgreicher Bytegleichheitsbeleg stimmt mit dem Transport überein; kein eigener Wiederholungslauf.

README erklärt Quell-ID versus native 120×80-mm-Startprojektion, den vierten normalisierten Namenspfad, unveränderte Rechte/Preise und getrennte Hashverfahren korrekt. Der vorhandene native 778er-Preisbeleg und die identische Startprojektion wurden als Autorenbeleg gelesen; der eigene vollständige Vierpfadvergleich bestätigt unabhängig, dass keine entsprechende Konfiguration verändert wurde. Eine spätere Aufnahme dieser Reviewnotiz ins Paket ändert nur dessen Manifest, nicht die hier geprüften neun Nutzdateien.

**Kategoriehelfer separat:** Die tatsächliche Ressourcenauflösung muss mit den beiden erhaltenen Kategorien in genau dieser Reihenfolge erfolgen, statt den früheren leeren Kategorienschnitt weiter anzunehmen. Dessen Erweiterung wird gesondert nach READY geprüft. Keine Aussage dieses Reviews über tatsächliche Serverumschaltung oder neue Bindungs-/Produktionsfreigabe.
