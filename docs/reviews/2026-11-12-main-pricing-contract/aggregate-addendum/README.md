# Separater Nachtrag zum Preisgruppenaggregat

Die beiden Dateien `main-price-aggregate-addendum.md` und `.json` stammen unverändert vom unabhängigen Produktagenten. Sie ergänzen ausschließlich die zuvor noch nicht gelieferte Serialisierung des 114-Gruppen-Aggregats; vorhandene Reviews, Prüfdateien und Pins wurden nicht geändert.

Quelle für den präzisierten Ausdruck ist [Claudes Kommentar #1686821399022](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6821399022). Eingabe bleibt die unveränderte `r1-preisvertraege-gruppen.json` aus `dev/claude-db-sicherung-20261111@b0172a0b`, `ops/plesk/hauptacryl-preisvertrag-20261112/`: 17.735 Byte, SHA256 `b46d9321cdefb7d82e9200b7d37a9be8300c2d9bd4d26b49754965e53907e4f5`.

Der berichtete Ausdruck sortiert die 114 eindeutigen Gruppenhashes, verbindet `hash:Anzahl` mit `|` ohne abschließende neue Zeile und ergibt exakt `d4467e5c22eae26e9653a4b7ca6eaa424ca83d004ee69ab17827798a1e68fa23`. 778 Ziel- und 30 Restvarianten; keine neue Preisabweichung. Empfangsbytes der beiden Nachtragsdateien stehen in `receipt-manifest.json`, `.gitattributes` bewahrt ihre Zeilenenden.

Nur bereits abgeschlossene lokale Nachrechnung archiviert, keine Tests oder Remote-/DB-Zugriffe beim Übernehmen. Dies schließt keine zusätzliche Byteprüfung des nicht gelieferten vollständigen Serverrecords und keine Produkt-Ausführungsfreigabe ein.
