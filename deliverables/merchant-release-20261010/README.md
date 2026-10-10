# Händlerwerkstatt – geprüftes Installationspaket

Version **0.1.0-recovery.20261010+2d86c73b055a**, Quellcommit `2d86c73b055a6832febdb02970cbf7024436ddb1`.

[ZIP](gravuru-merchant-live-20261010.zip) · [SHA-256](SHA256SUMS) · [Isolierte Installationsprüfung](../../docs/releases/20261010/merchant-package-install.json) · [Browserprüfung](../../docs/releases/20261010/MERCHANT-PREVIEW.md)

27.222.344 Bytes, 381 geprüfte Nutzdateien plus Manifest. SHA-256:

```text
744bcfb564cfa4fb4e2ddde4025f9a961e17c961737a2360bb9d123db2391f6c
```

Das Paket enthält die erreichte Händlerwerkstatt einschließlich nativer Schieferprodukte, privaten Originalressourcen, geschützter Kunden-Vorschau, freier Gestaltung und bestehender Import-/Prüf-/Ausgabemodule. Keine privaten Datenbanken, Originalkundendaten oder Zugangsschlüssel. Das Paket schaltet keine Shopify-Warenkorb-/Bestellstrecke frei.

## Automatisierte Installation

Vorhandene private Händlerkonfiguration und geprüfter Python-Interpreter sind erforderlich. Node 24+. `stage-merchant-release.py` und das danebenliegende `install-archive.py` aus `ops/plesk` verwenden:

```sh
python stage-merchant-release.py \
  --archive /privater/pfad/gravuru-merchant-live-20261010.zip \
  --sha256 744bcfb564cfa4fb4e2ddde4025f9a961e17c961737a2360bb9d123db2391f6c \
  --target /neuer/absoluter/haendler-release \
  --config /privater/pfad/haendler-konfiguration.json \
  --node /absoluter/pfad/node
```

Der Helfer prüft Archiv und jede Nutzdatei, entpackt ausschließlich in ein neues Verzeichnis, baut die Anwendung und prüft die vorhandene Laufzeitkonfiguration. Er ändert keinen laufenden Dienst und keine vorhandenen Daten. Die isolierte Abnahme installierte genau dieses ZIP, startete dessen `app.cjs` mit synthetischen Daten und prüfte Kundenansicht sowie Ablehnung anonymer API-Anfragen.

## Gesicherter Wechsel des vorbereiteten Händlerhosts

`activate-merchant-release.py` ist ausschließlich für den getrennten Host `app-2027.gravuru-designwerkstatt.de` und Anwendungsroot `gravuru-2027-merchant` vorgesehen. Zuerst nur diese Plesk-Node-App stoppen. Danach den Helfer mit `--root`, `--release`, `--config`, neuem `--backup` und der zuvor geprüften `--expected-entry-sha256` aufrufen.

Der Helfer verlangt den freien Prozess-Lock, prüft den Release erneut, sichert alle drei SQLite-Datenbanken mit Integritätsprüfung sowie den bisherigen Code und die Konfiguration in einem neuen privaten Ordner. Erst danach ersetzt er die Startdatei atomar. Plesk anschließend wieder aktivieren und HTTPS/API-Grenzen prüfen. Bestehende Kundenwerkstatt und Shopify-Version werden durch diesen Helfer nicht verändert.

Rückweg: getrennte Händler-App stoppen, aktuellen Startdatei-Hash gegen `ACTIVATION-RECEIPT.json` prüfen und `previous-app.cjs` atomar zurückspielen; danach neu starten. Private Daten nicht blind zurücksetzen, damit inzwischen gespeicherte Arbeit erhalten bleibt. Ein späterer Shopify-App-Wechsel hat zusätzlich seine separat gesicherte Rückkehrversion.
