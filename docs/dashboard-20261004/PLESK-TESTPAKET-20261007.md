# Privates Plesk-Testpaket – Nachweis vom 07.10.2026

Produktbasis **`74a1e8b61b564b1fa9421b153d3d7da7c7999b0a`**, Laufzeit-/Paketquellcommit **`ec4ecf105c94576008bf477080a6f3689da68f19`**, Branch `feat/plesk-private-test-package-20261007`. Die zusätzliche Testsicherung enthält den Prüfbericht und das daraus gebaute ZIP; Paketmanifest und Bericht nennen exakt denselben Laufzeitcommit. Produktcode unter `app/` unverändert, einschließlich ZIP-Import und Quellordnereinstellungen.

## Dateien für die Person mit Plesk-Zugang

- [ZIP – 27.184.243 Bytes, etwa 25,9 MiB](../../deliverables/plesk-private-test-20261007/gravuru-2027-private-test.zip)
- [SHA-256-Datei](../../deliverables/plesk-private-test-20261007/gravuru-2027-private-test.sha256)
- [Plesk-Installationsanleitung](../../ops/plesk/README.md), außerdem als `INSTALLATION.md` im ZIP

ZIP-SHA-256: `ba72d27ac67690440a8795cb760f6cb39b30aa8fa39b3efcb6fe78a57b423b36`.

360 ZIP-Einträge. `PACKAGE-MANIFEST.json` enthält den vollen Quellcommit und Hash/Länge jeder Nutzdatei. Paketbildung ausschließlich aus Git-Blobs des angegebenen Commits: keine Arbeitskopie, ignorierten Dateien, privaten Datenbanken, `.env`, Schlüssel, Python-Installation oder alten Deploymentpakete übernommen. Root-Startdatei, reine Laufzeit-Paketdatei und robots.txt werden vom Paketwerkzeug ergänzt. Das ZIP enthält keine Produktionsdaten und führt beim Entpacken nichts aus.

## Neuer Teststart

Der normale Werkstattstart bleibt auf Loopback beschränkt. Der vorhandene Shopify-Händlerstart benötigt echte Shopify-Sitzungen. Damit die getrennte Serverablage unabhängig davon abgenommen werden kann, gibt es jetzt einen ausdrücklich privaten Operator-Teststart in `ops/plesk/`:

- Plesk-/Passenger-Start über CommonJS-Adapter `app.cjs`; außerhalb von Passenger nur Loopback.
- HTTP Basic mit eigenem langem Testpasswort, nur hinter konfiguriertem HTTPS-Proxy. Exakter Testhost/Origin und serverseitig gesetztes `X-Forwarded-Proto: https` erforderlich. Weiterleitung an den bestehenden Loopback-Vertrag erst nach diesen Prüfungen und Anmeldung. Zugangsdaten werden nicht an den inneren Server weitergereicht.
- Eigene neue Daten-/Python-Pfade außerhalb von Application Root und Git. Explizite Instanzkennzeichnung, private Rechte, keine automatische Übernahme vorhandener Datenbanken. Der dokumentierte Live-Pfad `gravuru-werkstatt` und bekannte Live-Adressen sind gesperrt.
- Private SQLite-Ablage bleibt bei Prozessneustart erhalten. Betriebssystemsperre über Python `flock` verhindert einen zweiten App-Prozess derselben Datenablage **vor** deren Öffnung; keine PID-Datei oder manuelle Sperrdateilöschung nötig.
- Kein Shopify-App-Secret für diese erste Hosting-Abnahme erforderlich. Keine App-URL, OAuth-Konfiguration, Webhooks oder Shopdaten verändert; Shop-Transporte werden nicht eingerichtet.

Die Anleitung erklärt ausdrücklich, dass `PassengerMinInstances 1` keinen Einzelprozessbetrieb garantiert. Passenger Enterprise kann `PassengerMaxInstances 1` auf den neuen VHost beschränken. Andere Installationen benötigen eine bestätigte, ebenfalls auf den Test beschränkte Lösung der Hostingverwaltung. Keine Änderung globaler Passenger-Limits als Umweg.

## Tatsächlich ausgeführte Prüfungen

```sh
node --check ops/plesk/config.mjs
node --check ops/plesk/runtime.mjs
node --check ops/plesk/app.cjs
node --check ops/plesk/prepare.mjs
node --check ops/plesk/check.mjs
node --check ops/plesk/lock.mjs
python -m py_compile scripts/build-plesk-test-package.py scripts/check-plesk-test-package.py
python scripts/build-plesk-test-package.py --output .test-output/plesk-build/gravuru-2027-private-test.zip
PYTHONPATH=.local-data/python python scripts/check-plesk-test-package.py .test-output/plesk-build/gravuru-2027-private-test.zip
git diff --check
```

**Fünf Prüfgruppen PASS**, unmittelbar am entpackten Paket und dessen tatsächlicher Startdatei:

1. ZIP-/Dateihashes, vollständiger Quellcommit, enthaltene ZIP-/Quellordnerfunktion und Abwesenheit von Datenbanken vor Erststart.
2. Eigene Vorbereitung und Check: Node 24.19.0, Python 3.12.14, SQLite, Python-Imports und tatsächliche Cairo-Konvertierung. Fremde nicht leere Datenablage, Live-Origin, Daten unter Webroot, schwaches Testpasswort und offene Verzeichnisrechte abgewiesen.
3. Fehlende/falsche Anmeldung, falscher Host/Origin, HTTP statt HTTPS-Proxyprotokoll und Cross-Site-Anfrage abgewiesen. Interne Dateien nicht erreichbar. Schreibanfrage ohne CSRF verweigert. Zweiter Prozess scheitert, erster bleibt bedienbar.
4. Echter Browserablauf durch einen synthetischen Loopback-Proxy: SVG importiert, Python-Unterprozess und SQLite genutzt, ein privates Testprodukt gespeichert, gültige Excel-Datei heruntergeladen. Desktop 1440 und Mobil 390 ohne Überlauf; beide Aufnahmen gesichtet, keine JavaScript-Fehler.
5. Paketprozess beendet und neu gestartet: Betriebssystemsperre frei, Testprodukt erhalten, wiederholter Import erzeugt kein Duplikat.

Der erste Prüflauf scheiterte an der lokalen Testumgebung: OpenPyXL lag in der vorhandenen Basis-Python-Installation und war in der isolierten Test-venv zunächst nicht sichtbar. Die **Testfixture** verwendet nun ausdrücklich die bereits installierten Basis-/Projektpakete; der erneute Ablauf bestand. Der ausgelieferte `plesk:prepare` erstellt weiterhin eine eigene venv **ohne** `--system-site-packages` und installiert die angegebenen Requirements. Keine Produkterwartung oder Schutzprüfung abgeschwächt.

[Maschinenlesbarer Bericht](plesk-test-package-20261007/report.json) · [Desktop](plesk-test-package-20261007/package-desktop.png) · [Mobil](plesk-test-package-20261007/package-mobile.png)

## Grenzen und nächster Schritt

Der lokale Proxy simuliert Plesks Host-/HTTPS-Header; er ist **kein** öffentlicher TLS- oder echter Passenger-Nachweis. Python-Pakete wurden für diesen Test aus bereits vorhandenen Installationen genutzt, nicht auf dem Zielserver neu installiert. Die bisher bestandenen unveränderten Produkt-, ZIP-Entpacker-, Maschinen- und Gesamtabnahmen wurden nicht erneut gestartet.

Die Person mit Plesk-Browserzugriff bestätigt zuerst Node/Python/Cairo, Einzelprozessbetrieb, DNS/Zertifikat und die getrennten Pfade. Danach Paket in den neuen Application Root hochladen, `public/` als Document Root verwenden, Testzugang ausschließlich in Plesk hinterlegen, `plesk:prepare` und `plesk:check` ausführen und die in der Anleitung begrenzte Zielserver-Abnahme durchführen. Fehlen diese Verwaltungsfunktionen, ist die Hostingverwaltung erforderlich; kein Umweg über die laufende Werkstatt.

SSH-/VPN-/Plesk-API-Einrichtung bleibt zurückgestellt. Keine Serveränderung oder Veröffentlichung aus dieser Aufgabe. Echte Shopify-Anmeldung, zulässige Test-App-URL, Testvariantenbindung und Testbestellung bleiben ausdrücklich offen. Der alte Servernachweis wurde nicht als heutiger Zustand oder Arbeitsauftrag übernommen.
