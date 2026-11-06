# Galerie: Navigation und Schnellbearbeitung, 06.11.2026

Auftrag: freundlichere Navigation; Text und Motive unmittelbar auf der Karte verschieben und speichern. Drei Karten nebeneinander am Desktop, eine Konfi-Version je Original. Keine Änderung an Katalogdesigns, Unterkategorien, Preisen oder Freigaberegeln.

## 1. Übersicht finden

Vorher: hoher Einführungsteil, acht gleichgewichtete Filter, Verwaltung als isolierter Link. [Aufnahme vorher](01-galerie-vorher.png).

Jetzt: sichtbare Ansichten **Vorlagen / Rohlinge / Alles**, direkter Zugang zu **Freigaben & Fortschritt** und Verwaltung. Suche, Material, Thema und Prüfstatus bleiben vorn; zusätzliche Filter sind aufklappbar. Zurücksetzen auch bei leerem Suchergebnis. Material-/Prüfübersicht kompakter. [Aufnahme nachher](04-galerie-nachher.png).

Desktop zeigt weiterhin drei Vorlagen je Zeile. Filtern/Zurücksetzen verwendet dieselben nativen Zielbindungen; ungespeicherte Vorlagen bleiben samt Material und Format sichtbar. Keine Katalogumsortierung.

## 2. Direkt korrigieren

Vorher: Schnellbearbeitung nur über die Vorschau erkennbar; dominierender Bearbeiten-Link öffnete den vollständigen Konfi. [Aufnahme vorher](02-schnellbearbeitung-vorher.png).

Jetzt: expliziter Hauptknopf **Schnell bearbeiten**. Auf derselben Karte Element auswählen, ziehen oder mit vier sichtbaren Richtungstasten je 1 mm korrigieren; **Position speichern**, **Änderungen zurücksetzen**, **Fertig**. **Im Konfi bearbeiten** bleibt klarer zweiter Weg. Auswahl und Richtungstasten geben den Tastaturfokus an die Vorschau zurück. Auf schmalen Bildschirmen lässt sich der Hintergrund vertikal scrollen; nur bewegliche Elemente fangen Ziehgesten ab. [Desktop](05-schnellbearbeitung-nachher.png), [390-px-Prüfung](07-schnellbearbeitung-mobil.png).

Tatsächliche lokale Browserfolge: D401 / Acryl Schwarz / 50 × 20 mm, R5 → Rechts 1 mm; Hoch/Runter heben sich auf; Ansicht Rohlinge behält die ungespeicherte Karte; Speichern → R6; voller Konfi zeigt Stand6; Speichern & zurück; Schnellbearbeitung erneut zeigt R6; Links 1 mm und Speichern → R7. Unabhängiger lesender Datenvergleich: R6 ändert ausschließlich text-1.x, R7 ist als vollständiges Produktdokument exakt R5. Drei andere Designs gleich; für 347 weitere Produkte keine Revision seit R5, aus unveränderlicher Historie rekonstruiert. [11/11 Datenprüfungen](local-position-proof.json).

## 3. Im vollständigen Konfi weiterarbeiten

Vorher: doppelte Zurück-/Speicheraktionen im äußeren Rahmen und inneren Editor. [Aufnahme vorher](03-konfi-vorher.png).

Jetzt: ein Rahmen mit **Zur Übersicht**, eindeutiger Design-ID/Material/Format/Stand, **Speichern** und **Speichern & zurück**. Ungespeicherte Änderungen werden im Status angezeigt. Nur im privaten Galeriemodus entfallen die doppelten inneren Kopfaktionen; Gestaltungswerkzeuge bleiben erhalten. [Aufnahme nachher, tatsächlicher Stand6](06-konfi-nachher.png).

## Prüfstand und Grenzen

- 52 unterschiedliche gezielte Tests grün, keine Skips: Galerie, Navigation, Inline-Bedienung, Materialbindung, Freigabe-UI, Galerie-Workbench, nativer Voll-Editor, HTTP-Saveback und Positionsänderungen. Zwei neue Listener-Verhaltenstests decken Ansicht/Reset mit Dirty-Pin sowie sichtbaren Schnellstart/Nudge/Speichern einschließlich Ziel und erwarteter Revision ab.
- Im ersten breiten Lauf scheiterten vier Tests an gesperrtem Loopback, fehlendem Python-Umfeld bzw. temporärem Rename. Die drei betroffenen Testdateien anschließend mit vorhandenem Fotoprüfer, Netzwerkzugriff und sequenziell ausgeführt: 11/11 grün. Kein Sollwert für fehlerhaftes Produktverhalten geändert; nur die zwei bewusst geänderten Schaltflächentexte in bestehender HTML-Prüfung angepasst.
- Lokale Browser: integrierter Browser und Chrome; Desktopansicht und 390 × 844 geprüft. Mobile Seite ohne horizontalen Überlauf, Richtungstasten je 57 px breit. Kein physisches Touchgerät geprüft, keine vollständige WCAG-Zertifizierung.
- Bekannte zeitweise leere iframe-Navigation im gesteuerten Chrome bleibt offen; auch lokal reproduziert. Integrierter Browser öffnet vollständigen Konfi und führt Speichern & zurück aus. Diese Navigationserleichterung behauptet keine Behebung der separaten Frame-Störung.
- Diese Aufnahmen und die Positionsfolge stammen aus der lokalen Testkopie, nicht aus der privaten Online-Datenbank. Online-Aktivierung wird separat dokumentiert. Keine Designfreigaben gesetzt.

## Onlineabnahme nach Aktivierung

Private Site19 nutzt Codee166741c nach frischer Sicherung und geprüftem separatem Release. [Staging](private-staging-proof.json), [91/91 GET-/Datenprüfungen](private-online-get-proof.json). Browser bestätigt neue Übersicht, direkte Schnellbearbeitung samt Verschieben/Zurücksetzen und vollenKonfi mit eindeutigem Kopf. No-op „Speichern & zurück“ kehrt zur passenden AcrylkarteR4 zurück; [anschließender Vergleich](private-online-after-ui-proof.json) bestätigt unveränderte fünfDatenbanken,348Produktköpfe und357Revisionen. Kein Online-Positions-PATCH und keine Freigabe gesetzt. Die tatsächliche Positionsspeicherung wurde oben an der lokalen Testkopie abgenommen.

Aufnahmen: [private Aktivierung](09-private-site19-aktiv.png), [Onlineübersicht](10-online-galerie.png), [Schnellbearbeitung](11-online-schnellbearbeitung.png), [vollerKonfi](12-online-konfi.png), [drei Karten mit direkter Bearbeitung](13-online-schnellbearbeitung-detail.png). Zusätzliche [mobileKonfi-Aufnahme](08-konfi-mobil.png) stammt aus dem lokalenPrüfstand; kein horizontalerÜberlauf bei390px.
