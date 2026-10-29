# Issue #48 · Teil C · Bestellungen, Fertigung und Kundenbild

Stand: Codex/Astra, 29.10.2026, Branch dev/konfi-bestellungen-fertigung-20261029-astra. Entwurf zur Prüfung, nicht live. Auftrag: Issue #48, Nachrichten 4 und 5. Teil A ist mit PR #52 gemergt; C hat laut Operator Vorrang vor B.

## Nachgewiesene Ursachen

Die zwei bezahlten Testbestellungen #1027/#1028 sind im Acryl-Speicher angenommen (test-paid-event-recorded), ohne abgelehnte Positionen und bisher ohne Ausgabejobs. Die alte Bestellseite las nur den separaten Legacy-Speicher. Beide Stände haben kein zugeordnetes Fertigungsprofil; das ist keine automatische Freigabe und kein Grund, vorhandene technische Standardausgaben zu verbergen.

Die unveränderten Originalpakete scheitern zusätzlich in acrylicArtwork → validateProductDesign mit „Bitte eine vorhandene Schriftart auswählen“. Die verwendete Profilschrift steht in den eingefrorenen Konfiguratorquellen, fehlt aber in der ursprünglichen Produkt-Schriftliste. Die zweite Validierung nimmt jetzt ausschließlich diese hashgeprüften gespeicherten Quellen hinzu, entsprechend dem vorhandenen Speichervorgang. Unbekannte Schriften und falsche Pakethashes bleiben gesperrt.

Leuchtturm und Zusatzmotive liegen in beiden Originalpaketen als SVG-Pfade vor, ohne Raster-image. Das ist ein Quellnachweis, noch kein bestandener PDF-/SVG-Endnachweis aus diesen Originalbestellungen. Ihre heutigen _Entwurf-Bilder sind JPG; die neue PNG-Eigenschaft fehlt bei diesen historischen Positionen.

## Umsetzung

- Ein authentifizierter Index zeigt beide vorhandenen Stores. Gleiche interne IDs bleiben durch Store-Schlüssel eindeutig. Prüfstand, Ausgaben, Produktübernahme, Fertigungsfreigabe und Dateifreigaben verwenden weiterhin den jeweiligen Store samt dessen Sitzung/CSRF. Keine Bestellstände migriert oder freigegeben. Bestehende Begrenzung: jeweils die letzten 200 Positionen pro Store; keine Vollhistorien-Paginierung behauptet.
- Verlustfreies PNG aus dem Konfigurator (bestehender 1600-Pixel-Render) wird zusammen mit dem Gestaltungsstand gespeichert. _gravuru_bild ist eine stabile HMAC-Bildadresse, gebunden an Shop/Store/Offer; sie gewährt ausschließlich Zugriff auf das verifizierte PNG. Keine Originalmedien, Prüfpakete oder Editoranmeldung über diesen Weg. Neue/alte Browserstände behalten den vorhandenen Referenzbild-Rückfall. Der eingefrorene alte Legacy-Store bekommt keine funktionslose neue Adresse, solange er den internen Bild-Lookup nicht unterstützt.
- Die Warenkorbübergabe lädt bei neuer PNG-Bindung genau dieses gespeicherte PNG hoch. Ein späterer optionaler Browser-JPG-Render darf es nicht ersetzen. _gravuru_bearbeiten ersetzt die öffentliche Eigenschaft Bearbeiten. Der normale Link unter dem Warenkorbbild bleibt erhalten. Keine historischen Shopify-Positionen geändert.
- Vorbereiteter Checkout-Zusatz in ops/shopify/checkout-image: Bild ergänzt den vorhandenen Cart Transform, ohne Preisprüfung oder D8-Vertrag zu ändern. Basis der gelesene Quell-Blob a1a5146136c6d1f11ea93b07b5c8f64a3f5ab7d7 aus gravuru-shopify. Keine aktive Function ersetzt, kein zweites Transform erstellt. Aktive Function-Version, WASM-Build und Checkout-Abnahme noch offen.
- Inline-Liquid für Bestellbestätigung in ops/shopify/notifications, mit Produktbild-Rückfall und Rückweg. Nur Datei; keine Benachrichtigung geändert oder versandt. Schlüsselrotation braucht einen eigenen Plan, damit historische Bildadressen gültig bleiben.

## Prüfungen

Windows-Vollauf der beiden vereinbarten Verzeichnisse: **1824 gesamt, 1819 bestanden, 0 Fehler, 5 übersprungen**, 1167,934 s. Kein Test gestrichen oder abgeschwächt. Testaufruf: node --import ./scripts/test-portability/full-tests-python-windows.mjs --test --test-concurrency=4 mit allen *.test.mjs aus app/configurator/variant-m und app/workshop; GRAVURU_PYTHON/PYTHONPATH auf die vorhandene private Windows-Testumgebung gesetzt.

Nach abschließender Schrift-/Bild- und Legacy-Kompatibilitätsprüfung: **51/51 gezielte Tests grün**, einschließlich zwei zusätzlicher Bildberechtigungstests. Enthalten: Profilschrift bis Vektorpfad, unveränderte Originalpakete, fehlerhafte Kundenvorschau, zwei Stores/CSRF/Schlüsselwechsel, Bytegleichheit des gesicherten PNG nach Entwurfsänderung und Ablauf, Bildadress-Manipulation/fremder Shop/Origin, Warenkorb-Ersetzung ohne Positionsverlust, Preisvertrag und D8 ohne erfundenen Aufpreis. Daher ist die Vollaufzahl nicht als erneuter Vollauf des finalen Testbestands ausgegeben.

Konfigurator-Build erfolgreich: 111 Module, 14 Styles. Die Produktions-PDF-/SVG-Tests des synthetischen Vollaufs sind grün; das ersetzt die Abnahme der beiden konkreten Bestellungen nicht.

## Offene Abnahme / genau nächster Schritt

1. Vollständige Originalpakete #1027/#1028 privat lesend beziehen und mit der korrigierten Laufzeit lokal technische Gravur-PDF, Kontur-PDF und SVG erstellen. Format 120 × 80 mm, jeweiliges Bohrbild, Schriftpfade und Leuchtturm/Haus-Vektoren prüfen. Keine Produktionsfreigabe setzen, keine private Kopie ins Repo. Der Versuch über die Plesk-Browserkonsole war wegen großer Ausgabe unzuverlässig; danach antwortete die Browserverbindung nicht mehr. Ein sicherer vorhandener privater Downloadweg ist in Issue #48 angefragt.
2. Beide Bestellungen in der neuen Ansicht und ihre Downloads sichtbar nachweisen. Diese echten Screenshots fehlen derzeit.
3. E-Mail-Baustein mit der Originalgestaltung #1028 als Bildvorschau zeigen; noch offen. Keine Ersatzgestaltung als Beweis verwenden.
4. Aktiven Cart Transform lesend eindeutig zuordnen, auf dessen aktuelle Quelle übertragen und kompilieren. Spätere Checkout-/Mail-/Live-Abnahme erst nach Chris' ausdrücklichem Satz. Preiseinführung für D8 bleibt gesondert.
5. Linux-Vollauf auf dem finalen Branch durch Claude. Danach Teil B weiterführen; dessen Zwischenstand liegt gesichert auf eigenem Branch, zwei Windows-Nachprüfungen noch offen.

Keine Live-Datei, Bestellung, DB, Freigabe oder Katalogdatei durch diese Arbeit verändert. Keine Schriftdateien und keine privaten Originalpakete im PR.
