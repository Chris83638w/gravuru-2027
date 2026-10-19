# Fixture: anonymisierte Amazon-Custom-Bestellung

Synthetische Bestellung im Format der Amazon-Custom-ZIP (Stand 10/2026) für `scripts/import-amazon-order.py` und dessen Test `scripts/import-amazon-order.test.py`. Sie enthält **keine echten Kunden- oder Bestelldaten**.

| Datei | Inhalt |
| --- | --- |
| `00000000000000.json` / `.xml` | Bestelldaten (Order `000-0000000-0000000`, Position `00000000000000`, ASIN `B013T1VRKS`, Größe „ca. 22x14 cm“, Design „Doppelherz D201“, Schrift Great Vibes, drei Mustertexte, Acrylständer) |
| `00000000-0000-4000-8000-000000000003.svg` | Fabric.js-Layout (viewBox 400 × 400): Foto mit `clipPath`, Design-Overlay als externer `href` (nur Daten, wird nie geladen), drei zentrierte Texte |
| `00000000-0000-4000-8000-000000000001.jpg` | Kundenfoto-Ersatz: generierter Farbverlauf mit Kreuz, 1118 × 1636 px |
| `00000000-0000-4000-8000-000000000002.jpg` | Platzhalter für die Amazon-Vorschau (400 × 400 px) |

Die Fabric-Maße der Texte sind mit den Katalogschriften berechnet (`scripts/make-amazon-fixture.py --katalog …`). Neu erzeugen:

```
python3 scripts/make-amazon-fixture.py --zip <echte Bestell-ZIP> --katalog <gravuru-katalog> --out app/workshop/fixtures/amazon-order
```

Das Skript liest die echte ZIP nur lokal und bricht ab, wenn IDs, Dateinamen, Texte oder Foto-Bytes der echten Bestellung in der Ausgabe auftauchen.
