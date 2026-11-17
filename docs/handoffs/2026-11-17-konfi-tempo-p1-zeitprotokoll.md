# P1 · Schritt 1: Zeitprotokoll für die Warenkorbstrecke

17.11.2026 · Astra (Codex) · Auftrag [#254](https://github.com/Chris83638w/gravuru-2027/issues/254), einschließlich [Zielbild-Kommentar](https://github.com/Chris83638w/gravuru-2027/issues/254#issuecomment-6947690091).

Basis exakt `be163c5d598dfe1c680b483adee645d63a3bdc26`, Branch `dev/claude-warenkorb-v4-20261116`. Implementierung `2d133af0ca0f7a7ef71fd9a1a3e010ffd3f81bed`, eigener P1-Branch `dev/astra-konfi-tempo-p1-20261117`. Kein Merge und kein Deployment. Der P1-PR bleibt Entwurf für die weitere Arbeit an V2/V3; Schritt 1 ist lokal geprüft.

## Umfang und fachliche Quellen

- Messung vor Umbau: #254, P1.1. Dieser Stand fügt ausschließlich Diagnose hinzu; kein Vorziehen oder Zusammenlegen der Warenkorbschritte.
- Oberfläche und Bedienung unverändert: #254, Chris 10.11. und Zielbild vom 17.11. Keine Dateien unter `app/workshop/ui/` oder `app/configurator/variant-m/` geändert.
- Preise, Prüfungen, Bindungen, unveränderliche Bestellstände bleiben: #254 und `AGENTS.md`. Kein neuer Preis, Grenzwert, Pflichtfeld, Freigabe- oder Sperrvertrag.
- Kein Live-Gang ohne Chris' „live“: #254. Eine echte Servermessung dieses Codes ist noch offen.
- Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich; dieses Paket bearbeitet keine Designs.

Der abgeglichene Ausgangsstand enthält bereits den WebP-Upload sowie den Checkout-Bildstart beim `theme-cart`-POST (siehe STATUS 16.11., V2/V3). Das ersetzt nicht die neuen Ziele „direkt nach der Entwurfssicherung“ und „vor dem letzten Klick“. Diese weiteren Änderungen folgen erst nach Auswertung der Messung.

## Messpunkte und Auswertung

Für `acrylic-drafts` (Erstellen und Fortschreiben), `theme-cart`, `cart/data` und `cart/claim` wird je Antwort ein JSON-Ereignis `shop_cart_timing`, Version 1, über den vorhandenen Logger geschrieben. Standard ist eine JSON-Zeile auf stderr. Die Antwort liefert zusätzlich `Server-Timing` und `X-Gravuru-Timing-Id`; die ID entspricht `traceId` im Log. Es sind keine neuen Browserprogramme oder Anfrageköpfe nötig.

| Bereich | Messpunkte |
| --- | --- |
| Alle vier Anfragen | Gesamtzeit bis vor Log-/Antwortausgabe, Sitzungs-/Bindungsprüfung, Antwort-Serialisierung, Antwortbytes |
| Entwurf sichern | Body lesen und JSON parsen, Produkt lesen, Modell bilden, Gestaltungs-/Preisprüfung, feste Quellen, Foto-/Logo-Prüfung, WebP/PNG-Kundenvorschau, Referenzvorschau, ZIPs, Datenbank-Sicherung |
| Warenkorbübergabe | Entwurf/Prüfstand lesen, Variantenkandidaten und Registry prüfen, Angebot prüfen/erstellen, Prüfstandpaket lesen/verifizieren, Warenkorbrevision zuordnen, Bildadresse bilden |
| `cart/data` | Proxyprüfung, obige Vorbereitung, Restwartezeit auf Checkout-Bild, erneute Prüfung nach dem Warten |
| `cart/claim` | Proxyprüfung, obige Vorbereitung, Claim mit erneuter Prüfung |
| Hintergrundbild | Eigener Datensatz `route: checkout-image`: Zugangstoken, Shopify-Dateisuche, Dateianlage, Poll-Pausen und Poll-Anfragen |

Die Hintergrundarbeit hat eine eigene `traceId` und `parentTraceId` zur auslösenden Anfrage. Fertiger Bildcache und Wiederverwendung eines laufenden Auftrags werden als Zähler erfasst. Ein beim `theme-cart` gestarteter Auftrag wird auch nach dessen Antwort weiter gemessen. Die folgende `cart/data`-Antwort zeigt nur ihre tatsächlich verbleibende Wartezeit.

`totalMs` und `durationMs` sind monotone Laufzeiten in Millisekunden; `startedAt` ist UTC. `calls` und `failures` zählen Aufrufe und Ausnahmen je Abschnitt. Die gleiche Abschnittsbezeichnung wird innerhalb einer Anfrage zusammengezählt, z. B. zwei Sitzungsprüfungen. **Verschachtelte Abschnitte nicht addieren:** `review_prepare` enthält unter anderem Bildprüfung und ZIP; `cart_prepare` enthält `bound_offer` und `review_package`. Auch Hintergrundlaufzeit und `checkout_image_wait` überlappen. Status 0 bezeichnet einen beendeten Handler ohne JSON-Antwort, etwa einen Verbindungsabbruch; er ist kein gesendeter HTTP-Status.

`request_bytes` zählt tatsächlich gelesene Bodybytes, nicht HTTP-/TLS-Overhead. `response_bytes` zählt die JSON-Antwort ohne Kopfzeilen. Bei Ablehnung vor dem Einlesen gibt es keinen Bodyzähler. Fehlerantworten werden ebenfalls gemessen. Ausnahmen oder abgewiesene Promises des Loggers ändern die Warenkorbfunktion nicht.

Keine URLs, Querystrings, Sitzungs-/Entwurfstoken, Kunden-/Produkt-/Entwurfs-IDs, Texte, Bildinhalte oder Fehlermeldungen im Diagnoseereignis. Die zufällige Diagnose-ID gewährt keinen Zugriff auf den Entwurf. Bestehende private Antwort-/Cache-Regeln bleiben erhalten. Es wird kein `Timing-Allow-Origin` ergänzt. Falls Shopify Proxy-Diagnoseköpfe nicht durchreicht, bleibt das Serverlog die Quelle; die Weitergabe wurde noch nicht live geprüft.

Die Messung beginnt am Eintritt in den Node-Handler. Vorgelagerte Hosting-/Proxy-Warteschlangen, Netzwerk, Browser-Rendering, `/cart/add.js` und die anschließende Warenkorbprüfung sind nicht Teil von `totalMs`. Große TTFB bei kleiner Handlerzeit ist deshalb ein Befund zur weiteren Untersuchung, kein Beleg für einen benötigten größeren Server. Implementiert mit den [Node-Performance-APIs](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html).

## Vorher/Nachher im gleichen lokalen Profil

Runner: `scripts/measure-shop-cart-timing.mjs`. Beide Seiten liefen auf demselben Windows-Rechner, Node 24.22.1, Intel Core Ultra 5 235, Python-Bildbibliotheken aus derselben Umgebung. Je ein Aufwärmlauf und sieben Messläufe, eine Sitzung gleichzeitig, Loopback ohne Drosselung. Echtes mitgeliefertes natives Acrylmodell, echte In-Memory-Werkstatt und Entwurfspakete, synthetisches 40×60-Foto/PNG plus WebP-Kundenvorschau. Shopify-Transport vollständig simuliert: Dateisuche 60 ms, Anlage 100 ms, Pollpause 25 ms, Pollantwort 40 ms. Keine echten Shopify-Zugriffe, Produkte oder Bestellungen.

| Anfrage | Vorher Median (Min–Max), ms | Nachher Median (Min–Max), ms |
| --- | ---: | ---: |
| `acrylic-drafts` | 848,63 (835,19–861,77) | 839,88 (828,62–851,65) |
| `theme-cart` | 6,44 (6,11–7,48) | 6,58 (6,49–7,12) |
| `cart/data` | 261,96 (250,05–278,85) | 257,64 (249,19–271,92) |
| `cart/claim` | 6,80 (6,65–7,02) | 6,52 (6,38–6,93) |

Das ist eine Kontrolle des Diagnoseaufwands, **kein Geschwindigkeitsgewinn durch V2/V3 und keine Handy-Abnahme**. Die Differenzen liegen innerhalb der beobachteten Streuung. Ausgangsstand `be163c5d`, Nachher-Code `2d133af0`. Vollständige Einzelwerte, Zeiten und Profil: [vorher](../measurements/2026-11-17-konfi-tempo-p1/before.json), [nachher](../measurements/2026-11-17-konfi-tempo-p1/after.json).

Beispiel aus Nachher-Lauf 4: Entwurf 847,57 ms Serverzeit, davon Prüfstandvorbereitung 843,18 ms; Originalfoto 254,80 ms, Kundenvorschau 305,70 ms, Referenzvorschau 253,19 ms. Das identifiziert die Bildverarbeitung in diesem kleinen lokalen Muster, nicht die Ursache der im Issue gemessenen Live-6,1 s. `cart/data` desselben Laufs: 260,41 ms, davon 251,91 ms Restwartezeit auf das bewusst verzögerte synthetische Shopify-Bild. Damit ist nachgewiesen, dass die Messpunkte die Verzögerung dem richtigen Abschnitt zuordnen.

Reproduktion mit Node 24 und den vorhandenen Python-Bildabhängigkeiten (`GRAVURU_PYTHON` auf die passende Python-Umgebung setzen):

```sh
node scripts/measure-shop-cart-timing.mjs <Checkout-von-be163c5d> 7
node scripts/measure-shop-cart-timing.mjs <Checkout-von-2d133af0> 7
```

Die Ausgaben enthalten ausschließlich synthetische Messdaten. Der Runner benutzt die gleiche Quelle für beide Checkouts und prüft erfolgreiche Sicherung/Übergabe/Claim, Preis und gehostete Vorschau. Der erste Aufwärmlauf wird aus `samples` ausgeschlossen; `backgroundEvents` enthält ausdrücklich auch dessen Hintergrundereignis.

## Prüfungen

- Unveränderte Basis: 30/30 Tests in `theme-cart-flow`, `shopify-checkout-image`, `theme-cart-version-skew`, `theme-cart-client`.
- Nachher: 63/63 in diesen Suiten plus `shop-cart-timing`, `shop-entry-flow`, `shop-entry-client`, `cart-edit-revision`.
- Zusätzlich 21/21 in `acrylic-review`, `bound-test-cart`, `checkout-design-image`: unter anderem alle 28 Acrylpreise, feste Revisionen/Originale, Bearbeiten, ungültige Bindungen und Mengen, erhaltene Preisprüfungen.
- Neue Diagnoseprüfungen: getrennte gleichzeitige Anfragen/Hintergrundarbeit, Cache und Pending-Wiederverwendung, Fehlerzeiten, keine privaten Werte, unveränderte Fehlerobjekte und Ausfallsicherheit des Loggers; richtige Header und Bytezahlen auf den echten lokalen HTTP-Routen.
- `node app/configurator/variant-m/build.mjs`: erfolgreich, 76 Ressourcen, 1 Modell, Editor-Bündel 162 Module/16 Styles.
- `git diff --check`: erfolgreich. Keine neue Gesamt-Suite oder echte Shop-Browserabnahme behauptet.

## Genau nächster Schritt / offene Grenzen

Claude prüft diesen P1-Zwischenstand. Für die Ursachendiagnose braucht es anschließend ein Zeitprotokoll mit realistischem Produkt/Datenbestand und echtem Shopify-Bildtransport auf einer abgestimmten Prüfumgebung; auf dem Live-System erst nach Chris' „live“. Serverlog/Diagnoseköpfe zusammen mit Browser-Zeiten erfassen. Roh-HARs mit Sitzungstoken oder Kundendaten nicht ins Repository übernehmen.

Für Vorher/Nachher dasselbe Produkt, dieselbe Gestaltung/Menge, gleicher Browser, kalte/warme Zustände und exakt gleiche Netz-/CPU-Einstellungen verwenden. Die zwei bisherigen Profile auseinanderhalten: Issue #254 verwendete 390×844, CPU ×4, **keine** Netzdrosselung; der Vorschlag vom 16.11. verwendete zusätzlich 150 ms/1,6 Mbit/s Down/750 kbit/s Up. Desktop separat. Je Profil den ganzen Weg Produktseite → Konfi → Galerie → Designwechsel → Warenkorb erfassen und ab „Jetzt in den Warenkorb“ bis zur bestätigten Position messen, nicht nur bis zur HTTP-200-Antwort.

Erst anhand dieser Daten folgt auf demselben P1-Branch V2/V3. Unter 5 s am Handy ist noch nicht belegt. Servergröße, neue Kapazitätswerte und WebP-Qualität werden hier nicht festgelegt. P2/P3 haben weiterhin eigene spätere Branches/PRs; P4 ist nicht beauftragt.
