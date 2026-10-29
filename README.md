# Arbeitspaket Astra Mika (Designs, lokal) – 29.10.2026

Nur Downloads; dieser Branch wird nie nach `main` gemergt. Stand: Code `main b5c1e6a`, Katalog `main eb4a4c61a`. Keine Live-Daten, kein Shopify, keine Zugangsdaten.

| Datei | Inhalt | wer braucht es |
|---|---|---|
| `arbeitspaket/1-code-gravuru-2027.zip` | Konfi-Code + `LIESMICH-START.txt` + Übergaben/Preis-Excel | alle |
| `arbeitspaket/2-katalog.zip` | Katalog ohne großen Altbestand | alle |
| `arbeitspaket/3-vorlagen-familie.zip` | Altbestand Türschilder/Familie (1393) | Familienschilder (#64) |
| `arbeitspaket/4a-…menschen.zip` + `4b-…menschen.zip` | Altbestand Gedenktafeln Menschen, Übersichten, Kreuze | Schiefer (#65–#70) |
| `arbeitspaket/5-vorlagen-schiefer-tiere-sternenkinder.zip` | Gedenktafeln Tiere + Sternenkinder, Tierschilder | Schiefer (#65–#70) |

Alle ZIPs in **denselben Ordner** entpacken (z. B. `…\Produkte Design`); sie ergänzen sich zu `Produkte-Design\gravuru-2027` und `Produkte-Design\gravuru-katalog`.

Start (Node 24): `cd Produkte-Design\gravuru-2027` → `node app\configurator\variant-m\server.mjs --katalog="..\gravuru-katalog"` → `http://127.0.0.1:8961/werkstatt/designs/`.
