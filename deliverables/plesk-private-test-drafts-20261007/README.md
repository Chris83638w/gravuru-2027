# Privates Plesk-Testpaket · 07.10.2026

[Installationspaket](gravuru-2027-private-test.zip) · [Prüfsumme](gravuru-2027-private-test.sha256) · [Installation und Betrieb](../../ops/plesk/README.md)

- Quellcommit: `89924ba70d8d052460ec1c0014f2e7fdbafd5a06`
- Größe: 27.192.386 Bytes (25,9 MiB), 362 ZIP-Einträge.
- SHA-256: `458b4c2dcd8db4bfd060236f70e8c165b03e26a407cb52a15728dbc3c27e6f65`
- Enthält ZIP-/Ordnerimport, Excel-Profilzuordnung und den geschützten Plesk-Start. Private Entwurfstokens werden nach erfolgreicher Testanmeldung an den vorhandenen Handler weitergereicht.
- Keine Zugangsdaten, Datenbanken, privaten Konfigurationsdateien oder Produktionsdaten enthalten. Die größere Projektsicherung ist kein Installationspaket.

Das tatsächlich entpackte Paket besteht [fünf gezielte Prüfgruppen](../../docs/dashboard-20261004/plesk-draft-package-20261007/report.json): Manifest, Installation/Python/Cairo, Zugriffsschutz/Einzelprozesssperre, privates Entwurfslesen/-speichern/-wiederöffnen und Neustart. LiteSpeed-Übernahme und private Konfigurationsdatei wurden lokal simuliert. Unveränderte breite Browserabnahmen wurden nicht wiederholt.

Der eigenständige Shopify-Betrieb und eine Produktivumschaltung sind nicht aktiviert. Der Bericht zur echten getrennten HTTPS-Testinstanz wird separat geführt.
