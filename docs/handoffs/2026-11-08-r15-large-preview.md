# Große Vorschau direkt unter dem Produkt

Nutzerauftrag vom 08.11.2026: Die große Vorschau soll jederzeit über einen Button unter dem Produkt erreichbar sein. Mika setzt nur diesen Zusatz am freigegebenen R15 um. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) und die bestehenden Designs bleiben unverändert.

## Änderung

Eine 44 px hohe Aktionszeile liegt unter der Produktfläche, innerhalb des bisherigen Vorschaufensters. Bei geschlossenem Handymenü stehen „Gestalten +“ und „Große Vorschau“ nebeneinander. Bei geöffnetem Werkzeug und am Desktop bleibt der Vorschauknopf erreichbar. Er löst ausschließlich den vorhandenen nativen Vollbildknopf aus: derselbe Dialog, dieselbe Gestaltung, dieselben Bedienelemente und derselbe Rückweg. Kein neuer Viewer, keine Zoom-, Preis-, Produktdaten- oder Werkzeugänderung.

Die Zeile reserviert ihren Platz, statt Maße oder Gestaltung zu überdecken. Die äußere Vorschauhöhe und die übrigen Bereiche bleiben erhalten. Kleine zusätzliche Styles sind auf diese neue Zeile begrenzt; die vorhandene `demo.css` wird nicht geändert oder ersetzt.

## Gesicherte aktive Grundlage

Eigener Branch `dev/mika-r15-large-preview-20261108`, Basis `7b8bc287012140cb3aba05f2aadbbe52248c6a55` (PR #206). Zwei vorhandene Runtime-Quellen vorab gegen das aktive Manifest geprüft und unter `outputs/r15-large-preview-20261108/backup/` gesichert:

| Datei | Aktive SHA-256 vorher |
|---|---|
| `app/configurator/mobile-demo/demo.mjs` | `50e55149ff716d678e824e33e01504aa57c2aea022341e67546eccdfda2e4eb1` |
| `app/configurator/mobile-demo/assets.mjs` | `afa57074425ba4ac7613526b3c34243e578c862cf4a3ccc044db9ebfc8b0921a` |

Neues Modul: `app/configurator/mobile-demo/preview-action.mjs`; in der bestehenden öffentlichen Asset-Whitelist ausdrücklich ergänzt. Die aktive `demo.css` hat laut frischer Root-Prüfung SHA `3c9b782d70ca644c17a62172f2cf908125fa6a49c7192ae7e0af8bf5e5f43646`, abweichend von der Git-Basis. **Diese Live-Datei unbedingt erhalten.** Keine vollständige Branch-/Buildkopie ausrollen.

## Nachweise und Grenzen

- 25/25 Adaptertests grün. Neue Fälle bei 390 und 1440 px: Klick aus Werkzeug-, Text- und Motivbereich öffnet denselben nativen Dialog; Stage und Warenkorb bleiben erhalten, Schließen stellt die Bedienung wieder her, deaktivierter Originalauslöser wird respektiert. Gestaltung und Preiszustand unverändert; vollständige Entfernung stellt die ursprünglichen DOM-Knoten wieder her.
- 4/4 vorhandene Shop-/Assettests grün. Der echte lokale Server liefert die vollständige R15-Modulkette einschließlich des neuen Moduls mit `no-store`, unbekannte/private Dateien bleiben gesperrt.
- Bestehender nativer Build grün: 151 Module, 16 Styles; R15-Präsentationsmodule werden bewusst getrennt ausgeliefert. Kein lokales Bundle zur Veröffentlichung vorgesehen.
- `git diff --check` sauber. Keine Live- oder Shopify-Schreibzugriffe durch diesen Agenten. **Visuelle Handy-/PC-Abnahme übernimmt Root; sie ist noch nicht erfolgt.** Der separat untersuchte Wieder-Auswahlfehler wird hier nicht als behoben behauptet.

## Übernahme und Rücknahme

Nur `demo.mjs`, `assets.mjs` und das neue `preview-action.mjs` anhand des Vorher-/Nachher-Manifests unter `outputs/r15-large-preview-20261108/patch-manifest.json` übernehmen. Die bestehende CSS-Datei nicht anfassen. Die Asset-Whitelist wird beim Serverstart importiert; kontrollierten Neustart und frischen R15-Aufruf gemeinsam mit den getrennten Fixes durch Root prüfen.

Zur Rücknahme die beiden gesicherten Quellen wiederherstellen und neu starten. Das dann unreferenzierte Hilfsmodul kann im privaten Runtime-Baum verbleiben; keine Datenbank, Kundenkonfiguration oder Medien löschen.
