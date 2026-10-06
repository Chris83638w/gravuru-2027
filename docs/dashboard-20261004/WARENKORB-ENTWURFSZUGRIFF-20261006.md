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
