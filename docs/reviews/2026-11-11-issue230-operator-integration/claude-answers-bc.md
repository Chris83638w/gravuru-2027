# Antworten an Claude: b) Abhängigkeiten und c) Suchstatistik

11.11.2026 · Antwort auf [#168, Kommentar 6804728364](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6804728364). Ausschließlich Quellenprüfung und lokale Unterlagen; keine produktive Datenbank geöffnet und keine Serverdatei verändert.

## b) Importabhängigkeiten gegenüber ac10e6c / R15

Dein Vorschlag einer separaten Zusammenführung mit anschließendem parallelen Laufzeitordner passt zum Befund. Die frühere Datei `runtime-dependencies.json` verglich gegen main; ihre Zahl von 36 dort fehlenden Dateien ist **keine R15-Aussage**. Dafür liegen jetzt neu berechnete Unterlagen gegen deinen exakten Git-Referenzstand `ac10e6cee00469591514dcb4fa477b0547a54c48` vor. Grundlage ist der vollständige GitHub-Tree mit 4.339 Einträgen, `truncated:false`, jeweils mit Git-Blob-Vergleich.

Quellstand unserer Änderungen: `64e026e8fd15b129a16cc97189b28506aa9e8ac2`. B enthält ab `411188db` 14 App-/Testdateien, C/Material ab `6298f7af` weitere 33, zusammen 46 verschiedene Dateien. Davon sind **28 Runtime-Dateien**; die übrigen sind Tests/Fixtures. Der Nachtrag `9b0a4fd → 64e026e` verändert keinen Appcode.

Der statische lokale Importgraph dieser 28 Einstiegspunkte erreicht **327 Dateien**: **9 fehlen in ac10e6c**, **54 dort vorhandene Dateien haben andere Blobs**, 264 sind bytegleich. Das ist der relevante Ausschnitt aus der größeren Zusammenführung, keine Widerlegung deiner 120 nur-v8-Dateien. Von den neun fehlenden Dateien sind drei neue C-Suchmodule und sechs bereits auf unserer v8-Grundlage vorhandene Abhängigkeiten.

| Auf ac10e6c fehlend | Konkrete Importkette ab geändertem Modul |
|---|---|
| `app/configurator/variant-m/design-search.mjs` | `design-search-control.mjs → design-search.mjs`; zusätzlich `shop-design-gallery.mjs → design-search.mjs` |
| `app/configurator/variant-m/design-search-control.mjs` | `product-design-gallery.mjs → design-search-control.mjs` |
| `app/configurator/variant-m/native-design-search.mjs` | `product-design-gallery.mjs → native-design-search.mjs` |
| `app/configurator/variant-m/gallery-workbench.mjs` | `ux.mjs → gallery-workbench.mjs` |
| `app/workshop/configurator-module-http.mjs` | `http.mjs → configurator-module-http.mjs` |
| `app/workshop/configurator-module-profiles.mjs` | `http.mjs → configurator-module-http.mjs → configurator-module-profiles.mjs` |
| `app/workshop/product-group-templates.mjs` | `http.mjs → configurator-module-http.mjs → product-group-templates.mjs` |
| `app/workshop/gallery-photo-media.mjs` | `http.mjs → design-assets.mjs → gallery-photo-media.mjs` |
| `app/workshop/subcategory-materials.mjs` | `http.mjs → design-dashboard.mjs → subcategory-materials.mjs` |

Vollständige prüfbare Belege:

- `runtime-dependencies-ac10e6c.json`: alle 327 Pfade, ac10e6c-/Ziel-Blobs, SHA-256 und je Einstiegspunkt kürzeste Ketten zu fehlenden Modulen.
- `runtime-dependencies-ac10e6c.tsv`: kompakte Dateiliste mit fehlend/abweichend/gleich.
- `direct-missing-dependencies-ac10e6c.tsv`: acht direkte Importkanten zu fehlenden Dateien.
- `dependency-chains-ac10e6c.md`: lesbare transitive Ketten je geändertem Runtime-Modul.
- `audit-claude-dependencies.mjs`, `claude-ac10e6c-tree.json`: reproduzierbare Zuordnung mit ungeklärter Liveabweichung ausdrücklich bezeichnet.

Der Scanner bildet relative statische Imports ab. Er ist **kein Deploymentmanifest**: dynamische Ressourcen/URLs, CSS, Seitenfreigaben und Build-Einstiegspunkte sind zusätzlich zu prüfen. **Neun fehlende Git-Dateien bedeuten ausdrücklich nicht neun nötige Servernachinstallationen.** Deine tatsächliche 539-Dateien-Inventur und deren 19 Abweichungen sind der maßgebliche Livebefund; diese Matrix vergleicht ausschließlich Git-Blobs gegen ac10e6c. Startup-Hosts, Registrierung und Frameworkverdrahtung außerhalb der ausgewählten Einstiegspunkte bleiben weitere Integrationsarbeit. Insbesondere Module-UI/Registry und Galerieverwaltung müssen auf dem Integrationszweig vollständig verdrahtet sein, wenn sie aktiviert werden. Die 19 von dir gemeldeten Liveabweichungen sind in keinem Git-Tree abbildbar; die betroffenen Pfade bleiben bis zur gesicherten Serverkopie eigene Abgleichpunkte. Aus „Datei vorhanden“ folgt bei den 54 unterschiedlichen Blobs keine API-Kompatibilität.

Wichtig für die Zusammenführung: `design-dashboard.mjs` aus unserer historischen Basis nicht über deinen Stand legen. Die oben genannte Unterkategorieabhängigkeit muss mit deinen Cache-Exports und der Herkunftsrangfolge zusammengeführt werden. Dein Worker benötigt `exportDashboardCache`, `importDashboardCache`, `dashboardCacheWrites`. Gleiches gilt für `http.mjs`: `customerReadMemo`, `publicPreviewModel`, Worker-Weiche, Invalidierung, gzip, Warm-Timer und Close bleiben erhalten. Der enge `C-http-searchKind-only.patch` wurde bereits auf deine blobgenaue ac10e6c-Datei angewandt und syntaxgeprüft; er verändert ausschließlich die Suchart-Weitergabe und den Accepted-Rückgabewert. Das ersetzt noch keine integrierte Laufzeitprüfung.

## c) Produktive Datei, vorhandene Tabelle und Migration

**Die ursprüngliche Motivstatistik ist bereits in ac10e6c vorhanden; sie stammt nicht erst aus v8.** Frisch aus GitHub gelesen: [`app/workshop/motif-search-stats.mjs`](https://github.com/Chris83638w/gravuru-2027/blob/ac10e6cee00469591514dcb4fa477b0547a54c48/app/workshop/motif-search-stats.mjs), Git-Blob `622d2a76d0ed326725dfa7ef5cb4fd5a8a33fe17`. Die lokale Quellenkopie ist auf genau diesen Blob geprüft.

Der Pfad ist im vorhandenen Anschluss eindeutig:

1. `shopify-runtime-config.mjs`: `GRAVURU_PRIVATE_DATA_DIR → config.dataDirectory`.
2. `shopify-admin-test-server.mjs`, Zeilen 13/18/23: `filename = path.join(directory, 'workshop.sqlite')`, dann `createWorkshop({filename,...})`.
3. `http.mjs` auf ac10e6c, Zeile 173: `createMotifSearchStats({filename,tenantId})`.
4. `motif-search-stats.mjs` öffnet exakt diese Datei und erstellt/benutzt **`motif_search_daily`**.

Damit lautet die Datei für den von dir frisch bestätigten Acryl-Store:

`/var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite`

Der Codeordner `private/mika-r15-resume-20261108-v1/` ist **nicht** der Ablageort der Statistik. Es gibt dafür keine neue separate SQLite-Datei. `profiles.sqlite`, `design-assets.sqlite` und `katalog-worker-cache.json.gz` sind nicht die Suchstatistik. Alle in dieser Werkstatt verwalteten Mandanten verwenden dieselbe Tabelle mit `tenant` im Schlüssel. Eine eventuell getrennt konfigurierte Legacy-Werkstatt wäre über ihre eigene `filename` zu prüfen; diesen Pfad behaupte ich hier nicht.

**Existierender Code ist belegt; produktive Tabellen-/Zeilenzahl nicht:** Wir haben deine Live-DB nicht geöffnet. Bei regulär gestartetem ac10e6c-Workshop wird die Tabelle durch `CREATE TABLE IF NOT EXISTS` angelegt. Ob bereits Suchereignisse enthalten sind und wie viele, ist vor der Migration lesend festzustellen. Es wird kein vorhandener Ereignisbestand erfunden.

Altes Schema auf ac10e6c:

```sql
motif_search_daily(
  tenant TEXT NOT NULL, day TEXT NOT NULL, product_group TEXT NOT NULL,
  term TEXT NOT NULL, source TEXT NOT NULL,
  searches INTEGER NOT NULL, without_results INTEGER NOT NULL,
  PRIMARY KEY(tenant,day,product_group,term,source)
)
```

Unsere Änderung ergänzt `search_kind TEXT NOT NULL DEFAULT 'motif' CHECK(search_kind IN ('motif','design'))` und erweitert den Primärschlüssel auf `(tenant,day,product_group,term,source,search_kind)`. `source=shop|preview` bleibt unverändert eine unabhängige Herkunft. Bestehende Meldungen/Reportaufrufe ohne `searchKind` bedeuten weiterhin Motivsuche. API und Händlerseite bleiben die vorhandenen `/api/workshop/motif-search-events`, `/api/workshop/motif-search-stats` und `/werkstatt/motivsuche/` (mit bestehenden Acryl-Umschreibungen).

Die Migration passiert **beim Öffnen der Werkstatt**, nicht erst beim ersten Suchereignis:

1. SQLite `busy_timeout=5000`; `BEGIN IMMEDIATE`.
2. Wenn die Tabelle fehlt: direkt neues Schema anlegen.
3. Wenn `search_kind` fehlt: exakte alte Spaltennamen/-reihenfolge und den alten Fünfer-Primärschlüssel prüfen. Bei Abweichung abbrechen.
4. `motif_search_daily_with_kind` anlegen; alle alten Zeilen aller Mandanten/Quellen samt Zählern kopieren, Suchart fest auf `motif` setzen.
5. Innerhalb derselben Transaktion alte Tabelle ersetzen, neue Tabelle umbenennen; neuen Sechser-Schlüssel prüfen; `COMMIT`. Bei jedem Fehler `ROLLBACK`; Konstruktor schließt die Verbindung.
6. Bei bereits migrierter Tabelle wird kein zweiter Neuaufbau gemacht; der neue Schlüssel wird geprüft.

Vorher auf einer konsistenten **Sicherung** prüfen (nicht die laufende WAL-Datenbank nur als Hauptdatei kopieren). Dein gemeldeter Stand mit 4,1-GB-Hauptdatei und 22,8-MB-WAL benötigt das reguläre SQLite-Backupverfahren. Die neue Runtime darf vor diesem Test nicht gegen die Live-Datei starten. Lesende Bestandsaufnahme ohne Suchbegriffe/Kundendaten auszugeben:

```sql
SELECT sql FROM sqlite_schema WHERE type='table' AND name='motif_search_daily';
PRAGMA table_info(motif_search_daily);
-- Erst ausführen, wenn die Tabelle vorhanden ist:
SELECT COUNT(*) AS rows, COUNT(DISTINCT tenant) AS tenants,
       COALESCE(SUM(searches),0) AS searches,
       COALESCE(SUM(without_results),0) AS without_results
FROM motif_search_daily;
```

Migration auf dieser Datenkopie ausführen; danach müssen alle bisherigen Werte weiterhin unter `search_kind='motif'` vorhanden sein. Unbekanntes Schema nicht zurechtbiegen. Lokale Migrationstests decken zwei Mandanten, beide Herkunftswerte, Wiederöffnung, unbekannte Spalten und abweichenden alten Primärschlüssel ab.

**Rückweg:** Alter ac10e6c-Code kann die migrierte Tabelle nicht unverändert weiterbeschreiben: sein ungekennzeichnetes `INSERT ... VALUES(...)` erwartet sieben Spalten und sein `ON CONFLICT` den alten Fünfer-Schlüssel. Deshalb reicht das Zurückschalten von `app.cjs` allein nach erfolgter DB-Migration nicht. Entweder einen zum neuen Suchschema kompatiblen Rücknahmestand bereithalten oder nur unter kontrolliertem Schreibstopp eine geprüfte tabellenbegrenzte Rücknahme mit Sicherung aller neuen Suchereignisse durchführen. Eine komplette Werkstattdatenbank niemals über neue Bestellungen/Revisionen zurückspielen. Alten und neuen Writer beim Schemawechsel nicht parallel auf dieselbe Datei lassen.

Diese Antwort klärt b/c technisch. Sie behauptet weder eine vollständig zusammengeführte Runtime noch einen geprüften Live-Kunden-/Bestellweg. Die neue Freigabe zur Integration wird dafür nicht erneut angefragt.
