> Einordnung nach dem visuellen Abgleich vom 05.10.2026: Die technischen Prüfungen sind gültig, die M01-Produktkarten entsprechen jedoch noch nicht vollständig der ausgewählten fotografischen Referenz. M02 wurde anschließend als eigenes Paket angebunden: [aktueller Stand](DASHBOARD-M02.md).

# Dashboard: Produktübersicht M01

Umgesetzt am 05.10.2026 nach Nutzerbestätigung „Dashboard“. Aufgabenbranch `task/dashboard-product-cards-20261005`, Basis `775557fef6933509d095b9e2756a5f799a7fd670`.

Obere Navigation mit Produkte, Mastervorlagen, Stapelverarbeitung und Profile; Direktlink zum separat gesicherten Muster Acrylglasbild. Große Karten aus der bestehenden API, Suche nach Name/ID, Druck/Gravur/Archivfilter und tatsächliche Zähler. Vorschau und Metadaten gehören zur gespeicherten Revision. Bearbeiten öffnet den vorhandenen Editor; Rückweg schützt ungespeicherte Eingaben. „Aus Master erstellen“ kopiert die gewählte gespeicherte Vorlage über die vorhandene revisionsgeprüfte API.

Neue lesende Route `/api/workshop/products/:id/preview.svg?revision=N` verwendet den gemeinsamen Renderer und die bestehenden Acrylquellen. Vorschau verändert keinen Datensatz; historische Revisionen bleiben gleich. Kompakte JPEG-Ableitungen ausschließlich für Karten, Druckoriginale erhalten. Kein beliebiges externes Bildladen, keine neue Authentifizierung oder Rechtefreigabe. Bestehender Host-/Origin-/CSRF-Schutz bleibt aktiv.

Prüfung: 174 Tests bestanden, 0 Fehler, 0 Skips; anschließend zwei gezielte HTTP-Tests nach Vorschaubildoptimierung bestanden. Build 76 Ressourcen/1 Modell. Browser Desktop 1487 × 1058 und Mobil 390 × 844: echte API mit separater In-Memory-Prüfdatenbank, drei synthetische Produkte, ein Master, ein Archivdatensatz. Suche/Filter/Archiv, Anlegen aus Master und Reload, Warnung bei ungespeicherten Eingaben, keine Seitenfehler oder horizontaler Überlauf. [Visueller Bericht](../../design-qa.md).

![Produktübersicht mit synthetischen Prüfdaten](dashboard-m01-desktop.png)

Keine privaten Werkstattdaten angebunden oder verändert, keine Testprodukte in den privaten Bestand geschrieben. Keine neue öffentliche oder private Dashboard-Veröffentlichung. Das laufende Cloud-Entwicklungssystem ist kein dauerhafter gemeinsamer Datenbestand. Der vorhandene Muster-Link führt weiterhin zum Acrylkonfigurator, nicht zum Dashboard.

Start in vorhandener Cloud: `npm start -- --port=8972` (legt bei leerer Entwicklungsdatenbank einen Master an); Tests über `npm test`. Der tatsächliche Browserprüflauf verwendete eine gesonderte In-Memory-Datenbank, nicht diesen persistenten Standardpfad.

Nächster fachlicher Schritt: M02-Produktbearbeitung mit Elementen links, großer Vorschau mittig und Einstellungen rechts weiterführen; vorhandene Kundenfelder-/Import-/Revisionsmodule nutzen. Shopify-Anbindung und Bestellübernahme bleiben eigene offene Funktionen.
