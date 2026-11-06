# Galerie: direkte Bearbeitung und nachvollziehbare Freigaben

Auftrag Chris, 06.11.2026: Häkchen je Design sowie Überblick über fehlende, noch nicht freigegebene und bestätigte Designs. Seine vollständige Unterkategorienliste folgt separat. Die Galerie wird für alle Materialien vorbereitet; der erste zusätzliche Materialpilot bleibt normale Edelstahl-Türschilder samt Rohlingen. Design-Master: https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md.

## Fachregeln und Quellen

- Chris, aktueller Chat: Freigabehäkchen direkt an den Karten; Statusübersicht. Vorheriger Auftrag: drei Karten nebeneinander, Inline-Verschieben/Speichern ohne vollständigen Editorstart, Material-/Themensortierung und Kommentare.
- Katalog `designs/README.md`, Familienziele/Freigaben: Ziele getrennt bestätigen; Inhaltsänderungen erfordern erneute Prüfung. Ein Material-/Formatstand gibt keinen anderen frei.
- Design-Master §6: die tatsächliche Bildfreigabe erteilt Chris. Automatische Prüfungen sind keine Bildfreigabe. Test-Häkchen ausschließlich in isolierter Testkopie; keine echten Freigaben gesetzt.
- Chris, letzter Zusatz: vollständige Unterkategorienliste folgt. Daher noch keine erfundene Sollmatrix und keine Aussage „0 Designs fehlen“. Die Übersicht zeigt vorhandene Kategorien; das generische Übersichtsmodul kann später explizite Sollbereiche/Mengen/IDs abgleichen.
- Eigene Branches/PR, kein main-Merge und keine Kunden-Veröffentlichung. Freigabehäkchen schreibt ausschließlich ein privates Prüfereignis, nicht Shopify oder Katalogziele.

## Ergebnis

Die Galerie speichert Bestätigungen und Widerrufe in `review-approvals.sqlite` als unveränderliche Ereignisse. Ein serverseitiger Fingerprint bindet das OK an das native Design, seine wirksame Geometrie/Material-/Verfahrensdarstellung, verwendete Schriften/Motive/Fotos/Masken und den Renderer. Änderungen anderer Designs derselben Produktgruppe oder Kommentare entwerten das OK nicht. Konflikte werden statt Überschreiben gemeldet.

Vorschau-URL und geladene Inline-Ansicht sind ebenfalls an Fingerprint und Produktrevision gebunden. Während ungespeicherter Verschiebungen ist kein bestätigtes Häkchen zu sehen. Unvollständige native Vorlagen können nicht bestätigt werden. Historische Katalogfreigaben werden nicht pauschal auf eine neu aufbereitete Galerieversion übertragen.

Statusfilter: noch nicht freigegeben / bestätigt / erneut prüfen / Aufbereitung offen. Die Prüftabelle zählt Originale und Material-/Formatstände getrennt. Eine Mehrfachzuordnung zu Themen vervielfacht die globale Originalzahl nicht. Aktuelle Datenprüfung: 325 Originale, 478 vorhandene Prüfeinträge inklusive offener Quellen, 377 verfügbare native Ziele; keine unerwartet fehlenden Ressourcen unter den 377 vorbereiteten Zielen.

Der zuvor begonnene Inline-Editor ist mit diesem Paket enthalten: direkt in der Karte verschieben und speichern, eine aktive Karte, Konflikt-/Navigationsschutz, Materialübersicht. `Bearbeiten` öffnet weiterhin den bestehenden Werkstatteditor. Die vollständige Gleichheit mit allen Kundenkonfi-Funktionen und der allgemeine Rückweg aus dessen Editor bleiben das separate, noch offene Mika-Paket; sie werden hier nicht als fertig behauptet. Auswahl der konkreten Vorlage beim Kunden-Vorschaulink wurde berichtigt.

## Prüfung

- 56 gezielte Node-Tests: Freigabespeicher/Hash, Kategorienübersicht, Browserzustände, Kommentare, Galeriekarten, Inline-Matrizen, Materialübersicht und konkrete Designauswahl.
- 13 Linux-Tests für private Speicherprüfung und HTTP/Proxy einschließlich realem Renderer/CAS: bestätigen → verschieben → erneut prüfen; anderes bestätigtes Design bleibt bestätigt.
- 6 entsprechende Windows-HTTP-Tests grün, inklusive zu großer Anfrage korrekt 413; Speicher begrenzt, Body wird vor Antwort abgearbeitet.
- 10 SQLite-Snapshot-Tests einschließlich neuer optionaler Freigabe-DB/WAL und historischer Vier-DB-Sicherungen.
- Sichtbar in Chrome auf isolierter Kopie: D217 bestätigen, neu laden, 22×14 bleibt ungeprüft, 30×20 inline 1 mm bewegen/speichern, Status „Geändert · erneut prüfen“, Filter; drei Karten nebeneinander. Keine Änderungen der Online-Nutzerdaten durch diese Tests.
- `git diff --check` grün. Laufzeitpaket muss aus dem committed Stand gebaut und separat überprüft werden.

## Betrieb / nächste Schritte

Code-Update erhält private Konfiguration, Galeriepaket, Datenbanken und bestehende Kommentare/Revisionen. Kein Vollimport und insbesondere niemals die verwendete lokale Testdatenkopie auf den Host übertragen. Snapshot/Storage-Allowlist und Paketbuilder berücksichtigen die neue Freigabe-DB bzw. benötigten Module. Zugang bleibt der bestehende private Galerie-Zugang; Ereignisse nennen die private Prüfsitzung, keine unbewiesene persönliche Identität.

Weiter offen: Chris' Unterkategorienliste einlesen; Claudes Edelstahlpilot über Lieferform 2 integrieren; vollständigen Konfi-Editor/Rückspeicherung mit Mika abnehmen. Alte Acryl-Szenen mit impliziten Referenzbildern benötigen beim Freigabehash eine vollständige gerenderte Vorschau; der Helfer verweigert eine unvollständige Bestätigung ausdrücklich.
