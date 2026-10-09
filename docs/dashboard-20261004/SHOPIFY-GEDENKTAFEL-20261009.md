# Gedenktafel ausgewählt; Shopify-Release weiterhin blockiert

Stand 09.10.2026, Fortsetzung auf `8f015c58357cd4772f4abf7a2dd66717bb91d255`. Nutzerauftrag „veröffentliche nun alles“, Produktentscheidung „such dir einen aus eine gedenktafel“. Die Veröffentlichungsfreigabe gilt. Keine neue App, keine kostenpflichtige Bestellung, keine Produktionsauslösung oder Datenbank-Ersetzung.

## Tatsächliche Auswahl und Preisprüfung

**Gedenktafel aus Schiefer mit Foto**, für Menschen, **220 × 140 mm**. Shopify-Produkt `gid://shopify/Product/16138083107196`, Handle `gedenktafel-fuer-menschen-220x140`. Auswahlgrund: passende Gedenktafel, eindeutige Material-/Maßangaben und vollständige vorhandene Befestigungsvarianten. Andere Suchtreffer hatten Testbeschreibungen oder widersprüchliche Material-/Formatangaben und wurden nicht gewählt.

Eigener App-Prozess auf Plesk, Client-Credentials-Anmeldung und lesende Admin GraphQL `2026-07`, HTTP 200, App-/Shopidentität geprüft. Zugangsdaten bleiben auf dem Server und wurden nicht ausgegeben. Die App-Metafelder `gravuru_workbench.manifest` und `$app:personalization` beziehen sich auf den vorhandenen Produktstand **Revision 30**. Neun eindeutige Zuordnungen, ganze Cent und EUR stimmen überein:

| Befestigung | Shopify-Varianten-ID | Preis |
| --- | --- | ---: |
| Ohne Befestigung | 57509812633980 | 22,99 € |
| Zwei Bohrungen | 57509812666748 | 25,98 € |
| Vier Bohrungen | 57509812699516 | 26,98 € |
| Zwei Bohrungen mit Abstandshaltern · Silber | 57509812732284 | 31,97 € |
| Zwei Bohrungen mit Abstandshaltern · Schwarz | 57509812765052 | 32,97 € |
| Vier Bohrungen mit Abstandshaltern · Silber | 57509812797820 | 36,97 € |
| Acrylglasständer klar | 57509812830588 | 35,98 € |
| Acrylglasständer schwarz | 57509812863356 | 37,98 € |
| Silikon | 57509812896124 | 27,98 € |

Vorhandene Aufpreise: **169 Cent je zusätzlichem Motiv**, **999 Cent je zusätzlichem Foto**. Der Abgleich bestätigt die bestehenden Metafelddaten; er bestätigt noch keinen tatsächlich berechneten Checkout. Die Bohrbilder und der Designquellhash bleiben im [Auswahlnachweis](shopify-memorial-20261009/selection.json) erhalten. `ops/shopify/memorial-selection.mjs` vergleicht die vorhandenen Datensätze, ohne eine neue Preisberechnung, Produktrevision oder Bindung zu erfinden.

Shopify meldet `ACTIVE`, aber `onlineStoreUrl: null`. Der echte öffentliche HTTPS-Aufruf der Produktadresse antwortet **404**. [Leseprüfung](shopify-memorial-20261009/public-product-read.json). Das Produkt ist damit nicht als funktionierende Verkaufsseite abgenommen. Keine Produkt-/Preis-/Metafeldmutation ausgeführt.

## Tatsächlicher Versionsversuch

Alle sieben aktiven App-Module wurden privat mit vollständiger Konfiguration gesichert, einschließlich `gravuru-storefront`, `gravuru-personalization-price`, Scopes und Webhooks. Die vorgeschlagene Änderung betraf ausschließlich:

- vorher: `https://gravuru-designwerkstatt.de/produktanlage.html`
- nachher: `https://app-2027.gravuru-designwerkstatt.de/werkstatt/`

Der CLI-Client 4.9.0 wurde für einen **nicht freizugebenden Kandidaten** aufgerufen (`skipPublish: true`). Shopify hat die Anlage abgewiesen: `Only assets, blocks, snippets, locales directories are allowed` und `Wasm file is not present`. [Originale Validierungsfehler ohne Geheimnisse](shopify-memorial-20261009/candidate-rejected.json). Aus den gespeicherten Konfigurationen und Hashes allein lässt sich kein gültiges vollständiges Erweiterungsbundle herstellen. Kein erneuter Versuch mit weggelassenen Erweiterungen.

Anschließend tatsächlich bestätigt: **keine Kandidatenversion vorhanden**, aktive Version weiterhin `gid://shopify/Version/1146632241153`, Tag `variante-m-embedded-motifs-20260928`, Release `gid://shopify/Release/1137137745921`; **alle sieben Module unverändert**. [Abschlussabruf](shopify-memorial-20261009/active-release-after-attempt.json). Es wurde kein Release ausgeführt.

Fünf eingebettete Theme-Dateien (Blocks/Snippet/Locales) konnten privat wiedergewonnen werden. Von 14 externen Assets ist eine Schriftlizenzdatei lokal bytegleich nach SHA-256 und Länge vorhanden. In der gezielt nach den jetzt bekannten Assetnamen untersuchten alten Serveranwendung wurden keine exakten Treffer gefunden; Quellen wurden nicht verändert. Die sechs vorhandenen Referenzarchive enthalten keine passende vollständige Theme-/Function-Erweiterung oder WASM-Datei. [Serverinventur](shopify-memorial-20261009/theme-server-recovery.json), [lokaler Hashabgleich](shopify-memorial-20261009/theme-local-recovery.json), [Archivinventur](shopify-memorial-20261009/reference-archive-inventory.json). Das ist eine Teilsicherung, kein wiederherstellbares vollständiges Erweiterungsprojekt.

## Noch notwendiger Anschluss

1. **Originales Erweiterungsprojekt bereitstellen:** Quellen/Build-Anleitung der vorhandenen `gravuru-storefront` und `gravuru-personalization-price` einschließlich reproduzierbarem WASM-Build beziehungsweise verifiziertem passenden Build-Artefakt. Als nächste zugängliche Quelle kommt das bisherige Repository `Chris83638w/gravuru-shopify` infrage; sein aktueller Inhalt ist hier mangels GitHub-Authentifizierung nicht geprüft. Die GitHub-Verbindung der Cloud muss dafür wieder autorisiert werden. Kein weiterer Shopify-Token nötig, keine Geheimnisse im Chat.
2. **Schieferprodukt in der neuen Anwendung übernehmen:** Die separate Händlerdatenbank enthält lesend bestätigt nur den unveröffentlichten Acryl-Master 150 × 200 mm. Der native Produktadapter akzeptiert diesen Acrylpiloten; das freie Formmodell besitzt bisher keine neun Befestigungsvarianten mit unterschiedlichen Bohrbildern. Vorhandene Schiefer-Geometrie, Designquelle und Rechte müssen in einen passenden versionierten Produktadapter übernommen werden. Keine Umdeutung zu Acryl, kein Verlust der Befestigungen und kein Zurückspielen der alten Datenbank.
3. Danach Händleranmeldung, Kundeneditor/Warenkorb, serverseitige Aufpreise, Bestell-Webhooks und kaufgebundene Freigabe gezielt verbinden und prüfen. `read_orders` sowie ein bestätigter Testzahlungsweg ohne Belastung/Produktionsauslösung fehlen weiterhin. Der frühere Checkout-Fehler ist noch nicht ursächlich geklärt. Der Shop ist reguläres Plus, kein bestätigter Entwicklungsstore.

## Prüfungen und Sicherung

**6 neue lokale Tests bestanden:** drei für unveränderte Erweiterungsidentitäten/-konfigurationen und gezielte App-URL-Änderung; drei für eindeutige Gedenktafelzuordnung sowie Ablehnung abweichender Revisionen, Preise, Währungen, Varianten und unvollständiger Listen. Die Auswahlprüfung wurde außerdem mit den tatsächlich gelesenen Shopdaten erfolgreich ausgeführt. Syntax und Diff geprüft. Keine unveränderte Browser-/Import-/Druckabnahme wiederholt; keine neue Oberfläche oder Weblaufzeit installiert.

Native GitHub-HTTPS-Anmeldung fehlt auch in Cloud-Revision 78 (`git ls-remote`: Exit 128, keine Anmeldedaten). Neue Quellen/Nachweise lokal committieren und zusätzlich privat auf Plesk sichern; nicht als auf GitHub veröffentlicht ausweisen. Das installierte Händlerpaket bleibt auf Quelle `5884f3e5becbb3226691fd0dc98beb5d8440306e`. Claude ist weiterhin nicht ausgeführt. Physische Druckabnahme, Drive-OAuth und KI-Anbieter/Kostenfreigabe bleiben getrennt offen.
