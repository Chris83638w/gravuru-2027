# Unabhängiger Review des mobilen Reset-Layouts

13.11.2026. Nur Quell-/Belegprüfung der drei eingefrorenen Dateien; keine eigenen Tests, Browser- oder Serveraktionen und keine Appänderung. **Endurteil: kein verbleibender konkreter Befund im geprüften Fix; zur Codeübernahme geeignet.**

`design-reset.mjs` verschiebt denselben Resetknoten mitsamt seinen vorhandenen Listenern aus der horizontalen Stage in eine eigene Zeile. Die Bestätigungslogik, Gestaltung, Maße und Optionen bleiben unverändert. Im nativen Vollbild setzt `native-shell-ui.mjs:21–29` die Stage in `.fk-live-preview` und bei Close zurück; der neue Code setzt den Resetknopf passend als direktes Geschwister hinter die Stage und danach wieder hinter `[data-ux-stage]`. Der vorhandene native Close-Handler ist früher registriert. Auch der zusätzliche Attributbeobachter kann denselben Endzustand idempotent herstellen.

Der Observer beobachtet ausschließlich das `open`-Attribut des vorhandenen Dialogs. Die eigenen DOM-Verschiebungen verändern dieses Attribut nicht: keine Observer-Schleife, kein Polling und keine globale Resize-Beobachtung. Er gehört zur einmalig installierten Editor-/Dialoginstanz; es wird kein separater langlebiger globaler Bezug eingeführt. Die Mobile-Demo zerstört ihre eigene Erweiterung, nicht diesen weiterbestehenden nativen Editor. Ein zusätzlicher Cleanup-Pfad ist aus dem geprüften Lebenszyklus nicht erforderlich.

Die Mobile-Demo-Ausnahme ist mit dem echten `demo.mjs:76–79,179–199,310–326` abgeglichen: In der normalen Ansicht behält `.md-controls` ihren Resetknoten. Im Vollbild bleibt dessen Stage-Elternknoten für die vorhandenen Selektoren erhalten. Beim Close übernimmt die bestehende `restoreDemoNodes`-Logik; der native Observer holt den Knoten wegen `data-mobile-demo` nicht zurück. Die Tests prüfen zwei vollständige Wechsel mit unveränderten Listenern und Zuständen.

`modern-navigation.css` ergänzt ausschließlich den bestehenden Bereich bis 767 px, moderne native Mobile-Tabs, eine direkte `.ux-design-reset`-Zeile und **ohne** `data-mobile-demo`. Vollbild erhält diese neue Höhenregel nicht. Aus bisherigem Vorschauaufschlag 56 px werden 112 px: Die neue tatsächliche 56-px-Steuerzeile kommt zusätzlich zum bisherigen Stage-Raum hinzu. Der untere Zoom-/Bemaßungsraum von 116 px sowie seitliche Maßränder werden nicht gekürzt. Im Fotomodus wird die Zusatzzeile nach dem bisherigen `min(...)`-Höhenlimit addiert; damit wird nicht erneut Stagehöhe abgezogen.

Die fünf Autorenprüfungen sind im gelesenen `tests-final.log` grün, 0 Skip. Die neue CSS-Prüfung benennt korrekt ihren begrenzten Umfang: echter Höhenfunktions-/CSS-Vertrag mit gezielter DOM-Fixture, kein simulierter Browsernachweis. Kein Test wiederholt. Alle drei aktuellen Dateien stimmen unabhängig in Bytezahl und SHA mit `pins.json` überein; Patch-, Log- und README-Hash ebenfalls gleich.

| Geprüfter Pin | SHA256 |
| --- | --- |
| `pins.json` | `dae24cf1cb4b032ed4a1bbd00bf520cf797beff7bcd639b9ae18cfbe700dffaa` |
| `design-reset.mjs` | `45b44abf6e6590284376d526a0b1f0f43d786b988b2403b6bebd96e4aef34e89` |
| `design-reset.test.mjs` | `bfb79e6343f64dfad52f1b92c4190f337240c7161fb2c55de3bd1cee3af6207d` |
| `modern-navigation.css` | `eb2fcd4bc1c98b8dcf11b4a692221572da26a7388fc15d0910e4fad5e2b3b766` |

**Separater tatsächlicher Browserbeleg, von Root übermittelt:** lokaler nativer Konfigurator bei 390 × 844 px, S82 final SVG 312 × 78 px mit x=31,5 und beiden sichtbaren Maßangaben; Vollbild öffnet, Resetdialog erscheint, Abbrechen kehrt unverändert zurück. Der erste Zwischenstand mit 88 × 22 px war eine echte gefundene Regression und ist durch die ergänzte CSS-Reservierung korrigiert. Dies ist Roots lokaler Browsernachweis; ich habe keinen eigenen Browserlauf und keine aktuelle Serverinstallation geprüft. Die ältere Autoren-README/`browserAfterFix:false` beschreibt den Zeitpunkt vor Roots Schlussprüfung und wurde hier nicht überschrieben.

Keine Preis-, Produkt-, Material-, Schrauben- oder Mengenlogik geändert. Lokale Code-/Sichtprüfung und spätere tatsächliche Serverübernahme bleiben getrennt.
