# Gesamtbestand: geprüfte Lieferung und additive Galerieübernahme

Arbeitsbranch `dev/astra-gesamtbestand-galerie-20261106`, auf Mikas Code-PR #185 (`fa48154232816c8a31768107208231d5c190e574`). Dieser erste Stand enthält den geprüften Übernahmeweg und die Materialauswahl. Die private Hostbereitstellung und sichtbare Bedienabnahme sind noch offen; der laufende isolierte Import wird unten mit eigenen Nachweisen abgeschlossen. Kein main-Merge, keine echte Designfreigabe, keine Shopify-Schreibzugriffe.

## Auftrag und fachliche Quellen

- Chris erweitert ausdrücklich auf alle vorhandenen Materialien, Themen, Formen, Größen und Rohlinge; alles per Skript/API. [Claudes konkreter Auftrag in #85](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6688988751) bestimmt die Reihenfolge und die ausgeschlossenen Blocker. [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md): Originalgestaltung erhalten, Motive und Proportionen nicht verändern.
- Kataloglieferung #184: `86c1ff5f431acfe60d4cff388958112187005550`, Quellen-main `3c6051fbbc7904969948950fae12cae2ae663f30`. Maße, Materialstärken, Familienoptionen und Preise kommen aus den gepinnten Familien-/Linienquellen. Acryl-Türschildfamilien sind tatsächlich 3 mm; die separaten AA/AS-Familien sind 5 mm und werden nicht damit verwechselt.
- Chris erlaubt dokumentierte Ersatzschriften. Bereits in den SVGs angewandte Einpassung wird nicht nochmals multipliziert. Unklare Ersatzschriften und native Darstellungshinweise bleiben sichtbar.
- Original-ID ist die Karten-/Kommentaridentität. Material und Quell-Format bilden zusammen mit der Original-ID den Freigabeschlüssel. Mehrere Themen, zusätzliche Materialziele und die 1.065 reinen Masterverweise erzeugen keine neuen Originale. Historische Quellenfreigaben sind keine Galerie-OKs.
- Unterkategorien bleiben wie geliefert; Chris' Soll-Liste fehlt. B3-Umbauten, Foto-/Verfahrensentscheidungen und echte Quellenblocker werden nicht stillschweigend erledigt.

## Bereits geprüft

[Vollständiger unabhängiger Lieferaudit](../reviews/2026-11-06-gesamtbestand/delivery-audit.md): 55.293/55.293 Dateien stimmen mit SHA-256 und Git-Blob, 219 Stapel, 19.450 prüfbare Designversionen, 1.065 Masterverweise und Zielmaße konsistent. Die fehlende zentrale Fontbewertung ist [bei Claude angefragt](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6690167422); vorhandene Warnungen werden vollständig beibehalten.

Erster vorbereiteter Stapel `1-tuerschilder-edelstahl-acryl--andenkenschilder`: 109 Originale, 1.926 explizite native Ziele (642 je Material), 240 neue feste Prüfproduktgruppen in 100/100/40-Teilen. Unabhängig gegen Quelle geprüft: alle Originalbytes, Ebenenanzahl/-reihenfolge/-typen, native Herkunft, proportionale Skalierung, Materialien und Zielmaße. 167 neue Rohlinge ergänzen 73 bereits vorhandene Pilotrohlinge. 216 Ziele haben den nicht blockierenden Status `prüfen`; diese Hinweise sind jetzt mit Material und Größe auf der Karte sichtbar.

Der bisherige Online-Snapshot wurde aus der vorhandenen Sicherung separat extrahiert und nochmals vollständig geprüft: 2.761 Dateien, 325 Originale, 35 Produkte, fünf Datenbanken. Auf einer neuen Testkopie sind Pilot und alle drei Andenken-Teile erfolgreich addiert: 462 Originale, 370 bearbeitbar, 2.449 vorbereitete Ziele, 348 Gruppen und 240 Rohlinge. Alle vier Wiederholungen sind No-ops; 35 alte Produktköpfe/-historien, Mapping und Profil-/Kommentar-/Freigabedateien sind unverändert. Drei echte Materialproben von `TRE-V2A-5x2-D401` liefern native Vorschauen, gültige Fingerprints und unveränderte Revisionen bei Positions-No-op. [Sanitisierter Nachweis](../reviews/2026-11-06-gesamtbestand/isolated-import-proof.json). Browser- und vollständige Laufzeitabnahme folgen; diese Kopie darf niemals als aktuelle Nutzer-DB online installiert werden.

Gemeinsamer gezielter Node-Lauf: 61 bestanden, 0 Fehler, 1 optionaler Echtdaten-Test ausgelassen. Derselbe Echtdaten-Test wurde separat mit dem tatsächlichen Andenkenpaket ausgeführt: 9/9 einschließlich der acht vorbereitenden Tests, kein Skip; alle 240 rehydrierten Produktdokumente und 1.926 Ziele bestanden. Zusätzliche unabhängige Reviewprüfung fand die nun behobenen unsichtbaren Fit-Hinweise.

## Änderungen

- `audit-design-batch-delivery.mjs`: vollständiger Liefer-/Git-Byte-/Versions-/Referenz-/Dry-run-Abgleich. Leere Liefer-Dry-runs gelten ausdrücklich nicht als Nachweis gegen die vorhandene Galerie.
- `prepare-design-batch-review.mjs`, `design-batch-plan.mjs`: native Vorbereitung aus Lieferform 2; getrennte Schriftdateien, unveränderte SVG/JSON-Originale, Quellenbelege, explizite Familienziele. Bestehende Pilotziele werden wiederverwendet. Keine Fotos oder unbekannten Materialadapter werden als fertig ausgegeben. Höchstens 100 neue Produktgruppen je Teilpaket.
- `extend-design-review.mjs`, `extend-slate-original-review.mjs`: gleiche Original-ID darf nach Prüfung gleicher Quellen neue disjunkte Ziele erhalten. Bestehende Ziele/Produktköpfe/Metadaten bleiben erhalten. Journalgesicherte neue Gruppen und vollständiges Rücklesen vor Veröffentlichung des neuen privaten Mappings; identische Wiederholung ist ein No-op. Byteidentische Schriften mit verschiedenen Paketpfaden dürfen denselben vorhandenen Eintrag verwenden.
- Zielauflösung, Positions- und Freigabeadapter unterscheiden konkrete Materialvariante, Dicke, Familie, Original-ID und Maße. Bisherige Schiefer-/Pilot-Schlüssel bleiben bytegleich.
- Freigabeauflösung hält höchstens zwei vollständige Produktdokumente. Der kalte Durchlauf gruppiert Ziele nach Produkt; warme Fingerprints werden nur mit aktueller, mandantengeprüfter `repository.head`-Revision wiederverwendet. Der Fingerprintalgorithmus ist unverändert. 54 vorhandene/neue gezielte Tests einschließlich 7 zuletzt geschärfter Kopf-/Cachetests bestanden; bei fünf synthetischen Produkten fünf kalte Dokumentlesungen, danach null warme. Echte Vorher-/Nachher-Fingerprints und Laufzeiten werden vor Hostbereitstellung geprüft.
- Eine Karte mit Material-/Formatwahl; globaler Materialfilter wählt das tatsächliche native Ziel. Unsaved Inline-Bearbeitung und Rückkehr aus dem Voll-Konfi bleiben beim genauen Ziel. Gespeicherte Auswahl verwendet native Identitäten statt anfälliger Listenpositionen. Offene Materialziele zeigen ihren Grund ohne falsche Vorschau oder Bearbeitungslink. Zielbezogene Fontwarnungen und Fit-Hinweise bleiben sichtbar.
- Das Plesk-Codepaket enthält zusätzlich die vier von Mika eingeführten Editor-/Verwaltungsmodule; ohne diese Ergänzung hätte der Galerieimport des extrahierten Pakets gefehlt. Der extrahierte Startnachweis folgt vor einer Hostbereitstellung.

## Laufende und offene Schritte

1. Sichtbare PC-/Mobilbedienung und echte Kalt-/Warm-Messung nach der Speicherbegrenzung abschließen. Gegenwärtige lokale `workshop.sqlite` hat bereits etwa 2,4 GB; Laufzeit und Speicherbedarf müssen vor größerer Übernahme gemessen werden. Die Größenangabe allein beweist weder einen Ausfall noch Onlinefähigkeit. Langfristiger Ressourcenpunkt: 240 Andenken-Dokumente enthalten 1.656.286.500 Bytes Fontkopien, obwohl die 15 vollständigen Schriftkörper zusammen nur 8.594.405 Bytes brauchen. Dies ist [Mika gemeldet](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6690475134); keine ungetestete Ressourcenmigration oder Glyphenreduktion vorgenommen.
2. Die übrigen `1-tuerschilder-edelstahl-acryl--*`-Stapel werden in Lieferreihenfolge vorbereitet. Der aktuelle Adapter ist bewusst auf diese drei nachgewiesenen Türschildfamilien begrenzt; spätere Materialien benötigen passende geprüfte Adapter. Noch keine pauschale Bearbeitbarkeit der 20.598 Registereinträge behaupten.
3. Eigenen gestapelten Draft-PR und geprüftes Laufzeitpaket liefern. Für private Onlineübernahme ausschließlich einen frischen tatsächlichen Hoststand additiv erweitern, keine alte lokale Test-DB übertragen. Site 19, keine Shop-/Kundeninstanz.
4. Nach Übernahme je Stapel Anzahl/Abweichungen in #85 und relevante Konfi-Befunde in #168 melden, mit Original-ID und echten Konfi-Screenshots. Sichtfreigaben bleiben bei Chris.

Der Renderer-Code unterscheidet sich gegenüber dem derzeitigen Online-Stand `76053a2f`. Vorhandene Freigabeereignisse bleiben erhalten; eine notwendige erneute Sichtprüfung aufgrund geänderter Renderer-Fingerprints wird nicht durch Abschwächen des Schutzes umgangen.

## Reproduktion

```text
node scripts/audit-design-batch-delivery.mjs --katalog <gepinntes-Quellcheckout> --out <neuer-Prüfordner>
node scripts/prepare-design-batch-review.mjs --katalog <gepinntes-Quellcheckout> --batch 1-tuerschilder-edelstahl-acryl--andenkenschilder --base <bestehendes-Pilotmanifest> --out <neuer-Paketordner> --font-cache <privater-Konvertierungscache>
node scripts/extend-design-review.mjs --base <bestehende-Testgalerie> --addon <neues-Teilpaket> --data <isolierte-Testdaten> --gallery-out <neuer-kombinierter-Galerieordner>
```

Private Rohdaten und Testdaten liegen außerhalb Git unter `work/gesamtbestand-delivery-audit-20261106-v2`, `work/design-batch-andenken-test-v1` und `work/gesamtbestand-test-20261106-v1`. Die bereits vorhandene Gesamtsicherung bleibt unverändert; [ihr gesicherter Einstieg](https://github.com/Chris83638w/gravuru-2027/blob/2d8addbf53f65db404fc3437503bfaaed09a8698/GALERIE-START-HIER.md) enthält Wiederherstellung und ältere Nachweise.
