# Demo R13 – kleine Motive sicher verschieben

Auftrag: Screenshot 201 / „Teste es mal“. Nur getrennte Demo, keine Änderung am Kunden-Konfi, Shopify, Main oder Astras Stand. Motiv darf maximal die Produktfläche erreichen. Der Vorschlag zum höheren Ausführungsmenü aus Screenshot 199 ist weiterhin **nicht umgesetzt**.

Vorher gesichert: Ausgangscommit `6bf8ff4d`, vollständiges Quellarchiv `checkpoints/mobile-demo-r13-small-motif-20261107/before-r13-6bf8ff4d.zip`, SHA256 `6816bbf26f511bee2202a6dff9187be26003a4ac270fae1a57c5660df9132f96`.

Ursache: Die sichtbaren 19-px-Eckpfeile besitzen 44-px-Trefferflächen. Diese können bei sehr kleinen Motiven die Mitte überdecken. Der Demo-Adapter schafft für das ausgewählte kleine Motiv eine unsichtbare Greiffläche von mindestens 44 Bildschirmpixeln und rückt die vorhandenen Eckgriffe auseinander. Die Greiffläche liegt hinter allen echten Objekten, sodass benachbarte Texte/Fotos/Motive Vorrang behalten. Sie verändert weder Originalgeometrie noch Randbegrenzung. Native Gesten, Pointer-Capture, Undo, Preise und Designs bleiben zuständig. Keine zusätzlichen Modi.

Ein zweiter reversibler Demo-Adapter begrenzt aktive Motiv-Skalierung und Drehung proportional anhand der gedrehten Außenmaße. Gilt für beide rechteckigen Schiefer-Testgrößen, native Eckgriffe, Tastatur und beide vorhandenen Plus/Minus-Wege. Fotos, Logos, Texte, gesperrte Elemente sowie Laden/Zurücksetzen/Undo werden nicht angepasst. Andere Konturen werden bewusst nicht als Rechteck freigegeben; bei diesen behalten solche Größenaktionen ihre vorherigen Maße. Für einen späteren Universal-Rollout ist eine Prüfung gegen die echte Kontur erforderlich.

Native Browserprüfung: 390×844 Touch-Drag beginnt 18 px neben einem nur 13,7 px breiten Motiv; x/y ändern sich, w/h bleiben exakt 9/7,728832 mm. Ein Undo stellt vorherige Position wieder her. Eckgriff vergrößert weiterhin. Am linken Rand x=4,5 mm bei w=9 mm, also kein zusätzlicher Greifflächen-Abstand. Überlappender Nachbartext bleibt auswählbar. Bei 320×740 lässt sich ein 7×6-mm-Motiv mit 45° Drehung ohne Größenänderung bewegen. PC 1440×1000: Maus bewegt auch die zusätzliche Greiffläche ohne Skalierung. Maximalgröße 22×14: Höhe 140 mm, nach zwei weiteren Plus-Klicks unverändert; gedreht 15° Außenhöhe weiterhin 140 mm (numerische Rundung <1e-12).

Wichtiges Testergebnis: Browser können zwischen Capture-Listenern Microtasks ausführen. Temporäre Trefferkennung und Größenbegrenzung bleiben deshalb bis zum Ende des Event-Tasks bestehen; ein zusätzlicher Regressionstest deckt diese Reihenfolge ab. Reine synchrone Ereignisnachbildung hätte den Fehler nicht gefunden.

Dies sind echte Chrome-Eingaben mit Touch-/Mausereignissen in simulierten Viewports, keine physische Handyabnahme. Fixtures wurden ausschließlich im Prüftab verändert und werden durch Neuladen verworfen. Vorlagen/Platten und Preise werden im Build über identische Hashes abgesichert.

Publikationsziel: eigener neuer Pfad `/konfi-demo/mobil-20261107-r13/`. Kein Shop-Schreiben, kein Routerwechsel, keine alte Datei ersetzen. Checkout bleibt in dieser statischen Demo gesperrt. Testnachweise und finaler Veröffentlichungsbeleg werden nachgereicht.
