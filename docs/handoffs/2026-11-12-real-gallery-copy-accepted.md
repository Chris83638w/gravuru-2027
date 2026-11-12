# Echte Galeriekopie bestanden; tatsächlichen Host prüfen

12.11.2026, Codex/Astra. Runtime bleibt exakt `f85390bd3494920679b06c3b39cabf96c95c1343`. Dieser Nachtrag ändert nur den belegten Status und die nächste Abnahme, keinen Programmcode. [Entscheidung an Claude](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6816888138).

## Entscheidung zum Speicherabstand

Der [Operatorbericht von 07:18 Uhr](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6816307301) erfüllt das vereinbarte begrenzte Kopienkriterium. Cold und separater Reopen endeten mit Exit0; gespeichert/wiederverwendet, Quelle unverändert. Die gemeldeten Prozessspitzen betragen 1.531,7/1.610,7 MiB unter dem unveränderten 1.800-MiB-Prozesswächter. Der kleinste Abstand ist 189,3 MiB. Das reicht zur Abnahme genau dieses Tests, noch nicht als alleiniger Betriebsnachweis. Keine weitere Optimierung oder Wiederholung desselben Benchmarks auf Verdacht. Jetzt den bereits vereinbarten isolierten tatsächlichen Zwei-Store-Host mit nativer Sitzung prüfen.

| Beleg | Cold | Reopen |
|---|---:|---:|
| Gesamtzeit inklusive Werkzeug-Dateihashes | 70,3 s | 12,6 s |
| Prozessspitze | 1.531,7 MiB | 1.610,7 MiB |
| Konto-RSS-Summenspitze | 3.598 MiB | 3.835 MiB |
| Ergebnis | cache_saved, Exit0 | cache_hit, Exit0 |
| Globaler cardFor-Modellaufbau | 242 | 0 |
| Cachepayload | 14.254.081 Bytes | unverändert |

Quellkopie vor/nach beiden Läufen: `487c9f5238f0ebd1ce88437e3661e9790c589512fc187d4ddc6cded5e2095bc4`. Bindungsphase81,221→33,437s; reine Dokumentlesezeit58,705→10,847s. Aufbau245.830Karten in57,164s **einschließlich** Bindungsphase, Speicherung4,233s. Laufende R15 blieb unverändert, Kundenmodell danach laut Claude HTTP200. Dies sind aktuelle Operatorbelege, keine eigenen Servermessungen.

## Aktualisierter Messrahmen und Aussagegrenzen

Der historische 3,3-G-Kontowächter aus der ersten Übergabe gilt für diese zweite Messreihe nicht mehr. Claude hat [Chris' spätere Speicherentscheidung dokumentiert](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6815624140), danach PMEM12G zurückgelesen und den Kontowächter mit6.500MiB RSS-Summe verwendet. Astra hat keinen dieser Werte geändert. Konto-RSS-Summe und CloudLinux-PMEM sind getrennte Messgrößen. Das1800-MiB-Prozesskriterium blieb unverändert.

`cache_hit` erscheint erst nach SQLite-Read, MAC-Prüfung und Rekonstruktion der vollständigen Karten-Maps; 708MiB ist deshalb kein Wert vor der Galeriearbeit. Auch `cache_miss` folgt dem ersten Startproduktdurchgang. Null `lightweightProductReads` bezeichnet nur den entfallenen globalen cardFor-Aufbau: beide direkten list-Proben lesen/parsen das Startprodukt und lösen die feste Bindung weiter nativ auf. Die208Treffer/40Seiteneinträge gehören zur vom Werkzeug gewählten LIMIT1-Bindung, nicht automatisch zum Hauptacryl. Die genaue Phase des Reopen-Maximums bleibt im veröffentlichten Bericht offen. [Unabhängige Quellenabgrenzung](../reviews/2026-11-12-real-gallery-copy-accepted/benchmark-post-success-readreview.md).

## Nächste echte Abnahme, bereits beauftragt

Claude führt einen begrenzten tatsächlichen Zwei-Store-Host auf getrennten Wegwerfkopien aus. Vorher: private Fabrik-/Releasepins, alle aufgelösten DB-/Lock-/Preview-/Worker-/Buildpfade sowie wirksame Hostoptionen/TTL und Prozess-/Kontowächter benennen. Legacy-Sicherung ist inzwischen vorhanden; das ersetzt die Pfad-/Hostverdrahtung nicht. Originalbackups bleiben unverändert.

Native signierte Sitzung für Hauptacryl16190784602492/Variante58104626479484 sowie einen belegten bestehenden Legacykopf; cfg/Revision/Optionen/Preis prüfen. Mindestens60s mit unveränderter tatsächlicher TTL, Modell/Galerie/Suche und benötigten Entry-/iframe-Ressourcen zu Beginn und Ende, erlaubte Preview-/Designwechselpfade, kleine begrenzte parallele Leseprobe. Native Negativauth, gleiche Prozessidentität ohne Neustart/503/Wächterabbruch, Speicherverlauf und Phasen belegen. Keine Cart-/Order-/Shopify-Nebenwrites; Kopienmigrationen und abgeleitete Cachewrites getrennt ausweisen. Ein reiner Entry-Harness ist kein vollständiger Mischhostbeleg. [Unabhängige minimale Hostabnahme](../reviews/2026-11-12-real-gallery-copy-accepted/full-host-next-step-20261112-review.md).

Direkte Chatverbindung zu Claude am Morgen wieder nutzbar. Astra hat den Auftrag im bestehenden Chat gesendet; anschließend war seine laufende Bearbeitung des Sitzungsdrivers sichtbar. Keine neue Nutzerentscheidung für die Kopientests angefordert. Frühere Programmfreigabe „Ja, umschalten und prüfen“ bleibt dokumentiert; tatsächliche Vollhostabnahme und konkreter Rückweg sind vor der Umschaltung erforderlich. Keine Produktänderungs-/Veröffentlichungsfreigabe daraus ableiten.

## Produktunterlage nach dem nativen Kopienreview

[Legacy- und Kategorienbelege](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6811910513) schließen die früheren Leselücken: alle126 betrachteten Varianten ohne Treffer im Legacyregister; zusammen mit Acryl bleiben45 Bindungen ausschließlich an den beiden Mehrgrößenprodukten,81 Kandidaten in beiden Registern ungebunden. Das ist keine Auswahl oder Freigabe von sechs Kleinproduktzielen und keine Erlaubnis,16 ACTIVE-Produkte zu überschreiben.

Vollständiger Kategorienbericht57.874Bytes SHA `52a8c92658d09e234761ffa2767769a361c940c30b5606ff6330ce0be5984381`; Acrylidentitäten SHA `d085ede084fc8d4e9a0f7d41318c57a9c4e3573f0dbff2a76211e67eeb10f0e6`; Legacyidentitäten SHA `95ce8f304fc341190215b85c54b9f88d0bce252c947b372a2075584cfd53aa01`. Vollartefakte bleiben beim Operator, diese Dateihashes wurden von ihm berichtet.

Nach `captureUpdateObservation` im tatsächlichen nativen Kopienkontext (feebb04 + bf919f1) entstehen der echte Hauptupdate-Review und der versionierte XLSX-v7-Nachtrag. Bis dahin bleiben produktive reviewHash/approvalHash null; keine simulierten Freigabepins. Namen/Kategorien/H1/808 IDs erhalten,778 Zielbindungen plus30 Restvarianten, v9 und v6 historisch unverändert. Preise inklusive19%, Uploads und Startdesigns sind entschieden und werden nicht erneut abgefragt.

[Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md); keine Designänderung dieses Nachtrags. Zähler:0 neue/geänderte Shopprodukte,0 Veröffentlichungen,0 Server-/App-/DB-Schreibvorgänge durch Astra; reine Auswertung, Dokumentation und autorisierte Abstimmung. Keine zusätzlichen Tests erforderlich, da kein Programmcode geändert wurde.
