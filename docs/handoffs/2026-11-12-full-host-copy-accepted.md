# Tatsächlicher Vollhost-Kopienlauf angenommen

12.11.2026, Codex/Astra. Runtime unverändert `f85390bd3494920679b06c3b39cabf96c95c1343`; dieser Nachtrag enthält keine weitere Programmänderung.

## Beleg und Ergebnis

Claude berichtet in [#168, 08:11](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817244215) drei erfolgreiche isolierte Sitzungen über den tatsächlichen CJS-Einstieg, mit einer Kopie des tatsächlichen älteren Legacy-Releases und beiden gesicherten Store-Datenbeständen. Prüfwerkzeuge: `dev/claude-db-sicherung-20261111` bei `3e5d1164`, `ops/plesk/vollhost-f85390b/`. Native Signaturen und Sitzungsprüfungen blieben aktiv; synthetisches App-Secret, kein KI-Anschluss, nur Loopback erlaubt. Sicherungsquellen nach jedem Lauf unverändert.

| Messung | Erststart | Neustart | Edelstahl |
|---|---:|---:|---:|
| Sitzungsdauer | 68 s | 67 s | 65 s |
| Hostspitze einschließlich Kinder | 2.152 MiB | 1.042 MiB | 1.169 MiB |
| Konto-RSS-Spitze | 4.475 MiB | 3.359 MiB | 3.492 MiB |
| Galerie | alter v2 ungültig, Aufbau und v4 gespeichert | v4 getroffen | v4 getroffen |
| Ende | Exit 0 | Exit 0 | Exit 0 |
| Geblockte Netzversuche | 0 | 0 | 0 |

Der vorab angekündigte Rahmen war 4.000 MiB für Host samt Kindern und 8.000 MiB Kontosumme bei tatsächlich 12 G Konto-PMEM. Das ist ein eigener Vollhost-Rahmen und ersetzt nicht nachträglich das 1.800-MiB-Kriterium des zuvor bestandenen einzelnen Galeriebenchmarks. Kalter Aufbau: 245.830 Karten aus 242 Produkten und 16.680 Bindungen, 65.286 ms einschließlich 38.360 ms Bindungsprüfung; Speichern 4.090 ms. Die längste Halteantwort betrug 3.777 ms während des Speicherns, die übrigen Sitzungslesungen blieben ebenfalls erfolgreich.

Hauptacryl `16190784602492 / 58104626479484` löste weiterhin cfg `cfg_8e7ebe96-28d2-406f-b31e-036ee61f47e0` Revision 1 auf. Seine Galerie hatte genau eine Karte. Die zusätzliche Edelstahlidentität `16190784438652 / 58104606556540` lieferte 21 Karten, zwei Treffer für „herz“ und null für eine erfolglose Suche. Vorschau, Designwechsel und anschließendes Modell waren erfolgreich. Fehlende Sitzung, fremde Origin und falsche Signatur wurden nativ mit 403/403/401 abgelehnt.

## Annahme und Grenzen

[Astra hat den begrenzten Hostbeleg angenommen](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817300694). Zwei unabhängige Lesereviews bestätigen: keine Wiederholung derselben drei Sitzungen und kein zusätzlicher Codefix auf Verdacht erforderlich. Belegt ist der korrigierte Kandidat unter den gemessenen 12-G-Bedingungen. Eine ausschließliche Ursache-Wirkung-Zuordnung zur Speichererhöhung wäre zu stark: Galeriecodec und Bindungslesungen wurden ebenfalls korrigiert.

Beide Store-Kontexte wurden konstruiert; die zusätzlich geprüfte Edelstahlidentität gehört gleichfalls zum Acryl-Store und ersetzt keinen nativen Kundeneinstieg einer vorhandenen Legacy-Identität. Der Werkstatt-Katalogarbeiter meldete lediglich Bereitschaft; sein eigener 2.200-MiB-Deckel und Lastverhalten sind damit nicht abgenommen. Die echten Passenger-/LiteSpeed-/Shopify-Proxy-/iframe-/Assetpfade gehören zur direkten Nachprüfung der Umschaltung, einschließlich PC, Handy, mindestens 60 Sekunden Sitzung und bestehendem Legacy-Kundeneinstieg. Cart, Order, Draft, Upload und Webhook waren ausdrücklich außerhalb dieses Tests. Die Statistikmigration erfolgte nur in der Wegwerfkopie, ohne eigenes Hostlog-Ereignis.

## Freigabestand und nächster Schritt

Astra übermittelte als Agent das exakte bereits erteilte Nutzer-Ja „Ja, umschalten und prüfen“, ohne ein neues Nutzer-Ja zu behaupten. [Claude verlangt für den erneuten Versuch eine neue Zustimmung](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6817323556): Die gestrige genehmigte Umschaltung sei bereits ausgeführt und zurückgenommen worden. Diese Grenze wird nicht umgangen; eine konkrete Frage zum jetzt dreimal geprüften Programmstand wurde dem Nutzer gestellt. Bis zur Antwort keine neue Aktivierung behaupten. Danach führt Claude frische Sicherungen, angekündigtes Umschaltfenster, echte Nachprüfung und nötigenfalls Rückweg aus. Produktänderungen und Veröffentlichung gehören nicht zu dieser Programmfreigabe.

Unabhängig davon führt Claude jetzt `captureUpdateObservation` im tatsächlichen nativen Kontext auf einer neuen Kopie aus. Danach wird die [vorbereitete Haupt-v7-Unterlage](2026-11-12-main-v7-preparation.md) mit echten Reviewpins und einer neuen, alte Blätter erhaltenden Exceldatei abgeschlossen. Keine Platzhalterfreigabe und keine erneute Abfrage bestätigter Geschäftsentscheidungen.

[Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Designänderung. Dieser Dokumentationsnachtrag führt keine Tests, Shop-/DB-/Serveränderungen oder Veröffentlichung aus.
