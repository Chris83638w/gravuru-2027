# Zuschaltbare Vorschau: feste Werkzeuge neben der Tafel

06.11.2026, Codex/Mika, auf R12 `8cb8c3ca`, bestehender Aufgabenbranch und Draft-PR #178. **Nur lokal vorbereitet, nicht auf dem Kundenhost veröffentlicht. R12 bleibt online.**

## Auftrag und fachliche Grenze

Mikail fragt nach fest neben der Platte angeordnetem Bearbeiten und Foto-/Ansichtszoom gegen das Springen bei Auswahl. Auftrag: **„zeig mir 2 Screenshots, wie es aussehen würde. Oder setze es um, aber so, dass wir es einfach wieder rausnehmen können“**. Vorher gestrichener Hinweis: **„Für dieses Element änderbar …“**.

Die Testansicht benötigt ein ausdrücklich als `productPreview:true` oder `reviewOnly:true` bezeichnetes Modell **und** `tools=fixed` in der URL. Ohne Parameter keinerlei neue DOM-Elemente oder Stylesheetaktivierung; der bisherige Ablauf bleibt erhalten. Abschaltung: Testparameter entfernen und neu laden. Kein Browser-only-Speicher, keine neuen Geschäftsregeln, Preise, Maße oder Rechte.

## Umsetzung

- Neues isoliertes Modul/Stylesheet `fixed-tools-preview.mjs/.css`: Original-Werkzeuge werden in eine feste seitliche Leiste bewegt, nicht geklont. Auf dem Handy zwei konstante Zeilen unter der Platte. Bearbeiten, Größenregler, Ansicht und bestätigter Reset verwenden die vorhandenen Handler.
- `toolbar-hosts.mjs` und ein Aufruf in `direct-editing.mjs` halten dieselbe Leiste auch im Vollbild am Testplatz. `ux.mjs` installiert ausschließlich die freigegebene Testansicht.
- `customer-tools.mjs` positioniert den bestehenden einzelnen Überlagerungshinweis weiterhin unter der Platte; Seitenwerkzeuge werden nicht fälschlich als untere Grenze interpretiert.
- Der von Mikail gestrichene Rechte-Erklärungstext ist nur in dieser Testansicht ausgeblendet. Bestehende tatsächliche Bearbeitungsrechte werden unverändert geprüft.
- Die rechte Auswahl scrollt separat. Desktop und Handy reservieren ihre Vorschaufläche unabhängig von der Auswahl eines Objekts.

Designs und [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) unverändert. Reservierung #168 · 6683685606. Astras Galerie-/Importarbeiten sind ein separates Paket.

## Prüfung und Grenzen

**57/57 lokale Tests**: Bundle, Toolbar-Hosts, Ansichtszoom, Foto-Positionierung und neuer Opt-in-Schutz. Bestehende Bundle-Stylesheetliste um die neue Datei ergänzt; zwei neue Verhaltenstests sichern den abgeschalteten Standard und identische Kontrollknoten/Listener durch Responsive-/Vollbildwechsel. Build erfolgreich: `editor-a4d0a2eaa8c0fcaa.mjs`.

Lokale Chrome-Prüfung 1440×765 und Handyansicht 390×844. PC: keine Auswahl → Foto → Motiv → Text, rechte Auswahl scrollen, Foto bearbeiten/Schließen, Größenregler, Motivgröße/Rückgängig, Ansichtszoom, Vollbild/Rückweg, Reset-Bestätigung/Abbrechen. Platte bleibt bei Auswahl/Scrollen **x=40 / y=142,49 / 675,75×430,02 px**. Handy: Foto und Text, Entfernen/erneuter Upload im Test, konstante Platte **x=27 / y=75,52 / 349×222,09 px**; zwei Werkzeugreihen jeweils 44 px hoch. Ein gesonderter Tab ohne Testparameter hat **kein Flag und keine Werkzeugleiste**. Rechte-Erklärungstext im Test `display:none`.

Reale Screenshots in den lokalen Ausgaben: `konfi-feste-werkzeuge-pc.jpg` und `konfi-feste-werkzeuge-handy.jpg`. Das graue Rechteck ist das synthetische Prüffoto `photo-full-portrait.png`, keine neue Gestaltungsvorlage. Kein physisches Smartphone. Logo verwendet dieselben vorhandenen Originalaktionen, wurde in der Hunde-Teststrecke nicht gesondert hochgeladen. Andere Produktmaterialien/kleinere Handyhöhen bleiben vor einer breiten Aktivierung separat zu prüfen. Kein neuer Warenkorb-/Produktionsnachweis und kein Live-Deployment.

Nächster Schritt: Mikails Sichtentscheidung über diese Anordnung; anschließend ggf. gezielte private Veröffentlichung/weitere Größenprüfung. Unabhängig davon läuft der separat beauftragte vollständige Galerie-Save-back auf eigenem Branch/PR.
