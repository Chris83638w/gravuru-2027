# Privates Warenkorbjournal – 06.10.2026

## Stand und Zuordnung

Repository Chris83638w/gravuru-2027; Cloud-Aufgabenbranch `task/cart-handoff-journal-20261006`; Ausgangscommit `b8a82328e127901d95dbbc269a9f4c30ec7d2fb1`. Vorhandene Werkstatt, Kundenkonfigurator und Storefront-Transport weiterverwendet. Keine privaten Bestandsdaten geöffnet, keine Shopify-Anfrage zur Warenkorbanlage und keine Veröffentlichung.

Die vorhandene Shopify-App wurde im Verlauf dieser Aufgabe mit dem verbundenen Shopify-Connector lesend bestätigt: **Gravuru Konfigurator**, `gid://shopify/App/423276544001`, Installation `gid://shopify/AppInstallation/941403308412`, Shop `gravuru-design.myshopify.com`. Verwaltungslink: https://dev.shopify.com/dashboard/172197140/apps/423276544001 . Der Cloud-Chatname „Gravuru 2027 – Cloud – Mikail“ bezeichnet keine zweite Shopify-App. Dieser Nachweis ist kein CLI-/Laufzeit-Login oder Shop-Schreibtest.

## Implementierung

`app/workshop/cart-handoff-journal.mjs` ergänzt eine private SQLite-Tabelle. `form-customer-store.mjs` stellt das Journal an derselben bereits geschützten Datenbankverbindung bereit. Der orchestrierende Aufruf bindet Angebot, Shop, API-Version und serverseitig ermittelten Zugriff an den Vorgang. Angebotsreferenz und Zugriff werden nur gehasht gespeichert. Originalfotos, IP, Rohantworten und App-Token gelangen nicht ins Journal. Bestätigte Warenkorb-ID/Checkout-Adresse bleiben in privater Speicherung; diese enthalten private Zugriffsmöglichkeiten und dürfen weder protokolliert noch veröffentlicht werden.

Vor einem möglichen Versand wird der Vorgang atomar reserviert. Zwei Datenbankverbindungen können denselben Angebotsvorgang nicht gleichzeitig senden. Wiederholung eines bestätigten Vorgangs liefert dessen gespeichertes Ergebnis. Unterschiedlicher Zugriff erhält 404; geänderte Menge, Variante, Preis oder API-Version führen zum Konflikt. Unfertige Einträge nach Prozessabbruch bleiben gesperrt, ebenso unklare Ergebnisse und fehlgeschlagene Aufrufe. Es gibt keine automatische Wiederholung und keine ablaufende Lease, die einen zweiten Versand zulässt. Ein Speicherfehler nach Shopantwort verhindert die Weiterleitung; der begonnene Vorgang blockiert weiterhin einen zweiten Versand.

Dies bedeutet **höchstens einen Versandversuch je gespeicherter Angebotsreferenz**, nicht genau eine erfolgreiche Shopify-Operation. Ein begonnenes/unklares Ergebnis braucht manuelle, authentifizierte Prüfung. Eine neue Angebotsreferenz ist ein neuer Vorgang und darf nicht automatisch als Umgehung einer unklaren Übergabe erzeugt werden. Kein Zahlungsnachweis; `paymentConfirmed` bleibt false.

## Tatsächlich ausgeführte Prüfungen

- `node app/workshop/cart-handoff-journal.test.mjs`: **18 bestanden, 0 Fehler, 0 Skips**. Neustart mit Dateidatenbank, zwei unabhängige Verbindungen, unvollständiger Vorgang nach Neustart, fremder Zugriff, geänderte Angebote/API, unklare und sichere Vorversandfehler, fehlgeschlagene Speicherung, ungültige/live Angebote, Eingabefilter, ungültige Ergebnisse, mutierte Aufruferdaten, Kopplung mit echtem Transportmodul und dessen synthetischer HTTP-Antwort, Integration mit privatem Kundenstore. Ausschließlich synthetische Daten/Antworten, keine externen Shopanfragen.
- `node --test-name-pattern='paid test lines|variant, price|status updates|status may|cancellation remains|status authentication' app/workshop/order-intake.test.mjs`: **6 bestehende Bestellprüfungen bestanden**. Nur gezielt ausgewählte Regressionen; kein vollständiger Lauf.
- `npm run build`: **76 Ressourcen, 1 Modell**.
- `git diff --check`: bestanden.

Der zuerst versuchte gemeinsame Lauf von Journal-, Cart- und Transporttests war **nicht erfolgreich**: bestehende HTTP-Testfixtures konnten keinen Loopback-Testserver öffnen (`listen EPERM`, 127.0.0.1). Der direkte Transportlauf bestätigt diese Sandboxursache. Neue Journalprüfungen und ausgewählte Bestellregressionen benötigen keinen Listener und sind separat bestanden. Nicht durch übersprungene Tests oder geänderte Erwartungen kaschiert. Kein neuer Browsernachweis: keine sichtbare UI geändert. Die historischen 355 Tests/Build des Ausgangsstands wurden nicht als aktueller Gesamtlauf ausgegeben.

## Konkreter nächster Anschluss und Grenzen

Der neue Orchestrator ist noch an keinen HTTP-/UI-Endpunkt angeschlossen. Ein Handler muss zuerst echte Authentifizierung, Zugriff auf den gesicherten Entwurf/Prüfstand, Gültigkeit des vorhandenen Angebots, den gebundenen Shop und die vertrauenswürdige Käufer-IP prüfen. `principalId` allein ist keine Authentifizierung und darf nicht aus beliebigen Browserfeldern übernommen werden. Erst dann den konfigurierten Transport und das Journal aufrufen. Kaufgebundene Downloads, Bestellung/Zahlung und echte Produktübertragung bleiben eigene offene Schritte; vorhandene Test-/Download-Sperren erhalten.

Die zuletzt gelesene laufende Cloud-Konfiguration meldet Paketmanagerzugriff; der Nutzer hat das Veröffentlichen der geänderten Umgebung und das Öffnen einer neuen Aufgabe bestätigt. Ein Zugriffstest in dieser neuen Aufgabe ist hier noch nicht vorgelegt. Laptop-Browseranmeldungen werden nicht als Cloud-Identität übernommen. Vom Handy aus dieselbe Aufgabe fortsetzen beziehungsweise den gepushten Aufgabenbranch in der aktualisierten Umgebung verwenden. Private SQLite-Daten und Schlüssel nie in Git/Snapshot; Cloud-VM nicht als dauerhafte gemeinsame Datenablage ausgeben.
