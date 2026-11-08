# Vorbereitet: gleicher Modulanschluss, Ausführung gesperrt

Basis PR223 `fce83b0494e320ce3821be25edad27ab747332f5`, anschließend ausschließlich zwei neue Konfigurationsmodule und ein gezielter HTTP-Test. Das Paket enthält zusätzlich die sechs dafür erforderlichen Backenddateien aus PR214/223 gegenüber der bereits installierten privaten v2-Laufzeit `044494a06b05571364e57dffc83b8a0a4458050d`. Kein Kundendesign, Kundenmodul, CSS oder Shopify-Theme wird aus diesem Paket installiert. **Keine Installation oder Live-Datenänderung durch den Autor.**

Quelle: Nutzerauftrag vom 08./09.11.2026 zu einem gemeinsamen Konfigurator mit schaltbaren Modulen, vorheriger Optionsbestätigung und unveränderten Gestaltungen. Dieser Schritt bereitet ausschließlich die schon genehmigten Edelstahlprofile mit/ohne SVG-Logo vor; keine neue Foto-, Preis-, Maß- oder Produktionsregel. Der Design-Master bleibt verbindlich, Designs werden hier nicht bearbeitet.

## Was genau hinzukommt

`module-activation-preview-config.mjs` verwendet den vorhandenen Auth-/Identitätsleser und dieselben privaten Ablagen. `gallery-production-preview-mount.mjs` bindet den tatsächlichen PR214-Aktivierungsadapter an den vorhandenen gemeinsamen Galerie-/Moduldienst. Beide Schalter sind im Aufruf fest `false`; es gibt in dieser Vorschaukonfiguration keine Umgebungsvariable oder Browseroption zum Einschalten. Vor dem Mount müssen alle drei Datenbankdateien existieren und die beiden gespeicherten Profilstände exakt passen. Kein Seed, keine Ersatzbibliothek, kein leeres Ersatzjournal, keine Produktzuordnung.

Gesicherte Profilreferenzen aus `outputs/module-production-connection-20261108/live-host/server-mount-progress.json`:

| Profil | Tatsächliche ID | Version | SHA256 |
|---|---|---:|---|
| Edelstahl-Türschilder · mit Logo | `cmp_c79daee4-13ce-4097-9a83-4e0c4a6ac34d` | 1 | `a4012295275d4d40f04b925a34a492bca6ebb58738b836a027f8d7b5a23f6889` |
| Edelstahl-Türschilder · ohne Logo | `cmp_83b38184-7ebf-4e55-a65d-5f4d7309d5d6` | 1 | `1c8a420b18abde3a0f4ae0c50c27c634cc17d1bee4abdfda1e9d5d4d9873e105` |

Das sind wiederverwendete Referenzen, keine Anweisung, eines dieser Profile bereits einem Produkt zuzuordnen. Ein inzwischen geänderter Profilstand stoppt den Mount; dann den aktuellen Stand prüfen, nicht die Bestätigung oder Hashprüfung umgehen.

## Ein gezielter lokaler Nachweis

`node --test scripts/lib/gallery-production-preview-mount.test.mjs`: **2/2 bestanden, 0 übersprungen**, 117.885,0695 ms Gesamtdauer. Tatsächliche r4-Eingabedatei: SHA256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`, 251 Designs/80 Größen/404 Varianten. Native temporäre SQLite-Datenbanken und regulärer privater Plesk-Proxy, simulierte Shopify-Leseantworten, keine externen Requests. Die Testprofile besitzen neu erzeugte lokale IDs, aber exakt dieselben bestätigten Dokumenthashes; beide UI-Wege und der Adapter nutzen dieselben gespeicherten Datensätze.

- Fehlende Anmeldung und falscher CSRF-Token werden abgewiesen.
- Fehlende bestehende Journaldatei und falscher Profilhash werden abgewiesen.
- Normale Auswahl des Logo-aus-Profils über `/originale/verwaltung/api/sync` und `sync-plan` zeigt ausschließlich `Logo: an → aus` als Moduländerung.
- `sync-confirm` verlangt ausdrückliches `accepted:true` für denselben Plan/hash.
- `sync-execute` bleibt trotz gültiger Bestätigung **HTTP403 / gallery_sync_disabled**. Auch ein direkter nativer Schreibaufruf ist gesperrt.
- Nach tatsächlichem Prozess-/Dienstneustart sind Plan und Bestätigung im selben Journal wieder vorhanden; derselbe Ausführungsversuch bleibt gesperrt.
- Native Zieldatei vor/nach bytegleich, vorhandene 251/404 bleiben unverändert; zwei Profilrevisionen und null Aktivierungsvorgänge. Ausschließlich Plan/Bestätigung werden im lokalen Testjournal gespeichert.

Dies ist kein neuer vollständiger Engine-Test und kein Live-HTTP- oder Browsernachweis. Die separaten PR223-Nachweise zu atomarer Aktivierung bleiben unverändert.

## Exakte bestehende Anschlüsse

- Quelle bleibt `private/gesamtbestand-stage-0bb50565-20261106-v1/gallery-4` und dessen `data/`.
- Bibliothek bleibt `private/mika-module-connect-20261108-v2/module-management.sqlite`.
- Journal bleibt `private/mika-module-connect-20261108-v2/module-shop-sync-preview.sqlite`.
- Native Zielquelle bleibt `private/acryl-employee-20261021-v1/data/workshop.sqlite`.
- Beide privaten Identitätsbelege bleiben unter `ops/plesk/module-production-identity/` der kopierten Verwaltungsruntime. Erwartete SHA256: `target-heads-r4.json.gz` = `3895cfba6aaf56e53ce580221f08c46743f0c353605dbaf4b3dde0d086975798`; `steel-original-ids-251.json` = `91a5e067fea4477e35574b10eb5b79b74fee17ca72d61e7c4f6b475923dc4c41`.
- Vorhandene Shopify-Appkonfiguration und Secret-Dateireferenz werden weiterverwendet. Keine Anmeldedaten sind im Paket enthalten.

Alle relativen privaten Pfade beginnen unter `/var/www/vhosts/gravuru-designwerkstatt.de/`. Maßgeblich sind zusätzlich die absoluten Pfade im Manifest und im Konfigurationsmodul.

## Spätere Installation durch Root, noch nicht ausgeführt

1. Archiv-/Manifesthash prüfen. Die vier vorhandenen Backenddateien gegen `files[].before.sha256` prüfen; neue Dateien müssen im Ziel fehlen. Bei abweichendem Stand nicht überschreiben. Vorher privaten Quellwrapper und aktive externe Konfiguration sowie konsistente Online-Sicherung der beiden Verwaltungsdatenbanken sichern. Keine native Produktdatenbank zurückkopieren.
2. Ausschließlich die acht Dateien aus `overlay/` in der tatsächlich installierten privaten `private/mika-module-connect-20261108-v2/runtime-v2` ergänzen/ersetzen, nachdem die vier Vorherdateien gesichert und geprüft wurden. Keine vollständige Runtimekopie und keine Übernahme fremder Änderungen. Danach alle `after.sha256`, geschützte UI-Dateien und die beiden Identitätsbelege prüfen. Die Kundenruntime ist kein Installationsziel.
3. `external/gallery-module-activation-preview.mjs` in `private/mika-module-connect-20261108-v2/` ablegen, außerhalb der Runtime. In der zuvor gesicherten aktiven privaten Konfiguration ausschließlich `GRAVURU_GALLERY_MANAGEMENT_CONFIG` auf diese Datei ändern. Auth, Datenpfade und gallery-4 unverändert lassen. Eigentümer/Rechte nach vorhandenem Plesk-Loader beibehalten; keine Geheimnisse ausgeben. Den bisherigen Wert vorab tatsächlich lesen und für Rücknahme sichern, nicht aus historischen Dateinamen ableiten.
4. Erst nach Root-Abnahme den privaten Verwaltungsprozess neu starten. Kein Quell- oder Kundenstartwrapper muss auf einen anderen Runtimepfad zeigen. Das Archiv selbst ändert weder Loader-Verweis noch Startdatei.
5. `/werkstatt/module/` und `/originale/verwaltung#synchronisieren` über vorhandene Anmeldung öffnen. Zwei bekannte Profile, `executionEnabled:false`, Auswahl → Änderungen prüfen → ausdrückliche Bestätigung testen. Ein gezielter serverseitiger Ausführungsversuch muss weiter403 liefern; die Oberfläche lässt den Knopf ohnehin deaktiviert. Das Speichern eines Prüfplans und seiner Bestätigung verändert das Journal, nicht das Produkt.

Die exakten aktuellen Wrapper-/Konfigurationsinhalte und deren Vorherhashes muss Root vor diesem späteren Wechsel erneut lesen. Dieses Paket errät keine zwischenzeitlich geänderten Startdateien. Zum Einschalten ist später eine andere ausdrücklich geprüfte Konfiguration plus ein frisch angezeigter, bestätigter Plan nötig; keine automatische Hochstufung der Vorschau.

## Minimale Rücknahme

Den gesicherten bisherigen `GRAVURU_GALLERY_MANAGEMENT_CONFIG`-Verweis wieder einsetzen und die vier gesicherten Vorherdateien zurückspielen; ausschließlich die private Verwaltung neu starten. Die vier neuen Dateien bleiben dann unreferenziert. Kein Datenbankrestore: bestehende Profile und Prüfpläne bleiben unverändert gespeichert. Da dieses Paket keine Ausführung erlaubt, entsteht dadurch keine zurückzunehmende Produktrevision. Kundenruntime, Theme und Bestellungen werden nicht berührt.

## Reproduzierbarer Paketbau

```powershell
$env:GRAVURU_PYTHON='<vorhandener Python-Pfad>'
$env:GRAVURU_MODULE_NATIVE_CANDIDATE='<absolute geprüfte r4-Datei>'
node --test scripts/lib/gallery-production-preview-mount.test.mjs
node docs/reviews/2026-11-09-module-activation-preview/build-package.mjs '<neuer absoluter Ausgabeordner>'
```

Das Archiv enthält ausschließlich `overlay/`, `before/`, `external/`, Manifest, geschützte Dateihashes und diese Anleitung. Keine Datenbanken, Tokens oder Identitätsdateien werden neu verpackt.
