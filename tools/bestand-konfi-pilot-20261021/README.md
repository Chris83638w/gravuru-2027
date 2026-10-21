# Getrennter Anschlussprüfstand für den bestehenden Konfigurator

Stand 21.10.2026. Die September-Oberfläche mit den bestätigten Ergänzungen bleibt unverändert. Dieses Paket enthält einen getrennten Vertragsadapter, einen nicht eingebauten Händlertransport, Preisprüfungen und ein rein lokales Transportmessgerät. Es ist noch kein verkaufsfähiger Anschluss und kein Ersatz für die Werkstatt.

## Bestätigter Bestand

- GitHub-Grundlage: `Chris83638w/gravuru-2027`, `dev/konfi-neu-20261019`, `bf5c059f13e0868d7c554616b7c35ff7a328ae62`.
- Das vorhandene Plesk-Hosting für `app-2027.gravuru-designwerkstatt.de` nutzt Node 24.22.0, Anwendung `/gravuru-2027-merchant`, Startdatei `start-r5.cjs`.
- Die lesend geprüfte Startkette führt über `app.cjs` zu `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-merchant-release-d18bc6c/ops/plesk/merchant-app.cjs`.
- Das dortige Paketmanifest nennt Version `0.1.0-precise.20261016+d18bc6cb8fdb` und Quellcommit `d18bc6cb8fdbe9e69008d9be18b2b74ce72365eb`. Dieser Commit war am 21.10. über die GitHub-API weder in `gravuru-2027` noch in `gravuru-shopify` abrufbar (422). Der Startverweis und die Manifestangabe sind belegt; ein vollständiger Dateihash-Abgleich und die Prüfung des laufenden Prozessabbilds stehen aus. Die ältere Manifestdatei im äußeren Anwendungsordner beschreibt nicht dieses Release.
- Das bestehende Schieferprodukt `cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1`, Stand 5, ist in der angemeldeten Werkstatt sichtbar: 220 × 140 mm, Grundpreis 22,99 €, Foto 9,99 €, zusätzliches Motiv 1,69 €, neun Befestigungsarten. Die manuell abgelesenen Werte stehen getrennt in `pricing/observed-product-20261021.json`. Keine Übertragung der alten 300×200-Vorlage auf diese Geometrie.

## Ressourcen und Sicherung

Die Plesk-Momentaufnahme zeigt einen AMD EPYC 9174F mit 16 Kernen, 96 GB physischem RAM, rund 63,48 GB verfügbarem RAM und 412,37 GB freiem Platz auf dem Dateisystem für die Websites. Diese Hostwerte sind keine zugesicherte Anwendungskapazität.

CloudLinux begrenzt das Konto `gravuru_werkstatt` (UID 10005, gravuru-designwerkstatt.de) auf SPEED 100 %, PMEM 1G, IO 1 MB/s, IOPS 1024, EP 20 und NPROC 100. Das Anwendungsverzeichnis gehört diesem Konto. Ob der konkrete laufende Prozess genau in dieser cgroup begrenzt wird, muss der lesende Preflight bestätigen. Die großzügigeren Werte des anderen Kontos `gravuru.de` dürfen nicht dafür verwendet werden.

Plesk listet 21 Sicherungen mit insgesamt 617 G. Der neueste Eintrag ist vom 21.10.2026, 02:11 Uhr, inkrementell +13,2 GB in Google Drive Backup, Beschreibung „Gesamte Konfiguration und gesamter Inhalt“. Die Auflistung beweist keine konsistente Wiederherstellung der Werkstattdatenbanken. Der im Quellcode vorhandene Werkstatt-Snapshot benötigt eine koordinierte Offline-Sicherung mit exklusiver Anwendungssperre und SQLite-Backupfunktion. Heute wurden weder Dienst noch Datenbanken angehalten, kopiert oder wiederhergestellt.

## Dateien und Prüfung

- `adapter/`: Übersetzung der alten Entwurfsformate in den nativen Sicherungsvertrag; feste Produktrevision und Geometrie; Original-/Ergebnisdatei und Freistellwunsch. Nicht unterstützte Wiederöffnungsdaten bleiben erhalten und sperren den Versand ausdrücklich.
- `transport.mjs`: ausschließlich injizierter vorhandener Händlertransport, feste Produktbindung, CSRF/privater Entwurfszugriff, keine automatische Wiederholung unklarer Schreibvorgänge, Schutz vor parallelem Doppelklick. Keine öffentlichen Kundenrouten und kein Warenkorbversand.
- `pricing/`: unveränderte, über Git-Blob-Prüfsummen gesicherte aktuelle Preisquellen; neue Staffel samt Cent-Rundung und Fotoaufschlag nach Rabatt. Live-Shopify-Preisbestätigung steht aus.
- `ops/`: lesender Server-Preflight und abgesicherter Loopback-Lasttreiber.
- `server.mjs`: kurzlebige synthetische GET-Transportprobe, keine Uploads, keine Datenbank und keine ausgehenden Netzaufrufe. Die regulären Vorschauen auf 8963/8966 werden nicht berührt.

Voraussetzung: Node 24. Keine Installation von Paketen, keine Zugangsdaten und keine Netzverbindung für die Prüfungen nötig. Aus diesem Ordner ausführen:

```text
node verify.mjs
```

Die abschließende gemeinsame Prüfung bestand mit 36 Adapter-/Transport-/Ops-Tests und 28 Preistests. Derselbe Prüflauf bestand anschließend in einer getrennten vollständigen Kopie des Pilotordners, ohne Zugriff auf den ursprünglichen Konfiguratorordner. Die dafür benötigten 13 unveränderten September-JavaScript-Dateien samt Bibliothekslizenz sind unter `adapter/legacy-source/` mit Prüfsummen gesichert. `verification.tap`, `pricing/report.json` und `pricing/results.tap` enthalten die Ergebnisse. Ein zusätzlicher begrenzter Loopbacklauf lieferte 100 erfolgreiche synthetische GET-Antworten, keine Fehler und keine externen Requests (`load-results.json`). Er beweist ausschließlich den Messweg, weder Foto-/Datenbanklast noch eine Anzahl gleichzeitiger Käufer. Der dafür gestartete lokale Probeprozess wurde anschließend beendet.

## Noch notwendige Anschlussarbeit

1. Den tatsächlich installierten Releasequellbaum mit Manifest gegen GitHub sichern und zuordnen; privaten Datenstand mit dem vorhandenen Sicherungsweg und Wiederherstellungstest absichern. Den bereits laufenden Dienst weiterverwenden.
2. Die durch den alten Entwurfsexport verlorenen nativen Felder wie Fotomaske, Ebene/Rolle und Oberfläche verlustfrei mitführen. Den Serververtrag für vollständige Fotobearbeitungsparameter und bei Bedarf versteckte Fotos versioniert ergänzen. Aktuell sperrt der Adapter solche Fälle bewusst.
3. Den öffentlichen Kundenzugriff und den neuen Shopify-Preisvertrag schließen. Eine Händlersitzung ist kein allgemeiner Kundenanschluss. Der aktuelle Basisvariantenweg kann die Staffel nicht einfach als günstigeren Shopify-Preis übernehmen. Zusatzfeld-/Rückseitenaufschläge brauchen ebenfalls den vollständigen Preisvertrag.
4. Erst danach Gestaltung → Foto → private Sicherung → Wiederöffnung → verbindlicher Preis → Shopify-Testwarenkorb gemeinsam abnehmen. Die heute lokal geprüften 63,20 € für zwei bzw. 92,04 € für drei Exemplare mit je einem kostenpflichtigen Foto sind Sollwerte; kein behaupteter Shop-Nachweis.
5. Realistische Foto-/Sicherungs-/Warenkorblast auf einer getrennten, hinsichtlich Ressourcen repräsentativen Testumgebung messen. Ein Live-Lasttest und pauschale Versprechen für 100/500/1000 Kunden sind nicht erfolgt.

Keine Änderung an bestehenden Konfiguratoren, Live-Produkten, Shopify-Rabatten, Zahlungsarten, Plesk-Limits oder Diensten. Keine privaten Fotos, Datenbanken oder Zugangsdaten in diesem Paket. Keine vollständige Ende-zu-Ende-Freigabe.
