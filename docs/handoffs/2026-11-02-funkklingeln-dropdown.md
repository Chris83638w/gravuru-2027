# Funkklingeln: Dropdown-Auswahl · 02.11.2026 · Codex

## Auftrag und Quellen vor Umsetzung

Chris verlangt im Chat am 02.11. die Dropdown-Version aus seinem Screenshot für alle 126 Funkklingelprodukte und alle verfügbaren Größen. Anschließend ausdrücklich: „erst online und wenn was nicht stimmt können wir dann reagieren“. Bestehende Live-Freigabe gilt; nach kurzem Funktionscheck veröffentlichen, danach vollständigen lesenden Gegencheck durchführen.

- Format, Position der Klingel, Edelstahlrahmen und Acrylfarbe nutzen die vorhandenen Auswahlfelder. Befestigung bleibt bebildert wie im Screenshot.
- Alle Formate, Gegenpositionen, Preise und Produktbindungen bleiben aus den versionierten Produktprofilen; keine neuen Werte oder Sperren. Quelle: Chris’ bestehender Auftrag, Issue #46 und bisherige Live-Nachweise.
- Master-Funktionen, editierbare Texte/Motive, Gravurgrenze auf Acryl, stabile Bedienleiste und 94-%-Vorschau bleiben erhalten. Quelle: Chris’ vorherige Bedienkorrekturen und PR #140.
- Keine Designänderung. Es gilt weiterhin der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

Eigener Branch `dev/funkklingeln-dropdown-20261102-astra` ab main `6b752ca`. Aktive Laufzeit vor Änderung: `private/issue139-pricing-20261102`. Sie wird vollständig erhalten und nur das Funkklingel-Darstellungsmodul gezielt ersetzt.

## Prüfung und Veröffentlichung

**Live seit 02.11.2026.** Code-PR [#146](https://github.com/Chris83638w/gravuru-2027/pull/146), Merge `4ac66d49b321f50a378e9532ae6de5c1a8f1013d`. Die aktuelle Laufzeit `private/issue139-pricing-20261102` wurde vollständig nach `private/funkklingeln-dropdown-20261102` kopiert und ausschließlich das Darstellungsmodul ersetzt. 3.321 Dateien verglichen, 3.320 unverändert. Wrapper unverändert.

- Windows und Linux: 14/14 gezielte Tests, Build erfolgreich.
- Öffentlicher Editor 200; Bundle `editor-fea3f4e260244ff6.mjs`, SHA-256 `7ada5695644f418ec80910a9238376b5fe729423c8bd5de15fd09cd00bc82fc6`; identisch zum Linux-Build.
- Aktueller SQLite-Bestand nur gelesen: **126 Produkte, 42 Modelle, 30.240 Auswahlkombinationen, 378 Designsets, keine Abweichung**, keine Dokumentänderung.
- Alle 126 Profile haben 16 × 28, 24 × 20 und 35 × 18 cm; je 42 Hauptprodukte starten in einem dieser Formate. Weitere früher genannte Größen/acht noch ungeklärte Geräte sind in diesen 126 Profilen nicht enthalten und wurden nicht erfunden oder ergänzt.
- Aktuelle Revisionszuordnung: **15.120 aktive Bindungen, 126 Bestellfreigaben**, native Auswahl je Profil 3 Formate, 2 Positionen, 4 Rahmen, 2 Farben, 5 Befestigungen; keine Bindungs-/Datenbankschreibzugriffe.
- Lokaler Chrome-Test: Länglich/Gegenposition/Anthrazit/Silikon = 74,98 EUR. Live AOSU-Hochformat-Einstieg mit bestehendem Benutzerentwurf und neuer Dropdown-Oberfläche gesehen; Querformat-Pilot startet 24 × 20 / Anthrazit / 59,99 EUR korrekt.

## Nachgeholte Shopify-Veröffentlichung

Der zusätzliche aktuelle Admin-API-Abgleich ergab vor der Änderung: alle 126 ACTIVE, aber nur 42 im Online Store veröffentlicht; 85 korrekte `custom.customization_id`, 41 fehlend. Deshalb wurde im ausdrücklich für alle 126 freigegebenen Auftrag auch die bestehende Veröffentlichungsvorbereitung aus PR #56 weitergeführt.

Quelle: `origin/dev/funkklingeln-einstieg-vorbereitung-20261029-astra:docs/handoffs/funkklingeln-einstieg-20261029/release-plan.json`. Aktuelle Freigabe: Chris’ „Setze nun alles um“ für alle 126 und „erst online …“. Die frühere Beschränkung auf einen Marker in Issue #57 war die damalige erste Stufe; der neue Gesamtauftrag umfasst die restlichen Einstiege und Veröffentlichungen.

1. Frischen Bestand gesichert und exakt gegen die vorbereiteten Requests sowie aktuelle native Zuordnungen geprüft.
2. Die zwei bereits angebundenen AOSU-Formate veröffentlicht.
3. 41 fehlende Marker in den vorbereiteten 25/16-Batches mit `compareDigest: null` angelegt; beide Batches unmittelbar korrekt nachgelesen.
4. Weitere 82 Produkte einzeln ausschließlich auf `gid://shopify/Publication/291556688252` (Online Store) veröffentlicht; jede Mutation fehlerfrei, jede Veröffentlichung unmittelbar nachgelesen.
5. Vollständiger Abschlussabgleich **02.11.2026 15:40:59 UTC: 126 ACTIVE, 126 veröffentlicht, 126 richtige Marker, 15.120 Varianten, 0 Fehler**.

Keine Produkt-/Variantenpreise, SKUs, Templates, Theme-Dateien, Varianten oder Konfigurator-Bindungen geschrieben. 84 Veröffentlichungen und 41 Marker sind jeweils mit Request, Resultat und Nachlese im [Shopify-Journal](assets/2026-11-02-dropdown/shopify/README.md) dokumentiert.

## Nachweise und verbleibende Beobachtung

- [Gesamtprüfung](assets/2026-11-02-dropdown/live-models-check.json), [Größen](assets/2026-11-02-dropdown/sizes.json), [Bindungen](assets/2026-11-02-dropdown/binding-check.json), [aktuelle Shopify/native Zuordnung](assets/2026-11-02-dropdown/current-mapping-check.json).
- [Öffentlicher Paketnachweis](assets/2026-11-02-dropdown/live-http.json), [Shopify-Abschluss](assets/2026-11-02-dropdown/shopify/summary.json).
- [Live-Dropdowns](assets/2026-11-02-dropdown/live-desktop.jpg), [veröffentlichter Querformat-Pilot](assets/2026-11-02-dropdown/pilot-querformat.png).

**Ladehinweis bleibt offen:** Der Shop-Dialog meldete beim ersten Start ungewöhnlich langes Laden. Hoch-/Querformat luden nach „Neu laden“ erfolgreich; der längliche Pilot blieb in dieser Sitzung auch beim Direkteinstieg mit leerem Editor-Frame. Seine Veröffentlichung, Marker, 120 Varianten und native Bindungen sind korrekt bestätigt; die visuelle Startprüfung dieses Piloten ist ausdrücklich nicht bestanden. Keine neue Warenkorb-/Bestellprüfung behauptet. Die abschließende Windows-Sichtprüfung wurde durch die Browsersteuerung beendet, weil sie die Browseradresse nicht verlässlich erkennen konnte. Keine Umgehung versucht. Ein separater massenhafter HTTP-Storefront-Abruf war wegen Shopify-Schutzseiten/429 nicht aussagekräftig; Abschlusszahlen stammen aus der Admin-API.

## Rückweg

Runtime-Sicherung unter `private/funkklingeln-dropdown-20261102-nachweis/app.cjs.before`; nur bei unverändertem aktuellen Entry-SHA `fb4d860f30f05ef03b0b58075ceb5ff3ac534b8484ee4ffe6e3775964f5a3b1f` zurücksetzen, anschließend App neu starten. Alter Entry-SHA `648ef5ea2960dc927e32a72bafbb0b17b20e4ff331f56f0ac6cf437647be68e6`; vorherige Laufzeit erhalten. Shopify-Rückweg ausschließlich für die 41/84 im Journal nachweislich neu angelegten Marker/Veröffentlichungen, mit erneutem aktuellen Zustandsvergleich; bestehende 85 Marker und 42 Veröffentlichungen erhalten. Bei parallelen Änderungen stoppen, kein pauschaler Reset.
