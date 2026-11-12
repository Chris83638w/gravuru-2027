# Sechs Kleinproduktakten · Kopienreview vom 12.11.2026

Sechs neue versionierte Akten verbinden die unveränderten bisherigen v9-Unterlagen mit den tatsächlich gespeicherten Kopienplänen: Acryl 5 × 2 / 6 × 2 / 8 × 2 jetzt Akte **v5**, Edelstahl in denselben Größen jetzt **v4**. Je Akte steht das neue Blatt `Kopienplan` zuerst. Die Hauptproduktakte v7 bleibt unverändert.

Diese Unterlagen sind **keine Produktfreigabe**. Alle neuen cfg-/pgt-/pgp-/cmp-/prf-Kennungen gelten ausschließlich für Claudes isolierte Kopie. `confirm:0`, `execute:0`, `approvalHash:null`; keine Shopify-Anlage oder -Änderung, keine Veröffentlichung. Die späteren tatsächlichen Produktivpläne und die passenden Akten müssen ausführungsgebunden vorliegen.

Quelle ist [Claudes tatsächlicher Recordbeleg #1686819660449](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6819660449), Commit `75a304ebfa86ce3a5302c5940107a6e010be8322`. Die großen Records wurden lokal aus v9 mit den gelesenen Kopienkennungen rekonstruiert. Ihr semantischer Inhalt ist über den **Gesamtdigest der 44 kanonischen Werte**, sechs native Gesamtplanhashes und sechs Planlängen gegen die Serverbelege geprüft. Einzelne Serverhashfelder stehen nicht nochmals separat in der lokal verkürzten Kompaktdatei; kein zusätzlicher Einzelvergleich sämtlicher Originalserverfelder wird behauptet. Gzip- und Einrückungsbytes sind **keine Server-Bytekopien**. `Records-Empfangspruefung.md/.json` erklärt den unabhängigen Vergleich und seine Grenze. `TESTBELEG-sechsgruppen.json` selbst wurde nicht mitgeliefert und wird nicht fingiert.

Die nativen Revisionsmetadaten der Kopie enthalten Ressourcenauflösung und `productionProfile:null`, jedoch keine historischen `businessDecisions`. Die bestätigten Bruttoangaben einschließlich 19 % MwSt., Staffeln, Starts und Uploadentscheidungen bleiben in den erhaltenen v9-Blättern belegt; das neue Blatt nennt sie mit dieser Herkunft.

## Prüfung

- **45/45** vollständige Varianten-/Options-/Preiszeilen identisch zu v9: Acryl 10 je Akte, Edelstahl 5 je Akte.
- **3.711 Originalzellen** und **5.163 Vorgängerzellen** einschließlich Formeln unverändert.
- Je Akte **24 bestehende Paketparts bytegleich**, darunter sämtliche alten Worksheet-, Table- und Relationparts. Nur die vier notwendigen zentralen Paketparts wurden ergänzt, dazu genau ein neues Arbeitsblatt.
- Alle sechs Plan-/Quell-/Vorlagen-/Modulprofilpins nachgerechnet und mit den tatsächlichen Kopienpins verglichen. `creationKey` bleibt `issue230-` plus **ursprünglicher** Preisakten-SHA; der neue XLSX-SHA wird nicht zurück in die Planung gespeist.
- 27 Designs je Gruppe, bestätigte 13 Motive in gleicher Reihenfolge, Starts, Foto/Logo AUS und alle Originalressourcen unverändert.
- Alle sechs fertigen XLSX mit Artifact erneut importiert; neue Zellen geprüft und insgesamt **18** Bildausschnitte tatsächlich gelesen. `Sichtpruefung.json` ist der automatische Beleg (`visuallyReviewed:false`), `Visuelle-Pruefung.json` die getrennte tatsächliche Sichtprüfung.

Die beiden Artifact-Prozesse lieferten nach vollständiger Ausgabe jeweils Exitcode **1**, ohne zusätzliche Fehlermeldung. Das ist ausdrücklich kein grüner Prozessabschluss. Die fertigen Dateien bestanden die getrennte ZIP/XML-/Zell-/Preiserhaltungsprüfung (Exit 0) sowie Reimport, Rendering und manuelle Sichtprüfung. Ursache des Prozessendes nicht festgestellt; keine Runtime-/Abhängigkeitsänderung vorgenommen. Details: `Laufnachweis.json`.

`Manifest.json` bindet jede neue Akte an Original, Vorgänger und tatsächlichen Kopienplan. `Eingabepins.json` bindet die empfangenen Recorddateien; `appendix-index.json` enthält den exakten neuen Blattinhalt. `Paketmanifest.json` nennt ausschließlich die fertigen Lieferdateien; Zwischen-XLSX, erste Renderbilder und automatische Inspect-Ausgaben gehören nicht zur Lieferung.

Unabhängiger Abschluss: Der Agentenreview prüfte die empfangenen nativen Records und ihren 44-Werte-Gesamtdigest (`Records-Empfangspruefung.md/.json`). Root prüfte anschließend alle sechs fertigen XLSX unabhängig per Python-ZIP-Lesevergleich: Manifest-/Quellhashes, je 24 alte Parts bytegleich, bisherige Blattattribute/-reihenfolge erhalten und neue Plan-ID/planHash/creationKey im hinzugefügten XML (`Root-Pruefung.json`, `review-six-xlsx-root.py`). Seine zusätzliche Sichtstichprobe umfasst drei Bilder: Acryl 5 × 2 Seiten 1 und 3 sowie Edelstahl 8 × 2 Seite 1. Die vollständige Sichtprüfung aller 18 Bilder stammt separat vom erstellenden Agenten. Die vorhandenen ACTIVE-/Mehrgrößenprodukte bleiben unverändert; keine erneute Altprodukt-Auswahl wird vorausgesetzt.

Reproduktion: `work/restabschluss/six-plan-excel/README.md`. Nur in einer isolierten Arbeitskopie mit neuem Ausgabeverzeichnis wiederholen. Die fertigen Akten und Belege nicht überschreiben. Native Kopienpläne werden durch die Excelwerkzeuge weder erzeugt noch bestätigt oder ausgeführt.
