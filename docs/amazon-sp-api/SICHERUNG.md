# Sicherung und Wiederaufnahme

Vor Änderungen wurde der neueste erreichbare GitHub-Code geprüft. Basis ist `8ac694b22b4f19bd47cf3b3bb30eba88762c07e8` auf `task/schiefer-rohling-20261014`. Der separate Branch `task/amazon-sp-api-20261016` baut darauf auf. Der parallel vorhandene Dokumentationsbranch `docs/einweisung-20261014` wurde gelesen und bleibt unverändert. `main` ist älter und wurde nicht als Integrationsbasis verwendet.

Der lokale Tag `amazon-sp-api-baseline-20261016` markiert die Basis. Vor Änderungen war der Checkout sauber. Ein zusätzliches Archiv der aktiven Quellen wurde mit 1493 Einträgen und erfolgreicher CRC-Prüfung gesichert:

```text
gravuru-2027-active-source-8ac694b-local.zip
SHA-256 cd05853b08b212d73f73cf03328011d4c3bd4063beb296857b82c135a4581c05
```

Der erste netzwerkabhängige Archivversuch scheiterte beim Nachladen eines Git-Objekts. Seine leere Datei ist kein Sicherungsnachweis; ausschließlich das oben bezeichnete geprüfte Archiv ist gültig.

Der Testlauncher schreibt nur in `.local-data/amazon-sandbox/`. Zugangsdaten liegen außerhalb des Repositorys im privaten Windows-DPAPI-Speicher; sie sind weder im Quellarchiv noch im Patch enthalten. Der öffentliche Git-Stand enthält keine lokalen Datenbanken, personenbezogenen Bestellungen oder Tokens.

Zur Wiederaufnahme den Entwicklungsbranch in einem eigenen Checkout öffnen, Node 24 bereitstellen und [Einrichtung](EINRICHTUNG.md) beachten. Neue Testdaten entstehen in dessen eigener Sandbox-Datenbank. Ein bestehender Arbeitsstand wird nicht zurückgesetzt. Der abschließende Änderungs-Patch gehört zusammen mit dem Basisarchiv zu den lokalen Ausgabedateien dieses Auftrags.

Dies ist eine **Quellstandsicherung**. Eine produktive Datenbank, Cloud-Sicherungen oder ein produktiver Restore wurden mangels verifiziertem Cloud-Zugang nicht gesichert oder abgenommen. Für den späteren Betrieb sind datenschutzkonforme Backupverschlüsselung, Aufbewahrung und ein Restore-Test gesondert erforderlich.
