# Mobile Kopfzeile und Ladevorgang — 09.11.2026

Basis: `4dc5653b2ee31d2e3e28f10614e5433469348a5a`. Produktionsänderung: `8071f6963e039589a40efb52819402c745428fc3`. Eigener Branch `dev/mika-r15-mobile-header-20261109`; kein Livezugriff.

## Eng freigegebene Kopfzeile

Die Nutzeranforderung lautet: auf dem Handy den gravuru-Identitätsblock ausblenden, „Zurück zum Produkt“ größer und breiter; bestehende Symbole erreichbar lassen, Desktop unverändert. Genau zehn Zeilen in `app/configurator/mobile-demo/demo.css` wurden ergänzt, sämtlich innerhalb `@media(max-width:999px)`. Kein JavaScript, keine Produktdaten oder Funktionen geändert.

Gesicherter tatsächlicher CSS-Ausgang: SHA256 `3c9b782d70ca644c17a62172f2cf908125fa6a49c7192ae7e0af8bf5e5f43646`. Ergebnis als LF-Quelldatei: `856dc180ea883a7a19be89a0862c61f96ddc2cd6fc48179a7e7fa20a0be8a321`. Vorhandene CSS-Regeln sind inhaltlich exakt erhalten; vier zuvor gemischte CRLF-Zeilenenden wurden normalisiert. Die gesicherte Vorherdatei und der Prüfbeleg liegen lokal unter `outputs/r15-mobile-header-20261109/`.

Kollisionsprüfung: Der neue Rückbutton-Selektor hat dieselbe hohe Attributspezifität plus `button` und überschreibt die bisherige feste 75-px-Breite. Die vorhandene spätere `compact-controls.mjs`-Regel verändert diese Breite nicht. Die bestehenden 36-/44-px-Symbolbreiten, die Höhe, Aktionen und Tastaturregeln bleiben erhalten. Desktopregeln werden nicht überschrieben.

Rechnerische Breiten mit allen fünf bestehenden Symbolen (keine Browsermessung):

| Viewport | Rückbutton | Symbolbreite |
|---|---:|---:|
| 320 px | 126 px | 36 px |
| 360 px | 166 px | 36 px |
| 390 px | 148 px | 44 px |
| 430 px | 188 px | 44 px |

`git diff --check` und direkte Prüfung der erhaltenen Originalregeln bestanden. Keine künstlichen CSS-Spiegeltests ergänzt. Sichtprüfung mit tatsächlichem Editor übernimmt Root bei 360/390/430 und Desktop; im lokalen Testhost muss dieses CSS NACH dem unveränderten 36-Dateien-Live-CSS-Overlay eingespielt werden. Rücknahme: ausschließlich die gesicherte CSS-Vorherdatei wiederherstellen. Kein Datenbank-Rollback.

## Unabhängiges Leseaudit — keine Umsetzung in diesem Branch

1. **Belegter Import-Wasserfall:** `variant-m/ux.mjs:551` lädt die R15-Oberfläche erst am Ende über `import('/configurator/mobile-demo/shop-shell.mjs')`. `variant-m/bundle-build.mjs:18–20,44–55` nimmt mobile-demo nicht als Mount/Eintritt auf und folgt nur statischen Imports. `shop-shell → demo → motif-size-limit` importiert deshalb unter anderem `edge-clamp`, `usability-model`, `design-content` erneut über reale Netzwerkadressen, obwohl der Kern diese bereits als Blob-Module enthält. Die Browsermessung von Root enthält 46 Editorrequests. Kleinster nächster Fix: eigener gehashter R15-Chunk mit bestehenden Core-Abhängigkeiten und derselben `gravuruModules.import`-Verknüpfung; module_contract arbeitet getrennt daran. Keine zweite Implementierung von Funktionen.
2. **Wärmen gilt absichtlich nur für die exakte Variante:** `workshop/public-design-previews.mjs` bindet Vorschauen an Variante, Optionen, Freigabe und Quelldigest. `attach()` ergänzt nur vorhandene Treffer für drei Karten; es erzeugt keine neuen. Die vorbereiteten drei 12×8-Vorschauen können daher Oval 9×6 nicht bedienen. Das ist eine korrekte Geometrie-/Rechtegrenze, kein Grund, alle 80 Größen vorzuladen.
3. **Kleine spätere Verbesserung beim Wechsel:** `variant-m/product-design-gallery.mjs:86–88` verwirft sofort Karten/URLs und lädt die gewählte Ausführung. Bereits laufende alte Vorschauanfragen laufen weiter und belegen bis zu zwei Ladeslots. Nach Server- und Chunkfix wäre ein gezielter Abbruch veralteter Vorschauanfragen mit sofortiger Slotfreigabe sinnvoll; nur die ersten drei Karten der wirklich gewählten Variante vorladen. Dabei Epoch-/Freigabeprüfungen erhalten. Zunächst messen, nicht ungefragt implementieren.
4. **Kein aktueller Massen-Motivdownload gefunden:** `background-loading.mjs:43–50` lädt sechs Anfangsmotive und zwei gebräuchliche Schriften. `lazy-resources.mjs:82–95` lädt weitere sichtbare Motive einzeln; der alte vollständige Bibliothekslader ist beim aktuellen Taböffnen nicht der aktive Pfad. Eine vorgeschaltete Optionsbild-Warteschlange ist vorhanden; bewusste Kundenaktion kann diese überholen.

Empfohlene Abnahme: kalter und bereits gewärmter Produktstart mit demselben Produkt/Browser; anschließend Wechsel 12×8 → Oval 9×6 → zurück. Requests, übertragene Bytes, letzte ESM-Abhängigkeit und „bedienbar“ getrennt erfassen. Auf der Produktseite höchstens bisherige drei Vorschauen/sechs Motive/drei Startschriften; keine Profil-/Preis-/Bindungsänderungen. Server-CPU-Leseoptimierung bleibt bei module_runtime.
