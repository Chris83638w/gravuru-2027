# Unabhängiger Prüfauftrag für Claude

**Status: vorbereitet, noch nicht durch Claude geprüft.** Der Nutzer hat eine Gegenprüfung des gesamten vorhandenen Gravuru-2027-Projekts angefragt. Claude ist in der ausführenden Codex-Laufzeit weder als Werkzeug noch als CLI verfügbar. Dieses Paket übergibt dafür Quellstand, Anforderungen und Nachweise ohne Serverzugänge. Maßgeblich ist der vollständige Quellcommit in `REVIEW-MANIFEST.json`; neuere Änderungen nicht zurücksetzen.

## Direkt verwendbarer Auftrag

> Prüfe Gravuru 2027 unabhängig anhand des beigefügten Quellpakets. Lies zuerst diesen Auftrag, dann die aktuellen Prüfberichte und Anforderungen. Prüfe Behauptungen gegen Code und konkrete Nachweise. Nicht neu planen, keine Ersatzoberfläche und keine vollständige Fertigmeldung aus Oberflächen oder simulierten Tests ableiten. Unveränderte bestandene Abnahmen nicht pauschal wiederholen; bei einem begründeten Verdacht den kleinsten aussagekräftigen Reproduktionstest ausführen.
>
> Ändere zunächst nichts und greife nicht auf Live-Shop, Plesk oder private Dateien zu. Keine echten Bestellungen, bezahlten Dienste, Deployments oder Sicherheitslockerungen. Suche keine Geheimnisse und fordere keine Schlüssel im Chat an. Berichte zuerst bestätigte Fehler mit Schweregrad, Datei/Zeile, konkretem Fehlerablauf, Auswirkung und kleinstem sinnvollen Korrekturvorschlag. Trenne offene externe Voraussetzungen von implementierten Fehlern und unbewiesenen Annahmen. Nenne am Schluss eindeutig, welche Teile du tatsächlich gelesen oder ausgeführt hast und welche nicht. Du erteilst keine physische Druck- oder vollständige Live-Freigabe.

## Priorität und genaue Gegenstände

1. **Neuer Händlerstart:** `ops/plesk/merchant-*`, `ops/plesk/lock.mjs`, `app/workshop/shopify-admin-test-server.mjs`, `shopify-admin-host.mjs`, `shopify-session.mjs` und `http.mjs`. Prüfe Host-/Proxy-/JWT-/CSRF-Grenzen, verlorene Sperren, konkurrierende Starts, Neustart, Schlüsselwechsel, private Pfade, Dateirechte, unveränderte Operator-Grenzen und unerreichbare/irreführende UI-Aktionen.
2. **Tatsächlicher Shopify-Anschluss:** `shopify-admin-readonly.mjs`, `shopify-variant-preflight.mjs`, `storefront-transport.mjs`, `cart-http-gate.mjs`, Bestellannahme-/Webhook-/Dateifreigabemodule. Prüfe Varianten, ganze Cent, gemeinsame Revision, bestätigte Preisbindung, Wiederholungen/Timeouts, Signaturen, Benutzerbindung, Storno/Erstattung und Kaufbindung von Downloads. Testmodusschalter nicht als Produktionsbereitschaft behandeln.
3. **Erhalt des vorhandenen Shopify-Apps:** `ops/shopify/read-baseline.mjs`, Manifest-/Paketbau und Konfigurationsnachweise. Gesicherte aktive Version `variante-m-embedded-motifs-20260928`, Version-ID `gid://shopify/Version/1146632241153`. Eine aktive Preisfunktion mit `blockOnFailure: true` wurde lesend bestätigt. Erweiterungsquellen sind nicht vollständig vorhanden; kein leeres Deployment, das Erweiterungen entfernt.
4. **Gespeicherte Arbeit und Importe:** Produkt-/Profilrevisionen, Excel-/Ordner-/ZIP-Import, gespeicherte Serien und Ausführungsgruppen. Prüfe Verlust/Duplikate nach Fehlerkorrektur und Wiederaufnahme, konkurrierende Änderungen, Pfadüberschreitung, ZIP-Limits und tatsächlich gesicherte Originaldateien.
5. **Gestaltung, Fotos und Ausgabe:** bestehender Konfigurator, Design-/Motivwerkstatt, Text-/Fotorechte, Entwürfe und Produktionspakete. Vektoren, Kontur-/Weißebenen, Maße, Spiegelung, Originalauflösung und bestellgebundene Reproduzierbarkeit. Technische PDF-Prüfung ist keine RIP-/ICC-/Material-/Maschinenabnahme.
6. **Nachweisqualität:** Prüfe insbesondere selbst erzeugte JWTs, App-Bridge-Mocks, simulierten HTTPS-Eingang, lokale vs. echte Serverprüfungen, ausstehende Varianten-/Testkaufzuordnung und nicht ausgeführte Claude-Prüfung. Vermeide Scheinsicherheit durch Tests, die nur ihre eigene Implementierung nachbauen.

## Grenzen und hilfreiche Nachweise

- Bestehender Testhost: `https://test-2027.gravuru-designwerkstatt.de/werkstatt/`, privat. Keine Zugangsdaten im Paket; nicht darauf zugreifen.
- Aktive Shopify-App zeigt weiterhin auf die bisherige Produktanlage. Neuer Händlerhost ist beim Quellabschluss vorbereitet; ein vorhandener separater Serverbericht bestimmt einen eventuell späteren Installationsstand.
- App-Automation-Token ist sicher hinterlegt und per CLI geprüft; eigene Admin-Leseauthentifizierung ebenfalls nachgewiesen. Das ersetzt keine echte Händler-/Kunden-/Bestellabnahme.
- `read_orders`, komplette Bestellstrecke, sichere Testzahlung und Erweiterungsquellen bleiben offen. Kundenansicht ist am Händlerhost absichtlich noch nicht freigegeben.
- GitHub-Anmeldung der Codex-Laufzeit fehlte zuletzt. Lokaler Commit ist kein behaupteter GitHub-Push.
- Drive-OAuth ist noch nicht eingerichtet, KI-Anbieter/Kosten unentschieden. Keine kostenpflichtigen Aufträge oder automatische externe Datenübertragung autorisiert.
- Das Quellpaket enthält Appcode, zugehörige Tests, Betriebsskripte, Anforderungen und ausgewählte echte Prüfberichte. Keine privaten Serverdateien, Schlüssel, Kundendatenbanken oder Git-Historie. `REVIEW-MANIFEST.json` enthält Dateien und SHA-256-Werte.

## Gewünschtes Ergebnis

Eine priorisierte Liste **bestätigter** Befunde (P0/P1/P2), Reproduktionsschritte und betroffene Dateien/Zeilen; daneben klar bezeichnete Prüflücken und externe Blocker. Falls etwas nicht untersucht wurde, explizit nennen. Keine pauschale Aussage „alles sicher“ und keine Behauptung, lokale oder synthetische Prüfungen seien echte Shopify-/Server-/Druckabnahmen. Codex übernimmt danach die konkrete Fehlerbehebung und gezielte Nachprüfung.
