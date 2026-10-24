# Browser-Sichtabnahme Paket B – offen

Die lokale RT1/RT2-Prüfvorschau wurde aus Originalfamilie und D1-Quellen aufgebaut, ausschließlich mit einer In-Memory-Datenbank. Ein lokaler HTTP-Abruf im Root-Prozess erreichte den Server. Das bestätigt nur den Server, keine Browserdarstellung oder Bedienung.

Der Chrome-Connector erhielt beim Aufruf HTTP 403. Der anschließende Computer-Use-Versuch wurde von der Sicherheitskontrolle beendet:
> Computer Use has been stopped for this turn because it could not determine the current browser URL on Windows with enough confidence to enforce policy.

Danach wurden keine weiteren Browser-/Computer-Use-Versuche durchgeführt. Sicherheitsregeln, Request-Header und Serverzugriffsschutz wurden nicht angepasst. Es liegt kein erfolgreicher Browser-Screenshot vor. Unit-Tests und PDF-Nachweise ersetzen diesen Abnahmepunkt nicht; beide B-PRs bleiben Draft.

## Reproduktion für Claude

Im B-Code-Checkout, mit dem passenden Katalog-Checkout:

```text
node scripts/preview-retro-contours.mjs --katalog <Katalogordner> --output <lokaler Prüfordner>
```

Der Prozess gibt zwei lokale URLs für RT1 und RT2 aus und schreibt sie in `<Prüfordner>/ready.json`. Im normal zugänglichen Browser öffnen. Der Vorgänger dieser Prüfvorschau wurde lokal gestartet; die versionierte CLI-Fassung ist zusätzlich syntaktisch und mit `--help` geprüft. Sie liest nur den Katalog und erzeugt lokale Vorschau-Dateien.

Prüfen und Screenshot im Code-PR ergänzen:
- RT1/RT2 90 × 60 mm: Originalumriss, transparente feste Bohrungen, Innenabstand und Loch-Schutzzonen.
- Befestigung wechseln: ohne Bohrungen / B02 mit zwei festen Ø-4-mm-Löchern; 14,99 € Grundpreis, B02-Aufpreis 2,49 €.
- Text/Motiv an konkaven Rand und Lochschutzzone bewegen, Größe/Drehung und Einrasten prüfen.
- Maßhaltigen Kontur-Export mit den versionierten PDF-Nachweisen vergleichen.

Der lokale Prüfstand ist weder Live-Konfigurator noch Bestell-/Maschinenfreigabe.
