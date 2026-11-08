# Edelstahl: isolierter R15-Anschluss an den tatsächlichen Serverstand

Stand 08.11.2026, Mika-Unteragent. Kein Commit, keine Veröffentlichung, keine Shopify-Schreibaktion.

## Ausgangspunkt und Ergebnis

Branch: `dev/mika-steel-r15-native-overlay-20261108`. Grundlage: `b6b1b749d9724fa6d9a8098033ebbd967f6d6996`. Die fünf vom laufenden Server gemeldeten SHA-256-Werte von ux.mjs, server.mjs, shop-entry.mjs, shop-entry-page.mjs und shopify-admin-host.mjs stimmen bytegenau mit diesem Gitstand überein. Auch acryl-employee-host.mjs ist unverändert und identisch zum gemeldeten Serverhash.

R15 wurde auf diese Basis übertragen: **26 Laufzeit-Quelldateien und 11 erzeugte Editor-/Bundle-Dateien**, statt die gesamte neuere Galerie-/Importhistorie zu übernehmen. Dateien und SHA-256 inklusive erwarteter Ausgangshashes stehen in [manifest.json](../reviews/2026-11-08-steel-r15-native-overlay/manifest.json). Die enge Kopierliste steht in [deployment-files.txt](../reviews/2026-11-08-steel-r15-native-overlay/deployment-files.txt). Tests, Fixture und Dokumentation gehören nicht in das Laufzeitpaket.

## Freigegebene Regeln und Grenzen

- Nutzerfreigabe R15 vom 08.11.2026 gemäß PRIO-KONFI.md im aktuellen Hauptarbeitsbaum; gemeinsame Bedienung erhalten.
- Auftrag dieses Pakets: dieselbe R15-Darstellung an die vorhandene Shop-Sitzung anbinden, keine Galerie-/Schemaumstellung.
- Motive maximal passend zur echten Produktkontur, Seitenverhältnis erhalten; technische Sperren, Löcher, Undo und Originaldesigns unverändert. Neu freigegebene Edelstahlkonturen benötigen die bereits geprüfte Konturerweiterung des Motivlimits.
- Optionen, Preise und Fähigkeiten kommen ausschließlich vom gebundenen Produktstand. Dieses Paket legt kein Produkt an und schaltet kein Checkoutrecht frei.

## Tatsächlicher Anschluss

Der signierte Start akzeptiert ausschließlich den einmaligen Darstellungswert `ui=prio-r15`; ungültige oder doppelte Werte bleiben wirkungslos. Die bisherige Sitzung, Produkt-/Variantenbindung, Revision und Rechte bleiben gleich. Die Hostseite setzt den Wert nur im vorhandenen GravuruShopEntry-Kontext. ux.mjs lädt den Adapter erst nach dem nativen Mount. shop-shell.mjs verlangt eine übereinstimmende native Sitzung und einen passenden Same-Origin-Host.

Der bestehende Cart-Knopf und seine Validierung werden weiterverwendet. Es gibt kein Umschalten von `checkout=false` in einem statischen Demopaket. Die bisherigen Demo-Autostart- und Sicherheitsregeln bleiben getrennt.

**Kein vollständiges Ersetzen durch die aktuelle server.mjs/ux.mjs aus dem R15-Arbeitsbaum.** Deren weitere Unterschiede betreffen Galerie und gemeinsamen Ressourcentransport. Hier wurden nur der optionale Mount, die genaue Asset-Allowlist und der Darstellungsparameter übertragen.

## Bestätigte Navigation für Stahl-Türschilder

Zusatzauftrag des Nutzers, vom Parent bestätigt: Form / Größe / Befestigung. Nur bei productExecution.schema=gravuru-product-execution/v1, kind=door-sign, sourceFamilyId=steel-door-signs, Stahlmaterial und variabler familyFormats-Konfiguration erscheint der erste Reiter als Form. Die native Formgruppe gehört dann dorthin, die Größengruppe bleibt allein im zweiten Reiter und die Befestigung im dritten. Die bestehende native Material-Information bleibt am eigenen Info-Button erhalten; weder Optionen noch deren Klickhandler werden ersetzt. Schiefer, andere Produktfamilien und feste Größen behalten ihre bestehende Navigation. Ein Test durchläuft alle 80 Größen der acht Katalogformen mit der nativen familyFormatChoices-Gruppierung; EL und OV bleiben bewusst gemeinsam als Oval erreichbar. 43 fokussierte Integrations-/Navigationsprüfungen nach dieser Änderung bestanden.

## Notwendige Kundenkorrekturen

workflow.mjs enthält die zwei optionalen R15-Hooks für Überlagerungsprüfung und automatisches Einpassen sowie die freigegebene Korrektur später geladener Textschriften. usability.mjs nutzt dieselbe korrigierte Textmessung aus text-bounds.mjs. text-fields.mjs übernimmt das bereits freigegebene Schließen nach bewusstem Außenklick, ohne Scrollen als Klick zu deuten.

text-outline-fit.mjs enthält die bestehende R15-Erweiterung auf Rechtecke: echte Schriftkonturen zählen statt eines zu großen Auswahlrechtecks. Diese gemeinsame Datei kann auch serverseitige Grenzprüfungen beeinflussen; sie ist deshalb ausdrücklich Teil der gezielten Regressionstests. **Das ist keine Datenbankschemaänderung.**

Die neuere native Reset-Position, Zoom-CSS, Galerie-Sortierung, Galerie-Ausnahmen und Ressourcen-Auslieferung wurden nicht kopiert. R15 verschiebt die echten Reset-/Zoom-Bedienelemente selbst. Nur die von R15 geerbte kompakte Motivpreis-Zeile wurde identisch und auf data-mobile-demo begrenzt in demo.css ergänzt; die alte Oberfläche erhält dadurch keine neue CSS-Regel.

## Abhängigkeits- und Serviernachweis

- Nativer Kern: 150 gebündelte Module. Erzeugter Kern: `/_bundle/editor-bab5a1fa49ee42d2.mjs`.
- R15: 13 eigene JavaScript-Module plus 15 bereits vorhandene native Modulabhängigkeiten; zusätzlich CSS und Warenkorbsymbol.
- Der Präsentationsadapter bleibt außerhalb der Blob-Bündel; dadurch funktionieren relative CSS-/SVG-URLs und import.meta.url unverändert.
- native-overlay.test.mjs löst den vollständigen Graphen auf und lädt jede Abhängigkeit über den echten gehosteten Server-Allowlist-Pfad. Fremder Host, fremder Ursprung, POST, Tests, interne Allowlistdatei und Traversal bleiben gesperrt.
- acryl-employee-host.mjs, repository.mjs, native-review-schema.mjs, http.mjs, design-dashboard.mjs, product-families.mjs, draft-cart-handoff.mjs, shop-entry-client.mjs, build.mjs sowie beide Lazy-Ressourcenmodule sind bytegleich zur Basis. Keine Migration/Registrierungsdaten/privaten Modelle/Uploads im Diff.

## Prüfungen

**306 unterschiedliche gezielte Tests bestanden:** 187 Darstellung/Importgraph, 80 native Text-/Shop-/Hostprüfungen und 39 vorhandene Geometrie-/Ereignisregressionen. Native build() wurde durch den Servertest erfolgreich ausgeführt; git diff --check ist sauber.

Zunächst fehlte die passende Python-Umgebung im PATH. Die drei betroffenen Prüfungen wurden mit der schon vorhandenen Testumgebung wiederholt; SVG-Logo-Konvertierung und beide Excel-Exportprüfungen bestehen. Keine Pakete installiert. Zwei alte Quelltext-Harnesses erwarteten noch den ersetzten Bounds-Cache; dafür wurden die bereits vorhandenen R15-Testaktualisierungen übernommen und beide Prüfungen wieder erfolgreich ausgeführt. Assertions wurden nicht abgeschwächt.

Prüfbefehle: Node --test auf allen mobile-demo/*.test.mjs; zusätzlich server.test, text-bounds.test, text-field-dismissal.test, workflow-fit-status.test, text-outline-rectangle.test, shop-entry.test, shopify-admin-host.test, ui-event-regressions.test, text-outline-regressions.test, edge-clamp.test, design-reset.test. Bei Pythonprüfungen: GRAVURU_PYTHON auf vorhandenes work/audit-python-env/Scripts/python.exe, PYTHONPATH auf work/audit-python-deps.

## Vor Veröffentlichung noch offen

1. Parent prüft die zusätzlichen Ausgangshashes im Manifest gegen den tatsächlichen Release und sichert Code, Datenbanken, Uploads, Assets und aktive Pfade privat. Ein abweichender Ausgangshash darf nicht still überschrieben werden.
2. Dieses Paket in eine isolierte Kopie des gesicherten Serverreleases einsetzen; Basismodelle, private Daten und Galerie unverändert lassen. Native Editor-/Bundle-Dateien gemeinsam austauschen und ältere Hash-Bündel beim ersten Start erhalten, damit bereits offene Sitzungen nicht ins Leere laufen.
3. Tatsächlichen Edelstahl-Profilkandidaten mit allen acht Formen auf Handy und PC prüfen; Anfangsausführung, SVG-Logo, Fotoverbot, Preis, Variantenwechsel, Randbewegung, Überlagerungswahl, Undo und Produkt-Rücksprung. Diese Browserabnahme ist hier noch nicht erfolgt.
4. Echte Sitzung → native Konfigurationsspeicherung → Warenkorb-/Preisfunktion → Checkout/Produktionsstand bleibt ein separater Integrationsnachweis. Der Adapter allein beweist keinen verkaufsfähigen Pilot.
5. Rückweg: Darstellungs-Opt-in entfernen und den gesicherten Code-/Editorstand wieder aktivieren. Diese Änderung verlangt keine Rückmigration der Datenbank. Bereits gespeicherte Kundenkonfigurationen nicht löschen.

## Exakte Laufzeit-Quelldateien

| Datei | Änderung |
| --- | --- |
| `app/configurator/mobile-demo/assets.mjs` | Neu |
| `app/configurator/mobile-demo/contour-placement.mjs` | Neu |
| `app/configurator/mobile-demo/demo.css` | Neu |
| `app/configurator/mobile-demo/demo.mjs` | Neu |
| `app/configurator/mobile-demo/desktop-selection.mjs` | Neu |
| `app/configurator/mobile-demo/edge-resize.mjs` | Neu |
| `app/configurator/mobile-demo/motif-size-limit.mjs` | Neu |
| `app/configurator/mobile-demo/options-navigation.mjs` | Neu |
| `app/configurator/mobile-demo/overlap-consent.mjs` | Neu |
| `app/configurator/mobile-demo/overlap-review.mjs` | Neu |
| `app/configurator/mobile-demo/product-return.mjs` | Neu |
| `app/configurator/mobile-demo/shop-shell.mjs` | Neu |
| `app/configurator/mobile-demo/shopping-cart.svg` | Neu |
| `app/configurator/mobile-demo/small-motif-controls.mjs` | Neu |
| `app/configurator/mobile-demo/text-editor.mjs` | Neu |
| `app/configurator/mobile-demo/text-selection-dismiss.mjs` | Neu |
| `app/configurator/variant-m/server.mjs` | Gezielt geändert |
| `app/configurator/variant-m/text-bounds.mjs` | Neu |
| `app/configurator/variant-m/text-fields.mjs` | Gezielt geändert |
| `app/configurator/variant-m/usability.mjs` | Gezielt geändert |
| `app/configurator/variant-m/ux.mjs` | Gezielt geändert |
| `app/configurator/variant-m/workflow.mjs` | Gezielt geändert |
| `app/platform/sources/app/shared/models/text-outline-fit.mjs` | Gezielt geändert |
| `app/workshop/shop-entry.mjs` | Gezielt geändert |
| `app/workshop/shopify-admin-host.mjs` | Gezielt geändert |
| `app/workshop/ui/shop-entry-page.mjs` | Gezielt geändert |
