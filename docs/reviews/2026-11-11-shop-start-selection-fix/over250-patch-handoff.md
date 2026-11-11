# Getrennter Folgepatch: richtige Startvariante jenseits 250

Vorbereitet, nicht in den Operator-Kandidaten eingespielt. Basis: `af6fd986c735d97bddc974261398ab8c4e88e00b`. Keine Code-/Teständerung im Kandidaten durch diesen Agenten, kein Commit/Push, kein Shop-/DB-Schreibzugriff.

**Patch:** `work/restabschluss/over250-start-selection.patch`, SHA256 `459de9b6478b1919532df84f29b4e281ff4a8bbf83dc17003fc680197cf4f9cb`. `git apply --check` gegen den Kandidaten bestanden. Exakt zwei geänderte Dateien:

- `app/workshop/ui/shop-embed.mjs`: explizite von Liquid gewählte ID bleibt außerhalb der Teilliste erhalten. Eigene Formulare werden über den tatsächlich vorhandenen Produktmarker oder eine bereits belegte Forminstanz erkannt. Neue unbekannte Formularinstanzen ohne Produktnachweis erweitern die Liste nicht. Explizit fremde Kennung hat Vorrang vor vorheriger Zuordnung. Das eindeutige Hauptformular bestimmt die aktuelle Auswahl; bei widersprüchlichen gleichrangigen Formularen bleibt der letzte eindeutige Stand. `startHref()` akzeptiert zusätzlich nur diese belegte aktuelle Auswahl. R15 bleibt innerhalb seines vollständigen Manifests.
- `app/workshop/shop-product-presentation.test.mjs`: fünf gezielte neue Regressionen; bestehende einfache Formularprüfung konkretisiert auf Hauptformular vor veralteter Ratenzahlungs-/Sticky-Kopie. Die bisherige Erwartung des zuerst gefundenen Ratenzahlungsfelds war keine Produktregel und würde die echte Auswahl erneut verdrängen.

**Prüfungen: 18/18 grün.** Im isolierten Ordner `work/restabschluss/over250-patch`:

```powershell
node --test app/workshop/shop-product-presentation.test.mjs
node --test --test-name-pattern='global shop embed' app/workshop/shop-entry-client.test.mjs
node --check app/workshop/ui/shop-embed.mjs
```

15 Präsentations-/R15-Tests und eine bestehende globale Embed-Prüfung. Die übrigen vier Dateien in diesem Scratch sind unveränderte Testabhängigkeiten und gehören **nicht** zum Patch.

Im unveränderten Kandidaten, gegen den tatsächlichen Servercode:

```powershell
node --test --test-name-pattern='missing, duplicate and form bindings|unbound or ambiguous configured variants' app/workshop/shop-entry.test.mjs
git apply --check ../restabschluss/over250-start-selection.patch
```

Zwei Server-Negativtests grün: unbekannte/mehrdeutige Startbindungen sowie ungebundene/mehrdeutige Ausführungen und fremde Entwürfe bleiben abgewiesen. Der erste beschränkte Lauf scheiterte ausschließlich an `connect EACCES 127.0.0.1`; der anschließend erlaubte lokale Loopback-Lauf bestand. Keine neuen Serverregeln.

**Echte ID als lokale Eingabe:** `node work/restabschluss/over250-patch-real-data-check.mjs` vom Workspace: vorhandener 808er Snapshot, Ziel ID **58104626479484** auf Position **331**. Sowohl direkte Liquid-Vorauswahl als auch spätere Änderung einer bereits identifizierten eigenen Forminstanz bleiben auf dieser ID; Listenlänge unverändert **250**. `over250-real-data-check.log` enthält den Nachweis. Der bereits separat geprüfte native Auswahl-/Cartpfad bleibt unverändert.

Manifest: `over250-patch-manifest.json` mit Vorher-/Nachher-Hashes. Testlogs: `over250-patch-tests.log`, `over250-global-embed-test.log`, `over250-server-negative-tests-allowed.log`. Ursache/Abgrenzung: `main-variants-over250-review.md`; aktive Theme-Formularbelege/Sicherheitsgrenze: `main-variants-over250-fix-proposal.md`.

Gezielter Nachbeleg zum unabhängigen Review: Aktives `snippets/sticky-atc-bar.liquid` hat im Minimalist-Zweig die Klasse `sticky-atc-bar` und einen Button für das Hauptformular; der normale Zweig trägt `sticky-atc-bar__inner` bzw. ein eigenes Formular `sticky-atc-bar__form`. Der bestehende Sticky-Klassenselektor erfasst beide. `over250-sticky-theme-evidence.json` enthält nur relevante Zeilen und Shopify-MD5. Keine weitere Codeänderung erforderlich.

**Unabhängiger Review:** `catalog_review` bestätigt ohne verbleibenden Befund; Patch-/Dateihashes und >250-/Fremdprodukt-/R15-/Servergrenzen geprüft, keine doppelte Testsuite. Bericht: `over250-independent-review.md`.

**Noch offen:** Root integriert den geprüften Folgepatch. Tatsächlich ausgeliefertes JS wegen HTTP 403 noch nicht gehasht. Nach Integration gezielter Shop-Pilot mit ID 331 und Variantewechsel; keine allgemeine Live- oder Bestellabnahme aus diesen lokalen Tests ableiten.
