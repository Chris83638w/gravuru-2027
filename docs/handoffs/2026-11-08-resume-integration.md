# Wiederaufnahme: aktuelle R15-Module und begrenztes Design-Vorladen

Stand: 08.11.2026, Codex/Mika. Eigener Branch `dev/mika-r15-resume-integration-20261108`. **Vorbereitet, noch nicht auf dem Server veröffentlicht.** Keine Produktzuweisung, kein Main-Merge und keine Datenbank-/Shopifyänderung.

## Verbindlicher Ausgangspunkt

- Freigegebener Kundenaufbau aus `e9c36ce12d38fcb36bcb4b4c57add458d1859af7`, dokumentierte Basis `c7710dec6f2c4f6d0b36073ad2dc623fd5d5ac05`.
- Gestapelte Module aus PR220, `957306a26ea53f1df19c9f49786feb30fe1f5b1e`.
- Cache aus PR221: `6686e86` und `552347034b75866b13c1d57af2980ae6c7e0c709`. Übernahmen hier `e381a5c0` und `f4c370fcc6bfdd388f63f14ea339046ea1103aca`.
- Ein fachlicher Konflikt in `shop-design-gallery.mjs`: optionales vorbereitetes `cardModel` UND bestehende Prüfung `moduleEnabled(...,'designs')` erhalten. `shop-entry.mjs` automatisch vereinigt und anschließend geprüft. Beide bisherigen STATUS-Einträge erhalten.
- Designquellen, Preise, Formen, Lochgeometrie und Produktbindungen bleiben erhalten. Design-Master: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md . Keine neuen Produktoptionen erfunden.

## Gesicherter Stand

Die lokale Flugkopie wurde am 08.11.2026 um 23:35 Berlin vollständig gelesen: 288.704 Dateien, 35.522.284.154 Bytes, keine Lesefehler. 288.695 aktuelle Quellen sind identisch. Die neun Unterschiede sind ausschließlich Dateien der inzwischen fortgesetzten Cachearbeit. Private Prüfliste und Abschlussbeleg liegen im bestehenden Sicherungsordner `lie-flight-backup-20261108-1750/`; keine privaten Datenbanken oder Zugangsdaten in GitHub.

Manifest-SHA-256: `2ff4cb16764fe20175c9ff1ecc04efa7f922870f803c899d0d2c5ad5c1f4dcc9`. Der Beleg heißt `snapshot-verification-receipt.json`; der alte angekündigte Beleg `backup-receipt.json` wurde nicht erzeugt. Snapshot selbst nicht verändert. Code-Gitbundle aus der Flugpause bleibt gültig; Katalog-Historybundle und ZIP-Zwischenversuche bleiben ausdrücklich unvollständig.

**Plesk-Auftrag 1158 weiterhin offen:** direkte Auftragsansicht meldet fehlenden Zugriff; Server-Backupmanager zeigt reguläre nächtliche Serverbackups, jedoch keinen eindeutigen Abschluss dieses Abonnementauftrags. Das ist weder Erfolgs- noch Fehlernachweis. Kein zweites Vollbackup gestartet. Die einmalige Wiederanlauf-Automation wurde nach dem tatsächlichen Wiederanlauf gelöscht.

## Lokale Integrationsprüfung

- Kombinierter Lauf: 105 erfolgreiche Tests, kein Fehler; ein zusätzlicher Realbanktest war mangels gesetzter Dateivariablen zunächst übersprungen. Ausschließlich diesen Test mit korrektem lokalen Quellpfad nachgeholt: 1/1 bestanden. Insgesamt **106 unterschiedliche Fälle bestanden**, kein verbleibender Skip.
- Geprüft: Cache, echte HTTP-Einstiegswege, Warmmanifest, Hostkonfiguration, Galerie, Modulruntime und reale r4-Bank. Keine Browser-/Liveabnahme daraus abgeleitet.
- Reale r4-Quelle: SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`, 251 Originale, acht Formen, 80 Größen und 404 Kombinationen. Beide Logo-Profile erhalten alle Originale/Preise. Quelle unverändert.
- Genau drei Originalvorschauen erzeugt (140.037 / 139.106 / 139.156 Bytes), lokal ca. 2,16 s Vorbereitung, 0,14 s URL-Ermittlung, 0,45 s drei geprüfte Dateilesungen. Dies sind lokale Testzeiten, keine Handy-/Serverzusage.
- Paket enthält **18 Produktionsdateien**, vier davon neu. 68 geschützte Quelldateien einschließlich Zentrierung, Touch, SVG-Worker und aller Git-CSS-Dateien bytegleich zur Basis. Kein Ersatz von Designs oder sonstigen Bildressourcen.
- Separater Build mit sämtlichen **36 tatsächlich zuvor erfassten Live-Styles**: 154 Module, 16 gebündelte Styles, 30 einzeln nachladbare Fonts, 703 einzeln nachladbare Motive. Bundle `editor-a04598dac378d8b2.mjs`, 1.449.536 Bytes / gzip 483.564 Bytes. Die 36 Styles blieben beim Build bytegleich.

## Paket und Nachweise

Lokale Nachweise unter `outputs/r15-resume-integration-20261108/`:

- `integration-tests.log` und `real-module-bank.log`.
- `package/patch-manifest.json`: alle Vorher-/Nachher-SHAs, Schutzliste und aktive Styles.
- `package/verify.mjs`: ausschließlich lesende Prüfung mit `--package`, `--before <runtime>` oder `--after <runtime>`.
- `r15-resume-patch.tar.gz`: 173.709 Bytes, SHA-256 `4295a29906bce6d50bff59a5cc670450fe54bf02f89e80c9c9c2688c48d83029`.
- Manifest-SHA-256: `e449251b046def0eead402ec6413cdbef813ea857c371c83cf5ba192267680d7`.
- Reproduzierbarer Quellpaket-/Buildhelfer: `scripts/package-r15-resume.mjs`. Er schreibt nur lokale Ausgaben, nie Server, Shopify oder Produktdaten.

## Noch offen und nächster Schritt

1. Browsersteuerung zum geöffneten Plesk-Tab wiederherstellen. Die aktuelle Blockade betrifft das Verbinden der Steuerung mit dem Tab, nicht nachgewiesenermaßen die Serveranmeldung oder den Konfi. Kein Umgehen von Anmelde-/Berechtigungsprüfungen.
2. Aktiven Wrapper und aktuelle Serverquelldateien frisch prüfen; erwarteter Wrapper-SHA `8127113f65285489b5dfcde46dc9462159703cf43f6e6c5081f01a6a776e4dcf`, Runtime `private/mika-r15-final-feedback-20261108-v1`. Bei Abweichung zuerst vergleichen. Plesk-Auftrag 1158 abschließend prüfen.
3. Nur den geprüften 18-Dateien-Delta in eine getrennte neue Runtime übernehmen. Alle aktiven Styles, Datenbanken, Ressourcen und bestehenden Bindungen erhalten. Dort Build/Hashprüfung; aktuelle UI, SVG, Touch und Warenkorb vor Umschaltung abnehmen.
4. Cache nur für Produkt `16190784438652`, Variante `58104606556540`, in einem separaten privaten Ableitungsverzeichnis vorbereiten. Drei optionale Einstellungen und Rücknahme siehe [Cache-Übergabe](2026-11-08-public-design-preview-cache.md). Keine Schleife über 251 Designs oder 404 Varianten. Produktseitenmanifest und Galeriekarten müssen dieselben vorbereiteten URLs verwenden; übrige Karten bleiben normal erreichbar.
5. **PR214 separat:** der unabhängige lokale vollständige Aktivierungstest stoppte bei einer Logo-an-Rücknahme an der 60-s-Frischeprüfung. Schutz greift, keine vollständige Aktivierungsfreigabe. Ursache/Batchkosten werden isoliert untersucht; Frist nicht einfach erhöhen. Frühere Logo-aus-/Reconcile- und drei Historien-/Konflikttests bestanden. Keine produktive Profilzuordnung bis Ursachenklärung und konkreter Planprüfung.

Eine bereits gespeicherte Profilrevision darf später nicht mit profilunkundiger alter Runtime betrieben werden. Fachliche Rücknahme erfolgt als neue bestätigte Revision; historische Bestellungen bleiben unverändert.
