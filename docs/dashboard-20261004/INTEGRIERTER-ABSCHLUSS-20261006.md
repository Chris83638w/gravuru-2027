# Integrierter Arbeitsstand – Anmeldung, Bestellung, Dateizugriff

Stand: 06.10.2026, 17:27 UTC. Repository `Chris83638w/gravuru-2027`, Branch `task/integrated-finish-20261006`, gesicherte GitHub-Basis `548a69e0e4e1e1baeedf3ad03655bbff1b209852`. Der Basisbranch wurde im aktuellen Lauf remote mit `identical` bestätigt. Kein Zurücksetzen auf die frühere Migrationsbasis.

## Zusammenhängend umgesetzt

- Strikte serverseitige Shopify-Sitzungsprüfung: HS256-Signatur, fester Shop und App-Audience, Ablauf-/Ausstellungszeiten, getrennte Händler- und Kundenidentität. Keine Auswahl von Schlüsseln oder Netzwerkzielen aus ungeprüften Tokenfeldern. Fehler enthalten keine Tokenwerte.
- Händleroberflächen verwenden einen gemeinsamen Request-Adapter. Wenn App Bridge vom Host bereitgestellt ist, wird `shopify.idToken()` unmittelbar vor jeder Anfrage aufgerufen. Kein Token in URLs, Browserablagen oder Logs; Weiterleitungen sind gesperrt. Die bestehende lokale Vorschau funktioniert ohne App Bridge weiter.
- Kundenbindung einer Testbestellung ausschließlich aus der signierten Zahlungsnachricht. Nur die Customer-GID wird zusätzlich privat gespeichert, keine E-Mail/Adresse. Historische Positionen bleiben unverändert. Gastbestellungen oder alte ungebundene Bestellungen werden nicht durch spätere Wiederholungsnachrichten einem Kunden zugewiesen.
- Ausdrückliche, widerrufbare Dateifreigabe pro unveränderlicher Bestellposition und abgeschlossenem Ausgabeauftrag. Ausgabe und Bestellung müssen denselben Prüfstand haben. Die Freigabe fixiert den tatsächlichen Datei-SHA. Standard: PDF; separate Weiß-PDF oder ZIP müssen ausdrücklich gewählt werden. Ein ZIP kann private Originalfotos enthalten.
- Kundendateiliste mit Pagination und Download prüfen die angemeldete Customer-GID, den Shop, die aktive Freigabe und den aktuellen gespeicherten Zahlungsstatus. Erstattung, Teilerstattung, Storno, Statuskonflikt und fehlender Statusnachweis sperren den Zugriff. Ein Widerruf übersteht den Neustart. Veränderte Dateibytes werden nicht ausgegeben.
- In der vorhandenen Bestellansicht gibt es den Abschnitt „Dateien im Kundenkonto“ einschließlich Ausgabe-/Formatwahl und Widerruf. Freigabeaktionen bleiben ohne bestätigte Händler-Testanmeldung gesperrt. Verspätete Antworten werden nicht in eine inzwischen andere ausgewählte Bestellung geschrieben.

PDF-Erzeugung, Weiß-Vektoren, Textpfade, Originalbilder und vorhandene Bestellarchive wurden nicht umgerechnet oder ersetzt. Kundenfreigabe ist keine Fertigungsfreigabe.

## Anschlussvertrag, keine bereits veröffentlichte App

`createWorkshop` nimmt optional `shopifySessions` mit den Feldern `mode: 'test-only'`, `shopDomain`, `clientId`, `secret` entgegen. Der geheime Wert kommt ausschließlich aus einer sicheren serverseitigen Bereitstellung. Es gibt keinen neuen Secretwert im Repository und keinen automatischen Zugriff auf Browseranmeldungen. Ungültige Konfiguration schlägt vor Öffnung der Datenbanken fehl.

Bei konfigurierter Sitzungsprüfung benötigen Werkstatt-API-Aufrufe Händler-Bearertoken; schreibende Händleraktionen zusätzlich die bestehende CSRF-Bestätigung. Ausnahmen sind ausschließlich der raw-body-HMAC-geprüfte Webhook und die getrennten Kunden-Dateirouten. Dieser geschlossene Testmodus ist noch keine öffentliche Storefront: Die Kundentwurf-/Katalogrouten müssen für den späteren öffentlichen Betrieb separat angebunden werden. Nicht einfach diese lokale Oberfläche öffentlich öffnen.

| Route unter `/api/workshop` | Vertrag |
|---|---|
| `GET /session` | Händleranmeldung prüfen und CSRF zurückgeben; Scope `shopify-merchant-test` |
| `GET /orders/:position/file-grants` | Händler sieht die Dateifreigaben seiner Shopposition |
| `POST /orders/:position/file-grants` | `{jobId, format?}`; Standard `pdf`; keine Kunden-ID aus dem Browser |
| `POST /file-grants/:grant/revoke` | Leeres JSON, Händler und CSRF; endgültiger Widerruf dieser Freigabe |
| `GET /customer-files?before=…` | Kunden-Bearertoken; maximal 50 Freigaben pro Seite, `nextBefore` fortsetzen, auch wenn eine gefilterte Seite leer ist |
| `POST /customer-files/:grant` | Kunden-Bearertoken, leeres JSON; prüft Eigentum/Status/Datei erneut, `no-store`, Datei als Attachment |

Händler-JWT: `dest=https://<shop>.myshopify.com`, `iss=https://<shop>.myshopify.com/admin`, numerische User-ID als `sub`. Kunden-Erweiterungstoken: Shophostname als `dest`, Customer-GID als `sub`; fehlendes `sub` wird abgewiesen. `aud` muss immer die konfigurierte Client-ID sein. Beide prüfen `exp`, `nbf`, `iat`, `jti` und maximal fünf Minuten Tokenlaufzeit. Gastzugang und alternative Tokenarten werden nicht geraten.

Die App-Bridge-Bootstrap-/Hostkonfiguration, Kundenkonto-Erweiterung, echte Kundenkonto-Berechtigungen und der öffentliche authentifizierte Host sind noch nicht angeschlossen. Die Loopback-Host-/Origin-Regeln und CSP wurden nicht aufgeweicht. Der Standardscriptstart aktiviert keine Shopify-Sitzungen, Kundenfreigaben oder Shop-Schreibzugriffe. Die Webhookannahme bleibt ausdrücklich auf `test: true` begrenzt. Keine reale Zahlung wurde erzeugt oder bestätigt.

Offizielle Grundlagen: [Shopify-Sitzungsprüfung](https://shopify.dev/docs/apps/build/authentication-authorization/legacy/app-bridge-2-setup), [Kundenkonto Session Token API](https://shopify.dev/docs/api/customer-account-ui-extensions/2026-07/target-apis/platform-apis/session-token-api). Zugriff auf geschützte Kundendaten ist für das Kunden-`sub` erforderlich; nicht durch eine Domainfreigabe ersetzt.

## In diesem Lauf tatsächlich geprüft

Die Tests wurden direkt mit `node <Datei>` ausgeführt. `node --test` berichtete in dieser Laufzeit zunächst nur zwei Dateieinträge; diese wurden nicht als vollständige Fallzahl ausgegeben. Anschließend einzelne echte Testfälle geprüft:

| Testdatei unter `app/workshop/` | Ergebnis |
|---|---|
| `shopify-session.test.mjs` | 14 bestanden |
| `customer-downloads.test.mjs` | 17 bestanden, echte SQLite/HTTP-Handler, synthetische Nachrichten und Dateibytes |
| `merchant-request.test.mjs` | 3 bestanden |
| `cart-http-gate.test.mjs` | 9 bestanden |
| `draft-cart-handoff.test.mjs` | 13 bestanden |
| `acrylic-draft-store.test.mjs` | 7 bestanden |
| `acrylic-draft-http.test.mjs` | 1 bestanden, echte Fotoprüfung/Archivierung mit synthetischem Inhalt |
| `export-jobs.test.mjs` | 4 bestanden |
| `output-checks.test.mjs` | 5 bestanden |
| `order-intake.test.mjs` | 9 bestanden; 1 fehlgeschlagen wegen `listen EPERM: operation not permitted 127.0.0.1` |

Gesamt dieser Auswahl: **82 bestanden, 1 durch die Laufzeit gescheitert, 0 Skips**. Kein neuer vollständiger Gesamtsuite-Nachweis. Der versuchte Ausschluss des Sockettests per `--test-name-pattern` griff bei direktem Dateistart nicht; der Fehler bleibt ausdrücklich dokumentiert. Der neue Webhook-/Download-HTTP-Test ruft den echten Server-Requestlistener mit Streams im Prozess auf; er ersetzt keine Netzwerkabnahme.

`npm run build`: **76 verifizierte Ressourcen, 1 Modell**, `editorBytes: 461440`. JavaScript-Syntax der geänderten/neuen Module und `git diff --check` geprüft. Die neue Abschnittsbedienung wurde nicht visuell abgenommen: Standard-Playwright-Browser fehlt; installierter Chromium beendet sich beim Start (`TargetClosedError`). Keine Installation, Sandboxumgehung oder erfundene Vorschau-URL.

## Was für den Gesamtabschluss noch fehlt

**Das Gesamtprojekt ist weiterhin nicht fertig.** Der neue Testpfad ist keine Live-Bestellstrecke. Die noch notwendigen Arbeiten und externen Voraussetzungen dürfen nicht vermischt werden:

1. **App-Anschluss:** sicheren Runtime-Appzugang für die bestehende `Gravuru Konfigurator` (App-ID `423276544001`, Shop `gravuru-design.myshopify.com`) tatsächlich bereitstellen; anschließend App-Bridge-Host, Kundenkonto-Erweiterung, getrennte öffentliche Kundenrouten und reale Testbestellung verbinden und abnehmen. In dieser laufenden Aufgabe ist keine solche Secret-/Identitätsbindung bestätigt. Browserlogin/Connector sind kein Ersatz.
2. **Weiterer Codeumfang:** echte Shopify-Produktübertragung mit Wiederholschutz sowie die vereinbarten Drive-/KI-Anwendungsdienste sind weiterhin nicht implementiert. Pluginverfügbarkeit darf nicht als fertige Dashboardfunktion ausgegeben werden. Die vorhandenen Produkt-/Variantenpläne und Preise bleiben Grundlage.
3. **Abnahmen/Material:** sichtbarer neuer UI-Ablauf, vollständige ursprüngliche Designserie sowie dokumentierte Corel-/Mimaki-Proben und Maschinen-/ICC-Vorgaben. Keine alten Ergebnisse als neue Prüfung. Bekannte Referenzarchive bleiben im bisherigen Abschlussabgleich dokumentiert.
4. **Betrieb:** dauerhafte private Daten-/Dateiablage, deren Wiederherstellung und Zugriff für beide Konten noch bestätigen. Diese Cloud-VM ist keine zugesicherte dauerhafte gemeinsame Datenbank.

Nächster ausführbarer Integrationsschritt: vorhandene App mit sicherem Runtime-Appzugang an den nun geprüften Testvertrag anbinden; zuvor den tatsächlich verfügbaren Zugang bestätigen, keine Passwörter im Chat anfordern. Der UI- und Shopanschluss benötigt danach noch Codearbeit. Keine neue Umgebung, kein neuer Serverplan, keine Liveveröffentlichung oder Merge durchgeführt.
