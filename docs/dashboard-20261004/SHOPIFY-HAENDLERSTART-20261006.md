# Vorbereiteter Shopify-Händlerstart

Stand 06.10.2026, 18:01 UTC. Branch `task/shopify-admin-bootstrap-20261006`, Repository `Chris83638w/gravuru-2027`, bestätigte Remote-Basis `a4ccb954cfe3d35bac680a6d3cca2d81adc5dabf`. Cloud-Laufzeit aktuell: verbunden/laufend, beobachtete Revision 343, eingeschränkte Paketmanager-Netzfreigaben, keine konfigurierten Secrets, Laufzeitvariablen oder ausgehenden Identitäten. Keine lokale Laptopausführung.

## Code und Schutzgrenzen

`createPreviewServer` nimmt zusätzlich optional `embeddedApp` entgegen. Der neue Modus `embedded-test` akzeptiert nur einen konfigurierten HTTPS-Origin sowie festen Shop und öffentliche Client-ID; diese müssen zur vorhandenen Händler-Sitzungsprüfung der Werkstatt passen. Ohne diese Bindung scheitert der Start. Die Sitzungskomponente gibt hierfür nur Shop/Client-ID/Modus frei, niemals den Schlüssel.

Alle Werkstatt-HTML-Seiten erhalten die öffentliche `shopify-api-key`-Metainformation und das aktuelle offizielle CDN-Skript vor den eigenen Modulen. Die bestehenden Händler-Requests holen weiter unmittelbar vor jeder Anfrage ein frisches App-Bridge-Token. Wenn App Bridge in diesem Modus fehlt, wird mit verständlichem Fehler abgebrochen. Die automatische App-Bridge-Fetch-Erweiterung ist deaktiviert, damit der eigene geprüfte Requestadapter die Übertragung kontrolliert. Keine Token in URL oder Browserablage.

Die CSP erlaubt als Frame-Eltern ausschließlich den konfigurierten Shop und `admin.shopify.com`; keine Wildcard für fremde Shops. Script-Ausführung benötigt eigene Dateien oder das feste App-Bridge-Skript; kein neues `unsafe-eval`/Inline-JavaScript. Referrer werden nicht weitergegeben. Shop-/Host-URL-Parameter und `X-Forwarded-*` wählen keine Trust-Ziele. Fremde Hosts bleiben gesperrt. Cross-Site-Navigation ist nur für Händler-HTML-Dokumente erlaubt, nicht für API, Skripte oder Schreibzugriffe. Händler-JWT und CSRF bleiben erforderlich.

Private Excel-/Dateilinks werden im eingebetteten Modus mit `merchantRequest` abgerufen und als Blob heruntergeladen. Damit geht bei einem normalen Linkklick die Händleranmeldung nicht verloren. Fehlerantworten werden nicht als Datei gespeichert; Server-Fehlertexte und Token werden nicht ausgegeben. Originalbytes bleiben erhalten.

Der neue Hostmodus liefert ausschließlich Händlerseiten, deren statische Abhängigkeiten und die bereits geschützten Werkstatt-API-Routen. Root-Konfigurator, Modelle und öffentliche Kundeneditoren werden nicht dabei mitfreigegeben. Die API-Ausnahmen für signierte Testwebhooks und separat signierte Kunden-Dateitoken bleiben wie bisher. Der normale Loopback-Start hat weiterhin seine bisherigen Host-/CSP-Regeln und aktiviert keinen Shopify-Anschluss.

## Genau benötigte Anschlussfelder

Dies sind **Programmierschnittstellen im Code**, keine Behauptung bereits vorhandener Secretfelder oder eines fertig veröffentlichten Hostings:

| Feld | Zweck / Bereitstellung |
|---|---|
| `shopifySessions.shopDomain` und `embeddedApp.shopDomain` | Bestätigter Shop: `gravuru-design.myshopify.com` |
| `shopifySessions.clientId` und `embeddedApp.clientId` | Öffentliche Client-ID der bestehenden App **Gravuru Konfigurator**; nicht die numerische Dashboard-App-ID `423276544001` |
| `shopifySessions.secret` | App-Client-Schlüssel, ausschließlich sichere serverseitige Bereitstellung; direkte Prozessverfügbarkeit für HMAC-Prüfung nötig, kein HTTPS-Platzhalter |
| `embeddedApp.origin` | Bestätigter HTTPS-Origin der neuen Testoberfläche, ohne Pfad/abschließenden Slash; noch nicht zugewiesen |
| `shopifySessions.mode` / `embeddedApp.mode` | `test-only` / `embedded-test` |
| optional `shopDrafts.config.accessToken` | Gültiger Admin-API-Zugriff derselben App auf diesen Shop für die Entwurfsübertragung; `read_products`, `write_products`; kein Session-JWT als Ersatz |

Die Anwendung wird auf dem bestätigten Origin unter `/werkstatt/` geöffnet. Der serverseitige Einstieg muss die sicheren Werte ausdrücklich an `createWorkshop` und `createPreviewServer` übergeben. `npm start` liest diese Werte nicht automatisch ein. HTTPS-Terminierung, tatsächlicher Hostzugang und Änderung der Shopify-App-URL sind hier weder eingerichtet noch ausgeführt. Die bestehende App-URL `https://gravuru-designwerkstatt.de/produktanlage.html` wurde nicht umgebogen oder als Host dieser neuen Fassung ausgegeben. Keine neuen Infrastrukturentscheidungen werden daraus abgeleitet.

Keinen Schlüssel in Chat, Git oder Befehlsargumenten bereitstellen. Ein vorhandener Browserlogin verleiht diesem Prozess keinen Admin-Token. Für die aktuelle Codearbeit ist kein Nutzerklick erforderlich; die sichere Bereitstellung samt bestätigter Zieladresse wird vor dem realen Integrationstest konkret benötigt. Die vorübergehende allgemeine Domainfreigabe anschließend wieder einschränken.

## Tatsächlich geprüfte Fälle

Direkte Läufe mit `node app/workshop/<Datei>`:

| Datei | Bestanden |
|---|---:|
| `shopify-admin-host.test.mjs` | 10 |
| `merchant-request.test.mjs` | 3 |
| `shopify-session.test.mjs` | 14 |
| `customer-downloads.test.mjs` | 17 |
| `cart-http-gate.test.mjs` | 9 |
| `shop-draft-transfer.test.mjs` | 22 |

**75 bestanden, 0 Fehler/Skips.** Neues Hostverhalten, alle wichtigen Händlerseiten, manipulierte Ziele/Parameter/Proxy-Header, API-/CSRF-Grenzen, fehlende App Bridge, HEAD/Bytezahl, private XLSX-Originalbytes und unveränderte lokale Vorschau geprüft. Echte SQLite/Requesthandler, synthetische signierte Sitzungstoken und HTTP-Nachrichten im Prozess. Kein laufender HTTPS-Listener und keine tatsächliche App-Bridge-Interaktion im Shopify-Browser.

Build **76 Ressourcen, 1 Modell**, `editorBytes: 461440`; Syntax und `git diff --check` erfolgreich. Kein erneuter voller Gesamtsuite-Nachweis. Keine Installation, Veröffentlichung, Storemutation oder PR/Merge.

## Noch notwendige Codearbeit und Abnahme

Der Händler-Bootstrap ist vorbereitet, nicht vollständig im echten Shop abgenommen. Insbesondere direkt über `img`/SVG-Unterressourcen geladene private Vorschauen benötigen noch einen authentifizierten Medienadapter; ein normaler Bildabruf kann keinen Bearertoken anhängen. Öffentliche Kundenrouten, Kundenkonto-Erweiterung und die vollständige Bestell-/Preisstrecke bleiben getrennte offene Arbeiten. Ebenso Produktmedienübertragung, Aktualisierung bestehender Shopify-Produkte, Drive-/KI-Anwendungsdienste und reale Maschinen-/ICC-Abnahme. Die temporäre Cloud-VM ist keine bestätigte dauerhafte gemeinsame private Betriebsablage.

Nächster ausführbarer Codeschritt: authentifizierte private Vorschaubilder im bestehenden Händlerdashboard anschließen, ohne sie öffentlich zu machen. Danach die gesamte Händleroberfläche mit der sicher angebundenen bestehenden App visuell testen.

Offiziell abgeglichen: https://shopify.dev/docs/api/app-bridge/migration-guide und https://shopify.dev/docs/apps/build/security/set-up-iframe-protection . Die offizielle Dokumentation hat Vorrang vor vereinfachten Skill-Beispielen; die vorhandene echte HMAC-Signaturprüfung wurde nicht durch bloßes JWT-Decoding ersetzt.
