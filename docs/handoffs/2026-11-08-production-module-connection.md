# Privater Modulanschluss: echte Zielwerkstatt, zunächst nur lesend

Stand: 08.11.2026. Basis dieses getrennten Pakets: `043846538d9177f933708dafa55392a58fb5036a` (PR208). Zur Ausführung mit dem integrierten Stand PR213 zusammenführen. Keine Kundenoberfläche geändert, keine Galerie aktiviert, keine Shopify- oder Produktdaten geschrieben. Der tatsächliche Server-Preflight steht bei Erstellung dieser Übergabe noch aus.

## Zweck und verbindlicher Umfang

Ein bestehender Konfigurator erhält auswählbare Modulprofile. Der Nutzer hat ausdrücklich Varianten mit/ohne Foto oder Logo sowie produktspezifische Ausführungen verlangt; kein neuer Konfi je Produktgruppe. Die Ausführungen und Preise der Edelstahl-Türschilder sind bereits bestätigt. Hier wird ausschließlich das bestehende Ziel `cfg_ac514214-a313-4738-8008-00445ee1befd@4` angebunden: 251 Designs, 80 Größen, 404 Varianten, Rosenberg als Startdesign. Kunden- und Bestellstände bleiben unverändert.

Die Zuordnung verwendet den integrierten Vertrag `kind: 'module-profile'`: echtes Zielprodukt und dessen vorhandenes Startdesign, alle 404 vorhandenen Shopify-Varianten, tatsächliche Profil-ID/-Revision und native Fähigkeitsrevision 4. Sie enthält **keine** Galerie-Ersatzquelle und kein Design-/Medienmapping. Die Profilbibliothek wird erst mit der echten Galerie-Registry verbunden; vorhandene Profile werden daraus gelesen. Ist sie leer, zeigt sie keine erfundene Zuordnung. Profil anlegen und bestätigen erfolgt über dieselbe vorhandene Verwaltung.

Beide Schreibschalter bleiben `false`. Das Ziel wird mit `DatabaseSync({readOnly:true})`, `query_only=ON` und der bestehenden nativen Binding-Registry geöffnet. Kein `createWorkshop`, keine Migration und keine zweite Schreibwerkstatt. Verwendet werden die echten Kopf-, Revisions-, Options-, Preis- und Freigabeprüfungen. Fremde IDs, neue Köpfe während der Shopify-Abfrage, geänderte Preise oder fehlende Freigaben sperren den Anschluss. Bei Fehler und beim Schließen des Hosts wird der eigene Reader geschlossen. Ein ungenutzter Reader wird nach spätestens 60 Sekunden geschlossen; das verlängert keine Prüffrist.

## Quellen: Originalkarte ist noch kein freigegebenes Syncziel

Die aktive alte Galerie `gesamtbestand-stage-0bb50565-20261106-v1/gallery-4` enthält nur 24 der 251 Stahloriginale. Die vorbereitete, **nicht aktivierte** Galerie `complete-gallery-20261107-v1/gallery` enthält alle 251. Ihre Originaldateihashes stimmen sämtlich mit der aktiven r4-Bank überein.

Der reproduzierbare Abgleich findet 239 Originale mit insgesamt 1.418 expliziten nativen Größen-Zuordnungen. Bei 12 Originalen fehlt eine ausreichend eindeutige vorbereitete Zielzuordnung: elf D952-Originale sowie `TRE-V2A-9x3-D55`. Sie bleiben vollständig in der aktiven Bank. Ein späterer Design-Vollabgleich bleibt bis zur Zielprüfung gesperrt. Die reine Modulverwaltung benötigt diesen Vollabgleich nicht.

Private Nachweise unter `outputs/module-production-connection-20261108/`:

| Beleg | SHA-256 |
|---|---|
| `live-host/complete-gallery-251-metadata.json.gz` | `b7fb25d152368a91be671fbaae59eff8fe095183dff48c44d5345992388ba84a` |
| `live-host/target-heads-r4.json.gz` | `3895cfba6aaf56e53ce580221f08c46743f0c353605dbaf4b3dde0d086975798` |
| `steel-original-ids-251.json` | `91a5e067fea4477e35574b10eb5b79b74fee17ca72d61e7c4f6b475923dc4c41` |

Die SQL-Aufnahme ist lediglich die initiale Identitätsbasis. Der ausführbare Preflight liest die 404 Bindungen anschließend erneut über `resolveMany` und die native Freigabeprüfung. `prepared-steel-source-map.json` enthält den nachvollziehbaren Original-/Zielabgleich; weder Datenbanken noch private Metadaten oder Zugangsdaten werden in Git gespeichert.

## Konkreter Serveranschluss

Die Pfade wurden vom Operator frisch aus laufendem Wrapper und privater Konfiguration bestätigt:

- Aktive Quelle: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gesamtbestand-stage-0bb50565-20261106-v1/data` und benachbarte `gallery-4`.
- Ziel: `/var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite`.
- Bestehende App-Konfiguration: `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-shopify.json`.
- Deren tatsächlicher `values.GRAVURU_SHOPIFY_CLIENT_SECRET_FILE`: `/var/www/vhosts/gravuru-designwerkstatt.de/gravuru-werkstatt/private/shopify-app-secret`. Kein Schlüsselwert in Übergabe, Ausgabe oder Paket.

Der bestehende OAuth-Provider hält den Token nur im Arbeitsspeicher und hat 15 Sekunden Zeitlimit. Der neue Adapter erlaubt ausschließlich die zwei vorhandenen lesenden Galerie-GraphQL-Operationen. Je Abruf gelten 15 Sekunden und maximal 8 MiB; Weiterleitungen, falsche API-Version und Mutationen werden abgewiesen. Alle 404 gespeicherten nativen Zusatzpreisverträge werden gegen ihre tatsächliche Shopify-Preisrevision verglichen, einschließlich vollständig aufgelöster Historie. Fehlende Verträge sowie Änderungen während der Abfrage sperren den Anschluss; kein historischer Vertrag wird umgeschrieben.

Das private Integrationsarchiv muss die zwei gepinnten Identitätsdateien zusätzlich unter `ops/plesk/module-production-identity/` enthalten. Diese Dateien sind absichtlich nicht Teil des Git-Commits. Aus dem entpackten Integrationsverzeichnis ist der folgende Preflight ausführbar; er erzeugt genau einen neuen privaten Ergebnisbeleg und überschreibt keine vorhandene Datei:

```sh
timeout 120s node ops/plesk/preflight-production-modules.mjs \
  /var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-2027-merchant-shopify.json \
  /var/www/vhosts/gravuru-designwerkstatt.de/private/acryl-employee-20261021-v1/data/workshop.sqlite \
  "$PWD/ops/plesk/module-production-identity/target-heads-r4.json.gz" \
  3895cfba6aaf56e53ce580221f08c46743f0c353605dbaf4b3dde0d086975798 \
  "$PWD/ops/plesk/module-production-identity/steel-original-ids-251.json" \
  91a5e067fea4477e35574b10eb5b79b74fee17ca72d61e7c4f6b475923dc4c41 \
  /var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-connect-20261108-v2/preflight-native-shopify-01.json
```

Erst nach erfolgreichem Preflight, vollständiger Sicherung und kontrolliertem privaten Hoststart die vorhandene Plesk-Option `GRAVURU_GALLERY_MANAGEMENT_CONFIG` auf den **externen** privaten Wrapper setzen: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-module-connect-20261108-v2/gallery-module-management.mjs`. Das Integrationspaket liegt daneben unter `runtime-v1/`; der Wrapper enthält genau:

```js
export {configureGalleryManagement} from './runtime-v1/ops/plesk/module-management-production-config.mjs';
```

Der Wrapper muss außerhalb von `APP_ROOT` liegen; diese bestehende Schutzregel bleibt erhalten. Es ist kein fehlendes Objekt und kein Ersatzadapter einzutragen. Die Config prüft die konkrete aktive Quellinstallation, übernimmt deren unveränderte Registry/Auth/CSRF und öffnet den nativen Zielreader rein lesend. Der bestehende Host erhält dieselbe Modulverwaltung. Die lokalen Verwaltungsdateien `module-management.sqlite` und `module-shop-sync-preview.sqlite` liegen im privaten Anschlussordner `mika-module-connect-20261108-v2`, ausdrücklich **außerhalb** des Quelldatenverzeichnisses. So bleibt dessen strenge Dateiliste auch beim Neustart gültig. Die Dateien werden erst beim ausdrücklichen Mount verwendet, nicht beim CLI-Preflight.

Ein Wechsel auf die vorbereitete vollständige Galerie oder eine echte Aktivierung der Moduländerung ist **kein** Nebeneffekt dieses Anschlusses. Die derzeitigen Schreibschalter bleiben aus. Für eine spätere Aktivierung muss der bereits geprüfte native Schreibdienst bewusst angeschlossen werden; die lesende Fassade kann ihn nicht ersetzen.

## Geprüft und noch offen

15/15 gezielte Tests, 0 übersprungen: echte native 80-Größen-/404-Varianten-Aufbereitung mit synthetischen Designs und simuliertem Shopify-HTTP, Preis-/Kopfkonflikte, fehlende oder abweichende gespeicherte Zusatzpreisverträge und gültige Historie, nur echte dynamische Profile, verzögerte Registryinitialisierung, bestehender Secret-Datei-Provider, echte SQLite-Lesefassade ohne Migration, ID-/Write-Sperren und Quellhashabgleich. Die CLI und die konkrete Plesk-Config wurden zusätzlich syntaktisch geprüft. Unabhängiger Code-Review des Vertragsagenten ohne verbleibenden Kernbefund; der echte Mount-/Plan-Nachweis auf PR213 wird im integrierten Paket geführt. Diese lokalen Tests sind kein tatsächlicher Shopify- oder Produktionsnachweis.

Nächster Schritt: Der Operator führt den obigen lesenden Server-Preflight aus. Anschließend kann der vorhandene private Host mit denselben Gruppen und Profilen sichtbar geprüft werden, weiterhin ohne Produkt-/Shopify-Schreibfreigabe. Die laufenden umfassenden Datenbanksicherungen werden vom Root-Agenten getrennt dokumentiert.
