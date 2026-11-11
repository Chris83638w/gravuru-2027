# Suchstatistik-Kopientest und natives Zielregister

Nur Node.js ≥24 mit `node:sqlite`, keine Installation weiterer Pakete. Diese klar lesbaren Hilfsskripte sind eigenständig; der eingefrorene Kandidat wird nicht geändert. Keine Live-Datei wurde damit geöffnet. Die drei bereits konsistent erzeugten und geprüften Online-Backups bleiben unverändert erhalten. Für die Migration eine **weitere Arbeitskopie** des Workshop-Backups mit Dateiendung `.copy.sqlite` verwenden. Nicht einfach die laufende WAL-Hauptdatei kopieren; keinen Hardlink oder Symlink verwenden.

## 1. Natives Zielregister rein lesend

```sh
node inspect-native-target.mjs --copy /ABSOLUTER/PFAD/ZUR/KOPIE/workshop.copy.sqlite > native-target-register.json
```

`DatabaseSync(file,{readOnly:true})`, `PRAGMA query_only=ON`, ein konsistenter Lesesnapshot. Es werden keine App-Konstruktoren importiert. Feste Filter: Mandant `gravuru`, bekannte **Katalog-Profilkennung** `katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a`, Shopify-Produkt `gid://shopify/Product/16190784602492`. Die Katalogkennung ist nicht automatisch eine native `products.id`.

Neben dem direkten `products.id`-Vergleich sucht die CLI die Kennung gezielt unter `$.config.profile.id` in gültigem JSON des Schemas `gravuru-product/v1`, nur für die **aktuellen** Produktrevisionen. `CASE WHEN json_valid(...)` schützt auch bei beschädigtem JSON. Ausgegeben werden nur Kopf-/Revisionsmetadaten, keine Dokumentinhalte. Dies kann intern alle aktuellen Produktdokumente lesen, aber nicht deren gesamte Historie. `directProductIdMatches`, `profileAliasLookup.matches` und `nativeIdentityCandidates` unterscheiden direkte Identität von einer inneren Herkunftskennung. Mehrere Treffer bleiben ausdrücklich mehrdeutig; das Skript wählt keinen aus und legt keine ID an.

Ausgabe: Produktkopf und Revisionen, aktive Zuordnung nur über den vollständigen Join `shop_product_binding_heads` → `shop_product_binding_revisions`, Gruppen/Zähler und genaue Bindungskennungen. Der Filter umfasst Bindungen der direkten Kennung, der gefundenen nativen Aliaskandidaten **oder** dieses Shopify-Produkts, damit auch eine abweichende tatsächliche Zuordnung sichtbar wird. Historische `form_shop_bindings` dieser Zielkennungen werden getrennt gemeldet; sie beweisen allein keine aktive Shopprodukt-Zuordnung. Fehlende neue Bindungstabellen werden als fehlend gemeldet und nicht angelegt. Ohne Mandantenspalte wird ein vorhandenes altes Produktschema ausdrücklich als solches markiert.

Keine Ausgabe der Produktdokumente und keine Auswahl freier Metadata-JSONs, Bestellungen, Kundendaten, Tokens oder Freigaben. Der Beleg ist Inventar und keine Produkt-/Bindungsaktivierung. Ausgabe enthält interne Produkt-/Varianten-IDs und bleibt im Operator-Kontext.

## 2. Exakter Migrationsaufruf auf der Kopie

Der öffentliche Einstieg im endgültigen Anwendungscode lautet:

```js
import {createMotifSearchStats} from '/ABSOLUTER/KANDIDAT/app/workshop/motif-search-stats.mjs';
const stats = createMotifSearchStats({filename: '/ABSOLUTE/ARBEITSKOPIE/workshop.copy.sqlite', tenantId: 'gravuru'});
stats.close();
```

Die Migration läuft im Konstruktor über die interne Funktion `ensureSearchKinds`; kein `record()`, kein `report()`, kein `createWorkshop()` und kein Produkt-/Binding-Store sind nötig. `tenantId` begrenzt spätere Berichte, **nicht** die Migration: alle alten Mandanten/Quellen/Zeilen bleiben erhalten. Die Guard-CLI führt genau diesen Einstieg aus:

```sh
node migrate-search-stats-copy.mjs \
  --copy /ABSOLUTE/ARBEITSKOPIE/workshop.copy.sqlite \
  --confirm-copy /ABSOLUTE/ARBEITSKOPIE/workshop.copy.sqlite \
  --code-root /ABSOLUTER/KANDIDAT \
  --module-sha256 ada0706845d396e089a6d3bd7007f11b937ed145b03ee5f99a2776cb5054de96 \
  --expected-rows 8 > search-migration-copy-result.json
```

Alle Pfade sind vor Ausführung konkret durch den Operator zu ersetzen. Die Hashangabe ist der geprüfte Inhalt von `app/workshop/motif-search-stats.mjs` im lokalen finalen Kandidaten; falls der transportierte Code abweicht, zuerst den Unterschied klären und nicht blind einen neuen Hash einsetzen. Die CLI verlangt explizit denselben absoluten Kopienpfad zweimal, eine reguläre Datei ohne Links und `.copy.sqlite`; der bekannte produktive Datenordner ist als Schreibziel ausgeschlossen. Der Guard kann nicht die gesamte administrative Umgebung kontrollieren: die benannte Datei muss tatsächlich die unbenutzte Arbeitskopie sein.

Vor jeder Mutation: bekanntes 7- oder 8-Spaltenschema, korrekter Schlüssel, genau acht bestehende Aggregatzeilen, keine unerwarteten benutzerdefinierten Statistikindizes/-trigger oder übriggebliebene Migrationstabelle. Nachher: acht Spalten und Sechser-Schlüssel `(tenant,day,product_group,term,source,search_kind)`, dieselben acht normalisierten vollständigen Altzeilen, Summen, Mandanten/Quellen und unverändertes übriges Datenbankschema. Alte Zeilen erhalten `search_kind='motif'`; ihre kompletten Werte werden intern gehasht, **Suchbegriffe werden nicht ausgegeben**. Zweiter Aufruf belegt Idempotenz. Die explizit erwarteten acht Zeilen sind eine Vorbedingung aus dem Operatorbestand, keine von diesem Agenten bestätigte Live-Zeilenmessung.

Der Guard setzt die fachliche Migration nicht nach; die App führt atomar `BEGIN IMMEDIATE`, Anlegen/Kopieren/Ersetzen, Schlüsselprüfung, `COMMIT` bzw. `ROLLBACK` aus. Danach kann der Operator ergänzend `PRAGMA quick_check` auf der Arbeitskopie ausführen. Die bereits geprüften 4,1-GB-Backups werden vom Skript nicht erneut vollständig durchlaufen.

## 3. Rückweg und Reihenfolge

Kopientest samt Ergebnis zuerst an Astra/Operator zurückgeben; keine neue Runtime gegen die produktive DB starten. Die Tabelle liegt in der bestehenden Workshop-DB, nicht in `profiles.sqlite` oder `design-assets.sqlite`. Keine anderen Datenbankmigrationen werden hier angestoßen.

Vor einer späteren produktiven Migration stimmt der Operator Umschaltung, aktuellen konsistenten Sicherungsstand und Rückweg ab und setzt einen kontrollierten Schreibstopp für alle Writer auf diese DB. Erst nach Prüfung von Migration und neuer Runtime die Schreibzugriffe wieder zulassen. Das ist ein späterer Operatorablauf, kein Bestandteil dieser Kopien-CLIs.

Alter ac10-Code schreibt sieben unbenannte Werte und erwartet den Fünfer-Konfliktschlüssel. Nach Migration ist er kein kompatibler Rückfall-Writer. Daher alter/neuer Writer niemals parallel auf dieselbe Datei, und `app.cjs` allein zurückschalten reicht nicht. Die unveränderte Sicherung dient dem geplanten kontrollierten Rückweg; niemals eine vollständige alte DB über neu eingegangene Bestellungen oder Produktrevisionen zurückspielen. Ein möglicher späterer produktiver Rückweg muss neue Suchereignisse erhalten und braucht den vorbereiteten Operatorablauf.

## Lokale Prüfung

```sh
GRAVURU_OPERATOR_TEST_CODE_ROOT=/ABSOLUTER/KANDIDAT node --test operator-tools.test.mjs
```

Im vollständigen Repository genügt `node --test ops/issue230-operator-review-20261111/operator-tools.test.mjs`: der Standardpfad wird relativ zum Repository aufgelöst. Die Umgebungsvariable ist nur für separat kopierte Operatorwerkzeuge nötig. Der vorherige lokale Ordnername wurde nach Claudes Linux-Befund korrigiert; alle vier gezielten Tests bestanden danach ohne Pfad-Override (`repository-path-tests.log`). Unter Windows benötigt der unveränderte Hardlink-Schutztest das Recht, einen temporären Dateilink anzulegen; keine Testausnahme oder Guard-Abschwächung.

Tests verwenden ausschließlich selbst erzeugte temporäre Datenbanken unter diesem Werkzeugordner: acht historische Zeilen über zwei Mandanten und beide Quellen, Idempotenz, Schutz vor falschem Pfad/Hash/Zeilenzahl/Schema/Hardlink und ein rein lesendes natives Zielregister mit alten/neuen Bindingrevisionen. Der davon getrennte tatsächliche Kopienlauf wurde inzwischen von Claude [bestanden gemeldet](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6806442706); daraus folgt keine schon ausgeführte produktive Migration.

Lokaler Erstnachweis: **3/3 Tests bestanden, 0 übersprungen**, zusätzlich Syntaxprüfung der drei Hilfsmodule. Der erste eingeschränkte Lauf konnte den temporären Hardlink nicht erstellen (`EPERM`); der erlaubte lokale Wiederholungslauf einschließlich dieser echten Hardlink-Prüfung bestand vollständig. `tests.log` enthält diesen Lauf. Nach Ergänzung des Alias-Lookups wurden beide Inventartests gezielt bestanden (`alias-tests.log`): echte `cfg_…`-Kennung, zwei ausdrücklich mehrdeutige Treffer, Ausschluss nur historischer Treffer, fremder Mandanten und ungültigen JSONs sowie unveränderte Dateibytes. Damit vier unterschiedliche Werkzeugtests grün; der Migrationscode blieb unverändert. Keine produktiven oder gesicherten Benutzerdaten wurden benutzt.
