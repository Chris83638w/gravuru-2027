# „Bearbeitbarer Entwurf“ für Kunden nicht mehr sichtbar – Entwurfsnachweis unter privatem Schlüssel (vorbereitet)

Claude (Unteragent des Operators), 21.11.2026, 15:45 Uhr. Zweig `dev/claude-entwurf-privat-20261121`, aufgesetzt auf `dev/astra-stufe-c-folgeversion-nachweise-20261121` (`efb44c44`). Lokal gebaut und geprüft. **Nichts davon ist aufgespielt, veröffentlicht oder eingeschaltet.**

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; an Designs wird nichts geändert.

## 1. Was und warum

Heute trägt jede Gravuru-Position die sichtbare Angabe „Bearbeitbarer Entwurf: gravuru:proof_…:…“ – ein langer technischer Verweis, den die Preisfunktion und die Kassenprüfung als Nachweis lesen. Shopify zeigt Angaben ohne führenden Unterstrich dem Kunden an Kasse, Danke-Seite und im Kundenkonto. Chris hat am 21.11.2026 um 15:22 Uhr entschieden („1. ja“), dass diese Angabe für Kunden verschwindet.

Lösung: Der Wert bleibt, nur der Schlüssel wechselt. Neue Positionen tragen den Nachweis unter `_gravuru_entwurf`. Der sichtbare Schlüssel bleibt überall gültig, damit ältere Warenkörbe und Bestellungen weiter funktionieren.

## 2. Fachliche Regeln und ihre Quelle

| Regel im Code | Quelle |
| --- | --- |
| Die Angabe ist für Kunden nicht mehr sichtbar | Chris, 21.11.2026, 15:22 Uhr: „1. ja“ |
| Ein führender Unterstrich blendet eine Zeilenangabe an der Kasse aus; in der Bestellverwaltung bleibt sie für Mitarbeiter sichtbar | Shopify-Doku zu Zeilenangaben, zitiert im [Entwicklerforum](https://community.shopify.dev/t/docs-for-line-item-properties-needs-updating/1731), und Antwort eines Shopify-Mitarbeiters vom 25.06./01.07.2026 ([Forum](https://community.shopify.dev/t/allow-hiding-internal-line-item-properties-in-checkout-order-summary-and-admin-order-view/35550)); beide abgerufen am 21.11.2026. Die Doku-Seite selbst habe ich nicht abgerufen |
| Preis- und Kassenprüfung bleiben so streng wie bisher; der private Schlüssel wird in jedem Fall wie der sichtbare behandelt | bestehende Regel der Einzelsperre (Chris, 15.11.2026); keine neue Regel |
| Tragen beide Schlüssel verschiedene Werte, ist die Position ungültig | Schutzregel aus dem Auftrag des Operators, keine fachliche Entscheidung von Chris. Sie betrifft nur verfälschte Zeilen; der Server schreibt nie beide |
| Schalter am Server, Standard aus; je Speicher nur mit passendem Bestelleingang | technische Absicherung der Reihenfolge (Abschnitt 4), keine fachliche Regel |

Nicht eingebaut: irgendeine neue Sperre, ein neuer Preis oder eine Änderung am Text der Kasse.

## 3. Was geändert ist

**Shopify-Funktionen (neue App-Version nötig):** `ops/shopify/entwurf-privat-release/` – vollständige Quelle beider Funktionen auf Grundlage der aktiven Fassung (`einzelsperre-release/`). Beide Abfragen lesen zusätzlich `designPrivate: attribute(key: "_gravuru_entwurf")`. Die gemeinsame Einstiegsdatei nimmt den Nachweis aus dem privaten oder dem sichtbaren Schlüssel und prüft danach unverändert. Alle anderen Dateien sind bytegleich zur aktiven Fassung. Dieselbe Lesart steht auch im Entwicklungsstand `ops/shopify/master-release/`, damit eine spätere Fassung sie nicht verliert.

**Server:**

- `cart-personalization.mjs`: schreibt den Nachweis nur mit ausdrücklichem `privateDesignReference: true` unter `_gravuru_entwurf`, sonst wie bisher. Neu `personalizationAttributesMatch`: liest beide Schlüssel zurück.
- `order-intake.mjs`: nimmt eine Bestellposition mit privatem Schlüssel, mit sichtbarem oder mit beiden (gleicher Wert) an; jede Abweichung wird wie bisher abgelehnt. Der Eingang weist `acceptsPrivateDesignReference` aus.
- `theme-cart.mjs`, `storefront-cart.mjs`, `shop-entry.mjs`, `configurator-integration.mjs`, `acryl-employee-host.mjs`: Schalter `GRAVURU_PRIVATE_DESIGN_REFERENCE=enabled` (einziger gültiger Wert, nur mit Kundeneinstieg), durchgereicht bis zur Warenkorbzeile.

**Unverändert:** das Theme (es erkennt Konfigurator-Zeilen an `_gravuru_config` und blendet Unterstrich-Angaben schon aus), der E-Mail-Baustein (blendet beide Schlüssel schon aus), die Bausteine der Stufe C, die alten Wege mit Dateiupload (`_Gravuru Vorgang`, Version-M-Export) und der Warenkorbweg des Händlertests über die Storefront-API (bleibt beim sichtbaren Schlüssel).

Neue Dateien: `ops/shopify/entwurf-privat-release/` (Quelle, Tests, `pruefe-wasm.mjs`, README), `ops/shopify/entwurf-privat-version.mjs` mit Test, `app/workshop/private-design-reference.test.mjs`.

## 4. Reihenfolge – sie ist sicherheitskritisch

Die heute aktive Preisfunktion kennt den privaten Schlüssel nicht. Eine Zeile, die nur ihn trägt, bekäme **keinen Preis und wäre an der Kasse gesperrt** (nie zum Listenpreis verkauft, aber auch nicht bestellbar). Deshalb drei Schritte in genau dieser Folge; jeder ist für sich ohne sichtbare Wirkung, bis der letzte kommt.

1. **App-Version mit den beiden Funktionen** (Astra, nach Freigabe von Chris im Chat). Ablauf wie bei der Einzelsperre (`docs/handoffs/2026-11-15-preisfunktion-einzelsperre.md`): vollständiges Projekt der aktiven Version kopieren, in `extensions/gravuru-personalization-price/src` und `extensions/gravuru-checkout-guard/src` den Inhalt von `preis/src` bzw. `pruefung/src` legen, beide Funktionen mit der CLI bauen (zuletzt CLI 4.9.0, `@shopify/shopify_function` 2.0.1).
   - Gebaute Dateien prüfen: `node ops/shopify/entwurf-privat-release/pruefe-wasm.mjs <cli run.js> <ext-dir preis> <ext-dir pruefung> <ausgabe.json>` – Ende mit Code 0, neun Fälle, jede kompilierte Ausgabe gleich der Quelle, Anweisungen unter 11 Mio.
   - Kandidat ohne Freigabe bereitstellen, dann `verifyPrivateReferenceCandidate(before, candidate, {wasmBytes})` aus `ops/shopify/entwurf-privat-version.mjs`: nur die zwei Funktionen dürfen abweichen (neue Abfrage, neue Datei), alle anderen Module und Berechtigungen gleich. Die Bausteine der Stufe C bleiben unverändert dabei.
   - Freigeben. Danach ein Testwarenkorb mit einer heutigen Position: Preis und Kasse wie bisher (die neue Fassung ändert für den sichtbaren Schlüssel nichts).
2. **Server aufspielen** (dieser Zweig). Ohne den Schalter schreibt er weiter den sichtbaren Schlüssel; der Bestelleingang nimmt ab dann beide an. Reihenfolge zu Schritt 1 beliebig.
3. **Schalter setzen** – erst wenn Schritt 1 aktiv und geprüft ist: `GRAVURU_PRIVATE_DESIGN_REFERENCE=enabled`, gesetzt wie `GRAVURU_ORDER_REVIEW_TAGS`, dann Neustart. Jeder andere Wert sperrt den Start wie bei den übrigen Schaltern. **Sofort danach prüfen** (Abschnitt 6, Punkte 1 bis 3).

**Rückweg:** Schalter entfernen, Neustart – neue Zeilen tragen wieder den sichtbaren Schlüssel. Die App-Version aus Schritt 1 dabei **stehen lassen**: Warenkörbe, die inzwischen eine Zeile mit privatem Schlüssel enthalten, brauchen sie weiter. Wird sie doch zurückgenommen, sind genau diese Zeilen an der Kasse gesperrt (Hinweis „nicht mehr bestellbar“), bis der Kunde sie neu einlegt.

Der Code sichert die Reihenfolge so weit, wie er sie kennen kann: Standard ist aus; der Schalter kennt nur einen Wert; je Speicher wird der private Schlüssel nur geschrieben, wenn dessen Bestelleingang ihn annimmt. Ob die aktive App-Version die neue Abfrage trägt, kann der Server nicht lesen – das bleibt der Schritt des Operators.

## 5. Geprüft (lokal, synthetisch)

- Funktionen (`entwurf-privat-release.test.mjs`, 9 Tests) mit der echten Protokoll-Eingabe vom 15.11.2026: Warenkörbe mit dem sichtbaren Schlüssel ergeben genau das Ergebnis der aktiven Fassung; nur der private Schlüssel ergibt denselben Preis; beide gleich gilt; beide verschieden weist nur diese Position ab und sperrt sie an der Kasse; in 84 Vergleichsfällen (jede Position, vier Werte, sieben Abwandlungen) wird der private Schlüssel genau wie der sichtbare behandelt; normale Produkte werden nie gesperrt. Die aktive Fassung weist eine Zeile mit nur dem privaten Schlüssel ab (Beleg für die Reihenfolge). Abfragekosten nach Shopifys Tabelle 18 von 30 (bisher 17), Abfragen unter 3000 Byte ([Grenzen der Functions-API](https://shopify.dev/docs/api/functions/2026-10.md), abgerufen am 21.11.2026).
- Vergleichshilfe der App-Version (`entwurf-privat-version.test.mjs`, 4 Tests): 24 abweichende Kandidaten und 12 falsche Grundlagen werden abgelehnt.
- Server (`private-design-reference.test.mjs`, 6 Tests): Schreiben, Rücklesen, signierter Test-Bestelleingang (drei gültige, sieben abgelehnte Fälle), Schalter, Übereinstimmung der Schlüssel mit den Abfragen.
- Durchlauf (`theme-cart-flow.test.mjs`, vierte Variante): Einstieg → Entwurf → Theme-Warenkorb → Bearbeiten → Mengen 1 bis 4 → signierter Bestelleingang mit eingeschaltetem Schalter. Die Zeile trägt `_gravuru_entwurf` und keinen sichtbaren Nachweis; sichtbar bleiben nur Design, Format und Gravurtext.
- Gezielte Tests aller berührten Bereiche: 63 Testdateien aus `app/workshop` (Warenkorb, Bestelleingang, Einstieg, Kasse, Anbindung, Start) 681 Tests, 680 bestanden, 1 wie bisher übersprungen, kein Fehlschlag; `ops/shopify` samt `master-release`, `einzelsperre-release` und `entwurf-privat-release` 99 von 99 (mit LiquidJS).
- Gegenproben: 23 einzelne Rückbauten (Funktion, Abfrage, Bestelleingang, Warenkorb, Schalter, Vergleichshilfe), jeder von einem Test erkannt, danach bytegleich wiederhergestellt. Ein Testfall war zunächst nicht aussagekräftig (Einstellung des Einstiegs) und ist geschärft.

Nicht gelaufen: der Gesamtlauf aller Tests; `scripts/check-native-cart.mjs` (braucht eine private Sicherung); der Bau der Wasm-Dateien (keine CLI hier) – `pruefe-wasm.mjs` ist deshalb mit einem Stellvertreter der CLI geprüft, nicht mit kompilierten Dateien; alles am echten Shop.

## 6. Am echten Shop zu bestätigen

1. Nach dem Schalter: Testgestaltung „Claudetest“ einlegen – Preis im Warenkorb und an der Kasse richtig, kein Hinweis „nicht mehr bestellbar“.
2. An Kasse, Danke-Seite und im Kundenkonto steht unter dem Artikel kein „Bearbeitbarer Entwurf“ mehr und auch kein `_gravuru_entwurf`. Belegt ist das Ausblenden für die Kasse; für Danke-Seite und Kundenkonto bitte je ein Bild.
3. Testbestellung über das Test-Gateway: Die Werkstatt zeigt die Position ohne „bitte prüfen“, die Fertigungsdatei entsteht wie bisher.
4. Eine Position, die vor dem Schalter im Warenkorb lag (sichtbarer Schlüssel), lässt sich weiter bestellen.
5. Dass die CLI die erweiterten Abfragen annimmt (eine Zeile mehr, Kosten 18).
6. In der Bestellverwaltung sehen Mitarbeiter `_gravuru_entwurf` wie die übrigen privaten Angaben; das ist bei Shopify so vorgesehen.

## 7. Befunde und Grenzen

- **Älterer Händler-Speicher:** Er prüft Bestellungen mit seinem eigenen, eingefrorenen Code (Laufzeit vom 22.10.) und kennt nur den sichtbaren Schlüssel. Für Produkte, die noch dort gebunden sind, schreibt der Warenkorb deshalb weiter „Bearbeitbarer Entwurf“ – sonst würden deren Bestellungen im Eingang abgelehnt. Welche Produkte das sind, ist am Server abzulesen (hier nicht bekannt). Sollen auch sie die Angabe verlieren, braucht es eine eigene Änderung an dieser Laufzeit.
- Bestehende Warenkorbzeilen und Bestellungen werden nicht umgeschrieben; sie behalten die sichtbare Angabe. Bearbeitet ein Kunde eine alte Zeile, trägt die neue den privaten Schlüssel.
- Der Warenkorbweg des Händlertests (Storefront-API) schreibt weiter den sichtbaren Schlüssel.
- Der Wert des Nachweises wird von den Funktionen wie bisher nur auf Vorhandensein geprüft; den genauen Wert prüft der Bestelleingang.
- Ob ein Werkzeug außerhalb dieses Repos (Rechnungs- oder Lagersoftware) die sichtbare Angabe liest, ist hier nicht prüfbar. Es ist ein undurchsichtiger technischer Verweis; ein solcher Gebrauch ist nicht dokumentiert.

## 8. Offen bei Chris

Eine Freigabe für die App-Version mit den beiden geänderten Funktionen (Preis und Kassenprüfung). Empfehlung: ja – sie ändert für heutige Warenkörbe nichts und ist Voraussetzung für den Schalter.
