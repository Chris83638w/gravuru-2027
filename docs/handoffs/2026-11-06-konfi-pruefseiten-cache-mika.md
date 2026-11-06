# Konfi-Prüfseiten: veraltete Browserkopie verhindern

Stand 06.11.2026, Codex/Mika, Branch `dev/mika-konfi-anschluss-20261105`, Draft-PR #178. Aufbau auf `42b99f3a` (R11). Konfi-Bundle bleibt **editor-3ce792e6e3efd39f.mjs**; keine weitere Layoutänderung.

## Auftrag und belegte Ursache

Mikail meldet nach R11 erneut per Screenshot: **„zurücksetzen ist nicht auf einer höhe!! dann kann die Tafel auch noch ein wenig größer werden“**.

Sein um 09:47 UTC neu geöffneter Tab enthielt tatsächlich noch **R10 `editor-5478bb63b8153f24.mjs`**. DOM-Nachweis: Reset außerhalb der Stage, y=577 px; Ansicht y=524 px. Platte 535,85×341 px bei 1440×709. Die HTTPS-Antwort lieferte gleichzeitig bereits R11 und hatte ETag/Last-Modified, aber **keinen Cache-Control-Header**. Die größere, bündige R11-Ansicht war daher nicht in diesem Browserdokument angekommen.

## Eng begrenzte Korrektur

`ops/preview-cache/preview-pages.htaccess` setzt ausschließlich für `22x14.html`, `30x20.html` und ihre gleichnamigen JSON-Modelle `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`. Am 06.11.2026 um **09:52:37 UTC / 10:52 Uhr Berlin** als neue `.htaccess` in genau dem freigegebenen Hunde-Prüfverzeichnis installiert. Zuvor keine dortige `.htaccess`; beide HTML-Dateien per SHA-256 gegen den aktivierten R11-Stand geprüft. Installation privat protokolliert.

Kein globales Browser-Cache-Löschen, kein Entfernen lokaler Entwürfe, keine neue Anwendungsversion oder Dienstneustart. Bestehende Nutzer-Tabs nicht neu geladen. Der neue [frische Versionslink](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html?fresh=1&v=r11a) umgeht die bereits gespeicherte alte HTML-Antwort einmalig; die neue Cache-Regel gilt für weitere Aufrufe. Versionierte Bundles/Materialressourcen behalten ihre bisherige Cache-Strategie.

Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md), Vorlagen, Maße und Preise bleiben unverändert. Koordination in #168, Reservierungskommentar 6682055937. Optimierungsideen weiterhin vorab benennen und nicht ungefragt umsetzen.

## Prüfung

- Vier öffentliche Antworten (zwei HTML-Seiten, zwei Modelle) HTTP 200 mit dem erwarteten neuen Header; alle vier Inhalte bytegleich zum R11-Stand.
- Hauptbundle HTTP 200 und weiterhin `public, max-age=31536000, immutable`.
- Neuer echter Chrome-Tab lädt R11. Bei 1440×709: Reset und Ansicht **beide y=580 px / 44 px hoch**; Platte **655,28×417 px**, also 22,3 % breiter als der alte Stand im gemeldeten Tab.
- Screenshot der tatsächlichen aktuellen Vorschau gesichert: `konfi-zuruecksetzen-buendig-aktuell-r11a.jpg` in den lokalen Ausgaben.
- Keine neuen Unit-/Build-Läufe: Konfi-Code unverändert; die Server-Header und tatsächliche Browserauslieferung sind die passenden Prüfungen für diesen Nachtrag. Die 66/66-Prüfungen aus R11 bleiben historische Referenz, kein neuer Testlauf behauptet.

[Maschinenlesbarer Nachweis](2026-11-06-konfi-pruefseiten-cache-nachweis.json). Keine neue Warenkorb-/Produktlaunch-Abnahme und kein Merge. Nächster Schritt: Mikail prüft den aktuellen Versionslink.
