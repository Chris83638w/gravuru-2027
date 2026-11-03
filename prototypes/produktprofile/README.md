# Produktprofile – lokale Bedienvorschau

Isolierte React/Vite-Studie vom 03.11.2026, **keine Produktionsimplementierung** und keine Shopify-Verbindung. [Prüfbericht, Architektur, Quellen und offene Grenzen](../../docs/handoffs/2026-11-03-produktprofile-vorschau.md).

Läuft auf Chris' Rechner unter http://127.0.0.1:8171/. Vier Beispiele: Türschild, Foto-Gedenktafel, Funkklingel, ohne Optionen. Die Umschaltung oben ist ein Prüfwerkzeug, kein geplanter Kundenschalter.

## Lokal reproduzieren

`npm ci`, `node scripts/prepare-local-assets.mjs`, `npm run dev -- --host 127.0.0.1 --port 8171`.

Das Vorbereitungsskript liest ausschließlich lokale Originale aus dem Code-Repo, der benachbarten historischen Arbeitskopie `../gravuru-katalog` sowie den bestehenden Workspace-Ausgaben `outputs/SCHIEFER-WEBP` und `outputs/D204-WEBP`. Es schreibt nur in diese Studie. Die benötigten Quellen stehen in `asset-sources.json`. Nicht als aktueller Katalog-/Freigabestand verwenden. Fehlen Quellen, müssen die Originale am genannten Ort bereitgestellt werden; keine Ersatzgrafiken erfinden. Fonts und Kopien der Assets werden nicht eingecheckt. GitHub-Screenshots dokumentieren die lokale Ansicht unabhängig davon.

`node --test tests/profiles.test.mjs` prüft die Profilgrenzen. `npm run build` erzeugt den lokalen Build. Die mitgelieferten Hosting-Dateien sind unveränderte Vorlagen; kein Hosting/Deployment wurde ausgeführt.

Foto-Uploads bleiben im Browser. „Entwurf speichern“ schreibt nur in den lokalen Browser-Speicher dieser Vorschau; kein automatisches Wiederherstellen und keine Übertragung in den Live-Shop. Preise sind gekennzeichnete Muster. Der Warenkorbknopf verändert keinen Warenkorb. D8-Texteingaben sind im Schild sichtbar; die übrigen Kacheln sind Originalansichten zur Galerieprüfung. Nur die gemeinsamen Produktfähigkeiten und das Optionslayout sind hier fachlicher Gegenstand.
