# Privater Versionsleser für den bestehenden Hostanschluss

12.11.2026. Nur vorbereitete Anschlussdatei; kein Host-/Netzaufruf, keine Zugangsdaten gelesen und keine Veröffentlichung durch den Autor. Das Main-v2-Paket bleibt bytegleich; dessen Manifest ist weiterhin `de182709cb4c004d338f666186cfa2785b755a708605adcf4d58b0c25721f416`.

`active-version-readonly.mjs` verwendet ausschließlich die bereits im versionierten Operatorcode belegten Methoden `getClient().appVersions(APP)` und `getClient().activeAppVersion({apiKey:APP_KEY})`. Es lädt kein Appprojekt und umgeht damit die historische Projekt-/Extensionvalidierung. Es enthält keine Deploy-, Release-, Datenbank- oder Admin-Mutation.

## Vorhandener Anschluss und tatsächliche Grenze

- `ops/shopify/stage-preserved-merchant.mjs:7–10,29–32`: CLI exakt4.9.0; `ma` ist der interne Export für `getClient` aus `dist/chunk-Q45XAEG2.js`; Methoden und Parameter wie oben.
- `ops/shopify/stage-steel-pricing-preserved.mjs:8–18` sowie `publish-order-scope.mjs:18–22` bestätigen denselben Import und dieselben Antwortformen.
- Der echte historische Snapshot `docs/releases/20261010/active-modules.json`, Gitblob `ce0c5288ae917b7ee733120dbecde9153a161081`, wurde ausschließlich lokal durch den Parser geprüft. Er enthält `Release/...`, während die Versionsliste `Version/...` liefert. Diese Kennungen werden getrennt behandelt. Die Versionslistenantwort dieses Formtests war synthetisch, kein heutiger Aktivbeleg.
- Root hat unabhängig den offiziellen lokalen Befehl mit bereits vorhandener Anmeldung erfolgreich ausgeführt: `shopify app versions list --client-id 9640dd7a6907f0c73e7013ea8c24869b --path work/restabschluss/versions-readonly-project --json --no-input`. Das leere Projekt enthält nur die bekannte `shopify.app.toml`. Der lokale installierte CLI-Stand ist4.9.3; dieser interne Hostleser darf ihn nicht als4.9.0 importieren. Beobachtungsdateien liegen lokal unter `work/restabschluss/version-observation-20261112T105753052Z/` und sind kein Bestandteil dieses Pakets.
- Der historische Hostpfad ist `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-shopify-deploy-tools/node_modules/@shopify/cli`. Seine heutige Existenz, Version und Anmeldung sind noch von Claude zu bestätigen. Eine fehlende oder andere Version führt zum Abbruch; keine Installation oder stille Importanpassung.

Die drei Quell-Dateihashes, der historische Blob und die Prüfung des unveränderten Mainmanifests stehen in `source-checks.json`. **Keine der historischen Stage-/Publish-Dateien als Ganzes starten**; sie enthalten Schreibschritte und dienen hier nur als API-Quelle.

## Ausführung durch den bereits vorhandenen privaten Launcher

Der bestehende Hostlauncher muss den schon vorhandenen Automation-Zugang in `SHOPIFY_APP_AUTOMATION_TOKEN` an diesen eigenen Nodeprozess vererben. Der Leser öffnet keine Zugangdatei, startet keine Anmeldung und bekommt keinen Token als Kommandozeilenargument. Kein Tokenwert und kein Tokenhash gehören in Belege. Fehlt die vorhandene Umgebung, stoppt er mit `version_reader_existing_auth_required`.

Unter Linux muss der bereits eingerichtete Ausgabeordner dem ausführenden Benutzer gehören und darf keine Gruppen-/Fremdrechte haben (0700). Für jede tatsächliche Lesung einen **neuen** Dateinamen verwenden:

```sh
node /privater/paketpfad/active-version-readonly.mjs \
  --cli-root /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-shopify-deploy-tools/node_modules/@shopify/cli \
  --out /privater/0700-belegordner/active-version-000001.json
```

Dies ist ein Operatoraufruf, hier nicht ausgeführt. Die eigene Ausgabedatei wird exklusiv mit0600 angelegt, Datei und Linux-Elternordner werden synchronisiert. Zusätzlich entsteht im privaten Ausgabeordner ein eigener CLI-Zustandsordner. „Readonly“ bezeichnet die Shopify-/App-/DB-Seite: diese lokalen Beleg-/CLI-Zustandsdateien werden geschrieben. Kein Wechsel an der laufenden App und kein Import in ihren Nodeprozess. Die SDK-Ausgabe wird im eigenen Leserprozess unterdrückt; Fehler erscheinen nur als feste Codes. Nach45 Sekunden endet ein hängender Leser erfolglos. Ein Fehler oder abgebrochener Lauf liefert keinen akzeptierten neuen Beleg, auch wenn eine unvollständige private Datei zurückbleibt.

## Anschluss an `verifyActiveFunction()` ohne Mainänderung

1. Der private asynchrone Callback startet genau diesen eigenständigen Leser mit einem neuen Belegpfad, wartet auf Exit0 und verifiziert Dateihash/Bytezahl aus dessen JSON-stdout gegen die vollständige Datei. Er prüft Schema, feste App423276544001, eindeutige aktive Version und die feste Functionregistrierung. Kein SDK-Import in den laufenden Appprozess.
2. Nur für die bereits geprüfte Zuordnung `gid://shopify/Version/1199363391489` / `gravuru-2027-steel-pricing-input-20261108-v2` darf der vorhandene08.11-Buildbeleg verwendet werden: WASM-SHA `a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2`,20977 Bytes; `buildSourceSha256` ist exakt der Datei-SHA des historischen `compiled-proof.json`: `5977e9d9a510223d55f2f6635910aa7af97fcd300eaeec6480a56d921129f1a7`. Ein anderer aktiver Stand ist Drift und benötigt eine neue belegte Zuordnung; niemals den bekannten WASM-Hash an eine unbekannte Version anhängen.
3. Der Callback liefert das bereits vereinbarte Main-Schema `issue230-active-pricing-function-evidence/v1`: stabile `releaseId` = **aktive Version-ID** aus `activeVersion.versionId` (nicht das separate SDK-Snapshotfeld `releaseId`!), die zwei historischen Pins, `observedAt` unverändert aus der tatsächlichen Lesung, `reviewEvidenceSha256` = SHA der neuen privaten Belegdatei und die historisch geprüften Formate `v2`, `history`, `valueInput`, `variantSequence`, `variantsFromRevision`, `variantDeltas`. Plan und Folgelesungen müssen dieselbe Version-ID-Darstellung verwenden.
4. Der Leser erfindet keinen ausgelesenen WASM-SHA: `wasmDigestRead:false` bleibt ausdrücklich sichtbar. Die beobachtete Modulgröße sowie Inputquery-/Konfighashes dienen dem Abgleich; sie beweisen allein keine Unterstützung der Preisformate. Der historische Build-/Preservationbeleg stellt diese Zuordnung her. Kein neuer Compilerlauf und keine20-Warenkorbpositionen-Freigabe werden behauptet.
5. Der Main-v2-Probe darf eine abgeschlossene Beobachtung höchstens60 Sekunden ab ihrem wirklichen `observedAt` wiederverwenden. Danach muss der Callback erneut wirklich lesen. Dateiöffnen, Empfang oder eine erneute Hashberechnung dürfen den Zeitpunkt nicht erneuern. Versionsliste vor/nach dem Snapshot verhindert eine beobachtete Umschaltung im Leseintervall; es ist keine atomare Sperre gegen externe Deployments. Vor tatsächlichem Apply ist genau der private Callback einmal Ende-zu-Ende mit dem echten vorhandenen Leser nachzuweisen. Dies benötigt keine Produkt-/Metafeldmutation.

Der konkrete private Launcher/Callback ist weiterhin Claudes Anschlussarbeit. Dieser Reader liefert die prüfbare Leseoperation dafür und ändert weder den eingefrorenen Maincode noch seine Frischegrenze. Der lokale erfolgreiche offizielle Versionsread ist ein bereits verfügbarer alternativer Beobachtungsweg, kein Beleg für den noch nicht ausgeführten Hostreader.

## Lokale Prüfung

Node24.20.0; `node --check active-version-readonly.mjs` und `node --test active-version-readonly.test.mjs`:4/4 grün,0 übersprungen. Tests ausschließlich mit injizierten Antworten und temporären Paket-Metadaten: echte Methodensignaturen, Versionswechsel/Mehrdeutigkeit, falsche App/Function, rückläufige Uhr, feste Fehlercodes, keine Rohantwortausgabe und exakter4.9.0-Guard ohne SDKimport. Zusätzlich akzeptiert der Parser den oben gepinnten echten historischen Snapshot. Keine echte SDK-, Credential- oder Netzoperation, kein Test des POSIX-Launchers auf dem Host. `tests.log` hält den ausgeführten Lauf fest.
