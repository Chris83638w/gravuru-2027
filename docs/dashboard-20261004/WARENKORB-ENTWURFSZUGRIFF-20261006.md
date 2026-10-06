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
