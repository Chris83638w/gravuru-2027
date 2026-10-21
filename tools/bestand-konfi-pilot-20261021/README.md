# Getrennter Anschlussprüfstand für den bestehenden Konfigurator

Stand 21.10.2026. Die September-Oberfläche mit den bestätigten Ergänzungen bleibt unverändert. Dieses Paket enthält einen getrennten Vertragsadapter, einen nicht eingebauten Händlertransport, einen konkret anwendbaren privaten Foto-Persistenzpatch, einen Vorschlag für den Shopify-Preisvertrag, Preisprüfungen und ein rein lokales Transportmessgerät. Es ist noch kein verkaufsfähiger Anschluss und kein Ersatz für die Werkstatt.

## Bestätigter Bestand

- GitHub-Grundlage: `Chris83638w/gravuru-2027`, `dev/konfi-neu-20261019`, `bf5c059f13e0868d7c554616b7c35ff7a328ae62`.
- Das vorhandene Plesk-Hosting für `app-2027.gravuru-designwerkstatt.de` nutzt Node 24.22.0, Anwendung `/gravuru-2027-merchant`, Startdatei `start-r5.cjs`.
- Die lesend geprüfte Startkette führt über `app.cjs` zu `/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-merchant-release-d18bc6c/ops/plesk/merchant-app.cjs`.
- Das dortige Paketmanifest nennt Version `0.1.0-precise.20261016+d18bc6cb8fdb` und Quellcommit `d18bc6cb8fdbe9e69008d9be18b2b74ce72365eb`. Dieser Commit war am 21.10. über die GitHub-API weder in `gravuru-2027` noch in `gravuru-shopify` abrufbar (422). Inzwischen wurden alle 436 Manifestdateien direkt auf Plesk nach Größe und SHA-256 bestätigt, privat archiviert, getrennt entpackt und erneut vollständig geprüft. Prozessbenutzer, Arbeitsverzeichnis, Node-Pfad und cgroup wurden ebenfalls bestätigt; ein Speicherabbild wurde nicht untersucht. Die ältere Manifestdatei im äußeren Anwendungsordner beschreibt nicht dieses Release. Einzelbelege: `live-securement-20261021.json`.
- Das bestehende Schieferprodukt `cfg_b4fd3f0c-1d36-4708-b65a-2450134c4ef1`, Stand 5, ist in der angemeldeten Werkstatt sichtbar: 220 × 140 mm, Grundpreis 22,99 €, Foto 9,99 €, zusätzliches Motiv 1,69 €, neun Befestigungsarten. Die manuell abgelesenen Werte stehen getrennt in `pricing/observed-product-20261021.json`. Keine Übertragung der alten 300×200-Vorlage auf diese Geometrie.

## Ressourcen und Sicherung

Die Plesk-Momentaufnahme zeigt einen AMD EPYC 9174F mit 16 Kernen, 96 GB physischem RAM, rund 63,48 GB verfügbarem RAM und 412,37 GB freiem Platz auf dem Dateisystem für die Websites. Diese Hostwerte sind keine zugesicherte Anwendungskapazität.

CloudLinux begrenzt das Konto `gravuru_werkstatt` (UID 10005, gravuru-designwerkstatt.de) auf SPEED 100 %, PMEM 1G, IO 1 MB/s, IOPS 1024, EP 20 und NPROC 100. Der beobachtete Anwendungsprozess gehört nachweislich zur cgroup `lve10005`. Die großzügigeren Werte des anderen Kontos `gravuru.de` dürfen nicht dafür verwendet werden.

Plesk listet 21 Sicherungen mit insgesamt 617 G. Der neueste Eintrag ist vom 21.10.2026, 02:11 Uhr, inkrementell +13,2 GB in Google Drive Backup. Diese Auflistung allein beweist keine SQLite-Konsistenz. Nach ausdrücklicher Wartungsfreigabe wurde die bestehende Händler-Testanwendung kurz angehalten, der vorhandene geprüfte Snapshotweg mit exklusiver Sperre und SQLite-Backupfunktion ausgeführt und dieselbe unveränderte Anwendung wieder gestartet. Ihre Produktliste lädt wieder in Shopify.

Die drei Sicherungsdatenbanken wurden in einem getrennten privaten Ordner bytegleich wiederhergestellt: SQLite-Integrität, Fremdschlüssel, unterstützte Revisions-/Original-/Designzuordnungen und alle Datei-Prüfsummen bestanden. Bestand: 34 Produkte, 94 Produktrevisionen, 102 Designoriginale, 36 aktuelle und 98 historische Designzuordnungen, 15 Prüfstände, ein Materialoriginal sowie ein Profil mit zwei Revisionen. Keine Daten verändert oder Designs reaktiviert. Die alten 171 Designs/sieben Plattenvorlagen sind damit weiterhin nicht eindeutig zugeordnet. Ein vollständiger Anwendungsstart aus der Sicherung wurde nicht durchgeführt; Zugangsdaten und private Laufzeitkonfiguration gehören in einen gesonderten sicheren Übergabeweg. DBs und private Archive bleiben außerhalb GitHub.

## Dateien und Prüfung

- `adapter/`: Übersetzung der alten Entwurfsformate in den nativen Sicherungsvertrag; feste Produktrevision und Geometrie; Original-/Ergebnisdatei und Freistellwunsch. Nicht unterstützte Wiederöffnungsdaten bleiben erhalten und sperren den Versand ausdrücklich.
- `photo-persistence/`: verlustfreie Sicherung und Wiederöffnung von Original, Ergebnis, tatsächlicher Bearbeitungsquelle, `photoEdit`, versteckten Fotos und vollständigem Editorzustand. Unbekannte native Felder bleiben erhalten, bekommen dadurch aber keine Berechtigungen. Der deduplizierte Transport `wire/v1` verweist auf bereits im nativen Input enthaltene Bildbytes und prüft vor Versand das unveränderte 100-MiB-Gesamtlimit.
- `photo-persistence/server/`: privater Store-Baustein und `native-photo-persistence.patch` für drei vorhandene Backenddateien und vier neue Module. Derselbe native Draftstore und dieselbe SQLite-Verbindung sichern Archiv, Entwurfsrevision und Fotopaket atomar. Ein serverseitig erzeugter Input-Digest verhindert die Verbindung von Prüfstand A mit anderen Inhalten B. Bestehende Token-/Mandanten-/Revisionsgrenzen bleiben erhalten. Kein neuer Dienst und keine zweite Datenbank; der Patch ist noch nicht eingebaut.
- `transport.mjs`: ausschließlich injizierter vorhandener Händlertransport, feste Produktbindung, CSRF/privater Entwurfszugriff, keine automatische Wiederholung unklarer Schreibvorgänge, Schutz vor parallelem Doppelklick. Keine öffentlichen Kundenrouten und kein Warenkorbversand.
- `pricing/`: unveränderte, über Git-Blob-Prüfsummen gesicherte aktuelle Preisquellen; neue Staffel samt Cent-Rundung und Fotoaufschlag nach Rabatt. Live-Shopify-Preisbestätigung steht aus.
- `pricing/cart-contract/`: vorgeschlagene Erweiterung der bestehenden Shopify-Funktion einschließlich signiertem Preisvertrag, Mengenprüfung, Zusatzfeldern/Rückseite und unverändertem Legacy-Pfad. Das neutrale JavaScript-Prüfbündel ist kein fertiges oder freigegebenes WASM-Deployment.
- `pricing/live-preflight/`: lesender Prüfer für die vorhandene CartTransform-Installation; 20 lokale Mocktests. Zusätzlich über die bereits eingerichtete App live bestätigt: CartTransform `172523900`, Function `01a0e45d-c47f-70b9-9d5a-a2c72120ae01`, `blockOnFailure:true`. Keine Shopify-Mutation oder Scope-Erweiterung. Dies bestätigt noch keinen neuen Staffelpreis im Checkout.
- `ops/`: lesender Server-Preflight und abgesicherter Loopback-Lasttreiber.
- `server.mjs`: kurzlebige synthetische GET-Transportprobe, keine Uploads, keine Datenbank und keine ausgehenden Netzaufrufe. Die regulären Vorschauen auf 8963/8966 werden nicht berührt.

Voraussetzung: Node 24. Die Adapter-, Foto-, SQLite- und Preflight-Prüfungen benötigen keine zusätzlichen Pakete. Für die inzwischen ergänzten Preis-/Function-Prüfungen werden bei einer frischen Arbeitskopie zunächst die festgeschriebenen Abhängigkeiten unter `pricing/cart-contract/` mit `pnpm install --frozen-lockfile --ignore-scripts` eingerichtet; Anleitung und Lockdatei liegen dort. Die Prüfläufe selbst benötigen keine Zugangsdaten und keine Netzverbindung. Aus diesem Ordner ausführen:

```text
node verify.mjs
```

Der aktuelle gemeinsame Gesamtlauf bestand mit **96 Tests**: 36 Adapter-/Transport-/Ops-Prüfungen, 40 Foto-/Wire-/Server-Prüfungen und 20 Preflight-Mocktests. Der weiterhin separat gestartete `pricing/run.mjs` bestand mit **52 Preis-/Vertrags-/Function-Prüfungen**. Zusammen sind das 148 bestandene JavaScript-Tests, ohne Fehler oder ausgelassene Fälle. `verification.tap`, `pricing/report.json` und `pricing/results.tap` enthalten die Ergebnisse. Die SQLite-Tests prüfen auch Dateidatenbank-Neustart, zwei konkurrierende Verbindungen und vollständigen Rollback. Der 4×15-MiB-Transportgrenztest ist kein Last- oder Speichernachweis für das 1G-LVE des Live-Servers.

Die **15 Python-Prüfungen** wurden anschließend separat mit Python 3 ausgeführt und bestanden ebenfalls. Sie prüfen ausschließlich synthetische Bestände, Sicherungs-/Wiederherstellungsgrenzen, Originaldateien, Produktrevisionen, abgelehnte Designs und Geometriebezüge. Sie beweisen keine erfolgte Sicherung oder Wiederherstellung der echten Werkstattdatenbank. Mit dem vorhandenen Python-3-Interpreter ausführen:

```text
python -B ops/restore-private-snapshot.test.py
```

Die frühere Grundprüfung mit 36 Adapter-/Transport-/Ops-Tests und 28 Preistests bestand auch in einer getrennten vollständigen Kopie des Pilotordners, ohne Zugriff auf den ursprünglichen Konfiguratorordner. Die dafür benötigten 13 unveränderten September-JavaScript-Dateien samt Bibliothekslizenz sind unter `adapter/legacy-source/` mit Prüfsummen gesichert. Die später ergänzten Prüfungen wurden im oben genannten aktuellen Gesamtlauf geprüft. Ein zusätzlicher begrenzter Loopbacklauf lieferte 100 erfolgreiche synthetische GET-Antworten, keine Fehler und keine externen Requests (`load-results.json`). Er beweist ausschließlich den Messweg, weder Foto-/Datenbanklast noch eine Anzahl gleichzeitiger Käufer. Der dafür gestartete lokale Probeprozess wurde anschließend beendet.

Der Server-Gesamtpatch wurde auf einer Wegwerfkopie der gepinnten Quellen mit `git -c core.autocrlf=false apply --check` geprüft und angewendet. Alle sieben Zieldateien entsprachen exakt den Patchbuilder-Ergebnissen und bestanden die Syntaxprüfung. Die vollständige HTTP-Anwendung mit echten Sitzung/CSRF-, Produkt- und Python/Pillow-Abhängigkeiten wurde dabei nicht gestartet. Einzelheiten und verbleibende Voraussetzungen stehen in `photo-persistence/server/README.md`.

## Noch notwendige Anschlussarbeit

1. Die abgeschlossene private Quell-/DB-Sicherung sicher auf ein zweites unabhängiges Ziel übertragen und den nicht abrufbaren Releasecommit zuordnen. Die historischen 171 Designs/sieben Plattenvorlagen gezielt mit ihrer ursprünglichen Ablage abgleichen. Den bereits laufenden Dienst weiterverwenden.
2. Den vorbereiteten Serverpatch nach Abgleich des tatsächlich installierten Quellstands in einer getrennten Backend-Arbeitskopie einbauen und vollständige HTTP-/Bilddecoder-/Wiederöffnungsprüfungen ausführen. Der Editor muss den vollständigen Zustand vor der alten Whitelist an die neue Sicherung übergeben; bereits verlorene Masken-, Rollen- oder Oberflächenfelder werden nicht erfunden. Bisherige Adapter- und Capability-Gates bleiben bis zum realen Anschlussnachweis gesperrt.
3. Den öffentlichen Kundenzugriff und den neuen Shopify-Preisvertrag schließen. Eine Händlersitzung ist kein allgemeiner Kundenanschluss. Der aktuelle Basisvariantenweg kann die Staffel nicht einfach als günstigeren Shopify-Preis übernehmen. Der vorbereitete Preisvertrag enthält Zusatzfeld-/Rückseitenaufschläge; offen sind der echte Shopify-CLI/Javy-WASM-Build, Runner-/Instruktions-/Speicherprüfung, echte Produkt-/Varianten-/Schlüsselbindung und negative Checkout-Tests. Der aktuell bestätigte Schalter `blockOnFailure=true` ersetzt diese Nachweise nicht.
4. Erst danach Gestaltung → Foto → private Sicherung → Wiederöffnung → verbindlicher Preis → Shopify-Testwarenkorb gemeinsam abnehmen. Die heute lokal geprüften 63,20 € für zwei bzw. 92,04 € für drei Exemplare mit je einem kostenpflichtigen Foto sind Sollwerte; kein behaupteter Shop-Nachweis.
5. Realistische Foto-/Sicherungs-/Warenkorblast auf einer getrennten, hinsichtlich Ressourcen repräsentativen Testumgebung messen. Ein Live-Lasttest und pauschale Versprechen für 100/500/1000 Kunden sind nicht erfolgt.

Keine Änderung an bestehenden Konfiguratoren, Live-Produkten, Shopify-Rabatten, Zahlungsarten oder Plesk-Limits. Kein neuer Dienst und kein Releasewechsel; nur die freigegebene Wartungspause für die Sicherung. Keine privaten Fotos, Datenbanken oder Zugangsdaten in diesem GitHub-Paket. Keine vollständige Ende-zu-Ende-Freigabe.
