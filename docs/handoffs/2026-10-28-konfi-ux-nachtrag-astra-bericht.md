# Nachtrag zu Konfigurator-Auftrag 2 · Astra · 28.10.2026

Auftrag: [Claude-Nachtrag](https://github.com/Chris83638w/gravuru-2027/blob/dev/konfi-ux-nachtrag-20261028-claude/docs/handoffs/2026-10-28-konfi-ux-nachtrag-astra.md). Umsetzung auf `dev/konfi-ux-20261028-astra`, [PR #41](https://github.com/Chris83638w/gravuru-2027/pull/41), weiter Entwurf. **N1–N6 umgesetzt; N7 ist wegen fehlendem aktuellen Live-Readback offen.** Kein Merge nach main, kein Import, keine Freigabe und keine Live-Änderung.

## Basis übernommen

Claude-Merge **87154acb81dc9961156cc5a4eb278890f618c9b1** wurde unverändert per Fast-Forward auf den Astra-Branch übernommen. Erster Elterncommit ist d472ba49608b86d5df102576f0158f9a89ef83a5. Die acht Merge-Dateien wurden gegen ihre Git-Blobs geprüft. Zwei Meldungen bleiben getrennt: gravuru-shop-ready beendet den Ladewächter, gravuru-shop-editor-ready blendet die Fensterleiste erst beim bedienbaren Editor aus. Bei gravuru-shop-failed bleibt Schließen verfügbar. Leere Zusatztexte bleiben entfernt.

## Umsetzung

- **N1:** Bei sichtbarer Handyhöhe unter 760 px darf die Bühne 50 % nutzen; Tastatursonderfall bleibt bei 25 %. Unten 26 px Abstand statt 60. In Optionen, Text und Motive: **351/390 px** bzw. **337,5/375 px**, jeweils **90 % Breite**. Physische Plattenmaße bleiben unverändert.
- **N2:** Handy-Zoomleiste bei Ansichtszoom 1 verborgen; nach echter Zoomgeste sichtbar und nach „Ganzes Schild“ wieder verborgen. Desktop bleibt bedienbar und bekommt Platz unter der Maßangabe. Kompakter Maßtext gilt auch im Handy-Vollbild, damit die M2-Leiste ihn nicht überdeckt.
- **N3:** Galerie hält pro konfiguriertem Store eine Liste im kleinen LRU (höchstens acht Stores, zehn Sekunden). Schlüssel enthält aktive Zuordnungsstände sowie Produkt-/Revisionsköpfe, Archiv-/Statusänderungen; vor Ausgabe erneute Kopfprüfung. Parallele Kaltaufrufe teilen denselben Aufbau. Ein Belegdigest und ein Modell je Produktrevision statt pro Variante; kein zweites resolve je Kandidat. Die Freigabe jedes einzelnen Funkklingel-Bindings wird trotz Modellwiederverwendung geprüft; die Zielprüfung wiederholt sie nochmals. Verarbeitung gibt nach je acht Kandidaten den Event-Loop frei. Nur die aktuelle Seite erhält sitzungsgebundene Tokens; im Cache liegen keine Sitzungstokens, Kundentexte oder Fotos. Alle Vorschauaufrufe teilen pro Prozess zwei Plätze und höchstens 24 wartende Aufgaben. Überlast antwortet 429; vor Ausführung werden Sitzung und Quelle erneut geprüft.
- **N4:** Galerie überspringt shop_binding_cfg_changed, shop_binding_active_integrity und shop_binding_document. Log enthält nur festen Ereignisnamen, Storekennung und Fehlercode. Ein intakter Nachbareintrag bleibt sichtbar. Exakte Auflösung beim Wechsel prüft unverändert streng und lehnt den beschädigten Eintrag ab. JSON-Schäden erhalten einen definierten Fehlercode.
- **N5:** Unbekanntes oder mehrfaches leiste wird ignoriert, damit Standard B greift. Produkt-/Variantenkennung, Signatur und andere Sicherheitsprüfungen bleiben streng.
- **N6:** Eine Wechselsitzung übernimmt höchstens die ursprüngliche Ablaufzeit. Wiederholtes Hin- und Herwechseln, Restlaufzeit unter einer Minute und bereits abgelaufene Sitzung sind getestet.
- **Ausgeblendete Motive:** Neuer Test prüft tatsächliche Preiszählung, Produktionsobjekte und erzeugtes Acryl-SVG gemeinsam. uxHidden-Motiv fehlt überall; die sichtbare Kontrollvariante kostet +169 Cent und erscheint im Export. Bestehende Produktionsfilter waren bereits richtig; kein Fertigungscode geändert.

## Prüfung

| Lauf | Gesamt | Grün | Fehler | Übersprungen |
| --- | ---: | ---: | ---: | ---: |
| Editor, vorheriger PR-Vollauf d472ba4 | 399 | 393 | 6 | 0 |
| Editor, nach Nachtrag | 400 | 394 | 6 | 0 |
| Werkstatt, vorheriger PR-Vollauf d472ba4 | 1362 | 1197 | 158 | 7 |
| Werkstatt, letzter Vollauf nach Sicherheitskorrektur | 1372 | 1207 | 158 | 7 |
| Betroffene Mobile-/Galerie-/Sitzungs-/Binding-/Export-Tests | 96 | 96 | 0 | 0 |
| Lasttest, isoliert | 1 | 1 | 0 | 0 |
| Bundle + Zoom nach letzter CSS-Korrektur | 10 | 10 | 0 | 0 |
| Webhook-Datei, isolierter Nachlauf | 5 | 5 | 0 | 0 |

Vollaufbefehle: `node --test app/configurator/variant-m/*.test.mjs` und `node --test app/workshop/*.test.mjs`. Gruppen überschneiden sich, nicht addieren.

Die sechs Editorfehler sind die bekannten Python-Startfehler (9009). Alle 158 bisherigen Werkstattfehler stimmen nach Normalisierung temporärer Verzeichnisnamen in Testname und führender Fehlersignatur überein (Python-/Worker-Folgefehler). **In einem Zwischenlauf trat zusätzlich einmal ECONNRESET im unveränderten Test „oversized and slow request bodies…“ auf.** Diese Datei bestand unmittelbar danach unverändert 5/5; im vorangehenden Vollauf bestand dieser Test ebenfalls. Dieser Zwischenlauf hatte 1205/1371 grün, 159 Fehler und 7 Skips. Der abschließende vollständige Lauf nach der zusätzlichen Freigabeprüfung hat wieder genau die 158 bekannten Fehler, keine zusätzlichen.

Der übernommene neue iOS-Sicherheitstest verwendete einmal einen Windows-Pfad als dynamische Importadresse. Korrigiert auf pathToFileURL; alle seine Assertions bleiben bestehen. Keine Tests gestrichen. Claudes **1760/1760 auf Linux** gelten für den vorher geprüften Auftrag-2-Stand, nicht als Linux-Nachweis dieses Nachtrags. Neuer Linux-Vollauf bleibt zur Gegenprüfung bei Claude.

Build geprüft: 76 Ressourcen, 108 Module, 14 Styles, Bundle editor-4217e9ec071b1566.mjs, 1.157.139 Bytes / 379.045 gzip. Keine Schriftdateien hinzugefügt. Textdateien LF.

## Lasttest mit 150 aktiven Bindungen

Reproduzierbar: `node --test app/workshop/shop-design-gallery.load.test.mjs`. Echte temporäre SQLite-Datenbank, echte Aktivierungs-/Bindingprüfung, zwei synthetische Produktbelege mit je 75 Bindungen und je einem 699.182-Byte-Materialbild, 40 deduplizierte Karten. Lokaler HTTP-Aufruf einschließlich strenger Quellauflösung; keine Shopify-Verbindung.

| Messgröße, isolierter Windows-Lauf | Kalt | Warm |
| --- | ---: | ---: |
| Antwort erste Seite | 723,69 ms | 22,66 ms |
| Maximale Event-Loop-Verzögerung | 41,06 ms | 15,77 ms |
| Modelle neu gelesen | 2 | 0 |

Kein doppeltes resolve für die Kandidaten. Zahlen sind lokale Messwerte, keine Zusage für die Live-Hardware. Laufzeitgrenzen sind bewusst keine flüchtigen Timing-Assertions; Modellanzahl, 150 Bindungen, 40 Karten, Cache-Wiederverwendung und fehlende Doppelauflösung werden assertiert. Revisionswechsel, gleichzeitiger Kaltaufbau, Tokenisolation, TTL und Warteschlangengrenze sind separat getestet.

## N7: D8-Preisvertrag – aktueller Live-Stand nicht bestätigt

Betroffen: Shopify-Produkt **16077798965628**, Variante **57265913332092**. Der öffentliche Modell-Readback enthält den internen priceMode nicht. Der vorhandene Plesk-Zugang lieferte beim ausschließlich lesenden SQLite-/Node-Befehl **HTTP 500**; kein Datenresultat. Historische Exporte mit extraMotifCents=0 sind **kein heutiger Nachweis**. Deshalb werden Modus, Centwert und aktueller eigener `$app.personalization`-Stand hier nicht geraten. [Konkrete Rückfrage an Claude im PR](https://github.com/Chris83638w/gravuru-2027/pull/41#issuecomment-6472098127).

Aus dem geprüften Code folgt unabhängig davon:

1. Eine reine Codebereitstellung ändert keinen gespeicherten Produktbeleg und keine aktive Preisbindung. Ein historischer Stand mit 0 Cent würde dadurch nicht automatisch 169 Cent berechnen. Die neue Regel gilt bei neu vorbereiteten Produktständen: Vorlage inklusive, zusätzliches/geändertes Motiv +169 Cent.
2. Rechnet ein neuer Beleg +169 Cent, fehlt aber die passende Aufpreisbindung, wird die kostenpflichtige Änderung mit „derzeit noch nicht bestellbar“ gesperrt; der Entwurf bleibt erhalten. Ein gespeicherter Aufpreisvertrag mit abweichendem Centwert besteht die Vertragsprüfung nicht (cart_personalization). Der Warenkorb darf keinen unbestätigten Preis erhalten.
3. **Erst nach Chris’ Live-Satz:** Aktiven D8-Stand mit der besitzenden Shopify-App lesen; Preis-Metafeld, Cart Transform, Grundpreise/Varianten und gespeicherten Vertrag gemeinsam abgleichen. Falls nötig neuen versionierten D8-Produktstand mit additional/169 und passenden Personalization-Vertrag vorbereiten, denselben 169-Cent-Vertrag im Shopify-Metafeld und kompatiblen aktiven Cart Transform sicherstellen, exakt diese neue Revision binden/aktivieren. Keine bestehende Bindung überschreiben. Danach Vorlage ohne Zusatz und Vorlage mit Zusatzmotiv bis zum echten Warenkorb prüfen (+1,69 €; keine Bestellung). Ob der Transform selbst geändert werden muss, hängt vom fehlenden aktuellen Readback ab.

## Bilder und Grenzen

[20 Desktop-/Handy-Bilder mit Direktvergleich](konfi-ux-20261028-nachtrag-astra/README.md), [Messungen](konfi-ux-20261028-nachtrag-astra/messungen.json), [Prüfsummen](konfi-ux-20261028-nachtrag-astra/manifest.json), [Testdaten](konfi-ux-20261028-nachtrag-astra/pruefung.json).

Desktop 1440 × 900; Handys 390 × 664 und 375 × 548. Lokaler Chromium-Browser mit echten gerenderten D8-Daten, keine Safari-Geräteprüfung. Normalansicht, Text, Motive, Zoom/Einpassen und M2-Vollbild dokumentiert. Kein neuer Live-Warenkorbtest, keine Veränderung einer Kundengestaltung. N7-Readback, Linux-Gegenprüfung und Chris’ Bildabnahme bleiben offen; PR bleibt Entwurf.
