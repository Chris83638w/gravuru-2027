# Prio R15 – Betrieb und Rücknahme von Stufe 1

Am 20.11.2026 um 11:14:50 UTC wurde die Merchant-Anwendung für den schnellen Designwechsel auf `921928f41a7d61e73b504400728f2f6f629e8ade` geschaltet. Ihr Vorgänger ist `2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179`. Der Live-Zweig heißt `dev/astra-r15-live-267-20261119`. Die Freigabe und die Abnahmekriterien stehen in [Issue #267](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7037919138).

## Stand prüfen

Die Befehle laufen aus dem Stamm einer Arbeitskopie dieses Betriebszweigs. Python 3.8+, Git und für Hostaktionen der eingerichtete SSH-Zugang `gravuru-werkstatt` über `~/.ssh/gravuru-workshop.conf` werden vorausgesetzt. Über `--checkout` kann jede vollständige Arbeitskopie mit den beiden genannten Commits gewählt werden. Es zählen die Git-Objekte. Die Ausgabe ist JSON. Mit `--ergebnis <Datei>` lässt sie sich lokal sichern.

```sh
python ops/issue267-prio-stufe1-9219/release.py local --checkout .
python ops/issue267-prio-stufe1-9219/release.py check --checkout .
git ls-remote origin refs/heads/dev/astra-r15-live-267-20261119
```

`local` prüft die Git-Quellen und das Hostprogramm. `check` prüft den Starter, die fünf Quellen und das erzeugte HTML auf dem Host. Der gemessene Live-Stand meldete `active: candidate`, `verifiedRollback: true` und zehn erhaltene ältere Editorpakete. Die Rücknahmeprobe im Staging bestand aus einem Hin- und Rückschalten einer isolierten Kopie des Starters. Die Live-Umschaltung wurde anschließend durch den normalen Produkteinstieg und öffentliche Dateiabrufe geprüft.

## Rücknahme ausführen

1. Mit den obigen Befehlen den Kandidaten und den Live-Zweig bestätigen. Bei neuerem Live-Commit oder anderem Starter den aktuellen Operator hinzuziehen. Die folgenden Befehle gehören ausschließlich zur Rücknahme dieser Version.
2. Den vorherigen Starter aktivieren und den Stand prüfen. Die Rücknahme erwartet `active: baseline`.

   ```sh
   python ops/issue267-prio-stufe1-9219/release.py rollback --checkout .
   python ops/issue267-prio-stufe1-9219/release.py check --checkout .
   ```

3. Über die [normale Shopify-Produktseite](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen) den Konfigurator öffnen. Öffentliche Dateien mit `Accept-Encoding: identity` und `Cache-Control: no-cache` abrufen. Der Host ist `https://app-2027.gravuru-designwerkstatt.de`. Alle vier Pfade müssen HTTP 200 liefern. Den SHA-256 der Antwortbytes mit der Vorgängerspalte vergleichen.
4. Nach bestätigter Wiederherstellung auch die Git-Markierung auf den Vorgänger stellen. Die explizite Lease schützt zwischenzeitliche Veröffentlichungen. Bei Ablehnung den inzwischen aktiven Stand mit dem Operator prüfen.

   ```sh
   git push --force-with-lease=refs/heads/dev/astra-r15-live-267-20261119:921928f41a7d61e73b504400728f2f6f629e8ade origin 2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179:refs/heads/dev/astra-r15-live-267-20261119
   git ls-remote origin refs/heads/dev/astra-r15-live-267-20261119
   ```

| Datei | Vorgänger / nach Rücknahme | Stufe 1 |
|---|---|---|
| Merchant-Starter auf dem Host | `ecafbb7fca8bc32e9d4c53df7d23d4c38b680eea500ef11d730c65d32eeac245` | `8fb7601146f6b1285e06e6ab5198b4bf692032c5e0ff10f7e5caf295bab81637` |
| `/_merchant-acryl-editor.html` | `0d7ebc5556f3b201da834a3d29098f6b1ed933ea2433b0b0a18b1edbf9210999` | `df486e4c04945e335d05506c3b54ec74dced5578c0471d611654cf531539b81e` |
| `/konfigurator/shop/shop-design-switch.mjs` | `527a0707994b6d3d03f8b6e26ccfd72a58cf88b9379675800593c02f70c6a59a` | `02a303c57b48fd1cb4df3ca16a351a396ef67cee8d8203b6e642f7b3726ff21c` |
| `/_acryl-bundle/editor-03848a8822ea9589.mjs` | `42151ec1a59a9ea265e2a2892aaaa4f55358e172f0a98b0557ab564d6cec6075` | identisch |
| `/_acryl-bundle/editor-6c00a8d0e08b6e0d.mjs` | `762a181de7b75c82c4f289e0cbf93a4e199d6e453c836122abb454d4e9e44f45` | identisch |

## Bereitstellung wiederholen

`release.py inspect` prüft die bekannte Vorgänger-Laufzeit. `stage` baut die festgelegten fünf Anwendungsdateien in einer privaten Kopie und prüft Quellen, Editorpakete und Rücknahme. `apply` wechselt ausschließlich den bestätigten Laufzeitpfad im Merchant-Starter und signalisiert Passenger den Neustart. Die veröffentlichte Fassung hält beide Editorpakete für laufende Sitzungen bereit. Entwürfe, Aufträge und Produktkonfiguration nutzen weiterhin ihre dauerhaft angebundenen Datenverzeichnisse. Für eine erneute Vorwärtsschaltung zuerst die Abnahme aus Issue #267 beachten und nach der öffentlichen Prüfung den Git-Live-Zweig vom angegebenen Vorgänger per Fast-forward auf `921928f4` setzen.
