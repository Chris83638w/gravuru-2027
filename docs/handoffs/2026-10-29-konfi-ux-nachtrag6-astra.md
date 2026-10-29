# Konfigurator: Nachtrag 6 – Galerie nur innerhalb der Produktlinie · 29.10.2026

Bitte auf **PR #42** (Galerie) umsetzen; vor dem gemeinsamen Livegang von #42/#43.

## G2 · Galerie zeigt heute alle gebundenen Produkte des Stores

- **Befund:** `shop-design-gallery.mjs` `build()` nimmt **alle** aktiven Bindungen des Stores. Es gibt keinen Filter nach Produktlinie oder Zielgruppe. Geprüft im Code auf `bfbd918`.
- **Folge, sobald die Funkklingeln (126 Einstiege, je 120 Varianten) gebunden und freigegeben sind:**
  - Ein Türschild-Kunde sieht unter „Designs aller Formen und Größen“ Klingelschilder, und umgekehrt.
  - Dasselbe passiert später mit Hausnummern (AA/AS/S/S), Gedenktafeln usw.
- **Chris' Regel (20.10.):** Designs werden je Produkt nach Zielgruppe gefiltert, z. B. zeigen Hunde-Produkte nur Hunde-Designs.

**Bitte:**
1. **Galerie auf die eigene Produktlinie begrenzen:**
   - Gleiche Katalog-Linie wie das aktuelle Produkt, z. B. `edelstahl-tuerschilder`.
   - Material- oder verfahrensübergreifende Ziele nur, wenn sie über Paket M ausdrücklich als Design-Ziel derselben Linie freigegeben sind.
2. **Funkklingeln:**
   - Nur die Formate **desselben Geräte-Modells** anbieten (Hoch-/Quer-/Längsformat), nie andere Modelle und nie Türschilder.
   - Türschild-Galerien zeigen keine Funkklingeln.
3. **Zielgruppe/Thema:** Wenn das aktuelle Produkt ein Thema hat (z. B. Hunde, Hochzeit), stehen passende Designs vorne. Andere Themen derselben Linie bleiben erreichbar (Filter „Alle Themen“).
4. **Tests:** gemischter Store mit Türschildern, Funkklingeln (2 Modelle) und Hausnummern; jede Galerie zeigt nur ihre Linie bzw. ihr Modell. Signatur und Ziel-Neuauflösung prüfen die Linie ebenfalls, damit sich ein manipuliertes Ziel nicht in eine fremde Linie wechseln lässt.
5. Cache-Schlüssel um die Linie erweitern; die Leistung aus Nachtrag 3 muss erhalten bleiben.

Bilder 1:1 (Desktop + iPhone), Tests, `STATUS.md`, Bericht. Nichts live ohne Chris' Satz.
