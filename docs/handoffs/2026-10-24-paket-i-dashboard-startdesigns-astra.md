# Paket I · Startdesigns sicher freigeben · Reviewkorrektur R3

Stand 24.10.2026, Codex / Astra. [PR #16](https://github.com/Chris83638w/gravuru-2027/pull/16), unveränderter Branch `dev/dashboard-startdesigns-20261024-astra`. Geprüfter Codecommit `06356c9947fa765e59822a16e082245af8211e44`, direkt auf `main 3e42c13411003add34645bc258623851982e7809` neu aufgebaut. Katalog `1be49ee792667357fff1061eb5d21bacf3b4e3c1`. Der nachfolgende Beleg-Commit ändert nur Dokumentation. Kein Merge, kein Livezugriff, keine Katalogänderung.

## Reviewkorrektur

Claudes [P1-Befund](https://github.com/Chris83638w/gravuru-2027/pull/16#issuecomment-6382606306) ist in allen drei Punkten bearbeitet:

1. Die aktuellen Host-/Media-Korrekturen aus main bleiben erhalten. Die Miniatur im Vorschau-Button verwendet `setMerchantImage`, einschließlich PNG→SVG-Fallback.
2. Der Dialog nutzt bei `merchantImagesRequired()` einen eigenen `merchantRequest` und eine Blob-URL. Er verwendet nicht den deduplizierenden Miniatur-Lader. Jede Öffnung fordert die Vorschau neu an und wartet auf das aktuelle Bildereignis mit erfolgreicher Dekodierung. Schließen, Abbruch und Quellenwechsel brechen Anfragen ab und geben Blob-URLs frei; verspätete Antworten schalten nichts frei. 401/403 sperren einschließlich einer früheren Sichtung/Auswahl. PNG-Lade-/Dekodierfehler versuchen SVG über denselben authentifizierten Weg. Ohne Händlerhost bleibt die normale Bild-URL.
3. Die UI-Regressionen führen die echten Request-/Media-Module mit `gravuru-merchant-auth=required` und synthetischem App Bridge aus. Token, Load-Gate, 401, erneutes Öffnen und Ressourcenfreigabe sind geprüft.

Die bestehenden Regeln bleiben erhalten: Filter „Nur Startdesigns von Hauptprodukten“, 104 Referenzen auf 102 Designs, Hauptprodukt-ID/CustomizationID, Größe und Sperren je Zeile. Fehlende Referenzen bleiben sichtbar. Fehlende Schrift blockiert die Freigabe. Mehrfachfreigabe bestätigt Anzahl und Kennungen und sendet sequenziell denselben bestehenden PATCH je Design. Urheber, `freigabe.von` und `_aenderungen.jsonl` bleiben serverbestimmt. Teilfehler und einzelne Rücknahme sind unverändert. Eine Designfreigabe beseitigt keine Produkt- oder Passungssperre.

## Prüfung

**131 unterschiedliche gezielte Tests grün, 0 Fehler, 0 Skips, 0 Abbrüche.** Dieser R2-Nachweis wird für den bytegleichen R3-Code übernommen: aktuelles main ergänzt nur die Paket-J-Übergabe; neun Code-/Testdateien und ihre Laufzeitabhängigkeiten sind unverändert. Keine unnötige Wiederholung dieser Tests. 109 Tests in zwölf Dateien plus 22 UI-Tests (elf bisherige und elf neue Auth-/Media-Fälle), ohne Doppelzählung. Kein neuer Gesamtvollauf und kein neuer Linux-Lauf behauptet.

Die zwölf Dateien: `app/workshop/{design-dashboard,design-dashboard-startdesigns,katalog-convert,katalog-import,katalog-source,katalog-linien,product-families,shopify-admin-host,merchant-request,merchant-media,acryl-host-routing}.test.mjs` sowie `app/configurator/variant-m/server.test.mjs`. Dazu `app/workshop/design-dashboard-ui.test.mjs`.

Ausführung mit Node 24.20.0, Python 3.12.14, `PYTHONUTF8=1`, beschreibbarem TEMP/TMP und dem bestehenden `scripts/test-portability/full-tests-python-windows.mjs` als `--import` für den Python-Alias. Dateiliste, Laufzähler und Prüfsummen im [Prüfnachweis](2026-10-24-paket-i-pruefung.json). Alle geänderten Texte LF.

Browserprüfung auf einer ausschließlich lokalen, lesenden Testseite mit echten UI-Dateien, required-Meta und synthetischem Sitzungstoken: PNG→SVG-Fallback sichtbar, dasselbe Design zweimal erfolgreich geöffnet, Freigabesperre erst nach Bildanzeige aufgehoben, 401 bleibt gesperrt. 28 API-Anfragen, alle mit Token, 0 Schreibzugriffe. Dies ist kein Test einer echten Shopify-Anmeldung. Die unabhängige Code-/Testprüfung ergab keinen offenen materiellen Befund.

## Katalogstand 1be49ee

Frischer Readback: **104 Referenzen / 102 Designs / 104 Größenbindungen**, **0 offene Preise für diese Hauptprodukte**, 89 passen, 5 benötigen Prüfung und **10 passen nicht**. Die zehn IDs und konkreten Passungsbefunde sind unverändert. Insbesondere sind die Preise für 7000000 und 7100000 jetzt gesetzt. Rund 8,5 × 8,5 cm ist jetzt mit 14,99 € gesetzt; alle Edelstahl-Grundpreise sind bekannt.

Die Quelldateien wurden rein lesend geprüft: 131 Primärblobs, 307 Dashboard-Eingaben sowie 20 Alternativ-Eingaben, unverändert vor/nach den Läufen. Kalter Dashboard-Aufruf 8,120 s mit 21 Schriftkonvertierungen, warmer Aufruf 0,572 s ohne weitere Konvertierung; Messwerte, keine allgemeine Laufzeitgarantie.

Der [Quellenbericht mit zehn Vorschlägen](2026-10-24-paket-i-startdesign-sperren.md) verwendet aktuelle Kataloglinks und überprüfte Zeilen. Die historische R2-Alternativrechnung ergab: neun D1-Vorschläge passen, Retro 2 bleibt „prüfen“ wegen 1,50 % Einpassung; D57 auf 300 × 200 mm passt bei 85,35-mm-Schrift. Keine Variante wurde eingetragen oder freigegeben.

## Nächster Schritt für Claude

PR #16 auf der neuen Basis prüfen, insbesondere Sitzungstoken im Dialog, frisches Wiederöffnen und 401-Sperre. Den vorgesehenen lokalen signierten Merge führt Claude nach seiner Abnahme aus. Chris hat bereits entschieden: Originalmotive minimal einpassen, kein D1-Tausch. Paket J folgt der [eigenen Übergabe](2026-10-24-paket-j-designs-einpassen.md); Designfreigaben bleiben bei Chris.
