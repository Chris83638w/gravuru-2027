# Ergänzung: kontrollierter HTTP-Warenkorbanschluss

Stand 06.10.2026, 17:05 UTC; Branch `task/cart-http-gate-20261006`. GitHub-Basis `6b944c1bab2d6219e5a585c3d979bd5eec8bf1b7`, Baum `90e27d980e6d0d4afc9a0198244fb10fa41299a1`. Lokaler gleichwertiger Ausgangscommit `566d9b3126483cae70898b12ea311699c7a26a7e`. Sicherung über GitHub-Connector mit identischem Dateibaum und anschließend geprüftem Remote-Branch; kein Force-Push/Merge.

## Tatsächlich umgesetzt

`POST /api/workshop/draft-cart` verbindet die bereits geprüften privaten Form-/Acrylentwürfe, gespeicherten Angebote, Shoptransport und Wiederholschutz. Der Body enthält ausschließlich `draftId`, `expectedRevision`, `snapshotId`, `offerId`, `offerToken`; begrenzt auf 16 KiB. `X-Gravuru-CSRF` und `X-Gravuru-Draft` sind getrennte erforderliche Berechtigungen. GET löst keine Anlage aus. Der äußere bestehende HTTP-Server prüft weiterhin Host, Origin und Sec-Fetch-Site.

Der neue `cart-http-gate.mjs` prüft vor und nach asynchronen Schritten zusätzlich den aktuellen und festgehaltenen Produktstand: archivierte Produkte und Nicht-Produkte werden abgewiesen, auch für zwischengespeicherte Checkouts. Käuferkontextfehler werden ohne interne Details zurückgegeben. Ein bereits abgebrochener Request sendet nichts. Abbruch während der Übertragung wird an den bestehenden Transport weitergereicht; das Journal verhindert automatische Wiederholung bei unklarem Ergebnis. Es gibt keine automatische Weiterleitung oder Behauptung einer Zahlung.

Die Standardkonstruktion `createWorkshop(...)` übergibt **keine** Storefront-Konfiguration und antwortet an dieser Route mit `503 cart_disabled`. Kein Secret wird automatisch gesucht oder aus Browser-/Chatinhalt übernommen. Eine spätere ausdrücklich bestätigte serverseitige Testanbindung kann das optionale Feld `storefront` verwenden:

- `mode`: exakt `test-only`; diese Angabe ist kein technischer Nachweis, dass ein Shopify-Shop ein Entwicklungsstore ist. Die tatsächliche Shop-/Testfreigabe muss vorher separat geprüft werden.
- `config`: festgelegte `shopDomain`, `apiVersion`, sicher bereitgestelltes `privateToken`; keine Werte im Repository oder Chat. Dieser Vertrag legt keine erfundene Cloud-Secretbindung an.
- `resolveBuyerIp(request)`: explizite serverseitige Funktion aus vertrauenswürdigem Ingress. Kein automatisches Vertrauen in X-Forwarded-For, keine Käufer-IP aus Body/Browserwerten. Ungültige/fehlende Angaben verhindern Versand und Journalreservierung.
- `transportOptions`: nur für interne Tests/Transportkonfiguration; die Tests verwenden synthetisches `fetchImpl`, keine echten Zugänge.

Vorhandene Produktions-/Prüfblocker bleiben bestehen. Die lokale Betreiberoberfläche ist weiterhin keine gehostete Händler- oder Shopify-Kundenkontoauthentifizierung. Im Konfigurator wurde noch kein Kaufbutton aktiviert. Private Entwürfe/Angebote sind keine öffentlich zugänglichen Downloadlinks.

## Tatsächlich ausgeführte Prüfung

- `node app/workshop/cart-http-gate.test.mjs`: 9 neue Prüfungen bestanden. Umfasst standardmäßige Deaktivierung, äußere Host-/Origin-/Fetch-Site-Prüfung, CSRF, privaten Zugriff, Requestgrößenlimit, Manipulationsschutz, synthetischen erfolgreichen POST samt Wiederholung, Käuferkontext, Archivierung vor/während/nach Anfrage sowie Abbruch.
- `node app/workshop/acrylic-draft-http.test.mjs`: 1 bestanden; bestehender privater Acryl-Sicherungsablauf mit echter Fotoprüfung weiter intakt.
- `node app/workshop/draft-cart-handoff.test.mjs`: 13 bestanden.
- `node app/workshop/cart-handoff-journal.test.mjs`: 18 bestanden.
- Insgesamt **41 gezielte Prüfungen, 0 Fehler, 0 Skips**. Build: 76 Ressourcen, 1 Modell. `git diff --check`: bestanden.

Die neuen Tests rufen den echten HTTP-Requestlistener direkt im Prozess mit Readable-/EventEmitter-Testobjekten auf. `server.address()` liefert im Test den festen Port für die Hostprüfung; es wird kein Socket gebunden. Daher keine Behauptung einer funktionierenden externen HTTP-Verbindung oder Browserabnahme. Alle Shopantworten synthetisch; keine echte Warenkorbanlage.

## Aktuelle Laufzeitgrenze und nächster Schritt

Erneuter Listener-Versuch tatsächlich fehlgeschlagen: `listen EPERM` an 127.0.0.1. Laufzeitstatus aktuell (Revision 337), Cloud verbunden, Netzwerk eingeschränkt auf Paketmanager, keine konfigurierten Secrets/Laufzeitvariablen/Identitäten. Die vom Nutzer veröffentlichte andere Konfiguration ist damit nicht als in dieser laufenden Aufgabe angewendet belegt. Keine erneute Einrichtung, kein Secretabruf und keine Serveränderung.

**NICHT AUSGEFÜHRT:** sichtbare Browserabnahme, volle Netzwerk-Testsuite, echte Shopify-Anlage, Deployment. Nächste Integrationshandlung benötigt einen ausführbaren geschützten Vorschauzugriff und die bestätigte sichere Test-App-/Käuferkontextanbindung. Bis dahin keine Freischaltung durch Aufweichen des Hostschutzes, Übernahme von Browsercookies oder Eintragen von Secretwerten in Git. Unabhängige Codearbeit kann weitergehen.

---

Nachfolgende Ergänzungen dokumentieren die vorausgehenden Zwischenstände.

# Ergänzung: private Acrylentwürfe und bestehender Sichern-Button

Stand 06.10.2026, 16:48 UTC; Branch `task/acrylic-private-drafts-20261006`; GitHub-Basis `4fe1cf6b59f22ea25393b7b0d5d8860e74c2339c`, Baum `cb50ecb13c4708c5668c84fe15ed8cdd2335f9ba`. Lokaler Ausgangscommit `f6503655adad9c328dbc17732011133a3f111f35` hat denselben Baum. Die Sicherung erfolgt über den GitHub-Connector mit anschließendem Baum-/Branchabgleich; kein Merge oder Force-Push.

## Umgesetzt

- `acrylic-draft-store.mjs`: private Zugriffsberechtigung (serverseitig nur Tokenhash), dauerhaft gespeicherte Zuordnung zu Produktrevision, Design und aktuellem Prüfstand. Änderungen erzeugen unveränderliche Revisionen; konkurrierendes Speichern mit alter Revision scheitert ohne verwaisten Prüfstand. Aufnahme und Zuordnung laufen in derselben SQLite-Transaktion.
- Bestehende Prüfarchive/Manifeste werden nicht umgeschrieben. Ihre ursprünglichen synthetischen `source.draftId`/`draftRevision` bleiben Archivnachweis; die private Entwurfsidentität und ihre fortlaufende Revision stehen separat in der neuen Zuordnung. Diese Zuordnung ist maßgeblich für den privaten Zugriff. Kein Browser kann einen beliebigen alten Prüfstand für sich beanspruchen: Die Route bereitet das vollständige Paket selbst aus geprüftem Produktstand, Elementrechten und Originalbildern vor.
- `http.mjs`: `POST /api/workshop/acrylic-drafts` mit `{input}`; `GET /api/workshop/acrylic-drafts/{id}` mit privatem Header `X-Gravuru-Draft`; weitere Sicherung per POST auf dieselbe private URL mit `{input, expectedRevision}`. Schreibzugriffe benötigen zusätzlich den bestehenden Werkstatt-CSRF-Header. Nur auf der bestehenden lokalen Betreiberoberfläche; der äußere Server behält seinen Host-/Origin-Schutz. Keine gehostete Händler-/Kundenkontoauthentifizierung behauptet.
- `draft-cart-handoff.mjs`: Acryl und Form verwenden denselben gesicherten Anschluss; bei Acryl wird der authentifizierte aktuelle Prüfstand aus der privaten Zuordnung geprüft. Veraltete Prüfstände und fremde Entwürfe liefern keinen Checkout. Vorhandene Prüfblocker bleiben bestehen; insbesondere werden keine Maschinenfreigaben erfunden.
- `acrylic-draft-client.mjs` und `workshop-review.mjs`: vorhandener Sichern-Button nutzt den privaten Entwurf, zeigt die neue Revision und führt weiterhin zum passenden Prüfstand im Dashboard. Nur ID, Zugriffstoken und Revision liegen in sessionStorage, nie Fotos/Gestaltung oder Token in der URL. Wiederholtes Öffnen im selben Tab verwendet die bestehende Berechtigung. Konflikte überschreiben keine neuere Revision; keine automatische Wiederholung. Bei ausfallendem Browserspeicher wird vor Erstübertragung gestoppt bzw. nach bestätigter Sicherung auf den nur noch seitengültigen Zugriff hingewiesen.

## Tatsächlich geprüft

- `node app/workshop/acrylic-draft-store.test.mjs`: 7 bestanden.
- `node app/workshop/acrylic-draft-http.test.mjs`: 1 integrierter Ablauf bestanden: echte Designvalidierung, Fotoprüfung, private SQLite-Sicherung, Token-/CSRF-Schutz, Revision, Originalarchivvergleich, Angebotsbindung, erhaltene Maschinenblocker und Neustart. Handler direkt mit Request-/Response-Streams aufgerufen, kein Socket und kein Browser.
- `node app/configurator/variant-m/acrylic-draft-client.test.mjs`: 5 bestanden (erster/weiterer Speicherzugriff, getrennte Designs/Produktrevisionen, Konflikt, Speicherausfall, falsche Antworten).
- `node app/workshop/draft-cart-handoff.test.mjs`: 13 bestanden.
- `node app/workshop/cart-handoff-journal.test.mjs`: 18 bestanden.
- `node --test-name-pattern='cart offer|webhook authenticates|paid test lines|variant, price|status updates|status may|cancellation remains|status authentication' app/workshop/order-intake.test.mjs`: 9 ausgewählte Prüfungen bestanden.
- Insgesamt **53 gezielte Prüfungen, 0 Fehler/Skips**, davon 13 neu. `npm run build`: 76 Ressourcen, 1 Modell. `git diff --check`: bestanden.

Ein erster Testlauf scheiterte beim synchronen Erzeugen des synthetischen PNGs mit `spawnSync python3 EPERM`. Die Testfixture verwendet nun dasselbe feste synthetische PNG; die tatsächliche asynchrone Fotoprüfung im Anwendungscode wurde unverändert erfolgreich durchlaufen. Dies ist kein übersprungener Fototest.

## Grenzen / nächste Handlung

Sichtbare Browserprüfung, volle Netzwerk-/HTTP-Suite, Veröffentlichung der Vorschau und echte Shopify-Anlage: **NICHT AUSGEFÜHRT**. Die aktuelle Umgebung bietet kein Browserbedienwerkzeug; die zuvor festgestellte Listenerbeschränkung wird nicht umgangen. Es wurde weder eine Bestandsdatenbank geöffnet noch ein Live-System verändert. Gesicherte Pakete sind in der privaten laufenden Aufgabe; die Cloud-VM ist keine zugesicherte dauerhafte gemeinsame Datenablage. sessionStorage ist keine geräte- oder kontoübergreifende Anmeldung. Historische Prüfstände und der alte Betreiber-Prüfstand-Endpunkt bleiben erhalten.

Nächste konkrete Handlung: den jetzt angeschlossenen Sicherungsablauf sichtbar in der bestehenden geschützten Vorschau prüfen, sobald deren Ausführung verfügbar ist; danach den bereits geprüften Warenkorbanschluss mit vertrauenswürdigem Käuferkontext und sicherer Laufzeit-Appanbindung aktivieren. Maschinenabnahme, echte Testbestellung und kaufgebundener Download bleiben getrennte offene Abnahmen.

---

Nachfolgend der historische Stand vor der Acryl-Ergänzung.

# Warenkorbübergabe aus einem privaten gespeicherten Entwurf

Prüfzeit: 06.10.2026, 16:36 UTC. Aufgabenbranch: `task/cart-draft-access-20261006`.
GitHub-Ausgangscommit: `20f970dbda089f037ed8f35d38fbc69ad27da475`, Baum `0b39c1f513b08ce94fb4162910f9df562b40adaf`.
Der lokale Ausgangscommit `fb0eaceabedbadc79e076a8eda3de9fe3cc53a2d` enthält denselben Baum; die unterschiedlichen Commit-IDs entstehen durch die vorherige Connector-Sicherung. Kein Reset, Merge oder Force-Push.

## Ergebnis

`draft-cart-handoff.mjs` verbindet den bestehenden privaten Entwurfszugriff, die unveränderlichen Prüfstände/Angebote, den Storefront-Transport und das persistente Warenkorbjournal. Es wird kein neues Angebot automatisch erstellt. Der Aufrufer übergibt nur Entwurfs-ID, erwartete Revision, Prüfstand-ID, Angebots-ID und Angebotstoken. Das private Entwurfstoken kommt getrennt aus dem Anfragekontext. Preis, Variante, Menge, Shop und Journal-Zugriffsidentität sind keine vom Browser überschreibbaren Felder.

`order-intake.mjs` löst das bestehende Angebot anhand ID, Tokenhash, Prüfstand und konfiguriertem Shop auf. Abgelaufene oder bereits einer bezahlten Testbestellung zugeordnete Angebote werden abgelehnt. Paket-Hash und Produkt-/Preisbindung müssen weiterhin stimmen. `form-customer-store.mjs` erlaubt dafür eine injizierbare Uhr für deterministische Ablaufprüfungen; der Standard bleibt Date.now.

Der Entwurf wird vor jedem Zugriff authentifiziert. Prüfstand, Design und Produkt müssen exakt zum aktuellen Entwurfsstand gehören und dürfen keine offenen Blocker enthalten. Das gilt ebenfalls für wiederholte Aufrufe und zwischengespeicherte Checkout-Adressen. Nach einer asynchronen Antwort wird erneut geprüft: Änderungen oder eine inzwischen eingetroffene Bestellung unterdrücken die Checkout-Ausgabe. Das Journal bleibt dabei erhalten und verhindert automatisches erneutes Senden. Private Inhalte, Zugangstoken und Rohantworten werden nicht protokolliert. Die Checkout-Adresse bleibt ausschließlich in der privaten Datenbank.

## Tatsächlich ausgeführte Prüfungen

- `node app/workshop/draft-cart-handoff.test.mjs`: 13 bestanden, 0 Fehler, 0 Skips. Echte private temporäre SQLite-Datenbank, kontrollierte synthetische Transportantworten, keine externe Anfrage.
- `node app/workshop/cart-handoff-journal.test.mjs`: 18 bestanden, 0 Fehler, 0 Skips.
- `node --test-name-pattern='cart offer|webhook authenticates|paid test lines|variant, price|status updates|status may|cancellation remains|status authentication' app/workshop/order-intake.test.mjs`: 9 ausgewählte Prüfungen bestanden, 0 Fehler, 0 Skips. Zwei neue Angebotsprüfungen und sieben bestehende Bestell-/Signaturregressionen.
- `npm run build`: 76 geprüfte Ressourcen, 1 Modell.
- `git diff --check`: bestanden.

Damit 40 gezielte Prüfungen, davon 15 neu. Geprüft wurden unter anderem fremde/fehlende Entwurfstoken, fremde Prüfstände, manipulierte Requestfelder, falsche Angebote/Shops, Ablauf genau zur Frist, geänderte Paket-Hashes, Neustart, bereits verbrauchte Angebote sowie Entwurfsänderung/Bestelleingang während der Anfrage. Ein Transportfehler führt weder zu einem neuen Angebot noch zu erneutem Versand.

## Grenzen und nächster Schritt

Dies ist ein serverseitiger Anschluss für gespeicherte Form-Kundenentwürfe, keine neue öffentlich erreichbare Route. Das Entwurfstoken ist eine Zugriffsberechtigung für genau diesen Entwurf, keine Shopify-Kundenkontoauthentifizierung. Acryl-Prüfstände haben bisher einen anderen Sicherungsweg ohne diese persistierte private Entwurfszuordnung; sie werden nicht stillschweigend zugelassen. Diese Zuordnung ist der nächste Code-Schritt, danach der HTTP-/UI-Anschluss. Der künftige Handler muss Host/Origin/CSRF prüfen, den Käuferkontext aus vertrauenswürdigem Ingress ableiten, aktive Produktfreigaben prüfen und eine echte sichere Laufzeit-Appanbindung nutzen. Keine Käufer-IP aus frei übergebenen Browserdaten übernehmen.

Vollständige HTTP-/Browser-Regressionen und echte Shopify-Anlage: **NICHT AUSGEFÜHRT**. Die bisherige Sandbox meldete `listen EPERM` bei HTTP-Testservern; hier wurden gezielt die ohne Listener ausführbaren Prüfungen ausgeführt. Historische 355 Tests sind kein neuer Gesamtnachweis. Oberfläche und veröffentlichte Vorschau wurden nicht verändert. Keine private Bestandsdatenbank geöffnet, keine Produktivbestellung, kein Deployment und kein Merge.
