# Reproduktion v9

Nur lokale Planung. Keine confirm/execute-, Shopify- oder Serveraktion. Ein NEUES Ausgabeverzeichnis ist erforderlich; vorhandene Läufe werden nicht überschrieben.

Voraussetzungen: Node.js 24 mit node:sqlite, vollständiger sauberer Codecheckout 64e026e8fd15b129a16cc97189b28506aa9e8ac2, unveränderter gepinnter Katalog 8236b8bfab7322447ec46661c116fa526331af3d und das vollständige v8-Paket.

    node scripts/finalize-product-plans-v9.mjs PATH_TO_V8 PATH_TO_CODE PATH_TO_CATALOG NEW_OUTPUT

Das Skript prüft den Codepin und die relevanten Arbeitsbaumdateien, die Excel-Extraktion, den Katalogpin und die bestehenden Quellen-/Planpins. Es kopiert beide SQLite-Dateien über die SQLite-Backup-API; liest v8 ausschließlich lesend; nutzt native repository.save, groups.save und groups.plan; prüft identische Produktinhalte und alle 823 Originalpreise. Änderungen der bekannten Freitextfragen sind über Entscheidungen belegt; eine unbekannte zusätzliche Frage bricht den Lauf ab.

Die Reproduktion erzeugt neue zufällige Plan-IDs und aktuelle Zeitstempel; daher entstehen andere Plan-/Metadaten-/Paket-Hashes. Die Produkt-/Preis-/Designinhalte, vorhandenen Source-IDs, Source-/Template-Revisionen 2, Modul-/Motivpins und Validierungsergebnisse müssen übereinstimmen. Für eine spätere Freigabe gilt ausschließlich die konkret gelieferte Manifest-/Planversion.

7 aktuelle Pläne und 7 historische Pläne bleiben absichtlich zusammen erhalten. 0 Bestätigungen/0 Ausführungen werden tatsächlich aus der DB gezählt. Steuerangaben liegen in source-metadata.json sowie decisions.json; die native Konfiguration erhält kein zusätzliches Steuerfeld. Original-v8-Dateihashes stehen in v8-preservation.json.

Unabhängiger nativer Prüfer (aus dem vorhandenen gesicherten Review):

    node review/review-persisted-plans.mjs RUN NEW_REVIEW_JSON CODE

Der Prüfer vergleicht exportierte Dateien, SQLite-Quellen/Revisionen, Vorlagen, Module und native Planhashes. Die Zahl 14 bei gespeicherten Plänen ist korrekt; nur die sieben im aktuellen summary.json genannten Paare sind v9.

Neue Excel-Nachträge werden getrennt mit dem Bundled Spreadsheet Runtime erzeugt, an die gelieferten v9-Pins gebunden und gegen sämtliche vorherigen Originalblattwerte/-formeln und Dateiteile verglichen. Die vorherigen Dateien bleiben unverändert.
