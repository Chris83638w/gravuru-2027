# Prio R15 · Stufe 1 im Shop und auf der geschützten Beta

**Der reguläre Shop und die geschützte Beta liefern Claudes Stufe 1 auf Stand `921928f4` aus.** Am 20. November 2026 um 11:15 UTC öffnete der Prüfer das Edelstahl-Türschild über die normale Produktseite im mobilen Browser. D3 erschien im selben Editor. Die Trennlinie war mit 275,54 × 1,58 CSS-Pixeln sichtbar, der Preis betrug 19,99 €. Zuvor bestätigte Shopify auf dem geschützten Prüfweg den persönlichen D3-Warenkorb. [Normales Edelstahl-Türschild im Shop](https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen) · [Geschützte Beta](https://konfi-beta.gravuru-designwerkstatt.de/prio-stufe-1/) · [Auftrag und Freigabe](https://github.com/Chris83638w/gravuru-2027/issues/267#issuecomment-7037919138)

Der Screenshot zeigt die Trennlinie auf der normalen Produktseite. Das Prüfprotokoll dokumentiert die Editor-Identität und die sichtbare Linie. Die Auslieferungsprüfung enthält die Prüfsummen des regulären R15. [Live-Screenshot](nachweis/921928f4/Live-Trennlinie.png) · [Mobile Live-Prüfung](nachweis/921928f4/Live-Pruefung.json) · [Live-Auslieferung](nachweis/921928f4/auslieferung-neu.json) · [Geprüfter Quellstand](https://github.com/Chris83638w/gravuru-2027/commit/921928f41a7d61e73b504400728f2f6f629e8ade)

## Selbst ausprobieren

1. Den geschützten Einstieg in einem privaten Browserfenster öffnen und anmelden. Das Startformat ist 120 × 80 mm mit abgerundeten Ecken und Befestigung K00.
2. Unter **Designs** die Vorlage **Zwei Zeilen mit Trennlinie** wählen. Der Hinweis zur Übernahme der Texte und Fotos erscheint im Editor.
3. Im Textwerkzeug den Namen ändern und das Schild in den Warenkorb legen. Das persönliche Bild lässt sich durch Antippen vergrößern.

## Was der gemeinsame Prüfstand bestätigt

Im mobilen Chrome-Fenster mit 390 × 844 Pixeln wechselte D1 auf D3 im selben Editor, Dokument und Rahmen. Der Übernahmehinweis war im sichtbaren Bereich. Der Prüfer änderte den Namen auf **Neumann**. Shopify bestätigte genau eine Position für **19,99 €**, Artikelnummer `156-GR-ES-AB-120X80-T15-K00`. Der Lauf endete im Warenkorb. [Warenkorb für Chris ansehen](nachweis/921928f4/Shopify-D3-Warenkorb.png) · [Übernahmehinweis](nachweis/921928f4/Uebernahmehinweis.png)

Das vergrößerbare Warenkorbbild stimmt auf allen 1600 × 1102 Pixeln mit der gespeicherten Kundenansicht überein. Die Messung fand die Trennlinie über 1.234 zusammenhängende Pixel. [Persönliches Schild mit Trennlinie in Originalgröße](nachweis/921928f4/Shopify-D3-Kundenbild.png) · [Prüfprotokoll mit Preis, Artikelnummern- und Bildabgleich](nachweis/921928f4/Nachweis.json)

## Ausgelieferte Beta und ihre Rücknahme

Der geschützte Pfad `/prio-stufe-1/` öffnet die feste Startseite im isolierten App-Ordner `/konfi-demo/prio-claude-stufe1-267/`. Diese verweist auf das Versionsverzeichnis `r921928f4/`. Das tatsächlich ausgelieferte Hauptpaket heißt `editor-6c00a8d0e08b6e0d.js`. Seine SHA-256-Prüfsumme ist `762a181de7b75c82c4f289e0cbf93a4e199d6e453c836122abb454d4e9e44f45`. Die Auslieferung aller elf Versionsdateien, des Einstiegs und des früheren Hauptpakets wurde über HTTPS geprüft. [Manifest](editor/r921928f4/manifest.json) · [Überprüfung nach der Umschaltung](nachweis/921928f4/https-activate.json)

Zum Nachbauen werden zwei unveränderte lokale Git-Arbeitskopien auf `2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179` und `921928f41a7d61e73b504400728f2f6f629e8ade` sowie Node.js 24 benötigt. Im Verzeichnis `editor/r921928f4/` den folgenden Befehl mit den drei eigenen Pfaden ausführen. Der Bau verwendet die erfassten öffentlichen Start- und Editorrahmen des früheren R15. Er erzeugt die sechs Editorpakete aus den beiden Quellständen und vergleicht alle elf neuen Dateien mit dem veröffentlichten Manifest. Die Wiederholungsprüfung gelang vollständig ohne Netzwerk. [Bauskript](editor/r921928f4/build.mjs)

```text
node build.mjs <Checkout-2bd7bd8e> <Checkout-921928f4> <Bauordner>
```

Für die Bereitstellung verwendet der zuständige Operator den bereits eingerichteten SSH-Zugang des App-Kontos. Die Befehle laufen aus `editor/r921928f4/`. `stage` prüft die vorherigen Dateien und sichert die alte Startseite im Versionsordner. `activate` prüft die ausgelieferten Dateien und tauscht die feste Startseite atomar aus. Zur Rücknahme setzt `rollback` dieselbe Startseite wieder auf die gesicherte Fassung `a38c9701`. Ihre SHA-256-Prüfsumme ist `189d1e64e67e5290c038ac603c0b25f66819067a24f2a79bb6902df42e6a40e1`. Die zugehörigen alten Editorpakete liegen weiter am ursprünglichen Ort. [Bereitstellung und Rücknahme](editor/r921928f4/release.py) · [Prüfung des Rückwegs vor der Umschaltung](nachweis/921928f4/https-stage.json)

```text
python release.py stage <Bauordner>
python release.py activate <Bauordner>
```

Der Rücknahmebefehl lautet `python release.py rollback <Bauordner>`.

Der bestehende Beta-Einstieg holt die signierte Produktfreigabe für Revision 4. Die Warenkorbrückgabe verwendet die Produktansicht im unveröffentlichten Shopify-Prüftheme `191449661820`. [Einstieg](beta/einstieg.cjs) · [Warenkorbansicht](product.warenkorb-cst1.liquid)

## Frühere Prüfungen auf a38c9701

Auf dem früheren Beta-Stand `a38c9701` scheiterte D3 beim Speichern. Die Werkstattvorlage enthielt die Trennlinie bereits als Pfad. Beim schnellen Wechsel erreichte dieser Pfad den laufenden Editor noch nicht. Die Fertigungsprüfung erkannte den Textplatzhalter und stoppte das Speichern. Claude übernahm die Korrektur `a4267e67` in den aktuellen Stand. Der interne Vergleich zeigte 15 gleiche Exportpfade nach Abgleich einer automatisch vergebenen SVG-ID und identische Pixel bei 960 × 640. Der oben dokumentierte Beta-Test bestätigt anschließend den echten Warenkorb. [Ursprünglicher Befund](nachweis/d3-vergleich.json) · [Korrektur](https://github.com/Chris83638w/gravuru-2027/commit/a4267e67297ad5c448eddfc3e22de7d8e2ca3de1) · [Interner Exportvergleich](nachweis/d3-korrektur-lokal.json)

Bereits auf `a38c9701` bestätigte Shopify zwei getrennte Gestaltungen derselben Artikelnummer. „Berger“ in D2 und „Neumann“ in D952 kosteten zusammen 39,98 €. Beide persönlichen Bilder ließen sich vergrößern. [Früherer Warenkorb](nachweis/Shopify-zwei-Schilder.png) · [Prüfprotokoll der zwei Positionen](nachweis/Ergebnis.json) · [Früheres Manifest](editor/manifest.json)
