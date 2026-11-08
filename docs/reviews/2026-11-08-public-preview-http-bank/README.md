# Lokaler Betriebsnachweis: drei Originalvorschauen vor dem Konfi

Geprüfte Integration: `f4c370fcc6bfdd388f63f14ea339046ea1103aca`. Separater Branch `review/mika-public-preview-http-bank-20261108`. Keine Produktionsdatei geändert; keine Live-Datenbank, Shopify-Verbindung oder Browsersteuerung.

Der eigenständige Nachweis `ops/proofs/public-preview-http-bank.mjs` startet zwei getrennte Node-Prozesse nacheinander. Jeder verwendet den echten Shop-Entry-HTTP-Handler auf einer kurzlebigen lokalen Loopback-Adresse. Host-/HTTPS-Weiterleitungsheader bilden den bestehenden Proxy ab. Produktoriginale und Ressourcen stammen aus der tatsächlichen lokalen r4-Datei; Registry, Freigabe, App-Geheimnis und Sitzungen sind ausdrücklich synthetisch. Es werden keine Schreibendpunkte bereitgestellt.

Das Ausgangsdokument hat SHA-256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0` und 11.906.263 Bytes. Seine 251 Originale, 80 Größen und 404 Kombinationen bleiben unverändert. Das gewählte Format ist `GR-ES-AB-120X80-T15`, Befestigung `K00`; der im Fixture verwendete Grundpreis 1.999 Cent stammt unverändert aus der nativen Preisfunktion.

## Tatsächliche Ergebnisse

| Prüfung | Erster Prozess | Neuer Prozess nach vollständigem Neustart |
| --- | --- | --- |
| Startmanifest vor Vorbereitung | 0 Vorschauadressen | Bereits 3 gespeicherte Adressen |
| Explizite Vorbereitung | Genau 3 native Renderaufrufe | Alle 3 aus Dateicache, 0 Renderaufrufe |
| Startmanifest danach | 3 Vorschauadressen | Dieselben 3 Adressen |
| Galerie | Dieselben 3 URLs; weitere Karten privat | Identische Wiederverwendung |
| Öffentliche Bilder | 3 × GET 200, HEAD 200 | 3 × GET 200, HEAD 200 |
| Dateicache | 3 Dateien | Genau dieselben Bytes/Hashes, weiterhin 3 Dateien |

Ein rein lokaler Loader-Messzähler zählt den Eintritt in die unveränderte native `productPreview`-Funktion. Er verändert keine Quelldatei oder Renderentscheidung; die Cacheidentität liest weiterhin die ursprünglichen Dateien. In Startmanifest, Galerie und öffentlichen GET/HEAD-Abrufen entstehen keine zusätzlichen Renderaufrufe. Der zweite Prozess beginnt mit leerem Modulspeicher und wiederverwendet nur den persistenten Dateicache.

- Warmmanifest: **800 Bytes**, eine Startschrift, sechs vorhandene Motive, drei Vorschauadressen.
- Vorschauen: **140.037 / 139.106 / 139.156 Bytes**, zusammen **418.299 Bytes**. Die drei Bilder liegen deutlich innerhalb des bestehenden 6-MiB-Warmbudgets; dieser Nachweis summiert keine tatsächlichen Font-/Motivdownloads.
- Dateicache einschließlich signierter Metadaten/Base64: **560.412 Bytes**, drei Dateien, innerhalb des 64-MiB-Limits.
- Für diese Größe zeigt der bestehende Galeriepfad **21 passende Karten**. Die 251 Quelloriginale wurden weder eingeschränkt noch neu sortiert.
- Lokale Einmalvorbereitung: **1,65 s**. Startmanifest nach Vorbereitung: **180 ms**, nach Neustart **186 ms**. Galerie: **126 / 143 ms**. Drei Bild-GETs jeweils **101–106 ms**.
- Cacheantworten: `Content-Type: image/svg+xml`, `Cache-Control: public, max-age=31536000, immutable`.

Diese Zeiten sind lokale Testwerte mit synthetischer Registry, keine Server-/Handyversprechen. Vor dem erfolgreichen Lauf wurden ausschließlich zwei Fixturefehler korrigiert: Sitzungs-IDs auf das vorhandene UUID-Format angepasst und Resolver auf den echten Vertrag der beiden Shopify-IDs begrenzt. Keine Produktionskorrektur war nötig.

Vollständige gemessene Werte einschließlich Datei-/SVG-Hashes stehen in [proof.json](proof.json). Temporäre Cachedateien wurden nach dem Nachweis entfernt; Originaldaten bleiben unberührt.

## Requestformen für die nächste Serverprüfung

1. Auf der echten Shopify-Produktseite kommt die Startkarte aus dem vorhandenen App-Proxy:
   `/apps/konfigurator/start?product=16190784438652&variant=58104606556540&ui=prio-r15&format=json`
2. Shopify ergänzt serverseitig die bestehende Signatur und Shopparameter. Keine selbst erfundene Signatur verwenden und keine vollständige Sitzungsantwort in öffentliche Berichte kopieren.
3. `warm.url` benennt den tatsächlichen App-Host plus `/konfigurator/shop/warm/`. `warm.manifest.previews` enthält bis zu drei Adressen der Form `/konfigurator/shop/vorschauen/<64-hex>.svg`.
4. Nach Öffnen des Konfis liefert `/api/shop-entry/design-gallery` mit dem bestehenden Sitzungsheader dieselben URLs an den entsprechenden ersten drei Karten. Weitere Karten behalten ihren authentifizierten POST-Fallback.
5. Die Bildadressen werden auf dem tatsächlichen App-Host abgerufen. Die Hashes in diesem lokalen Bericht gehören zur synthetischen Testbindung und dürfen nicht als Liveadressen übernommen werden.

Root sollte anschließend echte Netzwerk-/Browser-Cachetreffer und Neustart mit dem vorgesehenen privaten Verzeichnis beobachten. Dieser Nachweis aktiviert keine Vorbereitung im Kundenbetrieb und bestätigt keine Shopify-Liveabnahme.

## Wiederholung bei neuer Integrationsänderung

```text
node ops/proofs/public-preview-http-bank.mjs
```

Optional `GRAVURU_PUBLIC_PREVIEW_SOURCE` auf die vorhandene Originaldatei und `GRAVURU_PROOF_REPORT` auf einen gewünschten lokalen JSON-Ausgabepfad setzen. Der Source-SHA muss exakt stimmen. Der Nachweis fordert Node mit `node:module.registerHooks`; ausgeführt wurde Node 24.22.1. Er startet keine anderen Prozesse als seine beiden eigenen lokalen Prüfphasen und beendet deren HTTP-Server.

Die vorhandenen Originale bleiben dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) verpflichtet. Es wurde keine erneute Artwork-Abnahme behauptet.
