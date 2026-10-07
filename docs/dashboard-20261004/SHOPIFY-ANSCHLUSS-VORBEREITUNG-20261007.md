# Vorbereitung des echten Shopify-Anschlusses

07.10.2026, vorhandene Cloud-Instanz, Ausgangscommit `0202493f715d53316eb893e94fb672c4ac8eeb04`. Keine Wiederholung der bestandenen Browser-/Fachtests. Keine App-, Server- oder Site-Veröffentlichung.

## Vorhandenes HTTPS-Hosting

| Anschluss | Belegter Stand | Für die neue App |
|---|---|---|
| `https://gravuru-designwerkstatt.de` | Bestehende Werkstatt auf Plesk; Hosting vom Nutzer erneut bestätigt. | Live-Adresse unverändert. Keine separate Test-Subdomain bestätigt. |
| `https://gravuru-design-test-mika.gravur4you-cy.chatgpt.site` | Historische private Site „Muster Acrylglasbild“, Version 12; heute HTTPS erreichbar, anonyme Anfrage erhält 401. Nachweis `DASHBOARD-SICHTPRUEFUNG-20261006.md`. | Statischer Konfigurator, kein laufendes Werkstatt-Backend. Kein belegtes Reverse-Proxy-/Node-Hosting für den neuen Teststart. Site unverändert. |
| Vorhandene Codex-Cloud | Loopback funktioniert laut abgeschlossener Browserabnahme. Keine eingehende HTTPS-/Preview-/Portfreigabe in den verfügbaren Werkzeugen. | Port 8962 allein ist kein von Shopify erreichbarer HTTPS-Origin. |

Die Umgebung meldet keine Secrets, Laufzeitvariablen oder ausgehenden Identitäten; kein authentifizierter Plesk-Connector oder bestehende Plesk-Sitzung ist hier verfügbar. Die Plesk-Domain-/Node-/SSL-Konfiguration konnte deshalb nicht authentifiziert gelesen werden. Der Nutzer bestätigt: Eine vorhandene Test-Subdomain ist bisher nicht bekannt. Keine Subdomain erraten, angelegt oder als verfügbar ausgegeben.

Nächster Hosting-Schritt ist ausschließlich lesend in der vorhandenen Plesk-Anmeldung: **Websites & Domains** auf eine vorhandene getrennte Testdomain prüfen; für diese Domain **Node.js**, Anwendungs-/Dokumentenstamm und **SSL/TLS-Zertifikat** ansehen. Es muss eine separate Node-Anwendung mit privater Ablage und passendem HTTPS-Host möglich sein. Ohne passenden vorhandenen Anschluss bleibt die Adresse offen. Keinen Eintrag der laufenden Werkstatt verändern. Ein Pfad unter der Live-Adresse ist kein vorbereiteter Ersatz: Die App verwendet absolute `/werkstatt/`, `/api/workshop/` und Ressourcenpfade.

## Private Testablage vorbereitet

`/workspace/gravuru-private/shopify-admin-test-20261007`

- Eltern- und Testverzeichnis Modus `0700`, Eigentümer aktueller Laufzeitbenutzer, kein Symlink, außerhalb des Repositorys.
- Schreib-/fsync-Probe mit Datei `0600` erfolgreich; Probe anschließend entfernt. Verzeichnis leer, keine Datenbanken oder Schlüssel angelegt.
- Keine privaten Bestandsdaten geöffnet oder ersetzt. Fortbestand in dieser Instanz möglich; dauerhafte Ablage über neue Aufgaben/Hosting hinweg nicht bestätigt.
- Pfad nur für den Teststart als `GRAVURU_PRIVATE_DATA_DIR` übergeben; keine globale Runtime-Bindung gesetzt. Bei späterem Plesk-Hosting einen dortigen separaten privaten Pfad bestätigen; dieser Cloud-Pfad ist keine Plesk-Ablage.

Neu ausgeführter Anschlusscheck, ohne Build/Listener/Shopkontakt:

```sh
GRAVURU_PRIVATE_DATA_DIR=/workspace/gravuru-private/shopify-admin-test-20261007 npm run shopify:check
```

Ergebnis: `missing_fields` mit ausschließlich `GRAVURU_SHOPIFY_CLIENT_SECRET` und `GRAVURU_SHOPIFY_APP_ORIGIN`. Keine echte Anmeldung, kein Produktionsstart.

## App-Secret sicher hinterlegen

Die bestehende App bleibt **Gravuru Konfigurator**, App-ID `423276544001`, Shop `gravuru-design.myshopify.com`. Das Secret muss als direkte Prozessvariable für die lokale Signaturprüfung bereitstehen. Ein ausgehendes Netzwerk-Secret liefert nur einen Platzhalter und eignet sich dafür nicht.

Offizieller Bedienweg für einen persönlichen Wert in Codex Cloud:

1. **Einstellungen → Codex Cloud → Personal vault / Persönlicher Tresor → Add / Hinzufügen**.
2. Typ **Environment variable / Umgebungsvariable**; Schlüssel exakt `GRAVURU_SHOPIFY_CLIENT_SECRET`.
3. Das bestehende Client-Secret ausschließlich im geschützten Wertefeld einfügen; **Applies to → Selected environments → gravuru-2027**, dann **Save / Speichern**. Keine Rotation des bestehenden Secrets veranlassen.
4. Die vorhandene Umgebung muss diesen Schlüssel ausdrücklich anfordern: **Einstellungen → Codex Cloud → Environments → gravuru-2027 → Edit → Environment variables → Manage**. Nur die Anforderung ergänzen, keine Schlüssel in Skripte, Git oder Veröffentlichungs-Snapshots schreiben. Ein Tresoreintrag allein wird nicht automatisch an die Aufgabe geliefert.

Der Versuch, nur diese direkte Variablenanforderung ohne Wert vorzubereiten, wurde vom Konfigurationsdienst mit **`draft_not_editable`** abgewiesen. Erneutes Lesen lieferte denselben alten Entwurf (Revision 1, abweichende Basisversion, Repositoryvorgabe `main`, keine Runtime-Anforderungen). **Speicherung nicht bestätigt; nichts angewendet oder veröffentlicht.** Den alten Entwurf nicht ungeprüft veröffentlichen. Die wertfreie vorgeschlagene Ergänzung liegt in [shopify-secret-requirement.proposed.json](shopify-secret-requirement.proposed.json). Nach Bearbeitung der bestehenden Umgebung ihre wirksame Bereitstellung in dieser Aufgabe erneut nur anhand der Metadaten prüfen; keine neue Aufgabe/Umgebung automatisch anlegen.

Der Tresorweg liefert das Secret an Codex Cloud, nicht automatisch an Plesk. Bei Wahl eines Plesk-Testhosts muss der Wert stattdessen sicher direkt an genau dessen getrennten Testprozess gebunden werden. Dies erst nach Bestätigung dieses Hosts; nicht an die laufende Werkstatt binden oder deren Konfiguration ändern.

Quellen am 07.10.2026 gezielt gelesen: [Cloud-Umgebungsvariablen und persönliche Werte](https://learn.chatgpt.com/docs/environments/cloud-environments#configure-environment-variables-and-network-secrets), [Shopify ID-/Session-Token](https://shopify.dev/docs/apps/build/authentication-authorization/session-tokens). Keine Änderung der vorhandenen Authentifizierungsimplementierung.

**Verbleibend:** authentifizierte lesende Plesk-Prüfung bzw. Bestätigung einer vorhandenen separaten HTTPS-Adresse, direkte Secret-Bindung und tatsächliche Bereitstellung. Erst danach kann der echte Händlerstart vorbereitet werden. Die spätere Bestell-/Webhook-Anbindung ist dadurch noch nicht aktiviert.
