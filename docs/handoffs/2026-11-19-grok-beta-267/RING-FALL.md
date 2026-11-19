# Ring-Fall, Kandidat B

Vergleichsfall wie Kandidat A: Ring Wired Pro (3. Gen), Variante `57471227756924`, SKU `FK-AV2A-16x28-1441`, je **49,99 €**.

## Quelle des Preises

Öffentlicher GET am 19.11.2026 auf `…/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert.js`: die Variante heißt „Schwarz / Ganzer Rahmen / Keine Befestigung“, Preis 4999 Cent, SKU wie oben. Dieselbe Zahl steht im Katalogmodell `16x28.json`, Blob `389afb47377bdbe5489e594280bb540f91418b6d`, Befestigung `K00` mit Aufpreis 0. SIL bleibt 499 Cent und wird in diesem Vergleich abgelehnt, damit kein Aufpreis dazukommt. Der frühere Fixture-Wert 54,98 € war genau dieser SIL-Aufpreis und gilt hier nicht.

## Originale

- Gerätebild: öffentliche Datei `app-2027…/doorbell-assets/d3c43f07….webp`, 63482 Byte. Der SHA-256 ist identisch mit dem Katalogindex `ring-wired-pro-3-gen-5dfya2-16x28`. Die Kopie liegt unter `app/workshop/test-fixtures/beta-267/`.
- Strichdesign: Katalogpfad `M22 87H138V237`, Strichstärke 0,65 mm. Der Test verlangt alle 16 Messstellen je Schenkel weiß. „Klar & modern“ hat diese Linie nicht; dort sind dieselben Stellen dunkel.
- Die Beschriftung in der PNG nutzt Inter, weil die Katalogschrift Montserrat in dieser Umgebung nicht als Schriftdatei lag. Die Pfadangabe im SVG bleibt der Katalogpfad. Eine Behauptung, die Buchstaben seien Montserrat-Konturen, wäre falsch.

Git selbst antwortet auf `gravuru-katalog.` mit „repository not found“. Gelesen wurde über die bereits vorhandene GitHub-Leseverbindung, ohne neues Token.

## Sichtbar

Seite und Drawer sind getrennte Seiten. Beide zeigen zwei PNGs, 49,99 €, Vergrößern und Entfernen, keinen Bearbeiten-Link.

- [PC-Warenkorb](Ring-PC-Warenkorb.png)
- [Handy-Warenkorb](Ring-Mobil-Warenkorb.png)
- [PC-Drawer](Ring-PC-Drawer.png)
- [Handy-Drawer](Ring-Mobil-Drawer.png)

Ausführung: `node scripts/beta-267-measure-path.mjs` und `node --test app/workshop/beta-267-ring.test.mjs`.
