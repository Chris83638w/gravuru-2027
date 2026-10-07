# Selbstständige Cloud-Arbeit und Zugangsprüfung – 07.10.2026

## Verbindlicher Arbeitsablauf

Mikail entscheidet über fachliche Änderungen und konkrete Veröffentlichungen.
Innerhalb des bereits freigegebenen Umfangs übernimmt der Agent Analyse,
Umsetzung, gezielte Tests, Fehlerbehebung und Sicherung auf Aufgabenbranches
selbstständig. Kein erneutes OK für Lesen, gewöhnliche reversible Codekorrekturen
oder bereits genehmigte Schritte. Keine Wiederholung unveränderter Abnahmen.

Vor einer erforderlichen Freigabe: konkretes prüfbares Ergebnis, betroffene
Ziele, verbleibende Grenzen und genau die beabsichtigte Aktion bereitstellen.
Ein OK ersetzt weder fehlende Werkzeuge noch Serveranmeldung. Kein Versprechen
automatischer Chat-Synchronisierung oder dauerhafter Hintergrundarbeit.

## Ein Projektstand, eindeutig benannte Aufgaben

Repository: Chris83638w/gravuru-2027.
Prüfbare Basis dieses Ergänzungsbranches:
79c570061141c8c432e90962c19ed8845cad62b5,
task/order-line-refunds-20261007; Remote-Vergleich am 07.10. identisch.
Dies ist kein Auftrag, spätere Arbeiten zurückzusetzen.

Entwicklungsaufgabe: gravuru-2027 NEU,
01a115b2-0173-7419-9c03-1af745f5c07c.
Zugangsdiagnose: Plesk-Zugang und API prüfen,
01a11649-e9e4-7028-adae-f0180b4d5078.
Alte Aufgabe: Gravuru 2027 – Cloud – Mikail,
01a101bb-342f-750b-b481-82c3c3a5c072.
Ergebnisse immer der tatsächlichen Aufgabe/Instanz und Konfigurationsversion
zuordnen. Ein Titel und ein /workspace-Pfad beweisen keine gemeinsame Laufzeit.

## Tatsächlich bestätigt

- GitHub-Connector erreicht das Repository; benannter Remote-Stand bestätigt.
- Shopify-Connector erreicht den vorgesehenen Shop authentifiziert.
  Das belegt nicht die OAuth-Anmeldung des eigenen App-Prozesses.
- In der Zugangsdiagnose waren beide persönlichen Plesk-Variablen vorhanden.
  Der GET scheiterte vor Plesk am konfigurierten Proxy, curl-Exitcode 7.
- In der Entwicklungsaufgabe gelang der GET ohne Anmeldung: HTTP 401,
  Proxy-CONNECT 200, gültige TLS-Prüfung. Dort fehlten beide Variablen.
- Kein erfolgreicher authentifizierter Plesk-GET und keine bestätigten
  Plesk-Administratorrechte. Keine Server-/Shopänderung durch diese Prüfung.
- Kein natives Werkzeug zum Steuern des angemeldeten Laptop-Browsers und
  kein Werkzeug zum Reparieren/Neustarten des Proxy-Sidecars verfügbar.

## Gemeinsamer lesender Check

Befehl in der zu prüfenden Cloud-Aufgabe:
`python3 scripts/check-cloud-access.py`

Der Check verwendet ausschließlich den festen Endpunkt
https://gravuru.highspeed.cloud:8443/api/v2/server und den geerbten HTTPS-Proxy.
Kein Redirect, kein direkter Netzwerk-Fallback, keine Wiederholungsschleife,
keine TLS-Deaktivierung, keine Projekt- oder Servermutation.

Zuerst anonymer GET. Nur nach HTTP 401 mit erfolgreichem Transport/TLS und
zwei vorhandenen Variablen folgt Basic Authentication.
GRAVURU_PLESK_USERNAME und GRAVURU_PLESK_PASSWORD werden nur im Prozess
verwendet. Die Authorization-Zeile gelangt über stdin zu curl, nicht in dessen
Kommandoargumente. Keine Ausgabe von Werten, Headern, Antwortinhalten oder
ungefiltertem stderr. Ergebnis ist JSON mit boolescher Verfügbarkeit,
HTTP-/Proxy-/curl-Status und begrenzten Fehlerkategorien.
Beide Werte müssen persönliche Umgebungsvariablen der tatsächlichen Laufzeit
sein. Netzwerk-Secret-Ersetzung auf Port 443 ist nicht der Weg für Port 8443.

Exitcode 0 bedeutet ausschließlich erfolgreicher authentifizierter GET 200.
Exitcode 2 bedeutet offen/fehlgeschlagen, keine Freigabe für Serveränderungen.
Ein tls_verify_result von 0 ohne empfangene HTTP-Antwort belegt keinen
erfolgreichen TLS-Verbindungsaufbau.

## Keine weiteren Einrichtungsschleifen

Bei fehlenden Variablen zunächst angeforderte Schlüssel, persönlichen
Geltungsbereich, source_config_id und veröffentlichte Version der tatsächlichen
Aufgabe abgleichen. Vorhandene Werte nicht unnötig erneut eingeben.

Bei curl 7 zum Proxy keine Plesk-Passwörter zurücksetzen oder Domainfreigaben
auf Verdacht erweitern. Laufzeit-/Proxy-Anbindung untersuchen. Ohne verfügbaren
Reparaturzugang ist das ein konkreter technischer Blocker, keine weitere
Nutzerfreigabe. Keine bestehende Aufgabe löschen oder neue Umgebung anlegen.

Nächster erforderlicher Infrastruktur-Nachweis: In EINER Laufzeit gleichzeitig
beide persönlichen Variablen und funktionierender Proxy; danach lesender
authentifizierter GET 200. Erst dann Plesk-Hostingprüfung.

## Eigener Shopify-App-Prozess bleibt separat

Sichere Bindung von GRAVURU_SHOPIFY_CLIENT_SECRET,
GRAVURU_SHOPIFY_APP_ORIGIN und GRAVURU_PRIVATE_DATA_DIR,
geeignetes geschütztes HTTPS-Testbackend sowie dauerhafte private Ablage
bleiben zu bestätigen. Connector-Anmeldung und eine statische Vorschauseite
ersetzen diese Anforderungen nicht.

## Validierung dieser Ergänzung

Python-Syntaxprüfung bestanden. Ausführung im alten Chat ergab:
beide Plesk-Variablen fehlen; curl 7 vor Authentifizierung;
outcome transport_failed_before_auth. Das ist ein korrekt erkannter Blocker,
kein bestandener Zugangstest. Keine Produkt-/Buildtests wiederholt.
